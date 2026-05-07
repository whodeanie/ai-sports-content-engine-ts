/**
 * Thin wrapper over the OpenAI compatible Groq endpoint. One function per
 * task: generate an article. Returns parsed structured output plus token
 * usage. Free inference via Groq using Llama 3.3 70B by default.
 */
import OpenAI from "openai";
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 2000,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPromptFor(args.kind) },
      { role: "user", content: userPromptFor(args.ctx, args.gameDate) },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = extractJson(text);
  const parsed = ArticleResponseSchema.parse(json);

  return {
    ...parsed,
    modelUsed: model,
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
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
