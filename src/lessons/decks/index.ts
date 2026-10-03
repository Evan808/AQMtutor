import { eq } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";
import type { Deck } from "../types";
import { validateDeck } from "../validate";
import { tVsZ } from "./t-vs-z";

// Decks written by hand live in this folder. Decks written by Claude live in the database.
export const handWrittenDecks: Deck[] = [tVsZ];

export async function getDeck(id: string): Promise<Deck | undefined> {
  let content: unknown = handWrittenDecks.find((deck) => deck.id === id);

  if (!content && /^\d+$/.test(id)) {
    const [row] = await db.select().from(decks).where(eq(decks.id, Number(id)));
    content = row?.content;
  }
  if (!content) return undefined;

  // Every deck is checked before it is shown: one that doesn't validate is never rendered.
  const result = validateDeck(content);
  return result.ok ? { id, ...result.deck } : undefined;
}
