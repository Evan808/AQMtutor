// The slide description format.
//
// A deck is a list of slide descriptions. A description only says WHAT to show
// (which distribution, which slider, what to shade). The renderer does all the
// math and drawing. Claude writes these descriptions; validate.ts rejects bad ones.
//
// This schema is the single definition of the format. The TypeScript types at
// the bottom are derived from it, and it is also what Claude is given to fill in.

import { z } from "zod";

export const seriesColorSchema = z.enum(["amber", "teal", "blue"]);

// A number in the description can be fixed, or it can follow the slide's slider.
export const paramValueSchema = z.union([
  z.number(),
  z
    .object({ slider: z.string(), times: z.number().optional(), offset: z.number().optional() })
    .describe(
      "slider × times + offset (times defaults to 1, offset to 0). {slider: 'n', offset: -1} means n - 1. {slider: 's', times: -2, offset: 100} means 100 - 2s.",
    ),
  z
    .object({ value: z.number(), dividedBySqrtOfSlider: z.string() })
    .describe("value / sqrt(slider). {value: 15, dividedBySqrtOfSlider: 'n'} means 15/√n."),
]);

export const distributionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["normal"]), mean: paramValueSchema, sd: paramValueSchema }),
  z.object({ type: z.enum(["t"]), df: paramValueSchema }),
  z.object({ type: z.enum(["chi-square"]), df: paramValueSchema }),
]);

export const seriesSchema = z.object({
  id: z.string(),
  label: z
    .string()
    .describe("Legend text. May show the slider value in braces: 't, {n-1} df (n = {n})'."),
  color: seriesColorSchema,
  distribution: distributionSchema,
});

export const sliderSchema = z.object({
  name: z.string().describe("A short variable name such as n, z or k."),
  label: z.string().describe("What the slider means, such as 'Sample size'."),
  min: z.number(),
  max: z.number(),
  start: z.number(),
  step: z.number(),
});

// Which part of the area under a curve to shade.
export const regionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["tails"]), beyond: paramValueSchema }).describe("x < -beyond and x > +beyond"),
  z.object({ type: z.enum(["middle"]), within: paramValueSchema }).describe("-within < x < +within"),
  z.object({ type: z.enum(["between"]), from: paramValueSchema, to: paramValueSchema }),
  z.object({ type: z.enum(["left"]), of: paramValueSchema }).describe("x < of"),
  z.object({ type: z.enum(["right"]), of: paramValueSchema }).describe("x > of"),
]);

export const curvesOnAxesBlockSchema = z.object({
  type: z.enum(["curves-on-axes"]),
  xRange: z.array(z.number()).describe("Two numbers: [left edge, right edge] of the x axis."),
  xLabel: z.string().optional(),
  series: z.array(seriesSchema),
  slider: sliderSchema.optional(),
  shade: z
    .object({
      series: z.string(),
      region: regionSchema,
      showArea: z.boolean().describe("Show the shaded area as a percentage, computed by the app."),
    })
    .optional(),
  annotation: z
    .object({ text: z.string(), series: z.string(), x: z.number() })
    .describe("A short label with an arrow pointing at one series at a given x.")
    .optional(),
  formula: z
    .object({
      latex: z.string(),
      caption: z.string().optional(),
      color: seriesColorSchema.optional(),
    })
    .optional(),
});

export const predictSchema = z.object({
  prompt: z.string(),
  options: z.array(z.string()),
  answer: z.string().describe("Must be exactly one of the options."),
});

export const slideSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.enum(["setup"]),
    title: z.string(),
    body: z.array(z.string()),
    formulas: z.array(z.object({ latex: z.string(), caption: z.string() })).optional(),
  }),
  z.object({
    kind: z.enum(["visual"]),
    title: z.string(),
    predict: predictSchema.optional(),
    block: curvesOnAxesBlockSchema,
    takeaway: z.string(),
  }),
  z.object({
    kind: z.enum(["check"]),
    title: z.string(),
    question: z.string(),
  }),
]);

export const deckContentSchema = z.object({
  title: z.string(),
  slides: z.array(slideSchema),
});

export type SeriesColor = z.infer<typeof seriesColorSchema>;
export type ParamValue = z.infer<typeof paramValueSchema>;
export type Distribution = z.infer<typeof distributionSchema>;
export type Series = z.infer<typeof seriesSchema>;
export type Slider = z.infer<typeof sliderSchema>;
export type Region = z.infer<typeof regionSchema>;
export type CurvesOnAxesBlock = z.infer<typeof curvesOnAxesBlockSchema>;
export type Predict = z.infer<typeof predictSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type DeckContent = z.infer<typeof deckContentSchema>;
export type Deck = DeckContent & { id: string };
