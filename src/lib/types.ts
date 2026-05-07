/**
 * Shared input and output types for the content engine.
 */
import { z } from "zod";

export const SportSchema = z.enum(["nfl", "nba", "mlb"]);
export type Sport = z.infer<typeof SportSchema>;

export const ArticleKindSchema = z.enum(["preview", "betting-analysis", "recap"]);
export type ArticleKind = z.infer<typeof ArticleKindSchema>;

export const GenerateRequestSchema = z.object({
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  gameDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "gameDate must be YYYY-MM-DD"),
  sport: SportSchema,
  kind: ArticleKindSchema,
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export interface TeamSummary {
  abbreviation: string;
  displayName: string;
  recordSummary: string;
  recentForm: string[];
  pointsFor: number | null;
  pointsAgainst: number | null;
}

export interface ScoreboardGame {
  id: string;
  shortName: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
}

export interface GameContext {
  sport: Sport;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  scoreboard: ScoreboardGame | null;
  fetchedAt: string;
}

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface GeneratedArticle {
  title: string;
  subtitle: string;
  sections: ArticleSection[];
  prediction: string;
  disclaimer: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
}
