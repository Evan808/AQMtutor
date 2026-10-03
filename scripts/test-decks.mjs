// Milestone 2 test: asks Claude for two decks on each of five concepts and
// reports how many passed validation. The app must be running (npm run dev).
// Run with: npm run test:decks
const APP = process.env.APP_URL ?? "http://localhost:3000";
const RUNS_PER_CONCEPT = Number(process.env.RUNS ?? 2);

const concepts = [
  "Why the t distribution is wider than z",
  "The empirical rule (68-95-99.7)",
  "Z-scores and area under the standard normal curve",
  "The sampling distribution of the mean: standard error shrinks as n grows",
  "Confidence level and critical values",
];

let total = 0;
let valid = 0;
let validFirstTry = 0;
let cost = 0;

for (const concept of concepts) {
  for (let run = 1; run <= RUNS_PER_CONCEPT; run++) {
    total++;
    const response = await fetch(`${APP}/api/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept }),
    });
    const result = await response.json();
    cost += result.costDollars ?? 0;

    if (result.ok) {
      valid++;
      if (result.validOnFirstTry) validFirstTry++;
      const how = result.validOnFirstTry ? "valid first try" : "valid after one retry";
      console.log(`PASS  ${concept}\n      ${how}: ${APP}/lesson/${result.deckId}  "${result.title}"`);
    } else {
      console.log(`FAIL  ${concept}\n      ${result.reason}`);
    }
    for (const problems of result.rejections ?? []) {
      for (const problem of problems) console.log(`      rejected: ${problem}`);
    }
  }
}

console.log(`\nValid decks: ${valid} of ${total} (${validFirstTry} on the first try)`);
console.log(`Total cost: $${cost.toFixed(2)} (about $${(cost / total).toFixed(3)} per deck)`);
console.log("Validity is automatic. Open each link above to judge whether the lesson is correct.");
