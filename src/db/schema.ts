import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { DeckContent } from "../lessons/types";

// Milestone 0 only needs enough tables to save a chat.
// Curricula, milestones, concepts and the struggle log come in later milestones.

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Lessons written by Claude. Only decks that passed validation are saved.
export const decks = sqliteTable("decks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  concept: text("concept").notNull(),
  title: text("title").notNull(),
  content: text("content", { mode: "json" }).$type<DeckContent>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages =sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
