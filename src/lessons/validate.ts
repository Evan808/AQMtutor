import katex from "katex";
import { density, labelSliderNames, maxDensity, regionIntervals, resolveParam } from "./distributions";
import {
  deckContentSchema,
  type CurvesOnAxesBlock,
  type DeckContent,
  type ParamValue,
  type Region,
} from "./types";

// Checks a slide description before it is ever shown.
// Returns the deck if it is good, or a list of plain-English problems if not.
export type ValidationResult =
  | { ok: true; deck: DeckContent }
  | { ok: false; errors: string[] };

export function validateDeck(input: unknown): ValidationResult {
  // Layer 1: does it have the right shape?
  const parsed = deckContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  // Layer 2: does the content make sense?
  const deck = parsed.data;
  const errors: string[] = [];
  const slides = deck.slides;

  if (!deck.title.trim()) errors.push("The deck needs a title.");
  if (slides.length < 3 || slides.length > 5) {
    errors.push(`A deck has 3 to 5 slides; this one has ${slides.length}.`);
  }
  if (slides[0]?.kind !== "setup") errors.push("The first slide must be a setup slide.");
  if (slides[slides.length - 1]?.kind !== "check") errors.push("The last slide must be a check slide.");
  if (!slides.some((slide) => slide.kind === "visual")) errors.push("A deck needs at least one visual slide.");

  slides.forEach((slide, index) => {
    const where = `Slide ${index + 1}`;
    const problem = (message: string) => errors.push(`${where}: ${message}`);

    if (!slide.title.trim()) problem("the title is empty.");
    if (slide.title.length > 80) problem("the title is longer than 80 characters.");

    if (slide.kind === "setup") {
      if (slide.body.length < 1 || slide.body.length > 3) problem("a setup slide has 1 to 3 paragraphs.");
      if (slide.body.some((paragraph) => paragraph.length > 280)) problem("a paragraph is longer than 280 characters.");
      if ((slide.formulas?.length ?? 0) > 2) problem("a setup slide has at most 2 formulas.");
      slide.formulas?.forEach((formula) => checkLatex(formula.latex, problem));
    }

    if (slide.kind === "check") {
      if (!slide.question.trim()) problem("the check question is empty.");
    }

    if (slide.kind === "visual") {
      if (!slide.takeaway.trim()) problem("the takeaway is empty.");
      if (slide.takeaway.length > 140) problem("the takeaway is longer than 140 characters.");

      if (slide.predict) {
        const { options, answer } = slide.predict;
        if (options.length < 2 || options.length > 3) problem("a prediction has 2 or 3 options.");
        if (new Set(options).size !== options.length) problem("the prediction options must be different from each other.");
        if (!options.includes(answer)) problem(`the prediction answer "${answer}" is not one of the options.`);
      }

      checkBlock(slide.block, problem);
    }
  });

  return errors.length === 0 ? { ok: true, deck } : { ok: false, errors };
}

function checkLatex(latex: string, problem: (message: string) => void) {
  try {
    katex.renderToString(latex, { throwOnError: true });
  } catch {
    problem(`the formula "${latex}" is not valid KaTeX.`);
  }
}

function checkBlock(block: CurvesOnAxesBlock, problem: (message: string) => void) {
  const [xMin, xMax] = block.xRange;
  const { slider } = block;

  if (block.xRange.length !== 2) return problem("xRange must be exactly two numbers.");
  if (!(xMin < xMax)) return problem("xRange must go from a smaller number to a larger one.");

  if ((block.xLabel?.length ?? 0) > 10) problem("xLabel is longer than 10 characters; use a short variable name.");

  // Slider
  if (slider) {
    if (slider.label.length > 40) problem("the slider label is longer than 40 characters.");
    if (!(slider.min < slider.max)) return problem("the slider's min must be below its max.");
    if (slider.start < slider.min || slider.start > slider.max) problem("the slider's start is outside its range.");
    if (!(slider.step > 0)) return problem("the slider's step must be above zero.");
    if ((slider.max - slider.min) / slider.step > 500) problem("the slider has more than 500 positions; use a larger step.");
  }

  // Anything that reads a slider must name the slider that exists.
  const checkSliderName = (name: string, what: string) => {
    if (!slider) problem(`${what} refers to slider "${name}", but the slide has no slider.`);
    else if (name !== slider.name) problem(`${what} refers to slider "${name}", but the slider is called "${slider.name}".`);
  };
  const checkParam = (value: ParamValue, what: string) => {
    if (typeof value === "number") return;
    checkSliderName("slider" in value ? value.slider : value.dividedBySqrtOfSlider, what);
  };
  const regionParams = (region: Region): ParamValue[] => {
    switch (region.type) {
      case "tails":
        return [region.beyond];
      case "middle":
        return [region.within];
      case "between":
        return [region.from, region.to];
      case "left":
      case "right":
        return [region.of];
    }
  };

  // Series
  if (block.series.length < 1 || block.series.length > 3) problem("a chart has 1 to 3 series.");
  const ids = block.series.map((series) => series.id);
  if (new Set(ids).size !== ids.length) problem("series ids must be different from each other.");
  const colors = block.series.map((series) => series.color);
  if (new Set(colors).size !== colors.length) problem("each series needs its own colour.");

  for (const series of block.series) {
    const what = `series "${series.id}"`;
    labelSliderNames(series.label).forEach((name) => checkSliderName(name, `the label of ${what}`));
    const d = series.distribution;
    if (d.type === "normal") {
      checkParam(d.mean, what);
      checkParam(d.sd, what);
    } else {
      checkParam(d.df, what);
    }
  }

  // Shading and annotation must point at a series that exists.
  if (block.shade) {
    if (!ids.includes(block.shade.series)) problem(`shade refers to series "${block.shade.series}", which doesn't exist.`);
    regionParams(block.shade.region).forEach((value) => checkParam(value, "the shaded region"));
  }
  if (block.annotation) {
    if (!ids.includes(block.annotation.series)) problem(`the annotation refers to series "${block.annotation.series}", which doesn't exist.`);
    if (block.annotation.x < xMin || block.annotation.x > xMax) problem("the annotation's x is outside xRange.");
    if (block.annotation.text.length > 30) problem("the annotation text is longer than 30 characters.");
  }
  if (block.formula) checkLatex(block.formula.latex, problem);

  // Stop here if names are wrong, because the math below would read missing sliders.
  if (!namesAreValid(block)) return;

  // The math must work at every slider position.
  const positions: number[] = [];
  if (slider) {
    for (let value = slider.min; value <= slider.max + 1e-9; value += slider.step) positions.push(value);
  } else {
    positions.push(0);
  }

  for (const position of positions) {
    const sliders = slider ? { [slider.name]: position } : {};
    const at = slider ? ` when ${slider.name} = ${Number(position.toFixed(4))}` : "";

    for (const series of block.series) {
      const d = series.distribution;
      if (d.type === "normal" && !(resolveParam(d.sd, sliders) > 0)) {
        return problem(`series "${series.id}" has a standard deviation that is not above zero${at}.`);
      }
      if (d.type !== "normal" && !(resolveParam(d.df, sliders) > 0)) {
        return problem(`series "${series.id}" has degrees of freedom that are not above zero${at}.`);
      }
      for (let i = 0; i <= 40; i++) {
        const x = xMin + ((xMax - xMin) * i) / 40;
        // A curve may shoot up to infinity at the very edge (chi-square with 1 df at 0).
        if (Number.isNaN(density(d, x, sliders))) {
          return problem(`series "${series.id}" can't be computed at x = ${x}${at}.`);
        }
      }

      // Most of the curve should be on screen, or the student sees a flat line.
      let peak = 0;
      for (let i = 0; i <= 200; i++) {
        const height = density(d, xMin + ((xMax - xMin) * i) / 200, sliders);
        if (Number.isFinite(height)) peak = Math.max(peak, height);
      }
      const edge = Math.max(density(d, xMin, sliders), density(d, xMax, sliders));
      if (peak <= 0) return problem(`series "${series.id}" is not visible inside xRange${at}.`);
      if (d.type !== "chi-square" && edge > 0.5 * peak) {
        return problem(`series "${series.id}" is cut off by xRange${at}; widen xRange.`);
      }
    }

    if (block.shade) {
      for (const [from, to] of regionIntervals(block.shade.region, sliders)) {
        if (!(from <= to)) return problem(`the shaded region ends before it starts${at}.`);
      }
      // At the starting position the student must be able to see the shading.
      if (!slider || position === slider.start) {
        const visible = regionIntervals(block.shade.region, sliders).some(
          ([from, to]) => Math.min(to, xMax) - Math.max(from, xMin) > 0.005 * (xMax - xMin),
        );
        if (!visible) return problem(`the shaded region is empty or off screen${at}.`);
      }
    }
  }

  const tallest = maxDensity(block);
  if (!(tallest > 0)) return problem("the curves have no height inside xRange.");

  // The chart keeps one vertical scale, set by the tallest curve at any slider
  // position. If another curve is far shorter than that, it looks like a flat line.
  const ends = slider ? [slider.min, slider.start, slider.max] : [0];
  for (const position of ends) {
    const sliders = slider ? { [slider.name]: position } : {};
    for (const series of block.series) {
      let peak = 0;
      for (let i = 1; i < 200; i++) {
        const height = density(series.distribution, xMin + ((xMax - xMin) * i) / 200, sliders);
        if (Number.isFinite(height)) peak = Math.max(peak, height);
      }
      if (tallest > 6 * peak) {
        return problem(
          `series "${series.id}" is less than a sixth of the chart's height${slider ? ` when ${slider.name} = ${position}` : ""}, because another curve or slider position is much taller. Narrow the slider range or change the parameters so heights stay within a factor of 6.`,
        );
      }
    }
  }
}

// True when every slider reference in the block names the block's own slider.
function namesAreValid(block: CurvesOnAxesBlock): boolean {
  const names: string[] = [];
  const collect = (value: ParamValue) => {
    if (typeof value === "number") return;
    names.push("slider" in value ? value.slider : value.dividedBySqrtOfSlider);
  };
  for (const series of block.series) {
    names.push(...labelSliderNames(series.label));
    const d = series.distribution;
    if (d.type === "normal") {
      collect(d.mean);
      collect(d.sd);
    } else {
      collect(d.df);
    }
  }
  const region = block.shade?.region;
  if (region) {
    if (region.type === "tails") collect(region.beyond);
    if (region.type === "middle") collect(region.within);
    if (region.type === "between") {
      collect(region.from);
      collect(region.to);
    }
    if (region.type === "left" || region.type === "right") collect(region.of);
  }
  if (block.shade && !block.series.some((series) => series.id === block.shade?.series)) return false;
  if (block.annotation && !block.series.some((series) => series.id === block.annotation?.series)) return false;
  return names.every((name) => name === block.slider?.name);
}
