/* eslint-disable no-console */
/**
 * CLI for generating an article. Useful for cron jobs and local testing.
 *
 *   npm run generate -- --sport nfl --home Bears --away Packers --date 2026-09-08 --kind preview
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateArticle } from "../lib/llm.js";
import { buildGameContext } from "../lib/espn.js";
import { renderArticleHtml } from "../lib/render-html.js";
import { GenerateRequestSchema } from "../lib/types.js";

interface ParsedArgs {
  sport: string;
  home: string;
  away: string;
  date: string;
  kind: string;
  out: string | undefined;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: Record<string, string | undefined> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key && key.startsWith("--") && value !== undefined) {
      out[key.slice(2)] = value;
    }
  }
  return {
    sport: requireArg(out, "sport"),
    home: requireArg(out, "home"),
    away: requireArg(out, "away"),
    date: requireArg(out, "date"),
    kind: out["kind"] ?? "preview",
    out: out["out"],
  };
}

function requireArg(o: Record<string, string | undefined>, k: string): string {
  const v = o[k];
  if (!v) throw new Error(`missing --${k}`);
  return v;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const req = GenerateRequestSchema.parse({
    sport: args.sport,
    homeTeam: args.home,
    awayTeam: args.away,
    gameDate: args.date,
    kind: args.kind,
  });

  console.log(`[gen] building context for ${req.awayTeam} at ${req.homeTeam} on ${req.gameDate}`);
  const ctx = await buildGameContext({
    sport: req.sport,
    homeTeam: req.homeTeam,
    awayTeam: req.awayTeam,
    date: req.gameDate,
  });

  console.log(`[gen] calling Groq (${req.kind})`);
  const article = await generateArticle({ ctx, kind: req.kind, gameDate: req.gameDate });
  const html = renderArticleHtml(article);

  const outDir = args.out ?? "out-articles";
  mkdirSync(outDir, { recursive: true });
  const file = resolve(outDir, `${req.gameDate}-${req.awayTeam}-at-${req.homeTeam}-${req.kind}.html`);
  writeFileSync(file, html, "utf8");
  console.log(`[gen] wrote ${file}`);
  console.log(
    `[gen] tokens in=${article.promptTokens} out=${article.completionTokens} model=${article.modelUsed}`,
  );
}

main().catch((err: unknown) => {
  console.error("[gen] failed:", err);
  process.exit(1);
});
