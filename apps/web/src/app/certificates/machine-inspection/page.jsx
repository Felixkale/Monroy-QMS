// src/app/certificates/machine-inspection/page.jsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { autoRaiseNcrBatch } from "@/lib/autoNcr";

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

const MACHINE_TYPES = [
  {
    id:"telehandler", label:"Telehandler", icon:"🏗",
    certType:"Load Test Certificate", expiry:12,
    baseSteps:[1,2,3,4,9], hasPV:true,
    fields:[
      { key:"structural_result", label:"Structural Integrity",             type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                 type:"result" },
      { key:"lmi_result",        label:"Load Management Indicator (LMI)", type:"result" },
      { key:"brakes_result",     label:"Brake / Drive System",             type:"result" },
      { key:"tyres_result",      label:"Tyres & Wheels",                   type:"result" },
      { key:"test_load",         label:"Test Load Applied (Tonnes)",       type:"text", placeholder:"e.g. 5.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",          type:"text", placeholder:"e.g. 5T" },
    ],
  },
  {
    id:"cherry_picker", label:"Cherry Picker / AWP", icon:"🚒",
    certType:"Load Test Certificate", expiry:12,
    baseSteps:[1,2,3,5,9], hasPV:true,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",            type:"result" },
      { key:"hydraulics_result",  label:"Hydraulic System",                type:"result" },
      { key:"safety_devices",     label:"Safety Devices / Interlocks",    type:"result" },
      { key:"emergency_lowering", label:"Emergency Lowering System",      type:"result" },
      { key:"test_load",          label:"Test Load Applied (kg)",          type:"text", placeholder:"e.g. 280" },
      { key:"swl",                label:"Platform SWL",                    type:"text", placeholder:"e.g. 250kg" },
    ],
  },
  {
    id:"forklift", label:"Forklift", icon:"🏭",
    certType:"Load Test Certificate", expiry:12,
    baseSteps:[1,2,4,9], hasPV:false,
    fields:[
      { key:"structural_result", label:"Mast / Structural Integrity",     type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",                type:"result" },
      { key:"brakes_result",     label:"Brake System",                    type:"result" },
      { key:"lmi_result",        label:"Load Indicator / SWL Plate",     type:"result" },
      { key:"tyres_result",      label:"Tyres / Wheels",                  type:"result" },
      { key:"test_load",         label:"Test Load Applied (Tonnes)",      type:"text", placeholder:"e.g. 3.5" },
      { key:"swl",               label:"Safe Working Load (SWL)",         type:"text", placeholder:"e.g. 3T" },
    ],
  },
  {
    id:"tlb", label:"TLB (Tractor Loader Backhoe)", icon:"🚜",
    certType:"Certificate of Inspection", expiry:12,
    baseSteps:[1,2,9], hasPV:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",            type:"result" },
      { key:"loader_result",     label:"Front Loader / Bucket",          type:"result" },
      { key:"backhoe_result",    label:"Backhoe / Excavator Arm",        type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",               type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",       type:"result" },
      { key:"swl",               label:"Rated Digging Force / SWL",      type:"text", placeholder:"e.g. 3T" },
    ],
  },
  {
    id:"frontloader", label:"Front Loader / Wheel Loader", icon:"🏗",
    certType:"Certificate of Inspection", expiry:12,
    baseSteps:[1,2,9], hasPV:false,
    fields:[
      { key:"structural_result", label:"Structural Integrity",            type:"result" },
      { key:"bucket_result",     label:"Bucket / Attachment",            type:"result" },
      { key:"hydraulics_result", label:"Hydraulic System",               type:"result" },
      { key:"safety_result",     label:"ROPS / Safety Structures",       type:"result" },
      { key:"swl",               label:"Rated Operating Capacity",       type:"text", placeholder:"e.g. 3.5T" },
    ],
  },
  {
    id:"service_truck", label:"Service Truck", icon:"🔧",
    certType:"Vehicle Inspection Certificate", expiry:12,
    baseSteps:[1,8,9], hasPV:true,
    fields:[],
    isServiceTruck: true,
  },
  {
    id:"horse_trailer", label:"Horse & Trailer", icon:"🚛",
    certType:"Vehicle Registration Certificate", expiry:12,
    baseSteps:[1,7,9], hasPV:true, fields:[],
  },
  {
    id:"crane_truck",  label:"Crane Truck / Hiab",    icon:"🚛",
    certType:"Load Test Certificate", expiry:12,
    baseSteps:[1,2,3,4,5,6,9], hasPV:true, fields:[],
    isCraneTruck:true,
  },
  {
    id:"water_bowser", label:"Water Bowser",            icon:"🚰",
    certType:"Pressure Test Certificate", expiry:12,
    baseSteps:[1,9], hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"tipper_truck", label:"Tipper Truck",            icon:"🚚",
    certType:"Pressure Test Certificate", expiry:12,
    baseSteps:[1,9], hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"bus",          label:"Bus / Personnel Carrier", icon:"🚌",
    certType:"Pressure Test Certificate", expiry:12,
    baseSteps:[1,9], hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"compressor",   label:"Air Compressor",          icon:"⚙️",
    certType:"Pressure Test Certificate", expiry:12,
    baseSteps:[1,9], hasPV:true, pvOnly:true, fields:[],
  },
  {
    id:"diesel_bowser", label:"Diesel Bowser", icon:"⛽",
    certType:"Vehicle Inspection Certificate", expiry:12,
    baseSteps:[1,8,9], hasPV:true, isMixerTruck:true, fields:[],
  },
  {
    id:"mixer_truck", label:"Mixer Truck", icon:"🚛",
    certType:"Vehicle Inspection Certificate", expiry:12,
    baseSteps:[1,8,9], hasPV:true, isMixerTruck:true, fields:[],
  },
  {
    id:"other", label:"Other Machine / Equipment", icon:"🔩",
    certType:"Certificate of Inspection", expiry:12,
    baseSteps:[1,2,9], hasPV:true,
    fields:[
      { key:"structural_result",  label:"Structural Integrity",           type:"result" },
      { key:"operational_result", label:"Operational Check",             type:"result" },
      { key:"safety_result",      label:"Safety Systems",                type:"result" },
      { key:"swl",                label:"Rated Capacity / SWL",          type:"text", placeholder:"e.g. 5T" },
    ],
  },
];

const STEP_META = {
  1: { label:"Equipment",     icon:"🔧" },
  2: { label:"Checklist",     icon:"🔍" },
  3: { label:"Boom",          icon:"📐" },
  4: { label:"Forks",         icon:"🍴" },
  5: { label:"Platform",      icon:"🪣" },
  6: { label:"Vessels",       icon:"⚙️" },
  7: { label:"Horse/Trailer", icon:"🚛" },
  8: { label:"Truck",         icon:"🔧" },
  9: { label:"Review",        icon:"📜" },
};

const emptySvcTruck  = () => ({ reg:"", make:"", model:"", vin:"", year:"", fleet:"", gvm:"", result:"PASS", notes:"" });
const emptySvcPV     = () => ({ sn:"", description:"Air Receiver", manufacturer:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"", parent_fleet:"", parent_reg:"", parent_make:"", parent_model:"" });
const emptySvcTool   = (type) => ({ type, sn:"", description:"", manufacturer:"", swl:"", result:"PASS", defects:"", include:true });

const SVC_TOOL_TYPES = [
  { id:"drum_clamp",   label:"Drum Clamp",    icon:"🥁" },
  { id:"crawl_beam",   label:"Crawl Beam",    icon:"📏" },
  { id:"lift_beam",    label:"Lift Beam",     icon:"⬆️" },
  { id:"chain_block",  label:"Chain Block",   icon:"⛓" },
  { id:"air_comp",     label:"Air Compressor",icon:"💨" },
];

function addMonths(dateStr, m) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().split("T")[0];
}
function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function generateCompanyCode(name) {
  const i = name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
  return `${i}-${String(Math.floor(Math.random()*900)+100)}`;
}
function defaultInspFields(type) {
  if (!type) return {};
  const obj = {};
  (type.fields||[]).forEach(f => { obj[f.key] = f.type==="result" ? "PASS" : ""; });
  obj.overall_result = "PASS"; obj.defects = ""; obj.recommendations = "";
  return obj;
}
const emptyPV   = () => ({ sn:"", description:"", manufacturer:"", year_manufacture:"", country_origin:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"" });
const emptyFork = () => ({ fork_number:"", length:"", thickness_heel:"", thickness_blade:"", width:"", swl:"", result:"PASS", cracks:"no", bending:"no", wear_pct:"", notes:"" });
const emptyBoom = () => ({ min_radius:"", max_radius:"", min_boom_length:"", max_boom_length:"", actual_boom_length:"", extended_boom_length:"", max_height:"", jib_fitted:"no", swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"", boom_angle:"", load_tested_at_radius:"", test_load:"", luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS", boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS", lmi_test:"PASS", anti_two_block:"PASS", anemometer:"PASS", jib_length:"", jib_angle:"", sli_make_model:"", hook_block_reeving:"",
  c1_boom_length:"", c1_angle:"", c1_radius:"", c1_rated:"", c1_test:"", c1_hook_weight:"",
  c2_boom_length:"", c2_angle:"", c2_radius:"", c2_rated:"", c2_test:"", c2_hook_weight:"",
  c3_boom_length:"", c3_angle:"", c3_radius:"", c3_rated:"", c3_test:"", c3_hook_weight:"",
  hook_ab:"", hook_ac:"", hook2_ab:"", hook2_ac:"", hook3_ab:"", hook3_ac:"",
  notes:"" });
const emptyCraneChecklist = () => ({
  capabilities:"", crane_operation:"PASS", outriggers:"PASS", holding_valve:"PASS", sub_frame:"PASS",
  mounting_brackets:"PASS", base:"PASS", mast:"PASS", main_boom:"PASS", outer_boom:"PASS",
  extension_booms:"PASS", hydraulic_oil_level:"PASS", lubrication:"PASS", load_hook:"PASS",
  lubrication_note:"", remarks_crane_safe:true, remarks_hook_safe:true, overall_result:"PASS",
  defects:"", recommendations:""
});
const emptyCraneHook = () => ({
  serial_number:"", swl:"", ab:"", ac:"", latch_condition:"PASS", structural_result:"PASS",
  wear_percentage:"", result:"PASS", notes:""
});
const emptyCraneRope = () => ({
  diameter:"", broken_wires:"0", corrosion:"none", kinks:"none", length_3x_windings:"yes",
  core_protrusion:"None", damaged_strands:"none", end_fittings:"Good", reduction_dia:"none",
  other_defects:"none", serviceability:"Good", lower_limit:"yes", drum_condition:"Good",
  rope_lay:"Good", aux_diameter:"", aux_broken_wires:"0", aux_corrosion:"none", aux_kinks:"none",
  aux_length_3x_windings:"yes", aux_core_protrusion:"None", aux_damaged_strands:"none",
  aux_end_fittings:"Good", aux_reduction_dia:"none", aux_other_defects:"none",
  aux_serviceability:"Good", aux_lower_limit:"yes", aux_drum_condition:"Good", aux_rope_lay:"Good",
  result:"PASS", notes:""
});
const emptyBucket = () => ({ platform_swl:"", platform_dimensions:"", platform_material:"", platform_structure:"PASS", platform_floor:"PASS", guardrails:"PASS", gate_latch:"PASS", levelling_system:"PASS", emergency_lowering:"PASS", overload_device:"PASS", tilt_alarm:"PASS", test_load_applied:"", notes:"" });
const emptyHT = () => ({ horse_reg:"", horse_make:"", horse_model:"", horse_vin:"", horse_year:"", horse_fleet:"", horse_gvm:"", horse_result:"PASS", horse_notes:"", trailer_reg:"", trailer_make:"", trailer_model:"", trailer_vin:"", trailer_year:"", trailer_fleet:"", trailer_gvm:"", trailer_result:"PASS", trailer_notes:"", has_trailer:true });

function ResultSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={IS}>
      <option value="PASS">Pass</option>
      <option value="FAIL">Fail</option>
      <option value="CONDITIONAL">Conditional</option>
      <option value="REPAIR_REQUIRED">Repair Required</option>
    </select>
  );
}
function ResultBadge({ result }) {
  const s = result==="PASS" ? {c:T.green,bg:T.greenDim,brd:T.greenBrd,l:"Pass"}
          : result==="FAIL" ? {c:T.red,  bg:T.redDim,  brd:T.redBrd,  l:"Fail"}
          : {c:T.amber,bg:T.amberDim,brd:T.amberBrd,l:result==="REPAIR_REQUIRED"?"Repair Required":"Conditional"};
  return <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:800, background:s.bg, border:`1px solid ${s.brd}`, color:s.c }}>{s.l}</span>;
}
function Field({ label, children }) {
  return <div><label style={LS}>{label}</label>{children}</div>;
}
function Card({ title, icon, color=T.accent, brd, children }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${brd||T.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
      {title && <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}><span>{icon}</span><span style={{ fontSize:14, fontWeight:800, color }}>{title}</span></div>}
      {children}
    </div>
  );
}
function SH({ label }) {
  return <div style={{ fontSize:11, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.09em", margin:"18px 0 10px", paddingBottom:6, borderBottom:`1px solid ${T.border}` }}>{label}</div>;
}
function YesNo({ value, onChange, trueLabel="✓ Yes", falseLabel="✗ No" }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {[{v:true,l:trueLabel,c:T.green,bg:T.greenDim,brd:T.greenBrd},{v:false,l:falseLabel,c:T.red,bg:T.redDim,brd:T.redBrd}].map(o=>(
        <button key={String(o.v)} type="button" onClick={()=>onChange(o.v)}
          style={{ padding:"8px 18px", borderRadius:9, border:`1px solid ${value===o.v?o.brd:T.border}`, background:value===o.v?o.bg:T.card, color:value===o.v?o.c:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function StepBar({ steps, currentStep, machineType }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:24, overflowX:"auto", paddingBottom:4 }}>
      {steps.map((sid, i) => {
        let meta=STEP_META[sid];
        if (machineType?.id==="crane_truck") {
          if (sid===4) meta = { label:"Hook", icon:"🪝" };
          if (sid===5) meta = { label:"Rope", icon:"🪢" };
        }
        const done=sid<currentStep, active=sid===currentStep;
        return (
          <div key={sid} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, flexShrink:0, background:done?T.green:active?T.accent:T.card, border:`2px solid ${done?T.green:active?T.accent:T.border}`, color:(done||active)?"#052e16":T.textDim }}>
                {done ? "✓" : meta.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:700, color:active?T.accent:done?T.green:T.textDim, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{meta.label}</div>
            </div>
            {i < steps.length-1 && <div style={{ height:2, width:16, background:done?T.green:T.border, marginBottom:20, flexShrink:0 }}/>}
          </div>
        );
      })}
    </div>
  );
}

export default function MachineInspectionPage() {
  const router = useRouter();
  const [clients,       setClients]       = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(null);
  const [error,         setError]         = useState("");
  const [machineTypeId, setMachineTypeId] = useState("");
  const [currentStep,   setCurrentStep]   = useState(1);
  const [hasPVs,        setHasPVs]        = useState(false);
  const [ncrResults,    setNcrResults]    = useState([]);
  const [ncrRunning,    setNcrRunning]    = useState(false);
  const [equip, setEquip] = useState({ client_id:"", client_name:"", client_location:"", serial_number:"", fleet_number:"", registration_number:"", model:"", manufacturer:"", swl:"", machine_hours:"", inspection_date:new Date().toISOString().split("T")[0] });
  const [insp,   setInsp]   = useState({});
  const [boom,   setBoom]   = useState(emptyBoom());
  const [craneChecklist, setCraneChecklist] = useState(emptyCraneChecklist());
  const [craneHook, setCraneHook] = useState(emptyCraneHook());
  const [craneRope, setCraneRope] = useState(emptyCraneRope());
  const [forks,  setForks]  = useState([emptyFork(), emptyFork()]);
  const [bucket, setBucket] = useState(emptyBucket());
  const [pvs,    setPvs]    = useState([emptyPV()]);
  const [ht,     setHt]     = useState(emptyHT());

  const [svcTruck, setSvcTruck] = useState(emptySvcTruck());
  const [svcPVs,   setSvcPVs]   = useState([emptySvcPV()]);
  const [svcTools, setSvcTools] = useState(SVC_TOOL_TYPES.map(t => emptySvcTool(t.id)));

  const machineType = useMemo(() => MACHINE_TYPES.find(m=>m.id===machineTypeId)||null, [machineTypeId]);

  const effectiveSteps = useMemo(() => {
    if (!machineType) return [1];
    const base = [...machineType.baseSteps];
    if (hasPVs && machineType.hasPV && !base.includes(6) && !machineType.isServiceTruck && !machineType.isMixerTruck) {
      const idx9 = base.indexOf(9);
      if (idx9 >= 0) base.splice(idx9, 0, 6);
    }
    return base;
  }, [machineType, hasPVs]);

  useEffect(() => {
    supabase.from("clients").select("id,company_name,city").order("company_name").then(({data})=>setClients(data||[]));
  }, []);

  useEffect(() => {
    if (!machineTypeId) return;
    const mt = MACHINE_TYPES.find(m=>m.id===machineTypeId);
    if (!mt) return;
    setInsp(defaultInspFields(mt));
    setHasPVs(!!mt.pvOnly);
    setCurrentStep(1);
    setBoom(emptyBoom()); setCraneChecklist(emptyCraneChecklist()); setCraneHook(emptyCraneHook()); setCraneRope(emptyCraneRope()); setForks([emptyFork(),emptyFork()]); setBucket(emptyBucket()); setPvs([emptyPV()]); setHt(emptyHT());
    setSvcTruck(emptySvcTruck()); setSvcPVs([emptySvcPV()]); setSvcTools(SVC_TOOL_TYPES.map(t=>emptySvcTool(t.id)));
  }, [machineTypeId]);

  const ue  = (k,v) => setEquip(p=>({...p,[k]:v}));
  const ub  = (k,v) => setBoom(p=>({...p,[k]:v}));
  const ucq = (k,v) => setCraneChecklist(p=>({...p,[k]:v}));
  const uch = (k,v) => setCraneHook(p=>({...p,[k]:v}));
  const ucr = (k,v) => setCraneRope(p=>({...p,[k]:v}));
  const ui  = (k,v) => setInsp(p=>({...p,[k]:v}));
  const ubu = (k,v) => setBucket(p=>({...p,[k]:v}));
  const uht = (k,v) => setHt(p=>({...p,[k]:v}));
  const upv = (i,k,v) => setPvs(p=>p.map((x,j)=>{
    if(j!==i) return x;
    const updated = {...x,[k]:v};
    if(k==="working_pressure"){
      const mawp=parseFloat(v)||0;
      updated.test_pressure = mawp ? String((mawp*1.5).toFixed(2)).replace(/\.?0+$/,"") : "";
    }
    return updated;
  }));
  const ufk = (i,k,v) => setForks(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));
  const ust = (k,v) => {
    setSvcTruck(p=>({...p,[k]:v}));
    if(["reg","fleet","make","model"].includes(k)){
      setSvcPVs(p=>p.map(pv=>({...pv,[`parent_${k}`]:v})));
    }
  };
  const uspv = (i,k,v) => setSvcPVs(p=>p.map((x,j)=>{
    if(j!==i) return x;
    const updated = {...x,[k]:v};
    if(k==="working_pressure"){
      const mawp = parseFloat(v)||0;
      updated.test_pressure = mawp ? String((mawp*1.5).toFixed(2)).replace(/\.?0+$/,"") : "";
    }
    return updated;
  }));
  const utool = (i,k,v) => setSvcTools(p=>p.map((x,j)=>j===i?{...x,[k]:v}:x));

  function clientSelected(id) {
    const c = clients.find(x=>x.id===id);
    setEquip(p=>({...p, client_id:id, client_name:c?.company_name||"", client_location:c?.city||""}));
  }
  function nextStep() {
    setError("");
    if (currentStep===1 && (!machineTypeId||!equip.client_id||!equip.serial_number)) { setError("Please select equipment type, client and enter a serial number."); return; }
    const idx = effectiveSteps.indexOf(currentStep);
    if (idx < effectiveSteps.length-1) setCurrentStep(effectiveSteps[idx+1]);
  }
  function prevStep() {
    const idx = effectiveSteps.indexOf(currentStep);
    if (idx > 0) setCurrentStep(effectiveSteps[idx-1]);
    else router.push("/certificates");
  }

  function buildCraneTruckNotes() {
    const c1Boom   = boom.c1_boom_length || boom.min_boom_length || "";
    const c1Angle  = boom.c1_angle || "";
    const c1Radius = boom.c1_radius || boom.min_radius || "";
    const c1Rated  = boom.c1_rated || boom.swl_at_min_radius || "";
    const c1Test   = boom.c1_test || "";
    const c1HookW  = boom.c1_hook_weight || "";

    const c2Boom   = boom.c2_boom_length || boom.actual_boom_length || "";
    const c2Angle  = boom.c2_angle || boom.boom_angle || "";
    const c2Radius = boom.c2_radius || boom.load_tested_at_radius || "";
    const c2Rated  = boom.c2_rated || boom.swl_at_actual_config || equip.swl || "";
    const c2Test   = boom.c2_test || boom.test_load || "";
    const c2HookW  = boom.c2_hook_weight || "";

    const c3Boom   = boom.c3_boom_length || boom.max_boom_length || "";
    const c3Angle  = boom.c3_angle || "";
    const c3Radius = boom.c3_radius || boom.max_radius || "";
    const c3Rated  = boom.c3_rated || boom.swl_at_max_radius || "";
    const c3Test   = boom.c3_test || "";
    const c3HookW  = boom.c3_hook_weight || "";

    return [
      `Capabilities: ${craneChecklist.capabilities || equip.swl || ""}`,
      `Outriggers: ${craneChecklist.outriggers}`,
      `Crane operation: ${craneChecklist.crane_operation}`,
      `Holding valve: ${craneChecklist.holding_valve}`,
      `Sub frame: ${craneChecklist.sub_frame}`,
      `Mounting brackets: ${craneChecklist.mounting_brackets}`,
      `Base: ${craneChecklist.base}`,
      `Mast: ${craneChecklist.mast}`,
      `Main boom: ${craneChecklist.main_boom}`,
      `Outer boom: ${craneChecklist.outer_boom}`,
      `Extension booms: ${craneChecklist.extension_booms}`,
      `Hydraulic oil level: ${craneChecklist.hydraulic_oil_level}`,
      `Lubrication: ${craneChecklist.lubrication}`,
      craneChecklist.lubrication_note ? `Lubrication note: ${craneChecklist.lubrication_note}` : "",
      `Load hook: ${craneChecklist.load_hook}`,
      `Remarks crane safe: ${craneChecklist.remarks_crane_safe ? "YES" : "NO"}`,
      `Remarks hook safe: ${craneChecklist.remarks_hook_safe ? "YES" : "NO"}`,
      equip.machine_hours ? `Machine Hours: ${equip.machine_hours}` : "",
      c1Boom ? `C1 boom: ${c1Boom}m` : "",
      c1Angle ? `C1 angle: ${c1Angle}` : "",
      c1Radius ? `C1 radius: ${c1Radius}m` : "",
      c1Rated ? `C1 rated: ${c1Rated}` : "",
      c1Test ? `C1 test: ${c1Test}` : "",
      c1HookW ? `C1 hook weight: ${c1HookW}` : "",
      c2Boom ? `C2 boom: ${c2Boom}m` : "",
      c2Angle ? `C2 angle: ${c2Angle}` : "",
      c2Radius ? `C2 radius: ${c2Radius}m` : "",
      c2Rated ? `C2 rated: ${c2Rated}` : "",
      c2Test ? `C2 test: ${c2Test}` : "",
      c2HookW ? `C2 hook weight: ${c2HookW}` : "",
      c3Boom ? `C3 boom: ${c3Boom}m` : "",
      c3Angle ? `C3 angle: ${c3Angle}` : "",
      c3Radius ? `C3 radius: ${c3Radius}m` : "",
      c3Rated ? `C3 rated: ${c3Rated}` : "",
      c3Test ? `C3 test: ${c3Test}` : "",
      c3HookW ? `C3 hook weight: ${c3HookW}` : "",
      boom.jib_fitted === "yes" && boom.jib_length ? `Jib: ${boom.jib_length}m @ ${boom.jib_angle || ""}°` : "",
      boom.sli_make_model ? `SLI model: ${boom.sli_make_model}` : "",
      boom.hook_block_reeving ? `Reeving: ${boom.hook_block_reeving}` : "",
      `SLI: ${boom.lmi_test || "PASS"}`,
      `Boom structure: ${boom.boom_structure}`,
      `Boom pins: ${boom.boom_pins}`,
      `Boom wear: ${boom.boom_wear}`,
      `Luffing: ${boom.luffing_system}`,
      `Slew: ${boom.slew_system}`,
      `Hoist: ${boom.hoist_system}`,
      `Anti-two-block: ${boom.anti_two_block}`,
      `Anemometer: ${boom.anemometer || "PASS"}`,
      craneHook.swl ? `Hook 1 SWL: ${craneHook.swl}` : "",
      craneHook.serial_number ? `Hook 1 SN: ${craneHook.serial_number}` : "",
      craneHook.ab ? `Hook AB: ${craneHook.ab}` : (boom.hook_ab ? `Hook AB: ${boom.hook_ab}` : ""),
      craneHook.ac ? `Hook AC: ${craneHook.ac}` : (boom.hook_ac ? `Hook AC: ${boom.hook_ac}` : ""),
      craneHook.wear_percentage ? `Wear: ${craneHook.wear_percentage}` : "",
      `Latch: ${craneHook.latch_condition}`,
      `Structural: ${craneHook.structural_result}`,
      craneRope.diameter ? `Rope dia: ${craneRope.diameter}mm` : "",
      `Broken wires: ${craneRope.broken_wires}`,
      `Corrosion: ${craneRope.corrosion}`,
      `Kinks: ${craneRope.kinks}`,
      craneRope.reduction_dia ? `Reduction dia: ${craneRope.reduction_dia}` : "",
      craneRope.core_protrusion ? `Core protrusion: ${craneRope.core_protrusion}` : "",
      craneRope.damaged_strands ? `Damaged strands: ${craneRope.damaged_strands}` : "",
      craneRope.end_fittings ? `End fittings: ${craneRope.end_fittings}` : "",
      craneRope.other_defects ? `Other defects: ${craneRope.other_defects}` : "",
      craneRope.serviceability ? `Serviceability: ${craneRope.serviceability}` : "",
      craneRope.lower_limit ? `Lower limit: ${craneRope.lower_limit}` : "",
      craneRope.length_3x_windings ? `3x windings: ${craneRope.length_3x_windings}` : "",
      craneRope.drum_condition ? `Drum condition: ${craneRope.drum_condition}` : "",
      craneRope.rope_lay ? `Rope lay: ${craneRope.rope_lay}` : "",
      craneRope.aux_diameter ? `Aux rope dia: ${craneRope.aux_diameter}mm` : "",
      `Aux broken wires: ${craneRope.aux_broken_wires}`,
      `Aux corrosion: ${craneRope.aux_corrosion}`,
      `Aux kinks: ${craneRope.aux_kinks}`,
      craneRope.aux_reduction_dia ? `Aux reduction dia: ${craneRope.aux_reduction_dia}` : "",
      craneRope.aux_core_protrusion ? `Aux core protrusion: ${craneRope.aux_core_protrusion}` : "",
      craneRope.aux_damaged_strands ? `Aux damaged strands: ${craneRope.aux_damaged_strands}` : "",
      craneRope.aux_end_fittings ? `Aux end fittings: ${craneRope.aux_end_fittings}` : "",
      craneRope.aux_other_defects ? `Aux other defects: ${craneRope.aux_other_defects}` : "",
      craneRope.aux_serviceability ? `Aux serviceability: ${craneRope.aux_serviceability}` : "",
      craneRope.aux_lower_limit ? `Aux lower limit: ${craneRope.aux_lower_limit}` : "",
      craneRope.aux_length_3x_windings ? `Aux 3x windings: ${craneRope.aux_length_3x_windings}` : "",
      craneRope.aux_drum_condition ? `Aux drum condition: ${craneRope.aux_drum_condition}` : "",
      craneRope.aux_rope_lay ? `Aux rope lay: ${craneRope.aux_rope_lay}` : "",
      craneChecklist.defects ? `Defects: ${craneChecklist.defects}` : "",
      craneChecklist.recommendations ? `Recommendations: ${craneChecklist.recommendations}` : "",
      boom.notes ? `Boom notes: ${boom.notes}` : "",
      craneHook.notes ? `Hook notes: ${craneHook.notes}` : "",
      craneRope.notes ? `Rope notes: ${craneRope.notes}` : "",
      `Operating code: MAIN/AUX-FULL OUTRIGGER-360DEG`,
      `Counterweights: STD FITTED`
    ].filter(Boolean).join(" | ");
  }

  function buildNotes() {
    if (!machineType) return "";
    if (machineType.id === "crane_truck") return buildCraneTruckNotes();
    const data = {};
    if ((machineType.fields||[]).length) {
      data.checklist = {};
      (machineType.fields||[]).forEach(f => { data.checklist[f.key] = insp[f.key]||""; });
      data.overall_result = insp.overall_result||"PASS";
      data.defects = insp.defects||"";
      data.recommendations = insp.recommendations||"";
    }
    if (machineType.baseSteps.includes(3)) data.boom = { ...boom };
    if (machineType.baseSteps.includes(4)) data.forks = forks;
    if (machineType.baseSteps.includes(5)) data.bucket = { ...bucket };
    return JSON.stringify(data);
  }

  async function ensureClient(name, city) {
    if (!name?.trim()) return;
    const {data:ex} = await supabase.from("clients").select("id").ilike("company_name",name.trim()).maybeSingle();
    if (!ex) await supabase.from("clients").insert({company_name:name.trim(),company_code:generateCompanyCode(name),city:city||"",country:"Botswana",status:"active"});
  }

  async function handleGenerate() {
    if (!machineType || !equip.client_id || !equip.serial_number) {
      setError("Missing required fields.");
      return;
    }
    setSaving(true);
    setError("");

    await ensureClient(equip.client_name, equip.client_location);

    const equipRef = { ...equip };
    if (!equipRef.serial_number?.trim()) {
      const cc = (equipRef.client_name || "UNK").split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 3).padEnd(3, "X");
      const ec = (machineType.label || "EQP").split(/[\s/—-]+/).filter(Boolean).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 3).padEnd(3, "X");
      equipRef.serial_number = `${cc}-${ec}-${String(Date.now()).slice(-6)}`;
    }

    const folderId   = crypto.randomUUID();
    const folderName = `${machineType.label}-${equipRef.serial_number}-${equip.inspection_date}`;
    const iDate      = equip.inspection_date;
    const expiryDate = addMonths(iDate, machineType.expiry);
    const certs      = [];

    const { count } = await supabase.from("certificates").select("*", { count: "exact", head: true });
    let seq = (count || 0) + 1;
    const pad    = n => String(n).padStart(5, "0");
    const prefix = machineType.id.slice(0, 2).toUpperCase();
    const nextNo = () => `CERT-${prefix}${pad(seq++)}`;
    const swl    = insp.swl || "";

    // ── SERVICE TRUCK / MIXER / BOWSER ─────────────────────────────────────
    if (machineType.isServiceTruck || machineType.isMixerTruck) {
      const truckLabel = machineType.id === "diesel_bowser" ? "Diesel Bowser"
        : machineType.isMixerTruck ? "Mixer Truck" : "Service Truck";
      const truckDesc = `${truckLabel} ${svcTruck.make} ${svcTruck.model} Reg ${svcTruck.reg}`.trim();
      certs.push({
        certificate_number: nextNo(), equipment_type: truckLabel, equipment_description: truckDesc,
        serial_number: svcTruck.vin || equipRef.serial_number, fleet_number: svcTruck.fleet,
        registration_number: svcTruck.reg, model: svcTruck.model, manufacturer: svcTruck.make,
        swl: svcTruck.gvm ? `GVM ${svcTruck.gvm}` : "", client_name: equip.client_name,
        client_id: equip.client_id, location: equip.client_location,
        issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
        result: svcTruck.result, defects_found: svcTruck.notes || "",
        inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
        certificate_type: "Vehicle Inspection Certificate",
        folder_id: folderId, folder_name: folderName, folder_position: 1,
        notes: JSON.stringify({ truck: svcTruck }),
      });

      svcPVs.forEach((pv, i) => {
        if (!pv.sn && !pv.description) return;
        certs.push({
          certificate_number: nextNo(), equipment_type: "Pressure Vessel",
          equipment_description: pv.description || `Air Receiver ${i + 1}`,
          serial_number: pv.sn, manufacturer: pv.manufacturer, capacity_volume: pv.capacity,
          working_pressure: pv.working_pressure,
          test_pressure: pv.test_pressure || String(((parseFloat(pv.working_pressure) || 0) * 1.5).toFixed(2)).replace(/\.?0+$/, ""),
          design_pressure: pv.working_pressure, pressure_unit: pv.pressure_unit,
          fleet_number: svcTruck.fleet, registration_number: svcTruck.reg,
          client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
          issue_date: iDate, inspection_date: iDate,
          expiry_date: addMonths(iDate, 12), next_inspection_due: addMonths(iDate, 12),
          result: pv.result, defects_found: pv.notes || "",
          inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
          certificate_type: "Pressure Test Certificate",
          folder_id: folderId, folder_name: folderName, folder_position: 10 + i,
          notes: JSON.stringify({ parent_reg: svcTruck.reg, parent_fleet: svcTruck.fleet, parent_make: svcTruck.make, parent_model: svcTruck.model }),
        });
      });

      if (machineType.isServiceTruck) {
        svcTools.forEach((tool, i) => {
          if (!tool.include) return;
          const toolMeta = SVC_TOOL_TYPES.find(t => t.id === tool.type);
          certs.push({
            certificate_number: nextNo(), equipment_type: toolMeta?.label || tool.type,
            equipment_description: tool.description || `${toolMeta?.label || tool.type} — SN ${tool.sn || "—"}`,
            serial_number: tool.sn, manufacturer: tool.manufacturer, swl: tool.swl,
            client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
            issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
            result: tool.result, defects_found: tool.defects || "",
            inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
            certificate_type: "Load Test Certificate",
            folder_id: folderId, folder_name: folderName, folder_position: 20 + i,
            notes: JSON.stringify({ parent_reg: svcTruck.reg, parent_fleet: svcTruck.fleet }),
          });
        });
      }

    } else if (machineType.id === "crane_truck") {
      const desc = [
        "Truck Mounted Crane / Hiab",
        equip.model ? equip.model : "",
        equip.swl ? `SWL ${equip.swl}` : "",
        equip.fleet_number ? `Fleet ${equip.fleet_number}` : "",
        equip.registration_number ? `Reg ${equip.registration_number}` : ""
      ].filter(Boolean).join(" ");
      certs.push({
        certificate_number: nextNo(),
        equipment_type: "Truck Mounted Crane / Hiab",
        equipment_description: desc,
        serial_number: equipRef.serial_number,
        fleet_number: equipRef.fleet_number,
        registration_number: equip.registration_number,
        model: equip.model,
        manufacturer: equip.manufacturer,
        swl: equip.swl || craneChecklist.capabilities || "",
        client_name: equip.client_name,
        client_id: equip.client_id,
        location: equip.client_location,
        issue_date: iDate,
        inspection_date: iDate,
        expiry_date: expiryDate,
        next_inspection_due: expiryDate,
        result: craneChecklist.overall_result || "PASS",
        defects_found: craneChecklist.defects || "",
        recommendations: craneChecklist.recommendations || "",
        inspector_name: INSPECTOR_NAME,
        inspector_id: INSPECTOR_ID,
        certificate_type: "Load Test Certificate",
        folder_id: folderId,
        folder_name: folderName,
        folder_position: 1,
        notes: buildCraneTruckNotes(),
      });
    } else if (machineType.id === "horse_trailer") {
      const htNotes = JSON.stringify({
        horse:   { reg: ht.horse_reg, make: ht.horse_make, model: ht.horse_model, vin: ht.horse_vin, year: ht.horse_year, fleet: ht.horse_fleet, gvm: ht.horse_gvm, result: ht.horse_result, notes: ht.horse_notes },
        trailer: ht.has_trailer ? { reg: ht.trailer_reg, make: ht.trailer_make, model: ht.trailer_model, vin: ht.trailer_vin, year: ht.trailer_year, fleet: ht.trailer_fleet, gvm: ht.trailer_gvm, result: ht.trailer_result, notes: ht.trailer_notes } : null,
      });
      certs.push({ certificate_number: nextNo(), equipment_type: "Horse / Prime Mover", equipment_description: `Horse ${ht.horse_make} ${ht.horse_model} Reg ${ht.horse_reg}`.trim(), serial_number: ht.horse_vin, fleet_number: ht.horse_fleet, registration_number: ht.horse_reg, model: ht.horse_model, manufacturer: ht.horse_make, swl: ht.horse_gvm ? `GVM ${ht.horse_gvm}` : "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: ht.horse_result, defects_found: ht.horse_notes, inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Vehicle Registration Certificate", folder_id: folderId, folder_name: folderName, folder_position: 1, notes: htNotes });
      if (ht.has_trailer) certs.push({ certificate_number: nextNo(), equipment_type: "Trailer", equipment_description: `Trailer ${ht.trailer_make} ${ht.trailer_model} Reg ${ht.trailer_reg}`.trim(), serial_number: ht.trailer_vin, fleet_number: ht.trailer_fleet, registration_number: ht.trailer_reg, model: ht.trailer_model, manufacturer: ht.trailer_make, swl: ht.trailer_gvm ? `GVM ${ht.trailer_gvm}` : "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: ht.trailer_result, defects_found: ht.trailer_notes, inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Trailer Registration Certificate", folder_id: folderId, folder_name: folderName, folder_position: 2, notes: htNotes });
    } else {
      const desc = [machineType.label, equip.model ? `(${equip.model})` : "", swl ? `SWL ${swl}` : "", equip.fleet_number ? `Fleet ${equip.fleet_number}` : "", equip.registration_number ? `Reg ${equip.registration_number}` : ""].filter(Boolean).join(" ");
      certs.push({
        certificate_number: nextNo(), equipment_type: machineType.label, equipment_description: desc,
        serial_number: equipRef.serial_number, fleet_number: equipRef.fleet_number,
        registration_number: equip.registration_number, model: equip.model, manufacturer: equip.manufacturer,
        swl, client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
        issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
        result: insp.overall_result || "PASS", defects_found: insp.defects || "", recommendations: insp.recommendations || "",
        inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
        certificate_type: machineType.certType, folder_id: folderId, folder_name: folderName, folder_position: 1,
        notes: buildNotes(),
      });
    }

    // Fork arms
    if (machineType.baseSteps.includes(4) && machineType.id !== "crane_truck") {
      forks.forEach((fk, i) => {
        if (!fk.length && !fk.swl) return;
        certs.push({ certificate_number: nextNo(), equipment_type: "Fork Arm", equipment_description: `Fork Arm ${i + 1} — ${machineType.label} SN ${equipRef.serial_number}`, serial_number: fk.fork_number || `FORK-${equipRef.serial_number}-${i + 1}`, swl: fk.swl || "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: fk.result, defects_found: fk.notes || "", inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Fork Arm Inspection Certificate", folder_id: folderId, folder_name: folderName, folder_position: 10 + i, notes: [fk.length ? `L:${fk.length}mm` : "", fk.thickness_heel ? `Heel:${fk.thickness_heel}mm` : "", fk.thickness_blade ? `Blade:${fk.thickness_blade}mm` : "", fk.wear_pct ? `Wear:${fk.wear_pct}%` : "", fk.cracks === "yes" ? "CRACKS" : "", fk.bending === "yes" ? "BENDING" : ""].filter(Boolean).join(" | ") });
      });
    }

    // General PVs (non service truck)
    if (hasPVs && !machineType.isServiceTruck && !machineType.isMixerTruck) {
      pvs.forEach((pv, i) => {
        if (!pv.sn && !pv.description) return;
        certs.push({ certificate_number: nextNo(), equipment_type: "Pressure Vessel", equipment_description: pv.description || `Pressure Vessel ${i + 1} — SN ${equip.serial_number}`, serial_number: pv.sn, manufacturer: pv.manufacturer, year_built: pv.year_manufacture, country_of_origin: pv.country_origin, capacity_volume: pv.capacity, working_pressure: pv.working_pressure, test_pressure: pv.test_pressure || String(((parseFloat(pv.working_pressure) || 0) * 1.5).toFixed(2)).replace(/\.?0+$/, ""), design_pressure: pv.working_pressure, pressure_unit: pv.pressure_unit, fleet_number: equipRef.fleet_number || "", registration_number: equip.registration_number || "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: addMonths(iDate, 12), next_inspection_due: addMonths(iDate, 12), result: pv.result, defects_found: pv.notes || "", inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Pressure Test Certificate", folder_id: folderId, folder_name: folderName, folder_position: 20 + i });
      });
    }

    // ── INSERT ────────────────────────────────────────────────────────────
    const { data, error: dbErr } = await supabase
      .from("certificates").insert(certs).select("id,certificate_number,equipment_type,result,expiry_date");

    if (dbErr) {
      setError("Failed to save: " + dbErr.message);
      setSaving(false);
      return;
    }

    setSaved({ folderName, certs: data });
    setSaving(false);

    // ── AUTO-RAISE NCR + CAPA ─────────────────────────────────────────────
    const nonPassCerts = (data || []).filter(c => {
      const r = String(c.result || "").toUpperCase().replace(/\s+/g, "_");
      return ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"].includes(r);
    });

    if (nonPassCerts.length > 0) {
      setNcrRunning(true);
      try {
        const results = await autoRaiseNcrBatch(nonPassCerts, { createCapa: true });
        setNcrResults(results);
      } catch (err) {
        console.warn("Auto NCR batch failed:", err.message);
      } finally {
        setNcrRunning(false);
      }
    }
  }

  // ── SAVED ─────────────────────────────────────────────────────────────────
  if (saved) return (
    <AppLayout title="Inspection Complete">
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:820, margin:"0 auto" }}>

        {/* Success hero */}
        <div style={{ background:T.greenDim, border:`1px solid ${T.greenBrd}`, borderRadius:18, padding:28, textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:900, color:T.green, marginBottom:6 }}>Inspection Complete</div>
          <div style={{ fontSize:14, color:T.textMid, marginBottom:4 }}>{saved.certs.length} certificate{saved.certs.length > 1 ? "s" : ""} generated</div>
          <div style={{ fontSize:12, color:T.textDim }}>{saved.folderName}</div>
        </div>

        {/* NCR/CAPA auto-raise status */}
        {(ncrRunning || ncrResults.length > 0) && (
          <div style={{ marginBottom:20, background:ncrRunning ? T.accentDim : T.redDim, border:`1px solid ${ncrRunning ? T.accentBrd : T.redBrd}`, borderRadius:14, padding:16 }}>
            {ncrRunning ? (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", border:`2.5px solid rgba(34,211,238,0.2)`, borderTopColor:T.accent, animation:"spin .7s linear infinite", flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:T.accent }}>Raising NCR &amp; CAPA reports…</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Non-compliant results detected — creating compliance records automatically</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:18 }}>🚨</span>
                  <div style={{ fontSize:14, fontWeight:900, color:T.red }}>
                    {ncrResults.filter(r => !r.skipped && r.ncr).length} NCR{ncrResults.filter(r => !r.skipped && r.ncr).length !== 1 ? "s" : ""} &amp; CAPA{ncrResults.filter(r => !r.skipped && r.capa).length !== 1 ? "s" : ""} auto-raised
                  </div>
                </div>
                <div style={{ display:"grid", gap:8 }}>
                  {ncrResults.map((r, i) => {
                    if (!r.ncr) return null;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(0,0,0,0.15)", flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color:T.red, fontWeight:800 }}>{r.ncr.ncr_number}</div>
                          {r.capa && <div style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:T.purple, marginTop:2 }}>{r.capa.capa_number}</div>}
                          {r.skipped && <div style={{ fontSize:10, color:T.amber, marginTop:2 }}>Already existed</div>}
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <a href={`/ncr/${r.ncr.id}`} target="_blank" rel="noreferrer"
                            style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontWeight:800, fontSize:11, textDecoration:"none" }}>
                            NCR →
                          </a>
                          {r.capa && (
                            <a href={`/capa/${r.capa.id}`} target="_blank" rel="noreferrer"
                              style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${T.purpleBrd}`, background:T.purpleDim, color:T.purple, fontWeight:800, fontSize:11, textDecoration:"none" }}>
                              CAPA →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Certificate list */}
        <div style={{ display:"grid", gap:10, marginBottom:20 }}>
          {saved.certs.map(c => (
            <div key={c.id} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{c.certificate_number}</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>{c.equipment_type} · Expires {fmt(c.expiry_date)}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <ResultBadge result={c.result} />
                <button type="button" onClick={() => window.open(`/certificates/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.accentBrd}`, background:T.accentDim, color:T.accent, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  View →
                </button>
                <button type="button" onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button type="button"
            onClick={() => { setSaved(null); setNcrResults([]); setNcrRunning(false); setCurrentStep(1); setMachineTypeId(""); setCraneChecklist(emptyCraneChecklist()); setCraneHook(emptyCraneHook()); setCraneRope(emptyCraneRope()); setEquip(p => ({ ...p, serial_number:"", fleet_number:"", registration_number:"", model:"", manufacturer:"", swl:"", machine_hours:"" })); }}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.text, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            New Inspection
          </button>
          <button type="button"
            onClick={() => { const ids = saved.certs.map(c => c.id).join(","); window.open(`/certificates/bulk-print?ids=${ids}`, "_blank"); }}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            🖨 Generate &amp; Store PDFs
          </button>
          <button type="button" onClick={() => router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            View All Certificates →
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── WIZARD ───────────────────────────────────────────────────────────────
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
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:640px){.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:900, margin:"0 auto" }}>

        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · Inspection Wizard</div>
          <h1 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>Machine Inspection</h1>
          <p style={{ margin:0, fontSize:12, color:T.textDim }}>Telehandlers · Cherry Pickers · Forklifts · TLBs · Service Trucks · Horse &amp; Trailer</p>
          <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
            <a href="/certificates/crane-inspection" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>🏗 Crane Inspection →</a>
            <a href="/certificates" style={{ fontSize:11, color:T.accent, textDecoration:"none", fontWeight:700 }}>📜 All Certificates →</a>
          </div>
        </div>

        {machineType && <StepBar steps={effectiveSteps} currentStep={currentStep} machineType={machineType}/>}
        {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:700, marginBottom:16 }}>⚠ {error}</div>}

        {/* STEP 1 */}
        {currentStep === 1 && (
          <>
            <Card title="Select Equipment Type" icon="🔧" color={T.accent} brd={T.accentBrd}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {MACHINE_TYPES.map(m=>(
                  <div key={m.id} className={`mtype${machineTypeId===m.id?" sel":""}`} onClick={()=>setMachineTypeId(m.id)}>
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
                    <div style={{ fontSize:11, color:T.textDim, marginTop:5 }}>Not listed? <a href="/clients/register" target="_blank" style={{ color:T.accent, fontWeight:700 }}>+ Register client</a></div>
                  </Field>
                  <Field label="Inspection Date"><input style={IS} type="date" value={equip.inspection_date} onChange={e=>ue("inspection_date",e.target.value)}/></Field>
                </div>
                {!machineType?.isServiceTruck && !machineType?.isMixerTruck && (
                  <div className="g3" style={{ marginBottom:14 }}>
                    <Field label="Serial Number *"><input style={IS} placeholder="e.g. TH-2024-001" value={equip.serial_number} onChange={e=>ue("serial_number",e.target.value)}/></Field>
                    <Field label="Fleet Number"><input style={IS} placeholder="e.g. FL-012" value={equip.fleet_number} onChange={e=>ue("fleet_number",e.target.value)}/></Field>
                    <Field label="Registration Number"><input style={IS} placeholder="e.g. B 456 DEF" value={equip.registration_number} onChange={e=>ue("registration_number",e.target.value)}/></Field>
                  </div>
                )}
                {(machineType?.isServiceTruck || machineType?.isMixerTruck) && (
                  <div className="g2" style={{ marginBottom:14 }}>
                    <Field label="Service Truck Reg / ID *"><input style={IS} placeholder="e.g. B 123 STK" value={equip.serial_number} onChange={e=>ue("serial_number",e.target.value)}/></Field>
                    <Field label="Fleet Number"><input style={IS} placeholder="e.g. FL-099" value={equip.fleet_number} onChange={e=>ue("fleet_number",e.target.value)}/></Field>
                  </div>
                )}
                <div className={machineType?.id==="crane_truck" ? "g4" : "g2"}>
                  <Field label="Make / Manufacturer"><input style={IS} placeholder="e.g. Hiab, Palfinger, Fassi" value={equip.manufacturer} onChange={e=>ue("manufacturer",e.target.value)}/></Field>
                  <Field label="Model"><input style={IS} placeholder="e.g. X-HiPro, PK 23002" value={equip.model} onChange={e=>ue("model",e.target.value)}/></Field>
                  {machineType?.id==="crane_truck" && <Field label="Rated Capacity / SWL"><input style={IS} placeholder="e.g. 6.3T" value={equip.swl} onChange={e=>ue("swl",e.target.value)}/></Field>}
                  {machineType?.id==="crane_truck" && <Field label="Machine Hours"><input style={IS} placeholder="e.g. 12450" value={equip.machine_hours} onChange={e=>ue("machine_hours",e.target.value)}/></Field>}
                </div>
                {equip.inspection_date && (
                  <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                    📅 <strong style={{ color:T.text }}>{machineType.label}</strong> expires: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date,machineType.expiry))}</strong>
                    {machineType.hasPV && !machineType.isServiceTruck && !machineType.isMixerTruck && <span style={{ marginLeft:16 }}>· PV expires: <strong style={{ color:T.accent }}>{fmt(addMonths(equip.inspection_date,12))}</strong></span>}
                  </div>
                )}
              </Card>
            )}
          </>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && machineType && (
          machineType.id === "crane_truck" ? (
            <>
              <Card title="Crane Truck / Hiab Checklist" icon="🚛" color={T.blue} brd={T.blueBrd}>
                <SH label="Certificate Information"/>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Capabilities / Rated Capacity"><input style={IS} placeholder="e.g. 6.3T" value={craneChecklist.capabilities} onChange={e=>ucq("capabilities",e.target.value)}/></Field>
                  <Field label="Overall Result"><ResultSelect value={craneChecklist.overall_result} onChange={v=>ucq("overall_result",v)}/></Field>
                  <Field label="Pressure Vessels Fitted">
                    <div style={{ paddingTop:2 }}>
                      <YesNo value={hasPVs} onChange={setHasPVs}/>
                    </div>
                  </Field>
                </div>

                <SH label="Operational Check"/>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Outrigger Function"><ResultSelect value={craneChecklist.outriggers} onChange={v=>ucq("outriggers",v)}/></Field>
                  <Field label="Crane Operation"><ResultSelect value={craneChecklist.crane_operation} onChange={v=>ucq("crane_operation",v)}/></Field>
                  <Field label="Holding Valve Operation"><ResultSelect value={craneChecklist.holding_valve} onChange={v=>ucq("holding_valve",v)}/></Field>
                  <Field label="Inspect Sub Frame"><ResultSelect value={craneChecklist.sub_frame} onChange={v=>ucq("sub_frame",v)}/></Field>
                  <Field label="Inspect Mounting Brackets"><ResultSelect value={craneChecklist.mounting_brackets} onChange={v=>ucq("mounting_brackets",v)}/></Field>
                  <Field label="Inspect Base"><ResultSelect value={craneChecklist.base} onChange={v=>ucq("base",v)}/></Field>
                  <Field label="Inspect Mast"><ResultSelect value={craneChecklist.mast} onChange={v=>ucq("mast",v)}/></Field>
                  <Field label="Inspect Main Boom"><ResultSelect value={craneChecklist.main_boom} onChange={v=>ucq("main_boom",v)}/></Field>
                  <Field label="Inspect Outer Boom"><ResultSelect value={craneChecklist.outer_boom} onChange={v=>ucq("outer_boom",v)}/></Field>
                  <Field label="Inspect Extension Booms"><ResultSelect value={craneChecklist.extension_booms} onChange={v=>ucq("extension_booms",v)}/></Field>
                  <Field label="Hydraulic Oil Level"><ResultSelect value={craneChecklist.hydraulic_oil_level} onChange={v=>ucq("hydraulic_oil_level",v)}/></Field>
                  <Field label="Lubrication"><ResultSelect value={craneChecklist.lubrication} onChange={v=>ucq("lubrication",v)}/></Field>
                  <Field label="Load Hook Inspection"><ResultSelect value={craneChecklist.load_hook} onChange={v=>ucq("load_hook",v)}/></Field>
                </div>

                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Lubrication Note"><input style={IS} placeholder="e.g. Kindly lubricate the boom and outriggers" value={craneChecklist.lubrication_note} onChange={e=>ucq("lubrication_note",e.target.value)}/></Field>
                  <Field label="Defects Found"><textarea style={{ ...IS, minHeight:80 }} placeholder="Describe any defects..." value={craneChecklist.defects} onChange={e=>ucq("defects",e.target.value)}/></Field>
                </div>
                <Field label="Recommendations"><textarea style={{ ...IS, minHeight:70 }} placeholder="Recommendations..." value={craneChecklist.recommendations} onChange={e=>ucq("recommendations",e.target.value)}/></Field>

                <SH label="Certificate Remarks"/>
                <div className="g2">
                  <Field label="Crane Safe to be Used">
                    <YesNo value={craneChecklist.remarks_crane_safe} onChange={v=>ucq("remarks_crane_safe",v)} trueLabel="YES" falseLabel="NO"/>
                  </Field>
                  <Field label="Hook Safe to be Used">
                    <YesNo value={craneChecklist.remarks_hook_safe} onChange={v=>ucq("remarks_hook_safe",v)} trueLabel="YES" falseLabel="NO"/>
                  </Field>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card title={`${machineType.label} — Inspection Checklist`} icon={machineType.icon} color={T.blue} brd={T.blueBrd}>
                <div className="g2" style={{ marginBottom:14 }}>
                  {(machineType.fields||[]).map(f=>(
                    <Field key={f.key} label={f.label}>
                      {f.type==="result" ? <ResultSelect value={insp[f.key]||"PASS"} onChange={v=>ui(f.key,v)}/> : <input style={IS} placeholder={f.placeholder||""} value={insp[f.key]||""} onChange={e=>ui(f.key,e.target.value)}/>}
                    </Field>
                  ))}
                </div>
                <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:14, display:"grid", gap:12 }}>
                  <div className="g2">
                    <Field label="Overall Result"><ResultSelect value={insp.overall_result||"PASS"} onChange={v=>ui("overall_result",v)}/></Field>
                    <Field label="Defects Found"><textarea style={{ ...IS, minHeight:80 }} placeholder="Describe any defects..." value={insp.defects||""} onChange={e=>ui("defects",e.target.value)}/></Field>
                  </div>
                  <Field label="Recommendations"><textarea style={{ ...IS, minHeight:60 }} placeholder="Recommendations..." value={insp.recommendations||""} onChange={e=>ui("recommendations",e.target.value)}/></Field>
                </div>
              </Card>
              {machineType.hasPV && (
                <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                  <div><div style={{ fontSize:13, fontWeight:800 }}>Pressure Vessels</div><div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>Does this {machineType.label} have pressure vessels?</div></div>
                  <YesNo value={hasPVs} onChange={setHasPVs}/>
                </div>
              )}
            </>
          )
        )}

        {/* STEP 3: Boom */}
        {currentStep === 3 && (
          machineType?.id === "crane_truck" ? (
            <Card title="Boom Configuration & Load Test Data" icon="📐" color={T.blue} brd={T.blueBrd}>
              <SH label="General Boom Data"/>
              <div className="g4" style={{ marginBottom:14 }}>
                <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 7.3" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
                <Field label="Extended Boom Length (m)"><input style={IS} placeholder="e.g. 10.5" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
                <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 58" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
                <Field label="Load Tested at Radius (m)"><input style={IS} placeholder="e.g. 7.3" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/></Field>
              </div>
              <div className="g4" style={{ marginBottom:14 }}>
                <Field label="SLI Make / Model"><input style={IS} placeholder="e.g. Hirschmann" value={boom.sli_make_model} onChange={e=>ub("sli_make_model",e.target.value)}/></Field>
                <Field label="Hook Block Reeving"><input style={IS} placeholder="e.g. 2 fall" value={boom.hook_block_reeving} onChange={e=>ub("hook_block_reeving",e.target.value)}/></Field>
                <Field label="Jib Fitted"><select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></Field>
                <Field label="Jib Length / Angle"><input style={IS} placeholder="e.g. 4m @ 20°" value={boom.jib_length ? `${boom.jib_length}${boom.jib_angle ? ` @ ${boom.jib_angle}` : ""}` : ""} onChange={e=>{const v=e.target.value;const parts=v.split("@");ub("jib_length",parts[0]?.trim()||"");ub("jib_angle",parts[1]?.trim()||"");}}/></Field>
              </div>

              <SH label="Load Chart Configuration 1"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Length"><input style={IS} placeholder="e.g. 6.0" value={boom.c1_boom_length} onChange={e=>ub("c1_boom_length",e.target.value)}/></Field>
                <Field label="Angle"><input style={IS} placeholder="e.g. 70" value={boom.c1_angle} onChange={e=>ub("c1_angle",e.target.value)}/></Field>
                <Field label="Radius"><input style={IS} placeholder="e.g. 2.0" value={boom.c1_radius} onChange={e=>ub("c1_radius",e.target.value)}/></Field>
                <Field label="Rated Load"><input style={IS} placeholder="e.g. 6.3T" value={boom.c1_rated} onChange={e=>ub("c1_rated",e.target.value)}/></Field>
                <Field label="Test Load"><input style={IS} placeholder="e.g. 6.9T" value={boom.c1_test} onChange={e=>ub("c1_test",e.target.value)}/></Field>
                <Field label="Hook Weight"><input style={IS} placeholder="e.g. 120kg" value={boom.c1_hook_weight} onChange={e=>ub("c1_hook_weight",e.target.value)}/></Field>
              </div>

              <SH label="Load Chart Configuration 2"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Length"><input style={IS} placeholder="e.g. 7.3" value={boom.c2_boom_length} onChange={e=>ub("c2_boom_length",e.target.value)}/></Field>
                <Field label="Angle"><input style={IS} placeholder="e.g. 58" value={boom.c2_angle} onChange={e=>ub("c2_angle",e.target.value)}/></Field>
                <Field label="Radius"><input style={IS} placeholder="e.g. 7.3" value={boom.c2_radius} onChange={e=>ub("c2_radius",e.target.value)}/></Field>
                <Field label="Rated Load"><input style={IS} placeholder="e.g. 3T" value={boom.c2_rated} onChange={e=>ub("c2_rated",e.target.value)}/></Field>
                <Field label="Test Load"><input style={IS} placeholder="e.g. 3T" value={boom.c2_test} onChange={e=>ub("c2_test",e.target.value)}/></Field>
                <Field label="Hook Weight"><input style={IS} placeholder="e.g. 120kg" value={boom.c2_hook_weight} onChange={e=>ub("c2_hook_weight",e.target.value)}/></Field>
              </div>

              <SH label="Load Chart Configuration 3"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Length"><input style={IS} placeholder="e.g. 9.0" value={boom.c3_boom_length} onChange={e=>ub("c3_boom_length",e.target.value)}/></Field>
                <Field label="Angle"><input style={IS} placeholder="e.g. 45" value={boom.c3_angle} onChange={e=>ub("c3_angle",e.target.value)}/></Field>
                <Field label="Radius"><input style={IS} placeholder="e.g. 10.0" value={boom.c3_radius} onChange={e=>ub("c3_radius",e.target.value)}/></Field>
                <Field label="Rated Load"><input style={IS} placeholder="e.g. 1.5T" value={boom.c3_rated} onChange={e=>ub("c3_rated",e.target.value)}/></Field>
                <Field label="Test Load"><input style={IS} placeholder="e.g. 1.65T" value={boom.c3_test} onChange={e=>ub("c3_test",e.target.value)}/></Field>
                <Field label="Hook Weight"><input style={IS} placeholder="e.g. 120kg" value={boom.c3_hook_weight} onChange={e=>ub("c3_hook_weight",e.target.value)}/></Field>
              </div>

              <SH label="Boom Systems Condition"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
                <Field label="Boom Pins"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
                <Field label="Boom Wear"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
                <Field label="Luffing System"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
                <Field label="Slew System"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
                <Field label="Hoist System"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
                <Field label="SLI / LMI Test"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
                <Field label="Anti-Two-Block"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
                <Field label="Anemometer"><ResultSelect value={boom.anemometer} onChange={v=>ub("anemometer",v)}/></Field>
              </div>

              <Field label="Boom Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/></Field>
            </Card>
          ) : (
            <Card title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>
              <SH label="Boom Geometry"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 6" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></Field>
                <Field label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></Field>
                <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 12" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 10" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
                <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 60" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
                {machineType?.id==="cherry_picker"
                  ? <Field label="Max Working Height (m)"><input style={IS} placeholder="e.g. 18" value={boom.max_height} onChange={e=>ub("max_height",e.target.value)}/></Field>
                  : <Field label="Jib / Fork Attachment"><select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}><option value="no">No</option><option value="yes">Yes</option></select></Field>
                }
              </div>
              <SH label="Working Radius & SWL"/>
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
              <Field label="Load Test Applied (Tonnes)"><input style={{ ...IS, marginBottom:14 }} placeholder="e.g. 4.4 (110% SWL)" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/></Field>
              <SH label="Boom Systems Condition"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
                <Field label="Boom Pins & Connections"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
                <Field label="Boom Wear / Pads"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Luffing / Extension"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
                <Field label="Slew / Rotation"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
                <Field label="Hoist / Lift"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="LMI Tested at Config"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
                <Field label="Anti-Two Block / Overload"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
              </div>
              <Field label="Boom Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/></Field>
            </Card>
          )
        )}

        {/* STEP 4: Forks */}
        {currentStep === 4 && (
          machineType?.id === "crane_truck" ? (
            <Card title="Hook Inspection" icon="🪝" color={T.amber} brd={T.amberBrd}>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Hook Serial Number"><input style={IS} placeholder="e.g. HK-001" value={craneHook.serial_number} onChange={e=>uch("serial_number",e.target.value)}/></Field>
                <Field label="Hook SWL"><input style={IS} placeholder="e.g. 3T" value={craneHook.swl} onChange={e=>uch("swl",e.target.value)}/></Field>
                <Field label="Overall Result"><ResultSelect value={craneHook.result} onChange={v=>uch("result",v)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Hook A-B Measurement"><input style={IS} placeholder="e.g. 60mm" value={craneHook.ab} onChange={e=>{uch("ab",e.target.value);ub("hook_ab",e.target.value);}}/></Field>
                <Field label="Hook A-C Measurement"><input style={IS} placeholder="e.g. 45mm" value={craneHook.ac} onChange={e=>{uch("ac",e.target.value);ub("hook_ac",e.target.value);}}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Latch Condition"><ResultSelect value={craneHook.latch_condition} onChange={v=>uch("latch_condition",v)}/></Field>
                <Field label="Structural Condition"><ResultSelect value={craneHook.structural_result} onChange={v=>uch("structural_result",v)}/></Field>
                <Field label="Wear Percentage"><input style={IS} placeholder="e.g. 2%" value={craneHook.wear_percentage} onChange={e=>uch("wear_percentage",e.target.value)}/></Field>
              </div>
              <Field label="Hook Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Hook remarks..." value={craneHook.notes} onChange={e=>uch("notes",e.target.value)}/></Field>
            </Card>
          ) : (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div><div style={{ fontSize:15, fontWeight:800 }}>Fork Arms Inspection</div><div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>Each fork arm gets its own certificate</div></div>
                {forks.length < 4 && <button type="button" onClick={()=>setForks(p=>[...p,emptyFork()])} style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>+ Add Fork</button>}
              </div>
              {forks.map((fk,i)=>(
                <Card key={i} title={`Fork Arm ${i+1}`} icon="🍴" color={T.amber} brd={T.amberBrd}>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                    {forks.length > 1 && <button type="button" onClick={()=>setForks(p=>p.filter((_,j)=>j!==i))} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>}
                  </div>
                  <div className="g2" style={{ marginBottom:14 }}>
                    <Field label="Fork Serial / ID"><input style={IS} placeholder="e.g. FK-001-A" value={fk.fork_number} onChange={e=>ufk(i,"fork_number",e.target.value)}/></Field>
                    <Field label="Safe Working Load"><input style={IS} placeholder="e.g. 3T" value={fk.swl} onChange={e=>ufk(i,"swl",e.target.value)}/></Field>
                  </div>
                  <div className="g4" style={{ marginBottom:14 }}>
                    <Field label="Length (mm)"><input style={IS} placeholder="e.g. 1200" value={fk.length} onChange={e=>ufk(i,"length",e.target.value)}/></Field>
                    <Field label="Heel Thickness (mm)"><input style={IS} placeholder="e.g. 50" value={fk.thickness_heel} onChange={e=>ufk(i,"thickness_heel",e.target.value)}/></Field>
                    <Field label="Blade Thickness (mm)"><input style={IS} placeholder="e.g. 48" value={fk.thickness_blade} onChange={e=>ufk(i,"thickness_blade",e.target.value)}/></Field>
                    <Field label="Width (mm)"><input style={IS} placeholder="e.g. 150" value={fk.width} onChange={e=>ufk(i,"width",e.target.value)}/></Field>
                  </div>
                  <div className="g2" style={{ marginBottom:14 }}>
                    <Field label="Wear % vs Original"><input style={IS} placeholder="e.g. 8" value={fk.wear_pct} onChange={e=>ufk(i,"wear_pct",e.target.value)}/></Field>
                    <Field label="Overall Result"><ResultSelect value={fk.result} onChange={v=>ufk(i,"result",v)}/></Field>
                  </div>
                  <div className="g2" style={{ marginBottom:14 }}>
                    <Field label="Cracks / Fractures?"><select style={IS} value={fk.cracks} onChange={e=>ufk(i,"cracks",e.target.value)}><option value="no">No</option><option value="yes">Yes — FAIL</option></select></Field>
                    <Field label="Bending / Deformation?"><select style={IS} value={fk.bending} onChange={e=>ufk(i,"bending",e.target.value)}><option value="no">No</option><option value="yes">Yes — FAIL</option></select></Field>
                  </div>
                  <Field label="Notes"><textarea style={{ ...IS, minHeight:60 }} placeholder="Fork inspection notes..." value={fk.notes} onChange={e=>ufk(i,"notes",e.target.value)}/></Field>
                </Card>
              ))}
            </>
          )
        )}

        {/* STEP 5: Platform */}
        {currentStep === 5 && (
          machineType?.id === "crane_truck" ? (
            <Card title="Wire Rope Inspection" icon="🪢" color={T.blue} brd={T.blueBrd}>
              <SH label="Main Rope"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Diameter (mm)"><input style={IS} placeholder="e.g. 12" value={craneRope.diameter} onChange={e=>ucr("diameter",e.target.value)}/></Field>
                <Field label="Broken Wires"><input style={IS} placeholder="e.g. 0" value={craneRope.broken_wires} onChange={e=>ucr("broken_wires",e.target.value)}/></Field>
                <Field label="Serviceability"><input style={IS} placeholder="e.g. Good" value={craneRope.serviceability} onChange={e=>ucr("serviceability",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Corrosion"><input style={IS} placeholder="e.g. none" value={craneRope.corrosion} onChange={e=>ucr("corrosion",e.target.value)}/></Field>
                <Field label="Kinks"><input style={IS} placeholder="e.g. none" value={craneRope.kinks} onChange={e=>ucr("kinks",e.target.value)}/></Field>
                <Field label="Reduction in Diameter"><input style={IS} placeholder="e.g. none" value={craneRope.reduction_dia} onChange={e=>ucr("reduction_dia",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Core Protrusion"><input style={IS} placeholder="e.g. none" value={craneRope.core_protrusion} onChange={e=>ucr("core_protrusion",e.target.value)}/></Field>
                <Field label="Damaged Strands"><input style={IS} placeholder="e.g. none" value={craneRope.damaged_strands} onChange={e=>ucr("damaged_strands",e.target.value)}/></Field>
                <Field label="End Fittings"><input style={IS} placeholder="e.g. Good" value={craneRope.end_fittings} onChange={e=>ucr("end_fittings",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Lower Limit"><input style={IS} placeholder="e.g. yes" value={craneRope.lower_limit} onChange={e=>ucr("lower_limit",e.target.value)}/></Field>
                <Field label="Drum Condition"><input style={IS} placeholder="e.g. Good" value={craneRope.drum_condition} onChange={e=>ucr("drum_condition",e.target.value)}/></Field>
                <Field label="Rope Lay"><input style={IS} placeholder="e.g. Good" value={craneRope.rope_lay} onChange={e=>ucr("rope_lay",e.target.value)}/></Field>
              </div>

              <SH label="Auxiliary Rope"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Aux Diameter (mm)"><input style={IS} placeholder="e.g. 10" value={craneRope.aux_diameter} onChange={e=>ucr("aux_diameter",e.target.value)}/></Field>
                <Field label="Aux Broken Wires"><input style={IS} placeholder="e.g. 0" value={craneRope.aux_broken_wires} onChange={e=>ucr("aux_broken_wires",e.target.value)}/></Field>
                <Field label="Aux Serviceability"><input style={IS} placeholder="e.g. Good" value={craneRope.aux_serviceability} onChange={e=>ucr("aux_serviceability",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Aux Corrosion"><input style={IS} placeholder="e.g. none" value={craneRope.aux_corrosion} onChange={e=>ucr("aux_corrosion",e.target.value)}/></Field>
                <Field label="Aux Kinks"><input style={IS} placeholder="e.g. none" value={craneRope.aux_kinks} onChange={e=>ucr("aux_kinks",e.target.value)}/></Field>
                <Field label="Aux Reduction in Diameter"><input style={IS} placeholder="e.g. none" value={craneRope.aux_reduction_dia} onChange={e=>ucr("aux_reduction_dia",e.target.value)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Overall Result"><ResultSelect value={craneRope.result} onChange={v=>ucr("result",v)}/></Field>
                <Field label="Rope Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Wire rope remarks..." value={craneRope.notes} onChange={e=>ucr("notes",e.target.value)}/></Field>
              </div>
            </Card>
          ) : (
            <Card title="Platform / Bucket Inspection" icon="🪣" color={T.blue} brd={T.blueBrd}>
              <SH label="Platform Specification"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Platform SWL"><input style={IS} placeholder="e.g. 250kg" value={bucket.platform_swl} onChange={e=>ubu("platform_swl",e.target.value)}/></Field>
                <Field label="Dimensions (m)"><input style={IS} placeholder="e.g. 1.2 x 0.8" value={bucket.platform_dimensions} onChange={e=>ubu("platform_dimensions",e.target.value)}/></Field>
                <Field label="Material"><input style={IS} placeholder="e.g. Steel" value={bucket.platform_material} onChange={e=>ubu("platform_material",e.target.value)}/></Field>
              </div>
              <Field label="Test Load Applied"><input style={{ ...IS, marginBottom:14 }} placeholder="e.g. 275kg (110% of SWL)" value={bucket.test_load_applied} onChange={e=>ubu("test_load_applied",e.target.value)}/></Field>
              <SH label="Structural Condition"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Platform Structure"><ResultSelect value={bucket.platform_structure} onChange={v=>ubu("platform_structure",v)}/></Field>
                <Field label="Platform Floor"><ResultSelect value={bucket.platform_floor} onChange={v=>ubu("platform_floor",v)}/></Field>
                <Field label="Guardrails / Toe Boards"><ResultSelect value={bucket.guardrails} onChange={v=>ubu("guardrails",v)}/></Field>
              </div>
              <SH label="Safety Systems"/>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Gate / Latch System"><ResultSelect value={bucket.gate_latch} onChange={v=>ubu("gate_latch",v)}/></Field>
                <Field label="Platform Levelling"><ResultSelect value={bucket.levelling_system} onChange={v=>ubu("levelling_system",v)}/></Field>
                <Field label="Emergency Lowering"><ResultSelect value={bucket.emergency_lowering} onChange={v=>ubu("emergency_lowering",v)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Overload Device"><ResultSelect value={bucket.overload_device} onChange={v=>ubu("overload_device",v)}/></Field>
                <Field label="Tilt Alarm"><ResultSelect value={bucket.tilt_alarm} onChange={v=>ubu("tilt_alarm",v)}/></Field>
              </div>
              <Field label="Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Additional notes..." value={bucket.notes} onChange={e=>ubu("notes",e.target.value)}/></Field>
            </Card>
          )
        )}

        {/* STEP 6: Pressure Vessels */}
        {currentStep === 6 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div><div style={{ fontSize:15, fontWeight:800 }}>Pressure Vessels</div><div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>Up to 8 · Each expires 1 year</div></div>
              {pvs.length < 8 && <button type="button" onClick={()=>setPvs(p=>[...p,emptyPV()])} style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>+ Add Vessel</button>}
            </div>
            {pvs.map((pv,i)=>(
              <Card key={i} title={`Pressure Vessel ${i+1}`} icon="⚙️" color={T.green} brd={T.greenBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {pvs.length > 1 && <button type="button" onClick={()=>setPvs(p=>p.filter((_,j)=>j!==i))} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>}
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Serial Number"><input style={IS} placeholder="e.g. PV-001" value={pv.sn} onChange={e=>upv(i,"sn",e.target.value)}/></Field>
                  <Field label="Description"><input style={IS} placeholder="e.g. Hydraulic Oil Tank" value={pv.description} onChange={e=>upv(i,"description",e.target.value)}/></Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Manufacturer"><input style={IS} value={pv.manufacturer} onChange={e=>upv(i,"manufacturer",e.target.value)}/></Field>
                  <Field label="Year of Manufacture"><input style={IS} placeholder="e.g. 2018" value={pv.year_manufacture} onChange={e=>upv(i,"year_manufacture",e.target.value)}/></Field>
                  <Field label="Country of Origin"><input style={IS} placeholder="e.g. South Africa" value={pv.country_origin} onChange={e=>upv(i,"country_origin",e.target.value)}/></Field>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:14 }}>
                  <Field label="Capacity / Volume"><input style={IS} placeholder="e.g. 200L" value={pv.capacity} onChange={e=>upv(i,"capacity",e.target.value)}/></Field>
                  <Field label="MAWP / Working Pressure"><input style={IS} placeholder="e.g. 800" value={pv.working_pressure} onChange={e=>{const v=e.target.value;const mawp=parseFloat(v)||0;upv(i,"working_pressure",v);if(mawp){upv(i,"test_pressure",String((mawp*1.5).toFixed(2)).replace(/\.?0+$/,""));}}}/></Field>
                  <Field label="Design Pressure (= MAWP)">
                    <input style={{...IS, background:"rgba(34,211,238,0.06)", color:T.accent, fontWeight:700}} value={pv.working_pressure||""} readOnly placeholder="Auto-fills from MAWP"/>
                  </Field>
                  <Field label="Test Pressure (1.5 × MAWP)">
                    <input style={{...IS, background:"rgba(52,211,153,0.06)", color:T.green, fontWeight:700}} value={pv.test_pressure||""} readOnly placeholder="Auto-fills"/>
                  </Field>
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Pressure Unit"><select style={IS} value={pv.pressure_unit} onChange={e=>upv(i,"pressure_unit",e.target.value)}><option value="bar">bar</option><option value="psi">psi</option><option value="MPa">MPa</option><option value="kPa">kPa</option></select></Field>
                  <Field label="Result"><ResultSelect value={pv.result} onChange={v=>upv(i,"result",v)}/></Field>
                </div>
                <Field label="Notes"><input style={IS} placeholder="Any defects or notes..." value={pv.notes} onChange={e=>upv(i,"notes",e.target.value)}/></Field>
              </Card>
            ))}
          </>
        )}

        {/* STEP 7: Horse & Trailer */}
        {currentStep === 7 && (
          <>
            <Card title="Horse / Prime Mover Registration" icon="🚛" color={T.accent} brd={T.accentBrd}>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Registration Number *"><input style={IS} placeholder="e.g. B 123 ABC" value={ht.horse_reg} onChange={e=>uht("horse_reg",e.target.value)}/></Field>
                <Field label="Make / Manufacturer"><input style={IS} placeholder="e.g. Mercedes, Scania" value={ht.horse_make} onChange={e=>uht("horse_make",e.target.value)}/></Field>
                <Field label="Model"><input style={IS} placeholder="e.g. Actros 2648" value={ht.horse_model} onChange={e=>uht("horse_model",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="VIN / Chassis"><input style={IS} value={ht.horse_vin} onChange={e=>uht("horse_vin",e.target.value)}/></Field>
                <Field label="Year"><input style={IS} placeholder="e.g. 2019" value={ht.horse_year} onChange={e=>uht("horse_year",e.target.value)}/></Field>
                <Field label="Fleet Number"><input style={IS} placeholder="e.g. TRK-005" value={ht.horse_fleet} onChange={e=>uht("horse_fleet",e.target.value)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="GVM"><input style={IS} placeholder="e.g. 26000kg" value={ht.horse_gvm} onChange={e=>uht("horse_gvm",e.target.value)}/></Field>
                <Field label="Result"><ResultSelect value={ht.horse_result} onChange={v=>uht("horse_result",v)}/></Field>
              </div>
              <Field label="Notes"><textarea style={{ ...IS, minHeight:60 }} value={ht.horse_notes} onChange={e=>uht("horse_notes",e.target.value)}/></Field>
            </Card>
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:14 }}>
              <div><div style={{ fontSize:13, fontWeight:800 }}>Trailer Attached?</div></div>
              <YesNo value={ht.has_trailer} onChange={v=>uht("has_trailer",v)}/>
            </div>
            {ht.has_trailer && (
              <Card title="Trailer Registration" icon="🚚" color={T.purple} brd={T.purpleBrd}>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Registration Number *"><input style={IS} placeholder="e.g. B 456 DEF" value={ht.trailer_reg} onChange={e=>uht("trailer_reg",e.target.value)}/></Field>
                  <Field label="Make / Manufacturer"><input style={IS} value={ht.trailer_make} onChange={e=>uht("trailer_make",e.target.value)}/></Field>
                  <Field label="Model / Type"><input style={IS} value={ht.trailer_model} onChange={e=>uht("trailer_model",e.target.value)}/></Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="VIN / Chassis"><input style={IS} value={ht.trailer_vin} onChange={e=>uht("trailer_vin",e.target.value)}/></Field>
                  <Field label="Year"><input style={IS} value={ht.trailer_year} onChange={e=>uht("trailer_year",e.target.value)}/></Field>
                  <Field label="Fleet Number"><input style={IS} value={ht.trailer_fleet} onChange={e=>uht("trailer_fleet",e.target.value)}/></Field>
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="GVM"><input style={IS} value={ht.trailer_gvm} onChange={e=>uht("trailer_gvm",e.target.value)}/></Field>
                  <Field label="Result"><ResultSelect value={ht.trailer_result} onChange={v=>uht("trailer_result",v)}/></Field>
                </div>
                <Field label="Notes"><textarea style={{ ...IS, minHeight:60 }} value={ht.trailer_notes} onChange={e=>uht("trailer_notes",e.target.value)}/></Field>
              </Card>
            )}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div><div style={{ fontSize:13, fontWeight:800 }}>Pressure Vessels</div></div>
              <YesNo value={hasPVs} onChange={setHasPVs}/>
            </div>
          </>
        )}

        {/* STEP 8: Service Truck */}
        {currentStep === 8 && (machineType?.isServiceTruck || machineType?.isMixerTruck) && (
          <>
            <Card title={`${machineType.label} — Vehicle Registration`} icon="🚛" color={T.accent} brd={T.accentBrd}>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Registration Number *"><input style={IS} placeholder="e.g. B 123 STK" value={svcTruck.reg} onChange={e=>ust("reg",e.target.value)}/></Field>
                <Field label="Make / Manufacturer"><input style={IS} placeholder="e.g. Toyota, Isuzu" value={svcTruck.make} onChange={e=>ust("make",e.target.value)}/></Field>
                <Field label="Model"><input style={IS} placeholder="e.g. Hilux, D-Max" value={svcTruck.model} onChange={e=>ust("model",e.target.value)}/></Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="VIN / Chassis"><input style={IS} placeholder="e.g. JTMHE3FJ..." value={svcTruck.vin} onChange={e=>ust("vin",e.target.value)}/></Field>
                <Field label="Year"><input style={IS} placeholder="e.g. 2020" value={svcTruck.year} onChange={e=>ust("year",e.target.value)}/></Field>
                <Field label="Fleet Number"><input style={IS} placeholder="e.g. SVC-003" value={svcTruck.fleet} onChange={e=>ust("fleet",e.target.value)}/></Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="GVM"><input style={IS} placeholder="e.g. 3500kg" value={svcTruck.gvm} onChange={e=>ust("gvm",e.target.value)}/></Field>
                <Field label="Vehicle Result"><ResultSelect value={svcTruck.result} onChange={v=>ust("result",v)}/></Field>
              </div>
              <Field label="Defects / Notes"><textarea style={{ ...IS, minHeight:70 }} placeholder="Vehicle defects or observations..." value={svcTruck.notes} onChange={e=>ust("notes",e.target.value)}/></Field>
            </Card>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800 }}>Pressure Vessels / Air Receivers</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>Each vessel gets its own certificate · expires 1 year</div>
              </div>
              {svcPVs.length < 8 && <button type="button" onClick={()=>setSvcPVs(p=>[...p,emptySvcPV()])} style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>+ Add Vessel</button>}
            </div>
            {svcPVs.map((pv,i)=>(
              <Card key={i} title={`Vessel ${i+1} — ${pv.description||"Air Receiver"}`} icon="⚙️" color={T.green} brd={T.greenBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {svcPVs.length > 1 && <button type="button" onClick={()=>setSvcPVs(p=>p.filter((_,j)=>j!==i))} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Remove</button>}
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Serial Number"><input style={IS} placeholder="e.g. AR-001" value={pv.sn} onChange={e=>uspv(i,"sn",e.target.value)}/></Field>
                  <Field label="Description"><input style={IS} placeholder="e.g. Air Receiver" value={pv.description} onChange={e=>uspv(i,"description",e.target.value)}/></Field>
                </div>
                {(svcTruck.reg||svcTruck.fleet) && (
                  <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)", fontSize:11, color:T.green, marginBottom:12, display:"flex", gap:16, flexWrap:"wrap" }}>
                    <span>🚛 {svcTruck.make} {svcTruck.model}</span>
                    {svcTruck.reg && <span>Reg: <strong>{svcTruck.reg}</strong></span>}
                    {svcTruck.fleet && <span>Fleet: <strong>{svcTruck.fleet}</strong></span>}
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:14 }}>
                  <Field label="Capacity / Volume"><input style={IS} placeholder="e.g. 50L" value={pv.capacity} onChange={e=>uspv(i,"capacity",e.target.value)}/></Field>
                  <Field label="MAWP / Working Pressure"><input style={IS} placeholder="e.g. 8" value={pv.working_pressure} onChange={e=>uspv(i,"working_pressure",e.target.value)}/></Field>
                  <Field label="Design Pressure (= MAWP)">
                    <input style={{...IS, background:"rgba(34,211,238,0.06)", color:T.accent, fontWeight:700}} value={pv.working_pressure||""} readOnly placeholder="Auto-fills from MAWP"/>
                  </Field>
                  <Field label="Test Pressure (= 1.5 × MAWP)">
                    <input style={{...IS, background:"rgba(52,211,153,0.06)", color:T.green, fontWeight:700}} value={pv.test_pressure||""} readOnly placeholder="Auto-fills (1.5 × MAWP)"/>
                  </Field>
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Pressure Unit"><select style={IS} value={pv.pressure_unit} onChange={e=>uspv(i,"pressure_unit",e.target.value)}><option value="bar">bar</option><option value="psi">psi</option><option value="MPa">MPa</option><option value="kPa">kPa</option></select></Field>
                  <Field label="Result"><ResultSelect value={pv.result} onChange={v=>uspv(i,"result",v)}/></Field>
                </div>
                <Field label="Manufacturer"><input style={{ ...IS, marginBottom:8 }} placeholder="e.g. ABAC" value={pv.manufacturer} onChange={e=>uspv(i,"manufacturer",e.target.value)}/></Field>
                <Field label="Notes"><input style={IS} placeholder="Any defects..." value={pv.notes} onChange={e=>uspv(i,"notes",e.target.value)}/></Field>
              </Card>
            ))}

            {machineType?.isServiceTruck && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>Lifting &amp; Service Tools</div>
                <div style={{ fontSize:12, color:T.textDim, marginBottom:14 }}>Toggle tools present on this service truck — each gets its own certificate</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10, marginBottom:20 }}>
                  {SVC_TOOL_TYPES.map((toolMeta,i)=>(
                    <div key={toolMeta.id} style={{ background:svcTools[i].include?T.accentDim:T.card, border:`1px solid ${svcTools[i].include?T.accentBrd:T.border}`, borderRadius:12, padding:14, cursor:"pointer" }} onClick={()=>utool(i,"include",!svcTools[i].include)}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:svcTools[i].include?12:0 }}>
                        <span style={{ fontSize:20 }}>{toolMeta.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:800, color:svcTools[i].include?T.accent:T.text }}>{toolMeta.label}</div>
                          <div style={{ fontSize:11, color:T.textDim }}>Load Test Certificate</div>
                        </div>
                        <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${svcTools[i].include?T.accent:T.border}`, background:svcTools[i].include?T.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#052e16", fontWeight:900 }}>{svcTools[i].include?"✓":""}</div>
                      </div>
                      {svcTools[i].include && (
                        <div style={{ display:"grid", gap:8 }} onClick={e=>e.stopPropagation()}>
                          <div className="g2">
                            <Field label="Serial Number"><input style={{ ...IS, fontSize:12, padding:"7px 10px", minHeight:34 }} placeholder="e.g. CB-001" value={svcTools[i].sn} onChange={e=>utool(i,"sn",e.target.value)}/></Field>
                            <Field label="SWL / Capacity"><input style={{ ...IS, fontSize:12, padding:"7px 10px", minHeight:34 }} placeholder="e.g. 3T" value={svcTools[i].swl} onChange={e=>utool(i,"swl",e.target.value)}/></Field>
                          </div>
                          <div className="g2">
                            <Field label="Manufacturer"><input style={{ ...IS, fontSize:12, padding:"7px 10px", minHeight:34 }} placeholder="e.g. Yale" value={svcTools[i].manufacturer} onChange={e=>utool(i,"manufacturer",e.target.value)}/></Field>
                            <Field label="Result"><ResultSelect value={svcTools[i].result} onChange={v=>utool(i,"result",v)}/></Field>
                          </div>
                          <Field label="Description / Notes"><input style={{ ...IS, fontSize:12, padding:"7px 10px", minHeight:34 }} placeholder={`${toolMeta.label} description or defects`} value={svcTools[i].description} onChange={e=>utool(i,"description",e.target.value)}/></Field>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 9: Review */}
        {currentStep === 9 && machineType && (()=>{
          const reviewExpiry = addMonths(equip.inspection_date, machineType.expiry);

          if (machineType.isServiceTruck || machineType.isMixerTruck) {
            const toolCount = machineType.isServiceTruck ? svcTools.filter(t=>t.include).length : 0;
            const pvCount   = svcPVs.filter(p=>p.sn||p.description).length;
            const total     = 1 + pvCount + toolCount;
            return (
              <Card title={`Review & Confirm — ${machineType.label}`} icon="🔧" color={T.accent}>
                <div style={{ display:"grid", gap:10, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <span style={{ fontSize:20 }}>🚛</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>{machineType.label} — {svcTruck.make} {svcTruck.model}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>Reg {svcTruck.reg||"—"} · VIN {svcTruck.vin||"—"} · Vehicle Inspection Certificate · Expires {fmt(reviewExpiry)}</div>
                    </div>
                    <ResultBadge result={svcTruck.result}/>
                  </div>
                  {svcPVs.filter(p=>p.sn||p.description).map((pv,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                      <span style={{ fontSize:18 }}>⚙️</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{pv.description||"Air Receiver"} — SN {pv.sn||"—"}</div>
                        <div style={{ fontSize:11, color:T.textDim }}>{pv.capacity} · {pv.working_pressure}/{pv.test_pressure} {pv.pressure_unit} · Pressure Test Certificate · Expires {fmt(addMonths(equip.inspection_date,12))}</div>
                      </div>
                      <ResultBadge result={pv.result}/>
                    </div>
                  ))}
                  {machineType.isServiceTruck && svcTools.filter(t=>t.include).map((tool,i)=>{
                    const meta = SVC_TOOL_TYPES.find(m=>m.id===tool.type);
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                        <span style={{ fontSize:18 }}>{meta?.icon||"🔧"}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700 }}>{meta?.label} — SN {tool.sn||"—"}</div>
                          <div style={{ fontSize:11, color:T.textDim }}>SWL {tool.swl||"—"} · {tool.manufacturer||"—"} · Load Test Certificate · Expires {fmt(reviewExpiry)}</div>
                        </div>
                        <ResultBadge result={tool.result}/>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                  📋 Client: <strong style={{ color:T.text }}>{equip.client_name}</strong> &nbsp;·&nbsp; Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp; Date: <strong style={{ color:T.text }}>{fmt(equip.inspection_date)}</strong> &nbsp;·&nbsp; Total: <strong style={{ color:T.accent }}>{total} certificate{total!==1?"s":""}</strong>
                </div>
              </Card>
            );
          }

          if (machineType.id==="crane_truck") {
            const pvCount = hasPVs ? pvs.filter(p=>p.sn||p.description).length : 0;
            const totalCerts = 1 + pvCount;
            return (
              <Card title="Review & Confirm — Crane Truck / Hiab" icon="🚛" color={T.accent}>
                <div style={{ display:"grid", gap:10, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <span style={{ fontSize:20 }}>🚛</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>Truck Mounted Crane / Hiab</div>
                      <div style={{ fontSize:11, color:T.textDim }}>SN {equip.serial_number}{equip.registration_number?` · Reg ${equip.registration_number}`:""}{equip.swl?` · SWL ${equip.swl}`:""} · Expires {fmt(reviewExpiry)}</div>
                    </div>
                    <ResultBadge result={craneChecklist.overall_result||"PASS"}/>
                  </div>
                  <div style={{ padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:12, fontWeight:800, marginBottom:6 }}>Operational Check Summary</div>
                    <div className="g3">
                      <div style={{ fontSize:11, color:T.textDim }}>Outriggers: <strong style={{ color:T.text }}>{craneChecklist.outriggers}</strong></div>
                      <div style={{ fontSize:11, color:T.textDim }}>Crane operation: <strong style={{ color:T.text }}>{craneChecklist.crane_operation}</strong></div>
                      <div style={{ fontSize:11, color:T.textDim }}>Load hook: <strong style={{ color:T.text }}>{craneChecklist.load_hook}</strong></div>
                      <div style={{ fontSize:11, color:T.textDim }}>Test radius: <strong style={{ color:T.text }}>{boom.c2_radius || boom.load_tested_at_radius || "—"}</strong></div>
                      <div style={{ fontSize:11, color:T.textDim }}>Test load: <strong style={{ color:T.text }}>{boom.c2_test || boom.test_load || "—"}</strong></div>
                      <div style={{ fontSize:11, color:T.textDim }}>Hook SWL: <strong style={{ color:T.text }}>{craneHook.swl || "—"}</strong></div>
                    </div>
                  </div>
                  {hasPVs && pvs.filter(p=>p.sn||p.description).map((pv,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                      <span style={{ fontSize:18 }}>⚙️</span>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700 }}>PV {i+1} — {pv.description||"—"}</div><div style={{ fontSize:11, color:T.textDim }}>SN {pv.sn||"—"} · {pv.capacity||"—"} · Expires {fmt(addMonths(equip.inspection_date,12))}</div></div>
                      <ResultBadge result={pv.result}/>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                  📋 Client: <strong style={{ color:T.text }}>{equip.client_name}</strong> &nbsp;·&nbsp; Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp; Date: <strong style={{ color:T.text }}>{fmt(equip.inspection_date)}</strong> &nbsp;·&nbsp; Total: <strong style={{ color:T.accent }}>{totalCerts} certificate{totalCerts!==1?"s":""}</strong>
                </div>
              </Card>
            );
          }

          const forkCount  = machineType.baseSteps.includes(4) ? forks.filter(f=>f.length||f.swl).length : 0;
          const pvCount    = hasPVs ? pvs.filter(p=>p.sn||p.description).length : 0;
          const htCount    = machineType.id==="horse_trailer" ? (1+(ht.has_trailer?1:0)) : 0;
          const mainCount  = machineType.id==="horse_trailer" ? 0 : 1;
          const totalCerts = mainCount + htCount + forkCount + pvCount;
          return (
            <Card title="Review & Confirm" icon="📋" color={T.accent}>
              <div style={{ display:"grid", gap:10, marginBottom:16 }}>
                {machineType.id==="horse_trailer" && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                      <span style={{ fontSize:20 }}>🚛</span>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:800 }}>Horse — {ht.horse_make} {ht.horse_model}</div><div style={{ fontSize:11, color:T.textDim }}>Reg {ht.horse_reg} · Vehicle Registration Certificate · Expires {fmt(reviewExpiry)}</div></div>
                      <ResultBadge result={ht.horse_result}/>
                    </div>
                    {ht.has_trailer && (
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                        <span style={{ fontSize:20 }}>🚚</span>
                        <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:800 }}>Trailer — {ht.trailer_make} {ht.trailer_model}</div><div style={{ fontSize:11, color:T.textDim }}>Reg {ht.trailer_reg} · Trailer Registration Certificate · Expires {fmt(reviewExpiry)}</div></div>
                        <ResultBadge result={ht.trailer_result}/>
                      </div>
                    )}
                  </>
                )}
                {machineType.id!=="horse_trailer" && (
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <span style={{ fontSize:20 }}>{machineType.icon}</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:800 }}>{machineType.label}</div><div style={{ fontSize:11, color:T.textDim }}>SN {equip.serial_number}{equip.fleet_number?` · Fleet ${equip.fleet_number}`:""}{equip.model?` · ${equip.model}`:""}</div><div style={{ fontSize:11, color:T.textDim }}>{machineType.certType} · Expires {fmt(reviewExpiry)}</div></div>
                    <ResultBadge result={insp.overall_result||"PASS"}/>
                  </div>
                )}
                {machineType.baseSteps.includes(4) && forks.filter(f=>f.length||f.swl).map((fk,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <span style={{ fontSize:18 }}>🍴</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700 }}>Fork Arm {i+1} {fk.fork_number?`— ${fk.fork_number}`:""}</div><div style={{ fontSize:11, color:T.textDim }}>SWL {fk.swl||"—"} · L:{fk.length||"—"}mm · Fork Arm Inspection Certificate</div></div>
                    <ResultBadge result={fk.result}/>
                  </div>
                ))}
                {hasPVs && pvs.filter(p=>p.sn||p.description).map((pv,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <span style={{ fontSize:18 }}>⚙️</span>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700 }}>PV {i+1} — {pv.description||"—"}</div><div style={{ fontSize:11, color:T.textDim }}>SN {pv.sn||"—"} · {pv.capacity||"—"} · Expires {fmt(addMonths(equip.inspection_date,12))}</div></div>
                    <ResultBadge result={pv.result}/>
                  </div>
                ))}
              </div>
              <div style={{ padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                📋 Client: <strong style={{ color:T.text }}>{equip.client_name}</strong> &nbsp;·&nbsp; Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp; Date: <strong style={{ color:T.text }}>{fmt(equip.inspection_date)}</strong> &nbsp;·&nbsp; Total: <strong style={{ color:T.accent }}>{totalCerts} certificate{totalCerts!==1?"s":""}</strong>
              </div>
            </Card>
          );
        })()}

        {/* Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:8, flexWrap:"wrap" }}>
          <button type="button" onClick={currentStep===1?()=>router.push("/certificates"):prevStep}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {currentStep===1 ? "← Cancel" : "← Back"}
          </button>
          {currentStep < 9
            ? <button type="button" onClick={nextStep} style={{ padding:"11px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Next →</button>
            : <button type="button" onClick={handleGenerate} disabled={saving} style={{ padding:"11px 28px", borderRadius:10, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>{saving?"Generating…":"⚙️ Generate Certificates"}</button>
          }
        </div>
      </div>
    </AppLayout>
  );
}
