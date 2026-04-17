// src/app/certificates/[id]/edit/page.jsx
"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, memo } from "react";
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

const IS = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:44, boxSizing:"border-box" };
const LS = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, marginBottom:6 };

function normalizeId(v){ return Array.isArray(v) ? v[0] : v; }
function toDate(v){ if(!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); }

// ─────────────────────────────────────────────────────────────
// INSPECTION DATA HELPERS
// Flattens complex nested notes JSON into a flat array of
// { section, key, value, path } objects that are easy to edit,
// then serialises back to the original nested structure.
// ─────────────────────────────────────────────────────────────

function formatFieldLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getSectionLabel(key) {
  const map = {
    checklist: "Checklist",
    boom: "Boom Configuration",
    bucket: "Bucket / Platform",
    forks: "Fork Arms",
  };
  return map[key] || formatFieldLabel(key);
}

/** Returns value colour style for PASS/FAIL type values */
function valueColor(v) {
  const s = String(v || "").toUpperCase();
  if (s === "PASS" || s === "YES" || s === "SERVICEABLE" || s === "SATISFACTORY") return T.green;
  if (s === "FAIL" || s === "NO" || s === "DEFECTIVE" || s === "OUT_OF_SERVICE") return T.red;
  if (s === "REPAIR_REQUIRED" || s === "CONDITIONAL" || s === "WARNING") return T.amber;
  return T.text;
}

/**
 * Flattens the notes JSON (which may be a nested object) into a flat list:
 * [{ id, section, key, label, value, path: ['boom','boom_length'] }, …]
 * Top-level scalar keys get section = "General"
 * Nested objects get their own section
 * Arrays of objects (e.g. forks) are flattened per item
 */
function flattenNotesJson(raw) {
  const rows = [];
  let parsed = {};
  try {
    parsed = JSON.parse(raw || "{}");
    if (typeof parsed !== "object" || Array.isArray(parsed)) parsed = {};
  } catch(e) { parsed = {}; }

  let id = 0;

  function addRow(section, key, value, path) {
    rows.push({
      id: id++,
      section,
      key: canonicalKey,
      label: formatFieldLabel(canonicalKey),
      value: value == null ? "" : String(value),
      path,
    });
  }

  Object.entries(parsed).forEach(([topKey, topVal]) => {
    if (topVal === null || topVal === undefined) {
      addRow("General", topKey, "", [topKey]);
      return;
    }
    if (Array.isArray(topVal)) {
      // e.g. forks array
      topVal.forEach((item, idx) => {
        if (typeof item === "object" && item !== null) {
          const secLabel = `${getSectionLabel(topKey)} #${idx + 1}`;
          Object.entries(item).forEach(([k, v]) => {
            if (typeof v !== "object") {
              addRow(secLabel, k, v, [topKey, idx, k]);
            }
          });
        } else {
          addRow(getSectionLabel(topKey), `Item ${idx + 1}`, item, [topKey, idx]);
        }
      });
    } else if (typeof topVal === "object") {
      const secLabel = getSectionLabel(topKey);
      Object.entries(topVal).forEach(([k, v]) => {
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          // 2-level deep nesting (rare)
          const subSec = `${secLabel} › ${formatFieldLabel(k)}`;
          Object.entries(v).forEach(([k2, v2]) => {
            if (typeof v2 !== "object") {
              addRow(subSec, k2, v2, [topKey, k, k2]);
            }
          });
        } else if (Array.isArray(v)) {
          // skip inner arrays for now — leave as JSON string
          addRow(secLabel, k, JSON.stringify(v), [topKey, k]);
        } else {
          addRow(secLabel, k, v, [topKey, k]);
        }
      });
    } else {
      addRow("General", topKey, topVal, [topKey]);
    }
  });

  return rows;
}

/**
 * Rebuilds the nested JSON from the flat rows list, then JSON.stringifies it.
 */
function rebuildNotesJson(rows) {
  const out = {};

  rows.forEach(({ path, value }) => {
    if (!path || path.length === 0) return;

    // Cast back to appropriate type
    let v = value;
    if (v === "true") v = true;
    else if (v === "false") v = false;
    else if (v !== "" && !isNaN(Number(v)) && v.trim() !== "") v = Number(v);

    if (path.length === 1) {
      out[path[0]] = v;
    } else if (path.length === 2) {
      const sectionKey = normalizeSectionPathKey(path[0]);
      const fieldKey = canonicalizeFieldKey(sectionKey, path[1]);
      if (!out[sectionKey] || typeof out[sectionKey] !== "object") out[sectionKey] = {};
      out[sectionKey][fieldKey] = v;
    } else if (path.length === 3) {
      if (typeof path[1] === "number") {
        // Array item
        const arrayKey = normalizeSectionPathKey(path[0]);
        const fieldKey = canonicalizeFieldKey(arrayKey, path[2]);
        if (!Array.isArray(out[arrayKey])) out[arrayKey] = [];
        if (!out[arrayKey][path[1]]) out[arrayKey][path[1]] = {};
        out[arrayKey][path[1]][fieldKey] = v;
      } else {
        const sectionKey = normalizeSectionPathKey(path[0]);
        const subKey = normalizeFieldToken(path[1]);
        const fieldKey = canonicalizeFieldKey(sectionKey, path[2]);
        if (!out[sectionKey]) out[sectionKey] = {};
        if (!out[sectionKey][subKey] || typeof out[sectionKey][subKey] !== "object") out[sectionKey][subKey] = {};
        out[sectionKey][subKey][fieldKey] = v;
      }
    }
  });

  return JSON.stringify(out);
}

// Legacy pipe-separated notes (non-JSON)
function parseNotesPipe(str) {
  if (!str) return [];
  return str.split("|").map(part => {
    const idx = part.indexOf(":");
    if (idx < 0) return { key: part.trim(), value: "" };
    return { key: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() };
  }).filter(p => p.key);
}
function buildNotesPipe(pairs) {
  return pairs.filter(p => p.key && p.value).map(p => `${p.key}: ${p.value}`).join(" | ");
}

/** Detect whether notes string is JSON or pipe-separated */
function isJsonNotes(str) {
  if (!str || !str.trim()) return false;
  const t = str.trim();
  return t.startsWith("{") || t.startsWith("[");
}

// ─────────────────────────────────────────────────────────────
function safeJsonParse(value, fallback = {}) {
  try {
    if (!value) return fallback;
    if (typeof value === "object" && value !== null) return value;
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSectionPathKey(section) {
  const raw = String(section || "").trim().toLowerCase();
  if (!raw || raw === "general") return "general";

  const aliasMap = {
    checklist: "checklist",
    "boom configuration": "boom",
    boom: "boom",
    "bucket / platform": "bucket",
    "bucket/platform": "bucket",
    bucket: "bucket",
    platform: "bucket",
    "fork arms": "forks",
    forks: "forks",
    "fork arm": "forks",
    fork: "forks",
    horse: "horse",
    trailer: "trailer",
  };

  return aliasMap[raw] || raw.replace(/\s+/g, "_");
}


function normalizeFieldToken(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeFieldKey(sectionKey, key) {
  const section = normalizeSectionPathKey(sectionKey);
  const token = normalizeFieldToken(key);
  if (!token) return key;

  const bySection = {
    boom: {
      max_working_height: "max_height",
      max_working_height_m: "max_height",
      working_height: "max_height",
      working_height_m: "max_height",
      height: "max_height",
      boom_length_min: "min_boom_length",
      min_boom: "min_boom_length",
      min_length: "min_boom_length",
      minimum_boom_length: "min_boom_length",
      boom_length_max: "max_boom_length",
      max_boom: "max_boom_length",
      max_length: "max_boom_length",
      maximum_boom_length: "max_boom_length",
      boom_length_actual: "actual_boom_length",
      actual_boom: "actual_boom_length",
      actual_length: "actual_boom_length",
      actual_test_config: "actual_boom_length",
      extended_telescoped: "extended_boom_length",
      telescoped: "extended_boom_length",
      extended: "extended_boom_length",
      telescoped_length: "extended_boom_length",
      angle: "boom_angle",
      boom_angle_deg: "boom_angle",
      radius_min: "min_radius",
      minimum_radius: "min_radius",
      radius_max: "max_radius",
      maximum_radius: "max_radius",
      actual_radius: "load_tested_at_radius",
      test_radius: "load_tested_at_radius",
      working_radius_tested: "load_tested_at_radius",
      actual_working_radius: "load_tested_at_radius",
      swl_min_radius: "swl_at_min_radius",
      min_radius_swl: "swl_at_min_radius",
      swl_max_radius: "swl_at_max_radius",
      max_radius_swl: "swl_at_max_radius",
      swl_actual: "swl_at_actual_config",
      actual_swl: "swl_at_actual_config",
      actual_config_swl: "swl_at_actual_config",
      swl_at_radius: "swl_at_actual_config",
      load_test: "test_load",
      test_load_applied: "test_load",
      load_test_applied: "test_load",
      proof_load: "test_load",
      structure: "boom_structure",
      boom_condition: "boom_structure",
      pins_connections: "boom_pins",
      pins: "boom_pins",
      wear_pads: "boom_wear",
      pads: "boom_wear",
      extension_system: "luffing_system",
      luffing: "luffing_system",
      rotation_system: "slew_system",
      slew_rotation: "slew_system",
      hoist_lift: "hoist_system",
      lift_system: "hoist_system",
      lmi_tested: "lmi_test",
      lmi_tested_at_config: "lmi_test",
      anti_two_block_overload: "anti_two_block",
      overload_system: "anti_two_block",
      comments: "notes",
      remarks: "notes",
    },
    bucket: {
      bucket_serial: "serial_number",
      serial_no: "serial_number",
      make: "manufacturer",
      swl: "platform_swl",
      bucket_swl: "platform_swl",
      swl_platform: "platform_swl",
      load_test: "test_load_applied",
      test_load: "test_load_applied",
      proof_load: "test_load_applied",
      structure: "platform_structure",
      floor_condition: "platform_floor",
      toe_board: "toe_boards",
      gate_latch_system: "gate_latch",
      gate: "gate_latch",
      mounting: "platform_mounting",
      attachment_to_boom: "platform_mounting",
      slew: "rotation",
      anchor_points: "harness_anchors",
      swl_marking_legible: "swl_marking",
      coating_condition: "paint_condition",
      auto_levelling: "levelling_system",
      emergency_lowering_device: "emergency_lowering",
      emergency_stop_platform: "emergency_stop",
      overload_swl_cut_off_device: "overload_device",
      inclination_alarm: "tilt_alarm",
      communication: "intercom",
    },
    checklist: {
      structural_integrity: "structural_result",
      structure: "structural_result",
      hydraulic_system: "hydraulics_result",
      hydraulics: "hydraulics_result",
      brakes: "brakes_result",
      brake_drive_system: "brakes_result",
      tyres_wheels: "tyres_result",
      tires_wheels: "tyres_result",
      lights_alarms: "lights_result",
      safety_systems: "safety_devices",
      safety_devices_interlocks: "safety_devices",
      fire_extinguisher_condition: "fire_extinguisher",
      stabiliser_interlocks: "stabiliser_interlocks",
      outrigger_interlocks: "stabiliser_interlocks",
      machine_stable: "machine_stable_under_load",
      no_deformation_under_load: "no_structural_deformation_under_load",
      functions_operate_under_load: "all_functions_operate_under_load",
    },
  };

  return bySection[section]?.[token] || token;
}

function getEditableInspectionSource(data) {
  if (isJsonNotes(data?.notes || "")) return data.notes;
  const extracted = data?.extracted_data;
  if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
    return JSON.stringify(extracted);
  }
  return data?.notes || "";
}

function mergeInspectionData(baseExtractedData, notesString, notesMode) {
  const base = safeJsonParse(baseExtractedData, {});
  if (!notesString) return base;

  if (notesMode === "json" && isJsonNotes(notesString)) {
    const parsed = safeJsonParse(notesString, {});
    return {
      ...base,
      ...parsed,
      checklist: { ...(base.checklist || {}), ...(parsed.checklist || {}) },
      boom: { ...(base.boom || {}), ...(parsed.boom || {}) },
      bucket: { ...(base.bucket || {}), ...(parsed.bucket || {}) },
      horse: { ...(base.horse || {}), ...(parsed.horse || {}) },
      trailer: { ...(base.trailer || {}), ...(parsed.trailer || {}) },
      forks: Array.isArray(parsed.forks) ? parsed.forks : (Array.isArray(base.forks) ? base.forks : []),
    };
  }

  const pipePairs = parseNotesPipe(notesString);
  const flat = {};
  pipePairs.forEach(({ key, value }) => {
    if (key) flat[key] = value;
  });
  return { ...base, ...flat };
}

// ─────────────────────────────────────────────────────────────

function F({ label, children, span = 1 }) {
  return (
    <div style={{ gridColumn:`span ${span}` }}>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

const JsonInspectionRow = memo(function JsonInspectionRow({ row, rowIndex, onChange, onRemove }) {
  const upperValue = String(row.value || "").toUpperCase();
  const dotColor =
    upperValue === "PASS" || upperValue === "YES" ? "#34d399"
    : upperValue === "FAIL" || upperValue === "NO" ? "#f87171"
    : upperValue === "REPAIR_REQUIRED" ? "#fbbf24"
    : null;

  return (
    <tr style={{ background: rowIndex % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
      <td className="id-param" title={row.key}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {dotColor
            ? <span style={{ width:6, height:6, borderRadius:"50%", background:dotColor, flexShrink:0, display:"inline-block" }}/>
            : <span style={{ width:6, flexShrink:0, display:"inline-block" }}/>}
          <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{row.label}</span>
        </div>
      </td>

      <td className="id-val">
        <input
          value={row.value}
          onChange={e => onChange(row.id, e.target.value)}
          spellCheck={false}
          autoComplete="off"
          style={{
            color: valueColor(row.value),
            fontWeight: /PASS|FAIL|YES|NO|REPAIR/.test(upperValue) ? 800 : 500,
          }}
          placeholder="—"
        />
      </td>

      <td className="id-del">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          title="Remove this field"
          style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.redBrd}`, background:"transparent", color:T.red, fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.6 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
          ✕
        </button>
      </td>
    </tr>
  );
});

const TABS = ["Certificate","Equipment","Technical","Inspector","Inspection Data","Folder"];
const CERT_TYPES = ["Certificate of Inspection","Load Test Certificate","Pressure Test Certificate","NDT Certificate","Thorough Examination Certificate"];
const RESULTS = ["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL","UNKNOWN"];
const P_UNITS = ["bar","kPa","MPa","psi"];

function CertificateEditInner() {
  const params = useParams();
  const router = useRouter();
  const id = normalizeId(params?.id);

  const [tab,          setTab]          = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [bundle,       setBundle]       = useState([]);
  const [linkSearch,   setLinkSearch]   = useState("");
  const [linkResults,  setLinkResults]  = useState([]);
  const [linkLoading,  setLinkLoading]  = useState(false);
  const [linking,      setLinking]      = useState(false);
  const [unlinking,    setUnlinking]    = useState(false);

  // notes mode: "json" | "pipe"
  const [notesMode,    setNotesMode]    = useState("pipe");
  // json mode: flat rows
  const [jsonRows,     setJsonRows]     = useState([]);
  // pipe mode: pairs
  const [notePairs,    setNotePairs]    = useState([]);
  // add-field panel (json mode)
  const [addSection,   setAddSection]   = useState("");
  const [addKey,       setAddKey]       = useState("");
  const [addValue,     setAddValue]     = useState("");
  // search / filter inside Inspection Data
  const [dataSearch,   setDataSearch]   = useState("");
  // collapse sections
  const [collapsed,    setCollapsed]    = useState({});
  const [baseExtractedData, setBaseExtractedData] = useState({});

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

    setBaseExtractedData(data.extracted_data || {});
    const rawNotes = getEditableInspectionSource(data);
    if (isJsonNotes(rawNotes)) {
      setNotesMode("json");
      setJsonRows(flattenNotesJson(rawNotes));
      setNotePairs([]);
    } else {
      setNotesMode("pipe");
      setNotePairs(parseNotesPipe(rawNotes));
      setJsonRows([]);
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

  // JSON rows helpers
  const updateJsonRow = useCallback((rowId, newValue) => {
    setJsonRows(prev => prev.map(r => r.id === rowId ? { ...r, value: newValue } : r));
  }, []);

  const removeJsonRow = useCallback((rowId) => {
    setJsonRows(prev => prev.filter(r => r.id !== rowId));
  }, []);

  const addJsonRow = useCallback(() => {
    const key = addKey.trim();
    if (!key) return;

    const section = addSection.trim() || "General";
    const sectionKey = normalizeSectionPathKey(section);
    const canonicalKey = sectionKey === "general" ? key : canonicalizeFieldKey(sectionKey, key);
    const path = sectionKey === "general"
      ? [canonicalKey]
      : [sectionKey, canonicalKey];

    setJsonRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      section,
      key: canonicalKey,
      label: formatFieldLabel(canonicalKey),
      value: addValue.trim(),
      path,
    }]);

    setAddKey("");
    setAddValue("");
  }, [addKey, addSection, addValue]);

  // Pipe pairs helpers
  const updatePair  = (i, field, val) => setNotePairs(p => p.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const addPair     = () => setNotePairs(p => [...p, { key: "", value: "" }]);
  const removePair  = i  => setNotePairs(p => p.filter((_, j) => j !== i));

  // Build final notes string for saving
  function buildFinalNotes() {
    if (notesMode === "json") return rebuildNotesJson(jsonRows);
    return buildNotesPipe(notePairs);
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const finalNotes = buildFinalNotes();
      const mergedInspectionData = mergeInspectionData(baseExtractedData, finalNotes, notesMode);

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
        notes:                 finalNotes                || null,
        extracted_data:         mergedInspectionData      || null,
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
    await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", targetId);
    setUnlinking(false); await load();
  }

  const isLinked = bundle.length > 0;

  // ── Group json rows by section ──────────────────────────────
  const groupedRows = useMemo(() => {
    const groups = {};
    const query = dataSearch.trim().toLowerCase();

    const filtered = query
      ? jsonRows.filter(r =>
          String(r.label || "").toLowerCase().includes(query) ||
          String(r.value || "").toLowerCase().includes(query) ||
          String(r.section || "").toLowerCase().includes(query)
        )
      : jsonRows;

    filtered.forEach(row => {
      if (!groups[row.section]) groups[row.section] = [];
      groups[row.section].push(row);
    });

    return groups;
  }, [jsonRows, dataSearch]);

  const sectionEntries = useMemo(() => Object.entries(groupedRows), [groupedRows]);
  const sectionCount = sectionEntries.length;

  const toggleCollapse = useCallback((sec) =>
    setCollapsed(p => ({ ...p, [sec]: !p[sec] })), []);

  const SaveBtn = () => (
    <button type="button" onClick={handleSave} disabled={saving}
      style={{ padding:"12px 28px", borderRadius:11, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
      {saving ? "Saving…" : "💾 Save Changes"}
    </button>
  );

  // ── Result badge quick-select chips ────────────────────────
  const RESULT_CHIPS = ["PASS","FAIL","REPAIR_REQUIRED"];

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
        .ce-tabs{display:flex;gap:0;border-bottom:1px solid ${T.border};margin-bottom:18px;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .ce-tab{padding:10px 16px;border:none;background:none;color:${T.textDim};font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;font-family:'IBM Plex Sans',sans-serif;min-height:44px;-webkit-tap-highlight-color:transparent}
        .ce-tab.on{color:${T.accent};border-bottom-color:${T.accent}}
        .ce-tab:hover:not(.on){color:${T.textMid}}

        /* Inspection data table */
        .id-table{width:100%;border-collapse:collapse;font-size:13px;}
        .id-table tr{border-bottom:1px solid ${T.border};}
        .id-table tr:last-child{border-bottom:none}
        .id-table tr:hover td{background:rgba(34,211,238,0.03)}
        .id-param{padding:9px 14px;width:42%;font-weight:600;color:${T.textMid};font-size:12px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0;}
        .id-val{padding:6px 8px 6px 0;vertical-align:middle;}
        .id-del{padding:6px 8px;vertical-align:middle;width:36px;}
        .id-val input{width:100%;padding:7px 10px;border-radius:7px;border:1px solid transparent;background:transparent;font-size:12px;font-family:'IBM Plex Sans',sans-serif;outline:none;transition:all .15s;min-height:36px;}
        .id-val input:hover{border-color:${T.border};background:rgba(18,30,50,0.5);}
        .id-val input:focus{border-color:${T.accent}!important;background:rgba(18,30,50,0.8);}
        .id-sec-hdr{display:flex;align-items:center;gap:8px;padding:7px 14px;background:rgba(11,29,58,0.7);border-bottom:1px solid ${T.accentBrd};cursor:pointer;user-select:none;}
        .id-sec-hdr:hover{background:rgba(34,211,238,0.06);}
        .id-sec-label{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${T.accent};flex:1;}
        .id-sec-count{font-size:9px;color:${T.textDim};background:${T.accentDim};border:1px solid ${T.accentBrd};padding:1px 7px;border-radius:99px;}
        .id-sec-chevron{font-size:10px;color:${T.textDim};transition:transform .15s;}

        .np-row{display:grid;grid-template-columns:1fr 1fr 36px;gap:8px;align-items:center}
        @media(max-width:640px){.ceg{grid-template-columns:1fr!important}.np-row{grid-template-columns:1fr 1fr 36px}}
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
                    {i === 4 && (notesMode === "json" ? jsonRows.length : notePairs.length) > 0 && (
                      <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.accentDim, color:T.accent, border:`1px solid ${T.accentBrd}` }}>
                        {notesMode === "json" ? jsonRows.length : notePairs.length}
                      </span>
                    )}
                    {i === 5 && isLinked && (
                      <span style={{ marginLeft:5, fontSize:9, padding:"1px 6px", borderRadius:99, background:T.purpleDim, color:T.purple, border:`1px solid ${T.purpleBrd}` }}>{bundle.length}</span>
                    )}
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
                  <F label="Result" span={2}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {RESULTS.map(rv => {
                        const isActive = form.result === rv;
                        const col = rv === "PASS" ? T.green : rv === "FAIL" || rv === "OUT_OF_SERVICE" ? T.red : T.amber;
                        return (
                          <button key={rv} type="button" onClick={() => setForm(p => ({ ...p, result: rv }))}
                            style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${isActive ? col : T.border}`, background:isActive ? `${col}22` : T.card, color:isActive ? col : T.textDim, fontWeight:800, fontSize:11, cursor:"pointer", fontFamily:"inherit", transition:"all .12s" }}>
                            {rv.replace(/_/g," ")}
                          </button>
                        );
                      })}
                    </div>
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
                  <F label="Fleet Number"><input name="fleet_number" value={form.fleet_number} onChange={hc} style={IS} placeholder="e.g. CC150"/></F>
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

              {/* ══════════════════════════════════════════════════════
                  TAB 4: INSPECTION DATA — NEW LIST MODE
              ══════════════════════════════════════════════════════ */}
              {tab === 4 && (
                <div style={{ display:"grid", gap:12 }}>

                  {/* ── Top toolbar ── */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:T.text }}>Inspection Data</div>
                      <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>
                        {notesMode === "json"
                          ? `${jsonRows.length} fields across ${sectionCount} sections`
                          : `${notePairs.length} fields`}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      {/* Mode toggle */}
                      <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
                        {[["json","Grouped"],["pipe","Simple"]].map(([m, lbl]) => (
                          <button key={m} type="button" onClick={() => setNotesMode(m)}
                            style={{ padding:"6px 12px", border:"none", background:notesMode===m?T.accentDim:"transparent", color:notesMode===m?T.accent:T.textDim, fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                      {notesMode === "pipe" && (
                        <button type="button" onClick={addPair}
                          style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                          + Add Row
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Search bar (json mode only) ── */}
                  {notesMode === "json" && jsonRows.length > 0 && (
                    <input
                      value={dataSearch} onChange={e => setDataSearch(e.target.value)}
                      placeholder="🔍  Search parameters or values…"
                      style={{ ...IS, minHeight:40, fontSize:12 }}
                    />
                  )}

                  {/* ════════════════ JSON GROUPED MODE ════════════════ */}
                  {notesMode === "json" && (
                    <>
                      {jsonRows.length === 0 ? (
                        <div style={{ padding:"32px 20px", textAlign:"center", border:`1px dashed ${T.border}`, borderRadius:12, color:T.textDim, fontSize:13 }}>
                          No inspection data found on this certificate.
                        </div>
                      ) : (
                        <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                          {sectionEntries.map(([section, rows], gi) => {
                            const isCollapsed = collapsed[section];
                            return (
                              <div key={section} style={{ borderBottom: gi < sectionEntries.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                {/* Section header */}
                                <div className="id-sec-hdr" onClick={() => toggleCollapse(section)}>
                                  <span className="id-sec-chevron" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
                                  <span className="id-sec-label">{section}</span>
                                  <span className="id-sec-count">{rows.length}</span>
                                </div>

                                {/* Rows */}
                                {!isCollapsed && (
                                  <table className="id-table">
                                    <tbody>
                                      {rows.map((row, ri) => (
                                        <JsonInspectionRow
                                          key={row.id}
                                          row={row}
                                          rowIndex={ri}
                                          onChange={updateJsonRow}
                                          onRemove={removeJsonRow}
                                        />
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Add field panel ── */}
                      <div style={{ border:`1px solid ${T.greenBrd}`, borderRadius:10, padding:14, background:T.greenDim }}>
                        <div style={{ fontSize:11, fontWeight:800, color:T.green, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>+ Add New Field</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8, alignItems:"flex-end" }}>
                          <div>
                            <label style={{ ...LS, color:T.green }}>Section</label>
                            <input value={addSection} onChange={e => setAddSection(e.target.value)}
                              list="section-suggestions"
                              placeholder="e.g. Checklist, Boom…"
                              style={{ ...IS, minHeight:40, fontSize:12 }}/>
                            <datalist id="section-suggestions">
                              {[...new Set(jsonRows.map(r => r.section))].map(s => <option key={s} value={s}/>)}
                            </datalist>
                          </div>
                          <div>
                            <label style={{ ...LS, color:T.green }}>Field Name</label>
                            <input value={addKey} onChange={e => setAddKey(e.target.value)}
                              placeholder="e.g. boom_length"
                              style={{ ...IS, minHeight:40, fontSize:12 }}/>
                          </div>
                          <div>
                            <label style={{ ...LS, color:T.green }}>Value</label>
                            <input value={addValue} onChange={e => setAddValue(e.target.value)}
                              placeholder="e.g. PASS, 36m…"
                              style={{ ...IS, minHeight:40, fontSize:12 }}
                              onKeyDown={e => e.key === "Enter" && addJsonRow()}/>
                          </div>
                          <button type="button" onClick={addJsonRow}
                            style={{ height:40, padding:"0 18px", borderRadius:9, border:"none", background:T.green, color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════ PIPE SIMPLE MODE ════════════════ */}
                  {notesMode === "pipe" && (
                    <>
                      {notePairs.length === 0 ? (
                        <div style={{ padding:"32px 20px", textAlign:"center", border:`1px dashed ${T.border}`, borderRadius:12, color:T.textDim, fontSize:13 }}>
                          No fields. Click <strong style={{ color:T.green }}>+ Add Row</strong> to add one.
                        </div>
                      ) : (
                        <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                          {/* Header */}
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 36px", gap:0, background:"rgba(11,29,58,0.8)", borderBottom:`1px solid ${T.border}`, padding:"7px 14px" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Parameter</div>
                            <div style={{ fontSize:10, fontWeight:700, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Value</div>
                            <div/>
                          </div>
                          <table className="id-table" style={{ width:"100%" }}>
                            <tbody>
                              {notePairs.map((pair, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                                  <td className="id-param">
                                    <input value={pair.key} onChange={e => updatePair(i, "key", e.target.value)}
                                      placeholder="Field name"
                                      style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid transparent", background:"transparent", color:T.textMid, fontSize:12, fontFamily:"inherit", outline:"none" }}
                                      onFocus={e => { e.target.style.borderColor=T.accent; e.target.style.background="rgba(18,30,50,0.8)"; }}
                                      onBlur={e => { e.target.style.borderColor="transparent"; e.target.style.background="transparent"; }}/>
                                  </td>
                                  <td className="id-val">
                                    <input value={pair.value} onChange={e => updatePair(i, "value", e.target.value)}
                                      placeholder="Value"
                                      style={{ color: valueColor(pair.value), fontWeight: /PASS|FAIL|YES|NO|REPAIR/.test((pair.value||"").toUpperCase()) ? 800 : 500 }}/>
                                  </td>
                                  <td className="id-del">
                                    <button type="button" onClick={() => removePair(i)}
                                      style={{ width:28, height:28, borderRadius:6, border:`1px solid ${T.redBrd}`, background:"transparent", color:T.red, fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.6 }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                      onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── TAB 5: FOLDER ── */}
              {tab === 5 && (
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
