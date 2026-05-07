/**
 * Compatibility re-export. The real implementation lives in `./llm.ts`,
 * which talks to Groq via the OpenAI compatible endpoint. This file is kept
 * around so existing imports keep working until callers migrate.
 */
export * from "./llm.js";
