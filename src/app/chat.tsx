"use client";

import { useState } from "react";
import styles from "./page.module.css";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  initialConversationId: number | null;
  initialMessages: ChatMessage[];
};

export default function Chat({ initialConversationId, initialMessages }: Props) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);

  // Replace the text of the last message (the reply being written).
  function setReply(content: string) {
    setMessages((current) => [...current.slice(0, -1), { role: "assistant", content }]);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || waiting) return;

    setInput("");
    setWaiting(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        setReply(`[${problem?.error ?? "The server returned an error."}]`);
        return;
      }

      setConversationId(Number(response.headers.get("X-Conversation-Id")));

      // Show the reply as it arrives, piece by piece.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setReply(reply);
      }
    } catch {
      setReply("[Could not reach the app's server. Is it still running?]");
    } finally {
      setWaiting(false);
    }
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>AI Tutor</h1>
        <button onClick={newChat} disabled={waiting}>
          New chat
        </button>
      </header>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>Ask a question to start.</p>}
        {messages.map((message, index) => (
          <div key={index} className={styles.message}>
            <div className={styles.role}>{message.role === "user" ? "You" : "Claude"}</div>
            <div className={styles.content}>{message.content || "…"}</div>
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={send}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question"
          autoFocus
        />
        <button type="submit" disabled={waiting || !input.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
