"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./lessons.module.css";

export default function CreateLesson() {
  const router = useRouter();
  const [concept, setConcept] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [problem, setProblem] = useState<{ reason: string; details: string[] } | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!concept.trim() || waiting) return;

    setWaiting(true);
    setProblem(null);
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });
      const result = await response.json();

      if (result.ok) {
        router.push(`/lesson/${result.deckId}`);
        return;
      }
      setProblem({
        reason: result.reason ?? "No lesson was created.",
        details: (result.rejections ?? []).flat(),
      });
    } catch {
      setProblem({ reason: "Could not reach the app's server. Is it still running?", details: [] });
    }
    setWaiting(false);
  }

  return (
    <div>
      <form className={styles.form} onSubmit={create}>
        <input
          value={concept}
          onChange={(event) => setConcept(event.target.value)}
          placeholder="A concept, such as: the empirical rule"
          disabled={waiting}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={waiting || !concept.trim()}>
          {waiting ? "Writing…" : "Create lesson"}
        </button>
      </form>

      {waiting && <p className={styles.muted}>Claude is writing the lesson. This takes up to a minute.</p>}
      {problem && (
        <div className={styles.problem}>
          <p>{problem.reason}</p>
          {problem.details.length > 0 && (
            <ul>
              {problem.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
