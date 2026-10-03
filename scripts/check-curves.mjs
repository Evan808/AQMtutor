// Checks the lesson renderer's math against published statistics-table values.
// Run with: npm run check:curves
import jStat from "jstat";
import { density } from "../src/lessons/distributions.ts";

const normal = { type: "normal", mean: 0, sd: 1 };
const t = { type: "t", df: { slider: "n", offset: -1 } };

// [description, value the app computes, value from the tables]
const checks = [
  ["Normal curve height at 0", density(normal, 0, {}), 0.39894],
  ["Normal curve height at 1", density(normal, 1, {}), 0.24197],
  ["Normal curve height at 2", density(normal, 2, {}), 0.05399],
  ["t curve height at 0, n = 6 (5 df)", density(t, 0, { n: 6 }), 0.37961],
  ["t curve height at 2, n = 6 (5 df)", density(t, 2, { n: 6 }), 0.06509],
  ["t curve height at 0, n = 2 (1 df)", density(t, 0, { n: 2 }), 0.31831],
  ["t curve height at 0, n = 31 (30 df)", density(t, 0, { n: 31 }), 0.39563],
  ["Normal: area within ±1.96", jStat.normal.cdf(1.96, 0, 1) - jStat.normal.cdf(-1.96, 0, 1), 0.95],
  ["t, 5 df: area within ±2.571", jStat.studentt.cdf(2.571, 5) - jStat.studentt.cdf(-2.571, 5), 0.95],
  ["t, 30 df: area within ±2.042", jStat.studentt.cdf(2.042, 30) - jStat.studentt.cdf(-2.042, 30), 0.95],
];

let failed = 0;
for (const [description, computed, expected] of checks) {
  const ok = Math.abs(computed - expected) < 0.0001;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${description}: app ${computed.toFixed(5)}, table ${expected}`);
}
console.log(failed === 0 ? "\nAll curve checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
