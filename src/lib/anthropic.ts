/**
 * Thin wrapper over the Anthropic SDK. One function per task: generate an
 * article. Returns parsed structured output plus token usage.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ArticleKind, GameContext, GeneratedArticle } from "./types.js";
import { systemPromptFor } from "../prompts/system.js";
import { userPromptFor } from "../prompts/user.js";

const ArticleResponseSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string(),
      }),
    )
    .min(3),
  prediction: z.string(),
  disclaimer: z.string(),
});

export interface GenerateArgs {
  ctx: GameContext;
  kind: ArticleKind;
  gameDate: string;
}

export async function generateArticle(args: GenerateArgs): Promise<GeneratedArticle> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.6,
    system: systemPromptFor(args.kind),
    messages: [{ role: "user", content: userPromptFor(args.ctx, args.gameDate) }],
  });

  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  const json = extractJson(text);
  const parsed = ArticleResponseSchema.parse(json);

  return {
    ...parsed,
    modelUsed: model,
    promptTokens: message.usage.input_tokens,
    completionTokens: message.usage.output_tokens,
  };
}

/**
 * Pull the first balanced JSON object from a string. Defensive against models
 * that occasionally wrap output in prose despite instructions.
 */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in model output");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }
  }
  throw new Error("unbalanced JSON in model output");
}
