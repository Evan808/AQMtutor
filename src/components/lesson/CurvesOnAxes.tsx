"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Line, Mafs, Plot, Polygon, Text, Vector } from "mafs";
import "mafs/core.css";
import Formula from "@/components/Formula";
import {
  density,
  fillLabel,
  formatNumber,
  maxDensity,
  regionIntervals,
  shadedArea,
  type SliderValues,
} from "@/lessons/distributions";
import type { CurvesOnAxesBlock, Series, SeriesColor } from "@/lessons/types";
import styles from "./lesson.module.css";

const COLORS: Record<SeriesColor, string> = {
  amber: "var(--amber)",
  teal: "var(--teal)",
  blue: "var(--blue)",
};

type Props = {
  block: CurvesOnAxesBlock;
  sliderValue: number;
  onSliderChange: (value: number) => void;
  sliderLocked: boolean;
};

// Mafs needs its size in pixels, so measure the space the chart has.
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

// A round gap between tick marks (1, 2, 5, 10, ...) that gives about six ticks.
function tickStep(range: number): number {
  const rough = range / 6;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= rough) ?? rough;
}

export default function CurvesOnAxes({ block, sliderValue, onSliderChange, sliderLocked }: Props) {
  const [chartRef, chartSize] = useSize();

  const sliders: SliderValues = block.slider ? { [block.slider.name]: sliderValue } : {};
  const [xMin, xMax] = block.xRange;
  const xSpan = xMax - xMin;
  const yMax = maxDensity(block);
  const curve = (series: Series) => (x: number) => density(series.distribution, x, sliders);
  const findSeries = (id: string) => block.series.find((series) => series.id === id);

  const step = tickStep(xSpan);
  const ticks: number[] = [];
  for (let x = Math.ceil(xMin / step) * step; x <= xMax + step / 1000; x += step) {
    ticks.push(Number(x.toFixed(6)));
  }

  const shadeSeries = block.shade && findSeries(block.shade.series);
  const annotationSeries = block.annotation && findSeries(block.annotation.series);

  // The parts of the shaded region that are on screen.
  const shadedStretches =
    block.shade && shadeSeries
      ? regionIntervals(block.shade.region, sliders)
          .map(([from, to]): [number, number] => [Math.max(from, xMin), Math.min(to, xMax)])
          .filter(([from, to]) => from < to)
      : [];

  // The outline of the area under a curve between two x values.
  function areaUnder(series: Series, from: number, to: number): [number, number][] {
    const points: [number, number][] = [[from, 0]];
    for (let i = 0; i <= 60; i++) {
      const x = from + ((to - from) * i) / 60;
      points.push([x, Math.min(curve(series)(x), 1.06 * yMax)]);
    }
    points.push([to, 0]);
    return points;
  }

  // Where to put the annotation label so it doesn't sit on top of a curve.
  let annotation = null;
  if (block.annotation && annotationSeries) {
    const tipX = block.annotation.x;
    const tipY = curve(annotationSeries)(tipX);
    // Move the label outward, away from the curve's peak, where there is empty space.
    let peakX = xMin;
    for (let i = 0; i <= 100; i++) {
      const x = xMin + (xSpan * i) / 100;
      if (curve(annotationSeries)(x) > curve(annotationSeries)(peakX)) peakX = x;
    }
    const outward = tipX < peakX ? -1 : 1;
    const labelX = Math.min(
      Math.max(tipX + outward * 0.12 * xSpan, xMin + 0.12 * xSpan),
      xMax - 0.12 * xSpan,
    );
    // Then lift it clear of every curve that passes underneath it.
    let tallestBelow = 0;
    for (let i = -10; i <= 10; i++) {
      const x = labelX + (0.12 * xSpan * i) / 10;
      for (const series of block.series) tallestBelow = Math.max(tallestBelow, curve(series)(x));
    }
    const labelY = Math.min(Math.max(tallestBelow + 0.1 * yMax, tipY + 0.2 * yMax), 0.9 * yMax);
    annotation = { tipX, tipY, labelX, labelY, color: COLORS[annotationSeries.color] };
  }

  return (
    <div className={styles.block}>
      <div className={styles.chartColumn}>
        <div className={styles.chart} ref={chartRef}>
          {chartSize.height > 0 && (
            <Mafs
              width={chartSize.width}
              height={chartSize.height}
              pan={false}
              preserveAspectRatio={false}
              viewBox={{
                x: [xMin - 0.025 * xSpan, xMax + 0.075 * xSpan],
                y: [-0.18 * yMax, 1.06 * yMax],
                padding: 0,
              }}
            >
              {shadeSeries &&
                shadedStretches.map(([from, to]) => (
                  <Polygon
                    key={`${from}-${to}`}
                    points={areaUnder(shadeSeries, from, to)}
                    color={COLORS[shadeSeries.color]}
                    fillOpacity={0.4}
                    strokeOpacity={0}
                  />
                ))}

              {/* Mafs pushes "n" and "s" text the wrong way when the chart is stretched
                  to fit, so the attachDistance values for those are negative. */}
              <Line.Segment point1={[xMin, 0]} point2={[xMax, 0]} color="var(--axis)" weight={1.5} />
              {ticks.map((x) => (
                <Line.Segment
                  key={x}
                  point1={[x, 0]}
                  point2={[x, -0.02 * yMax]}
                  color="var(--axis)"
                  weight={1.5}
                />
              ))}
              {ticks.map((x) => (
                <Text key={x} x={x} y={-0.03 * yMax} attach="s" attachDistance={-10} size={18} color="var(--muted)">
                  {x < 0 ? `−${-x}` : x}
                </Text>
              ))}
              {block.xLabel && (
                <Text x={xMax} y={0} attach="e" attachDistance={26} size={20} color="var(--ink)">
                  {block.xLabel}
                </Text>
              )}

              {block.series.map((series) => (
                <Plot.OfX
                  key={series.id}
                  y={curve(series)}
                  domain={[xMin, xMax]}
                  color={COLORS[series.color]}
                  weight={4}
                />
              ))}

              {block.annotation && annotation && (
                <>
                  <Vector
                    tail={[annotation.labelX, annotation.labelY]}
                    tip={[annotation.tipX, annotation.tipY + 0.02 * yMax]}
                    color={annotation.color}
                    weight={2}
                  />
                  <Text
                    x={annotation.labelX}
                    y={annotation.labelY}
                    attach="n"
                    attachDistance={-12}
                    size={22}
                    color={annotation.color}
                    svgTextProps={{ fontWeight: 700 }}
                  >
                    {block.annotation.text}
                  </Text>
                </>
              )}
            </Mafs>
          )}
        </div>

        {block.slider && (
          <label className={styles.slider}>
            <span className={styles.sliderLabel}>
              {block.slider.label}, {block.slider.name} = <strong>{formatNumber(sliderValue)}</strong>
            </span>
            <span className={styles.sliderRow}>
              <span>{block.slider.min}</span>
              <input
                type="range"
                min={block.slider.min}
                max={block.slider.max}
                step={block.slider.step}
                value={sliderValue}
                disabled={sliderLocked}
                onChange={(event) => onSliderChange(Number(event.target.value))}
              />
              <span>{block.slider.max}</span>
            </span>
            {sliderLocked && <span className={styles.sliderHint}>Make a prediction first, or skip it.</span>}
          </label>
        )}
      </div>

      <div className={styles.side}>
        <div className={styles.sideTop}>
          <ul className={styles.legend}>
            {block.series.map((series) => (
              <li key={series.id} style={{ color: COLORS[series.color] }}>
                <span className={styles.swatch} />
                {fillLabel(series.label, sliders)}
              </li>
            ))}
          </ul>

          {block.shade?.showArea && shadeSeries && (
            <div className={styles.area} style={{ color: COLORS[shadeSeries.color] }}>
              <span className={styles.areaValue}>
                {(100 * shadedArea(shadeSeries.distribution, block.shade.region, sliders)).toFixed(1)}%
              </span>
              <span className={styles.formulaCaption}>shaded area</span>
            </div>
          )}
        </div>

        {block.formula && (
          <div
            className={styles.formula}
            style={{ color: block.formula.color ? COLORS[block.formula.color] : undefined }}
          >
            <Formula latex={block.formula.latex} />
            {block.formula.caption && <span className={styles.formulaCaption}>{block.formula.caption}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
