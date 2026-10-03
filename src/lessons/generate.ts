import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { TEACHING_MODEL, TEACHING_PRICE } from "@/lib/models";
import { tVsZ } from "./decks/t-vs-z";
import { deckContentSchema, type DeckContent } from "./types";
import { validateDeck } from "./validate";

// Reads ANTHROPIC_API_KEY from .env.local. This file only runs on the server.
const anthropic = new Anthropic();

// What Claude sends back: a deck, or a reason why the concept doesn't suit one.
const answerSchema = z.object({
  suitable: z
    .boolean()
    .describe("False if the concept can't be taught well with curves on axes."),
  reason: z.string().describe("One sentence. Why it is not suitable, or empty if it is."),
  deck: deckContentSchema.nullable(),
});

const exampleDeck: DeckContent = { title: tVsZ.title, slides: tVsZ.slides };

const SYSTEM_PROMPT = `You write short interactive lessons for a college statistics student. Each lesson teaches one concept through one thing the student can drag and watch.

You do not draw anything and you never supply curve data. You fill in a slide description, and the app draws it: the app computes every curve and every shaded area from the distribution's formula. Your job is to choose which distributions, parameters, slider and shading make the idea visible.

## The deck

A deck has 3 to 5 slides, in this order:

1. One "setup" slide. The title is the question the lesson answers. The body is 1 or 2 short paragraphs (two sentences each at most) that set up the puzzle without answering it. Up to 2 formulas if they help.
2. One to three "visual" slides. Each has a title phrased as a question, a prediction, one chart, and a takeaway.
3. One "check" slide. A short question the student answers in their own words. It should test understanding of what the visual showed, using different numbers from the lesson, and must not be answerable by recall alone.

## Visual slides

- predict: a question the student can answer by guessing, and can then settle by dragging the slider. Give 2 or 3 short options (one to three words each). "answer" must be exactly one of the options.
- takeaway: one sentence, at most 120 characters, stating what the chart just showed. It is hidden until the student has moved the slider.
- Prefer a slider on every visual slide. A chart with nothing to drag teaches much less.

## The chart (block type "curves-on-axes")

- series: 1 to 3 curves, each with its own colour. Distributions available: "normal" (mean, sd), "t" (df), "chi-square" (df). Nothing else exists.
- slider: at most one. Any distribution parameter or shading boundary can follow it:
  - {"slider": "n"} is the slider's value; {"slider": "n", "offset": -1} is n - 1.
  - {"slider": "s", "times": -2, "offset": 100} is 100 - 2s, for boundaries such as μ ± 2σ.
  - {"value": 15, "dividedBySqrtOfSlider": "n"} is 15/√n, for standard errors.
- Series labels can show the slider's value with braces: "t, {n-1} df (n = {n})".
- shade: fills the area under one series. Regions: "tails" (beyond ±c), "middle" (within ±c), "between" (from, to), "left" (of), "right" (of). "tails" and "middle" are symmetric around zero, so use them only with curves centred on zero; otherwise use "between". Set showArea to true when the size of the area is the point (probabilities, confidence levels, the empirical rule); the app computes and displays it as a percentage.
- annotation: optional. At most three words, pointing at the place the student's eye should go. Point at a tail or a shoulder of the curve, not the peak.
- xLabel: a short variable name for the axis (x, z, t, x̄), at most 10 characters.
- Work out every boundary and parameter at the slider's min, start and max before you answer. The shaded region must be exactly the region the slide talks about at every position. If the format cannot express an idea exactly, choose a different visual for the same concept; never approximate.
- formula: optional LaTeX shown beside the chart.
- xRange must show the bulk of every curve at every slider position. For a normal curve that is about mean ± 4 sd at its widest. Chi-square starts at 0.
- Standard deviations and degrees of freedom must stay above zero across the whole slider range.
- The chart keeps one vertical scale, set by the tallest curve at any slider position. Keep every curve's peak within a factor of 6 of the tallest, at every slider position, or it looks flat. A normal curve's peak is 0.4/sd, so if sd goes from 15 down to 15/√n, n can reach at most 36.
- Choose slider ranges where the change is easy to see, and a step that gives a smooth drag (roughly 20 to 100 positions).

## Writing

- Plain, direct sentences. No filler, no praise, no exclamation marks.
- In titles, body text, labels, prompts and takeaways use plain Unicode symbols (σ, μ, x̄, √, ±), never LaTeX. LaTeX goes only in "latex" fields, without $ delimiters, and must be valid KaTeX.
- Every statement must be statistically correct. If you state a number (an area, a critical value), it must be right.

## When not to write a deck

If the concept has no curve shape (it needs a scatter plot, histogram, bar chart or table, or it is a definition or a software procedure), set suitable to false, give the reason, and set deck to null.

## Reply format

Reply with one JSON object and nothing else: no explanation, no code fence. It must match this JSON Schema exactly, with no extra fields:

${JSON.stringify(z.toJSONSchema(answerSchema))}

## Example

This is the "deck" value for a lesson on why the t distribution is wider than z:

${JSON.stringify(exampleDeck, null, 2)}`;

export type GenerateResult = {
  ok: boolean;
  deck?: DeckContent;
  // Why there is no deck: not suitable, or the problems validation found.
  reason?: string;
  attempts: number;
  validOnFirstTry: boolean;
  // Problems found on each attempt that failed validation.
  rejections: string[][];
  costDollars: number;
};

function cost(usage: Anthropic.Usage): number {
  return (
    (usage.input_tokens * TEACHING_PRICE.input +
      usage.output_tokens * TEACHING_PRICE.output +
      (usage.cache_read_input_tokens ?? 0) * TEACHING_PRICE.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * TEACHING_PRICE.cacheWrite) /
    1_000_000
  );
}

// Pull the JSON answer out of Claude's reply.
function readAnswer(response: Anthropic.Message): { suitable?: boolean; reason?: string; deck?: unknown } | null {
  const text = response.content.find((block) => block.type === "text");
  if (!text || response.stop_reason !== "end_turn") return null;
  try {
    // Tolerate a code fence around the JSON, though the prompt asks for none.
    return JSON.parse(text.text.replace(/^\s*```(?:json)?|```\s*$/g, ""));
  } catch {
    return null;
  }
}

// Ask Claude for a deck. If validation rejects it, send the problems back once.
export async function generateDeck(concept: string): Promise<GenerateResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Write a lesson deck for this concept: ${concept}` },
  ];
  const result: GenerateResult = {
    ok: false,
    attempts: 0,
    validOnFirstTry: false,
    rejections: [],
    costDollars: 0,
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    result.attempts = attempt;

    const response = await anthropic.messages.create({
      model: TEACHING_MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
      output_config: { effort: "medium" },
    });
    result.costDollars += cost(response.usage);

    const answer = readAnswer(response);
    if (!answer) {
      result.reason = `Claude's reply could not be read (stop reason: ${response.stop_reason}).`;
      return result;
    }
    if (!answer.suitable || !answer.deck) {
      result.reason = answer.reason || "Claude said this concept doesn't suit a curve lesson.";
      return result;
    }

    // The reply is not trusted: validateDeck checks its shape and its content.
    const validation = validateDeck(answer.deck);
    if (validation.ok) {
      result.ok = true;
      result.deck = validation.deck;
      result.validOnFirstTry = attempt === 1;
      return result;
    }

    result.rejections.push(validation.errors);
    messages.push(
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: `The app rejected that deck. Fix these problems and send the whole deck again:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`,
      },
    );
  }

  result.reason = "The deck failed validation twice.";
  return result;
}
