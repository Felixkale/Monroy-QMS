// src/app/inspection-templates/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.90)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.08)",accentBrd:"rgba(34,211,238,0.22)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.08)",greenBrd:"rgba(52,211,153,0.22)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.08)",amberBrd:"rgba(251,191,36,0.22)",
  red:"#f87171",redDim:"rgba(248,113,113,0.08)",redBrd:"rgba(248,113,113,0.22)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.18);border-radius:99px}

  .it-page{
    min-height:100vh;
    background:radial-gradient(ellipse 80% 40% at 10% 0%,rgba(34,211,238,0.05),transparent),
               radial-gradient(ellipse 60% 50% at 90% 100%,rgba(167,139,250,0.04),transparent),
               #070e18;
    color:#f0f6ff;font-family:'IBM Plex Sans',sans-serif;
    padding:24px;padding-bottom:60px;
  }
  .it-wrap{max-width:1200px;margin:0 auto;display:grid;gap:20px}

  .it-hero{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:20px;padding:24px 28px;backdrop-filter:blur(20px);position:relative;overflow:hidden}
  .it-hero::before{content:'';position:absolute;top:0;right:0;width:300px;height:100%;background:radial-gradient(ellipse at right,rgba(34,211,238,0.06),transparent 70%);pointer-events:none}
  .it-hero-tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#22d3ee;margin-bottom:10px}
  .it-hero-tag::before{content:'';width:4px;height:16px;border-radius:2px;background:linear-gradient(to bottom,#22d3ee,rgba(34,211,238,0.3));flex-shrink:0}
  .it-hero h1{margin:0 0 6px;font-family:'Syne',sans-serif;font-size:clamp(20px,3vw,28px);font-weight:900;letter-spacing:-0.02em}
  .it-hero p{margin:0;color:rgba(240,246,255,0.45);font-size:13px;line-height:1.5}

  .it-filters{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;backdrop-filter:blur(20px);display:grid;grid-template-columns:1fr 1fr auto;gap:14px;align-items:end}
  .it-field{display:flex;flex-direction:column;gap:6px}
  .it-label{font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,246,255,0.38)}
  .it-select,.it-input{background:rgba(255,255,255,0.04);border:1px solid rgba(148,163,184,0.18);border-radius:10px;padding:10px 14px;color:#f0f6ff;font-size:13px;font-family:'IBM Plex Sans',sans-serif;outline:none;-webkit-tap-highlight-color:transparent;min-height:44px;transition:border-color .15s}
  .it-select:focus,.it-input:focus{border-color:#22d3ee}
  .it-select option{background:#0d1626;color:#f0f6ff}

  .it-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 22px;border-radius:11px;font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:800;cursor:pointer;border:none;min-height:44px;-webkit-tap-highlight-color:transparent;transition:filter .15s,transform .15s;white-space:nowrap}
  .it-btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px)}
  .it-btn:active:not(:disabled){transform:scale(0.97)}
  .it-btn:disabled{opacity:0.45;cursor:not-allowed;transform:none}
  .it-btn-primary{background:linear-gradient(135deg,#22d3ee,#0891b2);color:#001018}
  .it-btn-print{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}
  .it-btn-ghost{background:rgba(255,255,255,0.05);border:1px solid rgba(148,163,184,0.18);color:#f0f6ff}

  .it-results{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden;backdrop-filter:blur(20px)}
  .it-results-header{padding:16px 20px;border-bottom:1px solid rgba(148,163,184,0.10);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .it-results-title{font-size:12px;font-weight:800;color:rgba(240,246,255,0.55);letter-spacing:0.06em;text-transform:uppercase}
  .it-count-badge{font-size:11px;font-weight:800;font-family:'IBM Plex Mono',monospace;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.22);color:#22d3ee;padding:3px 10px;border-radius:99px}

  .it-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .it-table{width:100%;border-collapse:collapse;font-size:13px}
  .it-table th{padding:10px 16px;text-align:left;font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:rgba(240,246,255,0.35);border-bottom:1px solid rgba(148,163,184,0.10);white-space:nowrap}
  .it-table td{padding:13px 16px;border-bottom:1px solid rgba(148,163,184,0.07);color:rgba(240,246,255,0.85);vertical-align:middle}
  .it-table tr{cursor:pointer;transition:background .12s}
  .it-table tr:hover td{background:rgba(34,211,238,0.04)}
  .it-table tr.selected td{background:rgba(34,211,238,0.08);border-bottom-color:rgba(34,211,238,0.15)}
  .it-table tr:last-child td{border-bottom:none}
  .it-cert-num{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:#22d3ee}
  .it-equip-type{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;white-space:nowrap}

  .it-preview{background:rgba(13,22,38,0.8);border:1px solid rgba(34,211,238,0.2);border-radius:16px;padding:20px;backdrop-filter:blur(20px);animation:fadeIn .2s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .it-preview-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
  .it-preview-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin:0 0 4px}
  .it-preview-sub{font-size:11px;color:rgba(240,246,255,0.4);font-family:'IBM Plex Mono',monospace}
  .it-preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px}
  .it-preview-field{background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.10);border-radius:10px;padding:10px 12px}
  .it-preview-field-label{font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,246,255,0.35);margin-bottom:4px}
  .it-preview-field-value{font-size:13px;font-weight:600;color:#f0f6ff;font-family:'IBM Plex Mono',monospace}
  .it-checklist-preview{margin-bottom:16px}
  .it-checklist-title{font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,246,255,0.38);margin-bottom:8px}
  .it-checklist-items{display:flex;flex-wrap:wrap;gap:6px}
  .it-checklist-item{font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(148,163,184,0.12);color:rgba(240,246,255,0.65);display:flex;align-items:center;gap:5px}
  .it-checklist-item::before{content:'□';font-size:12px;color:rgba(240,246,255,0.3)}

  .it-empty{padding:60px 20px;text-align:center;color:rgba(240,246,255,0.28);font-size:13px;line-height:1.8}
  .it-empty-icon{font-size:36px;margin-bottom:12px;opacity:0.5}
  @keyframes spin{to{transform:rotate(360deg)}}
  .it-spinner{width:32px;height:32px;border-radius:50%;border:2px solid rgba(34,211,238,0.15);border-top-color:#22d3ee;animation:spin 0.8s linear infinite;margin:40px auto}

  .badge-pass{background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);color:#34d399;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace}
  .badge-fail{background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);color:#f87171;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace}
  .badge-other{background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);color:#fbbf24;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;font-family:'IBM Plex Mono',monospace}

  @media(max-width:768px){
    .it-page{padding:14px}
    .it-filters{grid-template-columns:1fr}
    .it-filters .it-btn{width:100%}
    .it-table th:nth-child(4),.it-table td:nth-child(4){display:none}
  }
  @media(max-width:480px){
    .it-table th:nth-child(3),.it-table td:nth-child(3){display:none}
  }
`;

const CHECKLISTS = {
  CRANE:          ["Hook condition","Wire rope","Sheaves & drums","Brakes","Limit switches","Electrical systems","Structural members","Load test","SWL markings","Safety latch"],
  WIRE_ROPE:      ["Broken wires","Corrosion","Kinking / crushing","Reduction in diameter","End terminations","Lubrication","Abrasion wear","Core condition"],
  WIRE_SLING:     ["Eyes & ferrules","Abrasion damage","Kinking","SWL tag present","Angle factor check","Core wires","End fittings","Twist / deformation"],
  PRESSURE_VESSEL:["Shell integrity","Nozzles & flanges","Relief valve","Pressure gauges","Support structure","Hydrostatic test","Nameplate legible","Corrosion check"],
  FORKLIFT:       ["Fork tines","Mast & carriage","Tyres condition","Brakes","Lights & horn","Fluid levels","Overhead guard","Seat belt","Load backrest","Controls"],
  MACHINE:        ["Guards & covers","Electrical systems","Fasteners","Lubrication","Controls function","Emergency stop","Safety devices","Structural integrity"],
  DEFAULT:        ["Visual inspection","Functional test","Safety devices","Load/pressure test","Labelling & markings","Structural integrity","Controls","Documentation"],
};

function getChecklist(equipType) {
  const t = (equipType || "").toUpperCase();
  if (t.includes("CRANE") || t.includes("HOIST") || t.includes("DAVIT")) return CHECKLISTS.CRANE;
  if (t.includes("WIRE ROPE") || t.includes("WIREROPE"))                  return CHECKLISTS.WIRE_ROPE;
  if (t.includes("SLING"))                                                 return CHECKLISTS.WIRE_SLING;
  if (t.includes("PRESSURE") || t.includes("VESSEL") || t.includes("COMPRESSOR")) return CHECKLISTS.PRESSURE_VESSEL;
  if (t.includes("FORKLIFT"))                                              return CHECKLISTS.FORKLIFT;
  if (t.includes("MACHINE") || t.includes("GENERATOR") || t.includes("PUMP") || t.includes("MOTOR")) return CHECKLISTS.MACHINE;
  return CHECKLISTS.DEFAULT;
}

function getTypeColor(equipType) {
  const t = (equipType || "").toUpperCase();
  if (t.includes("CRANE") || t.includes("HOIST"))     return { bg:"rgba(34,211,238,0.1)",  brd:"rgba(34,211,238,0.25)",  color:"#22d3ee" };
  if (t.includes("SLING") || t.includes("WIRE"))      return { bg:"rgba(167,139,250,0.1)", brd:"rgba(167,139,250,0.25)", color:"#a78bfa" };
  if (t.includes("PRESSURE") || t.includes("VESSEL")) return { bg:"rgba(251,191,36,0.1)",  brd:"rgba(251,191,36,0.25)",  color:"#fbbf24" };
  if (t.includes("FORKLIFT"))                         return { bg:"rgba(52,211,153,0.1)",  brd:"rgba(52,211,153,0.25)",  color:"#34d399" };
  return { bg:"rgba(96,165,250,0.1)", brd:"rgba(96,165,250,0.25)", color:"#60a5fa" };
}

function ResultBadge({ result }) {
  const r = (result || "").toUpperCase();
  if (r === "PASS") return <span className="badge-pass">PASS</span>;
  if (r === "FAIL") return <span className="badge-fail">FAIL</span>;
  return <span className="badge-other">{r || "—"}</span>;
}

function formatDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v + (v.includes("T") ? "" : "T00:00:00Z"));
    return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" });
  } catch { return v; }
}

export default function InspectionTemplatesPage() {
  const router = useRouter();

  const [equipTypes, setEquipTypes] = useState([]);
  const [selType,    setSelType]    = useState("ALL");
  const [search,     setSearch]     = useState("");
  const [certs,      setCerts]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [selected,   setSelected]   = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("certificates").select("equipment_type");
      if (!data) return;
      const cleaned = data.map(r => (r.equipment_type||"").replace(/[\r\n\u2014\u2013]+/g," ").replace(/\s+/g," ").trim()).filter(Boolean);
      setEquipTypes([...new Set(cleaned)].sort());
    })();
  }, []);

  async function handleSearch() {
    setLoading(true); setSearched(false); setSelected(null);
    const cleanType = selType.replace(/[\r\n\u2014\u2013]+/g," ").replace(/\s+/g," ").trim();
    // Fetch just equipment_type column — deduplicate client-side
    const { data, error } = await supabase
      .from("certificates")
      .select("equipment_type")
      .limit(5000);
    if (error) { setCerts([]); setLoading(false); setSearched(true); return; }
    // Build deduplicated list of unique equipment types
    let types = [...new Set(
      (data || [])
        .map(r => (r.equipment_type||"").replace(/[\r\n\u2014\u2013]+/g," ").replace(/\s+/g," ").trim())
        .filter(Boolean)
    )].sort();
    // Filter by selected type
    if (cleanType !== "ALL") {
      types = types.filter(t => t.toLowerCase().includes(cleanType.toLowerCase()));
    }
    // Filter by description search (match against type name)
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      types = types.filter(t => t.toLowerCase().includes(s));
    }
    // Convert to row objects for the table
    setCerts(types.map(t => ({ id: t, equipment_type: t })));
    setLoading(false); setSearched(true);
  }

  const checklist = selected ? getChecklist(selected.equipment_type) : [];

  return (
    <AppLayout title="Inspection Templates">
      <style>{CSS}</style>
      <div className="it-page">
        <div className="it-wrap">

          <div className="it-hero">
            <div className="it-hero-tag">Certificate Management · ISO 9001</div>
            <h1>Inspection Templates</h1>
            <p>Generate printable blank inspection forms pre-filled with equipment data from existing certificates. Filter by equipment type, pick a certificate, then print its template.</p>
          </div>

          {/* FILTERS — equipment type + description only */}
          <div className="it-filters">
            <div className="it-field">
              <span className="it-label">Equipment Type</span>
              <select className="it-select" value={selType} onChange={e => setSelType(e.target.value)}>
                <option value="ALL">All Equipment Types</option>
                {equipTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="it-field">
              <span className="it-label">Description (optional)</span>
              <input
                className="it-input"
                placeholder="e.g. overhead crane, air compressor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button type="button" className="it-btn it-btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? "Searching…" : "🔍 Search"}
            </button>
          </div>

          {loading && <div className="it-spinner"/>}

          {!loading && searched && (
            <div className="it-results">
              <div className="it-results-header">
                <span className="it-results-title">Certificates</span>
                <span className="it-count-badge">{certs.length} found</span>
              </div>
              {certs.length === 0 ? (
                <div className="it-empty">
                  <div className="it-empty-icon">📋</div>
                  No certificates match your filters.<br/>Try a different equipment type or clear the description.
                </div>
              ) : (
                <div className="it-table-wrap">
                  <table className="it-table">
                    <thead>
                      <tr>
                        <th>Equipment Type</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map(c => {
                        const tc = getTypeColor(c.equipment_type);
                        return (
                          <tr key={c.id} className={selected?.id === c.id ? "selected" : ""} onClick={() => setSelected(c)}>
                            <td>
                              <span className="it-equip-type" style={{ background:tc.bg, border:`1px solid ${tc.brd}`, color:tc.color }}>
                                {c.equipment_type || "—"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); window.open(`/inspection-templates/print?type=${encodeURIComponent(c.equipment_type)}`, "_blank"); }}
                                style={{ padding:"5px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#34d399,#14b8a6)", color:"#052e16", fontWeight:800, fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", whiteSpace:"nowrap" }}
                              >
                                🖨 Print Template
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!searched && !loading && (
            <div className="it-empty">
              <div className="it-empty-icon">🗂️</div>
              Select an equipment type and click <strong>Search</strong>.<br/>
              Pick a certificate row to preview and print its template.
            </div>
          )}

          {selected && (
            <div className="it-preview">
              <div className="it-preview-header">
                <div>
                  <div className="it-preview-title">{selected.equipment_description || selected.equipment_type}</div>
                  <div className="it-preview-sub">Blank template — all fields empty</div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button type="button" className="it-btn it-btn-ghost" onClick={() => setSelected(null)}>✕ Clear</button>
                  <button type="button" className="it-btn it-btn-print" onClick={() => window.open(`/inspection-templates/print?type=${encodeURIComponent(selected.equipment_type)}`, "_blank")}>
                    🖨 Print Template
                  </button>
                </div>
              </div>

              <div className="it-preview-grid">
                {[
                  ["Equipment Type",  selected.equipment_type],
                  ["Serial Number",   selected.serial_number],
                  ["SWL / Capacity",  selected.swl],
                  ["Manufacturer",    selected.manufacturer],
                  ["Model",           selected.model],
                  ["Client",          selected.client_name],
                  ["Location",        selected.location],
                  ["Fleet No.",       selected.fleet_number],
                  ["Last Inspection", formatDate(selected.inspection_date)],
                  ["Prev. Result",    selected.result],
                ].filter(([,v]) => v).map(([label, value]) => (
                  <div className="it-preview-field" key={label}>
                    <div className="it-preview-field-label">{label}</div>
                    <div className="it-preview-field-value">{value}</div>
                  </div>
                ))}
              </div>

              <div className="it-checklist-preview">
                <div className="it-checklist-title">Checklist preview — {checklist.length} items</div>
                <div className="it-checklist-items">
                  {checklist.map(item => <div className="it-checklist-item" key={item}>{item}</div>)}
                </div>
              </div>

              <div style={{ fontSize:11, color:"rgba(240,246,255,0.3)", borderTop:"1px solid rgba(148,163,184,0.08)", paddingTop:12 }}>
                Printed template includes all pre-filled fields, blank inspection fields, checklist with PASS/FAIL/N/A columns, defects table, and signature blocks.
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
