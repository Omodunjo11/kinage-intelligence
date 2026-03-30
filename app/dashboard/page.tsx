"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DOMAIN_KEYS,
  DOMAIN_MAP,
  DOMAIN_MODEL_VERSION,
  getPriority,
  severityColor,
  suggestCadence,
  type DomainKey,
  type PriorityLevel,
  type Severity,
} from "@/lib/signalModel";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  feedName: string;
  published: string;
  score: number;
  relevance: number;
  priority: PriorityLevel;
  priorityGuidance: string;
  domainTags: DomainKey[];
  primaryDomain: DomainKey | null;
  summary?: string;
  why_it_matters?: string;
  risk_type?: string;
  entities?: string[];
  severity?: string;
  author?: string;
};

type AuthorActivity = {
  author: string;
  signalCount: number;
  avgRelevance: number;
  topDomain: string;
  latestPublished: string;
};

type DomainFilter = "ALL" | "UNASSIGNED" | DomainKey;

const PRIORITY_OPTIONS: Array<PriorityLevel | "ALL"> = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

function formatDate(value: string) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Unknown date";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortSource(src: string) {
  return src
    .replace(/^https?:\/\/(www\.)?/, "")
    .split("/")[0]
    .replace(/\.(com|gov|org|net|edu)$/, "")
    .replace(/_/g, " ");
}

function getSeverityMeta(severity: string | undefined) {
  if (
    severity !== "Low" &&
    severity !== "Moderate" &&
    severity !== "Elevated" &&
    severity !== "Critical"
  ) {
    return null;
  }
  return {
    label: severity as Severity,
    color: severityColor(severity as Severity),
  };
}

function StatCard(props: { label: string; value: string | number; sub: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{props.label}</div>
      <div className="stat-value">{props.value}</div>
      <div className="stat-sub">{props.sub}</div>
    </div>
  );
}

function AuthorPanel({ rows }: { rows: AuthorActivity[] }) {
  if (rows.length === 0) {
    return (
      <section className="authors-panel">
        <h3>Author Activity</h3>
        <p>
          No author metadata found yet. Run `npm run authors:enrich` to extract bylines
          and unlock author ranking.
        </p>
      </section>
    );
  }

  const ranked = rows
    .map((row) => ({
      ...row,
      rankScore: row.signalCount * 0.65 + row.avgRelevance * 0.35,
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8);
  const peak = ranked[0]?.rankScore ?? 1;

  return (
    <section className="authors-panel">
      <h3>Author Activity</h3>
      <p>Rank combines signal frequency (65%) and average relevance (35%).</p>
      <div className="author-list">
        {ranked.map((row) => (
          <div className="author-row" key={row.author}>
            <div className="author-top">
              <strong>{row.author}</strong>
              <span>{row.signalCount} signals</span>
            </div>
            <div className="author-bar">
              <div
                className="author-bar-fill"
                style={{ width: `${Math.max((row.rankScore / peak) * 100, 8)}%` }}
              />
            </div>
            <div className="author-meta">
              <span>Avg rel {row.avgRelevance.toFixed(3)}</span>
              <span>{row.topDomain}</span>
              <span>{formatDate(row.latestPublished)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [authors, setAuthors] = useState<AuthorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [domainFilter, setDomainFilter] = useState<DomainFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    Promise.all([
      fetch("/api/articles", { cache: "no-store" }),
      fetch("/api/authors", { cache: "no-store" }),
    ])
      .then(async ([articleResponse, authorResponse]) => {
        if (!articleResponse.ok) throw new Error(`Failed to load signals (${articleResponse.status})`);
        const articleData: unknown = await articleResponse.json();
        const authorData: unknown = authorResponse.ok ? await authorResponse.json() : [];
        setArticles(Array.isArray(articleData) ? (articleData as Article[]) : []);
        setAuthors(Array.isArray(authorData) ? (authorData as AuthorActivity[]) : []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const maxScore = useMemo(
    () => Math.max(articles[0]?.relevance ?? 1, 1),
    [articles]
  );

  const latestTimestamp = useMemo(() => {
    const parsed = articles
      .map((article) => Date.parse(article.published))
      .filter((ts) => Number.isFinite(ts));
    return parsed.length ? Math.max(...parsed) : 0;
  }, [articles]);

  const signalVolume7d = useMemo(() => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const start = latestTimestamp - sevenDaysMs;
    return articles.filter((article) => {
      const ts = Date.parse(article.published);
      return Number.isFinite(ts) && ts >= start;
    }).length;
  }, [articles, latestTimestamp]);

  const cadenceText = suggestCadence(signalVolume7d);

  const domainCounts = useMemo(() => {
    const byDomain = new Map<DomainKey, number>();
    let unassigned = 0;

    for (const article of articles) {
      if (article.primaryDomain) {
        byDomain.set(article.primaryDomain, (byDomain.get(article.primaryDomain) ?? 0) + 1);
      } else {
        unassigned += 1;
      }
    }

    const ordered = DOMAIN_KEYS.map((key) => ({
      key,
      ...DOMAIN_MAP[key],
      count: byDomain.get(key) ?? 0,
    })).filter((row) => row.count > 0);

    return {
      domains: ordered,
      unassigned,
    };
  }, [articles]);

  const visible = useMemo(() => {
    return articles.filter((article) => {
      if (domainFilter !== "ALL") {
        if (domainFilter === "UNASSIGNED") {
          if (article.primaryDomain !== null) return false;
        } else if (article.primaryDomain !== domainFilter) {
          return false;
        }
      }

      const priority = getPriority(article.relevance).level;
      if (priorityFilter !== "ALL" && priority !== priorityFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !article.title.toLowerCase().includes(q) &&
          !article.source.toLowerCase().includes(q) &&
          !article.feedName.toLowerCase().includes(q) &&
          !(article.author ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [articles, domainFilter, priorityFilter, search]);

  const avgRelevance = useMemo(() => {
    if (visible.length === 0) return 0;
    return visible.reduce((sum, article) => sum + article.relevance, 0) / visible.length;
  }, [visible]);

  const criticalCount = useMemo(
    () => articles.filter((article) => getPriority(article.relevance).level === "CRITICAL").length,
    [articles]
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="page">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap");
        * { box-sizing: border-box; }
        body { margin: 0; }
        .page {
          min-height: 100vh;
          font-family: "IBM Plex Sans", sans-serif;
          color: #0f172a;
          background:
            radial-gradient(circle at top right, #dbeafe 0%, transparent 35%),
            radial-gradient(circle at top left, #fef3c7 0%, transparent 30%),
            #f8fafc;
        }
        .shell {
          max-width: 1480px;
          margin: 0 auto;
          padding: 28px 28px 56px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 24px;
          margin-bottom: 20px;
        }
        .eyebrow {
          font-family: "IBM Plex Mono", monospace;
          letter-spacing: 0.12em;
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        h1 {
          margin: 0;
          font-family: "Fraunces", serif;
          font-size: clamp(30px, 4.2vw, 42px);
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .subtitle {
          margin-top: 10px;
          color: #334155;
          font-size: 14px;
          max-width: 720px;
        }
        .header-meta {
          text-align: right;
          color: #334155;
          font-size: 13px;
          line-height: 1.7;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
        }
        .stat-label {
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 10px;
        }
        .stat-value {
          font-size: clamp(24px, 2.6vw, 34px);
          line-height: 1;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 7px;
        }
        .stat-sub {
          font-size: 12px;
          color: #475569;
        }
        .main-grid {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }
        .panel {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
        }
        .sidebar {
          padding: 14px;
          position: sticky;
          top: 18px;
        }
        .section-title {
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          margin: 4px 0 10px;
        }
        .filter-item {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 10px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          background: #fff;
          color: #1e293b;
          font-size: 13px;
          width: 100%;
          text-align: left;
        }
        .filter-item.active {
          border-color: #0f172a;
          background: #f8fafc;
          font-weight: 600;
        }
        .hint-box {
          margin-top: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          background: #f8fafc;
          color: #334155;
          font-size: 12px;
          line-height: 1.55;
        }
        .content {
          padding: 14px;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .toolbar input {
          width: min(420px, 100%);
          border: 1px solid #94a3b8;
          border-radius: 10px;
          padding: 9px 11px;
          font-size: 14px;
          color: #0f172a;
        }
        .toolbar input:focus {
          outline: 2px solid #93c5fd;
          border-color: #2563eb;
        }
        .toolbar-meta {
          color: #334155;
          font-size: 13px;
          text-align: right;
          line-height: 1.45;
        }
        .header-row, .signal-row {
          display: grid;
          grid-template-columns: 34px minmax(0, 1.8fr) 145px 170px 120px 120px;
          gap: 10px;
          align-items: center;
        }
        .header-row {
          border-bottom: 1px solid #cbd5e1;
          color: #475569;
          font-family: "IBM Plex Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 11px;
          padding: 0 10px 8px;
        }
        .signal-row {
          padding: 12px 10px;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          width: 100%;
          border-left: none;
          border-right: none;
          border-top: none;
          background: transparent;
          text-align: left;
        }
        .signal-row:hover {
          background: #f8fafc;
        }
        .signal-title {
          font-size: 14px;
          color: #0f172a;
          line-height: 1.45;
          margin-bottom: 6px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          font-size: 11px;
          margin-right: 6px;
          margin-bottom: 3px;
          color: #334155;
          background: #f8fafc;
        }
        .expand {
          padding: 10px 10px 14px 44px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
          font-size: 13px;
          line-height: 1.65;
          background: #f8fafc;
        }
        .expand h4 {
          margin: 0 0 6px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #334155;
        }
        .expand p {
          margin: 0 0 10px;
        }
        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .meta-chip {
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 4px 8px;
        }
        .authors-panel {
          margin-top: 14px;
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
        }
        .authors-panel h3 {
          margin: 0 0 4px;
          font-family: "Fraunces", serif;
          font-size: 22px;
          color: #0f172a;
        }
        .authors-panel p {
          margin: 0 0 10px;
          color: #475569;
          font-size: 13px;
        }
        .author-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .author-row {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 9px;
          background: #fff;
        }
        .author-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
          font-size: 12px;
          color: #334155;
        }
        .author-bar {
          height: 8px;
          border-radius: 8px;
          background: #e2e8f0;
          overflow: hidden;
          margin-bottom: 7px;
        }
        .author-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #0ea5e9);
        }
        .author-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
          color: #475569;
        }
        .empty {
          text-align: center;
          padding: 26px;
          color: #475569;
          font-size: 14px;
        }
        .error {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        @media (max-width: 1120px) {
          .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .main-grid { grid-template-columns: 1fr; }
          .sidebar { position: static; }
          .header-row, .signal-row {
            grid-template-columns: 24px minmax(0, 1.8fr) 100px 120px 90px 90px;
            gap: 8px;
          }
          .author-list { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .shell { padding: 18px 14px 30px; }
          .header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-meta {
            text-align: left;
          }
          .cards { grid-template-columns: 1fr; }
          .header-row { display: none; }
          .signal-row {
            grid-template-columns: 24px minmax(0, 1fr);
          }
          .signal-row > :nth-child(n+3) { display: none; }
        }
      `}</style>
      <main className="shell">
        <section className="header">
          <div>
            <div className="eyebrow">Kinage Intelligence Dashboard</div>
            <h1>Signal Feed</h1>
            <p className="subtitle">
              Domain filter now applies to canonical primary topic assignment, so selecting
              a domain truly narrows the feed by topic.
            </p>
          </div>
          <div className="header-meta">
            {articles.length} total signals<br />
            Model version {DOMAIN_MODEL_VERSION}
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="cards">
          <StatCard
            label="Signals (7d)"
            value={signalVolume7d}
            sub="volume-based KPI for review cadence"
          />
          <StatCard
            label="Critical Priority"
            value={criticalCount}
            sub="score-derived items for immediate triage"
          />
          <StatCard
            label="Average Relevance"
            value={avgRelevance.toFixed(3)}
            sub={`mean score for ${visible.length} visible signals`}
          />
          <StatCard
            label="Peak Relevance"
            value={maxScore.toFixed(3)}
            sub="top observed score in this dataset"
          />
        </section>

        <section className="main-grid">
          <aside className="panel sidebar">
            <div className="section-title">Topic Domain</div>
            <button
              type="button"
              className={`filter-item ${domainFilter === "ALL" ? "active" : ""}`}
              onClick={() => setDomainFilter("ALL")}
            >
              <span>All topics</span>
              <span>{articles.length}</span>
            </button>
            {domainCounts.domains.map((domain) => (
              <button
                type="button"
                key={domain.key}
                className={`filter-item ${domainFilter === domain.key ? "active" : ""}`}
                onClick={() => setDomainFilter(domain.key)}
              >
                <span style={{ color: domain.color }}>{domain.label}</span>
                <span>{domain.count}</span>
              </button>
            ))}
            {domainCounts.unassigned > 0 && (
              <button
                type="button"
                className={`filter-item ${domainFilter === "UNASSIGNED" ? "active" : ""}`}
                onClick={() => setDomainFilter("UNASSIGNED")}
              >
                <span>Unassigned</span>
                <span>{domainCounts.unassigned}</span>
              </button>
            )}

            <div className="section-title" style={{ marginTop: 16 }}>
              Priority
            </div>
            {PRIORITY_OPTIONS.map((priority) => {
              const count =
                priority === "ALL"
                  ? articles.length
                  : articles.filter(
                      (article) => getPriority(article.relevance).level === priority
                    ).length;
              return (
                <button
                  type="button"
                  key={priority}
                  className={`filter-item ${priorityFilter === priority ? "active" : ""}`}
                  onClick={() => setPriorityFilter(priority)}
                >
                  <span>{priority === "ALL" ? "All priorities" : priority}</span>
                  <span>{count}</span>
                </button>
              );
            })}

            <div className="hint-box">
              <strong>How metrics interact:</strong>
              <br />
              Priority is derived from relevance score and drives response urgency.
              <br />
              Severity is content-risk intensity and can differ from priority.
              <br />
              {cadenceText}
            </div>
          </aside>

          <section className="panel content">
            <div className="toolbar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, source, feed, author..."
              />
              <div className="toolbar-meta">
                {visible.length} of {articles.length} signals shown
                <br />
                Priority action window: Critical &lt; 24h, High this week
              </div>
            </div>

            <div className="header-row">
              <span>#</span>
              <span>Signal</span>
              <span>Source</span>
              <span>Relevance</span>
              <span>Priority</span>
              <span>Severity</span>
            </div>

            {loading && <div className="empty">Loading signals...</div>}
            {!loading && visible.length === 0 && (
              <div className="empty">No signals match the current filters.</div>
            )}

            {!loading &&
              visible.map((article, index) => {
                const domain = article.primaryDomain
                  ? DOMAIN_MAP[article.primaryDomain]
                  : null;
                const priority = getPriority(article.relevance);
                const severity = getSeverityMeta(article.severity);
                const isExpanded = expanded.has(article.id);

                return (
                  <div key={article.id}>
                    <button
                      type="button"
                      className="signal-row"
                      onClick={() => toggleExpanded(article.id)}
                    >
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div className="signal-title">{article.title}</div>
                        <div>
                          {domain ? (
                            <span
                              className="pill"
                              style={{
                                borderColor: `${domain.color}55`,
                                color: domain.color,
                                background: `${domain.color}12`,
                              }}
                            >
                              {domain.label}
                            </span>
                          ) : (
                            <span className="pill">Unassigned topic</span>
                          )}
                          {article.domainTags
                            .filter((d) => d !== article.primaryDomain)
                            .slice(0, 2)
                            .map((domainKey) => (
                              <span className="pill" key={domainKey}>
                                {DOMAIN_MAP[domainKey].label}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div style={{ color: "#334155", fontSize: 12 }}>
                        {shortSource(article.source)}
                      </div>
                      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>
                        {article.relevance.toFixed(3)}
                      </div>
                      <div>
                        <span
                          className="pill"
                          style={{
                            borderColor: `${priority.color}55`,
                            color: priority.color,
                            background: priority.bg,
                            fontWeight: 600,
                          }}
                        >
                          {priority.level}
                        </span>
                      </div>
                      <div>
                        {severity ? (
                          <span
                            className="pill"
                            style={{
                              borderColor: `${severity.color}55`,
                              color: severity.color,
                              background: `${severity.color}12`,
                              fontWeight: 600,
                            }}
                          >
                            {severity.label}
                          </span>
                        ) : (
                          <span className="pill">Not set</span>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="expand">
                        <h4>Summary</h4>
                        <p>{article.summary ?? "No summary generated yet for this signal."}</p>
                        <h4>Why it matters</h4>
                        <p>
                          {article.why_it_matters ??
                            "No strategic impact note generated yet."}
                        </p>
                        <div className="meta-row">
                          <span className="meta-chip">
                            Priority guidance: {article.priorityGuidance}
                          </span>
                          <span className="meta-chip">
                            Published: {formatDate(article.published)}
                          </span>
                          {article.author && (
                            <span className="meta-chip">Author: {article.author}</span>
                          )}
                          {article.url && (
                            <a
                              className="meta-chip"
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: "none", color: "#0f172a" }}
                            >
                              Open source ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            <AuthorPanel rows={authors} />
          </section>
        </section>
      </main>
    </div>
  );
}
