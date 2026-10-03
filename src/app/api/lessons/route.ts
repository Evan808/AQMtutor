import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { generateDeck } from "@/lessons/generate";

// Asks Claude to write a lesson for a concept. Saves it only if it passes validation.
export async function POST(request: Request) {
  const body = await request.json();
  const concept = typeof body.concept === "string" ? body.concept.trim() : "";
  if (!concept) {
    return Response.json({ ok: false, reason: "Type a concept first." }, { status: 400 });
  }

  try {
    const result = await generateDeck(concept);
    if (!result.ok || !result.deck) {
      return Response.json(result);
    }

    const [saved] = await db
      .insert(decks)
      .values({ concept, title: result.deck.title, content: result.deck })
      .returning();
    return Response.json({ ...result, deck: undefined, deckId: saved.id, title: saved.title });
  } catch (error) {
    console.error(error);
    const reason =
      error instanceof Anthropic.APIError
        ? `Claude API error (${error.status}): ${error.message}`
        : `Something went wrong writing the lesson: ${error instanceof Error ? error.message : error}`;
    return Response.json({ ok: false, reason }, { status: 500 });
  }
}
