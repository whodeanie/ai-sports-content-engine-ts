import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "@/lib/anthropic";
import { buildGameContext } from "@/lib/espn";
import { renderArticleHtml } from "@/lib/render-html";
import { GenerateRequestSchema } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = GenerateRequestSchema.parse(body);
    const ctx = await buildGameContext({
      sport: parsed.sport,
      homeTeam: parsed.homeTeam,
      awayTeam: parsed.awayTeam,
      date: parsed.gameDate,
    });
    const article = await generateArticle({
      ctx,
      kind: parsed.kind,
      gameDate: parsed.gameDate,
    });
    return NextResponse.json({
      article,
      html: renderArticleHtml(article),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "generate failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
