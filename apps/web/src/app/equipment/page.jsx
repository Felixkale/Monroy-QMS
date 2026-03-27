// src/app/equipment/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { listEquipment } from "@/services/equipment";

/* ── Tokens ── */
const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder{color:rgba(240,246,255,0.28)} select option{background:#0a1420;color:#f0f6ff}
  .eq-card{transition:transform .2s,border-color .2s}.eq-card:hover{transform:translateY(-2px);border-color:rgba(148,163,184,0.22)!important}
  .eq-row:hover td{background:rgba(34,211,238,0.03)!important}
  .eq-act-btn{transition:filter .15s,transform .15s}.eq-act-btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
  .filter-btn{transition:all .15s}

  .eq-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
  .eq-filter-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .eq-tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .eq-tbl{width:100%;border-collapse:collapse;min-width:860px}
  .eq-mob-cards{display:none}

  @media(max-width:1024px){.eq-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:768px){
    .eq-page-pad{padding:12px!important}
    .eq-hdr{flex-direction:column!important;gap:12px!important;align-items:flex-start!important}
    .eq-hdr-btns{width:100%}.eq-hdr-btns button{width:100%}
    .eq-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .eq-filter-row{gap:6px}
    .eq-tbl-wrap{display:none!important}.eq-mob-cards{display:grid;gap:10px;padding:14px}
    .eq-grid{grid-template-columns:1fr}
  }
  @media(max-width:480px){
    .eq-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
    .filter-btn{font-size:11px!important;padding:7px 10px!important}
  }
`;

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function statusCfg(s) {
  if (s === "expired")  return { label:"Expired",       color:T.red,    bg:T.redDim,    brd:T.redBrd    };
  if (s === "expiring") return { label:"Expiring Soon", color:T.amber,  bg:T.amberDim,  brd:T.amberBrd  };
  return                       { label:"Active",        color:T.green,  bg:T.greenDim,  brd:T.greenBrd  };
}

function Badge({ status }) {
  const c = statusCfg(status);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:99, background:c.bg, color:c.color, border:`1px solid ${c.brd}`, fontSize:10, fontWeight:800, whiteSpace:"nowrap" }}>
      {c.label}
    </span>
  );
}

export default function EquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [viewMode,  setViewMode]  = useState("grid");

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      const { data, error: e } = await listEquipment();
      if (e) { setEquipment([]); setError(e.message || "Failed to load equipment."); }
      else    { setEquipment(Array.isArray(data) ? data : []); }
      setLoading(false);
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const r = equipment;
    return {
      all:      r.length,
      active:   r.filter(i => (i.license_status || "valid") === "valid").length,
      expiring: r.filter(i => i.license_status === "expiring").length,
      expired:  r.filter(i => i.license_status === "expired").length,
    };
  }, [equipment]);

  const filtered = useMemo(() => {
    let rows = [...equipment];
    if (filter === "active")   rows = rows.filter(i => (i.license_status || "valid") === "valid");
    if (filter === "expiring") rows = rows.filter(i => i.license_status === "expiring");
    if (filter === "expired")  rows = rows.filter(i => i.license_status === "expired");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(i =>
        [i.asset_tag, i.asset_name, i.asset_type, i.equipment_type, i.serial_number,
         i.manufacturer, i.model, i.location, i.department,
         i.clients?.company_name, i.clients?.company_code]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [equipment, filter, search]);

  const FILTERS = [
    { key:"all",      label:`All`,            count:counts.all,      activeColor:"linear-gradient(135deg,#22d3ee,#60a5fa)", activeTxt:"#001018" },
    { key:"active",   label:`Active`,         count:counts.active,   activeColor:"linear-gradient(135deg,#34d399,#22d3ee)", activeTxt:"#001018" },
    { key:"expiring", label:`Expiring Soon`,  count:counts.expiring, activeColor:"linear-gradient(135deg,#fbbf24,#f97316)", activeTxt:"#1a0800" },
    { key:"expired",  label:`Expired`,        count:counts.expired,  activeColor:"linear-gradient(135deg,#f87171,#ef4444)", activeTxt:"#fff"    },
  ];

  return (
    <AppLayout title="Equipment">
      <style>{CSS}</style>
      <div className="eq-page-pad" style={{ minHeight:"100vh", background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`, color:T.text, fontFamily:"'IBM Plex Sans',sans-serif", padding:24 }}>
        <div style={{ maxWidth:1500, margin:"0 auto", display:"grid", gap:18 }}>

          {/* HEADER */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"20px 24px", backdropFilter:"blur(20px)" }}>
            <div className="eq-hdr" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:18 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:5, height:22, borderRadius:3, background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`, flexShrink:0 }} />
                  <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent }}>Equipment Register</span>
                </div>
                <h1 style={{ margin:0, fontSize:"clamp(20px,3vw,28px)", fontWeight:900, letterSpacing:"-0.02em" }}>Equipment Register</h1>
                <p style={{ margin:"6px 0 0", color:T.textDim, fontSize:13 }}>All registered assets across all clients</p>
              </div>
              <div className="eq-hdr-btns" style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button type="button" onClick={() => router.push("/equipment/register")} style={{ padding:"10px 18px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${T.accent},#60a5fa)`, color:"#001018", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  + Register Equipment
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="eq-stats">
              {[
                { label:"Total",        value:counts.all,      color:T.accent,  glow:"rgba(34,211,238,0.15)"  },
                { label:"Active",       value:counts.active,   color:T.green,   glow:"rgba(52,211,153,0.15)"  },
                { label:"Expiring",     value:counts.expiring, color:T.amber,   glow:"rgba(251,191,36,0.15)"  },
                { label:"Expired",      value:counts.expired,  color:T.red,     glow:"rgba(248,113,113,0.15)" },
              ].map(({ label, value, color, glow }) => (
                <div key={label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px 16px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", inset:0, background:`radial-gradient(circle at top right,${glow},transparent 70%)`, pointerEvents:"none" }} />
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:T.textDim, marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{loading ? "…" : value}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ padding:"12px 16px", borderRadius:12, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:600 }}>⚠ {error}</div>}

          {/* FILTER / TOOLBAR */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:16, backdropFilter:"blur(20px)", display:"grid", gap:12 }}>
            <div className="eq-filter-row">
              <div style={{ position:"relative", flex:"1 1 260px", minWidth:200 }}>
                <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.textDim, fontSize:14, pointerEvents:"none" }}>⌕</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tag, name, serial, client…"
                  style={{ width:"100%", padding:"10px 12px 10px 30px", borderRadius:10, border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.03)", color:T.text, fontSize:13, outline:"none", fontFamily:"'IBM Plex Sans',sans-serif" }}
                />
              </div>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  className="filter-btn"
                  onClick={() => setFilter(f.key)}
                  style={{ padding:"9px 14px", borderRadius:9, border:"none", cursor:"pointer", fontWeight:800, fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif", background: filter===f.key ? f.activeColor : T.card, color: filter===f.key ? f.activeTxt : T.textDim, boxShadow: filter===f.key ? "0 4px 12px rgba(0,0,0,0.25)" : "none" }}
                >
                  {f.label} ({loading ? "…" : f.count})
                </button>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <span style={{ fontSize:12, color:T.textDim }}><span style={{ color:T.text, fontWeight:700 }}>{filtered.length}</span> item{filtered.length===1?"":"s"}</span>
              <div style={{ display:"flex", background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                {[{ v:"grid", l:"⊞ Grid" }, { v:"list", l:"☰ List" }].map(o => (
                  <button key={o.v} type="button" onClick={() => setViewMode(o.v)} style={{ border:"none", cursor:"pointer", padding:"7px 14px", fontSize:11, fontWeight:700, background:viewMode===o.v?T.accentDim:"transparent", color:viewMode===o.v?T.accent:T.textDim, transition:"all .15s", minWidth:64, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, padding:40, textAlign:"center", color:T.textDim }}>
              <div style={{ fontSize:24, opacity:.4, marginBottom:10 }}>⏳</div>
              <div style={{ fontSize:13, fontWeight:600 }}>Loading equipment…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, padding:40, textAlign:"center", color:T.textDim }}>
              <div style={{ fontSize:30, opacity:.3, marginBottom:10 }}>⚙️</div>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>No equipment found</div>
              <div style={{ fontSize:13 }}>Try adjusting your search or filter.</div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="eq-grid">
              {filtered.map(item => {
                const status = item.license_status || "valid";
                const sc = statusCfg(status);
                return (
                  <div key={item.id || item.asset_tag} className="eq-card" style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, padding:18, display:"grid", gap:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.asset_name || "Unnamed Equipment"}</div>
                        <div style={{ fontSize:11, color:T.textDim, marginTop:3, fontFamily:"'IBM Plex Mono',monospace" }}>{item.asset_tag || "No Tag"}</div>
                      </div>
                      <Badge status={status} />
                    </div>
                    <div style={{ display:"grid", gap:6 }}>
                      {[
                        { label:"Type",       value:item.asset_type || item.equipment_type },
                        { label:"Client",     value:item.clients?.company_name },
                        { label:"Serial",     value:item.serial_number },
                        { label:"Location",   value:item.location },
                        { label:"Inspected",  value:formatDate(item.effective_issue_date) },
                        { label:"Expires",    value:formatDate(item.effective_expiry_date) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:12 }}>
                          <span style={{ color:T.textDim, flexShrink:0 }}>{label}</span>
                          <span style={{ color:T.textMid, fontWeight:600, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingTop:4, borderTop:`1px solid ${T.border}` }}>
                      <button type="button" className="eq-act-btn" onClick={() => router.push(`/equipment/${item.asset_tag}`)} style={{ flex:1, padding:"9px 10px", borderRadius:9, border:"none", background:`linear-gradient(135deg,${T.accent},#60a5fa)`, color:"#001018", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                        View
                      </button>
                      <button type="button" className="eq-act-btn" onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)} style={{ flex:1, padding:"9px 10px", borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
              <div className="eq-tbl-wrap">
                <table className="eq-tbl" style={{ borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"rgba(255,255,255,0.02)" }}>
                      {["Tag","Asset Name","Type","Client","Location","Inspected","Expires","Status","Actions"].map(h => (
                        <td key={h} style={{ padding:"10px 14px", fontSize:10, color:T.textDim, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id||item.asset_tag} className="eq-row" style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:"11px 14px", fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:T.accent }}>{item.asset_tag||"—"}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, fontWeight:600, color:T.text }}>{item.asset_name||"Unnamed"}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:T.textMid }}>{item.asset_type||item.equipment_type||"—"}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:T.textMid }}>{item.clients?.company_name||"—"}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:T.textMid }}>{item.location||"—"}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:T.textMid }}>{formatDate(item.effective_issue_date)}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:T.textMid }}>{formatDate(item.effective_expiry_date)}</td>
                        <td style={{ padding:"11px 14px" }}><Badge status={item.license_status||"valid"}/></td>
                        <td style={{ padding:"11px 14px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button type="button" className="eq-act-btn" onClick={() => router.push(`/equipment/${item.asset_tag}`)} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${T.accent},#60a5fa)`, color:"#001018", fontWeight:800, fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>View</button>
                            <button type="button" className="eq-act-btn" onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards for list view */}
              <div className="eq-mob-cards">
                {filtered.map(item => (
                  <div key={item.id||item.asset_tag} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:14, display:"grid", gap:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:T.text }}>{item.asset_name||"Unnamed"}</div>
                        <div style={{ fontSize:11, color:T.textDim, fontFamily:"'IBM Plex Mono',monospace", marginTop:2 }}>{item.asset_tag||"—"}</div>
                      </div>
                      <Badge status={item.license_status||"valid"} />
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button type="button" onClick={() => router.push(`/equipment/${item.asset_tag}`)} style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:`linear-gradient(135deg,${T.accent},#60a5fa)`, color:"#001018", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>View</button>
                      <button type="button" onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)} style={{ flex:1, padding:"9px", borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
