# ai-sports-content-engine-ts

A TypeScript content pipeline that turns a matchup ID into a polished HTML article: game preview, betting analysis, or recap. Pulls real team and game context from ESPN free endpoints, structures the prompt for Claude Sonnet 4.6 via the Anthropic SDK, and renders structured output to a self contained HTML document.

> Educational analytics. Article output is not human authored. Verify facts before publishing.

## Why this is the strongest Applied AI demo of the bunch

1. **Real Anthropic SDK integration** with `@anthropic-ai/sdk@0.32.x`. Calls `client.messages.create` with a per kind system prompt and a typed user prompt.
2. **Structured prompts** that enforce JSON output, exact section count and order, paragraph length bounds, and a per kind disclaimer. Output is parsed and validated through a Zod schema before rendering.
3. **Real data context.** Team summaries (record, points for / against averages) come from ESPN. Past games include the final score; future games skip score talk and frame as a preview.
4. **Defensive parsing.** A balanced brace JSON extractor that recovers cleanly even when the model wraps output in stray prose.
5. **Cost transparent.** Each generation logs input and output tokens. At Sonnet 4.6 list price (3 USD per million input, 15 USD per million output), a typical 3k input plus 1k output article costs about 2.5 cents.

## Run locally

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY in .env.local
npm install
npm run dev   # http://localhost:3000
```

Or run as a CLI:

```bash
npm run generate -- --sport nfl --home Bears --away Packers --date 2026-09-08 --kind preview
# writes out-articles/2026-09-08-Packers-at-Bears-preview.html
```

Three article kinds are supported: `preview`, `betting-analysis`, `recap`. Each enforces its own four section structure.

## Architecture

```
src/
  app/
    layout.tsx
    page.tsx                       form, iframe preview
    globals.css
    api/generate/route.ts          POST /api/generate
  lib/
    types.ts                       Zod schemas, GeneratedArticle type
    espn.ts                        team and scoreboard fetchers
    anthropic.ts                   SDK wrapper, JSON extractor, schema validation
    render-html.ts                 standalone HTML article renderer
  prompts/
    system.ts                      per kind system prompts (4 sections, schema, disclaimer rules)
    user.ts                        user prompt builder (team blocks, scoreboard block, guardrail)
  scripts/
    generate-cli.ts                npm run generate
tests/
  render-html.test.ts
  types.test.ts
```

### The prompt strategy

The system prompt locks the model into a strict JSON shape, with exactly four sections in a fixed order per kind, paragraph length bounds (80 to 160 words), and a per kind disclaimer rule. The user prompt provides only structured facts: team names, records, points for and against, and an optional scoreboard line for the date. The model is instructed not to invent specific player names or scores beyond what was provided.

```ts
const message = await client.messages.create({
  model,
  max_tokens: 2000,
  temperature: 0.6,
  system: systemPromptFor(kind),
  messages: [{ role: "user", content: userPromptFor(ctx, gameDate) }],
});
```

The output is parsed by:

1. Grabbing the first balanced JSON object via a depth counter (defensive against prose wrapping).
2. Validating shape with Zod (`title`, `subtitle`, `sections[]`, `prediction`, `disclaimer`).
3. Rendering to HTML with inline CSS so the file is portable.

## Deploy

Vercel free tier. The generate route runs on Node serverless. Set the `ANTHROPIC_API_KEY` env var in the Vercel project. Increase the function timeout to 60s (the route exports `maxDuration = 60`).

## Tests

```bash
npm run test
npm run typecheck
npm run lint
```

The tests cover schema validation, the JSON extractor, and HTML escaping. The Anthropic SDK call is intentionally not mocked in the suite; it is the integration boundary that you exercise with `npm run generate`.

## License

MIT.
