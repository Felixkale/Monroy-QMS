// src/app/ncr/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

  .ncr-page{
    min-height:100vh;
    background:
      radial-gradient(ellipse 60% 40% at 0% 0%,rgba(34,211,238,0.07),transparent),
      radial-gradient(ellipse 50% 40% at 100% 100%,rgba(167,139,250,0.05),transparent),
      #070e18;
    color:#f0f6ff;
    font-family:'IBM Plex Sans',sans-serif;
    padding:20px;
    padding-bottom:60px;
  }
  .ncr-wrap{max-width:1000px;margin:0 auto;display:grid;gap:14px;animation:fadeUp .3s ease}

  /* ── Header card ── */
  .ncr-hero{
    background:rgba(13,22,38,0.85);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:20px;
    padding:22px 24px;
    backdrop-filter:blur(24px);
    position:relative;
    overflow:hidden;
  }
  .ncr-hero::before{
    content:'';
    position:absolute;inset:0;
    background:linear-gradient(135deg,rgba(34,211,238,0.04) 0%,transparent 60%);
    pointer-events:none;
  }
  .ncr-hero-inner{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;position:relative}
  .ncr-number{
    font-family:'IBM Plex Mono',monospace;
    font-size:clamp(18px,3vw,26px);
    font-weight:700;
    color:#22d3ee;
    letter-spacing:-0.01em;
    margin:0 0 10px;
    line-height:1;
  }
  .ncr-title-text{
    font-size:clamp(13px,2vw,15px);
    font-weight:600;
    color:rgba(240,246,255,0.65);
    margin:0 0 14px;
    line-height:1.4;
  }
  .ncr-badges{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ncr-btn-row{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;align-items:flex-start}

  /* ── Severity stripe ── */
  .ncr-stripe{
    height:3px;border-radius:0 0 20px 20px;
    margin:-1px -1px 0;
    position:absolute;bottom:0;left:0;right:0;
  }

  /* ── Stats row ── */
  .ncr-stats{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:10px;
  }
  .ncr-stat{
    background:rgba(13,22,38,0.70);
    border:1px solid rgba(148,163,184,0.10);
    border-radius:14px;
    padding:14px 16px;
    display:flex;flex-direction:column;gap:5px;
  }
  .ncr-stat-label{font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,246,255,0.35)}
  .ncr-stat-val{font-size:14px;font-weight:800;color:#f0f6ff}
  .ncr-stat-sub{font-size:10px;color:rgba(240,246,255,0.40)}

  /* ── Grid layout ── */
  .ncr-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .ncr-grid-full{display:grid;gap:14px}

  /* ── Section card ── */
  .ncr-sec{
    background:rgba(10,18,32,0.92);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:16px;
    padding:18px;
    backdrop-filter:blur(20px);
  }
  .ncr-sec-head{
    display:flex;align-items:center;gap:9px;
    margin-bottom:14px;padding-bottom:12px;
    border-bottom:1px solid rgba(148,163,184,0.10);
  }
  .ncr-sec-icon{
    width:28px;height:28px;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;flex-shrink:0;
  }
  .ncr-sec-title{font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:rgba(240,246,255,0.55)}

  /* ── Info rows ── */
  .ncr-row{
    display:flex;justify-content:space-between;align-items:flex-start;
    gap:12px;padding:9px 0;
    border-bottom:1px solid rgba(148,163,184,0.07);
    font-size:13px;
  }
  .ncr-row:last-child{border-bottom:none;padding-bottom:0}
  .ncr-row-label{color:rgba(240,246,255,0.38);font-size:11px;font-weight:600;flex-shrink:0;min-width:110px;padding-top:1px}
  .ncr-row-val{color:rgba(240,246,255,0.80);font-weight:600;text-align:right;word-break:break-word;flex:1}
  .ncr-row-mono{font-family:'IBM Plex Mono',monospace;color:#22d3ee;font-size:12px}

  /* ── Equipment card special ── */
  .ncr-equip-card{
    background:rgba(34,211,238,0.04);
    border:1px solid rgba(34,211,238,0.14);
    border-radius:12px;
    padding:14px;
    display:flex;flex-direction:column;gap:10px;
  }
  .ncr-equip-tag{
    font-family:'IBM Plex Mono',monospace;
    font-size:20px;font-weight:700;
    color:#22d3ee;letter-spacing:-0.01em;
  }
  .ncr-equip-name{font-size:14px;font-weight:800;color:#f0f6ff}
  .ncr-equip-meta{font-size:11px;color:rgba(240,246,255,0.45)}
  .ncr-equip-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
  .ncr-equip-chip{
    padding:3px 10px;border-radius:99px;
    font-size:10px;font-weight:700;
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(148,163,184,0.15);
    color:rgba(240,246,255,0.55);
  }
  .ncr-equip-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}

  /* ── CAPA banner ── */
  .ncr-capa-banner{
    background:rgba(167,139,250,0.06);
    border:1px solid rgba(167,139,250,0.20);
    border-radius:16px;
    padding:16px 18px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    flex-wrap:wrap;
  }
  .ncr-capa-no-banner{
    background:rgba(167,139,250,0.04);
    border:1px solid rgba(167,139,250,0.14);
    border-radius:16px;
    padding:16px 18px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    flex-wrap:wrap;
  }

  /* ── Details / findings text ── */
  .ncr-findings{
    font-family:'IBM Plex Mono',monospace;
    font-size:12px;line-height:1.8;
    color:rgba(240,246,255,0.65);
    white-space:pre-wrap;
    background:rgba(0,0,0,0.2);
    border-radius:10px;
    padding:14px;
    border:1px solid rgba(148,163,184,0.08);
    max-height:320px;
    overflow-y:auto;
  }
  .ncr-prose{
    font-size:13px;line-height:1.75;
    color:rgba(240,246,255,0.72);
    white-space:pre-wrap;margin:0;
  }

  /* ── Badge ── */
  .nd-badge{
    display:inline-flex;align-items:center;gap:5px;
    padding:5px 13px;border-radius:99px;
    font-size:11px;font-weight:800;white-space:nowrap;
  }

  /* ── Buttons ── */
  .nd-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:9px 16px;border-radius:11px;
    font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:800;
    cursor:pointer;border:none;white-space:nowrap;
    min-height:40px;
    -webkit-tap-highlight-color:transparent;
    transition:filter .15s,transform .12s;
    text-decoration:none;
  }
  .nd-btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px)}
  .nd-btn:active:not(:disabled){transform:scale(0.97)}
  .nd-btn:disabled{opacity:0.45;cursor:not-allowed;transform:none}
  .nd-btn-ghost{background:rgba(255,255,255,0.05);border:1px solid rgba(148,163,184,0.18)!important;color:#f0f6ff}
  .nd-btn-green{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}
  .nd-btn-amber{background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.30)!important;color:#fbbf24}
  .nd-btn-purple{background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.30)!important;color:#a78bfa}
  .nd-btn-accent{background:rgba(34,211,238,0.10);border:1px solid rgba(34,211,238,0.28)!important;color:#22d3ee}
  .nd-btn-red{background:rgba(248,113,113,0.10);border:1px solid rgba(248,113,113,0.28)!important;color:#f87171}

  @media(max-width:768px){
    .ncr-page{padding:10px;padding-bottom:60px}
    .ncr-hero{padding:16px}
    .ncr-stats{grid-template-columns:repeat(2,1fr)}
    .ncr-grid{grid-template-columns:1fr}
    .ncr-hero-inner{flex-direction:column;gap:14px}
    .ncr-btn-row{width:100%}
    .nd-btn{flex:1}
  }
  @media(max-width:480px){
    .ncr-stats{grid-template-columns:repeat(2,1fr)}
    .ncr-btn-row{flex-wrap:wrap}
  }
`;

const SEV = {
  critical:{ color:T.red,   bg:T.redDim,   brd:T.redBrd,   label:"Critical", dot:"🔴", stripe:"linear-gradient(90deg,#f87171,#ef4444)" },
  major:   { color:T.amber, bg:T.amberDim, brd:T.amberBrd, label:"Major",    dot:"🟡", stripe:"linear-gradient(90deg,#fbbf24,#f97316)" },
  minor:   { color:T.green, bg:T.greenDim, brd:T.greenBrd, label:"Minor",    dot:"🟢", stripe:"linear-gradient(90deg,#34d399,#14b8a6)" },
};
const ST = {
  open:       { color:T.red,   bg:T.redDim,   brd:T.redBrd,   label:"Open"        },
  closed:     { color:T.green, bg:T.greenDim, brd:T.greenBrd, label:"Closed"      },
  in_progress:{ color:T.amber, bg:T.amberDim, brd:T.amberBrd, label:"In Progress" },
};
const STAGE = {
  identification:{ label:"Identification", color:T.blue   },
  investigation: { label:"Investigation",  color:T.purple },
  root_cause:    { label:"Root Cause",     color:T.amber  },
  action_plan:   { label:"Action Plan",    color:T.accent },
  implementation:{ label:"Implementation", color:T.amber  },
  verification:  { label:"Verification",   color:T.purple },
  closed:        { label:"Closed",         color:T.green  },
};

const sv = s => SEV[s]  || { color:T.textDim, bg:T.card, brd:T.border, label:s||"—", dot:"⚪", stripe:"rgba(148,163,184,0.2)" };
const st = s => ST[s]   || { color:T.textDim, bg:T.card, brd:T.border, label:s||"Unknown" };
const sg = s => STAGE[s]|| { label:s||"Unknown", color:T.textDim };

function fd(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function nz(v, fb="—") {
  if (!v && v !== 0) return fb;
  const s = String(v).trim();
  return s || fb;
}

function Badge({ label, color, bg, brd, dot }) {
  return (
    <span className="nd-badge" style={{ background:bg, color, border:`1px solid ${brd}` }}>
      {dot && <span style={{ fontSize:9 }}>{dot}</span>}
      {label}
    </span>
  );
}

function Row({ label, value, mono=false }) {
  return (
    <div className="ncr-row">
      <span className="ncr-row-label">{label}</span>
      <span className={`ncr-row-val${mono ? " ncr-row-mono" : ""}`}>{nz(value)}</span>
    </div>
  );
}

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id;

  const [ncr,       setNcr]       = useState(null);
  const [linkedCapa,setLinkedCapa]= useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [closing,   setClosing]   = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setError("");
      const [ncrRes, capaRes] = await Promise.all([
        supabase.from("ncrs").select(`
          *,
          assets(id,asset_tag,asset_name,asset_type,location,serial_number,fleet_number,registration_number,clients(id,company_name))
        `).eq("id", id).maybeSingle(),
        supabase.from("capas").select("id,capa_number,stage,priority,status,title").eq("ncr_id", id).maybeSingle(),
      ]);
      if (ncrRes.error || !ncrRes.data) { setError(ncrRes.error?.message || "NCR not found."); setLoading(false); return; }
      setNcr(ncrRes.data);
      setLinkedCapa(capaRes.data || null);
      setLoading(false);
    })();
  }, [id]);

  async function handleClose() {
    if (!ncr) return;
    setClosing(true);
    const { error: e } = await supabase.from("ncrs")
      .update({ status:"closed", closed_date:new Date().toISOString().slice(0,10) })
      .eq("id", ncr.id);
    if (!e) setNcr(p => ({ ...p, status:"closed", closed_date:new Date().toISOString().slice(0,10) }));
    setClosing(false);
  }

  const sev    = ncr ? sv(ncr.severity) : null;
  const status = ncr ? st(ncr.status)   : null;
  const capaNewUrl = ncr ? `/capa/new?ncr_id=${id}&asset_id=${ncr.asset_id||""}` : "/capa/new";

  // Days until due
  const daysUntilDue = ncr?.due_date ? Math.ceil((new Date(ncr.due_date) - new Date()) / 86400000) : null;
  const dueColor = daysUntilDue === null ? T.textDim : daysUntilDue < 0 ? T.red : daysUntilDue <= 3 ? T.amber : T.green;

  return (
    <AppLayout title="NCR Detail">
      <style>{CSS}</style>
      <div className="ncr-page">
        <div className="ncr-wrap">

          {/* ── HERO HEADER ─────────────────────────────────────────────── */}
          <div className="ncr-hero">
            {/* Severity colour stripe at bottom */}
            {sev && <div className="ncr-stripe" style={{ background: sev.stripe }}/>}

            <div className="ncr-hero-inner">
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", color:T.accent, marginBottom:10 }}>
                  Non-Conformance Report
                </div>
                <div className="ncr-number">
                  {loading ? "Loading…" : nz(ncr?.ncr_number, "NCR Detail")}
                </div>
                {ncr?.title && (
                  <div className="ncr-title-text">{ncr.title}</div>
                )}
                <div className="ncr-badges">
                  {sev && <Badge label={sev.label} color={sev.color} bg={sev.bg} brd={sev.brd} dot={sev.dot}/>}
                  {status && <Badge label={status.label} color={status.color} bg={status.bg} brd={status.brd}/>}
                  {ncr?.due_date && (
                    <span className="nd-badge" style={{ background:"rgba(255,255,255,0.04)", border:`1px solid rgba(148,163,184,0.15)`, color:dueColor }}>
                      {daysUntilDue !== null && daysUntilDue < 0
                        ? `⚠ Overdue by ${Math.abs(daysUntilDue)}d`
                        : daysUntilDue === 0 ? "⚠ Due today"
                        : `Due ${fd(ncr.due_date)}`}
                    </span>
                  )}
                  {linkedCapa && (
                    <span className="nd-badge" style={{ background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, color:T.purple }}>
                      🔧 CAPA Linked
                    </span>
                  )}
                </div>
              </div>

              <div className="ncr-btn-row">
                <button type="button" className="nd-btn nd-btn-ghost" onClick={() => router.push("/ncr")}>← Back</button>
                {ncr && !linkedCapa && (
                  <Link href={capaNewUrl} className="nd-btn nd-btn-purple">🔧 Create CAPA</Link>
                )}
                {linkedCapa && (
                  <Link href={`/capa/${linkedCapa.id}`} className="nd-btn nd-btn-purple">🔧 View CAPA</Link>
                )}
                {ncr && ncr.status !== "closed" && (
                  <button type="button" className="nd-btn nd-btn-green" onClick={handleClose} disabled={closing}>
                    {closing ? "Closing…" : "✓ Close NCR"}
                  </button>
                )}
                {ncr && (
                  <Link href={`/ncr/${id}/edit`} className="nd-btn nd-btn-amber">✏ Edit</Link>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding:"11px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:600 }}>⚠ {error}</div>
          )}

          {loading ? (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, padding:48, textAlign:"center", color:T.textDim }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid rgba(34,211,238,0.2)`, borderTopColor:T.accent, animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
              <div style={{ fontSize:13, fontWeight:600 }}>Loading NCR…</div>
            </div>
          ) : ncr && (
            <>
              {/* ── STATS ROW ─────────────────────────────────────────── */}
              <div className="ncr-stats">
                <div className="ncr-stat">
                  <div className="ncr-stat-label">Severity</div>
                  <div className="ncr-stat-val" style={{ color:sev.color }}>{sev.label}</div>
                  <div className="ncr-stat-sub">Priority level</div>
                </div>
                <div className="ncr-stat">
                  <div className="ncr-stat-label">Status</div>
                  <div className="ncr-stat-val" style={{ color:status.color }}>{status.label}</div>
                  <div className="ncr-stat-sub">Current state</div>
                </div>
                <div className="ncr-stat">
                  <div className="ncr-stat-label">Due Date</div>
                  <div className="ncr-stat-val" style={{ color:dueColor, fontSize:13 }}>{fd(ncr.due_date)}</div>
                  <div className="ncr-stat-sub" style={{ color:dueColor }}>
                    {daysUntilDue !== null && (daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? "Today" : `${daysUntilDue}d remaining`)}
                  </div>
                </div>
                <div className="ncr-stat">
                  <div className="ncr-stat-label">CAPA</div>
                  <div className="ncr-stat-val" style={{ color:linkedCapa ? T.purple : T.textDim }}>
                    {linkedCapa ? linkedCapa.capa_number : "Not raised"}
                  </div>
                  <div className="ncr-stat-sub">{linkedCapa ? `Stage: ${sg(linkedCapa.stage).label}` : "No CAPA yet"}</div>
                </div>
              </div>

              {/* ── LINKED CAPA BANNER ────────────────────────────────── */}
              {linkedCapa && (
                <div className="ncr-capa-banner">
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🔧</div>
                    <div>
                      <div style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:T.purple, fontWeight:700, marginBottom:3 }}>{linkedCapa.capa_number}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{linkedCapa.title}</div>
                      <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
                        <span style={{ padding:"2px 9px", borderRadius:99, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, fontSize:10, fontWeight:700, color:sg(linkedCapa.stage).color }}>
                          {sg(linkedCapa.stage).label}
                        </span>
                        <span style={{ padding:"2px 9px", borderRadius:99, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, fontSize:10, fontWeight:700, color:T.textDim, textTransform:"capitalize" }}>
                          {linkedCapa.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/capa/${linkedCapa.id}`} className="nd-btn nd-btn-purple">Open CAPA →</Link>
                </div>
              )}

              {/* ── MAIN GRID ─────────────────────────────────────────── */}
              <div className="ncr-grid">

                {/* NCR Information */}
                <div className="ncr-sec">
                  <div className="ncr-sec-head">
                    <div className="ncr-sec-icon" style={{ background:"rgba(34,211,238,0.08)" }}>📋</div>
                    <span className="ncr-sec-title">NCR Information</span>
                  </div>
                  <Row label="NCR Number"  value={ncr.ncr_number}  mono />
                  <Row label="Severity"    value={sev.label} />
                  <Row label="Status"      value={status.label} />
                  <Row label="Due Date"    value={fd(ncr.due_date)} />
                  <Row label="Closed Date" value={fd(ncr.closed_date)} />
                  <Row label="Raised By"   value={ncr.raised_by} />
                  <Row label="Assigned To" value={ncr.assigned_to} />
                  <Row label="Created"     value={fd(ncr.created_at)} />
                </div>

                {/* Equipment */}
                <div className="ncr-sec">
                  <div className="ncr-sec-head">
                    <div className="ncr-sec-icon" style={{ background:"rgba(96,165,250,0.08)" }}>⚙️</div>
                    <span className="ncr-sec-title">Equipment</span>
                  </div>
                  {ncr.assets ? (
                    <>
                      <div className="ncr-equip-card">
                        <div>
                          <div className="ncr-equip-tag">{ncr.assets.asset_tag}</div>
                          <div className="ncr-equip-name">{ncr.assets.asset_name}</div>
                          <div className="ncr-equip-meta">{ncr.assets.clients?.company_name || "—"}</div>
                        </div>
                        <div className="ncr-equip-chips">
                          {ncr.assets.asset_type && <span className="ncr-equip-chip">{ncr.assets.asset_type}</span>}
                          {ncr.assets.serial_number && <span className="ncr-equip-chip">SN: {ncr.assets.serial_number}</span>}
                          {ncr.assets.fleet_number && <span className="ncr-equip-chip">Fleet: {ncr.assets.fleet_number}</span>}
                          {ncr.assets.registration_number && <span className="ncr-equip-chip">Reg: {ncr.assets.registration_number}</span>}
                          {ncr.assets.location && <span className="ncr-equip-chip">📍 {ncr.assets.location}</span>}
                        </div>
                        <div className="ncr-equip-btns">
                          <Link href={`/equipment/${ncr.assets.asset_tag}`} className="nd-btn nd-btn-accent" style={{ fontSize:11, padding:"7px 12px" }}>
                            View Equipment
                          </Link>
                          {ncr.certificate_id && (
                            <Link href={`/certificates/${ncr.certificate_id}`} className="nd-btn nd-btn-ghost" style={{ fontSize:11, padding:"7px 12px" }}>
                              View Certificate
                            </Link>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ color:T.textDim, fontSize:13, padding:"8px 0" }}>No equipment linked.</div>
                  )}
                </div>
              </div>

              {/* ── DESCRIPTION ───────────────────────────────────────── */}
              {ncr.description && (
                <div className="ncr-sec">
                  <div className="ncr-sec-head">
                    <div className="ncr-sec-icon" style={{ background:"rgba(251,191,36,0.08)" }}>📝</div>
                    <span className="ncr-sec-title">Description</span>
                  </div>
                  <p className="ncr-prose">{ncr.description}</p>
                </div>
              )}

              {/* ── DETAILS ───────────────────────────────────────────── */}
              {ncr.details && (
                <div className="ncr-sec">
                  <div className="ncr-sec-head">
                    <div className="ncr-sec-icon" style={{ background:"rgba(148,163,184,0.07)" }}>📄</div>
                    <span className="ncr-sec-title">Full Details</span>
                  </div>
                  <div className="ncr-findings">{ncr.details}</div>
                </div>
              )}

              {/* ── CORRECTIVE ACTION + ROOT CAUSE ────────────────────── */}
              {(ncr.corrective_action || ncr.root_cause) && (
                <div className="ncr-grid">
                  {ncr.corrective_action && (
                    <div className="ncr-sec">
                      <div className="ncr-sec-head">
                        <div className="ncr-sec-icon" style={{ background:"rgba(52,211,153,0.08)" }}>🔧</div>
                        <span className="ncr-sec-title">Corrective Action</span>
                      </div>
                      <p className="ncr-prose">{ncr.corrective_action}</p>
                    </div>
                  )}
                  {ncr.root_cause && (
                    <div className="ncr-sec">
                      <div className="ncr-sec-head">
                        <div className="ncr-sec-icon" style={{ background:"rgba(248,113,113,0.08)" }}>🔍</div>
                        <span className="ncr-sec-title">Root Cause</span>
                      </div>
                      <p className="ncr-prose">{ncr.root_cause}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── NO CAPA CTA ───────────────────────────────────────── */}
              {!linkedCapa && ncr.status !== "closed" && (
                <div className="ncr-capa-no-banner">
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🔧</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:T.purple, marginBottom:3 }}>No CAPA raised yet</div>
                      <div style={{ fontSize:11, color:T.textDim, lineHeight:1.5 }}>
                        Create a Corrective &amp; Preventive Action to track root cause and resolution.
                      </div>
                    </div>
                  </div>
                  <Link href={capaNewUrl} className="nd-btn" style={{ background:"linear-gradient(135deg,#a78bfa,#60a5fa)", color:"#fff", fontSize:13, padding:"10px 20px" }}>
                    🔧 Create CAPA
                  </Link>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
