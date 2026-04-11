// src/app/certificates/[id]/edit/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",blueDim:"rgba(96,165,250,0.10)",blueBrd:"rgba(96,165,250,0.25)",
};

const IS  = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:44, boxSizing:"border-box" };
const LS  = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, marginBottom:6 };

function normalizeId(v){ return Array.isArray(v) ? v[0] : v; }
function toDate(v){ if(!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); }

// ── Notes helpers ─────────────────────────────────────────────────────────────
// Safely parse notes — returns { _isJson, parsed } where parsed is the object
function parseNotesRaw(str) {
  if (!str) return { _isJson: false, pairs: [], json: {} };
  try {
    const p = JSON.parse(str);
    if (typeof p === "object" && p !== null) return { _isJson: true, pairs: [], json: p };
  } catch(e) {}
  // pipe-delimited fallback
  const pairs = str.split("|").map(part => {
    const idx = part.indexOf(":");
    if (idx < 0) return { key: part.trim(), value: "" };
    return { key: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
  }).filter(p => p.key);
  return { _isJson: false, pairs, json: {} };
}

function buildPipeNotes(pairs) {
  return pairs.filter(p => p.key && p.value).map(p => `${p.key}: ${p.value}`).join(" | ");
}

const emptyBoom = () => ({
  min_boom_length:"", max_boom_length:"", actual_boom_length:"", extended_boom_length:"",
  min_radius:"", max_radius:"", load_tested_at_radius:"",
  boom_angle:"", test_load:"",
  swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"",
  max_height:"", jib_fitted:"no",
  boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS",
  luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS",
  lmi_test:"PASS", anti_two_block:"PASS", notes:"",
});
const emptyBucket = () => ({
  platform_swl:"", platform_dimensions:"", platform_material:"", test_load_applied:"",
  platform_structure:"PASS", platform_floor:"PASS", guardrails:"PASS",
  gate_latch:"PASS", levelling_system:"PASS", emergency_lowering:"PASS",
  overload_device:"PASS", tilt_alarm:"PASS", notes:"",
});

function F({ label, children, span = 1 }) {
  return (
    <div style={{ gridColumn:`span ${span}` }}>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function ResultSel({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={IS}>
      <option value="PASS">Pass</option>
      <option value="FAIL">Fail</option>
      <option value="CONDITIONAL">Conditional</option>
      <option value="REPAIR_REQUIRED">Repair Required</option>
    </select>
  );
}

const CERT_TYPES = ["Certificate of Inspection","Load Test Certificate","Pressure Test Certificate","NDT Certificate","Thorough Examination Certificate"];
const RESULTS    = ["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL","UNKNOWN"];
const P_UNITS    = ["bar","kPa","MPa","psi"];

// Detect machine type from equipment_type string
function detectMachineKind(equipType) {
  const t = String(equipType||"").toLowerCase();
  if (/telehandler/.test(t)) return "telehandler";
  if (/cherry.picker|aerial.work|boom.lift/.test(t)) return "cherry_picker";
  if (/forklift|fork.lift/.test(t)) return "forklift";
  return null;
}

function CertificateEditInner() {
  const params = useParams();
  const router = useRouter();
  const id = normalizeId(params?.id);

  const [tab,         setTab]         = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [bundle,      setBundle]      = useState([]);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linking,     setLinking]     = useState(false);
  const [unlinking,   setUnlinking]   = useState(false);

  // Notes state — two modes
  const [notesIsJson, setNotesIsJson] = useState(false);  // true = JSON (machine wizard cert)
  const [notePairs,   setNotePairs]   = useState([]);     // pipe-delimited mode
  const [jsonNotes,   setJsonNotes]   = useState({});     // JSON mode — full object
  const [boom,        setBoom]        = useState(emptyBoom());
  const [bucket,      setBucket]      = useState(emptyBucket());

  const [form, setForm] = useState({
    certificate_number:"", certificate_type:"Certificate of Inspection",
    result:"PASS", status:"active",
    issue_date:"", inspection_date:"", expiry_date:"", next_inspection_due:"",
    inspection_number:"",
    equipment_type:"", equipment_description:"", asset_name:"", asset_tag:"",
    serial_number:"", fleet_number:"", registration_number:"",
    manufacturer:"", model:"", year_built:"", country_of_origin:"",
    location:"", client_name:"",
    swl:"", capacity_volume:"", working_pressure:"", design_pressure:"",
    test_pressure:"", pressure_unit:"", material:"", standard_code:"",
    lanyard_serial_no:"",
    inspector_name:"", inspector_id:"", inspection_body:"",
    legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
    defects_found:"", recommendations:"", comments:"",
    folder_id:"", folder_name:"", folder_position:"",
  });

  useEffect(() => { if (id) load(); }, [id]);
  useEffect(() => {
    const t = setTimeout(() => searchLink(linkSearch), 300);
    return () => clearTimeout(t);
  }, [linkSearch]);

  async function load() {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
    if (e || !data) { setError(e?.message || "Certificate not found."); setLoading(false); return; }

    setForm({
      certificate_number:    data.certificate_number   || "",
      certificate_type:      data.certificate_type     || "Certificate of Inspection",
      result:                data.result               || "PASS",
      status:                data.status               || "active",
      issue_date:            toDate(data.issue_date    || data.issued_at),
      inspection_date:       toDate(data.inspection_date || data.issue_date),
      expiry_date:           toDate(data.expiry_date   || data.valid_to),
      next_inspection_due:   toDate(data.next_inspection_due || data.next_inspection_date),
      inspection_number:     data.inspection_number    || data.inspection_no || "",
      equipment_type:        data.equipment_type       || data.asset_type || "",
      equipment_description: data.equipment_description|| data.asset_name || "",
      asset_name:            data.asset_name           || data.equipment_description || "",
      asset_tag:             data.asset_tag            || "",
      serial_number:         data.serial_number        || "",
      fleet_number:          data.fleet_number         || "",
      registration_number:   data.registration_number  || "",
      manufacturer:          data.manufacturer         || "",
      model:                 data.model                || "",
      year_built:            data.year_built           || "",
      country_of_origin:     data.country_of_origin    || "",
      location:              data.location             || "",
      client_name:           data.client_name          || data.company || "",
      swl:                   data.swl                  || "",
      capacity_volume:       data.capacity_volume      || "",
      working_pressure:      data.working_pressure     || "",
      design_pressure:       data.design_pressure      || "",
      test_pressure:         data.test_pressure        || "",
      pressure_unit:         data.pressure_unit        || "",
      material:              data.material             || "",
      standard_code:         data.standard_code        || "",
      lanyard_serial_no:     data.lanyard_serial_no    || "",
      inspector_name:        data.inspector_name       || "",
      inspector_id:          data.inspector_id         || data.inspector_id_number || "",
      inspection_body:       data.inspection_body      || "",
      legal_framework:       data.legal_framework      || "Mines, Quarries, Works and Machinery Act Cap 44:02",
      defects_found:         data.defects_found        || "",
      recommendations:       data.recommendations      || "",
      comments:              data.comments             || data.remarks || "",
      folder_id:             data.folder_id            || "",
      folder_name:           data.folder_name          || "",
      folder_position:       data.folder_position != null ? String(data.folder_position) : "",
    });

    // ── Parse notes intelligently ─────────────────────────────────────────────
    const { _isJson, pairs, json } = parseNotesRaw(data.notes || "");
    setNotesIsJson(_isJson);
    if (_isJson) {
      setJsonNotes(json);
      setBoom({ ...emptyBoom(), ...(json.boom || {}) });
      setBucket({ ...emptyBucket(), ...(json.bucket || {}) });
      setNotePairs([]); // not used in JSON mode
    } else {
      setNotePairs(pairs);
      setJsonNotes({});
      setBoom(emptyBoom());
      setBucket(emptyBucket());
    }

    if (data.folder_id) {
      const { data: linked } = await supabase.from("certificates")
        .select("id,certificate_number,equipment_description,equipment_type,folder_position")
        .eq("folder_id", data.folder_id).order("folder_position", { ascending: true });
      setBundle(linked || []);
    }
    setLoading(false);
  }

  const hc = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const ub = (k, v) => setBoom(p => ({ ...p, [k]: v }));
  const ubk = (k, v) => setBucket(p => ({ ...p, [k]: v }));
  const updatePair = (i, field, val) => setNotePairs(p => p.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const addPair    = () => setNotePairs(p => [...p, { key: "", value: "" }]);
  const removePair = i  => setNotePairs(p => p.filter((_, j) => j !== i));

  // Build the notes value to save
  function buildNotesForSave() {
    if (notesIsJson) {
      // Preserve entire JSON object, updating boom and bucket from state
      const updated = {
        ...jsonNotes,
        boom:   { ...boom },
        bucket: { ...bucket },
      };
      return JSON.stringify(updated);
    } else {
      return buildPipeNotes(notePairs) || null;
    }
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const { error: e } = await supabase.from("certificates").update({
        certificate_number:    form.certificate_number    || null,
        certificate_type:      form.certificate_type      || null,
        result:                form.result                || null,
        equipment_status:      form.result                || null,
        status:                form.status                || "active",
        issue_date:            form.issue_date            || null,
        inspection_date:       form.inspection_date       || null,
        expiry_date:           form.expiry_date           || null,
        next_inspection_due:   form.next_inspection_due   || null,
        next_inspection_date:  form.next_inspection_due   || null,
        inspection_number:     form.inspection_number     || null,
        equipment_type:        form.equipment_type        || null,
        equipment_description: form.equipment_description || null,
        asset_name:            form.asset_name            || null,
        asset_tag:             form.asset_tag             || null,
        serial_number:         form.serial_number         || null,
        fleet_number:          form.fleet_number          || null,
        registration_number:   form.registration_number   || null,
        manufacturer:          form.manufacturer          || null,
        model:                 form.model                 || null,
        year_built:            form.year_built            || null,
        country_of_origin:     form.country_of_origin     || null,
        location:              form.location              || null,
        client_name:           form.client_name           || null,
        swl:                   form.swl                   || null,
        capacity_volume:       form.capacity_volume       || null,
        working_pressure:      form.working_pressure      || null,
        design_pressure:       form.design_pressure       || null,
        test_pressure:         form.test_pressure         || null,
        pressure_unit:         form.pressure_unit         || null,
        material:              form.material              || null,
        standard_code:         form.standard_code         || null,
        lanyard_serial_no:     form.lanyard_serial_no     || null,
        inspector_name:        form.inspector_name        || null,
        inspector_id:          form.inspector_id          || null,
        inspector_id_number:   form.inspector_id          || null,
        inspection_body:       form.inspection_body       || null,
        legal_framework:       form.legal_framework       || null,
        defects_found:         form.defects_found         || null,
        recommendations:       form.recommendations       || null,
        comments:              form.comments              || null,
        remarks:               form.comments              || null,
        notes:                 buildNotesForSave(),
        folder_id:             form.folder_id             || null,
        folder_name:           form.folder_name           || null,
        folder_position:       form.folder_position ? Number(form.folder_position) : null,
      }).eq("id", id);
      if (e) throw e;
      setSuccess("Saved successfully.");
      setTimeout(() => router.push(`/certificates/${id}`), 900);
    } catch(e) {
      setError("Save failed: " + (e?.message || "Unknown error"));
    } finally { setSaving(false); }
  }

  async function searchLink(q) {
    if (!q || q.length < 2) { setLinkResults([]); return; }
    setLinkLoading(true);
    const { data } = await supabase.from("certificates")
      .select("id,certificate_number,equipment_description,equipment_type,client_name,folder_id")
      .or(`certificate_number.ilike.%${q}%,equipment_description.ilike.%${q}%,client_name.ilike.%${q}%`)
      .neq("id", id).is("folder_id", null).limit(8);
    setLinkResults(data || []);
    setLinkLoading(false);
  }

  async function handleLink(targetId) {
    setLinking(true);
    const folderId   = form.folder_id || crypto.randomUUID();
    const folderName = form.folder_name || `Folder-${form.certificate_number || id.slice(0,8)}`;
    await Promise.all([
      supabase.from("certificates").update({ folder_id: folderId, folder_name: folderName, folder_position: 1 }).eq("id", id),
      supabase.from("certificates").update({ folder_id: folderId, folder_name: folderName, folder_position: bundle.length + 2 }).eq("id", targetId),
    ]);
    setLinking(false); setLinkSearch(""); setLinkResults([]);
    await load(); setSuccess("Linked.");
  }

  async function handleUnlinkOne(targetId) {
    setUnlinking(true);
    const folderId = form.folder_id;
    await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", targetId);
    if (folderId) {
      const { data: rem } = await supabase.from("certificates").select("id").eq("folder_id", folderId);
      if (rem && rem.length === 1) {
        await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", rem[0].id);
      }
    }
    setUnlinking(false); await load();
  }

  const machineKind = detectMachineKind(form.equipment_type);
  const hasBoom     = machineKind === "telehandler" || machineKind === "cherry_picker";
  const hasBucket   = machineKind === "cherry_picker";
  const isLinked    = bundle.length > 0;

  // Build tabs dynamically
  const TABS = ["Certificate", "Equipment", "Technical", "Inspector", "Inspection Data"];
  if (hasBoom)   TABS.push("Boom");
  if (hasBucket) TABS.push("Platform");
  TABS.push("Folder");

  const SaveBtn = () => (
    <button type="button" onClick={handleSave} disabled={saving}
      style={{ padding:"12px 28px", borderRadius:11, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
      {saving ? "Saving…" : "💾 Save Changes"}
    </button>
  );

  return (
    <AppLayout title="Edit Certificate">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
        input:focus,select:focus,textarea:focus{border-color:${T.accent}!important;outline:none}
        textarea{resize:vertical}
        .ceg{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
        .ceg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ceg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
        .ce-tabs{display:flex;gap:0;border-bottom:1px solid ${T.border};margin-bottom:18px;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .ce-tab{padding:10px 16px;border:none;background:none;color:${T.textDim};font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;font-family:'IBM Plex Sans',sans-serif;min-height:44px;-webkit-tap-highlight-color:transparent}
        .ce-tab.on{color:${T.accent};border-bottom-color:${T.accent}}
        .ce-tab:hover:not(.on){color:${T.textMid}}
        .np-row{display:grid;grid-template-columns:1fr 1fr 36px;gap:8px;align-items:center}
        .sh{font-size:10px;font-weight:800;letter-spacing:0.10em;text-transform:uppercase;color:${T.textDim};margin:16px 0 8px;padding-bottom:5px;border-bottom:1px solid ${T.border}}
        @media(max-width:640px){.ceg{grid-template-columns:1fr!important}.ceg2{grid-template-columns:1fr!important}.ceg3{grid-template-columns:1fr 1fr!important}.np-row{grid-template-columns:1fr 1fr 36px}}
      `}</style>

      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, minHeight:"100vh" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gap:14 }}>

          {/* HEADER */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"16px 20px", backdropFilter:"blur(20px)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:6 }}>Edit Certificate</div>
                <h1 style={{ margin:"0 0 4px", fontSize:"clamp(17px,3vw,22px)", fontWeight:900 }}>{form.certificate_number || "Certificate"}</h1>
                <p style={{ margin:0, color:T.textDim, fontSize:12 }}>
                  {form.certificate_type}{form.equipment_type ? ` · ${form.equipment_type}` : ""}
                  {isLinked && <span style={{ marginLeft:10, color:T.purple }}>📁 {bundle.length} in folder</span>}
                  {notesIsJson && <span style={{ marginLeft:10, color:T.accent, fontSize:11, fontWeight:700 }}>● Machine Wizard Cert</span>}
                </p>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button type="button" onClick={() => router.push(`/certificates/${id}`)}
                  style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                  ← Back
                </button>
                <button type="button" onClick={() => window.open(`/certificates/print/${id}`, "_blank")}
                  style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                  🖨 Print
                </button>
                <SaveBtn/>
              </div>
            </div>
          </div>

          {error   && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`,   background:T.redDim,   color:T.red,   fontSize:13, fontWeight:700 }}>⚠ {error}</div>}
          {success && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontSize:13, fontWeight:700 }}>✓ {success}</div>}

          {loading ? (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:40, textAlign:"center", color:T.textDim }}>
              <div style={{ fontSize:22, opacity:.4, marginBottom:8 }}>⏳</div>
              <div style={{ fontSize:13, fontWeight:600 }}>Loading…</div>
            </div>
          ) : (
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:18 }}>

              {/* TABS */}
              <div className="ce-tabs">
                {TABS.map((t, i) => (
                  <button key={t} type="button" className={`ce-tab${tab === i ? " on" : ""}`} onClick={() => setTab(i)}>
                    {t}
                    {t === "Inspection Data" && notePairs.length > 0 && (
                      <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.accentDim, color:T.accent, border:`1px solid ${T.accentBrd}` }}>{notePairs.length}</span>
                    )}
                    {t === "Folder" && isLinked && (
                      <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.purpleDim, color:T.purple, border:`1px solid ${T.purpleBrd}` }}>{bundle.length}</span>
                    )}
                    {t === "Boom" && <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.blueDim, color:T.blue, border:`1px solid ${T.blueBrd}` }}>📐</span>}
                    {t === "Platform" && <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.amberDim, color:T.amber, border:`1px solid ${T.amberBrd}` }}>🪣</span>}
                  </button>
                ))}
              </div>

              {/* ── TAB 0: CERTIFICATE ── */}
              {tab === 0 && (
                <div className="ceg">
                  <F label="Certificate Number"><input name="certificate_number" value={form.certificate_number} onChange={hc} style={IS}/></F>
                  <F label="Certificate Type">
                    <select name="certificate_type" value={form.certificate_type} onChange={hc} style={IS}>
                      {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </F>
                  <F label="Result">
                    <select name="result" value={form.result} onChange={hc} style={IS}>
                      {RESULTS.map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
                    </select>
                  </F>
                  <F label="Status">
                    <select name="status" value={form.status} onChange={hc} style={IS}>
                      {["active","expired","suspended","cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </F>
                  <F label="Inspection Number"><input name="inspection_number" value={form.inspection_number} onChange={hc} style={IS}/></F>
                  <F label="Issue Date"><input name="issue_date" type="date" value={form.issue_date} onChange={hc} style={IS}/></F>
                  <F label="Inspection Date"><input name="inspection_date" type="date" value={form.inspection_date} onChange={hc} style={IS}/></F>
                  <F label="Expiry Date"><input name="expiry_date" type="date" value={form.expiry_date} onChange={hc} style={IS}/></F>
                  <F label="Next Inspection Due"><input name="next_inspection_due" type="date" value={form.next_inspection_due} onChange={hc} style={IS}/></F>
                  <F label="Defects Found" span={2}><textarea name="defects_found" value={form.defects_found} onChange={hc} rows={3} style={{ ...IS, minHeight:80 }}/></F>
                  <F label="Recommendations" span={2}><textarea name="recommendations" value={form.recommendations} onChange={hc} rows={2} style={IS}/></F>
                  <F label="Comments / Remarks" span={2}><textarea name="comments" value={form.comments} onChange={hc} rows={2} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 1: EQUIPMENT ── */}
              {tab === 1 && (
                <div className="ceg">
                  <F label="Equipment Type">
                    <select name="equipment_type" value={form.equipment_type} onChange={hc} style={IS}>
                      <option value="">Select type…</option>
                      <optgroup label="Cranes"><option>Mobile Crane</option><option>Crane Boom</option><option>Crane Hook</option><option>Wire Rope</option><option>Overhead Crane / EOT Crane</option><option>Gantry Crane</option><option>Tower Crane</option><option>Crawler Crane</option><option>Knuckle Boom Crane</option></optgroup>
                      <optgroup label="Hoists"><option>Chain Block</option><option>Manual Chain Hoist</option><option>Electric Chain Hoist</option><option>Lever Hoist / Tirfor</option><option>Electric Wire Rope Hoist</option></optgroup>
                      <optgroup label="Shackles"><option>Shackle — Bow / Anchor</option><option>Shackle — D / Dee</option><option>Shackle — Safety Bow</option><option>Shackle — Wide Mouth</option><option>Shackle — Screw Pin Anchor</option><option>Shackle — Bolt Type Anchor</option><option>Shackle — Alloy</option><option>Shackle — Stainless Steel</option></optgroup>
                      <optgroup label="Slings"><option>Chain Sling</option><option>Wire Rope Sling</option><option>Web Sling / Flat Sling</option><option>Round Sling</option><option>Multi-Leg Chain Sling</option><option>Multi-Leg Wire Rope Sling</option></optgroup>
                      <optgroup label="Rigging Hardware"><option>Hook — Swivel</option><option>Hook — Eye</option><option>Hook — Crane</option><option>Eye Bolt</option><option>Eye Nut</option><option>Turnbuckle</option><option>Master Link</option><option>Swivel</option><option>Wire Rope Clip</option></optgroup>
                      <optgroup label="Beams & Spreaders"><option>Spreader Beam</option><option>Lifting Beam</option><option>Adjustable Spreader Beam</option><option>Pallet Lifter</option><option>Drum Lifter</option><option>Magnetic Lifter</option></optgroup>
                      <optgroup label="Fall Protection"><option>Safety Harness — Full Body</option><option>Lanyard — Energy Absorbing</option><option>Lanyard — Twin Leg</option><option>Self-Retracting Lifeline (SRL)</option><option>Fall Arrest Block</option><option>Anchor Point</option></optgroup>
                      <optgroup label="Pressure Equipment"><option>Pressure Vessel</option><option>Air Receiver</option><option>Boiler</option><option>Hydraulic Tank</option><option>Compressor — Air</option><option>Accumulator</option><option>Gas Cylinder</option><option>LPG Tank</option></optgroup>
                      <optgroup label="Machines"><option>Forklift</option><option>Telehandler</option><option>Cherry Picker / Aerial Work Platform</option><option>TLB (Tractor Loader Backhoe)</option><option>Front Loader / Wheel Loader</option><option>Crane Truck / Hiab</option><option>Water Bowser</option><option>Tipper Truck</option><option>Bus / Personnel Carrier</option><option>Air Compressor</option></optgroup>
                      <optgroup label="Mine & Other"><option>Scaffold</option><option>Underground Mine Cage</option><option>Skip Hoist</option><option>Fire Extinguisher</option><option>Other</option></optgroup>
                    </select>
                  </F>
                  <F label="Equipment Description"><input name="equipment_description" value={form.equipment_description} onChange={hc} style={IS}/></F>
                  <F label="Asset Name"><input name="asset_name" value={form.asset_name} onChange={hc} style={IS}/></F>
                  <F label="Asset Tag / ID"><input name="asset_tag" value={form.asset_tag} onChange={hc} style={IS}/></F>
                  <F label="Serial Number"><input name="serial_number" value={form.serial_number} onChange={hc} style={IS}/></F>
                  <F label="Fleet Number"><input name="fleet_number" value={form.fleet_number} onChange={hc} style={IS} placeholder="e.g. GMC 25"/></F>
                  <F label="Registration Number"><input name="registration_number" value={form.registration_number} onChange={hc} style={IS} placeholder="e.g. B 123 ABC"/></F>
                  <F label="Manufacturer / Make"><input name="manufacturer" value={form.manufacturer} onChange={hc} style={IS}/></F>
                  <F label="Model"><input name="model" value={form.model} onChange={hc} style={IS}/></F>
                  <F label="Year Built / Manufactured"><input name="year_built" value={form.year_built} onChange={hc} style={IS}/></F>
                  <F label="Country of Origin"><input name="country_of_origin" value={form.country_of_origin} onChange={hc} style={IS}/></F>
                  <F label="Location / Site"><input name="location" value={form.location} onChange={hc} style={IS}/></F>
                  <F label="Client Name"><input name="client_name" value={form.client_name} onChange={hc} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 2: TECHNICAL ── */}
              {tab === 2 && (
                <div className="ceg">
                  <F label="Safe Working Load (SWL)"><input name="swl" value={form.swl} onChange={hc} style={IS} placeholder="e.g. 5T, 250kg"/></F>
                  <F label="Capacity / Volume"><input name="capacity_volume" value={form.capacity_volume} onChange={hc} style={IS} placeholder="e.g. 500L, Ø26mm"/></F>
                  <F label="Working Pressure"><input name="working_pressure" value={form.working_pressure} onChange={hc} style={IS}/></F>
                  <F label="Design Pressure"><input name="design_pressure" value={form.design_pressure} onChange={hc} style={IS}/></F>
                  <F label="Test Pressure"><input name="test_pressure" value={form.test_pressure} onChange={hc} style={IS}/></F>
                  <F label="Pressure Unit">
                    <select name="pressure_unit" value={form.pressure_unit} onChange={hc} style={IS}>
                      <option value="">Select…</option>
                      {P_UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </F>
                  <F label="Material"><input name="material" value={form.material} onChange={hc} style={IS}/></F>
                  <F label="Standard / Code"><input name="standard_code" value={form.standard_code} onChange={hc} style={IS} placeholder="e.g. EN 361, SANS 347"/></F>
                  <F label="Lanyard Serial No."><input name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 3: INSPECTOR ── */}
              {tab === 3 && (
                <div className="ceg">
                  <F label="Inspector Name"><input name="inspector_name" value={form.inspector_name} onChange={hc} style={IS}/></F>
                  <F label="Inspector ID / Cert Number"><input name="inspector_id" value={form.inspector_id} onChange={hc} style={IS}/></F>
                  <F label="Inspection Body"><input name="inspection_body" value={form.inspection_body} onChange={hc} style={IS}/></F>
                  <F label="Legal Framework" span={2}><input name="legal_framework" value={form.legal_framework} onChange={hc} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 4: INSPECTION DATA ── */}
              {tab === 4 && (
                <div>
                  {notesIsJson ? (
                    <div style={{ padding:"14px 16px", borderRadius:12, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid, marginBottom:14 }}>
                      ℹ This is a <strong style={{ color:T.accent }}>Machine Wizard Certificate</strong> — boom and platform data are edited in the <strong style={{ color:T.accent }}>Boom</strong>{hasBucket?" and <strong>Platform</strong>":""} tabs. Checklist results below are stored in the inspection data JSON.
                    </div>
                  ) : null}

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:T.text, marginBottom:4 }}>Inspection Data Fields</div>
                      <div style={{ fontSize:11, color:T.textDim }}>Structural, load tests, systems condition. Edit any field or add new ones.</div>
                    </div>
                    {!notesIsJson && (
                      <button type="button" onClick={addPair}
                        style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                        + Add Field
                      </button>
                    )}
                  </div>

                  {notesIsJson ? (
                    // For JSON certs, show checklist fields from jsonNotes.checklist
                    <div>
                      {jsonNotes.checklist && Object.keys(jsonNotes.checklist).length > 0 ? (
                        <div className="ceg2">
                          {Object.entries(jsonNotes.checklist).map(([k, v]) => (
                            <F key={k} label={k.replace(/_/g," ")}>
                              <ResultSel value={v||"PASS"} onChange={val => setJsonNotes(p => ({ ...p, checklist: { ...p.checklist, [k]: val } }))}/>
                            </F>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding:"20px", textAlign:"center", color:T.textDim, fontSize:12, border:`1px dashed ${T.border}`, borderRadius:10 }}>
                          No checklist fields found. Boom and platform data are in the Boom{hasBucket?" / Platform":""} tab.
                        </div>
                      )}
                    </div>
                  ) : (
                    // Pipe-delimited mode
                    notePairs.length === 0 ? (
                      <div style={{ padding:"32px 20px", textAlign:"center", border:`1px dashed ${T.border}`, borderRadius:12, color:T.textDim, fontSize:13 }}>
                        No inspection data fields. Click <strong style={{ color:T.green }}>+ Add Field</strong> to add one.
                      </div>
                    ) : (
                      <>
                        <div className="np-row" style={{ marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Field Name</div>
                          <div style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Value</div>
                          <div/>
                        </div>
                        <div style={{ display:"grid", gap:8 }}>
                          {notePairs.map((pair, i) => (
                            <div key={i} className="np-row">
                              <input value={pair.key} onChange={e => updatePair(i, "key", e.target.value)}
                                style={{ ...IS, minHeight:40 }} placeholder="e.g. Structural, Test load, Boom length"/>
                              <input value={pair.value} onChange={e => updatePair(i, "value", e.target.value)}
                                style={{ ...IS, minHeight:40,
                                  color: pair.value === "FAIL" || pair.value === "REPAIR_REQUIRED" ? T.red
                                       : pair.value === "PASS" ? T.green : T.text
                                }} placeholder="e.g. PASS, 36m, 110T"/>
                              <button type="button" onClick={() => removePair(i)}
                                style={{ width:36, height:40, borderRadius:8, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:"rgba(10,18,32,0.8)", border:`1px solid ${T.border}`, fontSize:11, color:T.textDim, fontFamily:"'IBM Plex Mono',monospace", wordBreak:"break-all", lineHeight:1.7 }}>
                          <div style={{ fontWeight:700, marginBottom:4, color:T.textMid, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Stored as:</div>
                          {buildPipeNotes(notePairs) || "—"}
                        </div>
                      </>
                    )
                  )}
                </div>
              )}

              {/* ── BOOM TAB ── */}
              {hasBoom && tab === TABS.indexOf("Boom") && (
                <div>
                  <div style={{ padding:"10px 14px", borderRadius:10, background:T.blueDim, border:`1px solid ${T.blueBrd}`, fontSize:12, color:T.textMid, marginBottom:14 }}>
                    📐 Edit boom geometry and load test data. Changes save with the certificate.
                  </div>

                  <div className="sh">Boom Geometry</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 6" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></F>
                    <F label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></F>
                    <F label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 12" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></F>
                    <F label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 10" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></F>
                    <F label="Boom Angle (°)"><input style={IS} placeholder="e.g. 60" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></F>
                    {machineKind==="cherry_picker"
                      ? <F label="Max Working Height (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_height} onChange={e=>ub("max_height",e.target.value)}/></F>
                      : <F label="Jib / Fork Attachment">
                          <select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}>
                            <option value="no">No</option><option value="yes">Yes</option>
                          </select>
                        </F>
                    }
                  </div>

                  <div className="sh">Working Radius & SWL</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Min Radius (m)"><input style={IS} placeholder="e.g. 1.5" value={boom.min_radius} onChange={e=>ub("min_radius",e.target.value)}/></F>
                    <F label="Max Radius (m)"><input style={IS} placeholder="e.g. 14" value={boom.max_radius} onChange={e=>ub("max_radius",e.target.value)}/></F>
                    <F label="Test Radius (m)"><input style={IS} placeholder="e.g. 5" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/></F>
                    <F label="SWL at Min Radius"><input style={IS} placeholder="e.g. 6T" value={boom.swl_at_min_radius} onChange={e=>ub("swl_at_min_radius",e.target.value)}/></F>
                    <F label="SWL at Max Radius"><input style={IS} placeholder="e.g. 1.2T" value={boom.swl_at_max_radius} onChange={e=>ub("swl_at_max_radius",e.target.value)}/></F>
                    <F label="SWL at Test Config"><input style={IS} placeholder="e.g. 4T" value={boom.swl_at_actual_config} onChange={e=>ub("swl_at_actual_config",e.target.value)}/></F>
                  </div>
                  <F label="Test Load Applied (Tonnes) — 110% of SWL at test config">
                    <input style={{ ...IS, marginBottom:14 }} placeholder="e.g. 4.4" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/>
                  </F>

                  <div className="sh">Boom Systems Condition</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Boom Structure"><ResultSel value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></F>
                    <F label="Boom Pins & Connections"><ResultSel value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></F>
                    <F label="Boom Wear / Pads"><ResultSel value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></F>
                    <F label="Luffing / Extension"><ResultSel value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></F>
                    <F label="Slew / Rotation"><ResultSel value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></F>
                    <F label="Hoist / Lift"><ResultSel value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></F>
                    <F label="LMI Tested at Config"><ResultSel value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></F>
                    <F label="Anti-Two Block / Overload"><ResultSel value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></F>
                  </div>
                  <F label="Boom Notes">
                    <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom notes…" value={boom.notes} onChange={e=>ub("notes",e.target.value)}/>
                  </F>
                </div>
              )}

              {/* ── PLATFORM TAB ── */}
              {hasBucket && tab === TABS.indexOf("Platform") && (
                <div>
                  <div style={{ padding:"10px 14px", borderRadius:10, background:T.amberDim, border:`1px solid ${T.amberBrd}`, fontSize:12, color:T.textMid, marginBottom:14 }}>
                    🪣 Edit platform / basket inspection data for this Cherry Picker.
                  </div>

                  <div className="sh">Platform Specification</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Platform SWL"><input style={IS} placeholder="e.g. 250kg" value={bucket.platform_swl} onChange={e=>ubk("platform_swl",e.target.value)}/></F>
                    <F label="Platform Dimensions (m)"><input style={IS} placeholder="e.g. 1.2 x 0.8" value={bucket.platform_dimensions} onChange={e=>ubk("platform_dimensions",e.target.value)}/></F>
                    <F label="Platform Material"><input style={IS} placeholder="e.g. Steel" value={bucket.platform_material} onChange={e=>ubk("platform_material",e.target.value)}/></F>
                  </div>
                  <F label="Test Load Applied">
                    <input style={{ ...IS, marginBottom:14 }} placeholder="e.g. 275kg (110% of SWL)" value={bucket.test_load_applied} onChange={e=>ubk("test_load_applied",e.target.value)}/>
                  </F>

                  <div className="sh">Structural Condition</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Platform Structure"><ResultSel value={bucket.platform_structure} onChange={v=>ubk("platform_structure",v)}/></F>
                    <F label="Platform Floor"><ResultSel value={bucket.platform_floor} onChange={v=>ubk("platform_floor",v)}/></F>
                    <F label="Guardrails / Toe Boards"><ResultSel value={bucket.guardrails} onChange={v=>ubk("guardrails",v)}/></F>
                  </div>

                  <div className="sh">Safety Systems</div>
                  <div className="ceg3" style={{ marginBottom:14 }}>
                    <F label="Gate / Latch System"><ResultSel value={bucket.gate_latch} onChange={v=>ubk("gate_latch",v)}/></F>
                    <F label="Platform Levelling"><ResultSel value={bucket.levelling_system} onChange={v=>ubk("levelling_system",v)}/></F>
                    <F label="Emergency Lowering"><ResultSel value={bucket.emergency_lowering} onChange={v=>ubk("emergency_lowering",v)}/></F>
                    <F label="Overload Device"><ResultSel value={bucket.overload_device} onChange={v=>ubk("overload_device",v)}/></F>
                    <F label="Tilt Alarm"><ResultSel value={bucket.tilt_alarm} onChange={v=>ubk("tilt_alarm",v)}/></F>
                  </div>
                  <F label="Platform Notes">
                    <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional platform notes…" value={bucket.notes} onChange={e=>ubk("notes",e.target.value)}/>
                  </F>
                </div>
              )}

              {/* ── FOLDER TAB ── */}
              {tab === TABS.indexOf("Folder") && (
                <div style={{ display:"grid", gap:16 }}>
                  <div style={{ background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:T.purple, marginBottom:12 }}>📁 Folder Metadata</div>
                    <div className="ceg">
                      <F label="Folder ID"><input name="folder_id" value={form.folder_id} onChange={hc} style={IS} placeholder="Auto-generated UUID"/></F>
                      <F label="Folder Name"><input name="folder_name" value={form.folder_name} onChange={hc} style={IS}/></F>
                      <F label="Position in Folder"><input name="folder_position" type="number" min={1} value={form.folder_position} onChange={hc} style={IS}/></F>
                    </div>
                  </div>

                  {isLinked && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, marginBottom:10 }}>Certificates in folder ({bundle.length})</div>
                      <div style={{ display:"grid", gap:8 }}>
                        {bundle.map((item, i) => {
                          const isMe = String(item.id) === String(id);
                          return (
                            <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", padding:"11px 14px", borderRadius:11, border:`1px solid ${isMe?T.accentBrd:T.border}`, background:isMe?T.accentDim:T.card }}>
                              <div>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                                  <span style={{ fontSize:12, fontWeight:800, color:T.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{item.certificate_number || "—"}</span>
                                  {isMe && <span style={{ fontSize:9, fontWeight:800, color:T.accent }}>← THIS</span>}
                                  <span style={{ fontSize:9, color:T.textDim }}>Pos {item.folder_position || i+1}</span>
                                </div>
                                <div style={{ fontSize:11, color:T.textDim }}>{item.equipment_type || "—"} · {item.equipment_description || "—"}</div>
                              </div>
                              <div style={{ display:"flex", gap:8 }}>
                                {!isMe && (
                                  <button type="button" onClick={() => router.push(`/certificates/${item.id}/edit`)}
                                    style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.accentBrd}`, background:T.accentDim, color:T.accent, fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                                )}
                                <button type="button" onClick={() => handleUnlinkOne(item.id)} disabled={unlinking}
                                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontWeight:800, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                                  {unlinking ? "…" : "Unlink"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, marginBottom:10 }}>
                      {isLinked ? "Add to This Folder" : "Link to Another Certificate"}
                    </div>
                    <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                      placeholder="Search cert number, equipment, client…" style={{ ...IS, marginBottom:10 }}/>
                    {linkLoading && <div style={{ fontSize:12, color:T.textDim, padding:"6px 0" }}>Searching…</div>}
                    {!linkLoading && linkSearch.length >= 2 && linkResults.length === 0 && (
                      <div style={{ fontSize:12, color:T.textDim, padding:"6px 0" }}>No unlinked certificates found</div>
                    )}
                    <div style={{ display:"grid", gap:8 }}>
                      {linkResults.map(cert => (
                        <div key={cert.id} onClick={() => !linking && handleLink(cert.id)}
                          style={{ cursor:"pointer", padding:"11px 14px", borderRadius:11, border:`1px solid ${T.border}`, background:T.card }}
                          onMouseEnter={e => e.currentTarget.style.background = T.accentDim}
                          onMouseLeave={e => e.currentTarget.style.background = T.card}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:800, color:T.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{cert.certificate_number || "—"}</div>
                              <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{cert.equipment_description || "—"} · {cert.equipment_type || ""}</div>
                              {cert.client_name && <div style={{ fontSize:11, color:T.textDim }}>{cert.client_name}</div>}
                            </div>
                            <button type="button" disabled={linking}
                              style={{ padding:"7px 14px", borderRadius:9, border:`1px solid ${T.purpleBrd}`, background:T.purpleDim, color:T.purple, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                              {linking ? "Linking…" : "Link →"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SAVE ROW */}
              <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}`, display:"flex", gap:10, flexWrap:"wrap" }}>
                <SaveBtn/>
                <button type="button" onClick={() => router.push(`/certificates/${id}`)}
                  style={{ padding:"12px 18px", borderRadius:11, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateEditPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(240,246,255,0.4)", fontSize:14, fontFamily:"'IBM Plex Sans',sans-serif" }}>Loading…</div>
    }>
      <CertificateEditInner/>
    </Suspense>
  );
}
