import jStat from "jstat";
import type { CurvesOnAxesBlock, Distribution, ParamValue } from "./types";

// Current slider positions, by slider name. e.g. { n: 6 }
export type SliderValues = Record<string, number>;

export function resolveParam(value: ParamValue, sliders: SliderValues): number {
  if (typeof value === "number") return value;
  return sliders[value.slider] + (value.offset ?? 0);
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
  }
}

// Fill in slider values in a label: "t, {n-1} df (n = {n})" -> "t, 5 df (n = 6)".
export function fillLabel(label: string, sliders: SliderValues): string {
  return label.replace(/\{(\w+)([+-]\d+)?\}/g, (_match, name: string, offset?: string) =>
    String(sliders[name] + Number(offset ?? 0)),
  );
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
        tallest = Math.max(tallest, density(series.distribution, x, sliders));
      }
    }
  }
  return tallest;
}
