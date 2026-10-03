// Which Claude model does which job. Change model names here only.
// Teaching and writing slides use a stronger model; a cheaper one (Haiku) will
// be added for filing and grading when those features are built.
export const TEACHING_MODEL = "claude-sonnet-5-5";

// Price in dollars per million tokens, used only to show what a request cost.
export const TEACHING_PRICE = { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 };
