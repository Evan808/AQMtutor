# AI Tutor App

An AI tutor that teaches one concept at a time through interactive visual lessons, remembers what the student struggled with, and maps everything to their actual course. The first user is Evan, a college student, using it for his stats course.

**The full design lives in `docs/design-brief.pdf`. Read it before starting any milestone.**

## How we work

- Build **one milestone at a time**, in the order of the Build plan in the brief.
- Each milestone has a "done when" test. When the milestone is built, stop, explain how to check that test, and wait for Evan to confirm before starting the next one.
- Before writing code for a milestone, give a short plan (files, steps) and wait for a go-ahead.
- Evan is not a professional developer. Explain what you did in plain language, and tell him exactly what to run or click to try it.
- Don't add features from later milestones early. If something from a later milestone seems needed, say so and ask.

## Tech stack (don't change without asking)

- Next.js (React, TypeScript), run locally at localhost
- Claude API via the official Anthropic SDK. The API key lives in `.env.local` and is only used server-side, never in browser code. `.env.local` is in `.gitignore`.
- SQLite with Drizzle ORM. Tables are defined in the Drizzle schema file and changed through Drizzle migrations. Never hand-write SQL or ask Evan to run SQL manually.
- Mafs for interactive math visuals, jStat for computing distributions, KaTeX for formulas
- Course PDFs are sent directly to the Claude API
- Voice input uses the browser's built-in speech recognition

## Core rules from the design

- **The AI never writes visual code at runtime.** It outputs a slide description in a fixed, validated format, and the app renders it from a small set of building blocks. Invalid descriptions are rejected, not rendered.
- **The AI picks parameters; the app does the math.** Curves and distributions are computed from formulas by the renderer, never from numbers the AI supplies.
- **Teach, don't solve.** For homework problems, use the hint ladder: a hint, then a worked example with different numbers, then walking through the student's own problem while they do the math. Never hand over the final answer.
- **Pedagogy loop:** predict, play, explain, check. Advance only when the student understands.
- **Keep API costs low:** use a cheaper model (Haiku) for filing and grading short answers, a stronger model for teaching and slide descriptions, and prompt caching for course materials.
- **Wireframe first.** Keep styling plain and neutral. Fonts, colors, and visual design come later.

## Housekeeping

- Use git. Commit after each working step with a clear message, so any change can be undone.
- Keep the code simple and readable over clever.
