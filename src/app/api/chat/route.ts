import Anthropic from "@anthropic-ai/sdk";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { TEACHING_MODEL } from "@/lib/models";

// Reads ANTHROPIC_API_KEY from .env.local. This file only runs on the server.
const anthropic = new Anthropic();

function errorText(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.local, then restart the app.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Claude is rate limiting requests. Wait a moment and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error (${error.status}): ${error.message}`;
  }
  return "Something went wrong talking to Claude. Check the terminal for details.";
}

export async function POST(request: Request) {
  const body = await request.json();
  const text = typeof body.message === "string" ? body.message.trim() : "";
  if (!text) {
    return Response.json({ error: "Message is empty." }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "No API key found. Add ANTHROPIC_API_KEY to .env.local, then restart the app." },
      { status: 500 },
    );
  }

  // Use the conversation the page sent, or start a new one.
  let conversationId: number = body.conversationId;
  if (!conversationId) {
    const [created] = await db.insert(conversations).values({}).returning();
    conversationId = created.id;
  }

  await db.insert(messages).values({ conversationId, role: "user", content: text });

  // The API has no memory, so send the whole conversation each time.
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.id));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: TEACHING_MODEL,
          max_tokens: 16000,
          output_config: { effort: "low" },
          messages: history,
        });
        claudeStream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));

        const reply = await claudeStream.finalText();
        if (reply) {
          await db.insert(messages).values({ conversationId, role: "assistant", content: reply });
        }
      } catch (error) {
        console.error(error);
        controller.enqueue(encoder.encode(`\n[${errorText(error)}]`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": String(conversationId),
    },
  });
}
