// src/app/certificates/machine-inspection/page.jsx
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

const IS = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:40 };
const LS = { fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, display:"block", marginBottom:6 };

const INSPECTOR_NAME = "Moemedi Masupe";
const INSPECTOR_ID   = "700117910";

// ── Equipment type definitions ──────────────────────────────────────────────
// pvOnly: true = vehicle identification + pressure vessels ONLY (no inspection checklist)
// pvOnly: false = full inspection checklist + optional pressure vessels
const MACHINE_TYPES = [
  // ── FULL INSPECTION TYPES ─────────────────────────────────────────────────
  {
    id:"telehandler", label:"Telehandler", icon:"🏗",
    certType:"Load Test Certificate", expiry:12, hasPV:true, pvOnly:false, hasBoom:true,
    fields:[
      { key:"structural_result", label:"Structural Integrity",          type:"result" },
      { key:"boom_result",       label:"Boom / Mast Condition",         type:"result" },
      { key:"forks_result",      label:"Forks / Attachment",            type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",              type:"result" },
      { key:"lmi_result",        label:"Load Management Indicator (LMI)", type:"result" },
      { key:"test_load",         label:"Test Load Applied (Tonnes)",    type:"text", placeholder:"e.g. 5.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",       type:"text", placeholder:"e.g. 5T" },
    ],
  },
  {
    id:"cherry_picker", label:"Cherry Picker / Aerial Work Platform", icon:"🚒",
    certType:"Load Test Certificate", expiry:12, hasPV:true, pvOnly:false, hasBoom:true,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",          type:"result" },
      { key:"boom_result",        label:"Boom / Platform Condition",     type:"result" },
      { key:"hydraulics_result",  label:"Hydraulic System",              type:"result" },
      { key:"safety_devices",     label:"Safety Devices / Interlocks",  type:"result" },
      { key:"emergency_lowering", label:"Emergency Lowering System",    type:"result" },
      { key:"test_load",          label:"Test Load Applied (kg)",        type:"text", placeholder:"e.g. 280" },
      { key:"swl",                label:"Platform SWL",                  type:"text", placeholder:"e.g. 250kg" },
      { key:"max_height",         label:"Max Working Height (m)",        type:"text", placeholder:"e.g. 18" },
    ],
  },
  {
    id:"forklift", label:"Forklift", icon:"🏭",
    certType:"Load Test Certificate", expiry:12, hasPV:false, pvOnly:false,
    fields:[
      { key:"structural_result", label:"Mast / Structural Integrity",   type:"result" },
      { key:"forks_result",      label:"Forks Condition",               type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",              type:"result" },
      { key:"brakes_result",     label:"Brake System",                  type:"result" },
      { key:"lmi_result",        label:"Load Indicator / SWL Plate",   type:"result" },
      { key:"test_load",         label:"Test Load Applied (Tonnes)",    type:"text", placeholder:"e.g. 3.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",       type:"text", placeholder:"e.g. 3T" },
    ],
  },
  {
    id:"tlb", label:"TLB (Tractor Loader Backhoe)", icon:"🚜",
    certType:"Certificate of Inspection", expiry:12, hasPV:false, pvOnly:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",          type:"result" },
      { key:"loader_result",     label:"Front Loader / Bucket",        type:"result" },
      { key:"backhoe_result",    label:"Backhoe / Excavator Arm",      type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",              type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",     type:"result" },
      { key:"swl",               label:"Rated Digging Force / SWL",    type:"text", placeholder:"e.g. 3T" },
    ],
  },
  {
    id:"frontloader", label:"Front Loader / Wheel Loader", icon:"🏗",
    certType:"Certificate of Inspection", expiry:12, hasPV:false, pvOnly:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",          type:"result" },
      { key:"bucket_result",     label:"Bucket / Attachment",          type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",              type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",     type:"result" },
      { key:"swl",               label:"Rated Operating Capacity",     type:"text", placeholder:"e.g. 3.5T" },
    ],
  },

  // ── VEHICLE TYPES — Pressure Vessels ONLY ────────────────────────────────
  // These get vehicle identification + PV certificates only. No inspection checklist.
  {
    id:"crane_truck",   label:"Crane Truck / Hiab",       icon:"🚛",
    certType:"Pressure Test Certificate", expiry:12, hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"water_bowser",  label:"Water Bowser",              icon:"🚰",
    certType:"Pressure Test Certificate", expiry:12, hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"tipper_truck",  label:"Tipper Truck",              icon:"🚚",
    certType:"Pressure Test Certificate", expiry:12, hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"bus",           label:"Bus / Personnel Carrier",   icon:"🚌",
    certType:"Pressure Test Certificate", expiry:12, hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"compressor",    label:"Air Compressor",            icon:"⚙️",
    certType:"Pressure Test Certificate", expiry:12, hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"other", label:"Other Machine / Equipment", icon:"🔧",
    certType:"Certificate of Inspection", expiry:12, hasPV:true, pvOnly:false,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",         type:"result" },
      { key:"operational_result", label:"Operational Check",           type:"result" },
      { key:"safety_result",      label:"Safety Systems",              type:"result" },
      { key:"swl",                label:"Rated Capacity / SWL",        type:"text", placeholder:"e.g. 5T" },
    ],
  },
];

const STEPS = [
  { id:1, label:"Equipment",  icon:"🔧" },
  { id:2, label:"Inspection", icon:"🔍" },
  { id:3, label:"Boom",       icon:"📐" },
  { id:4, label:"Vessels",    icon:"⚙️" },
  { id:5, label:"Generate",   icon:"📜" },
];

function addMonths(dateStr, m) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().split("T")[0];
}
function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function generateCompanyCode(name) {
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
  return `${initials}-${String(Math.floor(Math.random()*900)+100)}`;
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

function Card({ title, icon, color=T.accent, brd, children }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${brd||T.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
      {title && (
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
          <span>{icon}</span>
          <span style={{ fontSize:14, fontWeight:800, color }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function StepBar({ current, hasPV, pvOnly }) {
  let steps = STEPS;
  if (pvOnly)  steps = steps.filter(s => s.id !== 2); // no checklist
  if (!hasPV)  steps = steps.filter(s => s.id !== 3); // no vessels
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:24, gap:0 }}>
      {steps.map((s, i) => {
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
                color: (done||active) ? "#052e16" : T.textDim,
              }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:700, color:active?T.accent:done?T.green:T.textDim, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height:2, width:24, background:done?T.green:T.border, marginBottom:20, flexShrink:0 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyPV = () => ({ sn:"", description:"", manufacturer:"", year_manufacture:"", country_origin:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"" });

const defaultInspFields = (type) => {
  if (!type) return {};
  const obj = {};
  type.fields.forEach(f => { obj[f.key] = f.type === "result" ? "PASS" : ""; });
  obj.overall_result = "PASS";
  obj.defects = "";
  obj.recommendations = "";
  return obj;
};

export default function MachineInspectionPage() {
  const router = useRouter();
  const [step,    setStep]    = useState(1);
  const [clients, setClients] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(null);
  const [error,   setError]   = useState("");

  // Selected machine type
  const [machineTypeId, setMachineTypeId] = useState("");
  const machineType = MACHINE_TYPES.find(m => m.id === machineTypeId);

  // Step 1 — equipment identity
  const [equip, setEquip] = useState({
    client_id:"", client_name:"", client_location:"",
    serial_number:"", fleet_number:"", registration_number:"",
    model:"", manufacturer:"",
    inspection_date: new Date().toISOString().split("T")[0],
  });

  // Step 2 — dynamic inspection fields
  const [insp, setInsp] = useState({});
  const [boom, setBoom] = useState({
    min_radius:"", max_radius:"", min_boom_length:"", max_boom_length:"",
    actual_boom_length:"", extended_boom_length:"", max_height:"",
    jib_fitted:"no",
    swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"",
    boom_angle:"", load_tested_at_radius:"", test_load:"",
    luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS",
    boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS",
    lmi_test:"PASS", anti_two_block:"PASS", notes:"",
  });

  // Step 3 — pressure vessels
  const [pvs, setPvs] = useState([emptyPV()]);
  const [hasPVs, setHasPVs] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id,company_name,city").order("company_name")
      .then(({ data }) => setClients(data || []));
  }, []);

  // Reset inspection fields when machine type changes
  useEffect(() => {
    if (machineType) {
      setInsp(defaultInspFields(machineType));
      setHasPVs(machineType.hasPV);
    }
  }, [machineTypeId]);

  const ue = (k,v) => setEquip(p => ({ ...p, [k]:v }));
  const ub = (k,v) => setBoom(p => ({ ...p, [k]:v }));
  const ui = (k,v) => setInsp(p => ({ ...p, [k]:v }));
  const upv = (i,k,v) => setPvs(p => p.map((x,j) => j===i ? {...x,[k]:v} : x));

  function clientSelected(id) {
    const c = clients.find(x => x.id === id);
    setEquip(p => ({ ...p, client_id:id, client_name:c?.company_name||"", client_location:c?.city||"" }));
  }

  // Smart step navigation — pvOnly skips step 2; no PVs skips step 3
  function nextStep() {
    setError("");
    if (step === 1 && (!machineTypeId || !equip.client_id || !equip.serial_number)) {
      setError("Please select equipment type, client and enter a serial number."); return;
    }
    if (step === 1 && machineType?.pvOnly) { setStep(3); return; } // skip checklist
    if (step === 2 && !hasPVs)            { setStep(4); return; } // skip PV step
    if (step === 2 &&  hasPVs)            { setStep(3); return; }
    if (step === 3)                        { setStep(4); return; }
    setStep(s => s + 1);
  }
  function prevStep() {
    if (step === 3 && machineType?.pvOnly) { setStep(1); return; } // back past checklist
    if (step === 4 && machineType?.pvOnly) { setStep(3); return; }
    if (step === 4 && !hasPVs)            { setStep(2); return; }
    setStep(s => Math.max(1, s - 1));
  }

  // Build notes string from inspection fields
  function buildNotes() {
    if (!machineType) return "";
    const parts = machineType.fields
      .filter(f => f.type === "result" && insp[f.key])
      .map(f => `${f.label.split("/")[0].trim()}: ${insp[f.key]}`);
    if (insp.test_load) parts.push(`Test load: ${insp.test_load}T`);
    if (machineType?.hasBoom) {
      if (boom.actual_boom_length) parts.push(`Boom: ${boom.actual_boom_length}m`);
      if (boom.extended_boom_length) parts.push(`Extended: ${boom.extended_boom_length}m`);
      if (boom.boom_angle) parts.push(`Angle: ${boom.boom_angle}°`);
      if (boom.load_tested_at_radius) parts.push(`Test radius: ${boom.load_tested_at_radius}m`);
      if (boom.test_load) parts.push(`Boom test: ${boom.test_load}T`);
      if (boom.swl_at_actual_config) parts.push(`SWL@config: ${boom.swl_at_actual_config}`);
    }
    return parts.join(" | ");
  }

  async function ensureClient(name, city) {
    if (!name?.trim()) return;
    const { data: ex } = await supabase.from("clients").select("id").ilike("company_name", name.trim()).maybeSingle();
    if (!ex) {
      await supabase.from("clients").insert({ company_name:name.trim(), company_code:generateCompanyCode(name), city:city||"", country:"Botswana", status:"active" });
    }
  }

  async function handleImport(file) {
    if (!file) return;
    setImporting(true); setImportMsg("Reading notes…");
    try {
      const base64 = await toBase64(file);
      const mime   = file.type || "image/jpeg";
      setImportMsg("Extracting data with AI…");
      const d = await extractMachineDataFromImage(base64, mime);

      // Equipment identity
      if (d.serial_number)        ue("serial_number",        d.serial_number);
      if (d.fleet_number)         ue("fleet_number",         d.fleet_number);
      if (d.registration_number)  ue("registration_number",  d.registration_number);
      if (d.manufacturer)         ue("manufacturer",         d.manufacturer);
      if (d.model)                ue("model",                d.model);

      // Inspection results — only set if field exists in current machine type
      if (d.overall_result)       ui("overall_result",       d.overall_result);
      if (d.defects)              ui("defects",              d.defects);
      if (d.recommendations)      ui("recommendations",      d.recommendations);
      if (d.swl)                  ui("swl",                  d.swl);
      if (d.test_load)            ui("test_load",            d.test_load);
      if (d.structural_result)    ui("structural_result",    d.structural_result);
      if (d.hydraulics_result)    ui("hydraulics_result",    d.hydraulics_result);
      if (d.boom_result)          ui("boom_result",          d.boom_result);

      // Boom fields
      if (d.boom_actual_length)    ub("actual_boom_length",    d.boom_actual_length);
      if (d.boom_extended_length)  ub("extended_boom_length",  d.boom_extended_length);
      if (d.boom_radius)           ub("load_tested_at_radius",  d.boom_radius);
      if (d.boom_angle)            ub("boom_angle",             d.boom_angle);
      if (d.boom_test_load)        ub("test_load",              d.boom_test_load);
      if (d.boom_swl_at_config)    ub("swl_at_actual_config",  d.boom_swl_at_config);
      if (d.boom_swl_min)          ub("swl_at_min_radius",     d.boom_swl_min);
      if (d.boom_swl_max)          ub("swl_at_max_radius",     d.boom_swl_max);
      if (d.boom_min_radius)       ub("min_radius",             d.boom_min_radius);
      if (d.boom_max_radius)       ub("max_radius",             d.boom_max_radius);

      // Pressure vessels
      if (d.pressure_vessels?.length > 0) {
        const newPvs = d.pressure_vessels.map(pv => ({
          sn:               pv.sn || "",
          description:      pv.description || "",
          manufacturer:     pv.manufacturer || "",
          year_manufacture: pv.year_manufacture || "",
          country_origin:   pv.country_origin || "",
          capacity:         pv.capacity || "",
          working_pressure: pv.working_pressure || "",
          test_pressure:    pv.test_pressure || "",
          pressure_unit:    pv.pressure_unit || "bar",
          result:           pv.result || "PASS",
          notes:            pv.notes || "",
        }));
        setPvs(newPvs);
        setHasPVs(true);
      }

      const count = Object.values(d).filter(v => v && v !== "PASS" && typeof v !== "object").length;
      setImportMsg(`✓ Extracted data — review and complete missing fields`);
    } catch(e) {
      console.error(e);
      setImportMsg("⚠ Could not read image — please fill manually");
    }
    setImporting(false);
  }

  async function handleGenerate() {
    if (!machineType || !equip.client_id || !equip.serial_number) {
      setError("Missing required fields."); return;
    }
    setSaving(true); setError("");
    await ensureClient(equip.client_name, equip.client_location);

    // Auto-generate serial if blank
    const equipRef = { ...equip };
    if (!equipRef.serial_number?.trim()) {
      const cc = (equipRef.client_name||"UNK").split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
      const ec = (machineType?.label||"EQP").split(/[\s/—-]+/).filter(Boolean).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
      equipRef.serial_number = `${cc}-${ec}-${String(Date.now()).slice(-6)}`;
    }

    const folderId   = crypto.randomUUID();
    const folderName = `${machineType.label}-${equip.serial_number}-${equip.inspection_date}`;
    const iDate      = equip.inspection_date;
    const expiry     = addMonths(iDate, machineType.expiry);
    const certs      = [];

    const { count } = await supabase.from("certificates").select("*", { count:"exact", head:true });
    let seq = (count || 0) + 1;
    const pad = n => String(n).padStart(5, "0");
    const prefix = machineType.id.slice(0,2).toUpperCase();
    const nextNo = () => `CERT-${prefix}${pad(seq++)}`;

    // ── Main equipment certificate ──────────────────────────────────────────
    const swl = insp.swl || "";
    const desc = [
      machineType.label,
      equip.model ? `(${equip.model})` : "",
      swl ? `SWL/Cap ${swl}` : "",
      equip.fleet_number ? `Fleet ${equip.fleet_number}` : "",
      equip.registration_number ? `Reg ${equip.registration_number}` : "",
    ].filter(Boolean).join(" ");

    certs.push({
      certificate_number: nextNo(),
      equipment_type: machineType.label,
      equipment_description: desc,
      serial_number: equipRef.serial_number,
      fleet_number: equipRef.fleet_number,
      registration_number: equip.registration_number,
      model: equip.model,
      manufacturer: equip.manufacturer,
      swl,
      capacity_volume: insp.capacity || "",
      working_pressure: insp.working_pressure || "",
      test_pressure: insp.test_pressure || "",
      client_name: equip.client_name,
      client_id: equip.client_id,
      location: equip.client_location,
      issue_date: iDate,
      inspection_date: iDate,
      expiry_date: expiry,
      next_inspection_due: expiry,
      result: insp.overall_result || "PASS",
      defects_found: insp.defects || "",
      recommendations: insp.recommendations || "",
      inspector_name: INSPECTOR_NAME,
      inspector_id: INSPECTOR_ID,
      certificate_type: machineType.certType,
      folder_id: folderId,
      folder_name: folderName,
      folder_position: 1,
      notes: buildNotes(),
    });

    // ── Pressure vessel certificates ─────────────────────────────────────────
    if (hasPVs) {
      for (let i = 0; i < pvs.length; i++) {
        const pv = pvs[i];
        if (!pv.sn && !pv.description) continue;
        certs.push({
          certificate_number: nextNo(),
          equipment_type: "Pressure Vessel",
          equipment_description: pv.description || `Pressure Vessel ${i+1} — ${machineType.label} SN ${equip.serial_number}`,
          serial_number: pv.sn,
          manufacturer: pv.manufacturer,
          year_built: pv.year_manufacture,
          country_of_origin: pv.country_origin,
          capacity_volume: pv.capacity,
          working_pressure: pv.working_pressure,
          test_pressure: pv.test_pressure,
          pressure_unit: pv.pressure_unit,
          client_name: equip.client_name,
          client_id: equip.client_id,
          location: equip.client_location,
          issue_date: iDate,
          inspection_date: iDate,
          expiry_date: expiry, // 1 year
          next_inspection_due: expiry,
          result: pv.result,
          defects_found: pv.notes || "",
          inspector_name: INSPECTOR_NAME,
          inspector_id: INSPECTOR_ID,
          certificate_type: "Pressure Test Certificate",
          folder_id: folderId,
          folder_name: folderName,
          folder_position: 2 + i,
        });
      }
    }

    const { data, error: dbErr } = await supabase.from("certificates").insert(certs).select("id,certificate_number,equipment_type,result,expiry_date");
    if (dbErr) { setError("Failed to save: " + dbErr.message); setSaving(false); return; }
    setSaved({ folderName, certs: data });
    setSaving(false);
  }

  // ── SAVED ─────────────────────────────────────────────────────────────────
  if (saved) return (
    <AppLayout title="Inspection Complete">
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:800, margin:"0 auto" }}>
        <div style={{ background:T.greenDim, border:`1px solid ${T.greenBrd}`, borderRadius:18, padding:28, textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:900, color:T.green, marginBottom:6 }}>Inspection Complete</div>
          <div style={{ fontSize:14, color:T.textMid, marginBottom:4 }}>{saved.certs.length} certificate{saved.certs.length>1?"s":""} generated</div>
          <div style={{ fontSize:12, color:T.textDim }}>{saved.folderName}</div>
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
                <button type="button" onClick={()=>window.open(`/certificates/${c.id}`,"_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.accentBrd}`, background:T.accentDim, color:T.accent, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View →</button>
                <button type="button" onClick={()=>window.open(`/certificates/print/${c.id}`,"_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Print</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button type="button" onClick={()=>{ setSaved(null); setStep(1); setMachineTypeId(""); setEquip(p=>({...p,serial_number:"",fleet_number:"",registration_number:"",model:"",manufacturer:""})); }}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.text, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            New Inspection
          </button>
          <button type="button" onClick={()=>router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            View All Certificates →
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── WIZARD ────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Machine Inspection">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        textarea{resize:vertical}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .mtype{padding:12px 14px;border-radius:12px;border:1px solid ${T.border};background:${T.card};cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:10px;-webkit-tap-highlight-color:transparent}
        .mtype:hover{border-color:${T.accentBrd};background:${T.accentDim}}
        .mtype.sel{border-color:${T.accent};background:${T.accentDim};box-shadow:0 0 0 1px ${T.accent}}
        @media(max-width:640px){.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · Inspection Wizard</div>
          <h1 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>Machine Inspection</h1>
          <p style={{ margin:0, fontSize:12, color:T.textDim }}>Telehandlers · Cherry Pickers · Crane Trucks · Bowsers · Tippers · Buses · Forklifts · TLBs · Any machine with pressure vessels</p>
          <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
            <a href="/certificates/crane-inspection" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>🏗 Crane Inspection →</a>
            <a href="/certificates" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>📜 All Certificates →</a>
          </div>
        </div>

        <StepBar current={step} hasPV={hasPVs && machineTypeId !== ""} pvOnly={machineType?.pvOnly||false} hasBoom={machineType?.hasBoom||false}/>

        {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:700, marginBottom:16 }}>⚠ {error}</div>}

        {/* ── PHOTO IMPORT ── */}
        {step === 1 && (
          <div style={{ background:T.purpleDim, border:`1px solid ${T.purpleBrd}`, borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:T.purple, marginBottom:3 }}>📷 Import from Handwritten Note</div>
              <div style={{ fontSize:11, color:T.textDim }}>Take a photo of your inspection notes — AI fills serial number, SWL, results and pressure vessels automatically</div>
              {importMsg && <div style={{ fontSize:12, fontWeight:700, marginTop:6, color:importMsg.startsWith("✓")?T.green:importMsg.startsWith("⚠")?T.red:T.amber }}>{importMsg}</div>}
            </div>
            <label style={{ cursor:"pointer", flexShrink:0 }}>
              <input type="file" accept="image/*" capture="environment" style={{ display:"none" }}
                onChange={async e => { const f = e.target.files?.[0]; if(f) await handleImport(f); e.target.value=""; }}
              />
              <div style={{ padding:"10px 18px", borderRadius:10, background:importing?T.card:"linear-gradient(135deg,#a78bfa,#7c3aed)", color:importing?T.textDim:"#fff", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:8, opacity:importing?0.6:1 }}>
                {importing ? "🔄 Reading…" : "📷 Choose / Take Photo"}
              </div>
            </label>
          </div>
        )}

        {/* ── STEP 1: Equipment Identity ── */}
        {step === 1 && (
          <>
            {/* Machine type selector */}
            <Card title="Select Equipment Type" icon="🔧" color={T.accent} brd={T.accentBrd}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {MACHINE_TYPES.map(m => (
                  <div key={m.id} className={`mtype${machineTypeId===m.id?" sel":""}`}
                    onClick={() => setMachineTypeId(m.id)}>
                    <span style={{ fontSize:20 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:machineTypeId===m.id?T.accent:T.text }}>{m.label}</div>
                      <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>{m.certType}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {machineTypeId && (
              <Card title="Equipment Identity" icon="📋" color={T.blue} brd={T.blueBrd}>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Client *">
                    <select style={IS} value={equip.client_id} onChange={e=>clientSelected(e.target.value)}>
                      <option value="">— Select Client —</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}{c.city?` — ${c.city}`:""}</option>)}
                    </select>
                    {clients.length > 0 && (
                      <div style={{ fontSize:11, color:T.textDim, marginTop:5 }}>
                        Not listed? <a href="/clients/register" target="_blank" style={{ color:T.accent, fontWeight:700 }}>+ Register client</a>
                      </div>
                    )}
                  </Field>
                  <Field label="Inspection Date">
                    <input style={IS} type="date" value={equip.inspection_date} onChange={e=>ue("inspection_date",e.target.value)}/>
                  </Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Serial Number *">
                    <input style={IS} placeholder="e.g. TH-2024-001" value={equip.serial_number} onChange={e=>ue("serial_number",e.target.value)}/>
                  </Field>
                  <Field label="Fleet Number">
                    <input style={IS} placeholder="e.g. FL-012" value={equip.fleet_number} onChange={e=>ue("fleet_number",e.target.value)}/>
                  </Field>
                  <Field label="Registration Number">
                    <input style={IS} placeholder="e.g. B 456 DEF" value={equip.registration_number} onChange={e=>ue("registration_number",e.target.value)}/>
                  </Field>
                </div>
                <div className="g2">
                  <Field label="Make / Manufacturer">
                    <input style={IS} placeholder="e.g. JCB, Manitou, Terex" value={equip.manufacturer} onChange={e=>ue("manufacturer",e.target.value)}/>
                  </Field>
                  <Field label="Model">
                    <input style={IS} placeholder="e.g. 535-125" value={equip.model} onChange={e=>ue("model",e.target.value)}/>
                  </Field>
                </div>

                {/* Expiry preview */}
                {equip.inspection_date && machineType && (
                  <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                    📅 <strong style={{ color:T.text }}>{machineType.label}</strong> certificate expires: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date, machineType.expiry))}</strong>
                    <span style={{ color:T.textDim }}> ({machineType.expiry} months)</span>
                    {machineType.hasPV && <span style={{ marginLeft:16 }}>· Pressure vessels: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date, 12))}</strong></span>}
                {machineType.pvOnly && <span style={{ marginLeft:16, color:T.amber }}>· Vehicle identification + pressure vessel certificates only</span>}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── STEP 2: Dynamic Inspection Fields — only for full inspection types ── */}
        {step === 2 && machineType && !machineType.pvOnly && (
          <>
            <Card title={`${machineType.label} — Inspection Checklist`} icon={machineType.icon} color={T.blue} brd={T.blueBrd}>
              <div className="g2" style={{ marginBottom:14 }}>
                {machineType.fields.map(f => (
                  <Field key={f.key} label={f.label}>
                    {f.type === "result"
                      ? <ResultSelect value={insp[f.key]||"PASS"} onChange={v=>ui(f.key,v)}/>
                      : <input style={IS} placeholder={f.placeholder||""} value={insp[f.key]||""} onChange={e=>ui(f.key,e.target.value)}/>
                    }
                  </Field>
                ))}
              </div>

              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14, display:"grid", gap:12 }}>
                <div className="g2">
                  <Field label="Overall Result">
                    <ResultSelect value={insp.overall_result||"PASS"} onChange={v=>ui("overall_result",v)}/>
                  </Field>
                  <Field label="Defects Found">
                    <textarea style={{ ...IS, minHeight:80 }} placeholder="Describe any defects..." value={insp.defects||""} onChange={e=>ui("defects",e.target.value)}/>
                  </Field>
                </div>
                <Field label="Recommendations">
                  <textarea style={{ ...IS, minHeight:60 }} placeholder="Recommendations for maintenance or repair..." value={insp.recommendations||""} onChange={e=>ui("recommendations",e.target.value)}/>
                </Field>
              </div>
            </Card>

            {/* Toggle pressure vessels */}
            {machineType.hasPV && (
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text }}>Pressure Vessels</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Does this {machineType.label} have pressure vessels?</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button type="button" onClick={()=>setHasPVs(true)}
                    style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${hasPVs?T.greenBrd:T.border}`, background:hasPVs?T.greenDim:T.card, color:hasPVs?T.green:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                    ✓ Yes
                  </button>
                  <button type="button" onClick={()=>setHasPVs(false)}
                    style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${!hasPVs?T.redBrd:T.border}`, background:!hasPVs?T.redDim:T.card, color:!hasPVs?T.red:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                    ✗ No
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3: Boom Inspection (Telehandler / Cherry Picker only) ── */}
        {step === 3 && machineType?.hasBoom && (
          <Card title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Boom Geometry</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 6" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></Field>
              <Field label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></Field>
              <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 12" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 10" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
              <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 60" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
              {machineType?.id === "cherry_picker" && (
                <Field label="Max Working Height (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_height||""} onChange={e=>ub("max_height",e.target.value)}/></Field>
              )}
              {machineType?.id === "telehandler" && (
                <Field label="Jib / Fork Attachment">
                  <select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </Field>
              )}
            </div>
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Working Radius & SWL</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Radius (m)"><input style={IS} placeholder="e.g. 1.5" value={boom.min_radius} onChange={e=>ub("min_radius",e.target.value)}/></Field>
              <Field label="Max Radius (m)"><input style={IS} placeholder="e.g. 14" value={boom.max_radius} onChange={e=>ub("max_radius",e.target.value)}/></Field>
              <Field label="Test Radius (m)"><input style={IS} placeholder="e.g. 5" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="SWL at Min Radius"><input style={IS} placeholder="e.g. 6T" value={boom.swl_at_min_radius} onChange={e=>ub("swl_at_min_radius",e.target.value)}/></Field>
              <Field label="SWL at Max Radius"><input style={IS} placeholder="e.g. 1.2T" value={boom.swl_at_max_radius} onChange={e=>ub("swl_at_max_radius",e.target.value)}/></Field>
              <Field label="SWL at Test Config"><input style={IS} placeholder="e.g. 4T" value={boom.swl_at_actual_config} onChange={e=>ub("swl_at_actual_config",e.target.value)}/></Field>
            </div>
            <Field label="Load Test Applied (Tonnes) — 110% of SWL at test config">
              <input style={IS} placeholder="e.g. 4.4" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/>
            </Field>
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Boom Systems Condition</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
              <Field label="Boom Pins & Connections"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
              <Field label="Boom Wear / Pads"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Luffing / Extension System"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
              <Field label="Slew / Rotation System"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
              <Field label="Hoist / Lift System"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="LMI Tested at Config"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
              <Field label="Anti-Two Block / Overload"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
            </div>
            <Field label="Boom Notes">
              <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom inspection notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/>
            </Field>
          </Card>
        )}

        {/* ── STEP 3: Boom Inspection — Telehandler / Cherry Picker only ── */}
        

        {/* ── STEP 4: Pressure Vessels ── */}
        {step === 4 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800 }}>
                Pressure Vessels <span style={{ fontSize:12, color:T.textDim, fontWeight:400 }}>— up to 8 — expires 1 year</span>
              </div>
              {pvs.length < 8 && (
                <button type="button" onClick={()=>setPvs(p=>[...p,emptyPV()])}
                  style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                  + Add Vessel
                </button>
              )}
            </div>
            {pvs.map((pv, i) => (
              <Card key={i} title={`Pressure Vessel ${i+1}`} icon="⚙️" color={T.green} brd={T.greenBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {pvs.length > 1 && (
                    <button type="button" onClick={()=>setPvs(p=>p.filter((_,j)=>j!==i))}
                      style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Serial Number"><input style={IS} placeholder="e.g. PV-001" value={pv.sn} onChange={e=>upv(i,"sn",e.target.value)}/></Field>
                  <Field label="Description"><input style={IS} placeholder="e.g. Hydraulic Oil Tank" value={pv.description} onChange={e=>upv(i,"description",e.target.value)}/></Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Manufacturer"><input style={IS} placeholder="e.g. ASME, Atlas Copco" value={pv.manufacturer} onChange={e=>upv(i,"manufacturer",e.target.value)}/></Field>
                  <Field label="Year of Manufacture"><input style={IS} placeholder="e.g. 2018" value={pv.year_manufacture} onChange={e=>upv(i,"year_manufacture",e.target.value)}/></Field>
                  <Field label="Country of Origin"><input style={IS} placeholder="e.g. South Africa" value={pv.country_origin} onChange={e=>upv(i,"country_origin",e.target.value)}/></Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Capacity / Volume"><input style={IS} placeholder="e.g. 200L" value={pv.capacity} onChange={e=>upv(i,"capacity",e.target.value)}/></Field>
                  <Field label="Working Pressure"><input style={IS} placeholder="e.g. 200" value={pv.working_pressure} onChange={e=>upv(i,"working_pressure",e.target.value)}/></Field>
                  <Field label="Test Pressure"><input style={IS} placeholder="e.g. 300" value={pv.test_pressure} onChange={e=>upv(i,"test_pressure",e.target.value)}/></Field>
                </div>
                <div className="g2">
                  <Field label="Pressure Unit">
                    <select style={IS} value={pv.pressure_unit} onChange={e=>upv(i,"pressure_unit",e.target.value)}>
                      <option value="bar">bar</option>
                      <option value="psi">psi</option>
                      <option value="MPa">MPa</option>
                      <option value="kPa">kPa</option>
                    </select>
                  </Field>
                  <Field label="Result"><ResultSelect value={pv.result} onChange={v=>upv(i,"result",v)}/></Field>
                </div>
                <div style={{ marginTop:14 }}>
                  <Field label="Notes / Defects"><input style={IS} placeholder="Any defects or notes..." value={pv.notes} onChange={e=>upv(i,"notes",e.target.value)}/></Field>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* ── STEP 4: Review & Generate ── */}
        {step === 5 && machineType && (
          <Card title="Review & Confirm" icon="📋" color={T.accent}>
            <div style={{ display:"grid", gap:10, marginBottom:16 }}>
              {/* Main equipment */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                <div style={{ fontSize:20 }}>{machineType.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{machineType.label}</div>
                  <div style={{ fontSize:11, color:T.textDim }}>
                    SN {equip.serial_number}{equip.fleet_number?` · Fleet ${equip.fleet_number}`:""}{equip.registration_number?` · Reg ${equip.registration_number}`:""}
                    {equip.model?` · ${equip.model}`:""}
                  </div>
                  <div style={{ fontSize:11, color:T.textDim }}>{machineType.certType} · Expires {fmt(addMonths(equip.inspection_date, machineType.expiry))}</div>
                </div>
                <ResultBadge result={insp.overall_result||"PASS"}/>
              </div>

              {/* Pressure vessels */}
              {hasPVs && pvs.filter(p=>p.sn||p.description).map((pv,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                  <div style={{ fontSize:18 }}>⚙️</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>Pressure Vessel {i+1} — {pv.description||"—"}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>SN {pv.sn||"—"} · {pv.capacity||"—"} · {pv.working_pressure||"—"}/{pv.test_pressure||"—"} {pv.pressure_unit}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>Pressure Test Certificate · Expires {fmt(addMonths(equip.inspection_date, 12))}</div>
                  </div>
                  <ResultBadge result={pv.result}/>
                </div>
              ))}
            </div>

            <div style={{ padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
              📋 Client: <strong style={{ color:T.text }}>{equip.client_name}</strong> &nbsp;·&nbsp;
              Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp;
              Date: <strong style={{ color:T.text }}>{fmt(equip.inspection_date)}</strong> &nbsp;·&nbsp;
              Total: <strong style={{ color:T.accent }}>{1 + (hasPVs ? pvs.filter(p=>p.sn||p.description).length : 0)} certificate{(1+(hasPVs?pvs.filter(p=>p.sn||p.description).length:0))>1?"s":""}</strong>
            </div>
          </Card>
        )}

        {/* ── Navigation ── */}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:8, flexWrap:"wrap" }}>
          <button type="button"
            onClick={step === 1 ? ()=>router.push("/certificates") : prevStep}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {step === 1 ? "← Cancel" : "← Back"}
          </button>

          {step < 5 ? (
            <button type="button" onClick={nextStep}
              style={{ padding:"11px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Next →
            </button>
          ) : (
            <button type="button" onClick={handleGenerate} disabled={saving}
              style={{ padding:"11px 28px", borderRadius:10, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Generating…" : "⚙️ Generate Certificates"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
