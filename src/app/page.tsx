import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import Chat from "./chat";

// Read the database on every page load instead of once at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Reopen the most recent conversation so a page reload doesn't lose it.
  const [latest] = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.id))
    .limit(1);

  const saved = latest
    ? await db
        .select({ role: messages.role, content: messages.content })
        .from(messages)
        .where(eq(messages.conversationId, latest.id))
        .orderBy(asc(messages.id))
    : [];

  return <Chat initialConversationId={latest?.id ?? null} initialMessages={saved} />;
}
