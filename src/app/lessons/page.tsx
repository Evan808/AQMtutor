import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { handWrittenDecks } from "@/lessons/decks";
import CreateLesson from "./create-lesson";
import styles from "./lessons.module.css";

// Read the database on every page load instead of once at build time.
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const saved = await db
    .select({ id: decks.id, title: decks.title, concept: decks.concept })
    .from(decks)
    .orderBy(desc(decks.id));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Lessons</h1>
        <Link href="/" className="btn">
          Back to chat
        </Link>
      </header>

      <CreateLesson />

      <h2 className={styles.heading}>Written by Claude</h2>
      {saved.length === 0 && <p className={styles.muted}>None yet.</p>}
      <ul className={styles.list}>
        {saved.map((deck) => (
          <li key={deck.id}>
            <Link href={`/lesson/${deck.id}`}>{deck.title}</Link>
            <span className={styles.muted}>asked: {deck.concept}</span>
          </li>
        ))}
      </ul>

      <h2 className={styles.heading}>Written by hand</h2>
      <ul className={styles.list}>
        {handWrittenDecks.map((deck) => (
          <li key={deck.id}>
            <Link href={`/lesson/${deck.id}`}>{deck.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
