// src/app/ncr/new/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  @keyframes spin{to{transform:rotate(360deg)}}

  .nc-layout{display:grid;grid-template-columns:1.3fr 0.7fr;gap:16px;align-items:start}
  .nc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}

  @media(max-width:900px){
    .nc-layout{grid-template-columns:1fr}
    .nc-sidebar{order:-1}
  }
  @media(max-width:600px){
    .nc-page{padding:10px!important}
    .nc-grid2{grid-template-columns:1fr}
    .nc-hdr{flex-direction:column!important;gap:10px!important}
    .nc-btn-row{flex-direction:column}
    .nc-btn-row button{width:100%}
  }
`;

const IS = {
  width:"100%",padding:"10px 13px",borderRadius:9,
  border:"1px solid rgba(148,163,184,0.12)",
  background:"rgba(18,30,50,0.70)",color:"#f0f6ff",
  fontSize:13,fontWeight:500,outline:"none",
  fontFamily:"'IBM Plex Sans',sans-serif",
  WebkitAppearance:"none",appearance:"none",
  minHeight:44,
};
const LS = {
  display:"block",fontSize:10,fontWeight:700,
  letterSpacing:"0.08em",textTransform:"uppercase",
  color:"rgba(240,246,255,0.45)",marginBottom:6,
};

function nz(v, fb = "") {
  if (v === null || v === undefined) return fb;
  return String(v).trim() || fb;
}
function normalizeResult(v) { return nz(v).toUpperCase().replace(/\s+/g, "_"); }
function resultLabel(v) {
  const x = normalizeResult(v);
  if (x === "FAIL")            return "Fail";
  if (x === "REPAIR_REQUIRED") return "Repair Required";
  if (x === "OUT_OF_SERVICE")  return "Out of Service";
  if (x === "CONDITIONAL")     return "Conditional";
  if (x === "PASS")            return "Pass";
  return x || "Unknown";
}
function defaultSeverity(r) {
  const x = normalizeResult(r);
  if (x === "OUT_OF_SERVICE")                  return "critical";
  if (x === "FAIL" || x === "REPAIR_REQUIRED") return "major";
  if (x === "CONDITIONAL")                     return "minor";
  return "minor";
}
function defaultDue(s) {
  const d = new Date();
  d.setDate(d.getDate() + (s === "critical" ? 7 : s === "major" ? 14 : 30));
  return d.toISOString().slice(0, 10);
}
function genNcrNum() {
  const n = new Date();
  const p = v => String(v).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NCR-${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}-${rand}`;
}
function buildDesc(src) {
  return `${resultLabel(src.result)} detected from certificate ${nz(src.certificate_number, "—")} for ${nz(src.equipment_description || src.asset_name || src.asset_tag, "equipment")}.`;
}
function buildDetails(src) {
  return [
    "NCR created from certificate.",
    `Cert: ${nz(src.certificate_number, "—")}`,
    `Client: ${nz(src.client_name, "—")}`,
    `Asset Tag: ${nz(src.asset_tag, "—")}`,
    `Asset Name: ${nz(src.asset_name, "—")}`,
    `Serial No.: ${nz(src.serial_number, "—")}`,
    `Fleet No.: ${nz(src.fleet_number, "—")}`,
    `Reg No.: ${nz(src.registration_number, "—")}`,
    `Equipment: ${nz(src.equipment_description, "—")}`,
    `Type: ${nz(src.equipment_type, "—")}`,
    `Result: ${resultLabel(src.result)}`,
    `Issued: ${nz(src.issue_date, "—")}`,
    `Expiry: ${nz(src.expiry_date, "—")}`,
  ].join("\n");
}

/* ─────────────────────────────────────────────────────────────────────────────
   fetchAssets
   Tries to auto-match the certificate to an asset using a priority chain:
   1. serial + client + type  (tightest)
   2. serial + client
   3. serial only
   4. fleet_number + client
   5. fleet_number only
   6. registration_number + client
   7. registration_number only
   8. asset_tag
   9. fuzzy equipment_description / asset_name
   Fallback: no match — user picks manually from full list
───────────────────────────────────────────────────────────────────────────── */
async function fetchAssets(src) {
  const sel = [
    "id","asset_tag","asset_name","asset_type",
    "serial_number","fleet_number","registration_number",
    "client_id","clients(id,company_name)",
  ].join(",");

  // Resolve client_id from client_name
  let clientId = null;
  if (nz(src.client_name)) {
    const { data: cl } = await supabase
      .from("clients")
      .select("id")
      .eq("company_name", src.client_name)
      .maybeSingle();
    clientId = cl?.id || null;
  }

  // Full asset list for manual dropdown
  const { data: allAssets } = await supabase
    .from("assets")
    .select(sel)
    .order("created_at", { ascending: false })
    .limit(200);
  const all = allAssets || [];

  // Helper — run a filtered query and return match if found
  async function tryMatch(filters, label) {
    let q = supabase.from("assets").select(sel);
    for (const [col, val] of Object.entries(filters)) {
      if (val) q = q.eq(col, val);
    }
    const { data } = await q.limit(5);
    if (!data?.length) return null;
    // Single match — unambiguous
    if (data.length === 1) return { autoMatch: data[0], matchedBy: label, allAssets: all };
    // Multiple hits — if client is locked in, take first
    if (filters.client_id) return { autoMatch: data[0], matchedBy: label, allAssets: all };
    return null;
  }

  // ── 1. Serial + client + type ─────────────────────────────────────────────
  if (nz(src.serial_number) && clientId && nz(src.equipment_type)) {
    const m = await tryMatch(
      { serial_number: src.serial_number, client_id: clientId, asset_type: src.equipment_type },
      "serial + client + type"
    );
    if (m) return m;
  }

  // ── 2. Serial + client ────────────────────────────────────────────────────
  if (nz(src.serial_number) && clientId) {
    const m = await tryMatch(
      { serial_number: src.serial_number, client_id: clientId },
      "serial + client"
    );
    if (m) return m;
  }

  // ── 3. Serial only ────────────────────────────────────────────────────────
  if (nz(src.serial_number)) {
    const m = await tryMatch({ serial_number: src.serial_number }, "serial number");
    if (m) return m;
  }

  // ── 4. Fleet number + client ──────────────────────────────────────────────
  if (nz(src.fleet_number) && clientId) {
    const m = await tryMatch(
      { fleet_number: src.fleet_number, client_id: clientId },
      "fleet number + client"
    );
    if (m) return m;
  }

  // ── 5. Fleet number only ──────────────────────────────────────────────────
  if (nz(src.fleet_number)) {
    const m = await tryMatch({ fleet_number: src.fleet_number }, "fleet number");
    if (m) return m;
  }

  // ── 6. Registration number + client ───────────────────────────────────────
  if (nz(src.registration_number) && clientId) {
    const m = await tryMatch(
      { registration_number: src.registration_number, client_id: clientId },
      "registration + client"
    );
    if (m) return m;
  }

  // ── 7. Registration number only ───────────────────────────────────────────
  if (nz(src.registration_number)) {
    const m = await tryMatch(
      { registration_number: src.registration_number },
      "registration number"
    );
    if (m) return m;
  }

  // ── 8. Asset tag ──────────────────────────────────────────────────────────
  if (nz(src.asset_tag)) {
    const m = await tryMatch({ asset_tag: src.asset_tag }, "asset tag");
    if (m) return m;
  }

  // ── 9. Fuzzy name match ───────────────────────────────────────────────────
  const fuzzyTerms = [src.equipment_description, src.asset_name].filter(Boolean);
  for (const term of fuzzyTerms) {
    if (term.length < 3) continue;
    const { data } = await supabase
      .from("assets")
      .select(sel)
      .ilike("asset_name", `%${term}%`)
      .limit(10);
    if (data?.length === 1) {
      return { autoMatch: data[0], matchedBy: "equipment name", allAssets: all };
    }
    if (data?.length > 1 && clientId) {
      const clientMatch = data.find(a => a.client_id === clientId);
      if (clientMatch) return { autoMatch: clientMatch, matchedBy: "equipment name + client", allAssets: all };
    }
  }

  // ── Fallback: no match ────────────────────────────────────────────────────
  return { autoMatch: null, matchedBy: null, allAssets: all };
}

/* ── UI helpers ─────────────────────────────────────────────────────────────── */
function Sec({ icon, title, children, brd }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${brd || T.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{title}</div>
      </div>
      {children}
    </div>
  );
}
function F({ label, children }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={LS}>{label}</span>{children}</label>;
}
function InfoRow({ label, value, mono = false, accent = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
      <span style={{ color: T.textDim, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ color: accent ? T.accent : T.textMid, fontWeight: 600, textAlign: "right", wordBreak: "break-word", ...(mono ? { fontFamily: "'IBM Plex Mono',monospace" } : {}) }}>
        {value || "—"}
      </span>
    </div>
  );
}

/* ── Main form ──────────────────────────────────────────────────────────────── */
function NCRCreateInner() {
  const router = useRouter();
  const sp     = useSearchParams();

  // All fields from certificate URL params — including fleet + registration
  const src = useMemo(() => ({
    source:               nz(sp.get("source")),
    certificate_id:       nz(sp.get("certificate_id")),
    certificate_number:   nz(sp.get("certificate_number")),
    inspection_number:    nz(sp.get("inspection_number")),
    asset_tag:            nz(sp.get("asset_tag")),
    asset_name:           nz(sp.get("asset_name")),
    serial_number:        nz(sp.get("serial_number")),
    fleet_number:         nz(sp.get("fleet_number")),         // ← NEW
    registration_number:  nz(sp.get("registration_number")),  // ← NEW
    equipment_description:nz(sp.get("equipment_description")),
    equipment_type:       nz(sp.get("equipment_type")),
    client_name:          nz(sp.get("client_name")),
    result:               nz(sp.get("result")),
    issue_date:           nz(sp.get("issue_date")),
    expiry_date:          nz(sp.get("expiry_date")),
  }), [sp]);

  const initSev = defaultSeverity(src.result);

  const [ncrNum,      setNcrNum]      = useState(genNcrNum());
  const [assetId,     setAssetId]     = useState("");
  const [severity,    setSeverity]    = useState(initSev);
  const [status,      setStatus]      = useState("open");
  const [desc,        setDesc]        = useState(buildDesc(src));
  const [details,     setDetails]     = useState(buildDetails(src));
  const [dueDate,     setDueDate]     = useState(defaultDue(initSev));
  const [assets,      setAssets]      = useState([]);
  const [autoMatched, setAutoMatched] = useState(false);
  const [matchedBy,   setMatchedBy]   = useState(null);
  const [overriding,  setOverriding]  = useState(false);
  const [loadingA,    setLoadingA]    = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [assetErr,    setAssetErr]    = useState("");

  useEffect(() => {
    let ig = false;
    async function load() {
      setLoadingA(true); setAssetErr("");
      try {
        const { autoMatch, matchedBy: mb, allAssets } = await fetchAssets(src);
        if (!ig) {
          setAssets(allAssets);
          if (autoMatch) {
            setAssetId(autoMatch.id);
            setAutoMatched(true);
            setMatchedBy(mb);
            setOverriding(false);
          } else {
            setAutoMatched(false);
            setMatchedBy(null);
            if (allAssets.length) setAssetId(allAssets[0].id);
          }
        }
      } catch (e) {
        if (!ig) { setAssetErr(e?.message || "Failed to load equipment."); setAssets([]); }
      } finally {
        if (!ig) setLoadingA(false);
      }
    }
    load();
    return () => { ig = true; };
  }, [src]);

  useEffect(() => {
    const s = defaultSeverity(src.result);
    setSeverity(s); setDueDate(defaultDue(s));
    setDesc(buildDesc(src)); setDetails(buildDetails(src));
  }, [src]);

  const selectedAsset = useMemo(
    () => assets.find(a => String(a.id) === String(assetId)) || null,
    [assets, assetId]
  );

  const severityColor = severity === "critical" ? T.red    : severity === "major" ? T.amber    : T.green;
  const severityBg    = severity === "critical" ? T.redDim : severity === "major" ? T.amberDim : T.greenDim;
  const severityBrd   = severity === "critical" ? T.redBrd : severity === "major" ? T.amberBrd : T.greenBrd;

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (!assetId)     { setError("Select equipment first.");  setSaving(false); return; }
      if (!desc.trim()) { setError("Description is required."); setSaving(false); return; }
      const payload = {
        ncr_number:  ncrNum.trim() || genNcrNum(),
        title:       desc.trim().slice(0, 120),
        asset_id:    assetId,
        severity,    status,
        description: desc.trim(),
        details:     details.trim(),
        due_date:    dueDate || null,
      };
      const { data, error: ie } = await supabase.from("ncrs").insert(payload).select("id").single();
      if (ie) throw ie;
      router.push(`/ncr/${data.id}`);
    } catch (e) {
      setError(e?.message || "Failed to create NCR.");
      setSaving(false);
    }
  }

  const equipBrd = loadingA ? T.border
    : autoMatched && !overriding ? T.greenBrd
    : !autoMatched ? T.amberBrd
    : T.border;

  return (
    <AppLayout title="Create NCR">
      <style>{CSS}</style>
      <div className="nc-page" style={{ minHeight: "100vh", background: `radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>

          {/* HEADER */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "18px 20px", backdropFilter: "blur(20px)" }}>
            <div className="nc-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent, marginBottom: 7 }}>Non-Conformance Report</div>
                <h1 style={{ margin: 0, fontSize: "clamp(18px,3vw,24px)", fontWeight: 900, letterSpacing: "-0.02em" }}>Create NCR</h1>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <p style={{ margin: 0, color: T.textDim, fontSize: 12 }}>Auto-filled from certificate data where available</p>
                  {src.certificate_number && (
                    <span style={{ padding: "3px 10px", borderRadius: 99, background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBrd}`, fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>
                      {src.certificate_number}
                    </span>
                  )}
                  {src.result && (
                    <span style={{ padding: "3px 10px", borderRadius: 99, background: severityBg, color: severityColor, border: `1px solid ${severityBrd}`, fontSize: 11, fontWeight: 800 }}>
                      {resultLabel(src.result)}
                    </span>
                  )}
                </div>
              </div>
              <Link href="/ncr" style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
                ← Back to NCRs
              </Link>
            </div>
          </div>

          {error && (
            <div style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontSize: 13, fontWeight: 700 }}>⚠ {error}</div>
          )}

          <div className="nc-layout">
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 14 }}>

              {/* NCR INFORMATION */}
              <Sec icon="📋" title="NCR Information">
                <div className="nc-grid2">
                  <F label="NCR Number">
                    <input value={ncrNum} onChange={e => setNcrNum(e.target.value)}
                      style={{ ...IS, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}
                      placeholder="NCR Number"/>
                  </F>
                  <F label="Severity">
                    <select value={severity} onChange={e => { setSeverity(e.target.value); setDueDate(defaultDue(e.target.value)); }}
                      style={{ ...IS, color: severityColor }}>
                      <option value="critical">🔴 Critical</option>
                      <option value="major">🟡 Major</option>
                      <option value="minor">🟢 Minor</option>
                    </select>
                  </F>
                  <F label="Status">
                    <select value={status} onChange={e => setStatus(e.target.value)} style={IS}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </F>
                  <F label="Due Date">
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={IS}/>
                  </F>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <F label="Description">
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                      style={{ ...IS, resize: "vertical", minHeight: 80 }} placeholder="NCR description"/>
                  </F>
                  <F label="Details">
                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={8}
                      style={{ ...IS, resize: "vertical", minHeight: 160 }} placeholder="Full NCR details"/>
                  </F>
                </div>
              </Sec>

              {/* EQUIPMENT LINK */}
              <Sec icon="⚙️" title="Equipment Link" brd={equipBrd}>
                {loadingA ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.textDim, fontSize: 12, padding: "8px 0" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${T.accentBrd}`, borderTopColor: T.accent, animation: "spin .7s linear infinite", flexShrink: 0 }}/>
                    Detecting equipment from certificate…
                  </div>
                ) : assetErr ? (
                  <div style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontSize: 12 }}>{assetErr}</div>
                ) : (
                  <>
                    {/* Auto-detected banner */}
                    {autoMatched && !overriding && selectedAsset && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", borderRadius: 10, background: T.greenDim, border: `1px solid ${T.greenBrd}`, marginBottom: 14, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ fontSize: 18 }}>✅</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: T.green }}>Equipment auto-detected</div>
                            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                              Matched by <strong style={{ color: T.textMid }}>{matchedBy}</strong>
                            </div>
                          </div>
                        </div>
                        <button type="button" onClick={() => setOverriding(true)}
                          style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" }}>
                          Change
                        </button>
                      </div>
                    )}

                    {/* No auto-match warning */}
                    {!autoMatched && (
                      <div style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.amberBrd}`, background: T.amberDim, color: T.amber, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                        ⚠ Could not auto-detect equipment — tried serial, fleet number, registration and asset tag.
                        Please select manually or{" "}
                        <Link href="/equipment/register" style={{ color: T.amber, fontWeight: 800 }}>register new equipment →</Link>
                      </div>
                    )}

                    {/* Manual selector */}
                    {(!autoMatched || overriding) && (
                      <div style={{ marginBottom: 14 }}>
                        <F label={overriding ? "Override Equipment" : "Select Equipment"}>
                          <select value={assetId} onChange={e => setAssetId(e.target.value)} style={IS}>
                            <option value="">— Select equipment —</option>
                            {assets.map(a => (
                              <option key={a.id} value={a.id}>
                                {nz(a.asset_tag, "NO-TAG")} · {nz(a.asset_name, "Unnamed")} · {nz(a.clients?.company_name, "No Client")}
                              </option>
                            ))}
                          </select>
                        </F>
                        {overriding && (
                          <button type="button" onClick={() => setOverriding(false)}
                            style={{ marginTop: 8, padding: "5px 11px", borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.textDim, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" }}>
                            ← Cancel override
                          </button>
                        )}
                      </div>
                    )}

                    {/* Selected asset info */}
                    {selectedAsset ? (
                      <div style={{ display: "grid", gap: 0, padding: "4px 0" }}>
                        <InfoRow label="Asset Tag"        value={selectedAsset.asset_tag}             mono />
                        <InfoRow label="Asset Name"       value={selectedAsset.asset_name} />
                        <InfoRow label="Asset Type"       value={selectedAsset.asset_type} />
                        <InfoRow label="Serial No."       value={selectedAsset.serial_number}         mono />
                        <InfoRow label="Fleet No."        value={selectedAsset.fleet_number}          mono />
                        <InfoRow label="Registration No." value={selectedAsset.registration_number}   mono />
                        <InfoRow label="Client"           value={selectedAsset.clients?.company_name} />
                      </div>
                    ) : (
                      <div style={{ padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontSize: 12, fontWeight: 600 }}>
                        No equipment selected — NCR cannot be saved without linking equipment.
                      </div>
                    )}
                  </>
                )}
              </Sec>

              {/* SUBMIT */}
              <div className="nc-btn-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 8 }}>
                <button type="submit" disabled={saving || loadingA}
                  style={{ padding: "12px 24px", borderRadius: 11, border: "none", background: (saving || loadingA) ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#22d3ee,#60a5fa)", color: (saving || loadingA) ? "rgba(240,246,255,0.4)" : "#001018", fontWeight: 900, fontSize: 14, cursor: (saving || loadingA) ? "not-allowed" : "pointer", fontFamily: "'IBM Plex Sans',sans-serif", flex: 1, maxWidth: 240 }}>
                  {saving ? "Creating…" : loadingA ? "Detecting equipment…" : "Create NCR"}
                </button>
                <button type="button" onClick={() => router.push("/ncr")} disabled={saving}
                  style={{ padding: "12px 18px", borderRadius: 11, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                  Cancel
                </button>
              </div>
            </form>

            {/* SIDEBAR */}
            <div className="nc-sidebar" style={{ display: "grid", gap: 14 }}>

              {/* Certificate source */}
              <Sec icon="📄" title="Certificate Source">
                <div style={{ display: "grid", gap: 0 }}>
                  <InfoRow label="Certificate No."  value={src.certificate_number}  mono accent />
                  <InfoRow label="Inspection No."   value={src.inspection_number} />
                  <InfoRow label="Result"           value={resultLabel(src.result)} />
                  <InfoRow label="Client"           value={src.client_name} />
                  <InfoRow label="Asset Tag"        value={src.asset_tag}            mono />
                  <InfoRow label="Serial No."       value={src.serial_number}        mono />
                  <InfoRow label="Fleet No."        value={src.fleet_number}         mono />
                  <InfoRow label="Reg No."          value={src.registration_number}  mono />
                  <InfoRow label="Asset Name"       value={src.asset_name} />
                  <InfoRow label="Equipment"        value={src.equipment_description} />
                  <InfoRow label="Type"             value={src.equipment_type} />
                  <InfoRow label="Issue Date"       value={src.issue_date} />
                  <InfoRow label="Expiry Date"      value={src.expiry_date} />
                </div>
                {src.certificate_id && (
                  <Link href={`/certificates/${encodeURIComponent(src.certificate_id)}`}
                    style={{ marginTop: 12, display: "inline-flex", padding: "9px 14px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>
                    Open Source Certificate →
                  </Link>
                )}
              </Sec>

              {/* Severity guide */}
              <Sec icon="🎯" title="Severity Guide">
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { level: "critical", color: T.red,   bg: T.redDim,   brd: T.redBrd,   label: "Critical", desc: "Immediate safety or operational risk. Due in 7 days." },
                    { level: "major",    color: T.amber, bg: T.amberDim, brd: T.amberBrd, label: "Major",    desc: "Significant non-conformance requiring prompt action. Due in 14 days." },
                    { level: "minor",    color: T.green, bg: T.greenDim, brd: T.greenBrd, label: "Minor",    desc: "Low-impact issue to monitor. Due in 30 days." },
                  ].map(({ level, color, bg, brd, label, desc }) => (
                    <div key={level}
                      onClick={() => { setSeverity(level); setDueDate(defaultDue(level)); }}
                      style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${severity === level ? brd : T.border}`, background: severity === level ? bg : "transparent", cursor: "pointer", transition: "all .15s", WebkitTapHighlightColor: "transparent" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: severity === level ? color : T.textMid, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </Sec>

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function NCRCreatePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#070e18", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,246,255,0.4)", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14 }}>
        Loading…
      </div>
    }>
      <NCRCreateInner />
    </Suspense>
  );
}
