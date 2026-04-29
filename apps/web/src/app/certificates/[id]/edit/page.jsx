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
  orange:"#fb923c",orangeDim:"rgba(251,146,60,0.10)",orangeBrd:"rgba(251,146,60,0.25)",
};

const IS = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:44, boxSizing:"border-box" };
const LS = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, marginBottom:6 };

function normalizeId(v){ return Array.isArray(v) ? v[0] : v; }
function toDate(v){ if(!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); }

/* ─────────────────────────────────────────────────────────────
   EQUIPMENT TYPE DETECTORS
───────────────────────────────────────────────────────────── */
function isCherryPicker(t)    { return /cherry.picker|aerial.work.platform|boom.lift|awp/i.test(t || ""); }
function isWireRopeSling(t)   { return /wire.rope.sling|wire rope sling/i.test(t || ""); }
function isSandblastingPot(t) { return /sandblast|blasting.pot|blast.pot|sbp|sand.blast/i.test(t || ""); }

/* ─────────────────────────────────────────────────────────────
   INSPECTION DATA HELPERS
───────────────────────────────────────────────────────────── */
function formatFieldLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getSectionLabel(key) {
  const map = {
    checklist:"Checklist", boom:"Boom Configuration",
    bucket:"Bucket / Platform", forks:"Fork Arms",
    horse:"Horse / Prime Mover", trailer:"Trailer",
    sling_details:"Sling Details", condition_assessment:"Condition Assessment",
    sandblasting:"Sandblasting Pot",
  };
  return map[key] || formatFieldLabel(key);
}

function valueColor(v) {
  const s = String(v || "").toUpperCase();
  if (s === "PASS" || s === "YES" || s === "SERVICEABLE" || s === "SATISFACTORY") return T.green;
  if (s === "FAIL" || s === "NO" || s === "DEFECTIVE" || s === "OUT_OF_SERVICE") return T.red;
  if (s === "REPAIR_REQUIRED" || s === "CONDITIONAL" || s === "WARNING") return T.amber;
  return T.text;
}

function normalizeSectionPathKey(section) {
  const raw = String(section || "").trim().toLowerCase();
  if (!raw || raw === "general") return "general";
  const aliasMap = {
    checklist:"checklist","boom configuration":"boom",boom:"boom",
    "bucket / platform":"bucket","bucket/platform":"bucket",bucket:"bucket",platform:"bucket",
    "fork arms":"forks",forks:"forks","fork arm":"forks",fork:"forks",
    horse:"horse","horse / prime mover":"horse","prime mover":"horse",trailer:"trailer",
    "sling details":"sling_details",sling_details:"sling_details",
    "condition assessment":"condition_assessment",condition_assessment:"condition_assessment",
    sandblasting:"sandblasting","blasting pot":"sandblasting","sbp":"sandblasting",
  };
  return aliasMap[raw] || raw.replace(/\s+/g,"_");
}

function normalizeFieldToken(key) {
  return String(key || "").trim().toLowerCase().replace(/[()]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}

function canonicalizeFieldKey(sectionKey, key) {
  const section = normalizeSectionPathKey(sectionKey);
  const token = normalizeFieldToken(key);
  if (!token) return key;
  const bySection = {
    boom:{
      max_working_height:"max_height",max_working_height_m:"max_height",working_height:"max_height",working_height_m:"max_height",height:"max_height",
      boom_length_min:"min_boom_length",min_boom:"min_boom_length",min_length:"min_boom_length",minimum_boom_length:"min_boom_length",
      boom_length_max:"max_boom_length",max_boom:"max_boom_length",max_length:"max_boom_length",maximum_boom_length:"max_boom_length",
      boom_length_actual:"actual_boom_length",actual_boom:"actual_boom_length",actual_length:"actual_boom_length",actual_test_config:"actual_boom_length",
      extended_telescoped:"extended_boom_length",telescoped:"extended_boom_length",extended:"extended_boom_length",telescoped_length:"extended_boom_length",
      angle:"boom_angle",boom_angle_deg:"boom_angle",radius_min:"min_radius",minimum_radius:"min_radius",
      radius_max:"max_radius",maximum_radius:"max_radius",actual_radius:"load_tested_at_radius",test_radius:"load_tested_at_radius",
      working_radius_tested:"load_tested_at_radius",actual_working_radius:"load_tested_at_radius",
      swl_min_radius:"swl_at_min_radius",min_radius_swl:"swl_at_min_radius",swl_max_radius:"swl_at_max_radius",max_radius_swl:"swl_at_max_radius",
      swl_actual:"swl_at_actual_config",actual_swl:"swl_at_actual_config",actual_config_swl:"swl_at_actual_config",swl_at_radius:"swl_at_actual_config",
      load_test:"test_load",test_load_applied:"test_load",load_test_applied:"test_load",proof_load:"test_load",
      structure:"boom_structure",boom_condition:"boom_structure",pins_connections:"boom_pins",pins:"boom_pins",
      wear_pads:"boom_wear",pads:"boom_wear",extension_system:"luffing_system",luffing:"luffing_system",
      rotation_system:"slew_system",slew_rotation:"slew_system",hoist_lift:"hoist_system",lift_system:"hoist_system",
      lmi_tested:"lmi_test",lmi_tested_at_config:"lmi_test",anti_two_block_overload:"anti_two_block",overload_system:"anti_two_block",
      comments:"notes",remarks:"notes",
    },
    bucket:{
      bucket_serial:"serial_number",serial_no:"serial_number",make:"manufacturer",
      swl:"platform_swl",bucket_swl:"platform_swl",swl_platform:"platform_swl",
      load_test:"test_load_applied",test_load:"test_load_applied",proof_load:"test_load_applied",
      structure:"platform_structure",floor_condition:"platform_floor",toe_board:"toe_boards",
      gate_latch_system:"gate_latch",gate:"gate_latch",mounting:"platform_mounting",attachment_to_boom:"platform_mounting",
      slew:"rotation",anchor_points:"harness_anchors",swl_marking_legible:"swl_marking",
      coating_condition:"paint_condition",auto_levelling:"levelling_system",
      emergency_lowering_device:"emergency_lowering",emergency_stop_platform:"emergency_stop",
      overload_swl_cut_off_device:"overload_device",inclination_alarm:"tilt_alarm",communication:"intercom",
    },
    checklist:{
      structural_integrity:"structural_result",structure:"structural_result",hydraulic_system:"hydraulics_result",hydraulics:"hydraulics_result",
      brakes:"brakes_result",brake_drive_system:"brakes_result",tyres_wheels:"tyres_result",tires_wheels:"tyres_result",
      lights_alarms:"lights_result",safety_systems:"safety_devices",safety_devices_interlocks:"safety_devices",
      fire_extinguisher_condition:"fire_extinguisher",outrigger_interlocks:"stabiliser_interlocks",
      machine_stable:"machine_stable_under_load",no_deformation_under_load:"no_structural_deformation_under_load",
      functions_operate_under_load:"all_functions_operate_under_load",
    },
  };
  return bySection[section]?.[token] || token;
}

function flattenNotesJson(raw) {
  const rows = [];
  let parsed = {};
  try { parsed = JSON.parse(raw || "{}"); if (typeof parsed !== "object" || Array.isArray(parsed)) parsed = {}; }
  catch(e) { parsed = {}; }
  let rowId = 0;
  function addRow(section, key, value, path) {
    const sectionKey = normalizeSectionPathKey(section);
    const resolvedKey = sectionKey === "general" ? normalizeFieldToken(key) : canonicalizeFieldKey(sectionKey, key);
    rows.push({ id:rowId++, section, key:resolvedKey||key, label:formatFieldLabel(resolvedKey||key), value:value==null?"":String(value), path });
  }
  Object.entries(parsed).forEach(([topKey, topVal]) => {
    if (topVal === null || topVal === undefined) { addRow("General",topKey,"",[topKey]); return; }
    if (Array.isArray(topVal)) {
      topVal.forEach((item,idx) => {
        if (typeof item==="object"&&item!==null) {
          const secLabel = `${getSectionLabel(topKey)} #${idx+1}`;
          Object.entries(item).forEach(([k,v]) => { if (typeof v !== "object") addRow(secLabel,k,v,[topKey,idx,k]); });
        } else { addRow(getSectionLabel(topKey),`Item ${idx+1}`,item,[topKey,idx]); }
      });
    } else if (typeof topVal === "object") {
      const secLabel = getSectionLabel(topKey);
      Object.entries(topVal).forEach(([k,v]) => {
        if (v!==null&&typeof v==="object"&&!Array.isArray(v)) {
          const subSec = `${secLabel} › ${formatFieldLabel(k)}`;
          Object.entries(v).forEach(([k2,v2]) => { if (typeof v2 !== "object") addRow(subSec,k2,v2,[topKey,k,k2]); });
        } else if (Array.isArray(v)) { addRow(secLabel,k,JSON.stringify(v),[topKey,k]); }
        else { addRow(secLabel,k,v,[topKey,k]); }
      });
    } else { addRow("General",topKey,topVal,[topKey]); }
  });
  return rows;
}

function rebuildNotesJson(rows) {
  const out = {};
  rows.forEach(({ path, value }) => {
    if (!path||path.length===0) return;
    let v = value;
    if (v==="true") v=true;
    else if (v==="false") v=false;
    else if (v!==""&&v!==null&&String(v).trim()!==""&&!isNaN(Number(v))) v=Number(v);
    if (path.length===1) { out[path[0]]=v; }
    else if (path.length===2) {
      const sk=normalizeSectionPathKey(path[0]); const fk=canonicalizeFieldKey(sk,path[1]);
      if (!out[sk]||typeof out[sk]!=="object") out[sk]={};
      out[sk][fk]=v;
    } else if (path.length===3) {
      if (typeof path[1]==="number") {
        const ak=normalizeSectionPathKey(path[0]); const fk=canonicalizeFieldKey(ak,path[2]);
        if (!Array.isArray(out[ak])) out[ak]=[];
        if (!out[ak][path[1]]) out[ak][path[1]]={};
        out[ak][path[1]][fk]=v;
      } else {
        const sk=normalizeSectionPathKey(path[0]); const subKey=normalizeFieldToken(path[1]); const fk=canonicalizeFieldKey(sk,path[2]);
        if (!out[sk]) out[sk]={}; if (!out[sk][subKey]||typeof out[sk][subKey]!=="object") out[sk][subKey]={};
        out[sk][subKey][fk]=v;
      }
    }
  });
  return JSON.stringify(out);
}

/* ── Cherry Picker helpers ── */
function buildCherryPickerNotes(cp) {
  const boom={},bucket={},checklist={};
  ["max_height","min_boom_length","max_boom_length","actual_boom_length","extended_boom_length","boom_angle","min_radius","max_radius","load_tested_at_radius","swl_at_min_radius","swl_at_max_radius","swl_at_actual_config","test_load","boom_structure","boom_pins","boom_wear","luffing_system","slew_system","hoist_system","lmi_test","anti_two_block"].forEach(k => { if (cp[k]) boom[k]=cp[k]; });
  if (cp.boom_notes) boom.notes=cp.boom_notes;
  const bucketMap={platform_swl:"platform_swl",bucket_serial:"serial_number",bucket_make:"manufacturer",platform_dimensions:"platform_dimensions",platform_material:"platform_material",test_load_applied:"test_load_applied",platform_structure:"platform_structure",platform_floor:"platform_floor",guardrails:"guardrails",toe_boards:"toe_boards",gate_latch:"gate_latch",platform_mounting:"platform_mounting",rotation:"rotation",harness_anchors:"harness_anchors",swl_marking:"swl_marking",paint_condition:"paint_condition",levelling_system:"levelling_system",emergency_lowering:"emergency_lowering",emergency_stop:"emergency_stop",overload_device:"overload_device",tilt_alarm:"tilt_alarm",intercom:"intercom"};
  Object.entries(bucketMap).forEach(([cpk,bk]) => { if (cp[cpk]) bucket[bk]=cp[cpk]; });
  if (cp.bucket_notes) bucket.notes=cp.bucket_notes;
  const clMap={structural_result:"structural_result",hydraulics_result:"hydraulics_result",safety_devices:"safety_devices",fire_extinguisher:"fire_extinguisher",cl_emergency_stop:"emergency_stop",stabiliser_interlocks:"stabiliser_interlocks",machine_stable_under_load:"machine_stable_under_load",no_structural_deformation_under_load:"no_structural_deformation_under_load",all_functions_operate_under_load:"all_functions_operate_under_load"};
  Object.entries(clMap).forEach(([cpk,ck]) => { if (cp[cpk]) checklist[ck]=cp[cpk]; });
  const out={};
  if (Object.keys(boom).length) out.boom=boom;
  if (Object.keys(bucket).length) out.bucket=bucket;
  if (Object.keys(checklist).length) out.checklist=checklist;
  return JSON.stringify(out);
}

function parseCherryPickerNotes(notesStr) {
  const def={max_height:"",min_boom_length:"",max_boom_length:"",actual_boom_length:"",extended_boom_length:"",boom_angle:"",min_radius:"",max_radius:"",load_tested_at_radius:"",swl_at_min_radius:"",swl_at_max_radius:"",swl_at_actual_config:"",test_load:"",boom_structure:"PASS",boom_pins:"PASS",boom_wear:"PASS",luffing_system:"PASS",slew_system:"PASS",hoist_system:"PASS",lmi_test:"PASS",anti_two_block:"PASS",boom_notes:"",platform_swl:"",bucket_serial:"",bucket_make:"",platform_dimensions:"",platform_material:"",test_load_applied:"",platform_structure:"PASS",platform_floor:"PASS",guardrails:"PASS",toe_boards:"PASS",gate_latch:"PASS",platform_mounting:"PASS",rotation:"PASS",harness_anchors:"PASS",swl_marking:"PASS",paint_condition:"Satisfactory",levelling_system:"PASS",emergency_lowering:"PASS",emergency_stop:"PASS",overload_device:"PASS",tilt_alarm:"PASS",intercom:"PASS",bucket_notes:"",structural_result:"PASS",hydraulics_result:"PASS",safety_devices:"PASS",fire_extinguisher:"PASS",cl_emergency_stop:"PASS",stabiliser_interlocks:"PASS",machine_stable_under_load:"PASS",no_structural_deformation_under_load:"PASS",all_functions_operate_under_load:"PASS"};
  if (!notesStr) return def;
  let parsed={};
  try { parsed=JSON.parse(notesStr); } catch(e) { return def; }
  const bm=parsed.boom||{},bk=parsed.bucket||{},cl=parsed.checklist||{};
  const g=(obj,...keys)=>{ for (const k of keys) { if (obj[k]!==undefined&&obj[k]!==null&&String(obj[k]).trim()!=="") return String(obj[k]); } return ""; };
  return {
    max_height:g(bm,"max_height","max_working_height","working_height","height"),min_boom_length:g(bm,"min_boom_length","boom_length_min","min_boom"),max_boom_length:g(bm,"max_boom_length","boom_length_max","max_boom","boom_length"),actual_boom_length:g(bm,"actual_boom_length","boom_length_actual","actual_boom"),extended_boom_length:g(bm,"extended_boom_length","extended","telescoped"),boom_angle:g(bm,"boom_angle","angle"),min_radius:g(bm,"min_radius","radius_min"),max_radius:g(bm,"max_radius","radius_max","working_radius"),load_tested_at_radius:g(bm,"load_tested_at_radius","actual_radius","test_radius"),swl_at_min_radius:g(bm,"swl_at_min_radius","swl_min_radius"),swl_at_max_radius:g(bm,"swl_at_max_radius","swl_max_radius"),swl_at_actual_config:g(bm,"swl_at_actual_config","swl_actual","actual_swl","swl"),test_load:g(bm,"test_load","test_load_applied","load_test"),
    boom_structure:g(bm,"boom_structure","structure")||"PASS",boom_pins:g(bm,"boom_pins","pins")||"PASS",boom_wear:g(bm,"boom_wear","wear_pads")||"PASS",luffing_system:g(bm,"luffing_system","extension_system")||"PASS",slew_system:g(bm,"slew_system","rotation_system")||"PASS",hoist_system:g(bm,"hoist_system","hoist_lift")||"PASS",lmi_test:g(bm,"lmi_test","lmi_tested")||"PASS",anti_two_block:g(bm,"anti_two_block","anti_two_block_overload")||"PASS",boom_notes:g(bm,"notes","comments","remarks"),
    platform_swl:g(bk,"platform_swl","swl","bucket_swl"),bucket_serial:g(bk,"serial_number","bucket_serial"),bucket_make:g(bk,"manufacturer","make"),platform_dimensions:g(bk,"platform_dimensions","dimensions"),platform_material:g(bk,"platform_material","material"),test_load_applied:g(bk,"test_load_applied","test_load","load_test"),
    platform_structure:g(bk,"platform_structure","structure")||"PASS",platform_floor:g(bk,"platform_floor","floor_condition")||"PASS",guardrails:g(bk,"guardrails")||"PASS",toe_boards:g(bk,"toe_boards","toe_board")||"PASS",gate_latch:g(bk,"gate_latch","gate")||"PASS",platform_mounting:g(bk,"platform_mounting","mounting")||"PASS",rotation:g(bk,"rotation","slew")||"PASS",harness_anchors:g(bk,"harness_anchors","anchor_points")||"PASS",swl_marking:g(bk,"swl_marking","swl_marking_legible")||"PASS",paint_condition:g(bk,"paint_condition","coating_condition")||"Satisfactory",levelling_system:g(bk,"levelling_system","auto_levelling")||"PASS",emergency_lowering:g(bk,"emergency_lowering","emergency_lowering_device")||"PASS",emergency_stop:g(bk,"emergency_stop","emergency_stop_platform")||"PASS",overload_device:g(bk,"overload_device","overload_swl_cut_off_device")||"PASS",tilt_alarm:g(bk,"tilt_alarm","inclination_alarm")||"PASS",intercom:g(bk,"intercom","communication")||"PASS",bucket_notes:g(bk,"notes","comments"),
    structural_result:g(cl,"structural_result","structural_integrity")||"PASS",hydraulics_result:g(cl,"hydraulics_result","hydraulic_system")||"PASS",safety_devices:g(cl,"safety_devices","safety_systems")||"PASS",fire_extinguisher:g(cl,"fire_extinguisher")||"PASS",cl_emergency_stop:g(cl,"emergency_stop")||"PASS",stabiliser_interlocks:g(cl,"stabiliser_interlocks","outrigger_interlocks")||"PASS",machine_stable_under_load:g(cl,"machine_stable_under_load","machine_stable")||"PASS",no_structural_deformation_under_load:g(cl,"no_structural_deformation_under_load")||"PASS",all_functions_operate_under_load:g(cl,"all_functions_operate_under_load")||"PASS",
  };
}

/* ── Wire Rope Sling helpers ── */
function buildWireRopeSlingNotes(wrs) {
  const sling_details={},condition_assessment={};
  ["type","diameter_mm","length_m","num_legs","construction","core_type","swl"].forEach(k => { if (wrs[k]!==undefined&&wrs[k]!=="") sling_details[k]=wrs[k]; });
  ["corrosion","broken_wires","rope_kinks_deforming","reduction_in_diameter","condition_of_end_fittings","bird_caging_core_protrusion","serviceability","overall_assessment"].forEach(k => { if (wrs[k]!==undefined&&wrs[k]!=="") condition_assessment[k]=wrs[k]; });
  if (wrs.notes) condition_assessment.notes=wrs.notes;
  const out={};
  if (Object.keys(sling_details).length) out.sling_details=sling_details;
  if (Object.keys(condition_assessment).length) out.condition_assessment=condition_assessment;
  return JSON.stringify(out);
}

function parseWireRopeSlingNotes(notesStr) {
  const def={type:"Wire Rope Sling",diameter_mm:"",length_m:"",num_legs:"",construction:"",core_type:"",swl:"",corrosion:"none",broken_wires:"none",rope_kinks_deforming:"none",reduction_in_diameter:"none",condition_of_end_fittings:"Good",bird_caging_core_protrusion:"None",serviceability:"Serviceable",overall_assessment:"PASS",notes:""};
  if (!notesStr) return def;
  let parsed={};
  try { parsed=JSON.parse(notesStr); } catch(e) { return def; }
  const sd=parsed.sling_details||{},ca=parsed.condition_assessment||{};
  const g=(obj,...keys)=>{ for (const k of keys) { if (obj[k]!==undefined&&obj[k]!==null&&String(obj[k]).trim()!=="") return String(obj[k]); } return ""; };
  return {
    type:g(sd,"type")||g(parsed,"type")||"Wire Rope Sling",diameter_mm:g(sd,"diameter_mm","diameter")||g(parsed,"diameter_mm","diameter"),length_m:g(sd,"length_m","length")||g(parsed,"length_m","length"),num_legs:g(sd,"num_legs","number_of_legs","legs")||g(parsed,"num_legs","number_of_legs"),construction:g(sd,"construction")||g(parsed,"construction"),core_type:g(sd,"core_type","core")||g(parsed,"core_type","core"),swl:g(sd,"swl","capacity","capacity_volume")||g(parsed,"swl","capacity"),
    corrosion:g(ca,"corrosion")||g(parsed,"corrosion")||"none",broken_wires:g(ca,"broken_wires")||g(parsed,"broken_wires")||"none",rope_kinks_deforming:g(ca,"rope_kinks_deforming","rope_kinks","kinks")||g(parsed,"rope_kinks_deforming")||"none",reduction_in_diameter:g(ca,"reduction_in_diameter","diameter_reduction")||g(parsed,"reduction_in_diameter")||"none",condition_of_end_fittings:g(ca,"condition_of_end_fittings","end_fittings","ferrule")||g(parsed,"condition_of_end_fittings")||"Good",bird_caging_core_protrusion:g(ca,"bird_caging_core_protrusion","bird_caging","core_protrusion")||g(parsed,"bird_caging_core_protrusion")||"None",serviceability:g(ca,"serviceability")||g(parsed,"serviceability")||"Serviceable",overall_assessment:g(ca,"overall_assessment","result")||g(parsed,"overall_assessment")||"PASS",notes:g(ca,"notes","comments","remarks")||g(parsed,"notes","comments")||"",
  };
}

/* ═══════════════════════════════════════════════════════════
   SANDBLASTING POT helpers
═══════════════════════════════════════════════════════════ */
const SBP_CHECKLIST_SECTIONS = [
  { sec:"1.0 Appurtenances", items:[
    {key:"pipe_connections",           label:"1.1 Pipe Connections in good condition"},
    {key:"valves_fittings_construction",label:"1.2 Valves / Fittings of good construction"},
    {key:"fittings_pressure_rating",   label:"1.3 Fittings / Valves of correct pressure rating"},
    {key:"drain_valves",               label:"1.4 Drain valves in good operating condition"},
    {key:"no_leaks_pipework",          label:"1.5 No leaks in pipework"},
    {key:"vessel_access",              label:"1.6 Access to vessel interior adequate"},
    {key:"no_leaks_manholes",          label:"1.7 No leaks in manholes / hand holes"},
    {key:"gauge_isolation_valve",      label:"1.8 Pressure gauge has isolation valve"},
    {key:"relief_valve_calibrated",    label:"1.9 Pressure relief valve calibrated"},
    {key:"gauge_calibrated",           label:"2.0 Pressure gauge calibrated"},
    {key:"gauge_redlined",             label:"2.1 Pressure gauge redlined"},
  ]},
  { sec:"2.0 Vessel External Inspection", items:[
    {key:"vessel_material_standard",   label:"2.1 Vessel material of acceptable standard"},
    {key:"external_coating",           label:"2.2 Vessel external coating in good condition"},
    {key:"no_corrosion",               label:"2.3 Vessel not exposed to corrosion"},
    {key:"properly_mounted",           label:"2.4 Vessel properly mounted on floor"},
    {key:"welded_joints",              label:"2.5 Welded joints in good condition"},
    {key:"no_dents_cracks",            label:"2.6 No vessel dents or cracks"},
    {key:"no_external_leakages",       label:"2.7 No external leakages"},
  ]},
  { sec:"3.0 Relief Valve", items:[
    {key:"no_cracks_valve_body",       label:"3.1 Any cracks on the valve body"},
    {key:"no_foreign_material",        label:"3.2 Any foreign material on the valve"},
    {key:"valve_working",              label:"3.3 Valve working properly"},
  ]},
  { sec:"4.0 Vessel Internal Inspection", items:[
    {key:"no_oil_sludge",              label:"4.1 No oil sludge inside vessel"},
    {key:"interior_condition",         label:"4.2 Vessel interior in good condition"},
    {key:"no_moisture",                label:"4.3 No moisture / oil trapped in air receiver"},
    {key:"no_scaling",                 label:"4.4 No scaling inside vessel"},
    {key:"internal_stiffeners",        label:"4.5 Internal stiffeners in good condition"},
  ]},
  { sec:"5.0 Drainage", items:[
    {key:"properly_levelled",          label:"5.1 Vessels properly levelled for drainage"},
    {key:"drainage_hose",              label:"5.2 Provided with drainage hose"},
    {key:"no_ground_contamination",    label:"5.3 Vessel not contaminating ground"},
    {key:"automatic_drainage",         label:"5.4 Uses automatic drainage"},
  ]},
];

const SBP_DEFAULT_CHECKLIST = {};
SBP_CHECKLIST_SECTIONS.forEach(s => s.items.forEach(i => { SBP_DEFAULT_CHECKLIST[i.key]="PASS"; }));

function buildSandblastingNotes(sbp) {
  const readings = (sbp.wall_readings||[]).filter(Boolean);
  const sbBlock = {
    equipment_owner:          sbp.equipment_owner||"",
    location:                 sbp.location||"",
    vessel_unique_id:         sbp.vessel_unique_id||"",
    vessel_material:          sbp.vessel_material||"",
    inspection_frequency:     sbp.inspection_frequency||"YEARLY",
    year_of_manufacture:      sbp.year_of_manufacture||"",
    previous_inspection:      sbp.previous_inspection||"N/A",
    design_pressure:          sbp.design_pressure||"",
    working_pressure:         sbp.working_pressure||"",
    test_pressure:            sbp.test_pressure||"",
    pressure_unit:            sbp.pressure_unit||"Kpa",
    manufacturer:             sbp.manufacturer||"",
    pressure_gauge_no:        sbp.pressure_gauge_no||"Not indicated",
    pressure_relief_no:       sbp.pressure_relief_no||"NI",
    relief_valve_set_pressure:sbp.relief_valve_set_pressure||"NI",
    min_max_temp:             sbp.min_max_temp||".0-100°C",
    pressure_relief_type:     sbp.pressure_relief_type||"NI",
    test_type:                sbp.test_type||"ULTRASONIC TEST",
    original_shell_thickness: sbp.original_shell_thickness||"6.74",
    measured_shell_thickness: sbp.measured_shell_thickness||"0",
    allowable_reduction:      sbp.allowable_reduction||"20%",
    volume:                   sbp.volume||"",
    circumference:            sbp.circumference||"",
    height:                   sbp.height||"",
    wall_readings:            readings,
    checklist:                sbp.checklist||SBP_DEFAULT_CHECKLIST,
    inspector_name:           sbp.inspector_name||"",
    inspector_id:             sbp.inspector_id||"",
    client_name_cert:         sbp.client_name_cert||"",
  };
  return JSON.stringify({ sandblasting: sbBlock });
}

function parseSandblastingNotes(notesStr, extractedData) {
  const def = {
    equipment_owner:"", location:"", vessel_unique_id:"", vessel_material:"",
    inspection_frequency:"YEARLY", year_of_manufacture:"", previous_inspection:"N/A",
    design_pressure:"", working_pressure:"", test_pressure:"", pressure_unit:"Kpa",
    manufacturer:"", pressure_gauge_no:"Not indicated", pressure_relief_no:"NI",
    relief_valve_set_pressure:"NI", min_max_temp:".0-100°C", pressure_relief_type:"NI",
    test_type:"ULTRASONIC TEST", original_shell_thickness:"6.74",
    measured_shell_thickness:"0", allowable_reduction:"20%",
    volume:"", circumference:"", height:"",
    wall_readings: Array(10).fill(""),
    checklist: { ...SBP_DEFAULT_CHECKLIST },
    inspector_name:"", inspector_id:"", client_name_cert:"",
  };

  // Try extracted_data.sandblasting first (saved by this editor)
  const ex = extractedData || {};
  const sb = ex.sandblasting || ex.blasting_pot || ex.sbp || {};

  // Also try parsed notes JSON
  let parsedNotes = {};
  try { parsedNotes = JSON.parse(notesStr||"{}"); if (typeof parsedNotes !== "object") parsedNotes={}; } catch(e) { parsedNotes={}; }
  const sbNotes = parsedNotes.sandblasting || parsedNotes.sbp || {};

  // Merge: extracted_data wins over notes
  const merged = { ...sbNotes, ...sb };

  function g(...keys) {
    for (const k of keys) { const v=merged[k]; if (v!=null&&String(v).trim()!=="") return String(v); }
    return "";
  }

  // Wall readings
  const rawReadings = merged.wall_readings || [];
  const readArr = Array(10).fill("");
  if (Array.isArray(rawReadings)) rawReadings.slice(0,10).forEach((r,i) => { readArr[i]=String(r||""); });
  else { for (let i=0;i<10;i++) { readArr[i]=String(merged[`reading_${i+1}`]||merged[`wt${i+1}`]||""); } }

  // Checklist
  const cl = merged.checklist || {};
  const mergedCL = { ...SBP_DEFAULT_CHECKLIST };
  Object.keys(mergedCL).forEach(k => { if (cl[k]) mergedCL[k]=String(cl[k]).toUpperCase(); });

  return {
    equipment_owner:          g("equipment_owner","owner"),
    location:                 g("location"),
    vessel_unique_id:         g("vessel_unique_id","unique_id","vessel_id"),
    vessel_material:          g("vessel_material","material"),
    inspection_frequency:     g("inspection_frequency")||"YEARLY",
    year_of_manufacture:      g("year_of_manufacture","year_built","year"),
    previous_inspection:      g("previous_inspection","previous_inspection_date")||"N/A",
    design_pressure:          g("design_pressure"),
    working_pressure:         g("working_pressure","actual_working_pressure"),
    test_pressure:            g("test_pressure"),
    pressure_unit:            g("pressure_unit")||"Kpa",
    manufacturer:             g("manufacturer"),
    pressure_gauge_no:        g("pressure_gauge_no","gauge_number")||"Not indicated",
    pressure_relief_no:       g("pressure_relief_no","relief_valve_no")||"NI",
    relief_valve_set_pressure:g("relief_valve_set_pressure","relief_set_pr")||"NI",
    min_max_temp:             g("min_max_temp","temperature_range")||".0-100°C",
    pressure_relief_type:     g("pressure_relief_type","relief_type")||"NI",
    test_type:                g("test_type","inspection_type")||"ULTRASONIC TEST",
    original_shell_thickness: g("original_shell_thickness","nominal_thickness")||"6.74",
    measured_shell_thickness: g("measured_shell_thickness","actual_thickness")||"0",
    allowable_reduction:      g("allowable_reduction","reduction_percent")||"20%",
    volume:                   g("volume","capacity","capacity_volume"),
    circumference:            g("circumference"),
    height:                   g("height"),
    wall_readings:            readArr,
    checklist:                mergedCL,
    inspector_name:           g("inspector_name"),
    inspector_id:             g("inspector_id"),
    client_name_cert:         g("client_name_cert","client_name"),
  };
}

function parseNotesPipe(str) {
  if (!str) return [];
  return str.split("|").map(part => {
    const idx=part.indexOf(":");
    if (idx<0) return { key:part.trim(),value:"" };
    return { key:part.slice(0,idx).trim(),value:part.slice(idx+1).trim() };
  }).filter(p=>p.key);
}
function buildNotesPipe(pairs) {
  return pairs.filter(p=>p.key&&p.value).map(p=>`${p.key}: ${p.value}`).join(" | ");
}
function isJsonNotes(str) {
  if (!str||!str.trim()) return false;
  const t=str.trim(); return t.startsWith("{")||t.startsWith("[");
}
function safeJsonParse(value,fallback={}) {
  try { if (!value) return fallback; if (typeof value==="object"&&value!==null) return value; const parsed=JSON.parse(String(value)); return parsed&&typeof parsed==="object"?parsed:fallback; } catch { return fallback; }
}
function getEditableInspectionSource(data) {
  if (isJsonNotes(data?.notes||"")) return data.notes;
  const extracted=data?.extracted_data;
  if (extracted&&typeof extracted==="object"&&!Array.isArray(extracted)) return JSON.stringify(extracted);
  return data?.notes||"";
}
function mergeInspectionData(baseExtractedData,notesString,notesMode) {
  const base=safeJsonParse(baseExtractedData,{});
  if (!notesString) return base;
  if ((notesMode==="json"||notesMode==="cherry"||notesMode==="wrs"||notesMode==="sbp")&&isJsonNotes(notesString)) {
    const parsed=safeJsonParse(notesString,{});
    return {
      ...base,...parsed,
      checklist:{...(base.checklist||{}),...(parsed.checklist||{})},
      boom:{...(base.boom||{}),...(parsed.boom||{})},
      bucket:{...(base.bucket||{}),...(parsed.bucket||{})},
      horse:{...(base.horse||{}),...(parsed.horse||{})},
      trailer:{...(base.trailer||{}),...(parsed.trailer||{})},
      sling_details:{...(base.sling_details||{}),...(parsed.sling_details||{})},
      condition_assessment:{...(base.condition_assessment||{}),...(parsed.condition_assessment||{})},
      sandblasting:{...(base.sandblasting||{}),...(parsed.sandblasting||{})},
      forks:Array.isArray(parsed.forks)?parsed.forks:(Array.isArray(base.forks)?base.forks:[]),
    };
  }
  const pipePairs=parseNotesPipe(notesString);
  const flat={};
  pipePairs.forEach(({key,value}) => { if (key) flat[key]=value; });
  return {...base,...flat};
}

/* ─────────────────────────────────────────────────────────────
   SMALL SHARED COMPONENTS
───────────────────────────────────────────────────────────── */
function F({label,children,span=1}) {
  return (
    <div style={{gridColumn:`span ${span}`}}>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function ResultChips({value,onChange,options=["PASS","FAIL","REPAIR_REQUIRED"]}) {
  return (
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {options.map(rv => {
        const isActive=value===rv;
        const col=rv==="PASS"?T.green:(rv==="FAIL"||rv==="OUT_OF_SERVICE")?T.red:T.amber;
        return (
          <button key={rv} type="button" onClick={()=>onChange(rv)}
            style={{padding:"6px 13px",borderRadius:8,border:`1px solid ${isActive?col:T.border}`,background:isActive?`${col}22`:T.card,color:isActive?col:T.textDim,fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",minHeight:36}}>
            {rv.replace(/_/g," ")}
          </button>
        );
      })}
    </div>
  );
}

function PFChip({label,value,onChange}) {
  const OPTIONS=["PASS","FAIL","REPAIR_REQUIRED"];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.50)",marginBottom:5}}>
      <span style={{fontSize:11,color:T.textMid,fontWeight:600,flex:1}}>{label}</span>
      <div style={{display:"flex",gap:4}}>
        {OPTIONS.map(opt => {
          const isActive=value===opt;
          const c=opt==="PASS"?T.green:opt==="FAIL"?T.red:T.amber;
          return (
            <button key={opt} type="button" onClick={()=>onChange(opt)}
              style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${isActive?c:"transparent"}`,background:isActive?`${c}22`:"transparent",color:isActive?c:T.textDim,fontWeight:800,fontSize:9,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",minHeight:28,whiteSpace:"nowrap"}}>
              {opt==="REPAIR_REQUIRED"?"REPAIR":opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sandblasting 3-state YNA chip (Y=PASS / N=FAIL / N/A=NA) ── */
function YNAChip({label,value,onChange}) {
  const cur=(value||"PASS").toUpperCase();
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.50)",marginBottom:4,minHeight:40}}>
      <span style={{fontSize:11,color:T.textMid,fontWeight:500,flex:1,lineHeight:1.3}}>{label}</span>
      <div style={{display:"flex",gap:3,flexShrink:0}}>
        {[["PASS","Y",T.green],["FAIL","N",T.red],["NA","N/A","#64748b"]].map(([val,lbl,col]) => {
          const isActive=cur===val;
          return (
            <button key={val} type="button" onClick={()=>onChange(val)}
              style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${isActive?col:"transparent"}`,background:isActive?`${col}22`:"transparent",color:isActive?col:T.textDim,fontWeight:800,fontSize:9,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",minHeight:26,minWidth:30}}>
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const JsonInspectionRow = memo(function JsonInspectionRow({row,rowIndex,onChange,onRemove}) {
  const upperValue=String(row.value||"").toUpperCase();
  const dotColor=upperValue==="PASS"||upperValue==="YES"?"#34d399":upperValue==="FAIL"||upperValue==="NO"?"#f87171":upperValue==="REPAIR_REQUIRED"?"#fbbf24":null;
  return (
    <tr style={{background:rowIndex%2===0?"transparent":"rgba(255,255,255,0.015)"}}>
      <td className="id-param" title={row.key}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {dotColor?<span style={{width:6,height:6,borderRadius:"50%",background:dotColor,flexShrink:0,display:"inline-block"}}/>:<span style={{width:6,flexShrink:0,display:"inline-block"}}/>}
          <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{row.label}</span>
        </div>
      </td>
      <td className="id-val">
        <input value={row.value} onChange={e=>onChange(row.id,e.target.value)} spellCheck={false} autoComplete="off"
          style={{color:valueColor(row.value),fontWeight:/PASS|FAIL|YES|NO|REPAIR/.test(upperValue)?800:500}} placeholder="—"/>
      </td>
      <td className="id-del">
        <button type="button" onClick={()=>onRemove(row.id)}
          style={{width:28,height:28,borderRadius:6,border:`1px solid ${T.redBrd}`,background:"transparent",color:T.red,fontWeight:800,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:0.6}}
          onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>✕</button>
      </td>
    </tr>
  );
});

/* ─────────────────────────────────────────────────────────────
   WIRE ROPE SLING EDITOR
───────────────────────────────────────────────────────────── */
const CONDITION_OPTIONS_CORROSION   = ["none","light","moderate","severe"];
const CONDITION_OPTIONS_BROKEN      = ["none","1-2 wires","3-5 wires",">5 wires (reject)"];
const CONDITION_OPTIONS_KINKS       = ["none","slight","moderate","severe (reject)"];
const CONDITION_OPTIONS_REDUCTION   = ["none","<5%","5-10%",">10% (reject)"];
const CONDITION_OPTIONS_END         = ["Good","Fair","Poor","Damaged (replace)"];
const CONDITION_OPTIONS_BIRDCAGE    = ["None","Slight","Moderate","Severe (reject)"];
const CONDITION_OPTIONS_SERVICE     = ["Serviceable","Conditionally Serviceable","Unserviceable"];
const CONDITION_OPTIONS_OVERALL     = ["PASS","FAIL","CONDITIONAL"];

function SelectChips({value,onChange,options,color=T.accent}) {
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {options.map(opt => {
        const isActive=value===opt;
        const isNeg=/reject|fail|severe|poor|damaged|unservice/i.test(opt);
        const isMid=/conditional|moderate|fair|slight|>5|5-10|3-5/i.test(opt);
        const c=isNeg?T.red:isMid?T.amber:isActive?color:T.border;
        return (
          <button key={opt} type="button" onClick={()=>onChange(opt)}
            style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${isActive?c:T.border}`,background:isActive?`${c}22`:T.card,color:isActive?c:T.textDim,fontWeight:isActive?800:500,fontSize:11,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent",minHeight:32}}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function WireRopeSlingEditor({wrs,onChange}) {
  const set=(key,val)=>onChange({...wrs,[key]:val});
  return (
    <div>
      <div style={{marginBottom:4,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent,borderLeft:`3px solid ${T.accent}`,paddingLeft:8,marginBottom:12}}>Sling Details</div>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
          <thead>
            <tr style={{background:"rgba(11,29,58,0.8)",borderBottom:`1px solid ${T.accentBrd}`}}>
              {["Type","Diameter (mm)","Length (m)","No. of Legs","Construction","Core Type","SWL / Capacity"].map(h=>(
                <th key={h} style={{padding:"8px 10px",fontSize:10,fontWeight:800,color:T.accent,letterSpacing:"0.08em",textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[["type","Wire Rope Sling"],["diameter_mm","e.g. 16"],["length_m","e.g. 2"],["num_legs","e.g. 2"],["construction","e.g. 6x19"],["core_type","e.g. IWRC"],["swl","e.g. 3.6T"]].map(([key,ph])=>(
                <td key={key} style={{padding:"6px 8px",verticalAlign:"middle"}}>
                  <input value={wrs[key]||""} onChange={e=>set(key,e.target.value)} placeholder={ph}
                    style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.70)",color:key==="swl"?T.accent:T.text,fontWeight:key==="swl"?800:500,fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",minHeight:38,boxSizing:"border-box"}}/>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.blue,borderLeft:`3px solid ${T.blue}`,paddingLeft:8,marginTop:22,marginBottom:14}}>Condition Assessment</div>
      <div style={{display:"grid",gap:14}}>
        {[{key:"corrosion",label:"Corrosion",opts:CONDITION_OPTIONS_CORROSION},{key:"broken_wires",label:"Broken Wires",opts:CONDITION_OPTIONS_BROKEN},{key:"rope_kinks_deforming",label:"Rope Kinks / Deforming",opts:CONDITION_OPTIONS_KINKS},{key:"reduction_in_diameter",label:"Reduction in Diameter (max 10%)",opts:CONDITION_OPTIONS_REDUCTION},{key:"condition_of_end_fittings",label:"Condition of End Fittings / Ferrule",opts:CONDITION_OPTIONS_END},{key:"bird_caging_core_protrusion",label:"Bird-Caging / Core Protrusion",opts:CONDITION_OPTIONS_BIRDCAGE},{key:"serviceability",label:"Serviceability",opts:CONDITION_OPTIONS_SERVICE}].map(({key,label,opts})=>(
          <div key={key} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.40)",flexWrap:"wrap"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.textMid,minWidth:210,paddingTop:2}}>{label}</div>
            <div style={{flex:1,minWidth:200}}>
              <SelectChips value={wrs[key]||""} onChange={v=>set(key,v)} options={opts}/>
              <input value={wrs[key]||""} onChange={e=>set(key,e.target.value)} placeholder="or type custom value…"
                style={{marginTop:6,width:"100%",padding:"5px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.50)",color:T.textMid,fontSize:11,fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",minHeight:32,boxSizing:"border-box"}}/>
            </div>
          </div>
        ))}
        <div style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim}}>
          <div style={{fontSize:12,fontWeight:800,color:T.green,marginBottom:10}}>Overall Assessment</div>
          <SelectChips value={wrs.overall_assessment||"PASS"} onChange={v=>set("overall_assessment",v)} options={CONDITION_OPTIONS_OVERALL} color={T.green}/>
        </div>
        <div>
          <label style={{...LS}}>Notes / Remarks</label>
          <textarea value={wrs.notes||""} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Any additional observations…" style={{...IS,minHeight:80,resize:"vertical"}}/>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHERRY PICKER EDITOR
───────────────────────────────────────────────────────────── */
function CherryPickerEditor({cp,onChange}) {
  const set=(key,val)=>onChange({...cp,[key]:val});
  const inp=(key,placeholder="")=>(<input value={cp[key]||""} onChange={e=>set(key,e.target.value)} placeholder={placeholder||"—"} style={{...IS,minHeight:40,fontSize:12}}/>);
  const gridStyle={display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:4};
  return (
    <div>
      <div style={gridStyle}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent,borderLeft:`3px solid ${T.accent}`,paddingLeft:8,marginTop:14,marginBottom:8,gridColumn:"1/-1"}}>Boom Specification & Load Test</div>
        <F label="Max Working Height (m)">{inp("max_height","e.g. 18")}</F>
        <F label="Min Boom Length (m)">{inp("min_boom_length","e.g. 6")}</F>
        <F label="Max Boom Length (m)">{inp("max_boom_length","e.g. 18")}</F>
        <F label="Actual Boom Length (m)">{inp("actual_boom_length","e.g. 14")}</F>
        <F label="Extended / Telescoped (m)">{inp("extended_boom_length","e.g. 14")}</F>
        <F label="Boom Angle (°)">{inp("boom_angle","e.g. 60")}</F>
        <F label="Min Working Radius (m)">{inp("min_radius","e.g. 1")}</F>
        <F label="Max Working Radius (m)">{inp("max_radius","e.g. 10")}</F>
        <F label="Load Tested at Radius (m)">{inp("load_tested_at_radius","e.g. 8")}</F>
        <F label="SWL at Min Radius">{inp("swl_at_min_radius","e.g. 350KG")}</F>
        <F label="SWL at Max Radius">{inp("swl_at_max_radius","e.g. 150KG")}</F>
        <F label="SWL at Actual Config">{inp("swl_at_actual_config","e.g. 250KG")}</F>
        <F label="Test Load Applied (110% SWL)">{inp("test_load","e.g. 385KG")}</F>
      </div>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent,borderLeft:`3px solid ${T.accent}`,paddingLeft:8,marginTop:14,marginBottom:8}}>Boom Systems Condition</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:6,marginBottom:4}}>
        <PFChip label="Boom Structure" value={cp.boom_structure||"PASS"} onChange={v=>set("boom_structure",v)}/>
        <PFChip label="Boom Pins & Connections" value={cp.boom_pins||"PASS"} onChange={v=>set("boom_pins",v)}/>
        <PFChip label="Boom Wear / Pads" value={cp.boom_wear||"PASS"} onChange={v=>set("boom_wear",v)}/>
        <PFChip label="Luffing / Extension System" value={cp.luffing_system||"PASS"} onChange={v=>set("luffing_system",v)}/>
        <PFChip label="Slew / Rotation System" value={cp.slew_system||"PASS"} onChange={v=>set("slew_system",v)}/>
        <PFChip label="Hoist / Lift System" value={cp.hoist_system||"PASS"} onChange={v=>set("hoist_system",v)}/>
        <PFChip label="LMI Tested at Configuration" value={cp.lmi_test||"PASS"} onChange={v=>set("lmi_test",v)}/>
        <PFChip label="Anti-Two Block / Overload" value={cp.anti_two_block||"PASS"} onChange={v=>set("anti_two_block",v)}/>
      </div>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.blue,borderLeft:`3px solid ${T.blue}`,paddingLeft:8,marginTop:14,marginBottom:8}}>General & Safety Checklist</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:6,marginBottom:4}}>
        <PFChip label="Structural Integrity" value={cp.structural_result||"PASS"} onChange={v=>set("structural_result",v)}/>
        <PFChip label="Hydraulic System" value={cp.hydraulics_result||"PASS"} onChange={v=>set("hydraulics_result",v)}/>
        <PFChip label="Safety Devices / Interlocks" value={cp.safety_devices||"PASS"} onChange={v=>set("safety_devices",v)}/>
        <PFChip label="Fire Extinguisher" value={cp.fire_extinguisher||"PASS"} onChange={v=>set("fire_extinguisher",v)}/>
        <PFChip label="Emergency Stop" value={cp.cl_emergency_stop||"PASS"} onChange={v=>set("cl_emergency_stop",v)}/>
        <PFChip label="Outrigger / Stabiliser Interlocks" value={cp.stabiliser_interlocks||"PASS"} onChange={v=>set("stabiliser_interlocks",v)}/>
        <PFChip label="Machine Stable Under Load" value={cp.machine_stable_under_load||"PASS"} onChange={v=>set("machine_stable_under_load",v)}/>
        <PFChip label="No Structural Deformation Under Load" value={cp.no_structural_deformation_under_load||"PASS"} onChange={v=>set("no_structural_deformation_under_load",v)}/>
        <PFChip label="All Functions Operate Under Load" value={cp.all_functions_operate_under_load||"PASS"} onChange={v=>set("all_functions_operate_under_load",v)}/>
      </div>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginTop:14,marginBottom:8}}>Work Platform / Bucket — Page 2 (6 Month Cert)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:4}}>
        <F label="Platform SWL">{inp("platform_swl","e.g. 350KG")}</F>
        <F label="Test Load Applied (110%)">{inp("test_load_applied","e.g. 385KG")}</F>
        <F label="Bucket Serial Number">{inp("bucket_serial","e.g. BKT-001")}</F>
        <F label="Bucket Manufacturer">{inp("bucket_make","e.g. Genie / Manitou")}</F>
        <F label="Platform Dimensions (m)">{inp("platform_dimensions","e.g. 1.2 x 0.8")}</F>
        <F label="Platform Material">{inp("platform_material","e.g. Steel / GRP")}</F>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:6,marginBottom:8}}>
        <PFChip label="Platform Structure" value={cp.platform_structure||"PASS"} onChange={v=>set("platform_structure",v)}/>
        <PFChip label="Platform Floor" value={cp.platform_floor||"PASS"} onChange={v=>set("platform_floor",v)}/>
        <PFChip label="Guardrails" value={cp.guardrails||"PASS"} onChange={v=>set("guardrails",v)}/>
        <PFChip label="Toe Boards" value={cp.toe_boards||"PASS"} onChange={v=>set("toe_boards",v)}/>
        <PFChip label="Gate / Latch System" value={cp.gate_latch||"PASS"} onChange={v=>set("gate_latch",v)}/>
        <PFChip label="Platform Mounting to Boom" value={cp.platform_mounting||"PASS"} onChange={v=>set("platform_mounting",v)}/>
        <PFChip label="Rotation / Slew Mechanism" value={cp.rotation||"PASS"} onChange={v=>set("rotation",v)}/>
        <PFChip label="Harness Anchor Points" value={cp.harness_anchors||"PASS"} onChange={v=>set("harness_anchors",v)}/>
        <PFChip label="SWL Marking Legible" value={cp.swl_marking||"PASS"} onChange={v=>set("swl_marking",v)}/>
        <PFChip label="Auto-Levelling System" value={cp.levelling_system||"PASS"} onChange={v=>set("levelling_system",v)}/>
        <PFChip label="Emergency Lowering Device" value={cp.emergency_lowering||"PASS"} onChange={v=>set("emergency_lowering",v)}/>
        <PFChip label="Emergency Stop (Platform)" value={cp.emergency_stop||"PASS"} onChange={v=>set("emergency_stop",v)}/>
        <PFChip label="Overload / SWL Cut-Off Device" value={cp.overload_device||"PASS"} onChange={v=>set("overload_device",v)}/>
        <PFChip label="Tilt / Inclination Alarm" value={cp.tilt_alarm||"PASS"} onChange={v=>set("tilt_alarm",v)}/>
        <PFChip label="Intercom / Communication" value={cp.intercom||"PASS"} onChange={v=>set("intercom",v)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <F label="Boom Notes"><textarea value={cp.boom_notes||""} onChange={e=>set("boom_notes",e.target.value)} rows={2} placeholder="Any boom-related observations…" style={{...IS,minHeight:60,resize:"vertical"}}/></F>
        <F label="Platform / Bucket Notes"><textarea value={cp.bucket_notes||""} onChange={e=>set("bucket_notes",e.target.value)} rows={2} placeholder="Any platform-related observations…" style={{...IS,minHeight:60,resize:"vertical"}}/></F>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SANDBLASTING POT EDITOR
───────────────────────────────────────────────────────────── */
function SandblastingPotEditor({sbp,onChange}) {
  const set=(key,val)=>onChange({...sbp,[key]:val});
  const setCL=(key,val)=>onChange({...sbp,checklist:{...(sbp.checklist||{}), [key]:val}});
  const setReading=(i,val)=>{ const r=[...(sbp.wall_readings||Array(10).fill(""))]; r[i]=val; onChange({...sbp,wall_readings:r}); };
  const inp=(key,ph="",mono=false)=>(
    <input value={sbp[key]||""} onChange={e=>set(key,e.target.value)} placeholder={ph||"—"}
      style={{...IS,minHeight:40,fontSize:12,fontFamily:mono?"'IBM Plex Mono',monospace":"'IBM Plex Sans',sans-serif"}}/>
  );
  const readings=sbp.wall_readings||Array(10).fill("");
  const cl=sbp.checklist||SBP_DEFAULT_CHECKLIST;

  return (
    <div style={{display:"grid",gap:20}}>

      {/* ── PAGE 1: HEADER INFO ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginBottom:12}}>Page 1 — Equipment &amp; Site Info</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          <F label="Equipment Owner">{inp("equipment_owner","GULFSTREAM ENERGY PTY LTD")}</F>
          <F label="Location">{inp("location","BOTSWANA OIL SITE")}</F>
          <F label="Vessel Unique ID / Serial">{inp("vessel_unique_id","PO285JB31",true)}</F>
          <F label="Vessel Material">{inp("vessel_material","ALUMINUM")}</F>
          <F label="Inspection Frequency">
            <select value={sbp.inspection_frequency||"YEARLY"} onChange={e=>set("inspection_frequency",e.target.value)} style={{...IS,minHeight:40}}>
              <option value="YEARLY">Yearly</option>
              <option value="BI-ANNUALLY">Bi-annually</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </F>
          <F label="Year of Manufacture">{inp("year_of_manufacture","2025")}</F>
          <F label="Previous Inspection Date">{inp("previous_inspection","N/A")}</F>
          <F label="Manufacturer">{inp("manufacturer","INDIA")}</F>
        </div>
      </div>

      {/* ── PAGE 1: PRESSURE DATA ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginBottom:12}}>Pressure Data</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          <F label="Design Pressure">{inp("design_pressure","1063")}</F>
          <F label="Working Pressure">{inp("working_pressure","850")}</F>
          <F label="Test Pressure">{inp("test_pressure","0")}</F>
          <F label="Pressure Unit">
            <select value={sbp.pressure_unit||"Kpa"} onChange={e=>set("pressure_unit",e.target.value)} style={{...IS,minHeight:40}}>
              <option value="Kpa">Kpa</option>
              <option value="bar">bar</option>
              <option value="psi">psi</option>
              <option value="MPa">MPa</option>
            </select>
          </F>
          <F label="Min / Max Temperature">{inp("min_max_temp",".0-100°C")}</F>
        </div>
      </div>

      {/* ── PAGE 1: VESSEL DIMENSIONS ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginBottom:12}}>Vessel Dimensions</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          <F label="Volume (L)">{inp("volume","200",true)}</F>
          <F label="Circumference (mm)">{inp("circumference","850",true)}</F>
          <F label="Height (mm)">{inp("height","1200",true)}</F>
        </div>
      </div>

      {/* ── PAGE 1: WALL THICKNESS ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginBottom:12}}>Wall Thickness Measurement Points (mm)</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {readings.slice(0,10).map((r,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,textAlign:"center"}}>Point {i+1}</div>
              <input type="text" inputMode="decimal" value={r} onChange={e=>setReading(i,e.target.value)} placeholder="—"
                style={{...IS,minHeight:40,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:T.accent,padding:"8px 6px"}}/>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAGE 1: CHECKLIST ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.orange,borderLeft:`3px solid ${T.orange}`,paddingLeft:8,marginBottom:12}}>Inspection Checklist — Y (Pass) / N (Fail) / N/A</div>
        <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
          {SBP_CHECKLIST_SECTIONS.map((section,si)=>(
            <div key={si}>
              <div style={{padding:"5px 12px",background:"rgba(11,29,58,0.9)",borderBottom:`1px solid rgba(251,146,60,0.3)`,color:T.orange,fontSize:9,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase"}}>
                {section.sec}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
                {section.items.map((item,ii)=>(
                  <YNAChip key={item.key} label={item.label} value={cl[item.key]||"PASS"} onChange={v=>setCL(item.key,v)}/>
                ))}
                {section.items.length%2!==0&&<div style={{minHeight:40}}/>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAGE 2: TEST CERT DATA ── */}
      <div>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent,borderLeft:`3px solid ${T.accent}`,paddingLeft:8,marginBottom:12}}>Page 2 — Test Certificate Details</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          <F label="Original Shell Thickness (mm)">{inp("original_shell_thickness","6.74",true)}</F>
          <F label="Measured Shell Thickness (mm)">{inp("measured_shell_thickness","0",true)}</F>
          <F label="% Allowable Reduction">{inp("allowable_reduction","20%")}</F>
          <F label="Test Type">{inp("test_type","ULTRASONIC TEST")}</F>
          <F label="Pressure Gauge No.">{inp("pressure_gauge_no","Not indicated")}</F>
          <F label="Pressure Relief No.">{inp("pressure_relief_no","NI")}</F>
          <F label="Relief Valve Set Pressure">{inp("relief_valve_set_pressure","NI")}</F>
          <F label="Pressure Relief Type">{inp("pressure_relief_type","NI")}</F>
        </div>
      </div>

      {/* ── PAGE 2: SIGNATURES ── */}
      <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent,borderLeft:`3px solid ${T.accent}`,paddingLeft:8,marginBottom:12}}>Page 2 — Signatures (Bottom of Certificate)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{border:`1px solid ${T.accentBrd}`,borderRadius:10,padding:"14px 16px",background:T.accentDim}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:T.accent,marginBottom:10}}>Competent Person / Inspector</div>
            <F label="Inspector Name">{inp("inspector_name","M.MASUPE")}</F>
            <div style={{marginTop:8}}>
              <F label="Inspector ID">{inp("inspector_id","700117910",true)}</F>
            </div>
            <div style={{marginTop:10,padding:"8px 12px",background:"rgba(34,211,238,0.05)",borderRadius:7,border:`1px dashed ${T.accentBrd}`,fontSize:11,color:T.textDim,textAlign:"center"}}>
              Signature image loads automatically from <span style={{color:T.accent}}>/Signature</span>
            </div>
          </div>
          <div style={{border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",background:"rgba(18,30,50,0.4)"}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>Client Name &amp; Signature</div>
            <F label="Client Name (printed on cert)">
              <input value={sbp.client_name_cert||""} onChange={e=>set("client_name_cert",e.target.value)} placeholder="MR SANNY"
                style={{...IS,minHeight:40,fontSize:12}}/>
            </F>
            <div style={{marginTop:10,padding:"8px 12px",background:"rgba(18,30,50,0.5)",borderRadius:7,border:`1px dashed ${T.border}`,fontSize:11,color:T.textDim,textAlign:"center"}}>
              Client signs physically on the printed certificate
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EQUIPMENT TYPE DROPDOWN
───────────────────────────────────────────────────────────── */
function EquipmentTypeSelect({value,onChange,style}) {
  return (
    <select value={value} onChange={onChange} style={style}>
      <option value="">Select type…</option>
      <optgroup label="🏗 Cranes">
        <option>Mobile Crane</option><option>Crane Boom</option><option>Crane Hook</option><option>Wire Rope</option><option>Overhead Crane / EOT Crane</option><option>Gantry Crane</option><option>Tower Crane</option><option>Crawler Crane</option><option>Knuckle Boom Crane</option><option>Tadano Crane</option><option>Rough Terrain Crane</option><option>Truck-Mounted Crane</option>
      </optgroup>
      <optgroup label="⛓ Hoists">
        <option>Chain Block</option><option>Manual Chain Hoist</option><option>Electric Chain Hoist</option><option>Lever Hoist / Tirfor</option><option>Electric Wire Rope Hoist</option>
      </optgroup>
      <optgroup label="🔗 Shackles">
        <option>Shackle — Bow / Anchor</option><option>Shackle — D / Dee</option><option>Shackle — Safety Bow</option><option>Shackle — Wide Mouth</option><option>Shackle — Screw Pin Anchor</option><option>Shackle — Bolt Type Anchor</option><option>Shackle — Alloy</option><option>Shackle — Stainless Steel</option>
      </optgroup>
      <optgroup label="🪢 Slings">
        <option>Chain Sling</option><option>Wire Rope Sling</option><option>Web Sling / Flat Sling</option><option>Round Sling</option><option>Multi-Leg Chain Sling</option><option>Multi-Leg Wire Rope Sling</option>
      </optgroup>
      <optgroup label="🔩 Rigging Hardware">
        <option>Hook — Swivel</option><option>Hook — Eye</option><option>Hook — Crane</option><option>Eye Bolt</option><option>Eye Nut</option><option>Turnbuckle</option><option>Master Link</option><option>Swivel</option><option>Wire Rope Clip</option>
      </optgroup>
      <optgroup label="📐 Beams & Spreaders">
        <option>Spreader Beam</option><option>Lifting Beam</option><option>Adjustable Spreader Beam</option><option>Pallet Lifter</option><option>Drum Lifter</option><option>Magnetic Lifter</option>
      </optgroup>
      <optgroup label="🦺 Fall Protection">
        <option>Safety Harness — Full Body</option><option>Lanyard — Energy Absorbing</option><option>Lanyard — Twin Leg</option><option>Self-Retracting Lifeline (SRL)</option><option>Fall Arrest Block</option><option>Anchor Point</option>
      </optgroup>
      <optgroup label="🔧 Jacks & Hydraulic Lifting">
        <option>Electric Hydraulic Lifting Machine</option><option>Jinyun Electric Hydraulic Lifting Machine</option><option>Hydraulic Jack — General</option><option>Bottle Jack</option><option>Toe Jack / Skid Jack</option><option>Screw Jack</option><option>Pneumatic Jack</option><option>Railway Jack</option><option>Strand Jack</option><option>Hydraulic Cylinder Jack</option><option>Hydraulic Gantry / Portal Jack</option><option>Hydraulic Floor Jack</option><option>Hydraulic Press</option><option>Air / Pneumatic Lifting Bag</option><option>Mechanical Screw Lift</option><option>Synchronised Hydraulic Lifting System</option>
      </optgroup>
      <optgroup label="🔥 Pressure Equipment">
        <option>Pressure Vessel</option><option>Air Receiver</option><option>Boiler</option><option>Hydraulic Tank</option><option>Compressor — Air</option><option>Accumulator</option><option>Gas Cylinder</option><option>LPG Tank</option>
        <option>Sandblasting Pot</option>
      </optgroup>
      <optgroup label="🚛 Trucks & Heavy Vehicles">
        <option>Mixer Truck</option><option>Diesel Bowser</option><option>Water Bowser</option><option>Tipper Truck</option><option>Rigid Truck</option><option>Flatbed Truck</option><option>Crane Truck / Hiab</option><option>Horse (Prime Mover)</option><option>Horse &amp; Trailer</option><option>Trailer — Flatbed</option><option>Trailer — Lowbed</option><option>Trailer — Tanker</option><option>Trailer — Side Tipper</option><option>Trailer — Skeletal</option><option>Bus / Personnel Carrier</option><option>Light Vehicle / Pickup</option><option>Ambulance</option>
      </optgroup>
      <optgroup label="🏗 Earthmoving & Construction">
        <option>Excavator</option><option>Bulldozer</option><option>Grader / Motor Grader</option><option>Compactor / Roller</option><option>Scraper</option><option>Dump Truck</option><option>Haul Truck</option><option>TLB (Tractor Loader Backhoe)</option><option>Front Loader / Wheel Loader</option><option>Skid Steer Loader</option>
      </optgroup>
      <optgroup label="⚙ Forklifts & Lifting Machines">
        <option>Forklift</option><option>Reach Stacker</option><option>Telehandler</option><option>Cherry Picker / Aerial Work Platform</option><option>Scissor Lift</option><option>Personnel Lift / Manlift</option><option>Fork Arm Assembly</option>
      </optgroup>
      <optgroup label="💧 Pumps & Fluid Equipment">
        <option>Water Pump</option><option>Submersible Pump</option><option>Diesel Fuel Pump</option><option>Chemical Dosing Pump</option><option>Generator — Diesel</option><option>Generator — Petrol</option><option>Air Compressor</option><option>Welding Machine</option>
      </optgroup>
      <optgroup label="⛏ Mine & Site Specific">
        <option>Scaffold</option><option>Underground Mine Cage</option><option>Skip Hoist</option><option>Rock Drill / Drill Rig</option><option>Continuous Miner</option><option>LHD (Load Haul Dump)</option><option>Conveyor Belt System</option><option>Fire Extinguisher</option><option>Breathing Apparatus / SCBA</option><option>Gas Detector</option>
      </optgroup>
      <optgroup label="📦 Other"><option>Other</option></optgroup>
    </select>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const TABS = ["Certificate","Equipment","Technical","Inspector","Inspection Data","Folder"];
const CERT_TYPES = ["Certificate of Inspection","Load Test Certificate","Pressure Test Certificate","NDT Certificate","Thorough Examination Certificate"];
const RESULTS = ["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL","UNKNOWN"];
const P_UNITS = ["bar","kPa","MPa","psi"];

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

  const [notesMode,   setNotesMode]   = useState("pipe");
  const [jsonRows,    setJsonRows]    = useState([]);
  const [notePairs,   setNotePairs]   = useState([]);
  const [cpData,      setCpData]      = useState(parseCherryPickerNotes(""));
  const [wrsData,     setWrsData]     = useState(parseWireRopeSlingNotes(""));
  const [sbpData,     setSbpData]     = useState(parseSandblastingNotes("",{}));
  const [addSection,  setAddSection]  = useState("");
  const [addKey,      setAddKey]      = useState("");
  const [addValue,    setAddValue]    = useState("");
  const [dataSearch,  setDataSearch]  = useState("");
  const [collapsed,   setCollapsed]   = useState({});
  const [baseExtractedData, setBaseExtractedData] = useState({});

  const [form, setForm] = useState({
    certificate_number:"",certificate_type:"Certificate of Inspection",
    result:"PASS",status:"active",
    issue_date:"",inspection_date:"",expiry_date:"",next_inspection_due:"",
    inspection_number:"",equipment_type:"",equipment_description:"",asset_name:"",asset_tag:"",
    serial_number:"",fleet_number:"",registration_number:"",
    manufacturer:"",model:"",year_built:"",country_of_origin:"",location:"",client_name:"",
    swl:"",capacity_volume:"",working_pressure:"",design_pressure:"",
    test_pressure:"",pressure_unit:"",material:"",standard_code:"",lanyard_serial_no:"",
    inspector_name:"",inspector_id:"",inspection_body:"",
    legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
    defects_found:"",recommendations:"",comments:"",
    folder_id:"",folder_name:"",folder_position:"",
  });

  const equipIsCherryPicker    = isCherryPicker(form.equipment_type);
  const equipIsWireRopeSling   = isWireRopeSling(form.equipment_type);
  const equipIsSandblastingPot = isSandblastingPot(form.equipment_type);

  useEffect(() => { if (id) load(); }, [id]);
  useEffect(() => { const t=setTimeout(()=>searchLink(linkSearch),300); return ()=>clearTimeout(t); }, [linkSearch]);

  async function load() {
    setLoading(true); setError("");
    const { data, error:e } = await supabase.from("certificates").select("*").eq("id",id).maybeSingle();
    if (e||!data) { setError(e?.message||"Certificate not found."); setLoading(false); return; }
    setForm({
      certificate_number:    data.certificate_number    ||"",
      certificate_type:      data.certificate_type      ||"Certificate of Inspection",
      result:                data.result                ||"PASS",
      status:                data.status                ||"active",
      issue_date:            toDate(data.issue_date     ||data.issued_at),
      inspection_date:       toDate(data.inspection_date||data.issue_date),
      expiry_date:           toDate(data.expiry_date    ||data.valid_to),
      next_inspection_due:   toDate(data.next_inspection_due||data.next_inspection_date),
      inspection_number:     data.inspection_number     ||data.inspection_no||"",
      equipment_type:        data.equipment_type        ||data.asset_type||"",
      equipment_description: data.equipment_description ||data.asset_name||"",
      asset_name:            data.asset_name            ||data.equipment_description||"",
      asset_tag:             data.asset_tag             ||"",
      serial_number:         data.serial_number         ||"",
      fleet_number:          data.fleet_number          ||"",
      registration_number:   data.registration_number   ||"",
      manufacturer:          data.manufacturer          ||"",
      model:                 data.model                 ||"",
      year_built:            data.year_built            ||"",
      country_of_origin:     data.country_of_origin     ||"",
      location:              data.location              ||"",
      client_name:           data.client_name           ||data.company||"",
      swl:                   data.swl                   ||"",
      capacity_volume:       data.capacity_volume       ||"",
      working_pressure:      data.working_pressure      ||"",
      design_pressure:       data.design_pressure       ||"",
      test_pressure:         data.test_pressure         ||"",
      pressure_unit:         data.pressure_unit         ||"",
      material:              data.material              ||"",
      standard_code:         data.standard_code         ||"",
      lanyard_serial_no:     data.lanyard_serial_no     ||"",
      inspector_name:        data.inspector_name        ||"",
      inspector_id:          data.inspector_id          ||data.inspector_id_number||"",
      inspection_body:       data.inspection_body       ||"",
      legal_framework:       data.legal_framework       ||"Mines, Quarries, Works and Machinery Act Cap 44:02",
      defects_found:         data.defects_found         ||"",
      recommendations:       data.recommendations       ||"",
      comments:              data.comments              ||data.remarks||"",
      folder_id:             data.folder_id             ||"",
      folder_name:           data.folder_name           ||"",
      folder_position:       data.folder_position!=null?String(data.folder_position):"",
    });
    const storedExtracted = data.extracted_data || {};
    setBaseExtractedData(storedExtracted);
    const rawNotes = getEditableInspectionSource(data);
    const equipType = data.equipment_type||data.asset_type||"";

    if (isSandblastingPot(equipType)) {
      setNotesMode("sbp");
      setSbpData(parseSandblastingNotes(rawNotes, storedExtracted));
      setJsonRows([]); setNotePairs([]);
    } else if (isCherryPicker(equipType)) {
      setNotesMode("cherry");
      setCpData(parseCherryPickerNotes(rawNotes));
      setJsonRows([]); setNotePairs([]);
    } else if (isWireRopeSling(equipType)) {
      setNotesMode("wrs");
      setWrsData(parseWireRopeSlingNotes(rawNotes));
      setJsonRows([]); setNotePairs([]);
    } else if (isJsonNotes(rawNotes)) {
      setNotesMode("json");
      setJsonRows(flattenNotesJson(rawNotes));
      setNotePairs([]);
    } else {
      setNotesMode("pipe");
      setNotePairs(parseNotesPipe(rawNotes));
      setJsonRows([]);
    }
    if (data.folder_id) {
      const { data:linked } = await supabase.from("certificates")
        .select("id,certificate_number,equipment_description,equipment_type,folder_position")
        .eq("folder_id",data.folder_id).order("folder_position",{ascending:true});
      setBundle(linked||[]);
    }
    setLoading(false);
  }

  const hc = e => setForm(p=>({...p,[e.target.name]:e.target.value}));

  const hcEquipType = e => {
    const newType = e.target.value;
    setForm(p=>({...p,equipment_type:newType}));
    if (isSandblastingPot(newType) && notesMode !== "sbp") {
      const built = notesMode==="json"?rebuildNotesJson(jsonRows):notesMode==="cherry"?buildCherryPickerNotes(cpData):notesMode==="wrs"?buildWireRopeSlingNotes(wrsData):buildNotesPipe(notePairs);
      setSbpData(parseSandblastingNotes(built, baseExtractedData));
      setNotesMode("sbp");
    } else if (isCherryPicker(newType) && notesMode !== "cherry") {
      const built = notesMode==="json"?rebuildNotesJson(jsonRows):notesMode==="wrs"?buildWireRopeSlingNotes(wrsData):notesMode==="sbp"?buildSandblastingNotes(sbpData):buildNotesPipe(notePairs);
      setCpData(parseCherryPickerNotes(built));
      setNotesMode("cherry");
    } else if (isWireRopeSling(newType) && notesMode !== "wrs") {
      const built = notesMode==="json"?rebuildNotesJson(jsonRows):notesMode==="cherry"?buildCherryPickerNotes(cpData):notesMode==="sbp"?buildSandblastingNotes(sbpData):buildNotesPipe(notePairs);
      setWrsData(parseWireRopeSlingNotes(built));
      setNotesMode("wrs");
    } else if (!isCherryPicker(newType)&&!isWireRopeSling(newType)&&!isSandblastingPot(newType)) {
      if (notesMode==="cherry") { setJsonRows(flattenNotesJson(buildCherryPickerNotes(cpData))); setNotesMode("json"); }
      else if (notesMode==="wrs") { setJsonRows(flattenNotesJson(buildWireRopeSlingNotes(wrsData))); setNotesMode("json"); }
      else if (notesMode==="sbp") { setJsonRows(flattenNotesJson(buildSandblastingNotes(sbpData))); setNotesMode("json"); }
    }
  };

  const updateJsonRow = useCallback((rowId,newValue) => { setJsonRows(prev=>prev.map(r=>r.id===rowId?{...r,value:newValue}:r)); },[]);
  const removeJsonRow = useCallback((rowId) => { setJsonRows(prev=>prev.filter(r=>r.id!==rowId)); },[]);
  const addJsonRow = useCallback(() => {
    const key=addKey.trim(); if (!key) return;
    const section=addSection.trim()||"General"; const sectionKey=normalizeSectionPathKey(section);
    const resolvedKey=sectionKey==="general"?normalizeFieldToken(key):canonicalizeFieldKey(sectionKey,key);
    const path=sectionKey==="general"?[resolvedKey]:[sectionKey,resolvedKey];
    setJsonRows(prev=>[...prev,{id:Date.now()+Math.random(),section,key:resolvedKey||key,label:formatFieldLabel(resolvedKey||key),value:addValue.trim(),path}]);
    setAddKey(""); setAddValue("");
  },[addKey,addSection,addValue]);

  const updatePair=(i,field,val)=>setNotePairs(p=>p.map((x,j)=>j===i?{...x,[field]:val}:x));
  const addPair=()=>setNotePairs(p=>[...p,{key:"",value:""}]);
  const removePair=i=>setNotePairs(p=>p.filter((_,j)=>j!==i));

  function buildFinalNotes() {
    if (notesMode==="sbp")    return buildSandblastingNotes(sbpData);
    if (notesMode==="cherry") return buildCherryPickerNotes(cpData);
    if (notesMode==="wrs")    return buildWireRopeSlingNotes(wrsData);
    if (notesMode==="json")   return rebuildNotesJson(jsonRows);
    return buildNotesPipe(notePairs);
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const finalNotes = buildFinalNotes();
      const mergedInspectionData = mergeInspectionData(baseExtractedData, finalNotes, notesMode);

      // For SBP also sync flat cert columns from sbpData
      const sbpExtras = notesMode==="sbp" ? {
        client_name:      sbpData.equipment_owner||form.client_name||null,
        location:         sbpData.location||form.location||null,
        serial_number:    sbpData.vessel_unique_id||form.serial_number||null,
        manufacturer:     sbpData.manufacturer||form.manufacturer||null,
        year_built:       sbpData.year_of_manufacture||form.year_built||null,
        design_pressure:  sbpData.design_pressure||form.design_pressure||null,
        working_pressure: sbpData.working_pressure||form.working_pressure||null,
        test_pressure:    sbpData.test_pressure||form.test_pressure||null,
        pressure_unit:    sbpData.pressure_unit||form.pressure_unit||null,
        capacity_volume:  sbpData.volume||form.capacity_volume||null,
        material:         sbpData.vessel_material||form.material||null,
        inspector_name:   sbpData.inspector_name||form.inspector_name||null,
        inspector_id:     sbpData.inspector_id||form.inspector_id||null,
        comments:         sbpData.client_name_cert||form.comments||null,
      } : {};

      const {error:e} = await supabase.from("certificates").update({
        certificate_number:    form.certificate_number    ||null,
        certificate_type:      form.certificate_type      ||null,
        result:                form.result                ||null,
        equipment_status:      form.result                ||null,
        status:                form.status                ||"active",
        issue_date:            form.issue_date            ||null,
        inspection_date:       form.inspection_date       ||null,
        expiry_date:           form.expiry_date           ||null,
        next_inspection_due:   form.next_inspection_due   ||null,
        next_inspection_date:  form.next_inspection_due   ||null,
        inspection_number:     form.inspection_number     ||null,
        equipment_type:        form.equipment_type        ||null,
        equipment_description: form.equipment_description ||null,
        asset_name:            form.asset_name            ||null,
        asset_tag:             form.asset_tag             ||null,
        serial_number:         form.serial_number         ||null,
        fleet_number:          form.fleet_number          ||null,
        registration_number:   form.registration_number   ||null,
        manufacturer:          form.manufacturer          ||null,
        model:                 form.model                 ||null,
        year_built:            form.year_built            ||null,
        country_of_origin:     form.country_of_origin     ||null,
        location:              form.location              ||null,
        client_name:           form.client_name           ||null,
        swl:                   form.swl                   ||null,
        capacity_volume:       form.capacity_volume       ||null,
        working_pressure:      form.working_pressure      ||null,
        design_pressure:       form.design_pressure       ||null,
        test_pressure:         form.test_pressure         ||null,
        pressure_unit:         form.pressure_unit         ||null,
        material:              form.material              ||null,
        standard_code:         form.standard_code         ||null,
        lanyard_serial_no:     form.lanyard_serial_no     ||null,
        inspector_name:        form.inspector_name        ||null,
        inspector_id:          form.inspector_id          ||null,
        inspector_id_number:   form.inspector_id          ||null,
        inspection_body:       form.inspection_body       ||null,
        legal_framework:       form.legal_framework       ||null,
        defects_found:         form.defects_found         ||null,
        recommendations:       form.recommendations       ||null,
        comments:              form.comments              ||null,
        remarks:               form.comments              ||null,
        notes:                 finalNotes                 ||null,
        extracted_data:        mergedInspectionData       ||null,
        folder_id:             form.folder_id             ||null,
        folder_name:           form.folder_name           ||null,
        folder_position:       form.folder_position?Number(form.folder_position):null,
        ...sbpExtras,
      }).eq("id",id);
      if (e) throw e;
      setSuccess("Saved successfully.");
      setTimeout(()=>router.push(`/certificates/${id}`),900);
    } catch(e) {
      setError("Save failed: "+(e?.message||"Unknown error"));
    } finally { setSaving(false); }
  }

  async function searchLink(q) {
    if (!q||q.length<2) { setLinkResults([]); return; }
    setLinkLoading(true);
    const {data} = await supabase.from("certificates")
      .select("id,certificate_number,equipment_description,equipment_type,client_name,folder_id")
      .or(`certificate_number.ilike.%${q}%,equipment_description.ilike.%${q}%,client_name.ilike.%${q}%`)
      .neq("id",id).is("folder_id",null).limit(8);
    setLinkResults(data||[]);
    setLinkLoading(false);
  }

  async function handleLink(targetId) {
    setLinking(true);
    const folderId=form.folder_id||crypto.randomUUID();
    const folderName=form.folder_name||`Folder-${form.certificate_number||id.slice(0,8)}`;
    await Promise.all([
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:1}).eq("id",id),
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:bundle.length+2}).eq("id",targetId),
    ]);
    setLinking(false); setLinkSearch(""); setLinkResults([]);
    await load(); setSuccess("Linked.");
  }

  async function handleUnlinkOne(targetId) {
    setUnlinking(true);
    await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:null}).eq("id",targetId);
    setUnlinking(false); await load();
  }

  const isLinked = bundle.length > 0;

  const groupedRows = useMemo(()=>{
    const groups={};
    const query=dataSearch.trim().toLowerCase();
    const filtered=query?jsonRows.filter(r=>String(r.label||"").toLowerCase().includes(query)||String(r.value||"").toLowerCase().includes(query)||String(r.section||"").toLowerCase().includes(query)):jsonRows;
    filtered.forEach(row=>{ if (!groups[row.section]) groups[row.section]=[]; groups[row.section].push(row); });
    return groups;
  },[jsonRows,dataSearch]);

  const sectionEntries = useMemo(()=>Object.entries(groupedRows),[groupedRows]);
  const sectionCount   = sectionEntries.length;
  const toggleCollapse = useCallback((sec)=>setCollapsed(p=>({...p,[sec]:!p[sec]})),[]);

  const inspFieldCount = notesMode==="sbp" ? Object.keys(SBP_DEFAULT_CHECKLIST).length
    : notesMode==="cherry" ? Object.values(cpData).filter(v=>v&&String(v).trim()&&v!=="PASS"&&v!=="Satisfactory").length
    : notesMode==="wrs"    ? Object.values(wrsData).filter(v=>v&&String(v).trim()).length
    : notesMode==="json"   ? jsonRows.length : notePairs.length;

  const modeColor = notesMode==="cherry"?T.orange:notesMode==="wrs"?T.blue:notesMode==="sbp"?T.orange:T.accent;
  const modeDim   = notesMode==="cherry"?T.orangeDim:notesMode==="wrs"?T.blueDim:notesMode==="sbp"?T.orangeDim:T.accentDim;
  const modeBrd   = notesMode==="cherry"?T.orangeBrd:notesMode==="wrs"?T.blueBrd:notesMode==="sbp"?T.orangeBrd:T.accentBrd;

  const SaveBtn = () => (
    <button type="button" onClick={handleSave} disabled={saving}
      style={{padding:"12px 28px",borderRadius:11,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
      {saving?"Saving…":"💾 Save Changes"}
    </button>
  );

  function getModeButtons() {
    if (equipIsSandblastingPot) return [["sbp","🪣 SBP"],["json","Grouped"],["pipe","Simple"]];
    if (equipIsCherryPicker)    return [["cherry","🚡 AWP"],["json","Grouped"],["pipe","Simple"]];
    if (equipIsWireRopeSling)   return [["wrs","🪢 Sling"],["json","Grouped"],["pipe","Simple"]];
    return [["json","Grouped"],["pipe","Simple"]];
  }

  function switchMode(m) {
    if (m===notesMode) return;
    const built = notesMode==="json"?rebuildNotesJson(jsonRows)
      :notesMode==="cherry"?buildCherryPickerNotes(cpData)
      :notesMode==="wrs"?buildWireRopeSlingNotes(wrsData)
      :notesMode==="sbp"?buildSandblastingNotes(sbpData)
      :buildNotesPipe(notePairs);
    if (m==="sbp")    { setSbpData(parseSandblastingNotes(built,baseExtractedData)); }
    else if (m==="cherry") { setCpData(parseCherryPickerNotes(built)); }
    else if (m==="wrs")    { setWrsData(parseWireRopeSlingNotes(built)); }
    else if (m==="json")   { setJsonRows(flattenNotesJson(built)); }
    setNotesMode(m);
  }

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
        .id-table{width:100%;border-collapse:collapse;font-size:13px}
        .id-table tr{border-bottom:1px solid ${T.border}}
        .id-table tr:last-child{border-bottom:none}
        .id-table tr:hover td{background:rgba(34,211,238,0.03)}
        .id-param{padding:9px 14px;width:42%;font-weight:600;color:${T.textMid};font-size:12px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:0}
        .id-val{padding:6px 8px 6px 0;vertical-align:middle}
        .id-del{padding:6px 8px;vertical-align:middle;width:36px}
        .id-val input{width:100%;padding:7px 10px;border-radius:7px;border:1px solid transparent;background:transparent;font-size:12px;font-family:'IBM Plex Sans',sans-serif;outline:none;transition:all .15s;min-height:36px}
        .id-val input:hover{border-color:${T.border};background:rgba(18,30,50,0.5)}
        .id-val input:focus{border-color:${T.accent}!important;background:rgba(18,30,50,0.8)}
        .id-sec-hdr{display:flex;align-items:center;gap:8px;padding:7px 14px;background:rgba(11,29,58,0.7);border-bottom:1px solid ${T.accentBrd};cursor:pointer;user-select:none}
        .id-sec-hdr:hover{background:rgba(34,211,238,0.06)}
        .id-sec-label{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${T.accent};flex:1}
        .id-sec-count{font-size:9px;color:${T.textDim};background:${T.accentDim};border:1px solid ${T.accentBrd};padding:1px 7px;border-radius:99px}
        .id-sec-chevron{font-size:10px;color:${T.textDim};transition:transform .15s}
        @media(max-width:640px){.ceg{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",color:T.text,padding:20,minHeight:"100vh"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:14}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px 20px",backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:6}}>Edit Certificate</div>
                <h1 style={{margin:"0 0 4px",fontSize:"clamp(17px,3vw,22px)",fontWeight:900}}>{form.certificate_number||"Certificate"}</h1>
                <p style={{margin:0,color:T.textDim,fontSize:12}}>
                  {form.certificate_type}{form.equipment_type?` · ${form.equipment_type}`:""}
                  {equipIsSandblastingPot&&<span style={{marginLeft:8,color:T.orange,fontWeight:800}}>🪣 SBP</span>}
                  {equipIsCherryPicker&&<span style={{marginLeft:8,color:T.orange,fontWeight:800}}>🚡 AWP</span>}
                  {equipIsWireRopeSling&&<span style={{marginLeft:8,color:T.blue,fontWeight:800}}>🪢 WRS</span>}
                  {isLinked&&<span style={{marginLeft:10,color:T.purple}}>📁 {bundle.length} in folder</span>}
                </p>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button type="button" onClick={()=>router.push(`/certificates/${id}`)}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <button type="button" onClick={()=>window.open(`/certificates/print/${id}`,"_blank")}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🖨 Print</button>
                <SaveBtn/>
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading…</div>
            </div>
          ):(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:18}}>

              {/* TABS */}
              <div className="ce-tabs">
                {TABS.map((t,i)=>(
                  <button key={t} type="button" className={`ce-tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>
                    {t}
                    {i===4&&inspFieldCount>0&&(
                      <span style={{marginLeft:5,fontSize:9,padding:"1px 6px",borderRadius:99,background:modeDim,color:modeColor,border:`1px solid ${modeBrd}`}}>
                        {notesMode==="cherry"?"AWP":notesMode==="wrs"?"WRS":notesMode==="sbp"?"SBP":inspFieldCount}
                      </span>
                    )}
                    {i===5&&isLinked&&(
                      <span style={{marginLeft:5,fontSize:9,padding:"1px 6px",borderRadius:99,background:T.purpleDim,color:T.purple,border:`1px solid ${T.purpleBrd}`}}>{bundle.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── TAB 0: CERTIFICATE ── */}
              {tab===0&&(
                <div className="ceg">
                  <F label="Certificate Number"><input name="certificate_number" value={form.certificate_number} onChange={hc} style={IS}/></F>
                  <F label="Certificate Type"><select name="certificate_type" value={form.certificate_type} onChange={hc} style={IS}>{CERT_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
                  <F label="Result" span={2}><ResultChips value={form.result} onChange={v=>setForm(p=>({...p,result:v}))} options={RESULTS}/></F>
                  <F label="Status"><select name="status" value={form.status} onChange={hc} style={IS}>{["active","expired","suspended","cancelled"].map(s=><option key={s}>{s}</option>)}</select></F>
                  <F label="Inspection Number"><input name="inspection_number" value={form.inspection_number} onChange={hc} style={IS}/></F>
                  <F label="Issue Date"><input name="issue_date" type="date" value={form.issue_date} onChange={hc} style={IS}/></F>
                  <F label="Inspection Date"><input name="inspection_date" type="date" value={form.inspection_date} onChange={hc} style={IS}/></F>
                  <F label="Expiry Date"><input name="expiry_date" type="date" value={form.expiry_date} onChange={hc} style={IS}/></F>
                  <F label="Next Inspection Due"><input name="next_inspection_due" type="date" value={form.next_inspection_due} onChange={hc} style={IS}/></F>
                  <F label="Defects Found" span={2}><textarea name="defects_found" value={form.defects_found} onChange={hc} rows={3} style={{...IS,minHeight:80}}/></F>
                  <F label="Recommendations" span={2}><textarea name="recommendations" value={form.recommendations} onChange={hc} rows={2} style={IS}/></F>
                  <F label="Comments / Remarks" span={2}><textarea name="comments" value={form.comments} onChange={hc} rows={2} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 1: EQUIPMENT ── */}
              {tab===1&&(
                <div className="ceg">
                  <F label="Equipment Type"><EquipmentTypeSelect value={form.equipment_type} onChange={hcEquipType} style={IS}/></F>
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
              {tab===2&&(
                <div className="ceg">
                  <F label="Safe Working Load (SWL)"><input name="swl" value={form.swl} onChange={hc} style={IS} placeholder="e.g. 5T, 250kg"/></F>
                  <F label="Capacity / Volume"><input name="capacity_volume" value={form.capacity_volume} onChange={hc} style={IS} placeholder="e.g. 500L, Ø26mm"/></F>
                  <F label="Working Pressure"><input name="working_pressure" value={form.working_pressure} onChange={hc} style={IS}/></F>
                  <F label="Design Pressure"><input name="design_pressure" value={form.design_pressure} onChange={hc} style={IS}/></F>
                  <F label="Test Pressure"><input name="test_pressure" value={form.test_pressure} onChange={hc} style={IS}/></F>
                  <F label="Pressure Unit"><select name="pressure_unit" value={form.pressure_unit} onChange={hc} style={IS}><option value="">Select…</option>{P_UNITS.map(u=><option key={u}>{u}</option>)}</select></F>
                  <F label="Material"><input name="material" value={form.material} onChange={hc} style={IS}/></F>
                  <F label="Standard / Code"><input name="standard_code" value={form.standard_code} onChange={hc} style={IS} placeholder="e.g. EN 361, SANS 347"/></F>
                  <F label="Lanyard Serial No."><input name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 3: INSPECTOR ── */}
              {tab===3&&(
                <div className="ceg">
                  <F label="Inspector Name"><input name="inspector_name" value={form.inspector_name} onChange={hc} style={IS}/></F>
                  <F label="Inspector ID / Cert Number"><input name="inspector_id" value={form.inspector_id} onChange={hc} style={IS}/></F>
                  <F label="Inspection Body"><input name="inspection_body" value={form.inspection_body} onChange={hc} style={IS}/></F>
                  <F label="Legal Framework" span={2}><input name="legal_framework" value={form.legal_framework} onChange={hc} style={IS}/></F>
                </div>
              )}

              {/* ── TAB 4: INSPECTION DATA ── */}
              {tab===4&&(
                <div style={{display:"grid",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:T.text}}>Inspection Data</div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:2}}>
                        {notesMode==="sbp"?"Sandblasting Pot — 2-page cert: checklist, wall thickness, test cert & signatures"
                          :notesMode==="cherry"?"Cherry Picker / AWP — boom & platform structured fields"
                          :notesMode==="wrs"?"Wire Rope Sling — sling details & condition assessment"
                          :notesMode==="json"?`${jsonRows.length} fields · ${sectionCount} sections`
                          :`${notePairs.length} fields`}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
                        {getModeButtons().map(([m,lbl])=>(
                          <button key={m} type="button" onClick={()=>switchMode(m)}
                            style={{padding:"6px 12px",border:"none",background:notesMode===m?(m==="cherry"||m==="sbp"?T.orangeDim:m==="wrs"?T.blueDim:T.accentDim):"transparent",color:notesMode===m?(m==="cherry"||m==="sbp"?T.orange:m==="wrs"?T.blue:T.accent):T.textDim,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                      {notesMode==="pipe"&&(
                        <button type="button" onClick={addPair}
                          style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                          + Add Row
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SBP MODE */}
                  {notesMode==="sbp"&&(
                    <div style={{border:`1px solid ${T.orangeBrd}`,borderRadius:10,padding:16,background:"rgba(251,146,60,0.04)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.orangeBrd}`}}>
                        <span style={{fontSize:18}}>🪣</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:T.orange}}>Sandblasting Pot Inspector</div>
                          <div style={{fontSize:11,color:T.textDim,marginTop:1}}>
                            Edits both pages: Page 1 (checklist, wall thickness) and Page 2 (test cert, signatures).
                          </div>
                        </div>
                      </div>
                      <SandblastingPotEditor sbp={sbpData} onChange={setSbpData}/>
                    </div>
                  )}

                  {/* WRS MODE */}
                  {notesMode==="wrs"&&(
                    <div style={{border:`1px solid ${T.blueBrd}`,borderRadius:10,padding:16,background:"rgba(96,165,250,0.04)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.blueBrd}`}}>
                        <span style={{fontSize:18}}>🪢</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:T.blue}}>Wire Rope Sling Inspector</div>
                          <div style={{fontSize:11,color:T.textDim,marginTop:1}}>Edit sling details and condition assessment.</div>
                        </div>
                      </div>
                      <WireRopeSlingEditor wrs={wrsData} onChange={setWrsData}/>
                    </div>
                  )}

                  {/* CHERRY MODE */}
                  {notesMode==="cherry"&&(
                    <div style={{border:`1px solid ${T.orangeBrd}`,borderRadius:10,padding:16,background:"rgba(251,146,60,0.04)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.orangeBrd}`}}>
                        <span style={{fontSize:18}}>🚡</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:T.orange}}>Cherry Picker / AWP Inspector</div>
                          <div style={{fontSize:11,color:T.textDim,marginTop:1}}>Fills Page 1 (AWP Machine — 12 months) and Page 2 (Platform/Bucket — 6 months).</div>
                        </div>
                      </div>
                      <CherryPickerEditor cp={cpData} onChange={setCpData}/>
                    </div>
                  )}

                  {/* JSON MODE */}
                  {notesMode==="json"&&(
                    <>
                      {jsonRows.length>0&&(
                        <input value={dataSearch} onChange={e=>setDataSearch(e.target.value)} placeholder="🔍  Search parameters or values…" style={{...IS,minHeight:40,fontSize:12}}/>
                      )}
                      {jsonRows.length===0?(
                        <div style={{padding:"32px 20px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:12,color:T.textDim,fontSize:13}}>
                          No inspection data found.{equipIsSandblastingPot?" Switch to 🪣 SBP mode.":equipIsCherryPicker?" Switch to 🚡 AWP mode.":equipIsWireRopeSling?" Switch to 🪢 Sling mode.":""}
                        </div>
                      ):(
                        <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                          {sectionEntries.map(([section,rows],gi)=>{
                            const isCollapsed=collapsed[section];
                            return (
                              <div key={section} style={{borderBottom:gi<sectionEntries.length-1?`1px solid ${T.border}`:"none"}}>
                                <div className="id-sec-hdr" onClick={()=>toggleCollapse(section)}>
                                  <span className="id-sec-chevron" style={{transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}}>▾</span>
                                  <span className="id-sec-label">{section}</span>
                                  <span className="id-sec-count">{rows.length}</span>
                                </div>
                                {!isCollapsed&&(
                                  <table className="id-table"><tbody>
                                    {rows.map((row,ri)=>(
                                      <JsonInspectionRow key={row.id} row={row} rowIndex={ri} onChange={updateJsonRow} onRemove={removeJsonRow}/>
                                    ))}
                                  </tbody></table>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div style={{border:`1px solid ${T.greenBrd}`,borderRadius:10,padding:14,background:T.greenDim}}>
                        <div style={{fontSize:11,fontWeight:800,color:T.green,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>+ Add New Field</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
                          <div>
                            <label style={{...LS,color:T.green}}>Section</label>
                            <input value={addSection} onChange={e=>setAddSection(e.target.value)} list="section-suggestions" placeholder="e.g. Checklist, Boom…" style={{...IS,minHeight:40,fontSize:12}}/>
                            <datalist id="section-suggestions">{[...new Set(jsonRows.map(r=>r.section))].map(s=><option key={s} value={s}/>)}</datalist>
                          </div>
                          <div>
                            <label style={{...LS,color:T.green}}>Field Name</label>
                            <input value={addKey} onChange={e=>setAddKey(e.target.value)} placeholder="e.g. boom_length" style={{...IS,minHeight:40,fontSize:12}}/>
                          </div>
                          <div>
                            <label style={{...LS,color:T.green}}>Value</label>
                            <input value={addValue} onChange={e=>setAddValue(e.target.value)} placeholder="e.g. PASS, 36m…" style={{...IS,minHeight:40,fontSize:12}} onKeyDown={e=>e.key==="Enter"&&addJsonRow()}/>
                          </div>
                          <button type="button" onClick={addJsonRow}
                            style={{height:40,padding:"0 18px",borderRadius:9,border:"none",background:T.green,color:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Add</button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* PIPE MODE */}
                  {notesMode==="pipe"&&(
                    notePairs.length===0?(
                      <div style={{padding:"32px 20px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:12,color:T.textDim,fontSize:13}}>
                        No fields. Click <strong style={{color:T.green}}>+ Add Row</strong> to add one.
                      </div>
                    ):(
                      <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 36px",background:"rgba(11,29,58,0.8)",borderBottom:`1px solid ${T.border}`,padding:"7px 14px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.08em"}}>Parameter</div>
                          <div style={{fontSize:10,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.08em"}}>Value</div>
                          <div/>
                        </div>
                        <table className="id-table" style={{width:"100%"}}>
                          <tbody>
                            {notePairs.map((pair,i)=>(
                              <tr key={i} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.015)"}}>
                                <td className="id-param">
                                  <input value={pair.key} onChange={e=>updatePair(i,"key",e.target.value)} placeholder="Field name"
                                    style={{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid transparent",background:"transparent",color:T.textMid,fontSize:12,fontFamily:"inherit",outline:"none"}}
                                    onFocus={e=>{e.target.style.borderColor=T.accent;e.target.style.background="rgba(18,30,50,0.8)";}}
                                    onBlur={e=>{e.target.style.borderColor="transparent";e.target.style.background="transparent";}}/>
                                </td>
                                <td className="id-val">
                                  <input value={pair.value} onChange={e=>updatePair(i,"value",e.target.value)} placeholder="Value"
                                    style={{color:valueColor(pair.value),fontWeight:/PASS|FAIL|YES|NO|REPAIR/.test((pair.value||"").toUpperCase())?800:500}}/>
                                </td>
                                <td className="id-del">
                                  <button type="button" onClick={()=>removePair(i)}
                                    style={{width:28,height:28,borderRadius:6,border:`1px solid ${T.redBrd}`,background:"transparent",color:T.red,fontWeight:800,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:0.6}}
                                    onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ── TAB 5: FOLDER ── */}
              {tab===5&&(
                <div style={{display:"grid",gap:16}}>
                  <div style={{background:T.purpleDim,border:`1px solid ${T.purpleBrd}`,borderRadius:12,padding:16}}>
                    <div style={{fontSize:12,fontWeight:800,color:T.purple,marginBottom:12}}>📁 Folder Metadata</div>
                    <div className="ceg">
                      <F label="Folder ID"><input name="folder_id" value={form.folder_id} onChange={hc} style={IS} placeholder="Auto-generated UUID"/></F>
                      <F label="Folder Name"><input name="folder_name" value={form.folder_name} onChange={hc} style={IS}/></F>
                      <F label="Position in Folder"><input name="folder_position" type="number" min={1} value={form.folder_position} onChange={hc} style={IS}/></F>
                    </div>
                  </div>
                  {isLinked&&(
                    <div>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>Certificates in folder ({bundle.length})</div>
                      <div style={{display:"grid",gap:8}}>
                        {bundle.map((item,i)=>{
                          const isMe=String(item.id)===String(id);
                          return (
                            <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"11px 14px",borderRadius:11,border:`1px solid ${isMe?T.accentBrd:T.border}`,background:isMe?T.accentDim:T.card}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{item.certificate_number||"—"}</span>
                                  {isMe&&<span style={{fontSize:9,fontWeight:800,color:T.accent}}>← THIS</span>}
                                  <span style={{fontSize:9,color:T.textDim}}>Pos {item.folder_position||i+1}</span>
                                </div>
                                <div style={{fontSize:11,color:T.textDim}}>{item.equipment_type||"—"} · {item.equipment_description||"—"}</div>
                              </div>
                              <div style={{display:"flex",gap:8}}>
                                {!isMe&&(<button type="button" onClick={()=>router.push(`/certificates/${item.id}/edit`)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>)}
                                <button type="button" onClick={()=>handleUnlinkOne(item.id)} disabled={unlinking}
                                  style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                                  {unlinking?"…":"Unlink"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>
                      {isLinked?"Add to This Folder":"Link to Another Certificate"}
                    </div>
                    <input value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="Search cert number, equipment, client…" style={{...IS,marginBottom:10}}/>
                    {linkLoading&&<div style={{fontSize:12,color:T.textDim,padding:"6px 0"}}>Searching…</div>}
                    {!linkLoading&&linkSearch.length>=2&&linkResults.length===0&&(<div style={{fontSize:12,color:T.textDim,padding:"6px 0"}}>No unlinked certificates found</div>)}
                    <div style={{display:"grid",gap:8}}>
                      {linkResults.map(cert=>(
                        <div key={cert.id} onClick={()=>!linking&&handleLink(cert.id)}
                          style={{cursor:"pointer",padding:"11px 14px",borderRadius:11,border:`1px solid ${T.border}`,background:T.card}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.accentDim}
                          onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{cert.certificate_number||"—"}</div>
                              <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{cert.equipment_description||"—"} · {cert.equipment_type||""}</div>
                              {cert.client_name&&<div style={{fontSize:11,color:T.textDim}}>{cert.client_name}</div>}
                            </div>
                            <button type="button" disabled={linking}
                              style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                              {linking?"Linking…":"Link →"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SAVE ROW */}
              <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}`,display:"flex",gap:10,flexWrap:"wrap"}}>
                <SaveBtn/>
                <button type="button" onClick={()=>router.push(`/certificates/${id}`)}
                  style={{padding:"12px 18px",borderRadius:11,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
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
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontSize:14,fontFamily:"'IBM Plex Sans',sans-serif"}}>Loading…</div>
    }>
      <CertificateEditInner/>
    </Suspense>
  );
}
