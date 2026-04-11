// src/app/certificates/crane-inspection/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const IS  = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:40 };
const LS  = { fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, display:"block", marginBottom:6 };

const INSPECTOR_NAME = "Moemedi Masupe";
const INSPECTOR_ID   = "700117910";

const CRANE_TYPES = [
  "Mobile Crane","Tower Crane","Overhead Crane","Gantry Crane",
  "Crawler Crane","Truck Mounted Crane","Knuckle Boom Crane",
  "Telescopic Crane","Rough Terrain Crane","All Terrain Crane",
];

const STEPS = [
  { id:1, label:"Crane Details",     icon:"🏗" },
  { id:2, label:"Crane Inspection",  icon:"🔍" },
  { id:3, label:"Boom",              icon:"📐" },
  { id:4, label:"Hook",              icon:"🪝" },
  { id:5, label:"Rope",              icon:"🪢" },
  { id:6, label:"Pressure Vessels",  icon:"⚙️" },
  { id:7, label:"Review & Generate", icon:"📜" },
];

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function ResultSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={IS}>
      <option value="PASS">Pass</option>
      <option value="FAIL">Fail</option>
      <option value="CONDITIONAL">Conditional</option>
      <option value="REPAIR_REQUIRED">Repair Required</option>
    </select>
  );
}

function ResultBadge({ result }) {
  const s = result === "PASS" ? { c:T.green, bg:T.greenDim, brd:T.greenBrd, l:"Pass" }
          : result === "FAIL" ? { c:T.red,   bg:T.redDim,   brd:T.redBrd,   l:"Fail" }
          : { c:T.amber, bg:T.amberDim, brd:T.amberBrd, l: result === "REPAIR_REQUIRED" ? "Repair Required" : "Conditional" };
  return <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:800, background:s.bg, border:`1px solid ${s.brd}`, color:s.c }}>{s.l}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, icon, color=T.accent, brd, children }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${brd||T.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:14, fontWeight:800, color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StepBar({ current }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:24, overflowX:"auto", WebkitOverflowScrolling:"touch", gap:0 }}>
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:900, flexShrink:0,
                background: done ? T.green : active ? T.accent : T.card,
                border: `2px solid ${done ? T.green : active ? T.accent : T.border}`,
                color: (done || active) ? "#052e16" : T.textDim,
                transition:"all .2s",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:700, color: active ? T.accent : done ? T.green : T.textDim, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height:2, width:24, background: done ? T.green : T.border, marginBottom:20, flexShrink:0 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyPV = () => ({ sn:"", description:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"" });

export default function CraneInspectionPage() {
  const router = useRouter();
  const [step,      setStep]      = useState(1);
  const [clients,   setClients]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(null);
  const [error,     setError]     = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [crane, setCrane] = useState({
    client_id:"", client_name:"", client_location:"",
    crane_type:"Mobile Crane", model:"", serial_number:"",
    fleet_number:"", registration_number:"", swl:"",
    machine_hours:"",
    inspection_date: new Date().toISOString().split("T")[0],
    notes:"",
  });

  const [craneInsp, setCraneInsp] = useState({
    structural_result:"PASS", boom_condition:"PASS", outriggers:"PASS",
    crane_computer:"PASS", test_load:"", defects:"", recommendations:"", result:"PASS",
  });

  const [boom, setBoom] = useState({
    min_radius:"", max_radius:"", min_boom_length:"", max_boom_length:"",
    actual_boom_length:"", extended_boom_length:"",
    jib_fitted:"no", jib_length:"", jib_angle:"",
    swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"",
    boom_angle:"", load_tested_at_radius:"", test_load:"",
    luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS",
    boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS",
    anemometer:"PASS", lmi_test:"PASS", anti_two_block:"PASS",
    sli_make_model:"", hook_block_reeving:"",
    c1_boom_length:"", c1_angle:"", c1_radius:"", c1_rated:"", c1_test:"", c1_hook_weight:"",
    c2_boom_length:"", c2_angle:"", c2_radius:"", c2_rated:"", c2_test:"", c2_hook_weight:"",
    c3_boom_length:"", c3_angle:"", c3_radius:"", c3_rated:"", c3_test:"", c3_hook_weight:"",
    hook_ab:"", hook_ac:"", hook2_ab:"", hook2_ac:"", hook3_ab:"", hook3_ac:"",
    notes:"",
  });

  const [hook, setHook] = useState({
    serial_number:"", swl:"", latch_condition:"PASS",
    structural_result:"PASS", wear_percentage:"", result:"PASS", notes:"",
    hook2_serial:"", hook2_swl:"", hook3_serial:"", hook3_swl:"",
  });

  const [rope, setRope] = useState({
    diameter:"", rope_type:"Wire Rope",
    broken_wires:"0", corrosion:"none", kinks:"none",
    length_3x_windings:"yes", core_protrusion:"None",
    damaged_strands:"none", end_fittings:"Good",
    reduction_dia:"none", other_defects:"none",
    serviceability:"Good", lower_limit:"yes",
    drum_condition:"Good", rope_lay:"Good",
    aux_diameter:"", aux_broken_wires:"0", aux_corrosion:"none", aux_kinks:"none",
    aux_length_3x_windings:"yes", aux_core_protrusion:"None",
    aux_damaged_strands:"none", aux_end_fittings:"Good",
    aux_reduction_dia:"none", aux_other_defects:"none",
    aux_serviceability:"Good", aux_lower_limit:"yes",
    aux_drum_condition:"Good", aux_rope_lay:"Good",
    result:"PASS", notes:"",
  });

  const [pvs, setPvs] = useState([emptyPV()]);

  useEffect(() => {
    supabase.from("clients").select("id,company_name,company_code,city,contact_person").order("company_name")
      .then(({ data, error }) => {
        if(error) console.error("clients fetch error:", error.message);
        setClients(data || []);
      });
  }, []);

  const uc  = (k,v) => setCrane(p => ({ ...p, [k]:v }));
  const uci = (k,v) => setCraneInsp(p => ({ ...p, [k]:v }));
  const ub  = (k,v) => setBoom(p => ({ ...p, [k]:v }));
  const uh  = (k,v) => setHook(p => ({ ...p, [k]:v }));
  const ur  = (k,v) => setRope(p => ({ ...p, [k]:v }));
  const upv = (i,k,v) => setPvs(p => p.map((x,j) => j===i ? { ...x, [k]:v } : x));

  function clientSelected(id) {
    const c = clients.find(x => x.id === id);
    setCrane(p => ({ ...p, client_id:id, client_name:c?.company_name||"", client_location:c?.city||"" }));
  }

  function canNext() {
    if (step === 1) return crane.client_id && crane.serial_number && crane.crane_type && crane.inspection_date;
    return true;
  }

  function generateCompanyCode(name) {
    const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
    const rand = String(Math.floor(Math.random()*900)+100);
    return `${initials}-${rand}`;
  }

  async function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function extractCraneDataFromImage(base64, mimeType) {
    const res = await fetch("/api/ai/extract-crane", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mimeType }),
    });
    if (!res.ok) throw new Error("API error " + res.status);
    return await res.json();
  }

  async function ensureClient(name, city) {
    if (!name || !name.trim()) return;
    const { data: existing } = await supabase.from("clients")
      .select("id").ilike("company_name", name.trim()).maybeSingle();
    if (!existing) {
      await supabase.from("clients").insert({
        company_name:   name.trim(),
        company_code:   generateCompanyCode(name),
        city:           city || "",
        country:        "Botswana",
        status:         "active",
      });
    }
  }

  async function handleImport(file) {
    if (!file) return;
    setImporting(true); setImportMsg("Reading handwritten notes…");
    try {
      const base64  = await toBase64(file);
      const mime    = file.type || "image/jpeg";
      setImportMsg("Extracting data with AI…");
      const d = await extractCraneDataFromImage(base64, mime);

      if (d.crane_serial_number) uc("serial_number",       d.crane_serial_number);
      if (d.crane_fleet_number)  uc("fleet_number",        d.crane_fleet_number);
      if (d.crane_registration)  uc("registration_number", d.crane_registration);
      if (d.crane_model)         uc("model",               d.crane_model);
      if (d.crane_swl)           uc("swl",                 d.crane_swl);
      if (d.machine_hours)       uc("machine_hours",       d.machine_hours);
      if (d.overall_result)      uci("result",   d.overall_result);
      if (d.defects)             uci("defects",  d.defects);
      if (d.boom_test_load)      uci("test_load", d.boom_test_load);
      if (d.crane_computer_status === "FAIL") {
        uci("crane_computer", "FAIL"); uci("result", "FAIL");
        if (d.crane_computer_notes) uci("defects", d.crane_computer_notes);
      }
      if (d.boom_actual_length)   { ub("actual_boom_length", d.boom_actual_length); ub("c2_boom_length", d.boom_actual_length); }
      if (d.boom_extended_length)   ub("extended_boom_length", d.boom_extended_length);
      if (d.boom_radius)          { ub("load_tested_at_radius", d.boom_radius); ub("c2_radius", d.boom_radius); }
      if (d.boom_angle)           { ub("boom_angle", d.boom_angle); ub("c2_angle", d.boom_angle); }
      if (d.boom_swl_at_config)   { ub("swl_at_actual_config", d.boom_swl_at_config); ub("c2_rated", d.boom_swl_at_config); }
      if (d.boom_test_load)       { ub("test_load", d.boom_test_load); ub("c2_test", d.boom_test_load); }
      if (d.crane_computer_status === "FAIL") ub("lmi_test", "FAIL");
      if (d.hook_swl)    uh("swl",           d.hook_swl);
      if (d.hook_serial) uh("serial_number", d.hook_serial);
      if (d.rope_diameter) ur("diameter", d.rope_diameter);
      if (d.pressure_vessels?.length > 0) {
        setPvs(d.pressure_vessels.map(pv => ({
          sn: pv.sn||"", description: pv.description||"",
          capacity: pv.capacity||"", working_pressure: pv.working_pressure||"",
          test_pressure: "", pressure_unit: pv.pressure_unit||"kPa",
          result: pv.result||"PASS", notes: "",
        })));
      }
      const count = (d.pressure_vessels?.length||0) + (d.crane_serial_number?1:0) + (d.boom_actual_length?1:0);
      setImportMsg(`✓ Extracted ${count} data points — review and complete any missing fields`);
    } catch(e) {
      console.error(e);
      setImportMsg("⚠ Could not read image — please fill in manually");
    }
    setImporting(false);
  }

  // ── FIXED SEQUENCE GENERATOR ─────────────────────────────────────────────
  // Uses the highest existing cert number suffix — never count(*) which breaks on deletions
  async function getNextSeq() {
    try {
      const { data } = await supabase
        .from("certificates")
        .select("certificate_number")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return 1;

      let max = 0;
      for (const row of data) {
        const match = (row.certificate_number || "").match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > max) max = n;
        }
      }
      return max + 1;
    } catch {
      // Fallback: timestamp-based suffix guarantees uniqueness
      return parseInt(String(Date.now()).slice(-6), 10);
    }
  }

  async function handleGenerate() {
    if (!crane.client_id || !crane.serial_number) { setError("Please fill crane serial number and client."); return; }
    setSaving(true); setError("");

    await ensureClient(crane.client_name, crane.client_location);

    const craneData = { ...crane };
    if (!craneData.serial_number?.trim()) {
      const cc = (craneData.client_name||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
      craneData.serial_number = `${cc}-CRN-${String(Date.now()).slice(-6)}`;
    }

    const folderId   = crypto.randomUUID();
    const folderName = `Crane-${crane.serial_number}-${crane.inspection_date}`;
    const iDate      = crane.inspection_date;
    const exp1yr     = addMonths(iDate, 12);
    const exp6mo     = addMonths(iDate, 6);
    const certs      = [];

    const pad = n => String(n).padStart(5, "0");

    // ✅ FIXED: get highest existing number, not row count
    let seq = await getNextSeq();
    const nextNo = (prefix) => `CERT-${prefix}${pad(seq++)}`;

    const c1_boom   = boom.c1_boom_length || boom.min_boom_length || "";
    const c1_angle  = boom.c1_angle || "";
    const c1_radius = boom.c1_radius || boom.min_radius || "";
    const c1_rated  = boom.c1_rated || boom.swl_at_min_radius || "";
    const c1_test   = boom.c1_test || "";
    const c1_hw     = boom.c1_hook_weight || "";
    const c2_boom   = boom.c2_boom_length || boom.actual_boom_length || "";
    const c2_angle  = boom.c2_angle || boom.boom_angle || "";
    const c2_radius = boom.c2_radius || boom.load_tested_at_radius || "";
    const c2_rated  = boom.c2_rated || boom.swl_at_actual_config || "";
    const c2_test   = boom.c2_test || boom.test_load || "";
    const c2_hw     = boom.c2_hook_weight || "";
    const c3_boom   = boom.c3_boom_length || boom.max_boom_length || "";
    const c3_angle  = boom.c3_angle || "";
    const c3_radius = boom.c3_radius || boom.max_radius || "";
    const c3_rated  = boom.c3_rated || boom.swl_at_max_radius || "";
    const c3_test   = boom.c3_test || "";
    const c3_hw     = boom.c3_hook_weight || "";

    // ── 1. CRANE ─────────────────────────────────────────────────────────
    certs.push({
      certificate_number: nextNo("CR"),
      equipment_type: craneData.crane_type,
      equipment_description: [
        craneData.crane_type, craneData.model,
        craneData.swl ? `SWL ${craneData.swl}` : "",
        craneData.fleet_number        ? `Fleet ${craneData.fleet_number}`      : "",
        craneData.registration_number ? `Reg ${craneData.registration_number}` : "",
      ].filter(Boolean).join(" "),
      serial_number:        craneData.serial_number,
      fleet_number:         craneData.fleet_number,
      registration_number:  craneData.registration_number,
      model:                craneData.model,
      swl:                  craneData.swl,
      client_name:          craneData.client_name,
      client_id:            craneData.client_id,
      location:             craneData.client_location,
      issue_date:           iDate, inspection_date: iDate,
      expiry_date:          exp1yr, next_inspection_due: exp1yr,
      result:               craneInsp.result,
      defects_found:        craneInsp.defects,
      recommendations:      craneInsp.recommendations,
      inspector_name:       INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type:     "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 1,
      notes: [
        `Structural: ${craneInsp.structural_result}`, `Boom: ${craneInsp.boom_condition}`,
        `Outriggers: ${craneInsp.outriggers}`, `Computer: ${craneInsp.crane_computer}`,
        craneData.machine_hours ? `Machine Hours: ${craneData.machine_hours}` : "",
        craneInsp.test_load     ? `Crane test load: ${craneInsp.test_load}`   : "",
        c1_boom   ? `C1 boom: ${c1_boom}m`     : "", c1_angle  ? `C1 angle: ${c1_angle}`    : "",
        c1_radius ? `C1 radius: ${c1_radius}m` : "", c1_rated  ? `C1 rated: ${c1_rated}`    : "",
        c1_test   ? `C1 test: ${c1_test}T`     : "", c1_hw     ? `C1 hook weight: ${c1_hw}` : "",
        c2_boom   ? `C2 boom: ${c2_boom}m`     : "", c2_angle  ? `C2 angle: ${c2_angle}`    : "",
        c2_radius ? `C2 radius: ${c2_radius}m` : "", c2_rated  ? `C2 rated: ${c2_rated}`    : "",
        c2_test   ? `C2 test: ${c2_test}T`     : "", c2_hw     ? `C2 hook weight: ${c2_hw}` : "",
        c3_boom   ? `C3 boom: ${c3_boom}m`     : "", c3_angle  ? `C3 angle: ${c3_angle}`    : "",
        c3_radius ? `C3 radius: ${c3_radius}m` : "", c3_rated  ? `C3 rated: ${c3_rated}`    : "",
        c3_test   ? `C3 test: ${c3_test}T`     : "", c3_hw     ? `C3 hook weight: ${c3_hw}` : "",
        boom.jib_fitted === "yes" && boom.jib_length ? `Jib: ${boom.jib_length}m @ ${boom.jib_angle}°` : "",
        boom.sli_make_model     ? `SLI model: ${boom.sli_make_model}`   : "",
        boom.hook_block_reeving ? `Reeving: ${boom.hook_block_reeving}` : "",
        boom.lmi_test !== "PASS" ? `SLI: ${boom.lmi_test}` : "SLI: PASS",
        `Operating code: MAIN/AUX-FULL OUTRIGGER-360DEG`, `Counterweights: STD FITTED`,
        craneData.notes ? `Notes: ${craneData.notes}` : "",
      ].filter(Boolean).join(" | "),
    });

    // ── 2. BOOM ──────────────────────────────────────────────────────────
    certs.push({
      certificate_number: nextNo("BM"),
      equipment_type: "Crane Boom",
      equipment_description: [
        craneData.crane_type || "Mobile Crane",
        c2_boom ? `Boom ${c2_boom}m` : boom.actual_boom_length ? `Boom ${boom.actual_boom_length}m` : "",
        boom.extended_boom_length ? `ext ${boom.extended_boom_length}m` : "",
        c2_angle ? `@ ${c2_angle}°` : boom.boom_angle ? `@ ${boom.boom_angle}°` : "",
        c2_rated ? `SWL ${c2_rated}` : craneData.swl ? `SWL ${craneData.swl}` : "",
        `SN ${craneData.serial_number}`,
      ].filter(Boolean).join(" — "),
      serial_number: craneData.serial_number, fleet_number: craneData.fleet_number,
      model: craneData.model, swl: c2_rated || boom.swl_at_actual_config || craneData.swl,
      client_name: craneData.client_name, client_id: craneData.client_id,
      location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate,
      expiry_date: exp1yr, next_inspection_due: exp1yr,
      result: (boom.boom_structure === "FAIL" || boom.lmi_test === "FAIL") ? "FAIL" : craneInsp.result,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 2,
      notes: [
        c2_boom ? `Actual length: ${c2_boom}m` : boom.actual_boom_length ? `Actual length: ${boom.actual_boom_length}m` : "",
        boom.extended_boom_length ? `Extended: ${boom.extended_boom_length}m` : "",
        c1_boom ? `Min length: ${c1_boom}m` : boom.min_boom_length ? `Min length: ${boom.min_boom_length}m` : "",
        c3_boom ? `Max length: ${c3_boom}m` : boom.max_boom_length ? `Max length: ${boom.max_boom_length}m` : "",
        c2_angle ? `Angle: ${c2_angle}°` : boom.boom_angle ? `Angle: ${boom.boom_angle}°` : "",
        boom.jib_fitted === "yes" && boom.jib_length ? `Jib: ${boom.jib_length}m @ ${boom.jib_angle}°` : "",
        c1_radius ? `Min radius: ${c1_radius}m` : boom.min_radius ? `Min radius: ${boom.min_radius}m` : "",
        c3_radius ? `Max radius: ${c3_radius}m` : boom.max_radius ? `Max radius: ${boom.max_radius}m` : "",
        c2_radius ? `Test radius: ${c2_radius}m` : boom.load_tested_at_radius ? `Test radius: ${boom.load_tested_at_radius}m` : "",
        c1_rated ? `SWL@min: ${c1_rated}` : boom.swl_at_min_radius ? `SWL@min: ${boom.swl_at_min_radius}` : "",
        c3_rated ? `SWL@max: ${c3_rated}` : boom.swl_at_max_radius ? `SWL@max: ${boom.swl_at_max_radius}` : "",
        c2_rated ? `SWL@config: ${c2_rated}` : boom.swl_at_actual_config ? `SWL@config: ${boom.swl_at_actual_config}` : "",
        c2_test ? `Test load: ${c2_test}T` : boom.test_load ? `Test load: ${boom.test_load}T` : "",
        `Boom structure: ${boom.boom_structure}`, `Boom pins: ${boom.boom_pins}`,
        `Luffing: ${boom.luffing_system}`, `Slew: ${boom.slew_system}`, `Hoist: ${boom.hoist_system}`,
        `LMI: ${boom.lmi_test}`, `Anti-two-block: ${boom.anti_two_block}`, `Anemometer: ${boom.anemometer}`,
        boom.notes ? `Notes: ${boom.notes}` : "",
      ].filter(Boolean).join(" | "),
    });

    // ── 3. HOOK ──────────────────────────────────────────────────────────
    certs.push({
      certificate_number: nextNo("HK"),
      equipment_type: "Crane Hook",
      equipment_description: `Crane Hook & Wire Rope — SWL ${hook.swl || craneData.swl} — ${craneData.crane_type} SN ${craneData.serial_number}`,
      serial_number: hook.serial_number || craneData.serial_number,
      swl: hook.swl || craneData.swl,
      client_name: craneData.client_name, client_id: craneData.client_id,
      location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate,
      expiry_date: exp6mo, next_inspection_due: exp6mo,
      result: hook.result,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 3,
      notes: [
        `Latch: ${hook.latch_condition}`, `Structural: ${hook.structural_result}`,
        hook.wear_percentage ? `Wear: ${hook.wear_percentage}`    : "",
        hook.swl             ? `Hook 1 SWL: ${hook.swl}`          : "",
        hook.serial_number   ? `Hook 1 SN: ${hook.serial_number}` : "",
        boom.hook_ab  ? `Hook AB: ${boom.hook_ab}`   : "", boom.hook_ac  ? `Hook AC: ${boom.hook_ac}`   : "",
        hook.hook2_swl    ? `Hook 2 SWL: ${hook.hook2_swl}`   : "", hook.hook2_serial ? `Hook 2 SN: ${hook.hook2_serial}`  : "",
        boom.hook2_ab ? `Hook 2 AB: ${boom.hook2_ab}` : "", boom.hook2_ac ? `Hook 2 AC: ${boom.hook2_ac}` : "",
        hook.hook3_swl    ? `Hook 3 SWL: ${hook.hook3_swl}`   : "", hook.hook3_serial ? `Hook 3 SN: ${hook.hook3_serial}`  : "",
        boom.hook3_ab ? `Hook 3 AB: ${boom.hook3_ab}` : "", boom.hook3_ac ? `Hook 3 AC: ${boom.hook3_ac}` : "",
        rope.diameter        ? `Rope dia: ${rope.diameter}mm`           : "",
        `Broken wires: ${rope.broken_wires}`, `Corrosion: ${rope.corrosion}`, `Kinks: ${rope.kinks}`,
        rope.reduction_dia      ? `Reduction dia: ${rope.reduction_dia}`       : "",
        rope.core_protrusion    ? `Core protrusion: ${rope.core_protrusion}`   : "",
        rope.damaged_strands    ? `Damaged strands: ${rope.damaged_strands}`   : "",
        rope.end_fittings       ? `End fittings: ${rope.end_fittings}`         : "",
        rope.other_defects      ? `Other defects: ${rope.other_defects}`       : "",
        rope.serviceability     ? `Serviceability: ${rope.serviceability}`     : "",
        rope.lower_limit        ? `Lower limit: ${rope.lower_limit}`           : "",
        rope.length_3x_windings ? `3x windings: ${rope.length_3x_windings}`   : "",
        rope.drum_condition     ? `Drum condition: ${rope.drum_condition}`     : "",
        rope.rope_lay           ? `Rope lay: ${rope.rope_lay}`                 : "",
        rope.aux_diameter       ? `Aux rope dia: ${rope.aux_diameter}mm`       : "",
        `Aux broken wires: ${rope.aux_broken_wires}`, `Aux corrosion: ${rope.aux_corrosion}`, `Aux kinks: ${rope.aux_kinks}`,
        rope.aux_reduction_dia      ? `Aux reduction dia: ${rope.aux_reduction_dia}`     : "",
        rope.aux_core_protrusion    ? `Aux core protrusion: ${rope.aux_core_protrusion}` : "",
        rope.aux_damaged_strands    ? `Aux damaged strands: ${rope.aux_damaged_strands}` : "",
        rope.aux_end_fittings       ? `Aux end fittings: ${rope.aux_end_fittings}`       : "",
        rope.aux_other_defects      ? `Aux other defects: ${rope.aux_other_defects}`     : "",
        rope.aux_serviceability     ? `Aux serviceability: ${rope.aux_serviceability}`   : "",
        rope.aux_lower_limit        ? `Aux lower limit: ${rope.aux_lower_limit}`         : "",
        rope.aux_length_3x_windings ? `Aux 3x windings: ${rope.aux_length_3x_windings}` : "",
        rope.aux_drum_condition     ? `Aux drum condition: ${rope.aux_drum_condition}`   : "",
        rope.aux_rope_lay           ? `Aux rope lay: ${rope.aux_rope_lay}`               : "",
        hook.notes ? `Notes: ${hook.notes}`      : "",
        rope.notes ? `Rope notes: ${rope.notes}` : "",
      ].filter(Boolean).join(" | "),
    });

    // ── 4. ROPE ──────────────────────────────────────────────────────────
    certs.push({
      certificate_number: nextNo("RP"),
      equipment_type: "Wire Rope",
      equipment_description: [rope.rope_type, rope.diameter ? `Ø${rope.diameter}mm` : "", `— ${craneData.crane_type} SN ${craneData.serial_number}`].filter(Boolean).join(" "),
      serial_number: craneData.serial_number, capacity_volume: rope.diameter ? `Ø${rope.diameter}mm` : "",
      swl: craneData.swl, client_name: craneData.client_name, client_id: craneData.client_id,
      location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate,
      expiry_date: exp6mo, next_inspection_due: exp6mo,
      result: rope.result,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 4,
      notes: [
        rope.diameter ? `Rope dia: ${rope.diameter}mm` : "",
        `Broken wires: ${rope.broken_wires}`, `Corrosion: ${rope.corrosion}`, `Kinks: ${rope.kinks}`,
        rope.notes ? `Notes: ${rope.notes}` : "",
      ].filter(Boolean).join(" | "),
    });

    // ── 5. PRESSURE VESSELS ───────────────────────────────────────────────
    for (let i = 0; i < pvs.length; i++) {
      const pv = pvs[i];
      if (!pv.sn && !pv.description) continue;
      certs.push({
        certificate_number: nextNo("PV"),
        equipment_type: "Pressure Vessel",
        equipment_description: pv.description || `Pressure Vessel ${i + 1} — ${craneData.crane_type} SN ${craneData.serial_number}`,
        serial_number: pv.sn, capacity_volume: pv.capacity,
        working_pressure: pv.working_pressure, mawp: pv.working_pressure,
        test_pressure: pv.test_pressure, pressure_unit: pv.pressure_unit,
        client_name: craneData.client_name, client_id: craneData.client_id,
        location: craneData.client_location,
        issue_date: iDate, inspection_date: iDate,
        expiry_date: exp1yr, next_inspection_due: exp1yr,
        result: pv.result, defects_found: pv.notes,
        inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
        certificate_type: "Pressure Test Certificate",
        folder_id: folderId, folder_name: folderName, folder_position: 5 + i,
      });
    }

    // ── INSERT with duplicate-safe retry ─────────────────────────────────
    const { data, error: dbErr } = await supabase
      .from("certificates").insert(certs)
      .select("id,certificate_number,equipment_type,result,expiry_date");

    if (dbErr) {
      if (dbErr.code === "23505") {
        // Race condition fallback — rebuild numbers with timestamp suffix
        const ts = String(Date.now()).slice(-7);
        const prefixes = ["CR","BM","HK","RP"];
        certs.slice(0, 4).forEach((cert, i) => { cert.certificate_number = `CERT-${prefixes[i]}T${ts}${i}`; });
        certs.slice(4).forEach((cert, i)  => { cert.certificate_number = `CERT-PVT${ts}${i}`; });
        const { data: retryData, error: retryErr } = await supabase
          .from("certificates").insert(certs)
          .select("id,certificate_number,equipment_type,result,expiry_date");
        if (retryErr) { setError("Failed to save: " + retryErr.message); setSaving(false); return; }
        setSaved({ folderName, folderId, certs: retryData });
        setSaving(false);
        return;
      }
      setError("Failed to save: " + dbErr.message);
      setSaving(false);
      return;
    }

    setSaved({ folderName, folderId, certs: data });
    setSaving(false);
  }

  // ── SAVED STATE ──────────────────────────────────────────────────────────
  if (saved) return (
    <AppLayout title="Crane Inspection — Complete">
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:800, margin:"0 auto" }}>
        <div style={{ background:T.greenDim, border:`1px solid ${T.greenBrd}`, borderRadius:18, padding:28, textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:900, color:T.green, marginBottom:6 }}>Crane Inspection Complete</div>
          <div style={{ fontSize:14, color:T.textMid, marginBottom:4 }}>{saved.certs.length} certificates generated and saved</div>
          <div style={{ fontSize:12, color:T.textDim }}>Folder: {saved.folderName}</div>
        </div>
        <div style={{ display:"grid", gap:10, marginBottom:20 }}>
          {saved.certs.map(c => (
            <div key={c.id} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{c.certificate_number}</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>{c.equipment_type} · Expires {fmt(c.expiry_date)}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <ResultBadge result={c.result}/>
                <button type="button" onClick={() => window.open(`/certificates/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.accentBrd}`, background:T.accentDim, color:T.accent, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View →</button>
                <button type="button" onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Print</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button type="button" onClick={() => { setSaved(null); setStep(1); }}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.text, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            New Inspection
          </button>
          <button type="button" onClick={() => router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            View All Certificates →
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── WIZARD ───────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Crane Inspection">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        textarea{resize:vertical}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px}
        @media(max-width:640px){.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}}
      `}</style>
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:900, margin:"0 auto" }}>

        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · New Inspection</div>
          <h1 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>Crane Inspection Wizard</h1>
          <p style={{ margin:0, fontSize:12, color:T.textDim }}>Generates certificates for crane, boom, hook, rope and all pressure vessels in one session</p>
          <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
            <a href="/certificates" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>📜 View All Certificates →</a>
            <a href="/clients" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>🏢 Clients →</a>
            <a href="/certificates/import" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>🤖 AI Import →</a>
          </div>
        </div>

        <StepBar current={step}/>
        {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:700, marginBottom:16 }}>⚠ {error}</div>}

        {step === 1 && (
          <div style={{ background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.purple, marginBottom:3 }}>📷 Import from Handwritten Note</div>
              <div style={{ fontSize:11, color:T.textDim }}>Snap a photo of your handwritten inspection notes — AI auto-fills all form fields</div>
              {importMsg && <div style={{ fontSize:12, fontWeight:700, marginTop:6, color: importMsg.startsWith("✓")?T.green:importMsg.startsWith("⚠")?T.red:T.amber }}>{importMsg}</div>}
            </div>
            <label style={{ cursor:"pointer", flexShrink:0 }}>
              <input type="file" accept="image/*" capture="environment" style={{ display:"none" }}
                onChange={async e => { const f = e.target.files?.[0]; if(f) await handleImport(f); e.target.value=""; }}/>
              <div style={{ padding:"10px 18px", borderRadius:10, background:importing?T.card:"linear-gradient(135deg,#a78bfa,#7c3aed)", color:importing?T.textDim:"#fff", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:8, opacity:importing?0.6:1 }}>
                {importing ? "🔄 Reading…" : "📷 Choose / Take Photo"}
              </div>
            </label>
          </div>
        )}

        {step === 1 && (
          <>
            <SectionCard title="Crane Identification" icon="🏗" color={T.accent} brd={T.accentBrd}>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Client">
                  <select style={IS} value={crane.client_id} onChange={e => clientSelected(e.target.value)}>
                    <option value="">— Select Client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}{c.city ? " — " + c.city : ""}</option>)}
                  </select>
                  {clients.length === 0 && <div style={{fontSize:11,color:T.amber,marginTop:5}}>No clients found. <a href="/clients/register" target="_blank" style={{color:T.accent}}>Register a client first →</a></div>}
                  {clients.length > 0 && <div style={{fontSize:11,color:T.textDim,marginTop:5}}>Client not listed? <a href="/clients/register" target="_blank" style={{color:T.accent,textDecoration:"none",fontWeight:700}}>+ Register new client</a> <span style={{color:T.textDim}}>(then refresh this page)</span></div>}
                </Field>
                <Field label="Inspection Date"><input style={IS} type="date" value={crane.inspection_date} onChange={e => uc("inspection_date", e.target.value)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Crane Type">
                  <select style={IS} value={crane.crane_type} onChange={e => uc("crane_type", e.target.value)}>
                    {CRANE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Model / Make"><input style={IS} placeholder="e.g. TADANO GR-300EX" value={crane.model} onChange={e => uc("model", e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Serial Number *"><input style={IS} placeholder="e.g. GR-300EX" value={crane.serial_number} onChange={e => uc("serial_number", e.target.value)}/></Field>
                <Field label="Fleet Number"><input style={IS} placeholder="e.g. B064" value={crane.fleet_number} onChange={e => uc("fleet_number", e.target.value)}/></Field>
                <Field label="Registration Number"><input style={IS} placeholder="e.g. B 123 ABC" value={crane.registration_number} onChange={e => uc("registration_number", e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Safe Working Load (SWL)"><input style={IS} placeholder="e.g. 30 TON" value={crane.swl} onChange={e => uc("swl", e.target.value)}/></Field>
                <Field label="Machine Hours"><input style={IS} placeholder="e.g. 65495" value={crane.machine_hours} onChange={e => uc("machine_hours", e.target.value)}/></Field>
                <Field label="Client City / Site"><input style={IS} placeholder="Auto-filled from client" value={crane.client_location} onChange={e => uc("client_location", e.target.value)}/></Field>
              </div>
              <Field label="General Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Any general notes about the crane..." value={crane.notes} onChange={e => uc("notes", e.target.value)}/></Field>
            </SectionCard>
            {crane.inspection_date && (
              <div style={{ background:T.accentDim, border:`1px solid ${T.accentBrd}`, borderRadius:12, padding:"12px 16px", display:"flex", gap:20, flexWrap:"wrap", fontSize:12, color:T.textMid }}>
                <div>📅 <strong style={{ color:T.text }}>Crane + Boom + Pressure Vessels expire:</strong> {fmt(addMonths(crane.inspection_date, 12))} <span style={{ color:T.textDim }}>(1 year)</span></div>
                <div>📅 <strong style={{ color:T.text }}>Hook + Rope expire:</strong> {fmt(addMonths(crane.inspection_date, 6))} <span style={{ color:T.textDim }}>(6 months)</span></div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <SectionCard title="Crane Structural & Computer Inspection" icon="🔍" color={T.blue} brd={T.blueBrd}>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Structural Integrity"><ResultSelect value={craneInsp.structural_result} onChange={v => uci("structural_result", v)}/></Field>
              <Field label="Boom Condition"><ResultSelect value={craneInsp.boom_condition} onChange={v => uci("boom_condition", v)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Outriggers"><ResultSelect value={craneInsp.outriggers} onChange={v => uci("outriggers", v)}/></Field>
              <Field label="Crane Computer / LMI"><ResultSelect value={craneInsp.crane_computer} onChange={v => uci("crane_computer", v)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Test Load Applied (Tonnes)"><input style={IS} placeholder="e.g. 110" value={craneInsp.test_load} onChange={e => uci("test_load", e.target.value)}/></Field>
              <Field label="Overall Crane Result"><ResultSelect value={craneInsp.result} onChange={v => uci("result", v)}/></Field>
            </div>
            <div className="g2">
              <Field label="Defects Found"><textarea style={{ ...IS, minHeight:80 }} placeholder="Describe any defects..." value={craneInsp.defects} onChange={e => uci("defects", e.target.value)}/></Field>
              <Field label="Recommendations"><textarea style={{ ...IS, minHeight:80 }} placeholder="Recommendations..." value={craneInsp.recommendations} onChange={e => uci("recommendations", e.target.value)}/></Field>
            </div>
          </SectionCard>
        )}

        {step === 3 && (
          <>
            <SectionCard title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>
              <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Boom Geometry</div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 10.3" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></Field>
                <Field label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 26.1" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></Field>
                <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 18.2" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 28" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
                <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 70" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
                <Field label="Jib Fitted"><select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></Field>
              </div>
              {boom.jib_fitted === "yes" && (
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Jib Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.jib_length} onChange={e=>ub("jib_length",e.target.value)}/></Field>
                  <Field label="Jib Angle (°)"><input style={IS} placeholder="e.g. 30" value={boom.jib_angle} onChange={e=>ub("jib_angle",e.target.value)}/></Field>
                </div>
              )}
              <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Working Radius & SWL</div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Min Radius (m)"><input style={IS} placeholder="e.g. 3" value={boom.min_radius} onChange={e=>ub("min_radius",e.target.value)}/></Field>
                <Field label="Max Radius (m)"><input style={IS} placeholder="e.g. 24" value={boom.max_radius} onChange={e=>ub("max_radius",e.target.value)}/></Field>
                <Field label="Test Radius (m)"><input style={IS} placeholder="e.g. 8" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="SWL at Min Radius"><input style={IS} placeholder="e.g. 10.9T" value={boom.swl_at_min_radius} onChange={e=>ub("swl_at_min_radius",e.target.value)}/></Field>
                <Field label="SWL at Max Radius"><input style={IS} placeholder="e.g. 1.5T" value={boom.swl_at_max_radius} onChange={e=>ub("swl_at_max_radius",e.target.value)}/></Field>
                <Field label="SWL at Test Config"><input style={IS} placeholder="e.g. 11.2T" value={boom.swl_at_actual_config} onChange={e=>ub("swl_at_actual_config",e.target.value)}/></Field>
              </div>
              <div style={{ marginBottom:14 }}>
                <Field label="Load Test Applied (Tonnes) — 110% of SWL at test config">
                  <input style={IS} placeholder="e.g. 9.0" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/>
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Load Test — 3 Configurations" icon="📊" color={T.amber} brd={T.amberBrd}>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:14 }}>Config 1 = Short/Min boom · Config 2 = Test/Main config · Config 3 = Max/Aux boom</div>
              <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:8, marginBottom:6 }}>
                <div/>
                <div style={{ fontSize:10, fontWeight:800, color:T.amber, textAlign:"center", textTransform:"uppercase" }}>Config 1 — Main (Short)</div>
                <div style={{ fontSize:10, fontWeight:800, color:T.accent, textAlign:"center", textTransform:"uppercase" }}>Config 2 — Main (Test)</div>
                <div style={{ fontSize:10, fontWeight:800, color:T.green, textAlign:"center", textTransform:"uppercase" }}>Config 3 — Aux</div>
              </div>
              {[
                { label:"Boom Length (m)", keys:["c1_boom_length","c2_boom_length","c3_boom_length"], ph:["10.3","18.2","26.1"] },
                { label:"Boom Angle (°)",  keys:["c1_angle","c2_angle","c3_angle"],                  ph:["70","70.3","50"] },
                { label:"Radius (m)",      keys:["c1_radius","c2_radius","c3_radius"],               ph:["8.0","8.0","24.0"] },
                { label:"Rated Load",      keys:["c1_rated","c2_rated","c3_rated"],                  ph:["10.9T","11.2T","1.5T"] },
                { label:"Test Load",       keys:["c1_test","c2_test","c3_test"],                     ph:["8.2T","9.0T","1.2T"] },
                { label:"Hook Block Wt",   keys:["c1_hook_weight","c2_hook_weight","c3_hook_weight"],ph:["0.25T","0.25T","0.055T"] },
              ].map(row => (
                <div key={row.label} style={{ display:"grid", gridTemplateColumns:"140px 1fr 1fr 1fr", gap:8, marginBottom:10, alignItems:"center" }}>
                  <label style={{ ...LS, marginBottom:0, fontSize:9 }}>{row.label}</label>
                  {row.keys.map((k,i) => <input key={k} style={{ ...IS, minHeight:36, padding:"8px 10px", fontSize:12 }} placeholder={row.ph[i]} value={boom[k]} onChange={e=>ub(k,e.target.value)}/>)}
                </div>
              ))}
            </SectionCard>

            <SectionCard title="SLI / LMI Details" icon="📡" color={T.purple} brd={T.purpleBrd}>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="SLI Make & Model"><input style={IS} placeholder="e.g. GR-300XL-1" value={boom.sli_make_model} onChange={e=>ub("sli_make_model",e.target.value)}/></Field>
                <Field label="Hook Block Reeving"><input style={IS} placeholder="e.g. 4" value={boom.hook_block_reeving} onChange={e=>ub("hook_block_reeving",e.target.value)}/></Field>
              </div>
            </SectionCard>

            <SectionCard title="Boom Systems Condition" icon="⚙️" color={T.blue} brd={T.blueBrd}>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
                <Field label="Boom Pins & Connections"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
                <Field label="Boom Wear / Pads"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Luffing System"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
                <Field label="Slew System"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
                <Field label="Hoist System"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="LMI Tested at Config"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
                <Field label="Anti-Two Block Device"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
                <Field label="Anemometer (if fitted)"><ResultSelect value={boom.anemometer} onChange={v=>ub("anemometer",v)}/></Field>
              </div>
              <Field label="Boom Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom inspection notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/></Field>
            </SectionCard>
          </>
        )}

        {step === 4 && (
          <SectionCard title="Hook Inspection — expires 6 months" icon="🪝" color={T.amber} brd={T.amberBrd}>
            <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Hook 1 — Main</div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook 1 Serial Number"><input style={IS} placeholder="e.g. HK-2024-001" value={hook.serial_number} onChange={e => uh("serial_number", e.target.value)}/></Field>
              <Field label="Hook 1 SWL"><input style={IS} placeholder="e.g. 30 ton" value={hook.swl} onChange={e => uh("swl", e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Latch Condition"><ResultSelect value={hook.latch_condition} onChange={v => uh("latch_condition", v)}/></Field>
              <Field label="Structural Integrity"><ResultSelect value={hook.structural_result} onChange={v => uh("structural_result", v)}/></Field>
              <Field label="Wear (%)"><input style={IS} placeholder="e.g. 5" value={hook.wear_percentage} onChange={e => uh("wear_percentage", e.target.value)}/></Field>
            </div>
            <div style={{ fontSize:11, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.07em", margin:"6px 0 10px" }}>Hook 1 Measurements (mm)</div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Point A to B (mm)"><input style={IS} placeholder="e.g. 240mm" value={boom.hook_ab} onChange={e => ub("hook_ab", e.target.value)}/></Field>
              <Field label="Point A to C (mm)"><input style={IS} placeholder="e.g. 180mm" value={boom.hook_ac} onChange={e => ub("hook_ac", e.target.value)}/></Field>
            </div>
            <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:"uppercase", letterSpacing:"0.07em", margin:"14px 0 10px", paddingTop:14, borderTop:`1px solid ${T.border}` }}>Hook 2 — Auxiliary</div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook 2 Serial Number"><input style={IS} placeholder="Aux hook — leave blank if N/A" value={hook.hook2_serial} onChange={e => uh("hook2_serial", e.target.value)}/></Field>
              <Field label="Hook 2 SWL"><input style={IS} placeholder="e.g. 2.8 ton" value={hook.hook2_swl} onChange={e => uh("hook2_swl", e.target.value)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook 2 — Point A to B (mm)"><input style={IS} placeholder="Leave blank if N/A" value={boom.hook2_ab} onChange={e => ub("hook2_ab", e.target.value)}/></Field>
              <Field label="Hook 2 — Point A to C (mm)"><input style={IS} placeholder="Leave blank if N/A" value={boom.hook2_ac} onChange={e => ub("hook2_ac", e.target.value)}/></Field>
            </div>
            <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:"uppercase", letterSpacing:"0.07em", margin:"14px 0 10px", paddingTop:14, borderTop:`1px solid ${T.border}` }}>Hook 3 — (if fitted)</div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook 3 Serial Number"><input style={IS} placeholder="Leave blank if N/A" value={hook.hook3_serial} onChange={e => uh("hook3_serial", e.target.value)}/></Field>
              <Field label="Hook 3 SWL"><input style={IS} placeholder="Leave blank if N/A" value={hook.hook3_swl} onChange={e => uh("hook3_swl", e.target.value)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook 3 — Point A to B (mm)"><input style={IS} placeholder="Leave blank if N/A" value={boom.hook3_ab} onChange={e => ub("hook3_ab", e.target.value)}/></Field>
              <Field label="Hook 3 — Point A to C (mm)"><input style={IS} placeholder="Leave blank if N/A" value={boom.hook3_ac} onChange={e => ub("hook3_ac", e.target.value)}/></Field>
            </div>
            <div className="g2">
              <Field label="Overall Hook Result"><ResultSelect value={hook.result} onChange={v => uh("result", v)}/></Field>
              <Field label="Notes"><input style={IS} placeholder="Any additional notes" value={hook.notes} onChange={e => uh("notes", e.target.value)}/></Field>
            </div>
          </SectionCard>
        )}

        {step === 5 && (
          <>
            <SectionCard title="Hoist Drum Condition" icon="🥁" color={T.blue} brd={T.blueBrd}>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Main Hoist Drum Condition">
                  <select style={IS} value={rope.drum_condition} onChange={e=>ur("drum_condition",e.target.value)}>
                    <option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option><option value="FAIL">Fail</option>
                  </select>
                </Field>
                <Field label="Aux Hoist Drum Condition">
                  <select style={IS} value={rope.aux_drum_condition} onChange={e=>ur("aux_drum_condition",e.target.value)}>
                    <option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option><option value="N/A">N/A</option>
                  </select>
                </Field>
              </div>
              <div className="g2">
                <Field label="Main Hoist Rope Lay on Drum">
                  <select style={IS} value={rope.rope_lay} onChange={e=>ur("rope_lay",e.target.value)}>
                    <option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option>
                  </select>
                </Field>
                <Field label="Aux Hoist Rope Lay on Drum">
                  <select style={IS} value={rope.aux_rope_lay} onChange={e=>ur("aux_rope_lay",e.target.value)}>
                    <option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option><option value="N/A">N/A</option>
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Wire Rope Inspection — expires 6 months" icon="🪢" color={T.purple} brd={T.purpleBrd}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:6 }}>
                <div/>
                <div style={{ fontSize:10, fontWeight:800, color:T.accent, textAlign:"center", textTransform:"uppercase" }}>Main</div>
                <div style={{ fontSize:10, fontWeight:800, color:T.purple, textAlign:"center", textTransform:"uppercase" }}>Aux</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:10 }}>
                <label style={{ ...LS, marginBottom:0, alignSelf:"center" }}>Rope Diameter (mm)</label>
                <input style={{ ...IS, minHeight:36 }} placeholder="e.g. 18" value={rope.diameter} onChange={e=>ur("diameter",e.target.value)}/>
                <input style={{ ...IS, minHeight:36 }} placeholder="e.g. 18" value={rope.aux_diameter} onChange={e=>ur("aux_diameter",e.target.value)}/>
              </div>
              {[
                { label:"Reduction in Dia (max 10%)", mk:"reduction_dia",      ak:"aux_reduction_dia",      opts:["none","minor","moderate","severe"],          aopts:["none","minor","moderate","N/A"] },
                { label:"Corrosion",                  mk:"corrosion",           ak:"aux_corrosion",           opts:["none","minor","moderate","severe"],          aopts:["none","minor","moderate","N/A"] },
                { label:"Rope Kinks / Deforming",     mk:"kinks",              ak:"aux_kinks",              opts:["none","minor","moderate","severe"],          aopts:["none","minor","moderate","N/A"] },
                { label:"Cond of End Fittings",       mk:"end_fittings",        ak:"aux_end_fittings",        opts:["Good","Fair","Poor"],                        aopts:["Good","Fair","Poor","N/A"] },
                { label:"Damaged Strands",             mk:"damaged_strands",     ak:"aux_damaged_strands",     opts:["none","minor","moderate","severe"],          aopts:["none","minor","moderate","N/A"] },
                { label:"Core Protrusion",             mk:"core_protrusion",     ak:"aux_core_protrusion",     opts:["None","Minor","Severe"],                     aopts:["None","Minor","Severe","N/A"] },
                { label:"Rope Length (3x Windings)",  mk:"length_3x_windings",  ak:"aux_length_3x_windings",  opts:["yes","no"],                                  aopts:["yes","no","N/A"] },
                { label:"Serviceability",             mk:"serviceability",      ak:"aux_serviceability",      opts:["Good","Fair","Poor","Replace"],              aopts:["Good","Fair","Poor","Replace","N/A"] },
                { label:"Hoist Lower Limit Cut Off",  mk:"lower_limit",         ak:"aux_lower_limit",         opts:["yes","no","N/A"],                            aopts:["yes","no","N/A"] },
              ].map(r => (
                <div key={r.label} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:10 }}>
                  <label style={{ ...LS, marginBottom:0, alignSelf:"center" }}>{r.label}</label>
                  <select style={{ ...IS, minHeight:36 }} value={rope[r.mk]} onChange={e=>ur(r.mk,e.target.value)}>{r.opts.map(o=><option key={o}>{o}</option>)}</select>
                  <select style={{ ...IS, minHeight:36 }} value={rope[r.ak]} onChange={e=>ur(r.ak,e.target.value)}>{r.aopts.map(o=><option key={o}>{o}</option>)}</select>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:10 }}>
                <label style={{ ...LS, marginBottom:0, alignSelf:"center" }}>Broken Wires</label>
                <input style={{ ...IS, minHeight:36 }} placeholder="e.g. none" value={rope.broken_wires} onChange={e=>ur("broken_wires",e.target.value)}/>
                <input style={{ ...IS, minHeight:36 }} placeholder="e.g. none" value={rope.aux_broken_wires} onChange={e=>ur("aux_broken_wires",e.target.value)}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
                <label style={{ ...LS, marginBottom:0, alignSelf:"center" }}>Other Defects</label>
                <input style={{ ...IS, minHeight:36 }} placeholder="none" value={rope.other_defects} onChange={e=>ur("other_defects",e.target.value)}/>
                <input style={{ ...IS, minHeight:36 }} placeholder="none" value={rope.aux_other_defects} onChange={e=>ur("aux_other_defects",e.target.value)}/>
              </div>
              <div className="g3">
                <Field label="Rope Type">
                  <select style={IS} value={rope.rope_type} onChange={e => ur("rope_type", e.target.value)}>
                    <option>Wire Rope</option><option>Fibre Core Wire Rope</option><option>Steel Core Wire Rope</option><option>Compacted Strand Wire Rope</option>
                  </select>
                </Field>
                <Field label="Overall Rope Result"><ResultSelect value={rope.result} onChange={v => ur("result", v)}/></Field>
                <Field label="Notes"><input style={IS} placeholder="Any additional notes" value={rope.notes} onChange={e => ur("notes", e.target.value)}/></Field>
              </div>
            </SectionCard>
          </>
        )}

        {step === 6 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.text }}>Pressure Vessels <span style={{ fontSize:12, color:T.textDim, fontWeight:400 }}>— expires 1 year · up to 8</span></div>
              {pvs.length < 8 && (
                <button type="button" onClick={() => setPvs(p => [...p, emptyPV()])}
                  style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                  + Add Vessel
                </button>
              )}
            </div>
            {pvs.map((pv, i) => (
              <SectionCard key={i} title={`Pressure Vessel ${i + 1}`} icon="⚙️" color={T.green} brd={T.greenBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {pvs.length > 1 && (
                    <button type="button" onClick={() => setPvs(p => p.filter((_,j) => j !== i))}
                      style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>
                  )}
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Serial Number"><input style={IS} placeholder="e.g. PV-001" value={pv.sn} onChange={e => upv(i, "sn", e.target.value)}/></Field>
                  <Field label="Description"><input style={IS} placeholder="e.g. Hydraulic Oil Tank" value={pv.description} onChange={e => upv(i, "description", e.target.value)}/></Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Capacity / Volume"><input style={IS} placeholder="e.g. 200L" value={pv.capacity} onChange={e => upv(i, "capacity", e.target.value)}/></Field>
                  <Field label="Working Pressure (MAWP)"><input style={IS} placeholder="e.g. 200" value={pv.working_pressure} onChange={e => upv(i, "working_pressure", e.target.value)}/></Field>
                  <Field label="Test Pressure"><input style={IS} placeholder="e.g. 300" value={pv.test_pressure} onChange={e => upv(i, "test_pressure", e.target.value)}/></Field>
                </div>
                <div className="g2">
                  <Field label="Pressure Unit">
                    <select style={IS} value={pv.pressure_unit} onChange={e => upv(i, "pressure_unit", e.target.value)}>
                      <option value="bar">bar</option><option value="psi">psi</option><option value="MPa">MPa</option><option value="kPa">kPa</option>
                    </select>
                  </Field>
                  <Field label="Result"><ResultSelect value={pv.result} onChange={v => upv(i, "result", v)}/></Field>
                </div>
                <div style={{ marginTop:14 }}>
                  <Field label="Notes / Defects"><input style={IS} placeholder="Any defects or notes..." value={pv.notes} onChange={e => upv(i, "notes", e.target.value)}/></Field>
                </div>
              </SectionCard>
            ))}
          </>
        )}

        {step === 7 && (
          <SectionCard title="Inspection Summary" icon="📋" color={T.accent}>
            <div style={{ display:"grid", gap:10 }}>
              {[
                { label:"Crane", type:crane.crane_type, desc:`SN ${crane.serial_number}${crane.fleet_number?" · Fleet "+crane.fleet_number:""}${crane.registration_number?" · Reg "+crane.registration_number:""}`, result:craneInsp.result, exp:"1 year" },
                { label:"Boom", type:"Crane Boom", desc:`${boom.c2_boom_length||boom.actual_boom_length||"?"}m${boom.extended_boom_length?" ext "+boom.extended_boom_length+"m":""}${(boom.c2_angle||boom.boom_angle)?" · "+(boom.c2_angle||boom.boom_angle)+"°":""}`, result:boom.boom_structure, exp:"1 year" },
                { label:"Hook", type:"Crane Hook", desc:`SN ${hook.serial_number||"—"} · SWL ${hook.swl||crane.swl}${hook.hook2_swl?" · Hook2 "+hook.hook2_swl:""}`, result:hook.result, exp:"6 months" },
                { label:"Rope", type:"Wire Rope", desc:`Ø${rope.diameter||"?"}mm ${rope.rope_type}${rope.aux_diameter?" / Aux Ø"+rope.aux_diameter+"mm":""}`, result:rope.result, exp:"6 months" },
                ...pvs.filter(p=>p.sn||p.description).map((p,i)=>({ label:`PV ${i+1}`, type:"Pressure Vessel", desc:`SN ${p.sn||"—"} ${p.description}`, result:p.result, exp:"1 year" })),
              ].map((row, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:T.textDim, width:60, flexShrink:0 }}>{row.label}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{row.type}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>{row.desc}</div>
                  </div>
                  <div style={{ fontSize:11, color:T.textDim, flexShrink:0 }}>Expires: {row.exp}</div>
                  <ResultBadge result={row.result}/>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
              📋 Client: <strong style={{ color:T.text }}>{crane.client_name}</strong> &nbsp;·&nbsp;
              Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp;
              Date: <strong style={{ color:T.text }}>{fmt(crane.inspection_date)}</strong>
            </div>
          </SectionCard>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:8, flexWrap:"wrap" }}>
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {step === 1 ? "← Cancel" : "← Back"}
          </button>
          {step < 7 ? (
            <button type="button"
              onClick={() => { setError(""); if (!canNext()) { setError("Please fill all required fields."); return; } setStep(s => s + 1); }}
              style={{ padding:"11px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Next → {STEPS[step]?.label}
            </button>
          ) : (
            <button type="button" onClick={handleGenerate} disabled={saving}
              style={{ padding:"11px 28px", borderRadius:10, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Generating…" : "🏗 Generate All Certificates"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
