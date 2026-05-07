/**
 * Minimal ESPN unofficial endpoint client. No API key required.
 *
 * The endpoints are stable but undocumented. We pull two things:
 *   1. team summary (record, recent results, points for / against averages)
 *   2. scoreboard for the date, to find the game and any final score
 *
 * Heuristic: we look up teams by displayName or abbreviation case insensitively.
 */
import { z } from "zod";
import type { GameContext, ScoreboardGame, Sport, TeamSummary } from "./types.js";

const SPORT_PATH: Record<Sport, string> = {
  nfl: "football/nfl",
  nba: "basketball/nba",
  mlb: "baseball/mlb",
};

const TeamItemSchema = z.object({
  id: z.string(),
  abbreviation: z.string(),
  displayName: z.string(),
  shortDisplayName: z.string().optional(),
  name: z.string().optional(),
});

const TeamsResponseSchema = z.object({
  sports: z
    .array(
      z.object({
        leagues: z.array(
          z.object({
            teams: z.array(z.object({ team: TeamItemSchema })),
          }),
        ),
      }),
    )
    .min(1),
});

const RecordEntrySchema = z.object({
  type: z.string().optional(),
  summary: z.string().optional(),
  stats: z
    .array(
      z.object({
        name: z.string(),
        value: z.number().optional(),
      }),
    )
    .optional(),
});

const TeamSummarySchema = z.object({
  team: z.object({
    record: z.object({ items: z.array(RecordEntrySchema) }).optional(),
    nextEvent: z.array(z.unknown()).optional(),
  }),
});

const CompetitorSchema = z.object({
  homeAway: z.enum(["home", "away"]),
  team: z.object({
    abbreviation: z.string(),
    displayName: z.string(),
  }),
  score: z.string().optional(),
});

const EventSchema = z.object({
  id: z.string(),
  date: z.string(),
  shortName: z.string(),
  competitions: z.array(
    z.object({
      competitors: z.array(CompetitorSchema),
      status: z.object({
        type: z.object({ description: z.string(), completed: z.boolean() }),
      }),
    }),
  ),
});

const ScoreboardSchema = z.object({
  events: z.array(EventSchema),
});

const BASE = process.env.ESPN_API_BASE ?? "https://site.api.espn.com/apis/site/v2/sports";

interface TeamMetadata {
  id: string;
  abbreviation: string;
  displayName: string;
}

async function listTeams(sport: Sport): Promise<TeamMetadata[]> {
  const url = `${BASE}/${SPORT_PATH[sport]}/teams?limit=100`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`espn teams ${res.status}`);
  const json: unknown = await res.json();
  const parsed = TeamsResponseSchema.parse(json);
  const items: TeamMetadata[] = [];
  for (const sportItem of parsed.sports) {
    for (const league of sportItem.leagues) {
      for (const t of league.teams) {
        items.push({
          id: t.team.id,
          abbreviation: t.team.abbreviation,
          displayName: t.team.displayName,
        });
      }
    }
  }
  return items;
}

function findTeam(meta: TeamMetadata[], query: string): TeamMetadata | undefined {
  const q = query.toLowerCase().trim();
  return (
    meta.find((m) => m.abbreviation.toLowerCase() === q) ??
    meta.find((m) => m.displayName.toLowerCase() === q) ??
    meta.find((m) => m.displayName.toLowerCase().includes(q)) ??
    meta.find((m) => q.includes(m.displayName.toLowerCase()))
  );
}

async function summarizeTeam(sport: Sport, team: TeamMetadata): Promise<TeamSummary> {
  const url = `${BASE}/${SPORT_PATH[sport]}/teams/${team.id}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`espn team summary ${res.status}`);
  const json: unknown = await res.json();
  const parsed = TeamSummarySchema.parse(json);

  const records = parsed.team.record?.items ?? [];
  const overall = records.find((r) => r.type === "total") ?? records[0];

  const ptsForStat = overall?.stats?.find((s) => s.name === "pointsFor");
  const ptsAgainstStat = overall?.stats?.find((s) => s.name === "pointsAgainst");

  return {
    abbreviation: team.abbreviation,
    displayName: team.displayName,
    recordSummary: overall?.summary ?? "n/a",
    recentForm: [],
    pointsFor: ptsForStat?.value ?? null,
    pointsAgainst: ptsAgainstStat?.value ?? null,
  };
}

export async function fetchScoreboardForDate(
  sport: Sport,
  date: string,
  homeTeam: string,
  awayTeam: string,
): Promise<ScoreboardGame | null> {
  const compact = date.replace(/-/g, "");
  const url = `${BASE}/${SPORT_PATH[sport]}/scoreboard?dates=${compact}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = ScoreboardSchema.parse(json);
  const ht = homeTeam.toLowerCase();
  const at = awayTeam.toLowerCase();
  for (const event of parsed.events) {
    const competition = event.competitions[0];
    if (!competition) continue;
    const home = competition.competitors.find((c) => c.homeAway === "home");
    const away = competition.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;
    const matches =
      (home.team.displayName.toLowerCase().includes(ht) ||
        home.team.abbreviation.toLowerCase() === ht) &&
      (away.team.displayName.toLowerCase().includes(at) ||
        away.team.abbreviation.toLowerCase() === at);
    if (!matches) continue;
    return {
      id: event.id,
      shortName: event.shortName,
      status: competition.status.type.description,
      homeScore: home.score ? Number(home.score) : null,
      awayScore: away.score ? Number(away.score) : null,
      startsAt: event.date,
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
    };
  }
  return null;
}

export async function buildGameContext(args: {
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  date: string;
}): Promise<GameContext> {
  const teams = await listTeams(args.sport);
  const home = findTeam(teams, args.homeTeam);
  const away = findTeam(teams, args.awayTeam);
  if (!home) throw new Error(`could not resolve home team: ${args.homeTeam}`);
  if (!away) throw new Error(`could not resolve away team: ${args.awayTeam}`);

  const [homeSummary, awaySummary, scoreboard] = await Promise.all([
    summarizeTeam(args.sport, home),
    summarizeTeam(args.sport, away),
    fetchScoreboardForDate(args.sport, args.date, args.homeTeam, args.awayTeam),
  ]);

  return {
    sport: args.sport,
    homeTeam: homeSummary,
    awayTeam: awaySummary,
    scoreboard,
    fetchedAt: new Date().toISOString(),
  };
}
