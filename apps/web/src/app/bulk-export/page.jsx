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
    padding-bottom:120px;
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
    grid-template-columns:1fr 1fr 1fr;
    gap:16px;
  }
  @media(max-width:700px){.be-filters{grid-template-columns:1fr}}

  .be-field label{
    display:flex;align-items:center;gap:6px;
    font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
    color:rgba(240,246,255,0.40);margin-bottom:8px;
  }
  .be-field label .be-req{
    color:#f87171;font-size:9px;font-weight:900;
  }
  .be-field label .be-opt{
    color:rgba(240,246,255,0.28);font-size:8px;font-weight:600;
    text-transform:none;letter-spacing:0;
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
  .be-input.active{border-color:rgba(34,211,238,0.35);background:rgba(34,211,238,0.05)}

  /* Filter active pill */
  .be-active-pill{
    display:inline-flex;align-items:center;gap:5px;
    padding:3px 9px;border-radius:99px;
    font-size:10px;font-weight:800;
    background:rgba(34,211,238,0.10);
    border:1px solid rgba(34,211,238,0.25);
    color:#22d3ee;
  }

  .be-filter-summary{
    display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;
    padding-top:14px;border-top:1px solid rgba(148,163,184,0.08);
    font-size:11px;color:rgba(240,246,255,0.40);
  }

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
    background:rgba(13,22,38,0.95);
    border:1px solid rgba(148,163,184,0.12);
    border-radius:16px;
    padding:20px;
    backdrop-filter:blur(20px);
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    flex-wrap:wrap;
    position:sticky;bottom:16px;
    box-shadow:0 8px 40px rgba(0,0,0,0.5);
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
  .be-btn-clear{
    background:transparent;border:none;
    color:rgba(240,246,255,0.35);font-size:11px;font-weight:700;
    cursor:pointer;padding:4px 8px;border-radius:6px;font-family:inherit;
    -webkit-tap-highlight-color:transparent;
  }
  .be-btn-clear:hover{color:rgba(240,246,255,0.65);background:rgba(255,255,255,0.04)}

  .be-spinner{
    width:32px;height:32px;border-radius:50%;
    border:2.5px solid rgba(34,211,238,0.15);border-top-color:#22d3ee;
    animation:spin .8s linear infinite;margin:0 auto 12px;
  }
  @keyframes spin{to{transform:rotate(360deg)}}

  @media(max-width:768px){
    .be-page{padding:10px;padding-bottom:120px}
    .be-hero{padding:16px}
    .be-cta{padding:14px;bottom:10px}
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

function dateOnly(v) {
  if (!v) return null;
  // Handle ISO strings with time component
  if (typeof v === "string" && v.includes("T")) return v.split("T")[0];
  return String(v).slice(0, 10);
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

  const [allCerts, setAllCerts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errTxt,   setErrTxt]   = useState("");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selClient,   setSelClient]   = useState("ALL");
  const [selInspDate, setSelInspDate] = useState("");   // inspection_date filter
  const [selCreated,  setSelCreated]  = useState("");   // created_at date filter (optional)

  const [searching, setSearching] = useState(false);
  const [preview,   setPreview]   = useState(null); // null = not searched yet

  // Load ALL certs once — we use them to populate filter dropdowns
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("certificates")
        .select([
          "id","certificate_number","client_name","company",
          "equipment_type","equipment_description","asset_name","asset_tag",
          "inspection_date","issue_date","expiry_date",
          "created_at",          // ← needed for created date filter
          "result",
          "folder_id","folder_name","folder_position",
        ].join(","))
        .order("created_at", { ascending: false });

      if (error) { setErrTxt(error.message); setLoading(false); return; }

      const cleaned = (data || []).map(r => ({
        ...r,
        result:                normalizeResult(r.result),
        client_name:           r.client_name || r.company || "UNASSIGNED",
        equipment_description: r.equipment_description || r.asset_name || r.asset_tag || "UNNAMED",
        _inspDate:             dateOnly(r.inspection_date || r.issue_date),
        _createdDate:          dateOnly(r.created_at),
      }));

      setAllCerts(cleaned);
      setLoading(false);
    })();
  }, []);

  // ── Dropdown option builders — each cascades on what's already selected ───

  const clientOpts = useMemo(() => {
    const set = new Set(allCerts.map(c => c.client_name).filter(Boolean));
    return [...set].sort();
  }, [allCerts]);

  // Inspection dates available for the selected client
  const inspDateOpts = useMemo(() => {
    const src = selClient === "ALL"
      ? allCerts
      : allCerts.filter(c => c.client_name === selClient);
    const set = new Set(src.map(c => c._inspDate).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [allCerts, selClient]);

  // Created dates available for selected client + inspection date
  const createdDateOpts = useMemo(() => {
    let src = selClient === "ALL" ? allCerts : allCerts.filter(c => c.client_name === selClient);
    if (selInspDate) src = src.filter(c => c._inspDate === selInspDate);
    const set = new Set(src.map(c => c._createdDate).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [allCerts, selClient, selInspDate]);

  // ── Reset downstream filters when parent changes ──────────────────────────
  function handleClientChange(val) {
    setSelClient(val);
    setSelInspDate("");
    setSelCreated("");
    setPreview(null);
  }
  function handleInspDateChange(val) {
    setSelInspDate(val);
    setSelCreated("");
    setPreview(null);
  }
  function handleCreatedChange(val) {
    setSelCreated(val);
    setPreview(null);
  }
  function clearAllFilters() {
    setSelClient("ALL");
    setSelInspDate("");
    setSelCreated("");
    setPreview(null);
  }

  // ── Active filter summary for the info strip ─────────────────────────────
  const activeFilters = useMemo(() => {
    const f = [];
    if (selClient && selClient !== "ALL") f.push({ label: "Client", value: selClient });
    if (selInspDate) f.push({ label: "Inspected", value: formatDate(selInspDate) });
    if (selCreated)  f.push({ label: "Created",   value: formatDate(selCreated) });
    return f;
  }, [selClient, selInspDate, selCreated]);

  // ── Preview — client required, at least one date filter required ──────────
  const canPreview = selClient !== "ALL" && (!!selInspDate || !!selCreated);

  async function handlePreview() {
    if (!canPreview) return;
    setSearching(true);
    setPreview(null);

    try {
      // Build the Supabase query — filter by client on the server
      let query = supabase
        .from("certificates")
        .select([
          "id","certificate_number","client_name","company",
          "equipment_type","equipment_description","asset_name","asset_tag",
          "inspection_date","issue_date","expiry_date",
          "created_at",
          "result",
          "folder_id","folder_name","folder_position",
        ].join(","))
        .or(`client_name.eq.${selClient},company.eq.${selClient}`)
        .order("folder_position", { ascending: true });

      // Apply created_at filter server-side when set (fast index scan)
      if (selCreated) {
        // created_at is a timestamptz — filter the full day
        query = query
          .gte("created_at", `${selCreated}T00:00:00.000Z`)
          .lte("created_at", `${selCreated}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Client-side: apply inspection date filter and normalise
      let matched = (data || []).map(r => ({
        ...r,
        result:                normalizeResult(r.result),
        client_name:           r.client_name || r.company || "UNASSIGNED",
        equipment_description: r.equipment_description || r.asset_name || r.asset_tag || "UNNAMED",
        _inspDate:             dateOnly(r.inspection_date || r.issue_date),
        _createdDate:          dateOnly(r.created_at),
      }));

      if (selInspDate) {
        matched = matched.filter(r => r._inspDate === selInspDate);
      }

      setPreview(matched);
    } catch (e) {
      setErrTxt(e.message);
    } finally {
      setSearching(false);
    }
  }

  function handleDownload() {
    if (!preview || preview.length === 0) return;
    const ids = preview.map(c => c.id);
    const params = new URLSearchParams({ ids: ids.join(",") });
    router.push(`/bulk-print?${params.toString()}`);
  }

  const canDownload = preview && preview.length > 0;

  return (
    <AppLayout title="Bulk Export">
      <style>{CSS}</style>
      <div className="be-page">
        <div className="be-wrap">

          {/* HERO */}
          <div className="be-hero">
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:4, height:20, borderRadius:2, background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`, flexShrink:0 }}/>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent }}>Certificate Management · ISO 9001</span>
            </div>
            <h1 style={{ margin:0, fontSize:"clamp(18px,3vw,26px)", fontWeight:900, letterSpacing:"-0.02em" }}>Bulk Export</h1>
            <p style={{ margin:"6px 0 0", color:T.textDim, fontSize:13 }}>
              Filter by client, inspection date, and/or date created to find and export exactly the certificates you need.
            </p>
          </div>

          {errTxt && (
            <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:600, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>⚠ {errTxt}</span>
              <button className="be-btn-clear" onClick={() => setErrTxt("")}>✕</button>
            </div>
          )}

          {/* FILTERS */}
          <div style={{ background:"rgba(13,22,38,0.80)", border:`1px solid ${T.border}`, borderRadius:16, padding:20, backdropFilter:"blur(20px)" }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:T.textDim, marginBottom:14 }}>
              Filter Certificates
            </div>

            <div className="be-filters" style={{ padding:0, border:"none", borderRadius:0, background:"none", backdropFilter:"none" }}>

              {/* Client — REQUIRED */}
              <div className="be-field">
                <label>
                  Client
                  <span className="be-req">*</span>
                </label>
                <select
                  className={`be-input${selClient !== "ALL" ? " active" : ""}`}
                  value={selClient}
                  disabled={loading}
                  onChange={e => handleClientChange(e.target.value)}
                >
                  <option value="ALL">— Select a client —</option>
                  {clientOpts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Inspection Date — REQUIRED (unless created date set) */}
              <div className="be-field">
                <label>
                  Inspection Date
                  <span className="be-req" style={{ color: selCreated ? T.textDim : T.red }}>
                    {selCreated ? "" : "*"}
                  </span>
                  {selCreated && <span className="be-opt">(optional)</span>}
                </label>
                <select
                  className={`be-input${selInspDate ? " active" : ""}`}
                  value={selInspDate}
                  disabled={loading || selClient === "ALL"}
                  onChange={e => handleInspDateChange(e.target.value)}
                >
                  <option value="">— All inspection dates —</option>
                  {inspDateOpts.map(d => (
                    <option key={d} value={d}>{formatDate(d)}</option>
                  ))}
                </select>
              </div>

              {/* Created Date — OPTIONAL extra filter */}
              <div className="be-field">
                <label>
                  Date Created
                  <span className="be-opt">(optional)</span>
                </label>
                <select
                  className={`be-input${selCreated ? " active" : ""}`}
                  value={selCreated}
                  disabled={loading || selClient === "ALL"}
                  onChange={e => handleCreatedChange(e.target.value)}
                >
                  <option value="">— Any creation date —</option>
                  {createdDateOpts.map(d => (
                    <option key={d} value={d}>{formatDate(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter summary + clear */}
            {activeFilters.length > 0 && (
              <div className="be-filter-summary">
                <span>Active filters:</span>
                {activeFilters.map(f => (
                  <span key={f.label} className="be-active-pill">
                    <span style={{ color:T.textDim, fontWeight:600 }}>{f.label}:</span>
                    {f.value}
                  </span>
                ))}
                <button className="be-btn-clear" onClick={clearAllFilters}>
                  Clear all ✕
                </button>
              </div>
            )}

            {/* Requirement hint */}
            {selClient === "ALL" && (
              <div style={{ marginTop:12, fontSize:11, color:T.textDim }}>
                ← Select a client to begin
              </div>
            )}
            {selClient !== "ALL" && !selInspDate && !selCreated && (
              <div style={{ marginTop:12, fontSize:11, color:T.amber }}>
                ⚠ Select at least one date filter (Inspection Date or Date Created) to preview
              </div>
            )}
          </div>

          {/* PREVIEW BUTTON */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, alignItems:"center" }}>
            {preview !== null && (
              <span style={{ fontSize:12, color:T.textDim }}>
                {preview.length} result{preview.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              className="be-btn be-btn-primary"
              disabled={!canPreview || searching || loading}
              onClick={handlePreview}
            >
              {searching ? (
                <>
                  <span style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(0,16,24,0.3)", borderTopColor:"#001018", animation:"spin 0.8s linear infinite", display:"inline-block" }}/>
                  Searching…
                </>
              ) : "🔍 Preview Certificates"}
            </button>
          </div>

          {/* PREVIEW PANEL */}
          {preview !== null && (
            <div className="be-preview">
              <div className="be-preview-head">
                <div>
                  <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:T.textDim, marginBottom:4 }}>Preview Results</div>
                  <div style={{ fontSize:14, fontWeight:800 }}>
                    {selClient}
                    {selInspDate ? ` · Inspected ${formatDate(selInspDate)}` : ""}
                    {selCreated  ? ` · Created ${formatDate(selCreated)}`    : ""}
                  </div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:3 }}>
                    {activeFilters.map(f => `${f.label}: ${f.value}`).join(" · ")}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color: preview.length > 0 ? T.green : T.textDim }}>
                    {preview.length} certificate{preview.length !== 1 ? "s" : ""} found
                  </span>
                  {preview.length > 0 && (
                    <span style={{ padding:"3px 10px", borderRadius:99, background:T.greenDim, border:`1px solid ${T.greenBrd}`, color:T.green, fontSize:10, fontWeight:800 }}>
                      Ready to export
                    </span>
                  )}
                </div>
              </div>

              {preview.length === 0 ? (
                <div className="be-empty">
                  <div style={{ fontSize:28, opacity:0.3, marginBottom:10 }}>📄</div>
                  <div style={{ fontSize:14, fontWeight:800, marginBottom:6 }}>No certificates found</div>
                  <div style={{ fontSize:12, color:T.textDim, lineHeight:1.6 }}>
                    No records match your filters.
                    {selInspDate && selCreated && (
                      <><br/>Try removing the <strong style={{ color:T.textMid }}>Date Created</strong> filter — the inspection may have been created on a different day.</>
                    )}
                    {!selInspDate && selCreated && (
                      <><br/>Try also selecting an <strong style={{ color:T.textMid }}>Inspection Date</strong> to narrow results.</>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {(() => {
                    // Group by folder for display
                    const folders    = {};
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
                    for (const c of standalone) rows.push({ type:"single", cert:c });
                    for (const grp of Object.values(folders)) {
                      const sorted = [...grp].sort((a,b) => (a.folder_position||99) - (b.folder_position||99));
                      rows.push({ type:"folder", certs:sorted });
                    }

                    return rows.map((row, ri) => {
                      if (row.type === "single") {
                        const c = row.cert;
                        const r = rc(c.result);
                        return (
                          <div key={c.id} className="be-cert-row">
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:700, color:T.accent }}>
                                  {c.certificate_number || "—"}
                                </span>
                                <span className="be-badge" style={{ background:r.bg, color:r.color, border:`1px solid ${r.brd}` }}>{r.label}</span>
                                {c.equipment_type && (
                                  <span style={{ fontSize:10, color:T.textDim }}>{c.equipment_type}</span>
                                )}
                              </div>
                              <div style={{ fontSize:12, color:T.textMid, marginTop:3 }}>
                                {c.equipment_description}
                              </div>
                            </div>
                            <div style={{ fontSize:11, color:T.textDim, flexShrink:0, textAlign:"right", lineHeight:1.7 }}>
                              <div>Inspected: <span style={{ color:T.textMid }}>{formatDate(c._inspDate)}</span></div>
                              <div>Created: <span style={{ color:T.textMid }}>{formatDate(c._createdDate)}</span></div>
                              <div>Expires: {formatDate(c.expiry_date)}</div>
                            </div>
                          </div>
                        );
                      }

                      // Folder group
                      const { certs } = row;
                      return (
                        <div key={`folder-${certs[0].folder_id}`} style={{ borderBottom:`1px solid rgba(148,163,184,0.08)` }}>
                          <div style={{ padding:"10px 18px 6px", display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:14 }}>📁</span>
                            <span style={{ fontSize:11, fontWeight:800, color:T.purple }}>{certs[0].folder_name || "Linked Group"}</span>
                            <span style={{ fontSize:10, color:T.textDim }}>({certs.length} certificates)</span>
                          </div>
                          {certs.map((c, fi) => {
                            const r = rc(c.result);
                            return (
                              <div key={c.id} className="be-cert-row" style={{ paddingLeft:36, borderBottom: fi < certs.length - 1 ? `1px dashed rgba(148,163,184,0.08)` : "none" }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                    <span style={{ color:T.purple, fontSize:10 }}>{"└─"}</span>
                                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:700, color:T.accent }}>{c.certificate_number || "—"}</span>
                                    <span className="be-badge" style={{ background:r.bg, color:r.color, border:`1px solid ${r.brd}` }}>{r.label}</span>
                                  </div>
                                  <div style={{ fontSize:12, color:T.textMid, marginTop:3, paddingLeft:22 }}>
                                    {c.equipment_description} · <span style={{ color:T.textDim }}>{c.equipment_type}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize:11, color:T.textDim, flexShrink:0, textAlign:"right" }}>
                                  <div>Inspected: {formatDate(c._inspDate)}</div>
                                  <div>Created: {formatDate(c._createdDate)}</div>
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

          {/* CTA BAR — sticky bottom */}
          {canDownload && (
            <div className="be-cta">
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800 }}>
                  {preview.length} certificate{preview.length !== 1 ? "s" : ""} ready to export
                </div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:3, display:"flex", gap:8, flexWrap:"wrap" }}>
                  {activeFilters.map(f => (
                    <span key={f.label} style={{ display:"inline-flex", gap:4 }}>
                      <span style={{ color:T.textDim }}>{f.label}:</span>
                      <span style={{ color:T.textMid, fontWeight:700 }}>{f.value}</span>
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="be-btn be-btn-primary"
                onClick={handleDownload}
              >
                ⬇ Export &amp; Print All
              </button>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
