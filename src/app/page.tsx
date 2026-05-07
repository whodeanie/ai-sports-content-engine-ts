"use client";

import { useState } from "react";
import type { GeneratedArticle } from "@/lib/types";

export default function HomePage() {
  const [sport, setSport] = useState("nfl");
  const [home, setHome] = useState("Bears");
  const [away, setAway] = useState("Packers");
  const [date, setDate] = useState("2026-09-08");
  const [kind, setKind] = useState("preview");
  const [html, setHtml] = useState<string>("");
  const [meta, setMeta] = useState<GeneratedArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          homeTeam: home,
          awayTeam: away,
          gameDate: date,
          kind,
        }),
      });
      const j = (await res.json()) as
        | { article: GeneratedArticle; html: string }
        | { error: string };
      if ("error" in j) {
        setError(j.error);
        return;
      }
      setHtml(j.html);
      setMeta(j.article);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "generate failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>AI sports content engine</h1>
      <p className="muted">
        Pulls team and game context from ESPN free endpoints, structures the prompt for Llama 3.3
        70B via Groq, and renders a polished HTML article. Free inference on the Groq daily token
        budget, with deterministic fallback when the budget is exhausted.
      </p>

      <div className="card row">
        <div className="field">
          <label>Sport</label>
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="nfl">NFL</option>
            <option value="nba">NBA</option>
            <option value="mlb">MLB</option>
          </select>
        </div>
        <div className="field">
          <label>Home team</label>
          <input value={home} onChange={(e) => setHome(e.target.value)} />
        </div>
        <div className="field">
          <label>Away team</label>
          <input value={away} onChange={(e) => setAway(e.target.value)} />
        </div>
        <div className="field">
          <label>Date</label>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
        </div>
        <div className="field">
          <label>Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="preview">Preview</option>
            <option value="betting-analysis">Betting analysis</option>
            <option value="recap">Recap</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={generate} disabled={loading}>
          {loading ? "generating..." : "generate article"}
        </button>
        {meta ? (
          <span className="muted">
            model {meta.modelUsed} . in tokens {meta.promptTokens} . out tokens{" "}
            {meta.completionTokens}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#d49a7a", color: "#d49a7a" }}>
          {error}
        </div>
      ) : null}

      {html ? (
        <div className="card preview">
          <iframe srcDoc={html} title="article preview" />
        </div>
      ) : null}
    </main>
  );
}
