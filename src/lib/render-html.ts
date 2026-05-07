/**
 * Render a GeneratedArticle to a polished standalone HTML page.
 * Inline CSS so the file is portable. No external assets.
 */
import type { GeneratedArticle } from "./types.js";

function escape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderArticleHtml(a: GeneratedArticle): string {
  const sections = a.sections
    .map(
      (s) => `
      <section>
        <h2>${escape(s.heading)}</h2>
        <p>${escape(s.body)}</p>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(a.title)}</title>
<style>
  :root { --bg:#0b0d10; --fg:#e8eaee; --muted:#93999f; --rule:#1d2126; --accent:#7aa2d4; }
  body { margin:0; padding:0; background:var(--bg); color:var(--fg); font-family: ui-serif, Georgia, "Iowan Old Style", "Apple Garamond", "Times New Roman", serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  h1 { font-size: 32px; line-height: 1.18; margin: 0 0 8px; }
  h2 { font-size: 18px; margin: 28px 0 8px; color: var(--accent); font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  p { line-height: 1.6; margin: 0 0 12px; }
  .subtitle { color: var(--muted); font-size: 16px; margin: 0 0 24px; font-style: italic; }
  .meta { color: var(--muted); font-size: 12px; font-family: ui-monospace, "SF Mono", Menlo, monospace; border-top: 1px solid var(--rule); padding-top: 12px; margin-top: 32px; }
  .prediction { border-left: 3px solid var(--accent); padding: 8px 14px; margin: 24px 0; background: rgba(122,162,212,0.06); }
  .disclaimer { border: 1px solid var(--rule); padding: 10px 14px; border-radius: 8px; font-size: 12px; color: var(--muted); margin-top: 24px; }
</style>
</head>
<body>
<main>
  <h1>${escape(a.title)}</h1>
  <p class="subtitle">${escape(a.subtitle)}</p>
  ${sections}
  <div class="prediction"><strong>Prediction. </strong>${escape(a.prediction)}</div>
  <div class="disclaimer">${escape(a.disclaimer)}</div>
  <div class="meta">model: ${escape(a.modelUsed)} . input tokens: ${a.promptTokens} . output tokens: ${a.completionTokens}</div>
</main>
</body>
</html>`;
}
