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

// ── Step IDs (each machine type declares which steps it uses) ───────────────
// 1 = Equipment Identity
// 2 = Inspection Checklist
// 3 = Boom Inspection
// 4 = Fork Inspection
// 5 = Bucket Inspection
// 6 = Pressure Vessels
// 7 = Horse & Trailer Registration
// 8 = Review & Generate

const MACHINE_TYPES = [
  // ── FULL INSPECTION + BOOM + FORK ─────────────────────────────────────────
  {
    id:"telehandler", label:"Telehandler", icon:"🏗",
    certType:"Load Test Certificate", expiry:12,
    steps:[1,2,3,4,6,8],  // checklist + boom + fork + optional PV
    hasPV:true,
    fields:[
      { key:"structural_result", label:"Structural Integrity",              type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                  type:"result" },
      { key:"lmi_result",        label:"Load Management Indicator (LMI)",  type:"result" },
      { key:"brakes_result",     label:"Brake / Drive System",              type:"result" },
      { key:"tyres_result",      label:"Tyres & Wheels",                    type:"result" },
      { key:"test_load",         label:"Main Test Load Applied (Tonnes)",   type:"text", placeholder:"e.g. 5.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",           type:"text", placeholder:"e.g. 5T" },
    ],
  },

  // ── CHERRY PICKER — BOOM + BUCKET ─────────────────────────────────────────
  {
    id:"cherry_picker", label:"Cherry Picker / AWP", icon:"🚒",
    certType:"Load Test Certificate", expiry:12,
    steps:[1,2,3,5,6,8],  // checklist + boom + bucket + optional PV
    hasPV:true,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",             type:"result" },
      { key:"hydraulics_result",  label:"Hydraulic System",                 type:"result" },
      { key:"safety_devices",     label:"Safety Devices / Interlocks",     type:"result" },
      { key:"emergency_lowering", label:"Emergency Lowering System",       type:"result" },
      { key:"test_load",          label:"Test Load Applied (kg)",           type:"text", placeholder:"e.g. 280" },
      { key:"swl",                label:"Platform SWL",                     type:"text", placeholder:"e.g. 250kg" },
    ],
  },

  // ── FORKLIFT — FORK INSPECTION ─────────────────────────────────────────────
  {
    id:"forklift", label:"Forklift", icon:"🏭",
    certType:"Load Test Certificate", expiry:12,
    steps:[1,2,4,8],  // checklist + fork + no PV
    hasPV:false,
    fields:[
      { key:"structural_result", label:"Mast / Structural Integrity",       type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                  type:"result" },
      { key:"brakes_result",     label:"Brake System",                      type:"result" },
      { key:"lmi_result",        label:"Load Indicator / SWL Plate",       type:"result" },
      { key:"tyres_result",      label:"Tyres / Wheels",                    type:"result" },
      { key:"test_load",         label:"Test Load Applied (Tonnes)",        type:"text", placeholder:"e.g. 3.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",           type:"text", placeholder:"e.g. 3T" },
    ],
  },

  // ── TLB ──────────────────────────────────────────────────────────────────
  {
    id:"tlb", label:"TLB (Tractor Loader Backhoe)", icon:"🚜",
    certType:"Certificate of Inspection", expiry:12,
    steps:[1,2,8],
    hasPV:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",              type:"result" },
      { key:"loader_result",     label:"Front Loader / Bucket",            type:"result" },
      { key:"backhoe_result",    label:"Backhoe / Excavator Arm",          type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                  type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",         type:"result" },
      { key:"swl",               label:"Rated Digging Force / SWL",        type:"text", placeholder:"e.g. 3T" },
    ],
  },

  // ── FRONT LOADER ──────────────────────────────────────────────────────────
  {
    id:"frontloader", label:"Front Loader / Wheel Loader", icon:"🏗",
    certType:"Certificate of Inspection", expiry:12,
    steps:[1,2,8],
    hasPV:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",              type:"result" },
      { key:"bucket_result",     label:"Bucket / Attachment",              type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                  type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",         type:"result" },
      { key:"swl",               label:"Rated Operating Capacity",         type:"text", placeholder:"e.g. 3.5T" },
    ],
  },

  // ── HORSE & TRAILER ───────────────────────────────────────────────────────
  {
    id:"horse_trailer", label:"Horse & Trailer", icon:"🚛",
    certType:"Vehicle Registration Certificate", expiry:12,
    steps:[1,7,6,8],  // identity + horse/trailer registration + optional PV
    hasPV:true,
    fields:[],  // no checklist; registration handled in step 7
  },

  // ── VEHICLE TYPES — PV ONLY ───────────────────────────────────────────────
  {
    id:"crane_truck",  label:"Crane Truck / Hiab",     icon:"🚛",
    certType:"Pressure Test Certificate", expiry:12,
    steps:[1,6,8],
    hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"water_bowser", label:"Water Bowser",             icon:"🚰",
    certType:"Pressure Test Certificate", expiry:12,
    steps:[1,6,8],
    hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"tipper_truck", label:"Tipper Truck",             icon:"🚚",
    certType:"Pressure Test Certificate", expiry:12,
    steps:[1,6,8],
    hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"bus",          label:"Bus / Personnel Carrier",  icon:"🚌",
    certType:"Pressure Test Certificate", expiry:12,
    steps:[1,6,8],
    hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"compressor",   label:"Air Compressor",           icon:"⚙️",
    certType:"Pressure Test Certificate", expiry:12,
    steps:[1,6,8],
    hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"other", label:"Other Machine / Equipment", icon:"🔧",
    certType:"Certificate of Inspection", expiry:12,
    steps:[1,2,6,8],
    hasPV:true,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",            type:"result" },
      { key:"operational_result", label:"Operational Check",              type:"result" },
      { key:"safety_result",      label:"Safety Systems",                 type:"result" },
      { key:"swl",                label:"Rated Capacity / SWL",           type:"text", placeholder:"e.g. 5T" },
    ],
  },
];

// ── Step metadata ────────────────────────────────────────────────────────────
const STEP_META = {
  1: { label:"Equipment",   icon:"🔧" },
  2: { label:"Checklist",   icon:"🔍" },
  3: { label:"Boom",        icon:"📐" },
  4: { label:"Forks",       icon:"🍴" },
  5: { label:"Bucket",      icon:"🪣" },
  6: { label:"Vessels",     icon:"⚙️" },
  7: { label:"Horse/Trailer",icon:"🚛" },
  8: { label:"Generate",    icon:"📜" },
};

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
  const s = result === "PASS"   ? { c:T.green, bg:T.greenDim, brd:T.greenBrd, l:"Pass" }
          : result === "FAIL"   ? { c:T.red,   bg:T.redDim,   brd:T.redBrd,   l:"Fail" }
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

function SectionHeading({ label }) {
  return (
    <div style={{ fontSize:11, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.09em", margin:"18px 0 10px", paddingBottom:6, borderBottom:`1px solid ${T.border}` }}>
      {label}
    </div>
  );
}

function StepBar({ steps, currentStep }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:24, gap:0, overflowX:"auto", paddingBottom:4 }}>
      {steps.map((sid, i) => {
        const meta   = STEP_META[sid];
        const done   = sid < currentStep;
        const active = sid === currentStep;
        return (
          <div key={sid} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:900, flexShrink:0,
                background: done ? T.green : active ? T.accent : T.card,
                border: `2px solid ${done ? T.green : active ? T.accent : T.border}`,
                color: (done||active) ? "#052e16" : T.textDim,
              }}>
                {done ? "✓" : meta.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:700, color:active?T.accent:done?T.green:T.textDim, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                {meta.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height:2, width:20, background:done?T.green:T.border, marginBottom:20, flexShrink:0 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyPV   = () => ({ sn:"", description:"", manufacturer:"", year_manufacture:"", country_origin:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"" });
const emptyFork = () => ({ fork_number:"", length:"", thickness_heel:"", thickness_blade:"", width:"", swl:"", result:"PASS", cracks:"no", bending:"no", wear_pct:"", notes:"" });
const emptyBoom = () => ({
  min_radius:"", max_radius:"", min_boom_length:"", max_boom_length:"",
  actual_boom_length:"", extended_boom_length:"", max_height:"",
  jib_fitted:"no",
  swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"",
  boom_angle:"", load_tested_at_radius:"", test_load:"",
  luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS",
  boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS",
  lmi_test:"PASS", anti_two_block:"PASS", notes:"",
});
const emptyBucket = () => ({
  platform_swl:"", platform_dimensions:"", platform_material:"",
  platform_structure:"PASS", platform_floor:"PASS", guardrails:"PASS",
  gate_latch:"PASS", levelling_system:"PASS", emergency_lowering:"PASS",
  overload_device:"PASS", tilt_alarm:"PASS",
  test_load_applied:"", notes:"",
});
const emptyHorseTrailer = () => ({
  // Horse (truck/prime mover)
  horse_reg:"", horse_make:"", horse_model:"", horse_vin:"", horse_year:"",
  horse_fleet:"", horse_gvm:"", horse_result:"PASS", horse_notes:"",
  // Trailer
  trailer_reg:"", trailer_make:"", trailer_model:"", trailer_vin:"", trailer_year:"",
  trailer_fleet:"", trailer_gvm:"", trailer_result:"PASS", trailer_notes:"",
  has_trailer: true,
});

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

  const [clients, setClients]   = useState([]);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(null);
  const [error,   setError]     = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Selected machine type
  const [machineTypeId, setMachineTypeId] = useState("");
  const machineType = MACHINE_TYPES.find(m => m.id === machineTypeId);

  // Derived step list for current machine type
  const stepList = machineType
    ? machineType.steps.filter(s => s !== 6 || hasPVs)  // hide PV step if toggled off
    : [1];

  // Current step (using step IDs, not indices)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 — equipment identity
  const [equip, setEquip] = useState({
    client_id:"", client_name:"", client_location:"",
    serial_number:"", fleet_number:"", registration_number:"",
    model:"", manufacturer:"",
    inspection_date: new Date().toISOString().split("T")[0],
  });

  // Step 2 — dynamic inspection fields
  const [insp, setInsp] = useState({});

  // Step 3 — boom
  const [boom, setBoom] = useState(emptyBoom());

  // Step 4 — forks
  const [forks, setForks] = useState([emptyFork(), emptyFork()]);

  // Step 5 — bucket/platform
  const [bucket, setBucket] = useState(emptyBucket());

  // Step 6 — pressure vessels
  const [pvs,    setPvs]    = useState([emptyPV()]);
  const [hasPVs, setHasPVs] = useState(false);

  // Step 7 — horse & trailer registration
  const [horseTrailer, setHorseTrailer] = useState(emptyHorseTrailer());

  useEffect(() => {
    supabase.from("clients").select("id,company_name,city").order("company_name")
      .then(({ data }) => setClients(data || []));
  }, []);

  // Reset when machine type changes
  useEffect(() => {
    if (machineType) {
      setInsp(defaultInspFields(machineType));
      setHasPVs(machineType.hasPV);
      setCurrentStep(1);
    }
  }, [machineTypeId]);

  // Recompute step list whenever hasPVs changes (adds/removes step 6)
  const effectiveSteps = machineType
    ? machineType.steps.filter(s => s !== 6 || hasPVs)
    : [1];

  const ue  = (k,v) => setEquip(p => ({ ...p, [k]:v }));
  const ub  = (k,v) => setBoom(p => ({ ...p, [k]:v }));
  const ui  = (k,v) => setInsp(p => ({ ...p, [k]:v }));
  const ubu = (k,v) => setBucket(p => ({ ...p, [k]:v }));
  const uht = (k,v) => setHorseTrailer(p => ({ ...p, [k]:v }));
  const upv = (i,k,v) => setPvs(p => p.map((x,j) => j===i ? {...x,[k]:v} : x));
  const ufk = (i,k,v) => setForks(p => p.map((x,j) => j===i ? {...x,[k]:v} : x));

  function clientSelected(id) {
    const c = clients.find(x => x.id === id);
    setEquip(p => ({ ...p, client_id:id, client_name:c?.company_name||"", client_location:c?.city||"" }));
  }

  function nextStep() {
    setError("");
    if (currentStep === 1 && (!machineTypeId || !equip.client_id || !equip.serial_number)) {
      setError("Please select equipment type, client and enter a serial number."); return;
    }
    const idx = effectiveSteps.indexOf(currentStep);
    if (idx < effectiveSteps.length - 1) {
      setCurrentStep(effectiveSteps[idx + 1]);
    }
  }
  function prevStep() {
    const idx = effectiveSteps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(effectiveSteps[idx - 1]);
    else router.push("/certificates");
  }

  function buildNotes() {
    if (!machineType) return "";
    const parts = machineType.fields
      .filter(f => f.type === "result" && insp[f.key])
      .map(f => `${f.label.split("/")[0].trim()}: ${insp[f.key]}`);
    if (insp.test_load) parts.push(`Test load: ${insp.test_load}`);
    // Boom summary
    if (machineType.steps.includes(3)) {
      if (boom.actual_boom_length) parts.push(`Boom: ${boom.actual_boom_length}m`);
      if (boom.boom_angle)         parts.push(`Angle: ${boom.boom_angle}°`);
      if (boom.test_load)          parts.push(`Boom test: ${boom.test_load}T`);
      if (boom.swl_at_actual_config) parts.push(`SWL@config: ${boom.swl_at_actual_config}`);
    }
    // Fork summary
    if (machineType.steps.includes(4)) {
      forks.forEach((f,i) => {
        if (f.swl || f.length) parts.push(`Fork${i+1}: SWL ${f.swl||"—"} L${f.length||"—"}mm`);
      });
    }
    // Bucket summary
    if (machineType.steps.includes(5)) {
      if (bucket.platform_swl) parts.push(`Platform SWL: ${bucket.platform_swl}`);
      if (bucket.test_load_applied) parts.push(`Platform test: ${bucket.test_load_applied}`);
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

  async function handleGenerate() {
    if (!machineType || !equip.client_id || !equip.serial_number) {
      setError("Missing required fields."); return;
    }
    setSaving(true); setError("");
    await ensureClient(equip.client_name, equip.client_location);

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

    const swl  = insp.swl || "";
    const desc = [
      machineType.label,
      equip.model ? `(${equip.model})` : "",
      swl ? `SWL/Cap ${swl}` : "",
      equip.fleet_number ? `Fleet ${equip.fleet_number}` : "",
      equip.registration_number ? `Reg ${equip.registration_number}` : "",
    ].filter(Boolean).join(" ");

    // ── Main equipment cert (skip for horse_trailer — those get split certs below) ──
    if (machineType.id !== "horse_trailer") {
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
    }

    // ── Horse cert ──────────────────────────────────────────────────────────
    if (machineType.id === "horse_trailer") {
      certs.push({
        certificate_number: nextNo(),
        equipment_type: "Horse / Prime Mover",
        equipment_description: `Horse ${horseTrailer.horse_make} ${horseTrailer.horse_model} Reg ${horseTrailer.horse_reg}`.trim(),
        serial_number: horseTrailer.horse_vin,
        fleet_number: horseTrailer.horse_fleet,
        registration_number: horseTrailer.horse_reg,
        model: horseTrailer.horse_model,
        manufacturer: horseTrailer.horse_make,
        swl: horseTrailer.horse_gvm ? `GVM ${horseTrailer.horse_gvm}` : "",
        client_name: equip.client_name,
        client_id: equip.client_id,
        location: equip.client_location,
        issue_date: iDate,
        inspection_date: iDate,
        expiry_date: expiry,
        next_inspection_due: expiry,
        result: horseTrailer.horse_result,
        defects_found: horseTrailer.horse_notes,
        inspector_name: INSPECTOR_NAME,
        inspector_id: INSPECTOR_ID,
        certificate_type: "Vehicle Registration Certificate",
        folder_id: folderId,
        folder_name: folderName,
        folder_position: 1,
        notes: `Horse Reg: ${horseTrailer.horse_reg} VIN: ${horseTrailer.horse_vin}`,
      });

      if (horseTrailer.has_trailer) {
        certs.push({
          certificate_number: nextNo(),
          equipment_type: "Trailer",
          equipment_description: `Trailer ${horseTrailer.trailer_make} ${horseTrailer.trailer_model} Reg ${horseTrailer.trailer_reg}`.trim(),
          serial_number: horseTrailer.trailer_vin,
          fleet_number: horseTrailer.trailer_fleet,
          registration_number: horseTrailer.trailer_reg,
          model: horseTrailer.trailer_model,
          manufacturer: horseTrailer.trailer_make,
          swl: horseTrailer.trailer_gvm ? `GVM ${horseTrailer.trailer_gvm}` : "",
          client_name: equip.client_name,
          client_id: equip.client_id,
          location: equip.client_location,
          issue_date: iDate,
          inspection_date: iDate,
          expiry_date: expiry,
          next_inspection_due: expiry,
          result: horseTrailer.trailer_result,
          defects_found: horseTrailer.trailer_notes,
          inspector_name: INSPECTOR_NAME,
          inspector_id: INSPECTOR_ID,
          certificate_type: "Trailer Registration Certificate",
          folder_id: folderId,
          folder_name: folderName,
          folder_position: 2,
          notes: `Trailer Reg: ${horseTrailer.trailer_reg} VIN: ${horseTrailer.trailer_vin}`,
        });
      }
    }

    // ── Fork certs ──────────────────────────────────────────────────────────
    if (machineType.steps.includes(4)) {
      forks.forEach((fk, i) => {
        if (!fk.length && !fk.swl) return; // skip blank forks
        certs.push({
          certificate_number: nextNo(),
          equipment_type: "Fork Arm",
          equipment_description: `Fork Arm ${i+1} — ${machineType.label} SN ${equipRef.serial_number}`,
          serial_number: fk.fork_number || `FORK-${equipRef.serial_number}-${i+1}`,
          client_name: equip.client_name,
          client_id: equip.client_id,
          location: equip.client_location,
          issue_date: iDate,
          inspection_date: iDate,
          expiry_date: expiry,
          next_inspection_due: expiry,
          result: fk.result,
          defects_found: fk.notes || "",
          swl: fk.swl || "",
          inspector_name: INSPECTOR_NAME,
          inspector_id: INSPECTOR_ID,
          certificate_type: "Fork Arm Inspection Certificate",
          folder_id: folderId,
          folder_name: folderName,
          folder_position: 10 + i,
          notes: [
            fk.length      ? `Length: ${fk.length}mm`           : "",
            fk.thickness_heel ? `Heel: ${fk.thickness_heel}mm`  : "",
            fk.thickness_blade ? `Blade: ${fk.thickness_blade}mm`: "",
            fk.wear_pct    ? `Wear: ${fk.wear_pct}%`            : "",
            fk.cracks==="yes"   ? "CRACKS FOUND"                : "",
            fk.bending==="yes"  ? "BENDING DETECTED"            : "",
          ].filter(Boolean).join(" | "),
        });
      });
    }

    // ── Pressure vessel certs ───────────────────────────────────────────────
    if (hasPVs) {
      pvs.forEach((pv, i) => {
        if (!pv.sn && !pv.description) return;
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
          expiry_date: addMonths(iDate, 12),
          next_inspection_due: addMonths(iDate, 12),
          result: pv.result,
          defects_found: pv.notes || "",
          inspector_name: INSPECTOR_NAME,
          inspector_id: INSPECTOR_ID,
          certificate_type: "Pressure Test Certificate",
          folder_id: folderId,
          folder_name: folderName,
          folder_position: 20 + i,
        });
      });
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
          <button type="button" onClick={()=>{ setSaved(null); setCurrentStep(1); setMachineTypeId(""); setEquip(p=>({...p,serial_number:"",fleet_number:"",registration_number:"",model:"",manufacturer:""})); }}
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
        .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px}
        .mtype{padding:12px 14px;border-radius:12px;border:1px solid ${T.border};background:${T.card};cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:10px;-webkit-tap-highlight-color:transparent}
        .mtype:hover{border-color:${T.accentBrd};background:${T.accentDim}}
        .mtype.sel{border-color:${T.accent};background:${T.accentDim};box-shadow:0 0 0 1px ${T.accent}}
        @media(max-width:640px){.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · Inspection Wizard</div>
          <h1 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>Machine Inspection</h1>
          <p style={{ margin:0, fontSize:12, color:T.textDim }}>Telehandlers · Cherry Pickers · Forklifts · TLBs · Crane Trucks · Bowsers · Tippers · Horse & Trailer</p>
          <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
            <a href="/certificates/crane-inspection" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>🏗 Crane Inspection →</a>
            <a href="/certificates" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>📜 All Certificates →</a>
          </div>
        </div>

        {/* Step bar */}
        {machineType && <StepBar steps={effectiveSteps} currentStep={currentStep}/>}

        {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:700, marginBottom:16 }}>⚠ {error}</div>}

        {/* ── STEP 1: Equipment Identity ── */}
        {currentStep === 1 && (
          <>
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
                    <div style={{ fontSize:11, color:T.textDim, marginTop:5 }}>
                      Not listed? <a href="/clients/register" target="_blank" style={{ color:T.accent, fontWeight:700 }}>+ Register client</a>
                    </div>
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

                {equip.inspection_date && machineType && (
                  <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                    📅 <strong style={{ color:T.text }}>{machineType.label}</strong> expires: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date, machineType.expiry))}</strong>
                    <span style={{ color:T.textDim }}> ({machineType.expiry} months)</span>
                    {machineType.hasPV && <span style={{ marginLeft:16 }}>· PV expires: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date, 12))}</strong></span>}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── STEP 2: Inspection Checklist ── */}
        {currentStep === 2 && machineType && (
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
                  <textarea style={{ ...IS, minHeight:60 }} placeholder="Recommendations..." value={insp.recommendations||""} onChange={e=>ui("recommendations",e.target.value)}/>
                </Field>
              </div>
            </Card>

            {/* Toggle PV */}
            {machineType.hasPV && (
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:T.text }}>Pressure Vessels</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Does this {machineType.label} have pressure vessels?</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {[{v:true,l:"✓ Yes",c:T.green,bg:T.greenDim,brd:T.greenBrd},{v:false,l:"✗ No",c:T.red,bg:T.redDim,brd:T.redBrd}].map(o=>(
                    <button key={String(o.v)} type="button" onClick={()=>setHasPVs(o.v)}
                      style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${hasPVs===o.v?o.brd:T.border}`, background:hasPVs===o.v?o.bg:T.card, color:hasPVs===o.v?o.c:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3: Boom Inspection ── */}
        {currentStep === 3 && (
          <Card title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>
            <SectionHeading label="Boom Geometry"/>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 6" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></Field>
              <Field label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></Field>
              <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 12" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 10" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
              <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 60" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
              {machineType?.id === "cherry_picker" && (
                <Field label="Max Working Height (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_height} onChange={e=>ub("max_height",e.target.value)}/></Field>
              )}
              {machineType?.id === "telehandler" && (
                <Field label="Jib / Fork Attachment">
                  <select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </Field>
              )}
            </div>

            <SectionHeading label="Working Radius & SWL"/>
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

            <SectionHeading label="Boom Systems Condition"/>
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

        {/* ── STEP 4: Fork Inspection ── */}
        {currentStep === 4 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:T.text }}>Fork Arms Inspection</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>Each fork arm gets its own inspection certificate</div>
              </div>
              {forks.length < 4 && (
                <button type="button" onClick={()=>setForks(p=>[...p,emptyFork()])}
                  style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                  + Add Fork
                </button>
              )}
            </div>

            {forks.map((fk, i) => (
              <Card key={i} title={`Fork Arm ${i+1}`} icon="🍴" color={T.amber} brd={T.amberBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {forks.length > 1 && (
                    <button type="button" onClick={()=>setForks(p=>p.filter((_,j)=>j!==i))}
                      style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Remove
                    </button>
                  )}
                </div>

                <SectionHeading label="Fork Identification"/>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Fork Serial / ID Number">
                    <input style={IS} placeholder="e.g. FK-001-A" value={fk.fork_number} onChange={e=>ufk(i,"fork_number",e.target.value)}/>
                  </Field>
                  <Field label="Safe Working Load (SWL)">
                    <input style={IS} placeholder="e.g. 3T" value={fk.swl} onChange={e=>ufk(i,"swl",e.target.value)}/>
                  </Field>
                </div>

                <SectionHeading label="Fork Dimensions"/>
                <div className="g4" style={{ marginBottom:14 }}>
                  <Field label="Fork Length (mm)">
                    <input style={IS} placeholder="e.g. 1200" value={fk.length} onChange={e=>ufk(i,"length",e.target.value)}/>
                  </Field>
                  <Field label="Thickness at Heel (mm)">
                    <input style={IS} placeholder="e.g. 50" value={fk.thickness_heel} onChange={e=>ufk(i,"thickness_heel",e.target.value)}/>
                  </Field>
                  <Field label="Thickness at Blade (mm)">
                    <input style={IS} placeholder="e.g. 48" value={fk.thickness_blade} onChange={e=>ufk(i,"thickness_blade",e.target.value)}/>
                  </Field>
                  <Field label="Fork Width (mm)">
                    <input style={IS} placeholder="e.g. 150" value={fk.width} onChange={e=>ufk(i,"width",e.target.value)}/>
                  </Field>
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Wear % (vs original thickness)">
                    <input style={IS} placeholder="e.g. 8" value={fk.wear_pct} onChange={e=>ufk(i,"wear_pct",e.target.value)}/>
                  </Field>
                  <Field label="Overall Result">
                    <ResultSelect value={fk.result} onChange={v=>ufk(i,"result",v)}/>
                  </Field>
                </div>

                <SectionHeading label="Defect Assessment"/>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Cracks / Fractures Found?">
                    <select style={IS} value={fk.cracks} onChange={e=>ufk(i,"cracks",e.target.value)}>
                      <option value="no">No</option>
                      <option value="yes">Yes — FAIL</option>
                    </select>
                  </Field>
                  <Field label="Bending / Deformation?">
                    <select style={IS} value={fk.bending} onChange={e=>ufk(i,"bending",e.target.value)}>
                      <option value="no">No</option>
                      <option value="yes">Yes — FAIL</option>
                    </select>
                  </Field>
                </div>
                <Field label="Notes / Observations">
                  <textarea style={{ ...IS, minHeight:60 }} placeholder="Any additional fork inspection notes..." value={fk.notes} onChange={e=>ufk(i,"notes",e.target.value)}/>
                </Field>
              </Card>
            ))}
          </>
        )}

        {/* ── STEP 5: Bucket / Platform Inspection (Cherry Picker) ── */}
        {currentStep === 5 && (
          <Card title="Platform / Bucket Inspection" icon="🪣" color={T.blue} brd={T.blueBrd}>
            <SectionHeading label="Platform Specification"/>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Platform SWL">
                <input style={IS} placeholder="e.g. 250kg" value={bucket.platform_swl} onChange={e=>ubu("platform_swl",e.target.value)}/>
              </Field>
              <Field label="Platform Dimensions (m)">
                <input style={IS} placeholder="e.g. 1.2 x 0.8" value={bucket.platform_dimensions} onChange={e=>ubu("platform_dimensions",e.target.value)}/>
              </Field>
              <Field label="Platform Material">
                <input style={IS} placeholder="e.g. Steel, Fibreglass" value={bucket.platform_material} onChange={e=>ubu("platform_material",e.target.value)}/>
              </Field>
            </div>
            <Field label="Test Load Applied">
              <input style={{ ...IS, marginBottom:14 }} placeholder="e.g. 275kg (110% of SWL)" value={bucket.test_load_applied} onChange={e=>ubu("test_load_applied",e.target.value)}/>
            </Field>

            <SectionHeading label="Platform Structural Condition"/>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Platform Structure"><ResultSelect value={bucket.platform_structure} onChange={v=>ubu("platform_structure",v)}/></Field>
              <Field label="Platform Floor"><ResultSelect value={bucket.platform_floor} onChange={v=>ubu("platform_floor",v)}/></Field>
              <Field label="Guardrails / Toe Boards"><ResultSelect value={bucket.guardrails} onChange={v=>ubu("guardrails",v)}/></Field>
            </div>

            <SectionHeading label="Safety Systems"/>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Gate / Latch System"><ResultSelect value={bucket.gate_latch} onChange={v=>ubu("gate_latch",v)}/></Field>
              <Field label="Platform Levelling"><ResultSelect value={bucket.levelling_system} onChange={v=>ubu("levelling_system",v)}/></Field>
              <Field label="Emergency Lowering"><ResultSelect value={bucket.emergency_lowering} onChange={v=>ubu("emergency_lowering",v)}/></Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Overload / SWL Device"><ResultSelect value={bucket.overload_device} onChange={v=>ubu("overload_device",v)}/></Field>
              <Field label="Tilt / Alarm System"><ResultSelect value={bucket.tilt_alarm} onChange={v=>ubu("tilt_alarm",v)}/></Field>
            </div>
            <Field label="Platform Notes">
              <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional platform inspection notes..." value={bucket.notes} onChange={e=>ubu("notes",e.target.value)}/>
            </Field>
          </Card>
        )}

        {/* ── STEP 6: Pressure Vessels ── */}
        {currentStep === 6 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:T.text }}>Pressure Vessels</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>Up to 8 vessels · Each expires 1 year</div>
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
                  <Field label="Manufacturer"><input style={IS} placeholder="e.g. ASME" value={pv.manufacturer} onChange={e=>upv(i,"manufacturer",e.target.value)}/></Field>
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

        {/* ── STEP 7: Horse & Trailer Registration ── */}
        {currentStep === 7 && (
          <>
            {/* Horse */}
            <Card title="Horse / Prime Mover Registration" icon="🚛" color={T.accent} brd={T.accentBrd}>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Registration Number *">
                  <input style={IS} placeholder="e.g. B 123 ABC" value={horseTrailer.horse_reg} onChange={e=>uht("horse_reg",e.target.value)}/>
                </Field>
                <Field label="Make / Manufacturer">
                  <input style={IS} placeholder="e.g. Mercedes, Scania" value={horseTrailer.horse_make} onChange={e=>uht("horse_make",e.target.value)}/>
                </Field>
                <Field label="Model">
                  <input style={IS} placeholder="e.g. Actros 2648" value={horseTrailer.horse_model} onChange={e=>uht("horse_model",e.target.value)}/>
                </Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="VIN / Chassis Number">
                  <input style={IS} placeholder="e.g. WDB9340031L123456" value={horseTrailer.horse_vin} onChange={e=>uht("horse_vin",e.target.value)}/>
                </Field>
                <Field label="Year of Manufacture">
                  <input style={IS} placeholder="e.g. 2019" value={horseTrailer.horse_year} onChange={e=>uht("horse_year",e.target.value)}/>
                </Field>
                <Field label="Fleet Number">
                  <input style={IS} placeholder="e.g. TRK-005" value={horseTrailer.horse_fleet} onChange={e=>uht("horse_fleet",e.target.value)}/>
                </Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="GVM (Gross Vehicle Mass)">
                  <input style={IS} placeholder="e.g. 26000kg" value={horseTrailer.horse_gvm} onChange={e=>uht("horse_gvm",e.target.value)}/>
                </Field>
                <Field label="Overall Result">
                  <ResultSelect value={horseTrailer.horse_result} onChange={v=>uht("horse_result",v)}/>
                </Field>
              </div>
              <Field label="Notes / Defects">
                <textarea style={{ ...IS, minHeight:60 }} placeholder="Any defects or observations on the horse..." value={horseTrailer.horse_notes} onChange={e=>uht("horse_notes",e.target.value)}/>
              </Field>
            </Card>

            {/* Toggle trailer */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.text }}>Trailer Attached?</div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Does this horse have a trailer to register?</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[{v:true,l:"✓ Yes",c:T.green,bg:T.greenDim,brd:T.greenBrd},{v:false,l:"✗ No",c:T.red,bg:T.redDim,brd:T.redBrd}].map(o=>(
                  <button key={String(o.v)} type="button" onClick={()=>uht("has_trailer",o.v)}
                    style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${horseTrailer.has_trailer===o.v?o.brd:T.border}`, background:horseTrailer.has_trailer===o.v?o.bg:T.card, color:horseTrailer.has_trailer===o.v?o.c:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Trailer */}
            {horseTrailer.has_trailer && (
              <Card title="Trailer Registration" icon="🚚" color={T.purple} brd={T.purpleBrd}>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Registration Number *">
                    <input style={IS} placeholder="e.g. B 456 DEF" value={horseTrailer.trailer_reg} onChange={e=>uht("trailer_reg",e.target.value)}/>
                  </Field>
                  <Field label="Make / Manufacturer">
                    <input style={IS} placeholder="e.g. Afrit, SA Truck Bodies" value={horseTrailer.trailer_make} onChange={e=>uht("trailer_make",e.target.value)}/>
                  </Field>
                  <Field label="Model / Type">
                    <input style={IS} placeholder="e.g. Side Tipper, Flatdeck" value={horseTrailer.trailer_model} onChange={e=>uht("trailer_model",e.target.value)}/>
                  </Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="VIN / Chassis Number">
                    <input style={IS} placeholder="e.g. AF1234567890" value={horseTrailer.trailer_vin} onChange={e=>uht("trailer_vin",e.target.value)}/>
                  </Field>
                  <Field label="Year of Manufacture">
                    <input style={IS} placeholder="e.g. 2020" value={horseTrailer.trailer_year} onChange={e=>uht("trailer_year",e.target.value)}/>
                  </Field>
                  <Field label="Fleet Number">
                    <input style={IS} placeholder="e.g. TRL-005" value={horseTrailer.trailer_fleet} onChange={e=>uht("trailer_fleet",e.target.value)}/>
                  </Field>
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="GVM (Gross Vehicle Mass)">
                    <input style={IS} placeholder="e.g. 34000kg" value={horseTrailer.trailer_gvm} onChange={e=>uht("trailer_gvm",e.target.value)}/>
                  </Field>
                  <Field label="Overall Result">
                    <ResultSelect value={horseTrailer.trailer_result} onChange={v=>uht("trailer_result",v)}/>
                  </Field>
                </div>
                <Field label="Notes / Defects">
                  <textarea style={{ ...IS, minHeight:60 }} placeholder="Any defects or observations on the trailer..." value={horseTrailer.trailer_notes} onChange={e=>uht("trailer_notes",e.target.value)}/>
                </Field>
              </Card>
            )}

            {/* Pressure vessels toggle for horse/trailer */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.text }}>Pressure Vessels</div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Does this horse/trailer have pressure vessels?</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[{v:true,l:"✓ Yes",c:T.green,bg:T.greenDim,brd:T.greenBrd},{v:false,l:"✗ No",c:T.red,bg:T.redDim,brd:T.redBrd}].map(o=>(
                  <button key={String(o.v)} type="button" onClick={()=>setHasPVs(o.v)}
                    style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${hasPVs===o.v?o.brd:T.border}`, background:hasPVs===o.v?o.bg:T.card, color:hasPVs===o.v?o.c:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── STEP 8: Review & Generate ── */}
        {currentStep === 8 && machineType && (
          <Card title="Review & Confirm" icon="📋" color={T.accent}>
            <div style={{ display:"grid", gap:10, marginBottom:16 }}>

              {/* Horse & Trailer summary */}
              {machineType.id === "horse_trailer" && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <div style={{ fontSize:20 }}>🚛</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>Horse — {horseTrailer.horse_make} {horseTrailer.horse_model}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>Reg {horseTrailer.horse_reg} · VIN {horseTrailer.horse_vin||"—"} · Vehicle Registration Certificate · Expires {fmt(expiry)}</div>
                    </div>
                    <ResultBadge result={horseTrailer.horse_result}/>
                  </div>
                  {horseTrailer.has_trailer && (
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                      <div style={{ fontSize:20 }}>🚚</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Trailer — {horseTrailer.trailer_make} {horseTrailer.trailer_model}</div>
                        <div style={{ fontSize:11, color:T.textDim }}>Reg {horseTrailer.trailer_reg} · VIN {horseTrailer.trailer_vin||"—"} · Trailer Registration Certificate · Expires {fmt(addMonths(equip.inspection_date, machineType.expiry))}</div>
                      </div>
                      <ResultBadge result={horseTrailer.trailer_result}/>
                    </div>
                  )}
                </>
              )}

              {/* Main equipment */}
              {machineType.id !== "horse_trailer" && (
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                  <div style={{ fontSize:20 }}>{machineType.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{machineType.label}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>SN {equip.serial_number}{equip.fleet_number?` · Fleet ${equip.fleet_number}`:""}{equip.registration_number?` · Reg ${equip.registration_number}`:""}{equip.model?` · ${equip.model}`:""}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>{machineType.certType} · Expires {fmt(addMonths(equip.inspection_date, machineType.expiry))}</div>
                  </div>
                  <ResultBadge result={insp.overall_result||"PASS"}/>
                </div>
              )}

              {/* Fork summary */}
              {machineType.steps.includes(4) && forks.filter(f=>f.length||f.swl).map((fk,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                  <div style={{ fontSize:18 }}>🍴</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>Fork Arm {i+1} — {fk.fork_number||"—"}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>SWL {fk.swl||"—"} · Length {fk.length||"—"}mm · Wear {fk.wear_pct||"—"}% · Fork Arm Inspection Certificate</div>
                  </div>
                  <ResultBadge result={fk.result}/>
                </div>
              ))}

              {/* Pressure vessels */}
              {hasPVs && pvs.filter(p=>p.sn||p.description).map((pv,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                  <div style={{ fontSize:18 }}>⚙️</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>Pressure Vessel {i+1} — {pv.description||"—"}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>SN {pv.sn||"—"} · {pv.capacity||"—"} · {pv.working_pressure||"—"}/{pv.test_pressure||"—"} {pv.pressure_unit} · Expires {fmt(addMonths(equip.inspection_date, 12))}</div>
                  </div>
                  <ResultBadge result={pv.result}/>
                </div>
              ))}
            </div>

            {(() => {
              const expiry = addMonths(equip.inspection_date, machineType.expiry);
              const totalCerts =
                (machineType.id === "horse_trailer" ? (1 + (horseTrailer.has_trailer?1:0)) : 1) +
                (machineType.steps.includes(4) ? forks.filter(f=>f.length||f.swl).length : 0) +
                (hasPVs ? pvs.filter(p=>p.sn||p.description).length : 0);
              return (
                <div style={{ padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                  📋 Client: <strong style={{ color:T.text }}>{equip.client_name}</strong> &nbsp;·&nbsp;
                  Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp;
                  Date: <strong style={{ color:T.text }}>{fmt(equip.inspection_date)}</strong> &nbsp;·&nbsp;
                  Total: <strong style={{ color:T.accent }}>{totalCerts} certificate{totalCerts>1?"s":""}</strong>
                </div>
              );
            })()}
          </Card>
        )}

        {/* ── Navigation ── */}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:8, flexWrap:"wrap" }}>
          <button type="button"
            onClick={currentStep === 1 ? ()=>router.push("/certificates") : prevStep}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {currentStep === 1 ? "← Cancel" : "← Back"}
          </button>

          {currentStep < 8 ? (
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
