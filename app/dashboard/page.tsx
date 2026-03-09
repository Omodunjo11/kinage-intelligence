import { getArticlesData } from "@/lib/articles";

type Article = {
  id?: string;
  title: string;
  source: string;
  score: number;
  tags?: string[];
};

const SOURCE_COLORS: Record<string, string> = {
  "fbi.gov": "#1a3a5c",
  "federalreserve.gov": "#0d3d2b",
  "sec.gov": "#3a1a00",
  default: "#1e1e2e",
};

function getThreatLevel(score: number) {
  if (score > 0.6) return { label: "CRITICAL", color: "#ff2d2d", bg: "#2d0a0a" };
  if (score > 0.4) return { label: "HIGH", color: "#ff8c00", bg: "#2d1a00" };
  if (score > 0.2) return { label: "MEDIUM", color: "#f5c518", bg: "#2d2500" };
  return { label: "LOW", color: "#4caf8a", bg: "#0a2d1e" };
}

function getSourceShort(source: string) {
  return source.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
}

export default async function DashboardPage() {
  const articles: Article[] = await getArticlesData();

  const filtered = articles
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score);

  const critCount = filtered.filter(a => getThreatLevel(a.score).label === "CRITICAL").length;
  const highCount = filtered.filter(a => getThreatLevel(a.score).label === "HIGH").length;
  const avgScore  = filtered.length
    ? (filtered.reduce((s, a) => s + a.score, 0) / filtered.length).toFixed(3)
    : "—";

  const now = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#080c14", minHeight: "100vh", color: "#c8d8e8" }}>
      {/* HEADER */}
      <header style={{ borderBottom: "1px solid rgba(100,160,220,0.12)", padding: "20px 40px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, letterSpacing: "0.1em", color: "#e0eefa" }}>
            KINAGE INTELLIGENCE
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3a6080" }}>
            ACTIVE LEARNING · SIGNAL MONITORING SYSTEM
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#5a8aaa" }}>
          LIVE FEED · {now}
        </div>
      </header>

      <main style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
          <Stat label="TOTAL SIGNALS" value={filtered.length} accent="#4a90d9" />
          <Stat label="CRITICAL" value={critCount} accent="#ff2d2d" />
          <Stat label="HIGH PRIORITY" value={highCount} accent="#ff8c00" />
          <Stat label="AVG RELEVANCE" value={avgScore} accent="#4caf8a" />
        </div>

        {/* ARTICLES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((article, i) => {
            const { label, color, bg } = getThreatLevel(article.score);
            const srcShort = getSourceShort(article.source);

            return (
              <div
                key={article.id ?? `${article.title}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 180px 120px 100px",
                  gap: 16,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(100,160,220,0.08)",
                  borderRadius: 4,
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: 22, opacity: 0.2 }}>{String(i + 1).padStart(2, "0")}</span>

                <div>
                  <div style={{ fontSize: 13, color: "#d0e4f4" }}>
                    {article.title}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#4a6a80" }}>
                  {srcShort}
                </div>

                <div>
                  <div style={{ fontSize: 12, color }}>
                    {article.score.toFixed(4)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 9,
                    padding: "4px 10px",
                    background: bg,
                    border: `1px solid ${color}30`,
                    borderRadius: 3,
                    color
                  }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, opacity: 0.4 }}>
            NO SIGNALS AVAILABLE
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div style={{
      border: "1px solid rgba(100,160,220,0.15)",
      padding: "20px 24px",
      borderRadius: 6,
      background: "rgba(255,255,255,0.02)"
    }}>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#3a6080", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 44, color: accent }}>
        {value}
      </div>
    </div>
  );
}
