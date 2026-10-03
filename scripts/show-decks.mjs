// Prints the saved decks in a compact form for reviewing what Claude wrote.
// Run with: node scripts/show-decks.mjs
import Database from "better-sqlite3";

const db = new Database("data/tutor.db", { readonly: true });
for (const row of db.prepare("select id, concept, content from decks order by id").all()) {
  const deck = JSON.parse(row.content);
  console.log(`\n=== Deck ${row.id}: ${deck.title}  (asked: ${row.concept})`);
  for (const slide of deck.slides) {
    console.log(`\n[${slide.kind}] ${slide.title}`);
    if (slide.kind === "setup") {
      slide.body.forEach((paragraph) => console.log(`  ${paragraph}`));
      slide.formulas?.forEach((formula) => console.log(`  formula: ${formula.latex}  (${formula.caption})`));
    }
    if (slide.kind === "visual") {
      const { block, predict } = slide;
      if (predict) console.log(`  predict: ${predict.prompt} [${predict.options.join(" | ")}] -> ${predict.answer}`);
      console.log(`  x: ${JSON.stringify(block.xRange)} ${block.xLabel ?? ""}`);
      block.series.forEach((s) => console.log(`  series: ${s.label} (${s.color}) ${JSON.stringify(s.distribution)}`));
      if (block.slider) console.log(`  slider: ${JSON.stringify(block.slider)}`);
      if (block.shade) console.log(`  shade: ${JSON.stringify(block.shade)}`);
      if (block.annotation) console.log(`  annotation: ${JSON.stringify(block.annotation)}`);
      if (block.formula) console.log(`  formula: ${block.formula.latex}  (${block.formula.caption ?? ""})`);
      console.log(`  takeaway: ${slide.takeaway}`);
    }
    if (slide.kind === "check") console.log(`  ${slide.question}`);
  }
}
