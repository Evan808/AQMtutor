import katex from "katex";
import "katex/dist/katex.min.css";

// Renders a LaTeX formula with KaTeX.
export default function Formula({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, { throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
