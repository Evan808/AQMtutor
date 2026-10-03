"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Line, Mafs, Plot, Polygon, Text, Vector } from "mafs";
import "mafs/core.css";
import Formula from "@/components/Formula";
import { density, fillLabel, maxDensity, type SliderValues } from "@/lessons/distributions";
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

export default function CurvesOnAxes({ block, sliderValue, onSliderChange, sliderLocked }: Props) {
  const [chartRef, chartSize] = useSize();

  const sliders: SliderValues = block.slider ? { [block.slider.name]: sliderValue } : {};
  const [xMin, xMax] = block.xRange;
  const yMax = maxDensity(block);
  const curve = (series: Series) => (x: number) => density(series.distribution, x, sliders);
  const findSeries = (id: string) => block.series.find((series) => series.id === id);

  // Whole-number tick marks along the axis, every 2 units.
  const ticks: number[] = [];
  for (let x = Math.ceil(xMin / 2) * 2; x <= xMax; x += 2) ticks.push(x);

  const shadeSeries = block.shade && findSeries(block.shade.series);
  const annotationSeries = block.annotation && findSeries(block.annotation.series);

  // The outline of the area under a curve between two x values.
  function areaUnder(series: Series, from: number, to: number): [number, number][] {
    const points: [number, number][] = [[from, 0]];
    for (let i = 0; i <= 60; i++) {
      const x = from + ((to - from) * i) / 60;
      points.push([x, curve(series)(x)]);
    }
    points.push([to, 0]);
    return points;
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
                x: [xMin - 0.2, xMax + 0.6],
                y: [-0.18 * yMax, 1.06 * yMax],
                padding: 0,
              }}
            >
              {shadeSeries && block.shade && (
                <>
                  <Polygon
                    points={areaUnder(shadeSeries, xMin, -block.shade.tailsBeyond)}
                    color={COLORS[shadeSeries.color]}
                    fillOpacity={0.4}
                    strokeOpacity={0}
                  />
                  <Polygon
                    points={areaUnder(shadeSeries, block.shade.tailsBeyond, xMax)}
                    color={COLORS[shadeSeries.color]}
                    fillOpacity={0.4}
                    strokeOpacity={0}
                  />
                </>
              )}

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

              {block.annotation && annotationSeries && (
                <>
                  <Vector
                    tail={[block.annotation.x - 0.25, 0.27 * yMax]}
                    tip={[
                      block.annotation.x,
                      curve(annotationSeries)(block.annotation.x) + 0.02 * yMax,
                    ]}
                    color={COLORS[annotationSeries.color]}
                    weight={2}
                  />
                  <Text
                    x={block.annotation.x - 0.25}
                    y={0.27 * yMax}
                    attach="n"
                    attachDistance={-12}
                    size={22}
                    color={COLORS[annotationSeries.color]}
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
              {block.slider.label}, {block.slider.name} = <strong>{sliderValue}</strong>
            </span>
            <span className={styles.sliderRow}>
              <span>{block.slider.min}</span>
              <input
                type="range"
                min={block.slider.min}
                max={block.slider.max}
                step={1}
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
        <ul className={styles.legend}>
          {block.series.map((series) => (
            <li key={series.id} style={{ color: COLORS[series.color] }}>
              <span className={styles.swatch} />
              {fillLabel(series.label, sliders)}
            </li>
          ))}
        </ul>

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
