"use client";

import { useState } from "react";
import Link from "next/link";
import Formula from "@/components/Formula";
import type { Deck, Slide } from "@/lessons/types";
import CurvesOnAxes from "./CurvesOnAxes";
import styles from "./lesson.module.css";

type VisualSlide = Extract<Slide, { kind: "visual" }>;
type SetupSlide = Extract<Slide, { kind: "setup" }>;
type CheckSlide = Extract<Slide, { kind: "check" }>;

function Setup({ slide }: { slide: SetupSlide }) {
  return (
    <div className={styles.setup}>
      <div className={styles.setupText}>
        {slide.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {slide.formulas && (
        <div className={styles.setupFormulas}>
          {slide.formulas.map((formula) => (
            <div key={formula.latex} className={styles.setupFormula}>
              <Formula latex={formula.latex} />
              <span className={styles.formulaCaption}>{formula.caption}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Predict first, then play with the slider, then the takeaway appears.
function Visual({ slide }: { slide: VisualSlide }) {
  const { block, predict } = slide;
  const [guess, setGuess] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [sliderValue, setSliderValue] = useState(block.slider?.start ?? 0);
  const [played, setPlayed] = useState(!block.slider);

  const predicted = !predict || guess !== null || skipped;

  return (
    <>
      {predict && (
        <div className={styles.predict}>
          <span className={styles.predictPrompt}>Predict: {predict.prompt}</span>
          {!predicted &&
            predict.options.map((option) => (
              <button key={option} className="btn" onClick={() => setGuess(option)}>
                {option}
              </button>
            ))}
          {!predicted && (
            <button className="btn btn-quiet" onClick={() => setSkipped(true)}>
              Skip
            </button>
          )}
          {guess && !played && <span className={styles.predictResult}>You said {guess.toLowerCase()}. Drag the slider to find out.</span>}
          {guess && played && (
            <span className={styles.predictResult}>
              {guess === predict.answer
                ? `You said ${guess.toLowerCase()}, and that's what happens.`
                : `You said ${guess.toLowerCase()}. Watch the tails: they get ${predict.answer.toLowerCase()}.`}
            </span>
          )}
          {skipped && !played && <span className={styles.predictResult}>Drag the slider to find out.</span>}
        </div>
      )}

      <CurvesOnAxes
        block={block}
        sliderValue={sliderValue}
        sliderLocked={!predicted}
        onSliderChange={(value) => {
          setSliderValue(value);
          setPlayed(true);
        }}
      />

      <p className={styles.takeaway} style={{ visibility: played ? "visible" : "hidden" }}>
        {slide.takeaway}
      </p>
    </>
  );
}

function Check({ slide }: { slide: CheckSlide }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className={styles.check}>
      <p className={styles.checkQuestion}>{slide.question}</p>
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Type your answer in your own words"
        rows={4}
      />
      <p className={styles.note}>Answers are not graded yet. Grading arrives with the tutor session.</p>
    </div>
  );
}

export default function LessonPlayer({ deck }: { deck: Deck }) {
  const [index, setIndex] = useState(0);
  const slide = deck.slides[index];
  const isLast = index === deck.slides.length - 1;

  return (
    <main className={styles.lesson}>
      <header className={styles.top}>
        <Link href="/" className="btn">
          Exit lesson
        </Link>
        <span className={styles.counter}>
          Slide {index + 1} of {deck.slides.length}
        </span>
      </header>

      <h1 className={styles.title}>{slide.title}</h1>

      {/* key resets a slide's state (prediction, slider) when you move between slides */}
      <section className={styles.body} key={index}>
        {slide.kind === "setup" && <Setup slide={slide} />}
        {slide.kind === "visual" && <Visual slide={slide} />}
        {slide.kind === "check" && <Check slide={slide} />}
      </section>

      <footer className={styles.bottom}>
        <button className="btn" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          Back
        </button>
        <span className={styles.spacer} />
        <button className="btn" disabled title="Asking questions arrives with the tutor session">
          Ask
        </button>
        {isLast ? (
          <Link href="/" className="btn btn-primary">
            Finish
          </Link>
        ) : (
          <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        )}
      </footer>
    </main>
  );
}
