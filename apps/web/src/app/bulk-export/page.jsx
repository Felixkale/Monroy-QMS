// src/app/bulk-export/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)",card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)",borderMid:"rgba(148,163,184,0.22)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",blueDim:"rgba(96,165,250,0.10)",blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6);cursor:pointer}
  select option{background:#0a1420;color:#f0f6ff}

  .be-page{
    background:radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),
               radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.05),transparent),
               #070e18;
    color:#f0f6ff;
    font-family:'IBM Plex Sans',sans-serif;
    min-height:100vh;
    padding:20px;
    padding-bottom:80px;
  }
  .be-wrap{max-width:960px;margin:0 auto;display:grid;gap:16px}

  .be-hero{
    background:rgba(13,22,38,0.80);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:20px;
    padding:24px;
    backdrop-filter:blur(20px);
  }

  .be-filters{
    background:rgba(13,22,38,0.80);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:16px;
    padding:20px;
    backdrop-filter:blur(20px);
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
  }
  @media(max-width:600px){.be-filters{grid-template-columns:1fr}}

  .be-field label{
    display:block;
    font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
    color:rgba(240,246,255,0.40);margin-bottom:8px;
  }
  .be-input{
    width:100%;padding:11px 14px;
    background:rgba(255,255,255,0.04);
    border:1px solid rgba(148,163,184,0.18);
    border-radius:10px;
    color:#f0f6ff;font-size:13px;font-weight:600;
    font-family:'IBM Plex Sans',sans-serif;
    outline:none;cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    transition:border-color .15s;
    min-height:44px;
    colorScheme:dark;
  }
  .be-input:focus{border-color:rgba(34,211,238,0.45)}
  .be-input:disabled{opacity:0.4;cursor:not-allowed}

  .be-preview{
    background:rgba(10,18,32,0.92);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:16px;
    overflow:hidden;
    backdrop-filter:blur(20px);
  }
  .be-preview-head{
    padding:14px 18px;
    border-bottom:1px solid rgba(148,163,184,0.12);
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    flex-wrap:wrap;
  }

  .be-cert-row{
    padding:12px 18px;
    border-bottom:1px solid rgba(148,163,184,0.08);
    display:flex;align-items:center;gap:12px;flex-wrap:wrap;
    transition:background .12s;
  }
  .be-cert-row:hover{background:rgba(34,211,238,0.02)}
  .be-cert-row:last-child{border-bottom:none}

  .be-badge{
    display:inline-flex;align-items:center;
    padding:3px 9px;border-radius:99px;
    font-size:10px;font-weight:800;white-space:nowrap;
  }
  .be-empty{
    padding:48px 24px;text-align:center;
  }
  .be-cta{
    background:rgba(13,22,38,0.80);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:16px;
    padding:20px;
    backdrop-filter:blur(20px);
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    flex-wrap:wrap;
    position:sticky;bottom:0;
  }

  .be-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:8px;
    padding:12px 22px;border-radius:12px;
    font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:900;
    cursor:pointer;border:none;
    min-height:48px;min-width:44px;
    -webkit-tap-highlight-color:transparent;
    transition:filter .15s,transform .12s;
    white-space:nowrap;
  }
  .be-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
  .be-btn:active:not(:disabled){transform:scale(0.97)}
  .be-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
  .be-btn-primary{background:linear-gradient(135deg,#22d3ee,#60a5fa);color:#001018}
  .be-btn-ghost{background:rgba(255,255,255,0.05);border:1px solid rgba(148,163,184,0.18)!important;color:#f0f6ff}

  .be-spinner{
    width:32px;height:32px;border-radius:50%;
    border:2.5px solid rgba(34,211,238,0.15);border-top-color:#22d3ee;
    animation:spin .8s linear infinite;margin:0 auto 12px;
  }
  @keyframes spin{to{transform:rotate(360deg)}}

  .be-pulse{animation:pulse 1.8s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}

  @media(max-width:768px){
    .be-page{padding:10px;padding-bottom:100px}
    .be-hero{padding:16px}
    .be-cta{padding:14px}
    .be-btn-primary{flex:1}
  }
  @media(max-width:480px){
    .be-cta{flex-direction:column}
    .be-cta>*{width:100%}
    .be-btn{width:100%}
  }
`;

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeResult(v) {
  const x = String(v || "").toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(x)) return x;
  return "UNKNOWN";
}

const RC = {
  PASS:           { label: "Pass",        color: T.green,  bg: T.greenDim,  brd: T.greenBrd },
  FAIL:           { label: "Fail",        color: T.red,    bg: T.redDim,    brd: T.redBrd },
  REPAIR_REQUIRED:{ label: "Repair Req.", color: T.amber,  bg: T.amberDim,  brd: T.amberBrd },
  OUT_OF_SERVICE: { label: "Out of Svc",  color: T.purple, bg: T.purpleDim, brd: T.purpleBrd },
  UNKNOWN:        { label: "Unknown",     color: T.textDim,bg: T.card,      brd: T.border },
};
const rc = v => RC[v] || RC.UNKNOWN;

export default function BulkExportPage() {
  const router = useRouter();

  const [allCerts, setAllCerts]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [errTxt,   setErrTxt]     = useState("");

  const [selClient, setSelClient] = useState("ALL");
  const [selDate,   setSelDate]   = useState("");

  const [searching, setSearching] = useState(false);
  const [preview,   setPreview]   = useState(null); // null = not searched yet, [] = empty, [...] = results

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("certificates")
        .select("id,certificate_number,client_name,company,equipment_type,equipment_description,asset_name,asset_tag,inspection_date,issue_date,expiry_date,result,folder_id,folder_name,folder_position")
        .order("inspection_date", { ascending: false });
      if (error) { setErrTxt(error.message); setLoading(false); return; }
      const cleaned = (data || []).map(r => ({
        ...r,
        result: normalizeResult(r.result),
        client_name: r.client_name || r.company || "UNASSIGNED",
        equipment_description: r.equipment_description || r.asset_name || r.asset_tag || "UNNAMED",
      }));
      setAllCerts(cleaned);
      setLoading(false);
    })();
  }, []);

  const clientOpts = useMemo(() => {
    const set = new Set(allCerts.map(c => c.client_name).filter(Boolean));
    return [...set].sort();
  }, [allCerts]);

  // Available inspection dates for selected client
  const dateopts = useMemo(() => {
    const src = selClient === "ALL" ? allCerts : allCerts.filter(c => c.client_name === selClient);
    const set = new Set(src.map(c => c.inspection_date || c.issue_date?.split("T")[0]).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [allCerts, selClient]);

  async function handlePreview() {
    if (!selClient || selClient === "ALL") return;
    if (!selDate) return;
    setSearching(true);
    setPreview(null);

    const { data, error } = await supabase
      .from("certificates")
      .select("id,certificate_number,client_name,company,equipment_type,equipment_description,asset_name,asset_tag,inspection_date,issue_date,expiry_date,result,folder_id,folder_name,folder_position")
      .or(`client_name.eq.${selClient},company.eq.${selClient}`)
      .order("folder_position", { ascending: true });

    if (error) { setErrTxt(error.message); setSearching(false); return; }

    // Filter by exact inspection date
    const matched = (data || []).filter(r => {
      const d = r.inspection_date || (r.issue_date ? r.issue_date.split("T")[0] : null);
      return d === selDate;
    }).map(r => ({
      ...r,
      result: normalizeResult(r.result),
      client_name: r.client_name || r.company || "UNASSIGNED",
      equipment_description: r.equipment_description || r.asset_name || r.asset_tag || "UNNAMED",
    }));

    setPreview(matched);
    setSearching(false);
  }

  function handleDownload() {
    if (!preview || preview.length === 0) return;
    // Collect unique IDs (de-dup folders so we only pass one per folder group)
    const ids = preview.map(c => c.id);
    const params = new URLSearchParams({ ids: ids.join(",") });
    router.push(`/bulk-print?${params.toString()}`);
  }

  const canPreview  = selClient !== "ALL" && !!selDate;
  const canDownload = preview && preview.length > 0;

  return (
    <AppLayout title="Bulk Export">
      <style>{CSS}</style>
      <div className="be-page">
        <div className="be-wrap">

          {/* HERO */}
          <div className="be-hero">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: `linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent }}>Certificate Management · ISO 9001</span>
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(18px,3vw,26px)", fontWeight: 900, letterSpacing: "-0.02em" }}>Bulk Export</h1>
            <p style={{ margin: "6px 0 0", color: T.textDim, fontSize: 13 }}>
              Select a client and inspection date to preview and export all matching certificates as a single PDF batch.
            </p>
          </div>

          {errTxt && (
            <div style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontSize: 13, fontWeight: 600 }}>
              ⚠ {errTxt}
            </div>
          )}

          {/* FILTERS */}
          <div className="be-filters">
            <div className="be-field">
              <label>Client</label>
              <select
                className="be-input"
                value={selClient}
                disabled={loading}
                onChange={e => { setSelClient(e.target.value); setSelDate(""); setPreview(null); }}
              >
                <option value="ALL">— Select a client —</option>
                {clientOpts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="be-field">
              <label>Inspection Date</label>
              <select
                className="be-input"
                value={selDate}
                disabled={loading || selClient === "ALL"}
                onChange={e => { setSelDate(e.target.value); setPreview(null); }}
              >
                <option value="">— Select date —</option>
                {dateopts.map(d => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* PREVIEW BUTTON */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="be-btn be-btn-primary"
              disabled={!canPreview || searching || loading}
              onClick={handlePreview}
            >
              {searching ? (
                <><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,16,24,0.3)", borderTopColor: "#001018", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Searching…</>
              ) : "🔍 Preview Certificates"}
            </button>
          </div>

          {/* PREVIEW PANEL */}
          {preview !== null && (
            <div className="be-preview">
              <div className="be-preview-head">
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim, marginBottom: 4 }}>Preview</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {selClient} · {formatDate(selDate)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: preview.length > 0 ? T.green : T.textDim }}>
                    {preview.length} certificate{preview.length !== 1 ? "s" : ""} found
                  </span>
                  {preview.length > 0 && (
                    <span style={{ padding: "3px 10px", borderRadius: 99, background: T.greenDim, border: `1px solid ${T.greenBrd}`, color: T.green, fontSize: 10, fontWeight: 800 }}>
                      Ready to export
                    </span>
                  )}
                </div>
              </div>

              {preview.length === 0 ? (
                <div className="be-empty">
                  <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>No certificates found</div>
                  <div style={{ fontSize: 12, color: T.textDim }}>
                    No inspection records for <strong style={{ color: T.textMid }}>{selClient}</strong> on <strong style={{ color: T.textMid }}>{formatDate(selDate)}</strong>.
                  </div>
                </div>
              ) : (
                <div>
                  {/* Group by folder for display */}
                  {(() => {
                    const folders = {};
                    const standalone = [];
                    for (const c of preview) {
                      if (c.folder_id) {
                        if (!folders[c.folder_id]) folders[c.folder_id] = [];
                        folders[c.folder_id].push(c);
                      } else {
                        standalone.push(c);
                      }
                    }
                    const rows = [];
                    for (const c of standalone) rows.push({ type: "single", cert: c });
                    for (const grp of Object.values(folders)) {
                      const sorted = [...grp].sort((a, b) => (a.folder_position || 99) - (b.folder_position || 99));
                      rows.push({ type: "folder", certs: sorted });
                    }
                    return rows.map((row, ri) => {
                      if (row.type === "single") {
                        const c = row.cert;
                        const r = rc(c.result);
                        return (
                          <div key={c.id} className="be-cert-row">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: T.accent }}>
                                  {c.certificate_number || "—"}
                                </span>
                                <span className="be-badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.brd}` }}>{r.label}</span>
                              </div>
                              <div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>
                                {c.equipment_description} · <span style={{ color: T.textDim }}>{c.equipment_type}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: T.textDim, flexShrink: 0, textAlign: "right" }}>
                              <div>Inspected: {formatDate(c.inspection_date || c.issue_date)}</div>
                              <div>Expires: {formatDate(c.expiry_date)}</div>
                            </div>
                          </div>
                        );
                      }
                      // Folder group
                      const { certs } = row;
                      return (
                        <div key={`folder-${certs[0].folder_id}`} style={{ borderBottom: `1px solid rgba(148,163,184,0.08)` }}>
                          <div style={{ padding: "10px 18px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14 }}>📁</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: T.purple }}>{certs[0].folder_name || "Linked Group"}</span>
                            <span style={{ fontSize: 10, color: T.textDim }}>({certs.length} certificates)</span>
                          </div>
                          {certs.map((c, fi) => {
                            const r = rc(c.result);
                            return (
                              <div key={c.id} className="be-cert-row" style={{ paddingLeft: 36, borderBottom: fi < certs.length - 1 ? `1px dashed rgba(148,163,184,0.08)` : "none" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ color: T.purple, fontSize: 10 }}>{fi === 0 ? "└─" : "  └─"}</span>
                                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: T.accent }}>{c.certificate_number || "—"}</span>
                                    <span className="be-badge" style={{ background: r.bg, color: r.color, border: `1px solid ${r.brd}` }}>{r.label}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: T.textMid, marginTop: 3, paddingLeft: 22 }}>
                                    {c.equipment_description} · <span style={{ color: T.textDim }}>{c.equipment_type}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {/* CTA BAR */}
          {canDownload && (
            <div className="be-cta">
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {preview.length} certificate{preview.length !== 1 ? "s" : ""} ready
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  {selClient} · {formatDate(selDate)} · All will be printed and saved to storage
                </div>
              </div>
              <button
                type="button"
                className="be-btn be-btn-primary"
                onClick={handleDownload}
              >
                ⬇ Export & Print All
              </button>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
