import { describe, expect, it } from "vitest";
import { GenerateRequestSchema } from "../src/lib/types.js";

describe("GenerateRequestSchema", () => {
  it("accepts a valid request", () => {
    const r = GenerateRequestSchema.parse({
      homeTeam: "Bears",
      awayTeam: "Packers",
      gameDate: "2026-09-08",
      sport: "nfl",
      kind: "preview",
    });
    expect(r.homeTeam).toBe("Bears");
  });

  it("rejects bad date format", () => {
    expect(() =>
      GenerateRequestSchema.parse({
        homeTeam: "Bears",
        awayTeam: "Packers",
        gameDate: "Sept 8 2026",
        sport: "nfl",
        kind: "preview",
      }),
    ).toThrow();
  });

  it("rejects unknown sport", () => {
    expect(() =>
      GenerateRequestSchema.parse({
        homeTeam: "Bears",
        awayTeam: "Packers",
        gameDate: "2026-09-08",
        sport: "cricket",
        kind: "preview",
      }),
    ).toThrow();
  });
});
