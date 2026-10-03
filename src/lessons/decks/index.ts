import type { Deck } from "../types";
import { tVsZ } from "./t-vs-z";

const decks: Deck[] = [tVsZ];

export function getDeck(id: string): Deck | undefined {
  return decks.find((deck) => deck.id === id);
}
