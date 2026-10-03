// The slide description format.
//
// A deck is a list of slide descriptions. A description only says WHAT to show
// (which distribution, which slider, what to shade). The renderer does all the
// math and drawing. From Milestone 2 on, Claude writes these descriptions.

export type SeriesColor = "amber" | "teal" | "blue";

// A number, or a value read from a slider, e.g. { slider: "n", offset: -1 } means n - 1.
export type ParamValue = number | { slider: string; offset?: number };

export type Distribution =
  | { type: "normal"; mean: ParamValue; sd: ParamValue }
  | { type: "t"; df: ParamValue };

export type Series = {
  id: string;
  // May include slider values in braces, e.g. "t, {n-1} df (n = {n})".
  label: string;
  color: SeriesColor;
  distribution: Distribution;
};

export type Slider = {
  name: string;
  label: string;
  min: number;
  max: number;
  start: number;
};

export type CurvesOnAxesBlock = {
  type: "curves-on-axes";
  xRange: [number, number];
  xLabel?: string;
  series: Series[];
  slider?: Slider;
  // Shade the area under one series beyond ±tailsBeyond.
  shade?: { series: string; tailsBeyond: number };
  // A short label with an arrow pointing at one series at a given x.
  annotation?: { text: string; series: string; x: number };
  formula?: { latex: string; caption?: string; color?: SeriesColor };
};

export type Predict = {
  prompt: string;
  options: string[];
  answer: string;
};

export type Slide =
  | {
      kind: "setup";
      title: string;
      body: string[];
      formulas?: { latex: string; caption: string }[];
    }
  | {
      kind: "visual";
      title: string;
      predict?: Predict;
      block: CurvesOnAxesBlock;
      takeaway: string;
    }
  | {
      kind: "check";
      title: string;
      question: string;
    };

export type Deck = {
  id: string;
  title: string;
  slides: Slide[];
};
