/**
 * Builds the user prompt. The Groq call sends the system prompt plus
 * this string. Keeping the user prompt small and structured (one team summary
 * per side, scoreboard if available) reduces tokens and improves reliability.
 */
import type { GameContext } from "../lib/types";

export function userPromptFor(ctx: GameContext, gameDate: string): string {
  const sb = ctx.scoreboard;
  const sbBlock = sb
    ? [
        `Scoreboard found for ${gameDate}:`,
        `  ${sb.shortName}`,
        `  status: ${sb.status}`,
        sb.homeScore !== null && sb.awayScore !== null
          ? `  final: ${sb.awayTeam} ${sb.awayScore} at ${sb.homeTeam} ${sb.homeScore}`
          : `  starts: ${sb.startsAt}`,
      ].join("\n")
    : `No scoreboard event found for ${gameDate}; treat this as a future preview.`;

  return [
    `Sport: ${ctx.sport.toUpperCase()}`,
    `Date: ${gameDate}`,
    "",
    "Home team:",
    teamBlock(ctx.homeTeam),
    "",
    "Away team:",
    teamBlock(ctx.awayTeam),
    "",
    sbBlock,
    "",
    "Write the article using only the facts above plus general sport knowledge.",
    "Do not invent specific player names or scores. If a stat is missing, say so",
    "or omit it. Keep the analysis grounded.",
  ].join("\n");
}

function teamBlock(t: GameContext["homeTeam"]): string {
  return [
    `  name: ${t.displayName} (${t.abbreviation})`,
    `  record: ${t.recordSummary}`,
    `  pointsFor avg: ${t.pointsFor ?? "n/a"}`,
    `  pointsAgainst avg: ${t.pointsAgainst ?? "n/a"}`,
  ].join("\n");
}
