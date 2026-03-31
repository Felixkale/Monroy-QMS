// src/app/clients/page.jsx
"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { getClients, getClientStats } from "@/services/clients";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [stats,   setStats]   = useState({ total:0, active:0, suspended:0 });
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("All");
  const [view,    setView]    = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const [clientsRes, statsRes] = await Promise.all([getClients(), getClientStats()]);
      if (clientsRes.error) setError("Failed to load clients.");
      setClients(clientsRes.data || []);
      setStats(statsRes);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter(c => {
    const matchFilter =
      filter === "All" ||
      (filter === "Active"    && c.status === "active") ||
      (filter === "Suspended" && c.status === "suspended");
    const q = search.toLowerCase();
    return matchFilter && (
      (c.company_name || "").toLowerCase().includes(q) ||
      (c.company_code || "").toLowerCase().includes(q) ||
      (c.city         || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout title="Clients">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        .cl-card{transition:transform .18s,border-color .18s,background .18s;cursor:pointer;display:block;text-decoration:none}
        .cl-card:hover .cl-inner{transform:translateY(-2px);border-color:rgba(34,211,238,0.4)!important;background:rgba(34,211,238,0.05)!important}
        .cl-tr:hover{background:rgba(34,211,238,0.04)!important}
        @media(max-width:640px){.cl-stats{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <p style={{ color:T.textDim, fontSize:13, margin:0 }}>Manage registered client organisations</p>
        <a href="/clients/register" style={{ padding:"10px 20px", borderRadius:11, textDecoration:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 }}>
          + Register Client
        </a>
      </div>

      {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, marginBottom:16 }}>⚠ {error}</div>}

      {/* Stats */}
      <div className="cl-stats" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Clients", value:stats.total,     color:T.accent, bg:T.accentDim, brd:T.accentBrd },
          { label:"Active",        value:stats.active,    color:T.green,  bg:T.greenDim,  brd:T.greenBrd  },
          { label:"Suspended",     value:stats.suspended, color:T.red,    bg:T.redDim,    brd:T.redBrd    },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.brd}`, borderRadius:14, padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, fontFamily:"'IBM Plex Mono',monospace" }}>{loading?"…":s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, code or city…"
          style={{ flex:"1 1 220px", padding:"10px 14px", background:"rgba(18,30,50,0.70)", border:`1px solid ${T.border}`, borderRadius:9, color:T.text, fontSize:13, fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ display:"flex", gap:6 }}>
          {["All","Active","Suspended"].map(s => (
            <button key={s} type="button" onClick={() => setFilter(s)} style={{
              padding:"8px 14px", borderRadius:99, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background: filter===s ? T.accentDim : T.card,
              border: `1px solid ${filter===s ? T.accentBrd : T.border}`,
              color: filter===s ? T.accent : T.textDim,
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
          {[["grid","▦"],["table","☰"]].map(([v,icon]) => (
            <button key={v} type="button" onClick={() => setView(v)} style={{
              width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:14,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: view===v ? T.accentDim : T.card,
              border: `1px solid ${view===v ? T.accentBrd : T.border}`,
              color: view===v ? T.accent : T.textDim,
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"20px", height:140 }}/>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", background:T.card, border:`1px solid ${T.border}`, borderRadius:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>
            {search || filter !== "All" ? "No clients match your search" : "No clients registered yet"}
          </div>
          <div style={{ fontSize:13, color:T.textDim, marginBottom:20 }}>
            {search || filter !== "All" ? "Try a different search or filter" : "Get started by registering your first client"}
          </div>
          {!search && filter === "All" && (
            <a href="/clients/register" style={{ padding:"10px 24px", borderRadius:10, textDecoration:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13 }}>
              + Register First Client
            </a>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && view === "grid" && filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {filtered.map(c => (
            <a key={c.id} className="cl-card" href={`/clients/${c.id}`}>
              <div className="cl-inner" style={{
                background:T.panel, border:`1px solid ${T.border}`,
                borderRadius:14, padding:"18px 20px",
                position:"relative", overflow:"hidden", transition:"all .18s",
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${c.status==="active"?T.accent:T.red},transparent)` }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:T.text, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company_name}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>{c.company_code || "—"}{c.city ? ` · ${c.city}` : ""}</div>
                  </div>
                  <span style={{
                    padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:800, flexShrink:0, marginLeft:8,
                    background: c.status==="active" ? T.greenDim : T.redDim,
                    color: c.status==="active" ? T.green : T.red,
                    border:`1px solid ${c.status==="active" ? T.greenBrd : T.redBrd}`,
                    textTransform:"capitalize",
                  }}>{c.status||"active"}</span>
                </div>
                {c.contact_person && (
                  <div style={{ fontSize:12, color:T.textDim, marginBottom:6 }}>
                    👤 {c.contact_person}{c.contact_email ? ` · ${c.contact_email}` : ""}
                  </div>
                )}
                <div style={{ fontSize:11, color:T.textDim }}>
                  Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—"}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && view === "table" && filtered.length > 0 && (
        <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
            <thead>
              <tr>
                {["Company","Code","Contact","City","Status",""].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:`1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c,i) => (
                <tr key={c.id} className="cl-tr" style={{ borderBottom: i < filtered.length-1 ? `1px solid ${T.border}` : "none" }}>
                  <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:T.text }}>{c.company_name}</td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:T.textDim, fontFamily:"'IBM Plex Mono',monospace" }}>{c.company_code||"—"}</td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:T.textDim }}>{c.contact_person||"—"}</td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:T.textDim }}>{c.city||"—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:800,
                      background:c.status==="active"?T.greenDim:T.redDim,
                      color:c.status==="active"?T.green:T.red,
                      border:`1px solid ${c.status==="active"?T.greenBrd:T.redBrd}`,
                      textTransform:"capitalize" }}>{c.status||"active"}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <a href={`/clients/${c.id}`} style={{ padding:"5px 12px", borderRadius:7, fontSize:11, background:T.accentDim, border:`1px solid ${T.accentBrd}`, color:T.accent, textDecoration:"none", fontWeight:700 }}>View →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
