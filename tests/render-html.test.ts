import { describe, expect, it } from "vitest";
import { renderArticleHtml } from "../src/lib/render-html.js";
import type { GeneratedArticle } from "../src/lib/types.js";

describe("renderArticleHtml", () => {
  it("escapes user content and emits a complete document", () => {
    const article: GeneratedArticle = {
      title: "Bears <vs> Packers",
      subtitle: "A subtitle",
      sections: [
        { heading: "Matchup Overview", body: "Body 1" },
        { heading: "Key Players", body: "Body 2" },
        { heading: "Trends", body: "Body 3" },
        { heading: "Storylines", body: "Body 4" },
      ],
      prediction: "Bears by 3",
      disclaimer: "Educational only",
      modelUsed: "claude-sonnet-4-6",
      promptTokens: 1000,
      completionTokens: 500,
    };
    const html = renderArticleHtml(article);
    expect(html.includes("<!doctype html>")).toBe(true);
    expect(html.includes("Bears &lt;vs&gt; Packers")).toBe(true);
    expect(html.includes("Body 1")).toBe(true);
    expect(html.includes("claude-sonnet-4-6")).toBe(true);
  });
});
