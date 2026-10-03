import type { Deck } from "../types";

// The first lesson, written by hand as a slide description (no AI).
export const tVsZ: Deck = {
  id: "t-vs-z",
  title: "T vs. Z",
  slides: [
    {
      kind: "setup",
      title: "What changes when we don't know σ?",
      body: [
        "To standardize a sample mean we divide by its standard error, which uses the population standard deviation σ.",
        "We usually don't know σ, so we estimate it from the sample with s. What does that extra guess do to the curve?",
      ],
      formulas: [
        {
          latex: "z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}",
          caption: "σ known",
        },
        {
          latex: "t = \\frac{\\bar{x} - \\mu}{s / \\sqrt{n}}",
          caption: "σ estimated by s",
        },
      ],
    },
    {
      kind: "visual",
      title: "Why is t wider than z?",
      predict: {
        prompt: "What happens to the tails of t as n grows?",
        options: ["Fatter", "Thinner"],
        answer: "Thinner",
      },
      block: {
        type: "curves-on-axes",
        xRange: [-4, 4],
        xLabel: "t, z",
        series: [
          {
            id: "t",
            label: "t, {n-1} df (n = {n})",
            color: "amber",
            distribution: { type: "t", df: { slider: "n", offset: -1 } },
          },
          {
            id: "z",
            label: "Standard normal",
            color: "blue",
            distribution: { type: "normal", mean: 0, sd: 1 },
          },
        ],
        slider: { name: "n", label: "Sample size", min: 2, max: 50, start: 6 },
        shade: { series: "t", tailsBeyond: 2 },
        annotation: { text: "Heavier tails", series: "t", x: -2.7 },
        formula: {
          latex: "t_{n-1} \\longrightarrow N(0,1)",
          caption: "as n grows",
          color: "blue",
        },
      },
      takeaway:
        "Estimating the population SD adds uncertainty, and it shrinks as the sample grows.",
    },
    {
      kind: "check",
      title: "Check your understanding",
      question: "With n = 8 and an unknown σ, do you use z or t, and why?",
    },
  ],
};
