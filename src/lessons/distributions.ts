import jStat from "jstat";
import type { CurvesOnAxesBlock, Distribution, ParamValue, Region } from "./types";

// Current slider positions, by slider name. e.g. { n: 6 }
export type SliderValues = Record<string, number>;

export function resolveParam(value: ParamValue, sliders: SliderValues): number {
  if (typeof value === "number") return value;
  if ("dividedBySqrtOfSlider" in value) {
    return value.value / Math.sqrt(sliders[value.dividedBySqrtOfSlider]);
  }
  return sliders[value.slider] * (value.times ?? 1) + (value.offset ?? 0);
}

// The height of a distribution's curve at x, computed from its formula by jStat.
export function density(distribution: Distribution, x: number, sliders: SliderValues): number {
  switch (distribution.type) {
    case "normal":
      return jStat.normal.pdf(
        x,
        resolveParam(distribution.mean, sliders),
        resolveParam(distribution.sd, sliders),
      );
    case "t":
      return jStat.studentt.pdf(x, resolveParam(distribution.df, sliders));
    case "chi-square":
      // Below zero the chi-square curve doesn't exist.
      return x < 0 ? 0 : jStat.chisquare.pdf(x, resolveParam(distribution.df, sliders));
  }
}

// The area under a distribution's curve to the left of x.
export function cumulative(distribution: Distribution, x: number, sliders: SliderValues): number {
  if (x === -Infinity) return 0;
  if (x === Infinity) return 1;
  switch (distribution.type) {
    case "normal":
      return jStat.normal.cdf(
        x,
        resolveParam(distribution.mean, sliders),
        resolveParam(distribution.sd, sliders),
      );
    case "t":
      return jStat.studentt.cdf(x, resolveParam(distribution.df, sliders));
    case "chi-square":
      return x <= 0 ? 0 : jStat.chisquare.cdf(x, resolveParam(distribution.df, sliders));
  }
}

// A shaded region as one or two stretches of the x axis.
export function regionIntervals(region: Region, sliders: SliderValues): [number, number][] {
  switch (region.type) {
    case "tails": {
      const beyond = Math.abs(resolveParam(region.beyond, sliders));
      return [
        [-Infinity, -beyond],
        [beyond, Infinity],
      ];
    }
    case "middle": {
      const within = Math.abs(resolveParam(region.within, sliders));
      return [[-within, within]];
    }
    case "between":
      return [[resolveParam(region.from, sliders), resolveParam(region.to, sliders)]];
    case "left":
      return [[-Infinity, resolveParam(region.of, sliders)]];
    case "right":
      return [[resolveParam(region.of, sliders), Infinity]];
  }
}

// The exact shaded area (a probability between 0 and 1).
export function shadedArea(distribution: Distribution, region: Region, sliders: SliderValues): number {
  let area = 0;
  for (const [from, to] of regionIntervals(region, sliders)) {
    area += cumulative(distribution, to, sliders) - cumulative(distribution, from, sliders);
  }
  return area;
}

// Show a number without floating-point noise: 1.9600000001 -> "1.96".
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

// Fill in slider values in a label: "t, {n-1} df (n = {n})" -> "t, 5 df (n = 6)".
export function fillLabel(label: string, sliders: SliderValues): string {
  return label.replace(/\{(\w+)([+-]\d+)?\}/g, (_match, name: string, offset?: string) =>
    formatNumber(sliders[name] + Number(offset ?? 0)),
  );
}

// The slider names a label refers to: "t, {n-1} df" -> ["n"].
export function labelSliderNames(label: string): string[] {
  return [...label.matchAll(/\{(\w+)([+-]\d+)?\}/g)].map((match) => match[1]);
}

// The tallest any curve gets across the whole slider range, so the chart can
// keep one fixed vertical scale while the slider moves.
export function maxDensity(block: CurvesOnAxesBlock): number {
  const [xMin, xMax] = block.xRange;
  const sliderPositions = block.slider
    ? [block.slider.min, block.slider.start, block.slider.max]
    : [0];

  let tallest = 0;
  for (const position of sliderPositions) {
    const sliders = block.slider ? { [block.slider.name]: position } : {};
    for (const series of block.series) {
      for (let i = 0; i <= 200; i++) {
        const x = xMin + ((xMax - xMin) * i) / 200;
        const height = density(series.distribution, x, sliders);
        if (Number.isFinite(height)) tallest = Math.max(tallest, height);
      }
    }
  }
  return tallest;
}
