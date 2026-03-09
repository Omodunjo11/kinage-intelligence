"use client";

import { useState } from "react";
import {
  THOUGHT_LEADERS,
  TIER_LABELS,
  STATUS_META,
  type ThoughtLeader,
  type OutreachStatus,
  type Tier,
} from "@/lib/thoughtLeaders";

const TIER_ACCENT: Record<Tier, string> = {
  1: "#ff8c00",
  2: "#4a90d9",
  3: "#4caf8a",
};

const PRIORITY_ORDER = { immediate: 0, soon: 1, monitor: 2 };

export default function WatchlistPage() {
  const [activeTier, setActiveTier] = useState<Tier | "ALL">("ALL");
  const [activeStatus, setActiveStatus] = useState<OutreachStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OutreachStatus>>({});

  const getStatus = (ldr: ThoughtLeader): OutreachStatus =>
    statusOverrides[ldr.id] ?? ldr.outreachStatus;

  const visible = THOUGHT_LEADERS.filter((ldr) => {
    if (activeTier !== "ALL" && ldr.tier !== activeTier) return false;
    if (activeStatus !== "ALL" && getStatus(ldr) !== activeStatus) return false;
    if (
      search &&
      !ldr.name.toLowerCase().includes(search.toLowerCase()) &&
      !ldr.domains.join(" ").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  }).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const immediateCount = THOUGHT_LEADERS.filter((l) => l.priority === "immediate").length;
  const engagedCount =
    Object.values(statusOverrides).filter((s) => s === "Engaged").length +
    THOUGHT_LEADERS.filter(
      (l) => !statusOverrides[l.id] && l.outreachStatus === "Engaged"
    ).length;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .grid-bg {
      background-image:
        linear-gradient(rgba(20,60,100,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20,60,100,0.07) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .stat-card {
      border: 1px solid rgba(100,160,220,0.12);
      background: rgba(255,255,255,0.02);
      border-radius: 6px;
      padding: 18px 22px;
      transition: border-color 0.2s;
    }
    .stat-card:hover { border-color: rgba(100,160,220,0.28); }
    .card {
      border: 1px solid rgba(100,160,220,0.1);
      background: rgba(255,255,255,0.02);
      border-radius: 6px;
      transition: all 0.18s ease;
      overflow: hidden;
    }
    .card:hover { border-color: rgba(100,160,220,0.25); background: rgba(100,160,220,0.04); }
    .card.expanded { border-color: rgba(100,160,220,0.3); background: rgba(100,160,220,0.05); }
    .pill-btn {
      border-radius: 4px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid rgba(100,160,220,0.18);
      background: transparent;
      color: #4a6a80;
      padding: 6px 14px;
    }
    .pill-btn:hover { border-color: rgba(100,160,220,0.4); color: #c8d8e8; }
    .pill-btn.active { background: rgba(100,160,220,0.1); color: #c8d8e8; border-color: rgba(100,160,220,0.4); }
    .search-input {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(100,160,220,0.18);
      color: #c8d8e8;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      outline: none;
      transition: border-color 0.2s;
      padding: 8px 14px;
      border-radius: 4px;
      min-width: 260px;
    }
    .search-input::placeholder { color: #2a4a60; }
    .search-input:focus { border-color: rgba(100,160,220,0.45); }
    .status-select {
      background: rgba(10,16,28,0.95);
      border: 1px solid rgba(100,160,220,0.18);
      color: #c8d8e8;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      outline: none;
      cursor: pointer;
      padding: 5px 8px;
      border-radius: 3px;
      width: 100%;
    }
    .domain-tag {
      font-size: 9px;
      padding: 2px 8px;
      border-radius: 2px;
      letter-spacing: 0.1em;
      border: 1px solid rgba(100,160,220,0.12);
      background: rgba(100,160,220,0.06);
      color: #4a7a9a;
    }
    .platform-badge {
      font-size: 9px;
      padding: 2px 7px;
      border-radius: 2px;
      letter-spacing: 0.08em;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.04);
      color: #5a8aaa;
    }
    .expand-btn {
      background: transparent;
      border: none;
      color: #3a6080;
      cursor: pointer;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      transition: color 0.15s;
      padding: 0;
    }
    .expand-btn:hover { color: #7aaac8; }
    .angle-box {
      background: rgba(255,140,0,0.04);
      border: 1px solid rgba(255,140,0,0.15);
      border-radius: 4px;
      padding: 12px 14px;
      font-size: 11px;
      color: #c8a060;
      line-height: 1.65;
    }
    .tier-stripe { width: 3px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 36px; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.2s ease forwards; }
    .nav-link {
      font-size: 10px;
      letter-spacing: 0.15em;
      color: #3a6080;
      text-decoration: none;
      border-bottom: 1px solid rgba(100,160,220,0.15);
      padding-bottom: 2px;
      transition: color 0.15s, border-color 0.15s;
    }
    .nav-link:hover { color: #7aaac8; border-color: rgba(100,160,220,0.4); }
    .nav-link.active-link { color: #c8d8e8; border-color: rgba(100,160,220,0.5); }
  `;

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#080c14", minHeight: "100vh", color: "#c8d8e8" }}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(100,160,220,0.1)", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 3, height: 36, background: "linear-gradient(180deg, #ff8c00, #4a90d9)", borderRadius: 2 }} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: "0.1em", color: "#e0eefa" }}>
              KINAGE INTELLIGENCE
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#3a6080", marginTop: -2 }}>
              THOUGHT LEADER WATCHLIST · OUTREACH TRACKER
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="/dashboard" className="nav-link">SIGNAL FEED</a>
          <a href="/watchlist" className="nav-link active-link">WATCHLIST</a>
        </nav>
      </header>

      <main className="grid-bg" style={{ padding: "32px 40px", maxWidth: 1380, margin: "0 auto" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
          {[
            { label: "TOTAL LEADERS",  value: THOUGHT_LEADERS.length,                              accent: "#4a90d9", sub: "across all tiers"    },
            { label: "TIER 1 ALIGNED", value: THOUGHT_LEADERS.filter(l => l.tier === 1).length,   accent: "#ff8c00", sub: "highest alignment"    },
            { label: "ACT NOW",        value: immediateCount,                                       accent: "#ff4444", sub: "immediate outreach"   },
            { label: "ENGAGED",        value: engagedCount,                                         accent: "#4caf8a", sub: "active relationships" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#3a6080", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: s.accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#3a5570", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="search-input"
            placeholder="SEARCH BY NAME OR DOMAIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div style={{ display: "flex", gap: 5 }}>
            {(["ALL", 1, 2, 3] as const).map((t) => (
              <button
                key={String(t)}
                className={`pill-btn${activeTier === t ? " active" : ""}`}
                onClick={() => setActiveTier(t)}
                style={
                  activeTier === t && t !== "ALL"
                    ? { borderColor: TIER_ACCENT[t as Tier], color: TIER_ACCENT[t as Tier], background: `${TIER_ACCENT[t as Tier]}18` }
                    : {}
                }
              >
                {t === "ALL" ? "ALL TIERS" : `TIER ${t}`}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 5 }}>
            {(["ALL", "Not Started", "Monitoring", "Contacted", "Engaged"] as const).map((s) => (
              <button
                key={s}
                className={`pill-btn${activeStatus === s ? " active" : ""}`}
                onClick={() => setActiveStatus(s)}
                style={
                  activeStatus === s && s !== "ALL" && STATUS_META[s as OutreachStatus]
                    ? {
                        borderColor: STATUS_META[s as OutreachStatus].color,
                        color: STATUS_META[s as OutreachStatus].color,
                        background: STATUS_META[s as OutreachStatus].bg,
                      }
                    : {}
                }
              >
                {s === "ALL" ? "ALL STATUS" : s.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#2a4a60", marginLeft: "auto", letterSpacing: "0.1em" }}>
            {visible.length} / {THOUGHT_LEADERS.length} LEADERS
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 200px 150px 140px 80px", gap: 14, padding: "8px 18px", marginBottom: 6, fontSize: 9, letterSpacing: "0.2em", color: "#2a4a60", borderBottom: "1px solid rgba(100,160,220,0.07)" }}>
          <span />
          <span>NAME + DOMAINS</span>
          <span>PLATFORMS</span>
          <span>TIER</span>
          <span>STATUS</span>
          <span style={{ textAlign: "right" }}>PRIORITY</span>
        </div>

        {/* Leader rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {visible.map((ldr) => {
            const status  = getStatus(ldr);
            const sm      = STATUS_META[status];
            const isExp   = expandedId === ldr.id;

            return (
              <div key={ldr.id} className={`card${isExp ? " expanded" : ""}`}>

                {/* Main row */}
                <div
                  style={{ display: "grid", gridTemplateColumns: "4px 1fr 200px 150px 140px 80px", gap: 14, padding: "13px 18px", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExp ? null : ldr.id)}
                >
                  <div className="tier-stripe" style={{ background: TIER_ACCENT[ldr.tier], opacity: 0.75 }} />

                  {/* Name */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "#d8eaf8", fontWeight: 600 }}>{ldr.name}</span>
                      {ldr.priority === "immediate" && (
                        <span style={{ fontSize: 8, padding: "2px 7px", background: "rgba(255,45,45,0.12)", border: "1px solid rgba(255,45,45,0.3)", borderRadius: 2, color: "#ff6060", letterSpacing: "0.15em" }}>
                          ACT NOW
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ldr.domains.slice(0, 3).map((d) => <span key={d} className="domain-tag">{d}</span>)}
                    </div>
                  </div>

                  {/* Platforms */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {ldr.platforms.map((p) => <span key={p} className="platform-badge">{p}</span>)}
                  </div>

                  {/* Tier */}
                  <div>
                    <div style={{ fontSize: 11, color: TIER_ACCENT[ldr.tier], fontWeight: 600, marginBottom: 2 }}>TIER {ldr.tier}</div>
                    <div style={{ fontSize: 9, color: "#3a6080", letterSpacing: "0.05em" }}>{TIER_LABELS[ldr.tier]}</div>
                  </div>

                  {/* Status select */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      className="status-select"
                      value={status}
                      onChange={(e) => setStatusOverrides((prev) => ({ ...prev, [ldr.id]: e.target.value as OutreachStatus }))}
                      style={{ color: sm.color, borderColor: `${sm.color}50` }}
                    >
                      {(["Not Started", "Monitoring", "Contacted", "Engaged"] as OutreachStatus[]).map((opt) => (
                        <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority + expand */}
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{
                      fontSize: 9, padding: "3px 8px", borderRadius: 2, letterSpacing: "0.12em",
                      background: ldr.priority === "immediate" ? "rgba(255,45,45,0.1)" : ldr.priority === "soon" ? "rgba(245,197,24,0.1)" : "rgba(74,106,128,0.1)",
                      border: `1px solid ${ldr.priority === "immediate" ? "rgba(255,45,45,0.3)" : ldr.priority === "soon" ? "rgba(245,197,24,0.3)" : "rgba(74,106,128,0.2)"}`,
                      color: ldr.priority === "immediate" ? "#ff6060" : ldr.priority === "soon" ? "#f5c518" : "#4a6a80",
                    }}>
                      {ldr.priority.toUpperCase()}
                    </span>
                    <button className="expand-btn">{isExp ? "▲ HIDE" : "▼ DETAILS"}</button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExp && (
                  <div className="fade-in" style={{ padding: "16px 18px 18px 36px", borderTop: "1px solid rgba(100,160,220,0.08)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#3a6080", marginBottom: 8 }}>WHY ALIGNED</div>
                      <div style={{ fontSize: 12, color: "#8aaac0", lineHeight: 1.65 }}>{ldr.whyAligned}</div>
                      {ldr.platformHandles && (
                        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(ldr.platformHandles).map(([plat, handle]) => (
                            <span key={plat} className="platform-badge" style={{ color: "#4a90d9" }}>{plat}: {handle}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#3a6080", marginBottom: 8 }}>SUGGESTED OUTREACH ANGLE</div>
                      <div className="angle-box">{ldr.suggestedAngle}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#2a4a60", fontSize: 11, letterSpacing: "0.2em" }}>
            NO LEADERS MATCH CURRENT FILTERS
          </div>
        )}

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(100,160,220,0.07)", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1e3a50", letterSpacing: "0.15em" }}>
          <span>KINAGE INTELLIGENCE PLATFORM · THOUGHT LEADER LAYER</span>
          <span>{THOUGHT_LEADERS.length} LEADERS TRACKED · {visible.length} VISIBLE</span>
        </div>
      </main>
    </div>
  );
}

