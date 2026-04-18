// src/components/certificates/CertificateSheet.jsx
"use client";

/* ── helpers ─────────────────────────────────────────────── */
function val(v){return v&&String(v).trim()!==""?String(v).trim():null;}
function formatDate(raw){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return raw;return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function addMonths(raw,n){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return null;d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function parseNotes(str){if(!str)return{};try{const p=JSON.parse(str);if(typeof p==="object"&&p!==null)return p;}catch(e){}const obj={};str.split("|").forEach(part=>{const idx=part.indexOf(":");if(idx<0)return;const k=part.slice(0,idx).trim();const v=part.slice(idx+1).trim();if(k)obj[k]=v;});return obj;}

function normalizeInspectionDataShape(raw){
  const src=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{};
  const out={...src};
  const firstObject=(...keys)=>{for(const key of keys){const value=src[key];if(value&&typeof value==="object"&&!Array.isArray(value))return value;}return {};};
  out.checklist={...firstObject("checklist","general_checklist","inspection_checklist")};
  out.boom={...firstObject("boom","boom_configuration","boomConfig")};
  out.bucket={...firstObject("bucket","bucket_platform","platform","bucket_inspection","platform_inspection")};
  out.horse={...firstObject("horse","prime_mover")};
  out.trailer={...firstObject("trailer")};
  const forkCandidates=[src.forks,src.forks_arms,src.fork_arms,src.fork_arm];
  const forkArray=forkCandidates.find(v=>Array.isArray(v));
  out.forks=Array.isArray(forkArray)?forkArray:[];
  return out;
}

function getInspectionData(c){
  const notes=parseNotes(val(c.notes||"")||"");
  const extracted=(c&&c.extracted_data&&typeof c.extracted_data==="object")?c.extracted_data:{};
  const normalized=normalizeInspectionDataShape({
    ...extracted,...notes,
    checklist:{...(extracted.checklist||{}),...(notes.checklist||{})},
    boom:{...(extracted.boom||extracted.boom_configuration||{}),...(notes.boom||notes.boom_configuration||{})},
    bucket:{...(extracted.bucket||extracted.bucket_platform||extracted.platform||{}),...(notes.bucket||notes.bucket_platform||notes.platform||{})},
    horse:{...(extracted.horse||extracted.prime_mover||{}),...(notes.horse||notes.prime_mover||{})},
    trailer:{...(extracted.trailer||{}),...(notes.trailer||{})},
    forks:Array.isArray(notes.forks)?notes.forks:Array.isArray(extracted.forks)?extracted.forks:Array.isArray(extracted.fork_arms)?extracted.fork_arms:[],
  });
  normalized.boom=normalizeBoomData(normalized.boom);
  normalized.bucket=normalizeBucketData(normalized.bucket);
  normalized.checklist=normalizeChecklistData(normalized.checklist);
  return normalized;
}

function normToken(v){return String(v||"").trim().toLowerCase().replace(/[()]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function firstVal(obj,keys,fallback=null){const src=(obj&&typeof obj==="object")?obj:{};for(const key of keys){const value=src[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value;}return fallback;}
function normalizeBoomData(raw){
  const src=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{};
  return{...src,
    max_height:firstVal(src,["max_height","max_working_height","max_working_height_m","working_height","working_height_m","height"]),
    min_boom_length:firstVal(src,["min_boom_length","boom_length_min","min_boom","min_length","minimum_boom_length"]),
    max_boom_length:firstVal(src,["max_boom_length","boom_length_max","max_boom","max_length","maximum_boom_length","boom_length"]),
    actual_boom_length:firstVal(src,["actual_boom_length","boom_length_actual","actual_boom","actual_length","actual_test_config"]),
    extended_boom_length:firstVal(src,["extended_boom_length","extended_telescoped","extended","telescoped","telescoped_length"]),
    boom_angle:firstVal(src,["boom_angle","boom_angle_deg","angle"]),
    min_radius:firstVal(src,["min_radius","radius_min","minimum_radius"]),
    max_radius:firstVal(src,["max_radius","radius_max","maximum_radius","working_radius"]),
    load_tested_at_radius:firstVal(src,["load_tested_at_radius","actual_radius","test_radius","working_radius_tested","actual_working_radius"]),
    swl_at_min_radius:firstVal(src,["swl_at_min_radius","swl_min_radius","min_radius_swl"]),
    swl_at_max_radius:firstVal(src,["swl_at_max_radius","swl_max_radius","max_radius_swl"]),
    swl_at_actual_config:firstVal(src,["swl_at_actual_config","swl_actual","actual_swl","actual_config_swl","swl_at_radius","swl"]),
    test_load:firstVal(src,["test_load","test_load_applied","load_test_applied","proof_load","load_test"]),
    boom_structure:firstVal(src,["boom_structure","structure","boom_condition"]),
    boom_pins:firstVal(src,["boom_pins","pins_connections","pins"]),
    boom_wear:firstVal(src,["boom_wear","wear_pads","pads"]),
    luffing_system:firstVal(src,["luffing_system","extension_system","luffing"]),
    slew_system:firstVal(src,["slew_system","rotation_system","slew_rotation"]),
    hoist_system:firstVal(src,["hoist_system","lift_system","hoist_lift"]),
    lmi_test:firstVal(src,["lmi_test","lmi_tested","lmi_tested_at_config"]),
    anti_two_block:firstVal(src,["anti_two_block","anti_two_block_overload","overload_system"]),
    jib_fitted:firstVal(src,["jib_fitted","fork_attachment","attachment_fitted"]),
    notes:firstVal(src,["notes","comments","remarks"]),
  };
}
function normalizeBucketData(raw){
  const src=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{};
  return{...src,
    serial_number:firstVal(src,["serial_number","bucket_serial","serial_no"]),
    manufacturer:firstVal(src,["manufacturer","make"]),
    platform_swl:firstVal(src,["platform_swl","bucket_swl","swl_platform","swl"]),
    platform_dimensions:firstVal(src,["platform_dimensions","dimensions"]),
    platform_material:firstVal(src,["platform_material","material"]),
    test_load_applied:firstVal(src,["test_load_applied","test_load","load_test","proof_load"]),
    platform_structure:firstVal(src,["platform_structure","structure"]),
    platform_floor:firstVal(src,["platform_floor","floor_condition"]),
    guardrails:firstVal(src,["guardrails"]),
    toe_boards:firstVal(src,["toe_boards","toe_board"]),
    gate_latch:firstVal(src,["gate_latch","gate_latch_system","gate"]),
    platform_mounting:firstVal(src,["platform_mounting","mounting","attachment_to_boom"]),
    rotation:firstVal(src,["rotation","slew"]),
    harness_anchors:firstVal(src,["harness_anchors","anchor_points"]),
    swl_marking:firstVal(src,["swl_marking","swl_marking_legible"]),
    paint_condition:firstVal(src,["paint_condition","coating_condition"]),
    levelling_system:firstVal(src,["levelling_system","auto_levelling"]),
    emergency_lowering:firstVal(src,["emergency_lowering","emergency_lowering_device"]),
    emergency_stop:firstVal(src,["emergency_stop","emergency_stop_platform"]),
    overload_device:firstVal(src,["overload_device","overload_swl_cut_off_device"]),
    tilt_alarm:firstVal(src,["tilt_alarm","inclination_alarm"]),
    intercom:firstVal(src,["intercom","communication"]),
  };
}
function normalizeChecklistData(raw){
  const src=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{};
  return{...src,
    structural_result:firstVal(src,["structural_result","structural_integrity","structure"]),
    hydraulics_result:firstVal(src,["hydraulics_result","hydraulic_system","hydraulics"]),
    brakes_result:firstVal(src,["brakes_result","brakes","brake_drive_system"]),
    tyres_result:firstVal(src,["tyres_result","tyres_wheels","tires_wheels"]),
    lights_result:firstVal(src,["lights_result","lights_alarms"]),
    safety_devices:firstVal(src,["safety_devices","safety_systems","safety_devices_interlocks"]),
    fire_extinguisher:firstVal(src,["fire_extinguisher","fire_extinguisher_condition"]),
    emergency_stop:firstVal(src,["emergency_stop"]),
    stabiliser_interlocks:firstVal(src,["stabiliser_interlocks","outrigger_interlocks"]),
    machine_stable_under_load:firstVal(src,["machine_stable_under_load","machine_stable"]),
    no_structural_deformation_under_load:firstVal(src,["no_structural_deformation_under_load","no_deformation_under_load"]),
    all_functions_operate_under_load:firstVal(src,["all_functions_operate_under_load","functions_operate_under_load"]),
    operational_result:firstVal(src,["operational_result"]),
    safety_result:firstVal(src,["safety_result"]),
    lmi_result:firstVal(src,["lmi_result","load_indicator_result"]),
  };
}

function pickResult(c){return(c?.result||c?.equipment_status||"").toUpperCase();}
function resultStyle(r){
  if(r==="PASS")           return{color:"#15803d",bg:"#dcfce7",brd:"#86efac",label:"PASS"};
  if(r==="FAIL")           return{color:"#b91c1c",bg:"#fee2e2",brd:"#fca5a5",label:"FAIL"};
  if(r==="REPAIR_REQUIRED")return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Repair Required"};
  if(r==="CONDITIONAL")   return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Conditional"};
  if(r==="OUT_OF_SERVICE") return{color:"#7f1d1d",bg:"#fee2e2",brd:"#fca5a5",label:"Out of Service"};
  return{color:"#374151",bg:"#f3f4f6",brd:"#d1d5db",label:r||"Unknown"};
}
function detectFail(defects,...kws){if(!defects)return"PASS";const d=defects.toLowerCase();return kws.some(k=>d.includes(k.toLowerCase()))?"FAIL":"PASS";}
function parsePhotoEvidence(raw){if(!raw)return[];if(Array.isArray(raw))return raw;if(typeof raw==="string"){try{const p=JSON.parse(raw);return Array.isArray(p)?p:[];}catch(e){return[];}}return[];}
function r(v){const s=resultStyle((v||"").toUpperCase());return<span style={{fontSize:8,fontWeight:800,color:s.color,background:s.bg,border:`1px solid ${s.brd}`,padding:"1px 6px",borderRadius:3,whiteSpace:"nowrap"}}>{s.label}</span>;}

function parsePVChecklist(c,pn){
  let cl={};
  try{const raw=val(c.notes||"");if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object"){cl=parsed.checklist||parsed.pressure_vessel_checklist||parsed;}}}catch(e){}
  try{const ex=c.extracted_data||{};if(ex.checklist)Object.assign(cl,ex.checklist);if(ex.pressure_vessel_checklist)Object.assign(cl,ex.pressure_vessel_checklist);}catch(e){}
  const get=(key,pnKey,fallback)=>{const v=cl[key];if(v&&String(v).trim())return String(v).trim();if(pnKey){const pv=pn[pnKey];if(pv&&String(pv).trim())return String(pv).trim();}return fallback||null;};
  const rawCorrosion=get("signs_of_corrosion","Corrosion",null);
  let corrosionDisplay="None observed";
  if(rawCorrosion){if(/^yes/i.test(rawCorrosion)){corrosionDisplay=rawCorrosion;}else if(/^none/i.test(rawCorrosion)){corrosionDisplay="None observed";}else{corrosionDisplay=rawCorrosion;}}
  const defects=val(c.defects_found)||"";
  const defectsImplyCorrosion=/corrode|corroded|corrosion|rust|rusty/i.test(defects);
  if(defectsImplyCorrosion&&/^none/i.test(corrosionDisplay)){corrosionDisplay="Yes — see defects";}
  return{
    vessel_condition_external:get("vessel_condition_external",null,"Satisfactory"),
    vessel_condition_internal:get("vessel_condition_internal",null,"Satisfactory"),
    safety_valve_fitted:get("safety_valve_fitted",null,"Yes"),
    pressure_gauge_fitted:get("pressure_gauge_fitted",null,"Yes"),
    drain_valve_fitted:get("drain_valve_fitted",null,"Yes"),
    signs_of_corrosion:corrosionDisplay,
    nameplate_legible:get("nameplate_legible",null,"Yes"),
    hydrostatic_test:get("hydrostatic_test",null,null),
    hydrostatic_test_pressure:get("hydrostatic_test_pressure_kpa",null,null),
    overall_assessment:get("overall_assessment",null,null),
  };
}

/* ── CSS ─────────────────────────────────────────────────── */
const CSS=`
  @page { size: A4; margin: 0; }
  .cs-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:16px;display:flex;justify-content:center;flex-direction:column;align-items:center;gap:16px}
  .cs-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;page-break-after:always;break-after:page;}
  .cs-page.pm{box-shadow:none;width:100%}
  .cs-page.last-page{page-break-after:avoid!important;break-after:avoid!important;}
  .cs-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .cs-geo{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .cs-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:90px}
  .cs-logo-box{background:#fff;width:110px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px;position:relative}
  .cs-logo-box::after{content:'';position:absolute;right:-18px;top:0;width:0;height:0;border-top:45px solid #fff;border-bottom:45px solid #fff;border-right:18px solid transparent}
  .cs-logo-box img{width:82px;height:82px;object-fit:contain}
  .cs-hdr-text{flex:1;padding:12px 12px 12px 32px;display:flex;flex-direction:column;justify-content:center}
  .cs-brand{font-size:7.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:3px}
  .cs-title{font-size:17px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.1;margin-bottom:3px}
  .cs-sub{font-size:8.5px;color:rgba(255,255,255,0.50);font-weight:500}
  .cs-hdr-right{padding:12px 16px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px;flex-shrink:0}
  .cs-badge{font-size:10px;font-weight:900;padding:4px 12px;border-radius:99px;letter-spacing:.10em;text-transform:uppercase}
  .cs-certno{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;color:rgba(255,255,255,0.50)}
  .cs-accent{height:3px;background:linear-gradient(90deg,#22d3ee 0%,#3b82f6 55%,#a78bfa 100%);flex-shrink:0}
  .cs-body{flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0}
  .cs-sec{border:1px solid #1e3a5f;border-radius:5px;overflow:hidden;flex-shrink:0}
  .cs-sec-ttl{background:#0b1d3a;border-bottom:1px solid #22d3ee;padding:3px 10px;font-size:7.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;display:flex;align-items:center;gap:6px}
  .cs-sec-ttl::before{content:'';width:2px;height:8px;background:#22d3ee;border-radius:2px;flex-shrink:0}
  .cs-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
  .cs-field{padding:3px 10px;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;background:#f4f8ff}
  .cs-field:nth-child(odd){background:#eef4ff}
  .cs-field:last-child{border-right:none}
  .cs-fl{font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:1px}
  .cs-fv{font-size:10px;font-weight:600;color:#0b1d3a;line-height:1.25;word-break:break-word}
  .cs-fv.mono{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#0e7490}
  .cs-fv.large{font-size:11px;font-weight:900;color:#0b1d3a}
  .cs-remarks{font-size:9px;color:#334155;line-height:1.4;padding:4px 10px;background:#f4f8ff}
  .cs-sig-wrap{padding:0 16px 3px;flex-shrink:0}
  .cs-sig-card{background:#fff;border:1px solid #1e3a5f;border-radius:6px;padding:6px 12px}
  .cs-sig-card-title{font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3b6ea5;margin-bottom:6px;display:flex;align-items:center;gap:6px}
  .cs-sig-card-title::before{content:'';width:2px;height:8px;background:#22d3ee;border-radius:2px}
  .cs-sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cs-sig-label{font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .cs-sig-name{font-size:8.5px;color:#0b1d3a;font-weight:700;margin-top:3px}
  .cs-sig-role{font-size:7.5px;color:#64748b;margin-top:1px}
  .cs-sig-img-wrap{background:#fff;border:1px solid #1e3a5f;border-radius:4px;min-height:36px;display:flex;align-items:flex-end;padding:2px 6px;margin-bottom:2px}
  .cs-legal{padding:3px 16px;flex-shrink:0}
  .cs-legal-box{border:1px solid #1e3a5f;border-radius:5px;padding:5px 10px;font-size:7.5px;color:#4b5563;line-height:1.4}
  .cs-services{background:#c41e3a;padding:3px 16px;flex-shrink:0}
  .cs-services p{font-size:7px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600;letter-spacing:0.02em}
  .cs-footer{background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .cs-footer span{font-size:7px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:.05em}
  .cs-evidence{padding:5px 10px;background:#f4f8ff;border-top:1px solid #dbeafe}
  .cs-evidence-grid{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
  .cs-evidence-item{display:flex;flex-direction:column;gap:2px;max-width:90px}
  .cs-evidence-img{width:90px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #c3d4e8;display:block}
  .cs-evidence-cap{font-size:6.5px;color:#4b5563;line-height:1.4;text-align:center;word-break:break-word}

  /* pro layout */
  .pro-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:16px;align-items:center}
  .pro-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;page-break-after:always;break-after:page;}
  .pro-page.pm{box-shadow:none;width:100%}

  /* ── KEY FIX: last page in any multi-page cert must NOT break-after ── */
  .pro-page.last-page{page-break-after:avoid!important;break-after:avoid!important;}
  .cs-page.last-page{page-break-after:avoid!important;break-after:avoid!important;}

  .pro-hdr{background:#0b1d3a;display:flex;align-items:center;min-height:76px;flex-shrink:0}
  .pro-logo-box{background:#fff;width:108px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
  .pro-logo-box img{width:86px;height:64px;object-fit:contain}
  .pro-hdr-txt{flex:1;padding:10px 10px 10px 28px}
  .pro-hdr-brand{font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px;font-weight:800}
  .pro-hdr-name{font-size:12px;font-weight:900;color:#fff}
  .pro-hdr-svc{font-size:6.5px;color:rgba(255,255,255,0.4);margin-top:3px;line-height:1.45}
  .pro-hdr-contact{padding:8px 12px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}
  .pro-cr{font-size:7.5px;color:rgba(255,255,255,0.65)}
  .pro-body{flex:1;padding:8px 12px 0;display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0;}
  .pro-ct{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .pro-ct td{padding:3px 6px;border:1px solid #c3d4e8}
  .pro-ct td:first-child,.pro-ct td:nth-child(3){font-weight:700;background:#0b1d3a;color:#4fc3f7;width:80px;white-space:nowrap}
  .pro-ct td:nth-child(2),.pro-ct td:nth-child(4){background:#f4f8ff;font-weight:600;color:#0b1d3a}
  .pro-cb{display:flex;align-items:center;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;margin-bottom:2px}
  .pro-cb-lbl{background:#0b1d3a;color:#4fc3f7;font-size:9.5px;font-weight:800;padding:5px 10px;flex:1}
  .pro-cb-yes{background:#eef4ff;color:#0b1d3a;font-size:9.5px;font-weight:800;padding:5px 10px;width:42px;text-align:center}
  .pro-cb-num{background:#f4f8ff;color:#0e7490;font-size:8.5px;font-weight:700;padding:5px 10px;font-family:monospace;flex:1}
  .pro-pf-wrap{border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;display:flex;align-items:center;padding:5px 12px;gap:14px;background:#f4f8ff}
  .pro-pass{color:#15803d;font-size:10px;font-weight:900;background:#dcfce7;padding:3px 11px;border-radius:3px;border:1px solid #86efac}
  .pro-fail{color:#9ca3af;font-size:10px;font-weight:700}
  .pro-fail-active{color:#b91c1c;font-size:10px;font-weight:900;background:#fee2e2;padding:3px 11px;border-radius:3px;border:1px solid #fca5a5}
  .pro-lt{width:100%;border-collapse:collapse;font-size:7.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .pro-lt th{background:#0b1d3a;color:#4fc3f7;padding:3px 4px;text-align:center;border:1px solid #1e3a5f;font-size:7px;font-weight:700}
  .pro-lt td{padding:2.5px 4px;border:1px solid #c3d4e8;text-align:center;font-weight:600;font-size:8px}
  .pro-lt td:first-child{text-align:left;background:#eef4ff;font-weight:700;color:#0b1d3a}
  .pro-lt tr:nth-child(even) td:not(:first-child){background:#f8faff}
  .pro-lt tr:nth-child(odd) td:not(:first-child){background:#fff}
  .pro-lt-bold td{font-weight:900!important;background:#0b1d3a!important;color:#fff!important}
  .pro-lt-bold td:first-child{background:#1e3a5f!important;color:#4fc3f7!important}
  .pro-st{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .pro-st td{padding:3px 7px;border:1px solid #c3d4e8}
  .pro-st td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a;width:60%}
  .pro-st td:nth-child(2){background:#fff;color:#0b1d3a;font-weight:600}
  .pro-stl{font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#0b1d3a;margin:4px 0 2px;padding-left:4px;border-left:3px solid #22d3ee;flex-shrink:0}
  .pro-mhdr{display:flex;align-items:flex-start;justify-content:space-between;border:1px solid #1e3a5f;border-radius:4px;padding:7px 10px;background:#f4f8ff;margin-bottom:4px;flex-shrink:0}
  .pro-mt{font-size:11px;font-weight:900;color:#0b1d3a}
  .pro-ms{font-size:7px;color:#64748b;margin-top:1px}
  .pro-cg{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex:1;min-height:0;}
  .pro-cc{border-right:1px solid #1e3a5f;overflow:hidden}
  .pro-cc:last-child{border-right:none}
  .pro-csec{background:#0b1d3a;color:#4fc3f7;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid #22d3ee}
  .pro-cr2{display:flex;align-items:center;justify-content:space-between;padding:2px 8px;border-bottom:1px solid #e8f0fb;font-size:7.5px}
  .pro-cr2:last-child{border-bottom:none}
  .pro-cr2:nth-child(even){background:#f8faff}
  .pro-cl{color:#0b1d3a;font-weight:500;flex:1}
  .pro-pp{display:flex;gap:4px;flex-shrink:0}
  .pro-p{color:#15803d;font-weight:900;font-size:8.5px;width:14px;text-align:center}
  .pro-f{color:#b91c1c;font-weight:900;font-size:8.5px;width:14px;text-align:center}
  .pro-na{color:#9ca3af;font-size:7px;width:14px;text-align:center}
  .pro-hrt{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .pro-hrt th{background:#0b1d3a;color:#4fc3f7;padding:3px 6px;text-align:center;border:1px solid #1e3a5f;font-weight:700;font-size:7px}
  .pro-hrt th:first-child{text-align:left}
  .pro-hrt td{padding:3px 6px;border:1px solid #c3d4e8;font-weight:500}
  .pro-hrt td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a}
  .pro-hrt td:not(:first-child){background:#fff;text-align:center;font-weight:600}
  .pro-compbox{border:2px solid #1e3a5f;border-radius:6px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;background:#f4f8ff;flex-shrink:0}
  .pro-red-box{border:1px solid #fca5a5;border-radius:4px;padding:5px 9px;background:#fff5f5;flex-shrink:0}
  .pro-red-lbl{font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px}
  .pro-red-val{font-size:8.5px;font-weight:700;color:#b91c1c;line-height:1.45}
  .pro-comments-box{border:1px solid #c3d4e8;border-radius:4px;padding:5px 9px;background:#f4f8ff;flex-shrink:0}
  .pro-comments-lbl{font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .pro-comments-val{font-size:8.5px;color:#334155;line-height:1.5}
  .pro-pv{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .pro-pv th{background:#0b1d3a;color:#4fc3f7;padding:3px 7px;text-align:left;border:1px solid #1e3a5f;font-size:7.5px;font-weight:700}
  .pro-pv td{padding:3px 7px;border:1px solid #c3d4e8}
  .pro-pv td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a}
  .pro-evidence{border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .pro-evidence-hdr{background:#0b1d3a;color:#4fc3f7;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid #22d3ee}
  .pro-evidence-grid{display:flex;gap:6px;flex-wrap:wrap;padding:7px 8px;background:#f4f8ff}
  .pro-evidence-item{display:flex;flex-direction:column;gap:2px}
  .pro-evidence-img{width:96px;height:66px;object-fit:cover;border-radius:3px;border:1px solid #c3d4e8;display:block}
  .pro-evidence-cap{font-size:6.5px;color:#4b5563;line-height:1.4;text-align:center;max-width:96px;word-break:break-word}
  .pro-sig{padding:5px 12px 4px;flex-shrink:0}
  .pro-sigg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .pro-sgl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .pro-sgline{border-bottom:1px solid #1e3a5f;min-height:34px;display:flex;align-items:flex-end;padding-bottom:2px;margin-bottom:2px}
  .pro-sgname{font-size:8.5px;font-weight:700;color:#0b1d3a}
  .pro-sgrole{font-size:7.5px;color:#64748b}
  .pro-svc{background:#c41e3a;padding:3px 12px;flex-shrink:0}
  .pro-svc p{font-size:6.5px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600;letter-spacing:.02em}
  .pro-foot{background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 12px;display:flex;justify-content:space-between;flex-shrink:0}
  .pro-foot span{font-size:7px;color:rgba(255,255,255,0.35);font-weight:600}
  .pro-pb{page-break-after:always;break-after:page;height:0;display:block;}

  /* vehicle reg table */
  .vr-t{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .vr-t th{background:#0b1d3a;color:#4fc3f7;padding:4px 8px;text-align:left;border:1px solid #1e3a5f;font-size:7.5px;font-weight:700}
  .vr-t td{padding:4px 8px;border:1px solid #c3d4e8}
  .vr-t td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a;width:38%}
  .vr-t td:nth-child(2){background:#fff;font-weight:600;color:#0b1d3a}

  /* fork inspection table */
  .fk-t{width:100%;border-collapse:collapse;font-size:7.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .fk-t th{background:#0b1d3a;color:#4fc3f7;padding:3px 5px;text-align:center;border:1px solid #1e3a5f;font-size:7px;font-weight:700}
  .fk-t th:first-child{text-align:left}
  .fk-t td{padding:3px 5px;border:1px solid #c3d4e8;text-align:center;font-weight:600;font-size:8px;background:#fff}
  .fk-t td:first-child{text-align:left;background:#eef4ff;font-weight:700;color:#0b1d3a}
  .fk-t tr:nth-child(even) td:not(:first-child){background:#f8faff}

  /* bucket/platform table */
  .bk-t{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .bk-t th{background:#0b1d3a;color:#4fc3f7;padding:3px 7px;text-align:left;border:1px solid #1e3a5f;font-size:7.5px;font-weight:700}
  .bk-t td{padding:3px 7px;border:1px solid #c3d4e8}
  .bk-t td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a;width:55%}
  .bk-t td:nth-child(2){background:#fff;font-weight:600;color:#0b1d3a}

  /* bucket page accent — orange stripe */
  .bucket-accent{height:3px;background:linear-gradient(90deg,#f97316 0%,#fb923c 55%,#fbbf24 100%);flex-shrink:0}

  @media print{
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0}
    .cs-wrap,.pro-wrap{background:none!important;padding:0!important;border:none!important;gap:0!important;border-radius:0!important;display:block!important}
    .cs-page,.pro-page{box-shadow:none!important;width:210mm!important;height:297mm!important;overflow:hidden!important;page-break-after:always;break-after:page;margin:0!important}
    .cs-page.last-page,.pro-page.last-page{page-break-after:avoid!important;break-after:avoid!important;}
    .pro-pb{page-break-after:always;break-after:page;height:0}
  }
`;

/* ── Shared photo evidence ───────────────────────────────── */
function ProEvidence({photos}){
  if(!photos||!photos.length)return null;
  return(
    <div className="pro-evidence">
      <div className="pro-evidence-hdr">Photo Evidence ({photos.length})</div>
      <div className="pro-evidence-grid">
        {photos.map((p,i)=>(
          <div className="pro-evidence-item" key={i}>
            <img className="pro-evidence-img" src={p.dataURL} alt={p.caption||p.name||`Photo ${i+1}`} onError={e=>e.target.style.display="none"}/>
            {p.caption&&<div className="pro-evidence-cap">{p.caption}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Generic Field / Section ─────────────────────────────── */
function Field({label,value,mono=false,large=false,full=false,red=false}){
  if(!value)return null;
  return(
    <div className="cs-field" style={{...(full?{gridColumn:"1/-1"}:{}),...(red?{background:"#fff5f5",borderLeft:"3px solid #ef4444"}:{})}}>
      <div className="cs-fl" style={red?{color:"#b91c1c"}:{}}>{label}</div>
      <div className={`cs-fv${mono?" mono":""}${large?" large":""}`} style={red?{color:"#b91c1c",fontWeight:700}:{}}>{value}</div>
    </div>
  );
}
function Section({title,children}){
  const kids=Array.isArray(children)?children.filter(Boolean):[children].filter(Boolean);
  if(!kids.length)return null;
  return(<div className="cs-sec"><div className="cs-sec-ttl">{title}</div><div className="cs-fields">{kids}</div></div>);
}

/* ── Shared sub-components ───────────────────────────────── */
function ProHdr({logoUrl}){
  return(
    <div className="pro-hdr">
      <div className="pro-logo-box"><img src={logoUrl} alt="Monroy" onError={e=>e.target.style.display="none"}/></div>
      <div className="pro-hdr-txt">
        <div className="pro-hdr-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
        <div className="pro-hdr-name">WE ARE &#9658;&#9658; YOUR SOLUTION</div>
        <div className="pro-hdr-svc">Mobile Crane Hire · Rigging · NDT Test · Scaffolding · Painting · Inspection of Lifting Equipment and Machinery · Pressure Vessels &amp; Air Receiver · Steel Fabricating and Structural · Mechanical Engineering · Fencing · Maintenance · Mill Installation</div>
      </div>
      <div className="pro-hdr-contact">
        <div className="pro-cr">&#128222; (+267) 71 450 610 / 77 906 461</div>
        <div className="pro-cr">&#9993; monroybw@gmail.com</div>
        <div className="pro-cr">&#128205; Phase 2, Letlhakane</div>
        <div className="pro-cr">&#128236; P O Box 595 Letlhakane</div>
      </div>
    </div>
  );
}
function ProFooter(){
  return(
    <>
      <div className="pro-svc"><p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment &amp; Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating &amp; Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p></div>
      <div className="pro-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </>
  );
}
function ProCT({company,location,issueDate,equipMake,serialNo,fleetNo,swl,machineHours}){
  return(
    <table className="pro-ct"><tbody>
      <tr><td>Customer</td><td>{company||"—"}</td><td>Make / Type</td><td>{equipMake||"—"}</td></tr>
      <tr><td>Site location</td><td>{location||"—"}</td><td>Serial number</td><td>{serialNo||"—"}</td></tr>
      <tr><td>Date</td><td>{issueDate||"—"}</td><td>Fleet number</td><td>{fleetNo||"—"}</td></tr>
      <tr><td></td><td></td><td>Capacity / SWL</td><td>{swl||"—"}</td></tr>
      {machineHours&&<tr><td></td><td></td><td>Machine Hours</td><td>{machineHours}</td></tr>}
    </tbody></table>
  );
}
function ProSig({inspName,inspId,sigUrl}){
  return(
    <div className="pro-sig">
      <div className="pro-sigg">
        <div>
          <div className="pro-sgl">Competent Person / Inspector</div>
          <div className="pro-sgline"><img src={sigUrl} alt="sig" style={{maxHeight:30,maxWidth:90,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/></div>
          <div className="pro-sgname">{inspName||"Moemedi Masupe"}</div>
          <div className="pro-sgrole">Inspector ID: {inspId||"700117910"}</div>
        </div>
        <div>
          <div className="pro-sgl">Client / User / Owner</div>
          <div className="pro-sgline"/>
          <div className="pro-sgname" style={{minHeight:12}}></div>
          <div className="pro-sgrole">Name &amp; Signature</div>
        </div>
      </div>
    </div>
  );
}
function CI({label,result="PASS",na=false}){
  return(
    <div className="pro-cr2">
      <span className="pro-cl">{label}</span>
      <div className="pro-pp">
        {na?<span className="pro-na">N/A</span>:<><span className="pro-p">{result==="PASS"?"✓":""}</span><span className="pro-f">{(result==="FAIL"||result==="REPAIR_REQUIRED")?"✗":""}</span></>}
      </div>
    </div>
  );
}
function PFBadge({result}){
  const isPass=result==="PASS";
  return(
    <div className="pro-pf-wrap">
      <span className={isPass?"pro-pass":"pro-fail"}>Pass</span>
      <span className={!isPass?"pro-fail-active":"pro-fail"}>Fail</span>
    </div>
  );
}
function BucketResultRow({label,result}){
  if(!result)return null;
  const isPass=(result||"").toUpperCase()==="PASS";
  const isFail=/fail|repair|required/i.test(result||"");
  const cellStyle=isFail?{background:"#fff5f5",color:"#b91c1c",fontWeight:800}:isPass?{background:"#f0fdf4",color:"#15803d",fontWeight:700}:{background:"#fff",color:"#0b1d3a",fontWeight:600};
  return(<tr><td>{label}</td><td style={cellStyle}>{result}</td></tr>);
}

/* ══════════════════════════════════════════════════════════
   CRANE LOAD TEST  (page 1 of 2 — no last-page class)
══════════════════════════════════════════════════════════ */
function CraneLoadTestPage({c,pn,tone,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const equipMake=val(c.manufacturer||c.model||c.equipment_type);
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const machineHours=val(c.machine_hours||pn["Machine hours"]||pn["Machine Hours"]);
  const defects=val(c.defects_found);
  const recommendations=val(c.recommendations);
  const comments=val(c.comments||c.remarks);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const C1={boom:pn["C1 boom"]||"",angle:pn["C1 angle"]||"",radius:pn["C1 radius"]||"",rated:pn["C1 rated"]||"",test:pn["C1 test"]||""};
  const C2={boom:pn["C2 boom"]||"",angle:pn["C2 angle"]||"",radius:pn["C2 radius"]||"",rated:pn["C2 rated"]||"",test:pn["C2 test"]||pn["Crane test load"]||""};
  const C3={boom:pn["C3 boom"]||"",angle:pn["C3 angle"]||"",radius:pn["C3 radius"]||"",rated:pn["C3 rated"]||"",test:pn["C3 test"]||""};
  const sliRes=pn["Computer"]||pn["SLI"]||"PASS";
  const sliModel=pn["SLI model"]||"";
  const retractBoom=pn["Retract boom"]||C1.boom;
  const opCode=pn["Operating code"]||"MAIN/AUX-FULL OUTRIGGER-360DEG";
  const hookReeving=pn["Hook reeving"]||"";
  const ctrWts=pn["Counterweights"]||"STD FITTED";
  const jib=pn["Jib"]||"";
  const sliCertNo=pn["SLI cert"]||certNumber?.replace("CERT-CR","SLI ")||"";
  const expiryDate=formatDate(c.expiry_date);
  return(
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl} machineHours={machineHours}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6,flexShrink:0}}>
          <div>
            <div className="pro-cb"><div className="pro-cb-lbl">SLI Certificate</div><div className="pro-cb-yes">YES</div>{sliCertNo&&<div className="pro-cb-num" style={{fontWeight:900,fontSize:10,color:"#0b1d3a"}}>{sliCertNo}</div>}</div>
            <div className="pro-cb"><div className="pro-cb-lbl">Load Test Certificate</div><div className="pro-cb-yes">YES</div>{certNumber&&<div className="pro-cb-num">{certNumber}</div>}</div>
            {expiryDate&&<div style={{fontSize:9,fontWeight:800,color:"#0b1d3a",marginTop:3,border:"1px solid #1e3a5f",padding:"2px 7px",display:"inline-block",borderRadius:3}}>expire date: {expiryDate}</div>}
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl">Details of Applied Load</div>
        <table className="pro-lt">
          <thead>
            <tr><th rowSpan={2} style={{textAlign:"left",width:130}}>Details of applied Load</th><th colSpan={2}>1 — Main (Short Boom)</th><th colSpan={2}>2 — Main (Test Config)</th><th colSpan={2}>3 — Aux / Max Boom</th></tr>
            <tr><th>Actual</th><th>SLI Indicate</th><th>Actual</th><th>SLI Indicate</th><th>Actual</th><th>SLI Indicate</th></tr>
          </thead>
          <tbody>
            <tr><td>Boom Length Reading</td><td>{C1.boom}</td><td>{C1.boom}</td><td>{C2.boom}</td><td>{C2.boom}</td><td>{C3.boom}</td><td>{C3.boom}</td></tr>
            <tr><td>Boom Angle Reading</td><td>{C1.angle}</td><td>{C1.angle}</td><td>{C2.angle}</td><td>{C2.angle}</td><td>{C3.angle}</td><td>{C3.angle}</td></tr>
            <tr><td>Radius Reading</td><td>{C1.radius}</td><td>{C1.radius}</td><td>{C2.radius}</td><td>{C2.radius}</td><td>{C3.radius}</td><td>{C3.radius}</td></tr>
            <tr><td>Rated Load</td><td>{C1.rated}</td><td>{C1.rated}</td><td>{C2.rated}</td><td>{C2.rated}</td><td>{C3.rated}</td><td>{C3.rated}</td></tr>
            <tr className="pro-lt-bold"><td>Test Load</td><td>{C1.test}</td><td>{C1.test}</td><td>{C2.test}</td><td>{C2.test}</td><td>{C3.test}</td><td>{C3.test}</td></tr>
          </tbody>
        </table>
        <div className="pro-stl">SLI Details</div>
        <table className="pro-st"><tbody>
          {sliModel&&<tr><td>SLI Make &amp; Model</td><td>{sliModel}</td></tr>}
          {retractBoom&&<tr><td>Retract Boom vs Actual Indicated</td><td>{retractBoom}</td></tr>}
          <tr><td>Operating Code used for testing</td><td>{opCode}</td></tr>
          {hookReeving&&<tr><td>Hook block Reeving</td><td>{hookReeving}</td></tr>}
          {jib&&<tr><td>Jib Configuration</td><td>{jib}</td></tr>}
          <tr><td>Counter weights during test</td><td>{ctrWts}</td></tr>
          <tr><td>SLI cut off system — Hoist up</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
          <tr><td>SLI cut off system — Tele out</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
          <tr><td>SLI cut out system — Boom down</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
        </tbody></table>
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {comments&&<div className="pro-comments-box"><div className="pro-comments-lbl">Comments</div><div className="pro-comments-val">{comments}</div></div>}
        <ProEvidence photos={photos}/>
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE'S LOAD CHART AND TESTED CORRECTLY TO ORIGINAL MANUFACTURERS SPECIFICATIONS.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CRANE CHECKLIST  (page 2 of 2 — LAST PAGE → last-page class)
══════════════════════════════════════════════════════════ */
function CraneChecklistPage({c,pn,pm,logo}){
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipMake=val(c.manufacturer||c.model||c.equipment_type);
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const machineHours=val(c.machine_hours||pn["Machine hours"]||pn["Machine Hours"]);
  const defects=val(c.defects_found)||"";
  const comments=val(c.comments||c.remarks);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const structural=pn["Structural"]||"PASS";
  const boom=pn["Boom"]||"PASS";
  const outriggers=pn["Outriggers"]||"PASS";
  const computer=pn["Computer"]||"PASS";
  const cl=normalizeChecklistData({});
  const oilLeaks=detectFail(defects,"oil leak","leak");
  const tires=detectFail(defects,"tire","tyre");
  const brakes=detectFail(defects,"brake");
  const hoist=detectFail(defects,"hoist");
  const teleCyl=detectFail(defects,"tele cylinder","cylinder");
  const boomCyl=detectFail(defects,"boom cylinder","lift cylinder");
  const mcirNo="MCIR "+(c.inspection_number||c.certificate_number?.replace("CERT-CR","")||"");
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl} machineHours={machineHours}/>
        <div className="pro-mhdr">
          <div>
            {expiryDate&&<div style={{fontSize:9,fontWeight:800,color:"#0b1d3a",marginBottom:2}}>Validity: {expiryDate}</div>}
            <div className="pro-mt">{mcirNo}</div>
            <div className="pro-ms">The mobile crane was inspected with regards to the MQWMR Act CAP 44:02 Under Regulations 2</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2,fontSize:8,fontWeight:700,color:"#0b1d3a"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span>Annually:</span><span style={{fontSize:13}}>&#10003;</span></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span>Bi-annually:</span><span></span></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span>Quarterly:</span><span></span></div>
          </div>
        </div>
        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec">Cab Condition</div>
            <CI label="Windows" result="PASS"/><CI label="Control Levers Marked" result="PASS"/>
            <CI label="Control Lever return to neutral" result="PASS"/><CI label="Level Gauges Correct" result="PASS"/>
            <CI label="Reverse Warning" result="PASS"/><CI label="Load Charts Available" result="PASS"/>
            <CI label="Horn Warning" result="PASS"/><CI label="Lights, Rotating Lights" result="PASS"/>
            <CI label="Tires" result={tires}/><CI label="Crane Brakes" result={brakes}/>
            <CI label="Fire Extinguisher" result={cl.fire_extinguisher||"PASS"}/><CI label="Beacon Lights" result="PASS"/>
            <CI label="SWL Correctly Indicated" result="PASS"/><CI label="Oil Leaks" result={oilLeaks}/>
            <CI label="Operator Seat Condition" result="PASS"/>
            <div className="pro-csec">Safe Load Indicator</div>
            <CI label="Override Key Safe" result={computer}/><CI label="Load Reading" result={computer}/>
            <CI label="A2B System Working" result={computer}/><CI label="Cut Off System Working" result={computer}/>
            <CI label="Radius Reading" result={computer}/><CI label="Boom Length Reading" result={computer}/>
            <CI label="Boom Angle Reading" result={computer}/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Crane Superstructure</div>
            <CI label="Outrigger Beams (Visual)" result={outriggers}/><CI label="Outrigger Jacks (Visual)" result={outriggers}/>
            <CI label="Fly-Jib Condition (Visual)" na/><CI label="Outrigger Pads Condition" result={outriggers}/>
            <CI label="Outrigger Boxes (Cracks)" result={outriggers}/><CI label="Hoist Drum Condition" result={hoist}/>
            <CI label="Hoist Brake Condition" result={hoist}/><CI label="Hoist Drum Mounting" result="PASS"/>
            <CI label="Leaks on Hoist Drum" result={oilLeaks}/><CI label="Top Head Sheaves" result="PASS"/>
            <CI label="Bottom Head Sheaves" result="PASS"/><CI label="Boom Retract Ropes Visible" na/>
            <CI label="Boom Retract Sheaves" na/><CI label="Slew Bearing Checked" result="PASS"/>
            <CI label="Slew Brake Checked" result="PASS"/><CI label="Boom Lock Pins Checked" result={boom}/>
            <CI label="Boom Pivot Point Checked" result={boom}/><CI label="Control Valve Checked" result="PASS"/>
            <CI label="Tele Cylinders — leaks" result={teleCyl}/><CI label="Tele Cylinders — holding under load" result={teleCyl}/>
            <CI label="Tele Sections — damage" result={structural}/><CI label="Tele's — bending" na/>
            <CI label="Boom Lift Cylinder — leaks" result={boomCyl}/><CI label="Boom Cylinder Mounting Points" result={boom}/>
            <CI label="Boom Cylinder holding under load" result={boom}/><CI label="Counterweights" result="PASS"/>
          </div>
        </div>
        {comments&&<div className="pro-comments-box"><div className="pro-comments-lbl">Comments</div><div className="pro-comments-val">{comments}</div></div>}
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HOOK & ROPE  (single page — last-page)
══════════════════════════════════════════════════════════ */
function HookRopePage({c,pn,tone,pm,logo,isRope}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipMake=val(c.manufacturer||c.model||c.equipment_type);
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const machineHours=val(c.machine_hours||pn["Machine hours"]);
  const defects=val(c.defects_found);
  const recommendations=val(c.recommendations);
  const comments=val(c.comments||c.remarks);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const latch=pn["Latch"]||"PASS";
  const structural=pn["Structural"]||"PASS";
  const wear=pn["Wear"];
  const brokenW=pn["Broken wires"]||"none";
  const corrosion=pn["Corrosion"]||"none";
  const kinks=pn["Kinks"]||"none";
  const ropeDia=pn["Rope dia"]||val(c.capacity_volume)||"";
  const reportNo=certNumber?.replace("CERT-","HR ")||"HR 0001";
  const h1SWL=pn["Hook 1 SWL"]||swl||"";
  const h2SWL=pn["Hook 2 SWL"]||"";
  const drumMain=pn["Drum main"]||"Good";
  const drumAux=pn["Drum aux"]||"Good";
  const layMain=pn["Lay main"]||"Good";
  const layAux=pn["Lay aux"]||"Good";
  function YN(pass){return<span style={{color:pass==="PASS"?"#15803d":"#b91c1c",fontWeight:800}}>{pass==="PASS"?"Yes":"No"}</span>;}
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl} machineHours={machineHours}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>{isRope?"Wire Rope Inspection Report":"Hook &amp; Rope Inspection Report"}</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{reportNo}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry date: {expiryDate}</div>}
          </div>
          <div className="pro-compbox">
            <div><div style={{fontSize:10,fontWeight:800,color:"#0b1d3a"}}>Compliance Certificate</div><div style={{fontSize:8,color:"#64748b"}}>to be issued</div></div>
            <div style={{fontSize:26,color:tone.label==="PASS"?"#15803d":"#b91c1c",fontWeight:900}}>{tone.label==="PASS"?"✓":"✗"}</div>
          </div>
        </div>
        <div className="pro-stl">Hoist Drum &amp; Rope Condition</div>
        <table className="pro-hrt"><thead><tr><th></th><th>Main Hoist</th><th>Auxiliary Hoist</th></tr></thead>
          <tbody>
            <tr><td>Hoist Drum Condition</td><td>{drumMain}</td><td>{drumAux}</td></tr>
            <tr><td>Hoist Rope Lay on Drum</td><td>{layMain}</td><td>{layAux}</td></tr>
          </tbody>
        </table>
        <div className="pro-stl">Steel Wire Rope Inspection</div>
        <table className="pro-hrt">
          <thead><tr><th style={{textAlign:"left"}}>Inspection Item</th><th>Main</th><th>Aux</th><th style={{textAlign:"left"}}>Inspection Item</th><th>Main</th><th>Aux</th></tr></thead>
          <tbody>
            <tr><td>Rope Diameter (mm)</td><td>{ropeDia?.replace(/[^\d.]/g,"")||"—"}</td><td>{ropeDia?.replace(/[^\d.]/g,"")||"—"}</td><td>Rope length (3x windings)</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Reduction in rope Dia. (max 10%)</td><td>none</td><td>none</td><td>Core Protrusion</td><td>None</td><td>None</td></tr>
            <tr><td>Corrosion</td><td>{corrosion}</td><td>{corrosion}</td><td>Broken wires</td><td>{brokenW}</td><td>{brokenW}</td></tr>
            <tr><td>Rope kinks / deforming</td><td>{kinks}</td><td>{kinks}</td><td>Other defects</td><td>none</td><td>none</td></tr>
            <tr><td>End fitting / attachments</td><td>Good</td><td>Good</td><td>Serviceability</td><td>Good</td><td>Good</td></tr>
          </tbody>
        </table>
        {!isRope&&(
          <>
            <div className="pro-stl">Hook Inspection Criteria</div>
            <table className="pro-hrt">
              <thead><tr><th style={{textAlign:"left",width:"38%"}}>Hook inspection criteria</th><th colSpan={2}>Hook 1 (Main)</th><th colSpan={2}>Hook 2 (Aux)</th></tr></thead>
              <tbody>
                <tr><td>Hook block SWL</td><td colSpan={2}>{h1SWL||"—"}</td><td colSpan={2}>{h2SWL||"—"}</td></tr>
                <tr><td>SWL marked on hook</td><td>{YN(structural)}</td><td></td><td>{YN("PASS")}</td><td></td></tr>
                <tr><td>Safety catch fitted &amp; good condition</td><td>{YN(latch)}</td><td></td><td>{YN("PASS")}</td><td></td></tr>
                <tr><td>Signs of cracks</td><td>{YN(structural)}</td><td></td><td>{YN("PASS")}</td><td></td></tr>
                <tr><td>Swivel free under load</td><td>{YN("PASS")}</td><td></td><td>{YN("PASS")}</td><td></td></tr>
                <tr><td>Hook side bending (max 5%)</td><td><span style={{color:(!wear||parseFloat(wear)<=5)?"#15803d":"#b91c1c",fontWeight:800}}>{wear?`${wear}mm — ${parseFloat(wear)<=5?"OK":"Excessive"}`:"OK"}</span></td><td></td><td>{YN("PASS")}</td><td></td></tr>
              </tbody>
            </table>
          </>
        )}
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {comments&&<div className="pro-comments-box"><div className="pro-comments-lbl">Comments</div><div className="pro-comments-val">{comments}</div></div>}
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRESSURE VESSEL  (single page — last-page)
══════════════════════════════════════════════════════════ */
function PressureVesselPage({c,pn,tone,pm,logo,pvNum}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipMake=val(c.manufacturer||c.model||c.equipment_type)||"Pressure Vessel";
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const mawp=val(c.mawp||c.working_pressure||pn[`PV${pvNum} MAWP`]||pn["MAWP"]);
  const testP=val(c.test_pressure||pn[`PV${pvNum} test`]||pn["Test pressure"]);
  const designP=val(c.design_pressure||pn[`PV${pvNum} design`]);
  const pvType=pn[`PV${pvNum} type`]||val(c.equipment_description)||"Pressure Vessel";
  const pvSN=pn[`PV${pvNum} serial`]||serialNo;
  const pvCap=pn[`PV${pvNum} capacity`]||val(c.capacity_volume);
  const defects=val(c.defects_found);
  const recommendations=val(c.recommendations);
  const comments=val(c.comments||c.remarks);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const pressureUnit=val(c.pressure_unit||pn.pressure_unit)||"bar";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const cl=parsePVChecklist(c,pn);
  const corrosionIsYes=/^yes/i.test(cl.signs_of_corrosion||"");
  const corrosionStyle=corrosionIsYes?{color:"#b91c1c",fontWeight:800}:{color:"#0b1d3a",fontWeight:600};
  const overallDisplay=cl.overall_assessment||(tone.label==="PASS"?"Pass":tone.label==="FAIL"?"Fail":tone.label);
  const overallIsPass=/^pass|satisfactory/i.test(overallDisplay);
  const overallStyle={fontWeight:800,color:overallIsPass?"#15803d":"#b91c1c"};
  const hydroDisplay=cl.hydrostatic_test?(cl.hydrostatic_test==="Yes"&&(cl.hydrostatic_test_pressure||testP))?`Yes — ${cl.hydrostatic_test_pressure||testP} ${pressureUnit}`:cl.hydrostatic_test:testP?`Yes — ${testP} ${pressureUnit}`:"N/A";
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Pressure Vessel Inspection</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry date: {expiryDate}</div>}
          </div>
          <div className="pro-compbox">
            <div><div style={{fontSize:10,fontWeight:800,color:"#0b1d3a"}}>Compliance Certificate</div><div style={{fontSize:8,color:"#64748b"}}>to be issued</div></div>
            <div style={{fontSize:26,color:tone.label==="PASS"?"#15803d":"#b91c1c",fontWeight:900}}>{tone.label==="PASS"?"✓":"✗"}</div>
          </div>
        </div>
        <div className="pro-stl">Pressure Vessel Details</div>
        <table className="pro-pv">
          <thead><tr><th>Vessel Type</th><th>Serial Number</th><th>Capacity</th><th>MAWP ({pressureUnit})</th><th>Test Pressure ({pressureUnit})</th><th>Design Pressure ({pressureUnit})</th></tr></thead>
          <tbody><tr><td style={{background:"#fff"}}>{pvType}</td><td style={{background:"#fff",fontFamily:"monospace"}}>{pvSN||"—"}</td><td style={{background:"#fff"}}>{pvCap||"—"}</td><td style={{background:"#fff",fontWeight:700}}>{mawp||"—"}</td><td style={{background:"#fff",fontWeight:700}}>{testP||"—"}</td><td style={{background:"#fff"}}>{designP||"—"}</td></tr></tbody>
        </table>
        <div className="pro-stl">Inspection Results</div>
        <table className="pro-st"><tbody>
          <tr><td>Vessel condition — external visual</td><td>{cl.vessel_condition_external}</td></tr>
          <tr><td>Vessel condition — internal (if applicable)</td><td>{cl.vessel_condition_internal}</td></tr>
          <tr><td>Safety valve fitted and operating correctly</td><td>{cl.safety_valve_fitted}</td></tr>
          <tr><td>Pressure gauge fitted and reading correctly</td><td>{cl.pressure_gauge_fitted}</td></tr>
          <tr><td>Drain valve fitted and operating correctly</td><td>{cl.drain_valve_fitted}</td></tr>
          <tr><td style={corrosionIsYes?{background:"#fff5f5",fontWeight:700,color:"#b91c1c"}:{}}>Signs of corrosion, cracking or deformation</td><td style={corrosionStyle}>{cl.signs_of_corrosion}</td></tr>
          <tr><td>Nameplate legible and data correct</td><td>{cl.nameplate_legible}</td></tr>
          <tr><td>Hydrostatic test performed</td><td>{hydroDisplay}</td></tr>
          <tr><td>Overall assessment</td><td style={overallStyle}>{overallDisplay}</td></tr>
        </tbody></table>
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.
        </div>
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {comments&&<div className="pro-comments-box"><div className="pro-comments-lbl">Comments</div><div className="pro-comments-val">{comments}</div></div>}
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WIRE ROPE SLING  (single page — last-page)
══════════════════════════════════════════════════════════ */
function WireRopeSlingPage({c,pn,tone,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipMake=val(c.manufacturer||c.model||c.equipment_type)||"Wire Rope Sling";
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const defects=val(c.defects_found);
  const recommendations=val(c.recommendations);
  const comments=val(c.comments||c.remarks);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const slingType=val(c.equipment_type)||"Wire Rope Sling";
  const numLegs=pn["Legs"]||"";
  const diameter=pn["Diameter"]||val(c.capacity_volume)||"";
  const length=pn["Length"]||"";
  const construction=pn["Construction"]||"";
  const core=pn["Core"]||"";
  const corrosion=pn["Corrosion"]||"none";
  const brokenWires=pn["Broken wires"]||"none";
  const kinks=pn["Kinks"]||"none";
  const endFittings=pn["End fittings"]||"Good";
  const photos=parsePhotoEvidence(c.photo_evidence);
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Wire Rope Sling Inspection</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry date: {expiryDate}</div>}
          </div>
          <div className="pro-compbox">
            <div><div style={{fontSize:10,fontWeight:800,color:"#0b1d3a"}}>Compliance Certificate</div></div>
            <div style={{fontSize:26,color:tone.label==="PASS"?"#15803d":"#b91c1c",fontWeight:900}}>{tone.label==="PASS"?"✓":"✗"}</div>
          </div>
        </div>
        <div className="pro-stl">Sling Details</div>
        <table className="pro-pv"><thead><tr><th>Type</th><th>Diameter (mm)</th><th>Length (m)</th><th>No. of Legs</th><th>Construction</th><th>Core Type</th><th>SWL</th></tr></thead>
          <tbody><tr><td style={{background:"#fff"}}>{slingType}</td><td style={{background:"#fff"}}>{diameter||"—"}</td><td style={{background:"#fff"}}>{length||"—"}</td><td style={{background:"#fff"}}>{numLegs||"—"}</td><td style={{background:"#fff"}}>{construction||"—"}</td><td style={{background:"#fff"}}>{core||"—"}</td><td style={{background:"#fff",fontWeight:700}}>{swl||"—"}</td></tr></tbody>
        </table>
        <div className="pro-stl">Condition Assessment</div>
        <table className="pro-st"><tbody>
          <tr><td>Corrosion</td><td>{corrosion}</td></tr>
          <tr><td>Broken wires</td><td>{brokenWires}</td></tr>
          <tr><td>Rope kinks / deforming</td><td>{kinks}</td></tr>
          <tr><td>Reduction in diameter (max 10%)</td><td>none</td></tr>
          <tr><td>Condition of end fittings / ferrule</td><td>{endFittings}</td></tr>
          <tr><td>Bird-caging / core protrusion</td><td>None</td></tr>
          <tr><td>Serviceability</td><td>Serviceable</td></tr>
          <tr><td>Overall assessment</td><td style={{fontWeight:800,color:tone.label==="PASS"?"#15803d":"#b91c1c"}}>{tone.label}</td></tr>
        </tbody></table>
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {comments&&<div className="pro-comments-box"><div className="pro-comments-lbl">Comments</div><div className="pro-comments-val">{comments}</div></div>}
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TELEHANDLER  (single page — last-page)
══════════════════════════════════════════════════════════ */
function TelehandlerPage({c,nd,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipMake=val(c.manufacturer||c.model)||"Telehandler";
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const defects=val(c.defects_found)||"";
  const recommendations=val(c.recommendations);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const tone=resultStyle(pickResult(c));
  const bm=nd.boom||{};
  const fks=(nd.forks||[]).filter(f=>f.length||f.swl);
  const cl=nd.checklist||{};
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Load Test Certificate — Telehandler</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry: {expiryDate}</div>}
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl">Boom Configuration &amp; Load Test</div>
        <table className="pro-lt">
          <thead><tr><th style={{textAlign:"left",width:140}}>Parameter</th><th>Min Boom</th><th>Max Boom</th><th>Actual / Test Config</th></tr></thead>
          <tbody>
            <tr><td>Boom Length (m)</td><td>{bm.min_boom_length||"—"}</td><td>{bm.max_boom_length||"—"}</td><td>{bm.actual_boom_length||"—"}</td></tr>
            <tr><td>Extended / Telescoped (m)</td><td>—</td><td>—</td><td>{bm.extended_boom_length||"—"}</td></tr>
            <tr><td>Working Radius (m)</td><td>{bm.min_radius||"—"}</td><td>{bm.max_radius||"—"}</td><td>{bm.load_tested_at_radius||"—"}</td></tr>
            <tr><td>SWL at Radius</td><td>{bm.swl_at_min_radius||"—"}</td><td>{bm.swl_at_max_radius||"—"}</td><td>{bm.swl_at_actual_config||swl||"—"}</td></tr>
            <tr><td>Boom Angle (°)</td><td>—</td><td>—</td><td>{bm.boom_angle||"—"}</td></tr>
            <tr className="pro-lt-bold"><td>Test Load Applied (110% SWL)</td><td></td><td></td><td>{bm.test_load||"—"}</td></tr>
          </tbody>
        </table>
        {bm.jib_fitted==="yes"&&<div style={{fontSize:8,fontWeight:700,color:"#0e7490",marginTop:2,marginBottom:2,padding:"2px 6px",background:"#eef4ff",border:"1px solid #c3d4e8",borderRadius:3,display:"inline-block"}}>Jib / Fork Attachment: FITTED</div>}
        <div className="pro-stl">Boom Systems Condition</div>
        <table className="pro-st"><tbody>
          <tr><td>Boom Structure</td><td>{r(bm.boom_structure||"PASS")}</td></tr>
          <tr><td>Boom Pins &amp; Connections</td><td>{r(bm.boom_pins||"PASS")}</td></tr>
          <tr><td>Boom Wear / Pads</td><td>{r(bm.boom_wear||"PASS")}</td></tr>
          <tr><td>Luffing / Extension System</td><td>{r(bm.luffing_system||"PASS")}</td></tr>
          <tr><td>LMI Tested at Configuration</td><td>{r(bm.lmi_test||"PASS")}</td></tr>
          <tr><td>Anti-Two-Block / Overload</td><td>{r(bm.anti_two_block||"PASS")}</td></tr>
        </tbody></table>
        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec">General Condition</div>
            <CI label="Structural Integrity" result={cl.structural_result||"PASS"}/>
            <CI label="Hydraulic System" result={cl.hydraulics_result||"PASS"}/>
            <CI label="Brake / Drive System" result={cl.brakes_result||"PASS"}/>
            <CI label="Tyres &amp; Wheels" result={cl.tyres_result||"PASS"}/>
            <CI label="Oil Leaks" result={detectFail(defects,"leak","oil")}/>
            <CI label="Lights &amp; Horn" result="PASS"/>
            <CI label="Fire Extinguisher" result={cl.fire_extinguisher||"PASS"}/>
            <CI label="Seat Belt" result="PASS"/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Safety &amp; Controls</div>
            <CI label="Load Management Indicator (LMI)" result={cl.lmi_result||"PASS"}/>
            <CI label="LMI SWL Correctly Indicated" result="PASS"/>
            <CI label="Emergency Stop Function" result="PASS"/>
            <CI label="Overload Protection" result="PASS"/>
            <CI label="Outrigger Interlocks (if fitted)" result="PASS"/>
            <CI label="Controls Marked Correctly" result="PASS"/>
            <CI label="Load Chart Available" result="PASS"/>
            <div className="pro-csec">Load Test Result</div>
            <CI label="Test Load Applied at Rated Config" result="PASS"/>
            <CI label="Machine Stable Under Load" result={cl.machine_stable_under_load||"PASS"}/>
            <CI label="No Structural Deformation" result="PASS"/>
          </div>
        </div>
        {fks.length>0&&(
          <>
            <div className="pro-stl">Fork Arms Inspected ({fks.length} arm{fks.length>1?"s":""})</div>
            <table className="fk-t">
              <thead><tr><th>Fork ID</th><th>SWL</th><th>Length (mm)</th><th>Heel (mm)</th><th>Blade (mm)</th><th>Wear %</th><th>Cracks</th><th>Bending</th><th>Result</th></tr></thead>
              <tbody>{fks.map((fk,i)=>(<tr key={i}><td>{fk.fork_number||`Fork ${i+1}`}</td><td>{fk.swl||"—"}</td><td>{fk.length||"—"}</td><td>{fk.thickness_heel||"—"}</td><td>{fk.thickness_blade||"—"}</td><td>{fk.wear_pct||"—"}</td><td style={{color:fk.cracks==="yes"?"#b91c1c":"#15803d",fontWeight:800}}>{fk.cracks==="yes"?"YES":"No"}</td><td style={{color:fk.bending==="yes"?"#b91c1c":"#15803d",fontWeight:800}}>{fk.bending==="yes"?"YES":"No"}</td><td>{r(fk.result)}</td></tr>))}</tbody>
            </table>
          </>
        )}
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {bm.notes&&<div className="pro-comments-box"><div className="pro-comments-lbl">Boom Notes</div><div className="pro-comments-val">{bm.notes}</div></div>}
        <ProEvidence photos={photos}/>
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS TELEHANDLER HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHERRY PICKER PAGE 1 — AWP Machine (no last-page)
══════════════════════════════════════════════════════════ */
function CherryPickerMachinePage({c,nd,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date)||addMonths(c.issue_date||c.issued_at,12);
  const equipMake=val(c.manufacturer||c.model)||"Cherry Picker / AWP";
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const defects=val(c.defects_found)||"";
  const recommendations=val(c.recommendations);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const tone=resultStyle(pickResult(c));
  const bm=nd.boom||{};
  const cl=nd.checklist||{};
  return(
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Load Test Certificate — Cherry Picker</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
              {expiryDate&&(<div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}><span style={{color:"#3b6ea5"}}>Expiry (12 months):</span> {expiryDate}</div>)}
              <div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",fontSize:8,fontWeight:700,color:"#6b7280",background:"#f9fafb"}}><span>Page 1 of 2</span><span style={{color:"#9ca3af"}}>·</span><span>AWP Machine Certificate</span></div>
            </div>
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl">Boom Specification &amp; Load Test</div>
        <table className="pro-lt">
          <thead><tr><th style={{textAlign:"left",width:140}}>Parameter</th><th>Min Boom</th><th>Max Boom</th><th>Actual / Test Config</th></tr></thead>
          <tbody>
            <tr><td>Max Working Height (m)</td><td>—</td><td>{bm.max_height||"—"}</td><td>{bm.max_height||"—"}</td></tr>
            <tr><td>Boom Length (m)</td><td>{bm.min_boom_length||"—"}</td><td>{bm.max_boom_length||"—"}</td><td>{bm.actual_boom_length||"—"}</td></tr>
            <tr><td>Extended / Telescoped (m)</td><td>—</td><td>—</td><td>{bm.extended_boom_length||"—"}</td></tr>
            <tr><td>Boom Angle (°)</td><td>—</td><td>—</td><td>{bm.boom_angle||"—"}</td></tr>
            <tr><td>Working Radius (m)</td><td>{bm.min_radius||"—"}</td><td>{bm.max_radius||"—"}</td><td>{bm.load_tested_at_radius||"—"}</td></tr>
            <tr><td>SWL at Radius</td><td>{bm.swl_at_min_radius||"—"}</td><td>{bm.swl_at_max_radius||"—"}</td><td style={{fontWeight:800}}>{bm.swl_at_actual_config||swl||"—"}</td></tr>
            <tr className="pro-lt-bold"><td>Test Load Applied (110% SWL)</td><td></td><td></td><td>{bm.test_load||"—"}</td></tr>
          </tbody>
        </table>
        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec">Boom Systems</div>
            <CI label="Boom Structure" result={bm.boom_structure||"PASS"}/>
            <CI label="Boom Pins &amp; Connections" result={bm.boom_pins||"PASS"}/>
            <CI label="Boom Wear / Pads" result={bm.boom_wear||"PASS"}/>
            <CI label="Luffing / Extension System" result={bm.luffing_system||"PASS"}/>
            <CI label="Slew / Rotation System" result={bm.slew_system||"PASS"}/>
            <CI label="Hoist / Lift System" result={bm.hoist_system||"PASS"}/>
            <CI label="LMI Tested at Config" result={bm.lmi_test||"PASS"}/>
            <CI label="Anti-Two Block / Overload" result={bm.anti_two_block||"PASS"}/>
            <div className="pro-csec">Hydraulics &amp; Drive</div>
            <CI label="Hydraulic System" result={cl.hydraulics_result||"PASS"}/>
            <CI label="Oil Leaks" result={detectFail(defects,"leak","oil")}/>
            <CI label="Structural Integrity" result={cl.structural_result||"PASS"}/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Safety Systems</div>
            <CI label="Safety Devices / Interlocks" result={cl.safety_devices||"PASS"}/>
            <CI label="Fire Extinguisher" result={cl.fire_extinguisher||"PASS"}/>
            <CI label="Emergency Stop" result={cl.emergency_stop||"PASS"}/>
            <CI label="Outrigger / Stabiliser Interlocks" result={cl.stabiliser_interlocks||"PASS"}/>
            <CI label="Machine Stable Under Load" result={cl.machine_stable_under_load||"PASS"}/>
            <CI label="No Structural Deformation Under Load" result={cl.no_structural_deformation_under_load||"PASS"}/>
            <CI label="All Functions Operate Under Load" result={cl.all_functions_operate_under_load||"PASS"}/>
            {defects&&defects.length>0&&(<><div className="pro-csec" style={{background:"#7f1d1d",color:"#fca5a5"}}>Defects</div><div style={{padding:"4px 8px",fontSize:7.5,color:"#b91c1c",fontWeight:700,lineHeight:1.45,background:"#fff5f5"}}>{defects}</div></>)}
          </div>
        </div>
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        {bm.notes&&<div className="pro-comments-box"><div className="pro-comments-lbl">Notes</div><div className="pro-comments-val">{bm.notes}</div></div>}
        {photos.length>0&&<ProEvidence photos={photos.slice(0,Math.ceil(photos.length/2))}/>}
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS CHERRY PICKER HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA. THIS CERTIFICATE IS VALID FOR 12 MONTHS FROM DATE OF ISSUE.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHERRY PICKER PAGE 2 — Bucket Inspection  (LAST PAGE → last-page)
══════════════════════════════════════════════════════════ */
function CherryPickerBucketPage({c,nd,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const bucketExpiry=addMonths(c.issue_date||c.issued_at,6);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const swl=val(c.swl);
  const tone=resultStyle(pickResult(c));
  const bm=nd.boom||{};
  const bk=nd.bucket||{};
  const cl=nd.checklist||{};
  const photos=parsePhotoEvidence(c.photo_evidence);
  const bucketCertNo=(certNumber?certNumber.replace(/(-BKT)?$/,"-BKT"):null)||"—";
  const bucketSerial=val(bk.serial_number||bk.bucket_serial)||(val(c.serial_number)?`${val(c.serial_number)}-BKT`:null)||"—";
  const bucketMake=val(bk.manufacturer||bk.make)||val(c.manufacturer)||"—";
  function bkResult(v){
    if(!v)return"—";
    const isPass=(v||"").toUpperCase()==="PASS";
    const isBad=/fail|repair|required/i.test(v||"");
    const color=isBad?"#b91c1c":isPass?"#15803d":"#b45309";
    const bg=isBad?"#fff5f5":isPass?"#f0fdf4":"#fffbeb";
    return<span style={{fontWeight:800,color,background:bg,padding:"1px 5px",borderRadius:3,fontSize:7.5}}>{v}</span>;
  }
  return(
    /* ── KEY FIX: last-page class stops the blank 3rd page ── */
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div className="bucket-accent"/>
      <div className="pro-body">
        <table className="pro-ct"><tbody>
          <tr><td>Customer</td><td>{company}</td><td>AWP Make / Type</td><td>{val(c.manufacturer||c.model)||"Cherry Picker / AWP"}</td></tr>
          <tr><td>Site location</td><td>{location}</td><td>AWP Serial No.</td><td>{val(c.serial_number)||"—"}</td></tr>
          <tr><td>Date</td><td>{issueDate||"—"}</td><td>Fleet No.</td><td>{val(c.fleet_number)||"—"}</td></tr>
          <tr><td>Platform SWL</td><td style={{fontWeight:700,color:"#0b1d3a"}}>{bk.platform_swl||swl||"—"}</td><td>AWP Cert Ref.</td><td style={{fontFamily:"monospace",fontSize:8}}>{certNumber||"—"}</td></tr>
        </tbody></table>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"2px solid #f97316",borderRadius:4,padding:"7px 10px",background:"#fff7ed"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Bucket Load Test Certificate</div>
            <div style={{fontSize:10,fontWeight:700,color:"#ea580c",marginTop:2}}>{bucketCertNo}</div>
            <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
              {bucketExpiry&&(<div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #f97316",borderRadius:3,padding:"2px 7px",fontSize:8,fontWeight:700,color:"#9a3412",background:"#fff"}}><span style={{color:"#ea580c"}}>Expiry (6 months):</span> {bucketExpiry}</div>)}
              <div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #fed7aa",borderRadius:3,padding:"2px 7px",fontSize:8,fontWeight:700,color:"#6b7280",background:"#fff7ed"}}><span>Page 2 of 2</span><span style={{color:"#9ca3af"}}>·</span><span>Platform / Bucket Certificate</span></div>
            </div>
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl" style={{borderLeftColor:"#f97316"}}>Platform / Bucket Identification</div>
        <table className="pro-st"><tbody>
          <tr><td style={{width:"55%"}}>Bucket Serial Number</td><td style={{fontFamily:"monospace",fontWeight:900,fontSize:10,color:"#0b1d3a"}}>{bucketSerial}</td></tr>
          <tr><td>Manufacturer / Make</td><td>{bucketMake}</td></tr>
          <tr><td>Platform Dimensions (m)</td><td>{bk.platform_dimensions||"—"}</td></tr>
          <tr><td>Platform Material</td><td>{bk.platform_material||"—"}</td></tr>
          <tr><td>Safe Working Load (SWL)</td><td style={{fontWeight:800,fontSize:10}}>{bk.platform_swl||swl||"—"}</td></tr>
          <tr><td>Test Load Applied (110% SWL)</td><td style={{fontWeight:800}}>{bk.test_load_applied||bm.test_load||"—"}</td></tr>
          <tr><td>Inspection Date</td><td>{issueDate||"—"}</td></tr>
          <tr><td>Next Inspection Due</td><td style={{fontWeight:800,color:"#b45309"}}>{bucketExpiry||"—"}</td></tr>
        </tbody></table>
        <div className="pro-stl" style={{borderLeftColor:"#f97316"}}>Platform / Bucket Structural Inspection</div>
        <table className="bk-t">
          <thead><tr><th>Inspection Item</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td>Platform Structure — welds &amp; frame integrity</td><td>{bkResult(bk.platform_structure||"PASS")}</td></tr>
            <tr><td>Platform Floor Condition</td><td>{bkResult(bk.platform_floor||"PASS")}</td></tr>
            <tr><td>Guardrails — height, welds &amp; security</td><td>{bkResult(bk.guardrails||"PASS")}</td></tr>
            <tr><td>Toe Boards — fitted &amp; condition</td><td>{bkResult(bk.toe_boards||"PASS")}</td></tr>
            <tr><td>Gate / Latch System</td><td>{bkResult(bk.gate_latch||"PASS")}</td></tr>
            <tr><td>Platform Mounting / Attachment to Boom</td><td>{bkResult(bk.platform_mounting||"PASS")}</td></tr>
            <tr><td>Rotation / Slew Mechanism (if fitted)</td><td>{bkResult(bk.rotation||"PASS")}</td></tr>
            <tr><td>Harness Anchor Points — quantity &amp; condition</td><td>{bkResult(bk.harness_anchors||"PASS")}</td></tr>
            <tr><td>SWL Marking legible on platform</td><td>{bkResult(bk.swl_marking||"PASS")}</td></tr>
            <tr><td>Paint / Coating condition</td><td>{bkResult(bk.paint_condition||"Satisfactory")}</td></tr>
          </tbody>
        </table>
        <div className="pro-stl" style={{borderLeftColor:"#f97316"}}>Safety Systems &amp; Controls in Platform</div>
        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec" style={{background:"#7c2d12",borderBottomColor:"#f97316"}}>Platform Safety Devices</div>
            <CI label="Platform Auto-Levelling" result={bk.levelling_system||"PASS"}/>
            <CI label="Emergency Lowering Device (ground)" result={bk.emergency_lowering||cl.emergency_lowering||"PASS"}/>
            <CI label="Emergency Stop (in platform)" result="PASS"/>
            <CI label="Overload / SWL Cut-Off Device" result={bk.overload_device||"PASS"}/>
            <CI label="Tilt / Inclination Alarm" result={bk.tilt_alarm||"PASS"}/>
            <CI label="Intercom / Communication (if fitted)" result={bk.intercom!=null?bk.intercom:"PASS"} na={!bk.intercom}/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec" style={{background:"#7c2d12",borderBottomColor:"#f97316"}}>Load Test Observations</div>
            <CI label="Platform stable under test load" result="PASS"/>
            <CI label="No deformation of frame / guardrails" result="PASS"/>
            <CI label="Gate remained secure under load" result="PASS"/>
            <CI label="Levelling maintained at max height" result={bk.levelling_system||"PASS"}/>
            <CI label="All platform controls functional" result="PASS"/>
            <CI label="Harness anchors held under load" result={bk.harness_anchors||"PASS"}/>
          </div>
        </div>
        {bk.notes&&<div className="pro-comments-box"><div className="pro-comments-lbl">Platform Notes</div><div className="pro-comments-val">{bk.notes}</div></div>}
        {photos.length>1&&<ProEvidence photos={photos.slice(Math.ceil(photos.length/2))}/>}
        <div style={{fontSize:7.5,color:"#9a3412",lineHeight:1.5,border:"1px solid #f97316",borderRadius:4,padding:"5px 9px",background:"#fff7ed",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS WORK PLATFORM / BUCKET CERTIFICATE IS VALID FOR 6 MONTHS FROM DATE OF ISSUE AND MUST BE RE-INSPECTED BEFORE EXPIRY. INSPECTION CARRIED OUT IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FORK ARM  (single page — last-page)
══════════════════════════════════════════════════════════ */
function ForkArmPage({c,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const serialNo=val(c.serial_number);
  const swl=val(c.swl);
  const defects=val(c.defects_found)||"";
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const tone=resultStyle(pickResult(c));
  const photos=parsePhotoEvidence(c.photo_evidence);
  const raw=val(c.notes)||"";
  const parts={};
  raw.split("|").forEach(p=>{const i=p.indexOf(":");if(i<0)return;parts[p.slice(0,i).trim()]=p.slice(i+1).trim();});
  const length=parts["L"]?.replace("mm","")||"";
  const heel=parts["Heel"]?.replace("mm","")||"";
  const blade=parts["Blade"]?.replace("mm","")||"";
  const wear=parts["Wear"]?.replace("%","")||"";
  const hasCracks=raw.includes("CRACKS");
  const hasBending=raw.includes("BENDING");
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={val(c.equipment_description)||"Fork Arm"} serialNo={serialNo} fleetNo={null} swl={swl}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Fork Arm Inspection Certificate</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry: {expiryDate}</div>}
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl">Fork Arm Details &amp; Dimensional Inspection</div>
        <table className="pro-st"><tbody>
          <tr><td>Fork Serial / Identification</td><td style={{fontFamily:"monospace",fontWeight:700}}>{serialNo||"—"}</td></tr>
          <tr><td>Safe Working Load (SWL)</td><td style={{fontWeight:800,fontSize:10}}>{swl||"—"}</td></tr>
          {length&&<tr><td>Fork Length (mm)</td><td>{length}</td></tr>}
          {heel&&<tr><td>Thickness at Heel (mm)</td><td>{heel}</td></tr>}
          {blade&&<tr><td>Thickness at Blade Tip (mm)</td><td>{blade}</td></tr>}
          {wear&&<tr><td>Wear Percentage vs Original</td><td style={{color:parseFloat(wear)>10?"#b91c1c":"#15803d",fontWeight:800}}>{wear}% {parseFloat(wear)>10?"— EXCEEDS 10% LIMIT":""}</td></tr>}
        </tbody></table>
        <div className="pro-stl">Defect Assessment</div>
        <table className="pro-st"><tbody>
          <tr><td>Cracks / Fractures Found</td><td style={{color:hasCracks?"#b91c1c":"#15803d",fontWeight:800}}>{hasCracks?"YES — DEFECT FOUND":"No cracks detected"}</td></tr>
          <tr><td>Bending / Deformation Found</td><td style={{color:hasBending?"#b91c1c":"#15803d",fontWeight:800}}>{hasBending?"YES — DEFECT FOUND":"No bending detected"}</td></tr>
          <tr><td>Fork Retention Pins / Hooks Secure</td><td style={{color:"#15803d",fontWeight:700}}>Yes</td></tr>
          <tr><td>Fork Angle (perpendicular to shank)</td><td>Within tolerance</td></tr>
          <tr><td>Surface Condition</td><td>Satisfactory</td></tr>
          <tr><td>Identification / Marking Legible</td><td>Yes</td></tr>
          <tr><td>Fork Rejected</td><td style={{color:tone.label!=="PASS"?"#b91c1c":"#15803d",fontWeight:800}}>{tone.label!=="PASS"?"YES — SEE DEFECTS":"No"}</td></tr>
        </tbody></table>
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          FORK ARMS INSPECTED IN ACCORDANCE WITH ISO 5057, EN 13157, AND THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA. FORK ARMS WITH WEAR EXCEEDING 10% OR WITH CRACKS / BENDING SHALL BE REMOVED FROM SERVICE IMMEDIATELY.
        </div>
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HORSE & TRAILER  (single page — last-page)
══════════════════════════════════════════════════════════ */
function HorseTrailerPage({c,pm,logo,isTrailer}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const defects=val(c.defects_found)||"";
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const tone=resultStyle(pickResult(c));
  const nd=parseNotes(val(c.notes)||"");
  const horse=nd.horse||{};
  const trailer=nd.trailer||{};
  const vd=isTrailer?trailer:horse;
  const vtitle=isTrailer?"Trailer":"Horse / Prime Mover";
  const regNo=val(c.registration_number)||vd.reg||"—";
  const make=val(c.manufacturer)||vd.make||"—";
  const model=val(c.model)||vd.model||"—";
  const vin=val(c.serial_number)||vd.vin||"—";
  const year=vd.year||"—";
  const fleet=val(c.fleet_number)||vd.fleet||"—";
  const gvm=val(c.swl)||(vd.gvm?`GVM ${vd.gvm}`:"")||"—";
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={`${make} ${model}`.trim()||vtitle} serialNo={vin} fleetNo={fleet} swl={gvm}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>{isTrailer?"Trailer":"Vehicle"} Registration Certificate</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry: {expiryDate}</div>}
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-stl">{vtitle} Registration Details</div>
        <table className="vr-t"><tbody>
          <tr><td>Registration Number</td><td style={{fontFamily:"monospace",fontWeight:900,fontSize:11,color:"#0b1d3a"}}>{regNo}</td></tr>
          <tr><td>Make / Manufacturer</td><td>{make}</td></tr>
          <tr><td>Model</td><td>{model}</td></tr>
          <tr><td>VIN / Chassis Number</td><td style={{fontFamily:"monospace"}}>{vin}</td></tr>
          <tr><td>Year of Manufacture</td><td>{year}</td></tr>
          <tr><td>Fleet Number</td><td>{fleet}</td></tr>
          <tr><td>Gross Vehicle Mass (GVM)</td><td style={{fontWeight:800}}>{vd.gvm||"—"}</td></tr>
        </tbody></table>
        {!isTrailer&&trailer&&trailer.reg&&(
          <>
            <div className="pro-stl">Trailer Details (Linked to this Horse)</div>
            <table className="vr-t"><tbody>
              <tr><td>Trailer Registration</td><td style={{fontFamily:"monospace",fontWeight:900,fontSize:11,color:"#0b1d3a"}}>{trailer.reg||"—"}</td></tr>
              <tr><td>Make / Manufacturer</td><td>{trailer.make||"—"}</td></tr>
              <tr><td>Model / Type</td><td>{trailer.model||"—"}</td></tr>
              <tr><td>VIN / Chassis Number</td><td style={{fontFamily:"monospace"}}>{trailer.vin||"—"}</td></tr>
              <tr><td>Year of Manufacture</td><td>{trailer.year||"—"}</td></tr>
              <tr><td>Gross Vehicle Mass (GVM)</td><td style={{fontWeight:800}}>{trailer.gvm||"—"}</td></tr>
              <tr><td>Trailer Result</td><td>{r(trailer.result||"PASS")}</td></tr>
            </tbody></table>
          </>
        )}
        <div className="pro-stl">Inspection Results</div>
        <table className="pro-st"><tbody>
          <tr><td>Vehicle condition — external visual</td><td>Satisfactory</td></tr>
          <tr><td>Structural integrity</td><td>Satisfactory</td></tr>
          <tr><td>Braking system</td><td>Operational</td></tr>
          <tr><td>Lights, indicators and reflectors</td><td>Fitted and functional</td></tr>
          <tr><td>Tyres condition</td><td>Serviceable</td></tr>
          {!isTrailer&&<tr><td>Fifth wheel coupling</td><td>Serviceable</td></tr>}
          {isTrailer&&<tr><td>Coupling / King Pin</td><td>Serviceable</td></tr>}
          <tr><td>Registration plates legible</td><td>Yes</td></tr>
          <tr><td>Overall assessment</td><td style={{fontWeight:800,color:tone.label==="PASS"?"#15803d":"#b91c1c"}}>{tone.label}</td></tr>
        </tbody></table>
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found / Notes</div><div className="pro-red-val">{defects}</div></div>}
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS VEHICLE HAS BEEN INSPECTED IN ACCORDANCE WITH THE ROAD TRAFFIC ACT AND MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.
        </div>
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GENERIC MACHINE (Forklift / TLB / etc)  (single page — last-page)
══════════════════════════════════════════════════════════ */
function MachinePage({c,nd,pm,logo}){
  const certNumber=val(c.certificate_number);
  const company=val(c.client_name||c.company)||"—";
  const location=val(c.location)||"—";
  const issueDate=formatDate(c.issue_date||c.issued_at);
  const expiryDate=formatDate(c.expiry_date);
  const equipType=val(c.equipment_type)||"Machine";
  const equipMake=val(c.manufacturer||c.model)||equipType;
  const serialNo=val(c.serial_number);
  const fleetNo=val(c.fleet_number);
  const swl=val(c.swl);
  const defects=val(c.defects_found)||"";
  const recommendations=val(c.recommendations);
  const inspName=val(c.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id)||"700117910";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const tone=resultStyle(pickResult(c));
  const cl=nd.checklist||{};
  const fks=(nd.forks||[]).filter(f=>f.length||f.swl);
  const isForklift=/forklift|fork.lift/i.test(equipType);
  const oilLeaks=detectFail(defects,"leak","oil");
  const tires=detectFail(defects,"tire","tyre");
  const brakes=detectFail(defects,"brake");
  return(
    <div className={`pro-page last-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>
        <div className="pro-mhdr">
          <div>
            {expiryDate&&<div style={{fontSize:9,fontWeight:800,color:"#0b1d3a",marginBottom:2}}>Validity: {expiryDate}</div>}
            <div className="pro-mt">{equipType} Inspection — {certNumber}</div>
            <div className="pro-ms">Inspected with regards to the MQWMR Act CAP 44:02 Under Regulations 2</div>
          </div>
          <PFBadge result={tone.label}/>
        </div>
        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec">General &amp; Cab Condition</div>
            <CI label="Structural Integrity" result={cl.structural_result||"PASS"}/>
            <CI label="Hydraulic System" result={cl.hydraulics_result||"PASS"}/>
            <CI label="Brake System" result={cl.brakes_result||brakes||"PASS"}/>
            <CI label="Tyres / Wheels" result={cl.tyres_result||tires||"PASS"}/>
            <CI label="Oil Leaks (General)" result={oilLeaks}/>
            <CI label="Lights &amp; Horn" result="PASS"/>
            <CI label="Fire Extinguisher" result={cl.fire_extinguisher||"PASS"}/>
            <CI label="Seat Belt" result="PASS"/>
            <CI label="Controls Marked Correctly" result="PASS"/>
            <CI label="Load Chart Available" result="PASS"/>
            {isForklift&&<><div className="pro-csec">Forks &amp; Mast</div>
              <CI label="Mast / Structural Integrity" result={cl.structural_result||"PASS"}/>
              <CI label="Fork Condition" result={cl.forks_result||detectFail(defects,"fork","tine")}/>
              <CI label="Fork Retention Pins" result="PASS"/>
              <CI label="Mast Chain Lubrication" result="PASS"/>
              <CI label="Tilt Cylinders — No Leaks" result={oilLeaks}/></>}
            {!isForklift&&<><div className="pro-csec">Additional Systems</div>
              <CI label="Safety Result" result={cl.safety_result||"PASS"}/>
              <CI label="Operational Check" result={cl.operational_result||"PASS"}/></>}
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Safety Systems</div>
            <CI label="Load Indicator / SWL Plate" result={cl.lmi_result||"PASS"}/>
            <CI label="Emergency Stop" result={cl.emergency_stop||"PASS"}/>
            <CI label="Overload Protection" result="PASS"/>
            <div className="pro-csec">Hydraulics &amp; Drive</div>
            <CI label="Hydraulic Oil Level" result="PASS"/>
            <CI label="Hydraulic Hoses &amp; Fittings" result={oilLeaks}/>
            <CI label="Drive Transmission" result="PASS"/>
            <CI label="Steering System" result="PASS"/>
            <CI label="Engine / Motor Condition" result="PASS"/>
            <div className="pro-csec">Load Test</div>
            <CI label="Test Load Applied at Rated Capacity" result="PASS"/>
            <CI label="Lifting / Lowering Smooth" result="PASS"/>
            <CI label="No Deformation Under Load" result="PASS"/>
            <CI label="All Functions Operate Under Load" result={cl.all_functions_operate_under_load||"PASS"}/>
          </div>
        </div>
        {isForklift&&fks.length>0&&(
          <>
            <div className="pro-stl">Fork Arms Inspected ({fks.length} arm{fks.length>1?"s":""})</div>
            <table className="fk-t">
              <thead><tr><th>Fork ID</th><th>SWL</th><th>Length (mm)</th><th>Heel (mm)</th><th>Blade (mm)</th><th>Wear %</th><th>Cracks</th><th>Bending</th><th>Result</th></tr></thead>
              <tbody>{fks.map((fk,i)=>(<tr key={i}><td>{fk.fork_number||`Fork ${i+1}`}</td><td>{fk.swl||"—"}</td><td>{fk.length||"—"}</td><td>{fk.thickness_heel||"—"}</td><td>{fk.thickness_blade||"—"}</td><td>{fk.wear_pct||"—"}</td><td style={{color:fk.cracks==="yes"?"#b91c1c":"#15803d",fontWeight:800}}>{fk.cracks==="yes"?"YES":"No"}</td><td style={{color:fk.bending==="yes"?"#b91c1c":"#15803d",fontWeight:800}}>{fk.bending==="yes"?"YES":"No"}</td><td>{r(fk.result)}</td></tr>))}</tbody>
            </table>
          </>
        )}
        {defects&&<div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        {recommendations&&<div className="pro-red-box"><div className="pro-red-lbl">Recommendations</div><div className="pro-red-val">{recommendations}</div></div>}
        <ProEvidence photos={photos}/>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GENERIC CERTIFICATE (fallback — last-page)
══════════════════════════════════════════════════════════ */
function GenericCert({c,pm,logo}){
  const ex=c.extracted_data||{};
  const equipType=val(c.equipment_type||c.asset_type||ex.equipment_type);
  const _rawType=String(equipType||"").toLowerCase();
  const _isLifting=/lift|hoist|crane|sling|chain|shackle|hook|swivel|beam|spreader|harness|lanyard|rope|rigging|winch|pulley|block|tackle/i.test(_rawType);
  const _isPressure=/pressure|vessel|boiler|autoclave|receiver|accumulator|compressor|hydraulic|tank|cylinder|drum|pipeline/i.test(_rawType);
  const certType=val(c.certificate_type||ex.certificate_type)||(_isLifting?"Load Test Certificate":_isPressure?"Pressure Test Certificate":"Certificate of Inspection");
  const certNumber=val(c.certificate_number);
  const issueDate=formatDate(c.issue_date||c.issued_at||ex.issue_date);
  const expiryDate=formatDate(c.expiry_date||c.valid_to||ex.expiry_date);
  const company=val(c.company||c.client_name||ex.client_name)||"Monroy (Pty) Ltd";
  const location=val(c.equipment_location||c.location||ex.equipment_location);
  const equipDesc=val(c.equipment_description||c.asset_name||ex.equipment_description);
  const serialNo=val(c.serial_number||ex.serial_number);
  const fleetNo=val(c.fleet_number||ex.fleet_number);
  const mfg=val(c.manufacturer||ex.manufacturer);
  const model=val(c.model||ex.model);
  const swl=val(c.swl||ex.swl||c.safe_working_load);
  const mawp=val(c.mawp||ex.mawp||c.working_pressure);
  const capacity=val(c.capacity||ex.capacity||c.capacity_volume);
  const testP=val(c.test_pressure||ex.test_pressure);
  const inspName=val(c.inspector_name||ex.inspector_name)||"Moemedi Masupe";
  const inspId=val(c.inspector_id||ex.inspector_id)||"700117910";
  const defects=val(c.defects_found||ex.defects_found);
  const recommendations=val(c.recommendations||ex.recommendations);
  const comments=val(c.comments||ex.comments||c.remarks||ex.remarks);
  const pressureUnit=val(c.pressure_unit||ex.pressure_unit)||"bar";
  const photos=parsePhotoEvidence(c.photo_evidence);
  const tone=resultStyle(pickResult(c));
  return(
    <>
      <style>{CSS}</style>
      <div className={pm?"":"cs-wrap"}>
        <div className={`cs-page last-page${pm?" pm":""}`}>
          <div className="cs-hdr">
            <svg className="cs-geo" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice">
              <circle cx="520" cy="-10" r="100" fill="rgba(34,211,238,0.06)"/>
              <circle cx="480" cy="70"  r="60"  fill="rgba(59,130,246,0.05)"/>
              <circle cx="30"  cy="120" r="70"  fill="rgba(167,139,250,0.04)"/>
            </svg>
            <div className="cs-hdr-inner">
              <div className="cs-logo-box"><img src={logo||"/logo.png"} alt="Monroy" onError={e=>e.target.style.display="none"}/></div>
              <div className="cs-hdr-text">
                <div className="cs-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
                <div className="cs-title">{certType}</div>
                <div className="cs-sub">{company} · {location||"Botswana"}{fleetNo?` · ${fleetNo}`:""}</div>
              </div>
              <div className="cs-hdr-right">
                <span className="cs-badge" style={{background:tone.bg,color:tone.color,border:`1px solid ${tone.brd}`}}>{tone.label}</span>
                {certNumber&&<div className="cs-certno">{certNumber}</div>}
              </div>
            </div>
          </div>
          <div className="cs-accent"/>
          <div className="cs-body">
            <Section title="Certificate Details">
              <Field label="Certificate Number" value={certNumber} mono large/>
              <Field label="Issue Date" value={issueDate}/>
              <Field label="Expiry / Next Inspection" value={expiryDate}/>
            </Section>
            <Section title="Client &amp; Location">
              <Field label="Client / Company" value={company}/>
              <Field label="Location" value={location}/>
              <Field label="Certificate Type" value={certType}/>
            </Section>
            <Section title="Equipment">
              <Field label="Description" value={equipDesc}/>
              <Field label="Type" value={equipType}/>
              <Field label="Serial Number" value={serialNo} mono/>
              {mfg&&<Field label="Manufacturer" value={mfg}/>}
              {model&&<Field label="Model" value={model}/>}
            </Section>
            <Section title="Technical Data">
              {swl&&<Field label="Safe Working Load (SWL)" value={swl}/>}
              {mawp&&<Field label="Working Pressure" value={`${mawp} ${pressureUnit}`}/>}
              {capacity&&<Field label="Capacity / Volume" value={capacity}/>}
              {testP&&<Field label="Test Pressure" value={`${testP} ${pressureUnit}`}/>}
            </Section>
            <div className="cs-sec">
              <div className="cs-sec-ttl">Legal Compliance</div>
              <div className="cs-fields">
                <div className="cs-field" style={{gridColumn:"1/-1",background:"#f4f8ff"}}>
                  <div className="cs-fv" style={{fontSize:8,color:"#4b5563",lineHeight:1.4,fontWeight:400}}>
                    This inspection has been performed by a <strong>competent person</strong> as defined under the <strong>Mines, Quarries, Works and Machinery Act Cap 44:02</strong> of the Laws of Botswana.
                  </div>
                </div>
              </div>
            </div>
            {(defects||recommendations)&&(
              <Section title="Defects &amp; Recommendations">
                {defects&&<Field label="Defects Found" value={defects} full red/>}
                {recommendations&&<Field label="Recommendations" value={recommendations} full red/>}
              </Section>
            )}
            {comments&&<div className="cs-sec"><div className="cs-sec-ttl">Comments</div><div className="cs-remarks">{comments}</div></div>}
            {photos.length>0&&(
              <div className="cs-sec">
                <div className="cs-sec-ttl">Photo Evidence ({photos.length})</div>
                <div className="cs-evidence"><div className="cs-evidence-grid">
                  {photos.map((p,i)=>(<div className="cs-evidence-item" key={i}><img className="cs-evidence-img" src={p.dataURL} alt={p.caption||`Photo ${i+1}`} onError={e=>e.target.style.display="none"}/>{p.caption&&<div className="cs-evidence-cap">{p.caption}</div>}</div>))}
                </div></div>
              </div>
            )}
          </div>
          <div className="cs-sig-wrap">
            <div className="cs-sig-card">
              <div className="cs-sig-card-title">Signatures &amp; Authorisation</div>
              <div className="cs-sig-grid">
                <div>
                  <div className="cs-sig-label">Inspector Signature</div>
                  <div className="cs-sig-img-wrap"><img src="/Signature" alt="sig" style={{maxHeight:32,maxWidth:96,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/></div>
                  <div className="cs-sig-name">{inspName}</div>
                  <div className="cs-sig-role">Inspector ID: {inspId}</div>
                </div>
                <div>
                  <div className="cs-sig-label">Client / Witness Signature</div>
                  <div className="cs-sig-img-wrap"/>
                  <div className="cs-sig-role">Client representative sign here</div>
                </div>
              </div>
            </div>
          </div>
          <div className="cs-services"><p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p></div>
          <div className="cs-footer"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function CertificateSheet({certificate:c,index=0,total=1,printMode=false}){
  if(!c)return null;
  const equipType=val(c.equipment_type||c.asset_type)||"";
  const _rawType=String(equipType).toLowerCase();
  const logo=c.logo_url||"/logo.png";
  const pm=printMode;
  const pn=parseNotes(val(c.notes||"")||"");
  const nd=getInspectionData(c);
  const tone=resultStyle(pickResult(c));

  const _isMobileCrane=/mobile.crane|crane/i.test(_rawType)&&!/hook|rope|boom|cherry|telehandler|forklift/i.test(_rawType);
  const _isHook=/hook/i.test(_rawType);
  const _isCraneRope=_rawType==="wire rope";
  const _isWireRopeSling=_rawType==="wire rope sling";
  const _isPV=/pressure.vessel|air.receiver|boiler|autoclave/i.test(_rawType);
  const _isTelehandler=/telehandler/i.test(_rawType);
  const _isCherryPicker=/cherry.picker|aerial.work.platform|boom.lift/i.test(_rawType);
  const _isForklift=/forklift|fork.lift/i.test(_rawType);
  const _isForkArm=/fork.arm/i.test(_rawType);
  const _isHorse=/horse.*mover|prime.mover/i.test(_rawType);
  const _isTrailer=/^trailer$/i.test(_rawType.trim());
  const _isMachine=_isTelehandler||_isForklift;

  const wrap=(children)=>(
    <>
      <style>{CSS}</style>
      <div className={pm?"":"pro-wrap"}>{children}</div>
    </>
  );

  if(_isMobileCrane) return wrap(
    <>
      <CraneLoadTestPage c={c} pn={pn} tone={tone} pm={pm} logo={logo}/>
      <div className="pro-pb"/>
      <CraneChecklistPage c={c} pn={pn} pm={pm} logo={logo}/>
    </>
  );
  if(_isHook||_isCraneRope) return wrap(<HookRopePage c={c} pn={pn} tone={tone} pm={pm} logo={logo} isRope={_isCraneRope&&!_isHook}/>);
  if(_isWireRopeSling) return wrap(<WireRopeSlingPage c={c} pn={pn} tone={tone} pm={pm} logo={logo}/>);
  if(_isPV) return wrap(<PressureVesselPage c={c} pn={pn} tone={tone} pm={pm} logo={logo} pvNum={index+1}/>);
  if(_isTelehandler) return wrap(<TelehandlerPage c={c} nd={nd} pm={pm} logo={logo}/>);

  if(_isCherryPicker) return wrap(
    <>
      <CherryPickerMachinePage c={c} nd={nd} pm={pm} logo={logo}/>
      <div className="pro-pb"/>
      <CherryPickerBucketPage c={c} nd={nd} pm={pm} logo={logo}/>
    </>
  );

  if(_isForkArm) return wrap(<ForkArmPage c={c} pm={pm} logo={logo}/>);
  if(_isHorse) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={false}/>);
  if(_isTrailer) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={true}/>);
  if(_isMachine) return wrap(<MachinePage c={c} nd={nd} pm={pm} logo={logo}/>);
  return <GenericCert c={c} pm={pm} logo={logo}/>;
}
