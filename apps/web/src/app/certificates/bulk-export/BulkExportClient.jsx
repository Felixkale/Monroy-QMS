"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6)}
  .be-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .be-table{display:block}
  .be-mob{display:none}
  @media(max-width:600px){
    .be-grid{grid-template-columns:1fr}
    .be-table{display:none!important}
    .be-mob{display:grid!important;gap:0}
  }
  @keyframes spin{to{transform:rotate(360deg)}}
`;

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v + "T00:00:00Z");
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" });
}

const inputStyle = {
  width:"100%", background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(148,163,184,0.2)", borderRadius:9,
  padding:"9px 12px", color:"#f0f6ff", fontSize:13,
  fontFamily:"'IBM Plex Sans',sans-serif", outline:"none",
};
const labelStyle = {
  fontSize:9, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase",
  color:"rgba(240,246,255,0.40)", marginBottom:6, display:"block",
};

export default function BulkExportClient() {
  const [clientOpts,     setClientOpts]     = useState([]);
  const [clientName,     setClientName]     = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [preview,        setPreview]        = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewLoaded,  setPreviewLoaded]  = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [error,          setError]          = useState("");
  const [doneMsg,        setDoneMsg]        = useState("");

  useEffect(() => {
    supabase.from("certificates").select("client_name").then(({ data }) => {
      if (!data) return;
      const names = new Set();
      data.forEach(r => { if (r.client_name?.trim()) names.add(r.client_name.trim()); });
      setClientOpts([...names].sort());
    });
  }, []);

  function statusColor(s) {
    if (!s || s === "active") return { color:T.green, bg:T.greenDim, brd:T.greenBrd };
    if (s === "expired")      return { color:T.red,   bg:T.redDim,   brd:T.redBrd   };
    return { color:T.textDim, bg:T.card, brd:T.border };
  }

  async function handlePreview() {
    setError(""); setLoadingPreview(true); setPreviewLoaded(false); setDoneMsg("");
    let query = supabase
      .from("certificates")
      .select("id,certificate_number,client_name,equipment_type,equipment_description,inspection_date,issue_date,expiry_date,status,result")
      .order("certificate_number", { ascending: true })
      .limit(1000);
    if (clientName)     query = query.ilike("client_name", clientName.trim());
    if (inspectionDate) query = query.eq("inspection_date", inspectionDate);
    const { data, error: qErr } = await query;
    setLoadingPreview(false);
    if (qErr) { setError(qErr.message); return; }
    setPreview(data || []);
    setPreviewLoaded(true);
  }

  async function handleExport() {
    if (!preview.length) return;
    setExporting(true); setError(""); setDoneMsg("");
    try {
      const res = await fetch("/api/certificates/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: clientName.trim(), inspectionDate }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const zipName = match ? match[1] : "certificates.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = zipName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const exported = res.headers.get("X-Certificates-Exported") || preview.length;
      setDoneMsg(`✓ ${exported} certificate${exported != 1 ? "s" : ""} exported successfully`);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout title="Bulk Export">
      <style>{CSS}</style>
      <div style={{
        background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.05),transparent),${T.bg}`,
        color:T.text, fontFamily:"'IBM Plex Sans',sans-serif", padding:20, paddingBottom:60, minHeight:"100vh",
      }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"grid", gap:16 }}>

          {/* HEADER */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"18px 20px", backdropFilter:"blur(20px)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
              <div style={{ width:4, height:20, borderRadius:2, background:`linear-gradient(to bottom,${T.green},rgba(52,211,153,0.3))`, flexShrink:0 }}/>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.green }}>ISO 9001 · Document Export</span>
            </div>
            <h1 style={{ margin:0, fontSize:"clamp(18px,3vw,26px)", fontWeight:900, letterSpacing:"-0.02em" }}>Bulk Export Certificates</h1>
            <p style={{ margin:"5px 0 0", color:T.textDim, fontSize:12 }}>Filter by client and inspection date · preview matches · download as ZIP</p>
          </div>

          {/* FILTERS */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 18px", backdropFilter:"blur(20px)" }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:T.textDim, marginBottom:14 }}>Filters</div>
            <div className="be-grid">
              <div>
                <label style={labelStyle}>Client</label>
                <select value={clientName} onChange={e => { setClientName(e.target.value); setPreviewLoaded(false); setDoneMsg(""); }} style={{ ...inputStyle, cursor:"pointer" }}>
                  <option value="">All Clients</option>
                  {clientOpts.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Inspection Date</label>
                <input type="date" value={inspectionDate} onChange={e => { setInspectionDate(e.target.value); setPreviewLoaded(false); setDoneMsg(""); }} style={inputStyle}/>
              </div>
            </div>

            {(clientName || inspectionDate) && (
              <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Active:</span>
                {clientName     && <span style={{ padding:"3px 10px", borderRadius:99, background:T.accentDim, border:`1px solid ${T.accentBrd}`, color:T.accent, fontSize:11, fontWeight:700 }}>{clientName.trim()}</span>}
                {inspectionDate && <span style={{ padding:"3px 10px", borderRadius:99, background:T.amberDim,  border:`1px solid ${T.amberBrd}`,  color:T.amber,  fontSize:11, fontWeight:700 }}>Inspected {formatDate(inspectionDate)}</span>}
                <button onClick={() => { setClientName(""); setInspectionDate(""); setPreviewLoaded(false); setPreview([]); setDoneMsg(""); }}
                  style={{ background:"none", border:"none", color:T.textDim, fontSize:11, cursor:"pointer", fontWeight:700, padding:"3px 6px" }}>
                  Clear ×
                </button>
              </div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={handlePreview} disabled={loadingPreview || exporting} style={{
                padding:"9px 20px", borderRadius:10, border:`1px solid ${T.accentBrd}`,
                background:T.accentDim, color:T.accent, fontWeight:900, fontSize:13,
                cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif",
                opacity:(loadingPreview || exporting) ? 0.6 : 1,
              }}>
                {loadingPreview ? "Loading…" : "Preview Matches"}
              </button>

              {previewLoaded && preview.length > 0 && (
                <button onClick={handleExport} disabled={exporting} style={{
                  padding:"9px 20px", borderRadius:10, border:`1px solid ${T.greenBrd}`,
                  background:T.greenDim, color:T.green, fontWeight:900, fontSize:13,
                  cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif",
                  display:"flex", alignItems:"center", gap:8, opacity:exporting ? 0.6 : 1,
                }}>
                  {exporting ? (
                    <><span style={{ display:"inline-block", width:13, height:13, border:`2px solid ${T.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> Generating…</>
                  ) : (
                    <>⬇ Export {preview.length} Certificate{preview.length !== 1 ? "s" : ""} as ZIP</>
                  )}
                </button>
              )}
            </div>

            {doneMsg && !exporting && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontSize:13, fontWeight:700 }}>
                {doneMsg}
              </div>
            )}
            {error && (
              <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:600 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* PREVIEW TABLE */}
          {previewLoaded && (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, fontWeight:800 }}>
                  Preview — <span style={{ color:T.accent }}>{preview.length} certificate{preview.length !== 1 ? "s" : ""}</span>
                </span>
                {preview.length === 0 && <span style={{ fontSize:12, color:T.textDim }}>No results.</span>}
              </div>
              {preview.length > 0 && (
                <>
                  <div className="be-table" style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                      <thead>
                        <tr style={{ background:"rgba(255,255,255,0.02)" }}>
                          {["Certificate No","Client","Equipment","Inspection Date","Issue Date","Expiry Date","Status"].map(h => (
                            <td key={h} style={{ padding:"9px 14px", fontSize:9, color:T.textDim, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map(cert => {
                          const sc = statusColor(cert.status);
                          return (
                            <tr key={cert.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                              <td style={{ padding:"10px 14px", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:T.accent, fontWeight:800, whiteSpace:"nowrap" }}>{cert.certificate_number || "—"}</td>
                              <td style={{ padding:"10px 14px", fontSize:12, color:T.textMid }}>{cert.client_name?.trim() || "—"}</td>
                              <td style={{ padding:"10px 14px", fontSize:12, color:T.textMid, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cert.equipment_description || cert.equipment_type || "—"}</td>
                              <td style={{ padding:"10px 14px", fontSize:12, color:T.textMid, whiteSpace:"nowrap" }}>{formatDate(cert.inspection_date)}</td>
                              <td style={{ padding:"10px 14px", fontSize:12, color:T.textMid, whiteSpace:"nowrap" }}>{formatDate(cert.issue_date)}</td>
                              <td style={{ padding:"10px 14px", fontSize:12, color:T.textMid, whiteSpace:"nowrap" }}>{formatDate(cert.expiry_date)}</td>
                              <td style={{ padding:"10px 14px" }}>
                                <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.brd}`, fontSize:10, fontWeight:800, textTransform:"capitalize", whiteSpace:"nowrap" }}>
                                  {cert.status || "active"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="be-mob">
                    {preview.map(cert => {
                      const sc = statusColor(cert.status);
                      return (
                        <div key={cert.id} style={{ padding:"13px 14px", borderBottom:`1px solid ${T.border}`, display:"grid", gap:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
                            <span style={{ color:T.accent, fontWeight:800, fontFamily:"'IBM Plex Mono',monospace", fontSize:13 }}>{cert.certificate_number || "—"}</span>
                            <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.brd}`, fontSize:10, fontWeight:800, textTransform:"capitalize" }}>{cert.status || "active"}</span>
                          </div>
                          <div style={{ fontSize:12, color:T.textMid }}>{cert.equipment_description || cert.equipment_type || "—"}</div>
                          <div style={{ fontSize:11, color:T.textDim, display:"flex", gap:12, flexWrap:"wrap" }}>
                            <span>{cert.client_name?.trim() || "—"}</span>
                            <span>Inspected: {formatDate(cert.inspection_date)}</span>
                            <span>Expiry: {formatDate(cert.expiry_date)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
