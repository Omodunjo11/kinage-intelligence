"use client";

import { useEffect, useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "Low" | "Moderate" | "Elevated" | "Critical";

type Article = {
  id?: string;
  title: string;
  url?: string;
  source: string;
  rss_source?: string;
  published_at?: string;
  score: number;
  dominant_domain?: string;
  tags?: string[];
  // Pre-computed intelligence fields (only present when score >= 0.65)
  summary?: string;
  why_it_matters?: string;
  risk_type?: string;
  entities?: string[];
  severity?: Severity;
};

type Level = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type DomId = "A" | "B" | "C" | "D" | "E" | "F" | "G";

// ─── AL Domain taxonomy ───────────────────────────────────────────────────────

const DOMAINS: { id: DomId; label: string; keywords: string[]; color: string }[] = [
  { id: "A", label: "Bill Execution",       keywords: ["bill","bills","payment"],                                             color: "#5b9cf6" },
  { id: "B", label: "Family Coordination",  keywords: ["family","caregiver","sandwich","sibling","long-distance"],           color: "#a78bfa" },
  { id: "C", label: "Elder Fraud",          keywords: ["fraud","scam","exploit","theft","stolen","arrest","scheme","abuse"], color: "#f87171" },
  { id: "D", label: "Cognitive Decline",    keywords: ["dementia","memory","alzheimer","cognitive"],                         color: "#fbbf24" },
  { id: "E", label: "Dignity & Autonomy",   keywords: ["dignity","autonomy","independence","privacy"],                      color: "#34d399" },
  { id: "F", label: "Competitor Signal",    keywords: ["silverbills","eversafe","carefull","myfloc","true link"],           color: "#fb923c" },
  { id: "G", label: "Professional Channel", keywords: ["dmm","fiduciary","attorney","advisor"],                             color: "#38bdf8" },
];

// Match dominant_domain string from backend OR keyword-infer as fallback
function getDomain(a: Article) {
  if (a.dominant_domain) {
    const dd = a.dominant_domain.toLowerCase();
    if (dd.includes("fraud") || dd.includes("exploit"))      return DOMAINS[2]; // C
    if (dd.includes("dementia") || dd.includes("cognitive")) return DOMAINS[3]; // D
    if (dd.includes("bill") || dd.includes("payment"))       return DOMAINS[0]; // A
    if (dd.includes("family") || dd.includes("caregiver"))   return DOMAINS[1]; // B
    if (dd.includes("dignity") || dd.includes("autonomy"))   return DOMAINS[4]; // E
    if (dd.includes("competitor"))                           return DOMAINS[5]; // F
    if (dd.includes("professional") || dd.includes("fiduciary")) return DOMAINS[6]; // G
  }
  const txt = (a.title + " " + (a.tags ?? []).join(" ")).toLowerCase();
  return DOMAINS.find(d => d.keywords.some(k => txt.includes(k))) ?? null;
}

function getLevel(score: number): { level: Level; color: string; bg: string } {
  if (score > 0.6) return { level: "CRITICAL", color: "#f87171", bg: "rgba(248,113,113,0.1)"  };
  if (score > 0.4) return { level: "HIGH",     color: "#fb923c", bg: "rgba(251,146,60,0.1)"   };
  if (score > 0.2) return { level: "MEDIUM",   color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  };
  return               { level: "LOW",      color: "#4ade80", bg: "rgba(74,222,128,0.07)"  };
}

// Map Severity string → color
const SEVERITY_COLOR: Record<Severity, string> = {
  Low:      "#4ade80",
  Moderate: "#fbbf24",
  Elevated: "#fb923c",
  Critical: "#f87171",
};

function shortSrc(src: string) {
  return src.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\.(com|gov|org|net|edu)$/, "");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spark({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 72, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.min((score / 0.6) * 100, 100)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color, fontWeight: 500, minWidth: 42, letterSpacing: "0.02em" }}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon }: { label: string; value: string | number; sub: string; accent: string; icon: string }) {
  return (
    <div style={{ position: "relative", background: "linear-gradient(140deg,rgba(255,255,255,0.045) 0%,rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 22px 18px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: `linear-gradient(90deg,transparent,${accent}55,transparent)` }} />
      <div style={{ position: "absolute", top: -24, right: -24, width: 80, height: 80, borderRadius: "50%", background: accent, opacity: 0.08, filter: "blur(22px)" }} />
      <div style={{ fontSize: 18, marginBottom: 10, opacity: 0.45 }}>{icon}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 700, color: accent, lineHeight: 1, marginBottom: 6, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>{sub}</div>
    </div>
  );
}

// ─── Intelligence Briefing Panel (expanded view) ─────────────────────────────

function BriefingPanel({ art, dom }: { art: Article; dom: ReturnType<typeof getDomain> }) {
  const hasBriefing = !!(art.summary || art.why_it_matters || art.entities?.length || art.severity);
  if (!hasBriefing) return null;

  const sevColor = art.severity ? SEVERITY_COLOR[art.severity] : "rgba(255,255,255,0.3)";

  return (
    <div style={{
      margin: "0 20px 2px",
      padding: "18px 22px 20px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: "none",
      borderRadius: "0 0 9px 9px",
    }}>
      {/* Top row: severity badge + risk type */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {art.severity && (
          <span style={{
            fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.2em",
            padding: "4px 12px", borderRadius: 3, fontWeight: 600,
            background: `${sevColor}14`, border: `1px solid ${sevColor}30`, color: sevColor,
          }}>
            {art.severity.toUpperCase()} SEVERITY
          </span>
        )}
        {art.risk_type && (
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em" }}>
            {art.risk_type}
          </span>
        )}
        {art.url && (
          <a
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(212,168,71,0.55)", letterSpacing: "0.1em", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
          >
            READ SOURCE ↗
          </a>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: art.entities?.length ? "1fr 200px" : "1fr", gap: 20 }}>
        <div>
          {/* Executive summary */}
          {art.summary && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", marginBottom: 6 }}>
                EXECUTIVE SUMMARY
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.65)", fontWeight: 300 }}>
                {art.summary}
              </p>
            </div>
          )}

          {/* Why it matters */}
          {art.why_it_matters && (
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.22em", color: dom ? dom.color : "rgba(212,168,71,0.5)", marginBottom: 6, opacity: 0.8 }}>
                WHY IT MATTERS FOR KINAGE
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", fontStyle: "italic", fontWeight: 300, borderLeft: `2px solid ${dom?.color ?? "#d4a847"}30`, paddingLeft: 12 }}>
                {art.why_it_matters}
              </p>
            </div>
          )}
        </div>

        {/* Entities panel */}
        {art.entities && art.entities.length > 0 && (
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.22em", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
              KEY ENTITIES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {art.entities.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: dom?.color ?? "#d4a847", opacity: 0.6, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 300 }}>{e}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [articles, setArticles]         = useState<Article[]>([]);
  const [loading, setLoading]           = useState(true);
  const [levelFilter, setLevelFilter]   = useState<Level | "ALL">("ALL");
  const [domFilter, setDomFilter]       = useState<DomId | "ALL">("ALL");
  const [search, setSearch]             = useState("");
  const [dateStr, setDateStr]           = useState("");
  const [expanded, setExpanded]         = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }));
    fetch("/api/articles", { cache: "no-store" })
      .then(r => r.json())
      .then((d: Article[]) => {
        setArticles(d.filter(a => a.score > 0).sort((a, b) => b.score - a.score));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleExpand(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const domainCounts = DOMAINS.map(d => ({
    ...d, count: articles.filter(a => getDomain(a)?.id === d.id).length,
  })).filter(d => d.count > 0);

  const critCount   = articles.filter(a => getLevel(a.score).level === "CRITICAL").length;
  const highCount   = articles.filter(a => getLevel(a.score).level === "HIGH").length;
  const briefedCount = articles.filter(a => a.summary).length;
  const avgScore    = articles.length ? articles.reduce((s, a) => s + a.score, 0) / articles.length : 0;

  const visible = articles.filter(a => {
    if (levelFilter !== "ALL" && getLevel(a.score).level !== levelFilter) return false;
    if (domFilter   !== "ALL" && getDomain(a)?.id !== domFilter)           return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.source.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Styles ──────────────────────────────────────────────────────────────

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .nav-pill {
      font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em;
      text-decoration: none; padding: 7px 18px; border-radius: 5px;
      border: 1px solid transparent; transition: all 0.2s; color: rgba(255,255,255,0.32);
    }
    .nav-pill:hover { color: rgba(255,255,255,0.72); border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); }
    .nav-pill.cur   { color: #d4a847; border-color: rgba(212,168,71,0.35); background: rgba(212,168,71,0.07); }

    .gold-rule { height: 1px; background: linear-gradient(90deg,transparent,rgba(212,168,71,0.38) 30%,rgba(212,168,71,0.12) 70%,transparent); }

    .sidebar-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 10px;
      border-radius: 7px; cursor: pointer; transition: background 0.15s;
      border: 1px solid transparent; margin-bottom: 2px;
    }
    .sidebar-item:hover { background: rgba(255,255,255,0.03); }
    .sidebar-item.on    { background: rgba(255,255,255,0.045); border-color: rgba(255,255,255,0.08); }

    .search-box {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
      border-radius: 7px; padding: 9px 14px 9px 38px;
      color: rgba(255,255,255,0.82); font-family: 'DM Sans',sans-serif; font-size: 13px;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 300px;
    }
    .search-box::placeholder { color: rgba(255,255,255,0.18); }
    .search-box:focus { border-color: rgba(212,168,71,0.45); box-shadow: 0 0 0 3px rgba(212,168,71,0.07); }

    .signal-row {
      display: grid; grid-template-columns: 28px 20px 1fr 140px 130px 86px;
      gap: 14px; align-items: center; padding: 13px 20px;
      border-radius: 9px; border: 1px solid transparent;
      transition: background 0.18s, border-color 0.18s; cursor: pointer;
    }
    .signal-row:hover { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.07); }
    .signal-row.is-open { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); border-radius: 9px 9px 0 0; border-bottom: none; }

    .expand-btn {
      width: 18px; height: 18px; border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s; flex-shrink: 0;
      color: rgba(255,255,255,0.3); font-size: 9px;
    }
    .signal-row:hover .expand-btn { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); }
    .expand-btn.open { background: rgba(212,168,71,0.1); border-color: rgba(212,168,71,0.35); color: #d4a847; }

    .has-brief::after {
      content: '●';
      font-size: 5px;
      color: #d4a847;
      opacity: 0.8;
      margin-left: 6px;
      vertical-align: middle;
    }

    .level-badge {
      font-family: 'DM Mono',monospace; font-size: 8px; letter-spacing: 0.2em;
      padding: 4px 10px; border-radius: 3px; text-align: center; font-weight: 500;
    }
    .art-tag {
      font-family: 'DM Mono',monospace; font-size: 8px; letter-spacing: 0.1em;
      padding: 2px 7px; border-radius: 2px; display: inline-block;
    }
    .col-lbl {
      font-family: 'DM Mono',monospace; font-size: 8px; letter-spacing: 0.22em;
      color: rgba(255,255,255,0.18); text-transform: uppercase;
    }
    .pulse {
      width: 6px; height: 6px; border-radius: 50%;
      background: #4ade80; box-shadow: 0 0 5px #4ade80;
      animation: pls 2.4s ease-in-out infinite;
    }
    @keyframes pls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
    @keyframes rowIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
    .row-in { animation: rowIn 0.28s ease both; }
    @keyframes briefIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
    .brief-in { animation: briefIn 0.22s ease both; }

    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 2px; }
  `;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#07090f", minHeight: "100vh", color: "rgba(255,255,255,0.8)" }}>
      <style>{CSS}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,9,15,0.94)", backdropFilter: "blur(18px)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 40px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(140deg,#d4a847,#8a5c0a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(212,168,71,0.25)", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 12.5 L8 3.5 L13 12.5" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.2 9.2 L10.8 9.2"       stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>
                Kinage Intelligence
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(212,168,71,0.6)", letterSpacing: "0.22em", marginTop: 3 }}>
                ACTIVE LEARNING PLATFORM
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 4 }}>
            <a href="/dashboard" className="nav-pill cur">Signal Feed</a>
            <a href="/watchlist" className="nav-pill">Watchlist</a>
          </nav>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="pulse" />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>
              LIVE · {dateStr}
            </div>
          </div>
        </div>
        <div className="gold-rule" />
      </header>

      {/* ── PAGE BODY ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "38px 40px 80px" }}>

        {/* Page heading */}
        <div style={{ marginBottom: 34, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(212,168,71,0.5)", letterSpacing: "0.28em", marginBottom: 8 }}>
              EXECUTIVE BRIEFING · WEEKLY SIGNAL REPORT
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Market Signal Feed
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", marginTop: 7, fontWeight: 300 }}>
              Curated intelligence — aging, elder fraud, dementia, caregiver financial management
            </p>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.14)", letterSpacing: "0.1em", textAlign: "right", lineHeight: 2 }}>
            {articles.length} signals · {briefedCount} briefed<br />
            <span style={{ color: "rgba(255,255,255,0.08)" }}>Kinage-AL pipeline</span>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 42 }}>
          <StatCard label="Total Signals"  value={articles.length}    sub="ingested this cycle"           accent="#5b9cf6" icon="◎" />
          <StatCard label="Critical"       value={critCount}           sub="require immediate review"      accent="#f87171" icon="⚠" />
          <StatCard label="High Priority"  value={highCount}           sub="escalation recommended"        accent="#fb923c" icon="↑" />
          <StatCard label="Briefed"        value={briefedCount}        sub={`avg relevance ${avgScore.toFixed(3)}`} accent="#d4a847" icon="◈" />
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 32 }}>

          {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
          <aside>
            <div style={{ position: "sticky", top: 84 }}>

              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,255,255,0.16)", marginBottom: 12 }}>
                AL DOMAINS
              </div>
              <div className={`sidebar-item${domFilter === "ALL" ? " on" : ""}`} onClick={() => setDomFilter("ALL")}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: domFilter === "ALL" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.36)" }}>All domains</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{articles.length}</div>
              </div>

              {domainCounts.map(d => (
                <div key={d.id} className={`sidebar-item${domFilter === d.id ? " on" : ""}`} onClick={() => setDomFilter(domFilter === d.id ? "ALL" : d.id)}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: d.color, flexShrink: 0, opacity: domFilter === d.id ? 1 : 0.4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: d.color, letterSpacing: "0.16em", opacity: 0.75 }}>DOMAIN {d.id}</div>
                    <div style={{ fontSize: 11, color: domFilter === d.id ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.38)", marginTop: 1 }}>{d.label}</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: d.color, opacity: 0.65 }}>{d.count}</div>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "18px 0" }} />

              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,255,255,0.16)", marginBottom: 12 }}>
                PRIORITY LEVEL
              </div>
              {(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const).map(lvl => {
                const meta = lvl === "ALL" ? null : getLevel(lvl === "CRITICAL" ? 0.7 : lvl === "HIGH" ? 0.5 : lvl === "MEDIUM" ? 0.3 : 0.1);
                const cnt  = lvl === "ALL" ? articles.length : articles.filter(a => getLevel(a.score).level === lvl).length;
                return (
                  <div key={lvl} className={`sidebar-item${levelFilter === lvl ? " on" : ""}`} onClick={() => setLevelFilter(lvl)}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: meta?.color ?? "rgba(255,255,255,0.25)", flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: levelFilter === lvl ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.33)" }}>
                      {lvl === "ALL" ? "All levels" : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{cnt}</div>
                  </div>
                );
              })}

              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "18px 0" }} />

              {/* Legend */}
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,255,255,0.16)", marginBottom: 10 }}>
                LEGEND
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 8, color: "#d4a847" }}>●</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>= intelligence briefing</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1.6, fontStyle: "italic" }}>
                Click any row to expand executive summary
              </div>
            </div>
          </aside>

          {/* ── SIGNAL TABLE ─────────────────────────────────────────────── */}
          <div>

            {/* Search + count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ position: "relative" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.22)", pointerEvents: "none" }}>
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M9.5 9.5 L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <input ref={inputRef} className="search-box" placeholder="Search signals..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>
                {visible.length} of {articles.length} signals
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 20px 1fr 140px 130px 86px", gap: 14, padding: "0 20px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 }}>
              <span className="col-lbl">#</span>
              <span className="col-lbl"></span>
              <span className="col-lbl">Signal</span>
              <span className="col-lbl">Source</span>
              <span className="col-lbl">Relevance</span>
              <span className="col-lbl" style={{ textAlign: "right" }}>Priority</span>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.12)", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.2em" }}>
                LOADING CORPUS...
              </div>
            )}

            {/* Rows */}
            {!loading && (
              <div>
                {visible.map((art, i) => {
                  const { level, color, bg } = getLevel(art.score);
                  const dom        = getDomain(art);
                  const isOpen     = expanded.has(i);
                  const hasBriefing = !!(art.summary || art.why_it_matters);
                  const prev       = i > 0 ? getLevel(visible[i - 1].score).level : null;
                  const showDiv    = prev !== null && prev !== level;

                  return (
                    <div key={i} className="row-in" style={{ animationDelay: `${Math.min(i * 0.015, 0.35)}s` }}>
                      {showDiv && (
                        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06) 30%,rgba(255,255,255,0.06) 70%,transparent)", margin: "6px 0" }} />
                      )}

                      {/* Main row */}
                      <div
                        className={`signal-row${isOpen ? " is-open" : ""}`}
                        onClick={() => hasBriefing && toggleExpand(i)}
                        style={{ cursor: hasBriefing ? "pointer" : "default" }}
                      >
                        {/* Rank */}
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.13)", textAlign: "right" }}>
                          {String(i + 1).padStart(2, "0")}
                        </div>

                        {/* Expand toggle */}
                        <div>
                          {hasBriefing ? (
                            <div className={`expand-btn${isOpen ? " open" : ""}`}>
                              {isOpen ? "−" : "+"}
                            </div>
                          ) : (
                            <div style={{ width: 18 }} />
                          )}
                        </div>

                        {/* Title + tags */}
                        <div>
                          <div style={{ fontSize: 13, lineHeight: 1.46, marginBottom: 5, fontWeight: 400, color: "rgba(255,255,255,0.75)" }}
                            className={hasBriefing ? "has-brief" : ""}>
                            {art.title}
                          </div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {dom && (
                              <span className="art-tag" style={{ background: `${dom.color}12`, border: `1px solid ${dom.color}28`, color: dom.color }}>
                                {dom.id} · {dom.label}
                              </span>
                            )}
                            {art.severity && (
                              <span className="art-tag" style={{ background: `${SEVERITY_COLOR[art.severity]}10`, border: `1px solid ${SEVERITY_COLOR[art.severity]}25`, color: SEVERITY_COLOR[art.severity] }}>
                                {art.severity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Source */}
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>
                          {shortSrc(art.rss_source ?? art.source)}
                        </div>

                        {/* Score */}
                        <Spark score={art.score} color={color} />

                        {/* Badge */}
                        <div style={{ textAlign: "right" }}>
                          <span className="level-badge" style={{ background: bg, border: `1px solid ${color}28`, color }}>
                            {level}
                          </span>
                        </div>
                      </div>

                      {/* Briefing panel — only renders when expanded AND has intelligence data */}
                      {isOpen && hasBriefing && (
                        <div className="brief-in">
                          <BriefingPanel art={art} dom={dom} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && visible.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.12)", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.2em" }}>
                NO SIGNALS MATCH CURRENT FILTERS
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 12, color: "rgba(255,255,255,0.13)", fontStyle: "italic" }}>
            Kinage Intelligence Platform
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(255,255,255,0.1)", letterSpacing: "0.18em" }}>
            {articles.length} SIGNALS · {briefedCount} BRIEFED · KINAGE-AL PIPELINE
          </div>
        </div>
      </div>
    </div>
  );
}
