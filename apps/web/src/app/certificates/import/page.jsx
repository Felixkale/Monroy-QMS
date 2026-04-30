// src/app/certificates/import/page.jsx
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

/* ════════════════════════════════════════════════════════════════════════════
   DOC_PROMPT — COMPLETE EXTRACTION PROMPT
   Instructs Gemini to extract every visible field from any certificate type.
   Handles: single-page, 2-page (compliance + test cert), nameplates, lists.
════════════════════════════════════════════════════════════════════════════ */
const DOC_PROMPT = `You are a senior industrial inspection AI for a QMS (Quality Management System).

Your task: Extract EVERY piece of visible data from this certificate, nameplate, or inspection document.
NEVER omit any field. If a field exists in the document, extract it — even if it seems minor.

══════════════════════════════════════════════════════════════════
SECTION 1: STANDARD TOP-LEVEL FIELDS
══════════════════════════════════════════════════════════════════
Always populate these fields if the information exists anywhere in the document:

equipment_type
  Identify precisely. Examples:
  "Portable Oven", "Mobile Crane", "Overhead Crane / EOT Crane", "Pressure Vessel",
  "Air Receiver", "Sandblasting Pot", "Wire Rope Sling", "Chain Block", "Telehandler",
  "Cherry Picker / AWP", "Forklift", "Fork Arm", "Hook", "Wire Rope", "Shackle",
  "Safety Harness", "Lanyard", "Scaffolding", "Fire Extinguisher", "Boiler", "Compressor"

equipment_description
  Full description as printed in the document.

manufacturer
  Brand or maker name exactly as printed. Do NOT guess or expand abbreviations.

model
  Model number or name as printed.

serial_number
  Read from: S/No., Serial No., S/N, Identification Number, ID No., Vessel Unique ID.
  Copy EXACTLY as printed — do not reformat.

fleet_number
  Fleet number or asset number if shown.

registration_number
  Vehicle registration plate number if shown.

asset_tag
  Any tag number written in paint/marker separate from the serial number.

year_built
  Year of manufacture only. Do NOT put this in inspection_date.

swl
  Safe Working Load / WLL / Capacity. Include the unit. Examples: "3T", "5000kg", "1.5 ton".

working_pressure
  Actual working / operating pressure. Include value only (no unit — put unit in pressure_unit).

design_pressure
  Design or rated pressure. Include value only.

test_pressure
  Test or hydrostatic test pressure value only.

pressure_unit
  Unit for pressures: "kPa", "bar", "psi", "MPa". Pick from document.

mawp
  Maximum Allowable Working Pressure if explicitly labelled MAWP.

capacity_volume
  Volume, capacity, weight or size of equipment. Examples: "200L", "5kg", "500mm".

material
  Material of construction. Example: "Carbon Steel", "Stainless Steel 316".

standard_code
  ALL certification marks, standards, and Acts/Regulations mentioned ANYWHERE in the document.
  Combine into one string separated by " · ".
  Examples: "Factories Act CAP 44:01", "MQWM Act CAP 44:02 · ISO 9001", "EN 13157 · CE".

inspection_number
  Report number, inspection number, job number if shown.

client_name
  Client / company / customer name. Read from COMPANY field, CLIENT field, or document header.

location
  Site name or equipment location. Read from EQUIPMENT LOCATION, SITE, LOCATION fields.

inspection_date
  Date the inspection was PERFORMED. Format: YYYY-MM-DD.
  ⚠ CRITICAL: "Date:" on a nameplate = manufacture date → put in year_built, NOT here.
  Only populate inspection_date from a certificate document, not a nameplate photo.

expiry_date
  Next inspection due date / expiry date. Format: YYYY-MM-DD.
  Read from: EXPIRY DATE, NEXT INSPECTION DATE, VALID UNTIL, NEXT INSPECTION DUE.

inspector_name
  Full name of the inspector / competent person.

inspector_id
  Inspector ID number / competency number / registration number.

inspection_body
  Name of the inspection company or body (if different from Monroy).

result
  Overall result. Must be exactly one of: "PASS", "FAIL", "CONDITIONAL".
  Read from: EQUIPMENT STATUS, RESULT, PASS/FAIL indicator.
  If the document shows "PASS THOROUGH INSPECTION" → "PASS".
  If "Safe for operation subject to corrective action" is selected → "CONDITIONAL".
  If "Not safe for operation" is selected → "FAIL".

defects_found
  Any defects, faults, or non-conformances listed. Copy verbatim.

recommendations
  Any recommendations or corrective actions listed. Copy verbatim.

comments
  Any other remarks, notes, or observations. Copy verbatim.

machine_hours
  Odometer or machine hours reading if shown.

nameplate_data
  Raw text from nameplate if document is a nameplate photo. Copy everything visible.

raw_text_summary
  Write a concise 1-2 sentence summary of what this document is.
  Example: "Portable Welding Oven Compliance Certificate issued by Gulf Stream Energy.
  Equipment passed inspection with a recommendation for corrective action. Inspector: Moemedi Masupe."

══════════════════════════════════════════════════════════════════
SECTION 2: EXTRACTED_DATA OBJECT
══════════════════════════════════════════════════════════════════
Put ALL additional structured data inside the "extracted_data" object.
Every key below must be included if the relevant data exists in the document.

─── 2A. MULTI-PAGE DETECTION ───────────────────────────────────
has_second_page: true | false
  Set TRUE if the document contains BOTH:
  (a) a Compliance Certificate page AND (b) a Test Certificate page.
  Also TRUE if you see: structural integrity assessment, functional test verification,
  overall assessment table, "PASS THOROUGH INSPECTION / FAILED" row, or
  "Failure to Comply" clause on a second page.
  The Gulf Stream Energy example has 2 pages → has_second_page: true.

─── 2B. LEGISLATION ─────────────────────────────────────────────
legislation: []
  Array of ALL Acts, Regulations, and Standards mentioned ANYWHERE in the document.
  Read from: title, subtitle, footer, body text, "FAILURE TO COMPLY" sections.
  Examples:
    ["Factories Act CAP 44:01"]
    ["Mines, Quarries, Works and Machinery Act CAP 44:02", "Factories Act CAP 44:01"]
    ["Factories Act CAP 44:01", "EN 13157", "ISO 9001"]
  Include section numbers if mentioned: "Factories Act CAP 44:01 (s70, s71, s72)".

─── 2C. PARTNERS ────────────────────────────────────────────────
partners: []
  Array of partner/client company names shown in an "OUR PARTNERS" section.
  Example: ["Lycopodium", "SMEI PROJECTS", "Onetrack Engineering", "Metso Outotec Australia limited"]
  Leave empty array [] if no partners section exists.

─── 2D. FAILURE TO COMPLY ───────────────────────────────────────
failure_to_comply: ""
  The FULL verbatim text of any "Failure to Comply" or "Non-Compliance" clause.
  Example: "Failure to comply may result in prosecution under section 70, penalties under
  section 71, or court ordered remedial action under section 72 of the Factories Act Cap 44:01"
  Leave empty string "" if not present.

─── 2E. TEST CERTIFICATE PAGE DATA (Page 2) ─────────────────────
These fields come from the TEST CERTIFICATE page (page 2) of a 2-page document.

source_cert_number: ""
  The certificate number shown on the TEST CERTIFICATE page.
  This may differ from our internal cert number. Example: "GSE-0001".

structural_integrity: "Passed" | "Failed" | ""
  Result of "Structural Integrity Assessment" from the test cert page.

structural_integrity_assessment: "Passed" | "Failed" | ""
  Same value as structural_integrity (include both keys for compatibility).

functional_test: "Passed" | "Failed" | ""
  Result of "Functional Test Verification" from the test cert page.

functional_test_verification: "Passed" | "Failed" | ""
  Same value as functional_test (include both keys for compatibility).

overall_assessment: ""
  The SELECTED overall assessment option from the test cert page.
  Read which checkbox/cell is highlighted or marked.
  Must be one of:
    "Safe for operation"
    "Safe for operation subject to corrective action"
    "Not safe for operation"

─── 2F. EQUIPMENT TECHNICAL SPECS ──────────────────────────────
power_voltage: ""
  Electrical power voltage specification. Example: "AC 220V", "3-phase 380V".
  Read from: POWER VOLTAGE, VOLTAGE field.

voltage: ""
  Same as power_voltage (include both keys).

weight: ""
  Weight of the equipment in kg. Example: "5kg", "120 kg".
  Read from: WEIGHT(KG), WEIGHT field.

─── 2G. CHECKLIST ───────────────────────────────────────────────
checklist: {}
  Object containing ALL checklist inspection items and their results.
  Key = item name (snake_case), Value = "PASS", "FAIL", or "N/A".
  Example:
  {
    "structural_integrity": "PASS",
    "hydraulic_system": "PASS",
    "brake_system": "PASS",
    "tyres": "PASS",
    "fire_extinguisher": "PASS",
    "emergency_stop": "PASS",
    "oil_leaks": "PASS",
    "lights_and_horn": "PASS"
  }
  Leave empty object {} if no checklist section exists.

─── 2H. BOOM / LOAD TEST DATA ───────────────────────────────────
boom: {}
  For cranes, cherry pickers, telehandlers, AWPs. Include ALL fields present:
  {
    max_height: "",
    min_boom_length: "",
    max_boom_length: "",
    actual_boom_length: "",
    extended_boom_length: "",
    boom_angle: "",
    min_radius: "",
    max_radius: "",
    load_tested_at_radius: "",
    swl_at_min_radius: "",
    swl_at_max_radius: "",
    swl_at_actual_config: "",
    test_load: "",
    boom_structure: "",
    boom_pins: "",
    boom_wear: "",
    luffing_system: "",
    slew_system: "",
    hoist_system: "",
    lmi_test: "",
    anti_two_block: "",
    jib_fitted: "",
    notes: ""
  }
  Leave empty object {} if not applicable.

─── 2I. BUCKET / PLATFORM DATA ──────────────────────────────────
bucket: {}
  For cherry pickers, AWPs, man baskets. Include ALL fields present:
  {
    serial_number: "",
    manufacturer: "",
    platform_swl: "",
    platform_dimensions: "",
    platform_material: "",
    test_load_applied: "",
    platform_structure: "",
    platform_floor: "",
    guardrails: "",
    toe_boards: "",
    gate_latch: "",
    platform_mounting: "",
    rotation: "",
    harness_anchors: "",
    swl_marking: "",
    paint_condition: "",
    levelling_system: "",
    emergency_lowering: "",
    emergency_stop: "",
    overload_device: "",
    tilt_alarm: "",
    intercom: ""
  }
  Leave empty object {} if not applicable.

─── 2J. SLING / ROPE DATA ───────────────────────────────────────
sling_details: {}
  For wire rope slings, chain slings, web slings:
  {
    type: "",
    diameter_mm: "",
    length_m: "",
    num_legs: "",
    construction: "",
    core_type: "",
    swl: ""
  }

condition_assessment: {}
  For slings and ropes:
  {
    corrosion: "",
    broken_wires: "",
    rope_kinks_deforming: "",
    reduction_in_diameter: "",
    condition_of_end_fittings: "",
    bird_caging_core_protrusion: "",
    serviceability: "",
    overall_assessment: ""
  }

─── 2K. HOOK & ROPE DATA ────────────────────────────────────────
hookrope: {}
  For hook and rope inspection reports:
  {
    drum_main_condition: "",
    drum_aux_condition: "",
    rope_lay_main: "",
    rope_lay_aux: "",
    rope_diameter_main: "",
    rope_diameter_aux: "",
    rope_length_3x_main: "",
    rope_length_3x_aux: "",
    reduction_dia_main: "",
    reduction_dia_aux: "",
    corrosion_main: "",
    corrosion_aux: "",
    broken_wires_main: "",
    broken_wires_aux: "",
    rope_kinks_main: "",
    rope_kinks_aux: "",
    other_defects_main: "",
    other_defects_aux: "",
    end_fittings_main: "",
    end_fittings_aux: "",
    serviceability_main: "",
    serviceability_aux: "",
    lower_limit_main: "",
    lower_limit_aux: "",
    damaged_strands_main: "",
    damaged_strands_aux: "",
    hook1_sn: "",
    hook1_swl: "",
    hook1_swl_marked: "",
    hook1_safety_catch: "",
    hook1_cracks: "",
    hook1_swivel: "",
    hook1_corrosion: "",
    hook1_side_bending: "",
    hook1_ab: "",
    hook1_ac: "",
    hook2_sn: "",
    hook2_swl: "",
    hook2_swl_marked: "",
    hook2_safety_catch: "",
    hook2_cracks: "",
    hook2_swivel: "",
    hook2_corrosion: "",
    hook2_side_bending: "",
    hook2_ab: "",
    hook2_ac: "",
    hook3_sn: "",
    hook3_swl: "",
    report_number: ""
  }

─── 2L. SANDBLASTING POT DATA ───────────────────────────────────
sandblasting: {}
  For sandblasting pots, blasting vessels, abrasive blasting equipment:
  {
    vessel_unique_id: "",
    equipment_owner: "",
    location: "",
    inspection_frequency: "",
    year_of_manufacture: "",
    previous_inspection: "",
    design_pressure: "",
    working_pressure: "",
    test_pressure: "",
    vessel_material: "",
    manufacturer: "",
    pressure_unit: "",
    volume: "",
    circumference: "",
    height: "",
    pressure_gauge_no: "",
    pressure_relief_no: "",
    relief_valve_set_pressure: "",
    min_max_temp: "",
    pressure_relief_type: "",
    test_type: "",
    original_shell_thickness: "",
    measured_shell_thickness: "",
    allowable_reduction: "",
    wall_thickness_readings: [],
    comments: "",
    checklist: {
      pipe_connections: "",
      valves_fittings_construction: "",
      fittings_pressure_rating: "",
      drain_valves: "",
      no_leaks_pipework: "",
      vessel_access: "",
      no_leaks_manholes: "",
      gauge_isolation_valve: "",
      relief_valve_calibrated: "",
      gauge_calibrated: "",
      gauge_redlined: "",
      vessel_material_standard: "",
      external_coating: "",
      no_corrosion: "",
      properly_mounted: "",
      welded_joints: "",
      no_dents_cracks: "",
      no_external_leakages: "",
      no_cracks_valve_body: "",
      no_foreign_material: "",
      valve_working: "",
      no_oil_sludge: "",
      interior_condition: "",
      no_moisture: "",
      no_scaling: "",
      internal_stiffeners: "",
      properly_levelled: "",
      drainage_hose: "",
      no_ground_contamination: "",
      automatic_drainage: ""
    }
  }

─── 2M. PRESSURE VESSEL CHECKLIST ───────────────────────────────
pressure_vessel_checklist: {}
  For pressure vessels, air receivers, boilers:
  {
    vessel_condition_external: "",
    vessel_condition_internal: "",
    safety_valve_fitted: "",
    pressure_gauge_fitted: "",
    drain_valve_fitted: "",
    signs_of_corrosion: "",
    nameplate_legible: "",
    hydrostatic_test: "",
    hydrostatic_test_pressure: "",
    overall_assessment: ""
  }

─── 2N. FORK ARMS ────────────────────────────────────────────────
forks: []
  Array of fork arm inspection data. One object per fork:
  [
    {
      fork_number: "",
      swl: "",
      length: "",
      thickness_heel: "",
      thickness_blade: "",
      wear_pct: "",
      cracks: "yes" | "no",
      bending: "yes" | "no",
      result: "PASS" | "FAIL"
    }
  ]

─── 2O. CRANE TEST CONFIGURATIONS ───────────────────────────────
crane_configs: []
  For mobile crane load test certificates (C1, C2, C3 configurations):
  [
    { config: "C1", boom: "", angle: "", radius: "", rated: "", test: "" },
    { config: "C2", boom: "", angle: "", radius: "", rated: "", test: "" },
    { config: "C3", boom: "", angle: "", radius: "", rated: "", test: "" }
  ]

sli_model: ""
  Safe Load Indicator make and model if shown.

sli_cert: ""
  SLI certificate number if shown.

operating_code: ""
  Operating code used during crane testing. Example: "MAIN/AUX-FULL OUTRIGGER-360DEG"

hook_reeving: ""
  Hook block reeving configuration.

counterweights: ""
  Counterweight configuration during test. Example: "STD FITTED"

jib: ""
  Jib configuration if fitted.

─── 2P. HORSE & TRAILER DATA ────────────────────────────────────
horse: {}
  For prime movers / horses:
  { make: "", model: "", reg: "", vin: "", year: "", fleet: "", gvm: "" }

trailer: {}
  For trailers:
  { make: "", model: "", reg: "", vin: "", year: "", fleet: "", gvm: "", result: "" }

══════════════════════════════════════════════════════════════════
SECTION 3: IMPORTANT RULES
══════════════════════════════════════════════════════════════════

DATE RULES (CRITICAL — do not get this wrong):
  ✓ "Date:" on nameplate = MANUFACTURE DATE → put ONLY in year_built field
  ✓ inspection_date = the date the inspection certificate was issued (from cert body)
  ✓ expiry_date = next inspection due / valid until date (from cert body)
  ✓ Format ALL dates as YYYY-MM-DD
  ✓ For nameplate-only photos: leave inspection_date and expiry_date as ""

RESULT MAPPING:
  ✓ "PASS", "Passed", "EQUIPMENT STATUS: PASS" → result: "PASS"
  ✓ "FAIL", "Failed", "Not safe for operation" → result: "FAIL"
  ✓ "Safe for operation subject to corrective action" → result: "CONDITIONAL"
  ✓ "PASS THOROUGH INSPECTION" checked → result: "PASS"

TWO-PAGE DETECTION:
  If you see any of these on the document → set has_second_page: true:
  ✓ Two separate certificate layouts (Compliance Cert + Test Cert)
  ✓ "Structural Integrity Assessment" section
  ✓ "Functional Test Verification" section
  ✓ Overall Assessment table with multiple options
  ✓ "PASS THOROUGH INSPECTION / FAILED" row
  ✓ "Failure to Comply" clause referencing section numbers of an Act

══════════════════════════════════════════════════════════════════
SECTION 4: OUTPUT FORMAT
══════════════════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown code fences. No explanation text. No comments.
Start your response with { and end with }.

{
  "equipment_type": "",
  "equipment_description": "",
  "manufacturer": "",
  "model": "",
  "serial_number": "",
  "fleet_number": "",
  "registration_number": "",
  "asset_tag": "",
  "year_built": "",
  "capacity_volume": "",
  "swl": "",
  "working_pressure": "",
  "design_pressure": "",
  "test_pressure": "",
  "pressure_unit": "",
  "mawp": "",
  "material": "",
  "standard_code": "",
  "inspection_number": "",
  "client_name": "",
  "location": "",
  "inspection_date": "",
  "expiry_date": "",
  "next_inspection_due": "",
  "inspector_name": "",
  "inspector_id": "",
  "inspection_body": "",
  "result": "",
  "defects_found": "",
  "recommendations": "",
  "comments": "",
  "machine_hours": "",
  "nameplate_data": "",
  "raw_text_summary": "",
  "extracted_data": {
    "has_second_page": false,
    "legislation": [],
    "partners": [],
    "failure_to_comply": "",
    "source_cert_number": "",
    "structural_integrity": "",
    "structural_integrity_assessment": "",
    "functional_test": "",
    "functional_test_verification": "",
    "overall_assessment": "",
    "power_voltage": "",
    "voltage": "",
    "weight": "",
    "checklist": {},
    "boom": {},
    "bucket": {},
    "sling_details": {},
    "condition_assessment": {},
    "hookrope": {},
    "sandblasting": {},
    "pressure_vessel_checklist": {},
    "forks": [],
    "crane_configs": [],
    "sli_model": "",
    "sli_cert": "",
    "operating_code": "",
    "hook_reeving": "",
    "counterweights": "",
    "jib": "",
    "horse": {},
    "trailer": {}
  }
}`;

/* ════════════════════════════════════════════════════════════════════════════
   LIST MODE PROMPT
════════════════════════════════════════════════════════════════════════════ */
function buildListPrompt(client, inspDate, expiryDate) {
  return `You are an expert OCR and data extraction AI specialising in industrial inspection equipment lists.

The image shows a HANDWRITTEN or PRINTED LIST of lifting/inspection equipment items.

YOUR TASK: Read EVERY single line in the image and extract each item as a JSON object.

OUTPUT FORMAT — return ONLY this exact JSON structure, nothing else:
{
  "items": [
    {
      "equipment_type": "Chain Block",
      "serial_number": "CB-001",
      "swl": "3T",
      "result": "PASS",
      "defects_found": "",
      "equipment_description": "Chain Block SN CB-001 SWL 3T",
      "manufacturer": "",
      "year_built": "",
      "asset_tag": "",
      "standard_code": "",
      "extracted_data": {}
    }
  ]
}

EQUIPMENT TYPE — pick the CLOSEST match from this list:
"Chain Block", "Manual Chain Hoist", "Electric Chain Hoist", "Lever Hoist / Tirfor",
"Chain Pulley Block", "Electric Wire Rope Hoist", "Wire Rope Winch",
"Mobile Crane", "Overhead Crane / EOT Crane", "Gantry Crane", "Jib Crane",
"Knuckle Boom Crane", "Davit Crane",
"Chain Sling", "Wire Rope Sling", "Web Sling / Flat Sling", "Round Sling",
"Multi-Leg Chain Sling", "Multi-Leg Wire Rope Sling",
"Shackle — Bow / Anchor", "Shackle — D / Dee", "Hook — Swivel", "Hook — Eye",
"Swivel", "Eye Bolt", "Turnbuckle", "Master Link",
"Spreader Beam", "Lifting Beam", "Adjustable Spreader Beam",
"Magnetic Lifter", "Vacuum Lifter Pad",
"Beam Clamp", "Plate Clamp — Vertical", "Plate Clamp — Horizontal", "Pipe Clamp",
"Safety Harness — Full Body", "Lanyard — Energy Absorbing", "Lanyard — Twin Leg",
"Self-Retracting Lifeline (SRL)", "Fall Arrest Block",
"Electric Winch", "Hydraulic Winch", "Snatch Block", "Pulley Block",
"Trestle Jack", "Bottle Jack", "Axle Jack", "Floor Jack", "Hydraulic Jack", "Jack Stand",
"Counterbalance Forklift", "Telehandler", "Scissor Lift",
"Boom Lift / Cherry Picker", "Personnel Basket / Man Basket",
"Pressure Vessel", "Air Receiver", "Boiler", "Compressor — Air", "Gas Cylinder",
"Sandblasting Pot", "Fork Arm", "Wire Rope", "Hook",
"Scaffold", "Fire Extinguisher", "Other"

READING RULES:
1. Read EVERY line — do NOT skip any item, even if handwriting is unclear
2. Ditto marks (" or ,, or do.) mean SAME equipment type as the line above — copy it
3. Serial number: make your best guess at what is written — never leave blank if anything visible
4. SWL/capacity: include the unit (e.g. "3T", "1000kg", "5 Ton")
5. result: "PASS" unless you see "Fail", "F", "X", "Reject", "Condemned" → then "FAIL"
6. defects_found: copy any note written next to that item verbatim
7. equipment_description: "TypeName SN serial SWL swl"
8. Skip ONLY column headers (like "S/N", "Description", "SWL", "Result", "No.")
9. If the image has multiple columns of items, read ALL columns
10. Put ANY extra per-item data in extracted_data object

IMPORTANT: Return ONLY the JSON object starting with { and ending with }.
No explanation, no markdown fences, no extra text before or after the JSON.

${client ? `Client name for all these items: ${client}` : ""}
${inspDate ? `Inspection date for all items: ${inspDate}` : ""}
${expiryDate ? `Expiry date for all items: ${expiryDate}` : ""}`;
}

/* ════════════════════════════════════════════════════════════════════════════
   CONSTANTS & UTILITIES
════════════════════════════════════════════════════════════════════════════ */
const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PARALLEL_LIMIT = 4;

const EQUIPMENT_TYPES = [
  "Chain Block","Manual Chain Hoist","Electric Chain Hoist","Lever Hoist / Tirfor","Chain Pulley Block",
  "Electric Wire Rope Hoist","Wire Rope Winch",
  "Mobile Crane","Overhead Crane / EOT Crane","Gantry Crane","Jib Crane","Knuckle Boom Crane","Davit Crane",
  "Chain Sling","Wire Rope Sling","Web Sling / Flat Sling","Round Sling","Multi-Leg Chain Sling","Multi-Leg Wire Rope Sling",
  "Shackle — Bow / Anchor","Shackle — D / Dee","Hook — Swivel","Hook — Eye","Swivel","Eye Bolt","Turnbuckle","Master Link",
  "Spreader Beam","Lifting Beam","Adjustable Spreader Beam","Magnetic Lifter","Vacuum Lifter Pad",
  "Beam Clamp","Plate Clamp — Vertical","Plate Clamp — Horizontal","Pipe Clamp",
  "Safety Harness — Full Body","Lanyard — Energy Absorbing","Lanyard — Twin Leg",
  "Self-Retracting Lifeline (SRL)","Fall Arrest Block",
  "Electric Winch","Hydraulic Winch","Snatch Block","Pulley Block",
  "Trestle Jack","Bottle Jack","Axle Jack","Floor Jack","Hydraulic Jack","Jack Stand",
  "Counterbalance Forklift","Telehandler","Scissor Lift","Boom Lift / Cherry Picker","Personnel Basket / Man Basket",
  "Fork Arm","Wire Rope","Hook","Sandblasting Pot","Portable Oven",
  "Pressure Vessel","Air Receiver","Boiler","Compressor — Air","Gas Cylinder",
  "Hydraulic Pump","Impact Wrench","Torque Wrench",
  "Scaffold","Fire Extinguisher","Other",
];

function uid(){
  return typeof crypto!=="undefined"&&crypto.randomUUID
    ?crypto.randomUUID()
    :`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}
function isAllowedFile(f){
  return f&&(f.type==="application/pdf"||f.type.startsWith("image/"))&&f.size<=MAX_FILE_SIZE;
}
function nonEmpty(d){
  return Object.values(d||{}).filter(v=>v!=null&&String(v).trim()!=="").length;
}
function pillClass(r){
  const v=String(r||"").toUpperCase();
  return v==="PASS"?"p-pass":v==="FAIL"?"p-fail":v==="CONDITIONAL"?"p-cond":"p-neutral";
}
function slugify(v){
  return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,16)||"UNKNOWN";
}
function fileSizeLabel(f){
  if(!f)return"";
  return f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${Math.round(f.size/1024)} KB`;
}
function toBase64(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(String(r.result).split(",")[1]);
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}
async function safeJson(res){
  try{return await res.json();}catch{return null;}
}
async function runWithConcurrency(items,limit,worker){
  const results=new Array(items.length);
  let cursor=0;
  const workerCount=Math.min(limit,items.length);
  async function runner(){
    while(cursor<items.length){
      const index=cursor++;
      results[index]=await worker(items[index],index);
    }
  }
  await Promise.all(Array.from({length:workerCount},runner));
  return results;
}

function normalizeDate(raw){
  if(!raw)return"";
  const s=String(raw).trim();
  if(!s||s==="—"||s==="-")return"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(/^\d{4}-\d{2}$/.test(s)){
    const[y,m]=s.split("-").map(Number);
    return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
  }
  if(/^\d{1,2}\.\d{4}$/.test(s)){
    const[m,y]=s.split(".").map(Number);
    return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
  }
  if(/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)){
    const[d,m,y]=s.split(".").map(Number);
    return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  if(/^\d{1,2}\/\d{4}$/.test(s)){
    const[m,y]=s.split("/").map(Number);
    return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
  }
  if(/^\d{1,2}\/\d{2}$/.test(s)){
    const[m,y]=s.split("/").map(Number);
    const fy=2000+y;
    return`${fy}-${String(m).padStart(2,"0")}-${String(new Date(fy,m,0).getDate()).padStart(2,"0")}`;
  }
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    const[d,m,y]=s.split("/").map(Number);
    return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  if(/^\d{4}$/.test(s))return`${s}-01-01`;
  const months=["january","february","march","april","may","june","july","august","september","october","november","december"];
  const mm=s.toLowerCase().match(/([a-z]+)\s*,?\s*(\d{4})/);
  if(mm){
    const mi=months.indexOf(mm[1]);
    if(mi>=0){
      const last=new Date(+mm[2],mi+1,0).getDate();
      return`${mm[2]}-${String(mi+1).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
    }
  }
  try{const d=new Date(s);if(!isNaN(d))return d.toISOString().slice(0,10);}catch(e){}
  return"";
}

async function uploadPdfToStorage(file,certId,certNumber){
  try{
    if(!file||file.type!=="application/pdf")return null;
    const safeCertNum=(certNumber||certId||"CERT").replace(/[^a-zA-Z0-9_-]/g,"_");
    const safeOriginal=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const storagePath=`${safeCertNum}_${safeOriginal}`;
    const{data,error}=await supabase.storage
      .from("certificates")
      .upload(storagePath,file,{contentType:"application/pdf",upsert:true});
    if(error){console.error("PDF upload error:",error.message);return null;}
    const{data:urlData}=supabase.storage.from("certificates").getPublicUrl(data.path);
    return urlData?.publicUrl||null;
  }catch(e){
    console.error("PDF upload failed:",e.message);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   BUILD DYNAMIC DB PAYLOAD
   Maps ALL AI-extracted fields into the correct DB columns,
   and stores the full extracted_data JSONB so nothing is ever lost.
════════════════════════════════════════════════════════════════════════════ */
function buildCertPayload(certNumber,row,overrides){
  const d=row.data||{};

  // Overrides take precedence for client / site / dates
  const clientName=overrides?.client_name?.trim()||d.client_name||null;
  const location=overrides?.location?.trim()||d.location||null;
  const inspDate=normalizeDate(overrides?.inspection_date||d.inspection_date||d.issue_date);
  const expiryDate=normalizeDate(overrides?.expiry_date||d.expiry_date);

  // Build extracted_data: keep EVERYTHING from AI, add meta flags
  const exBase=d.extracted_data||{};
  const extractedData={
    ...exBase,
    // Legislation from standard_code field if not already in legislation array
    ...(d.legislation?.length?{legislation:d.legislation}:
        d.standard_code&&!exBase.legislation?.length
          ?{legislation:[d.standard_code]}
          :{}),
    // Preserve other top-level extras not in DB columns
    ...(d.inspection_body&&!exBase.inspection_body?{inspection_body:d.inspection_body}:{}),
  };

  // Clean nulls/empty from extractedData
  Object.keys(extractedData).forEach(k=>{
    const v=extractedData[k];
    if(v==null)delete extractedData[k];
    else if(typeof v==="string"&&v.trim()==="")delete extractedData[k];
    else if(Array.isArray(v)&&v.length===0)delete extractedData[k];
    else if(typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===0)delete extractedData[k];
  });

  return{
    // Identity
    certificate_number:certNumber,
    inspection_number:d.inspection_number||null,
    status:"active",

    // Result
    result:row.manualResult||d.result||"UNKNOWN",

    // Dates
    issue_date:inspDate||null,
    inspection_date:inspDate||null,
    expiry_date:expiryDate||null,
    next_inspection_due:normalizeDate(d.next_inspection_due)||null,

    // Equipment description
    equipment_description:d.equipment_description||d.equipment_type||null,
    equipment_type:d.equipment_type||null,
    asset_name:d.equipment_description||d.equipment_type||null,
    asset_type:d.equipment_type||null,

    // Client
    client_name:clientName,
    location:location,

    // Equipment identity
    manufacturer:d.manufacturer||null,
    model:d.model||null,
    serial_number:d.serial_number||null,
    fleet_number:d.fleet_number||null,
    registration_number:d.registration_number||null,
    asset_tag:d.asset_tag||null,
    year_built:d.year_built||null,
    machine_hours:d.machine_hours||null,

    // Technical
    capacity_volume:d.capacity_volume||null,
    swl:d.swl||null,
    working_pressure:d.working_pressure||d.mawp||null,
    mawp:d.mawp||d.working_pressure||null,
    design_pressure:d.design_pressure||null,
    test_pressure:d.test_pressure||null,
    pressure_unit:d.pressure_unit||null,
    material:d.material||null,
    standard_code:d.standard_code||
      (d.legislation?.length?d.legislation.join(" · "):null)||null,

    // Inspection provenance
    inspector_name:d.inspector_name||null,
    inspector_id:d.inspector_id||null,
    inspection_body:d.inspection_body||null,

    // Findings
    defects_found:row.manualDefects||d.defects_found||null,
    recommendations:d.recommendations||null,
    comments:d.comments||null,

    // Raw preservation
    nameplate_data:d.nameplate_data||null,
    raw_text_summary:d.raw_text_summary||null,

    // Full AI output in JSONB — zero data loss
    extracted_data:Object.keys(extractedData).length>0?extractedData:null,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export default function ImportCertificatesPage(){
  const[mode,setMode]=useState("document");
  return(
    <AppLayout title="Import Certificates">
      <div className="cert-import-page">
        <div className="wrap">
          <div className="top-bar">
            <div className="brand">
              <div className="brand-label"><span className="brand-dot"/>Monroy QMS · Certificates</div>
              <div className="brand-title">Import Certificates</div>
            </div>
            <div className="nav-btns">
              <Link href="/certificates" className="nav-btn">← Register</Link>
              <Link href="/certificates/create" className="nav-btn nav-btn-primary">+ Create manually</Link>
            </div>
          </div>

          <div className="mode-toggle">
            <button type="button" className={`mode-btn${mode==="document"?" active":""}`} onClick={()=>setMode("document")}>
              📄 Document Import
              <span className="mode-sub">1 PDF → 1 certificate + PDF stored</span>
            </button>
            <button type="button" className={`mode-btn${mode==="list"?" active":""}`} onClick={()=>setMode("list")}>
              📋 List Import
              <span className="mode-sub">Photo of handwritten list → many certificates</span>
            </button>
            <button type="button" className={`mode-btn${mode==="backfill"?" active":""}`} onClick={()=>setMode("backfill")}>
              🗂 Backfill PDFs
              <span className="mode-sub">Upload PDFs for existing certificates</span>
            </button>
          </div>

          {mode==="document"?<DocumentMode/>:mode==="list"?<ListMode/>:<BackfillMode/>}
        </div>

        <style jsx global>{`
          .cert-import-page *{box-sizing:border-box;margin:0;padding:0}
          .cert-import-page{--bg:#060c18;--s1:#0d1526;--s2:#111d30;--s3:#162038;--b1:#1a2740;--b2:#243450;--b3:#2e4060;--text:#eef2f8;--sub:#7a8fa8;--hint:#4a5f78;--blue:#4a90e2;--blue2:#2d6bc4;--blue-dim:#122040;--blue-t:#7eb8f7;--green:#22c55e;--green-bg:#0a2818;--green-b:#145228;--green-t:#4ade80;--red:#ef4444;--red-bg:#200a0a;--red-b:#5c1a1a;--red-t:#f87171;--amber:#f59e0b;--amber-bg:#1e1208;--amber-b:#6b3d08;--amber-t:#fbbf24;--accent:#00d4ff;--r:8px;--rl:12px;--rxl:16px;background:var(--bg);color:var(--text);font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:13px;line-height:1.5;min-height:100vh}
          .cert-import-page .wrap{padding:24px;max-width:1200px}
          .cert-import-page .top-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:16px;flex-wrap:wrap}
          .cert-import-page .brand-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:6px;vertical-align:middle;animation:pulse 2s infinite}
          @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,212,255,.4)}50%{opacity:.8;box-shadow:0 0 0 6px rgba(0,212,255,0)}}
          .cert-import-page .brand-label{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--sub)}
          .cert-import-page .brand-title{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-.02em;margin-top:2px}
          .cert-import-page .nav-btns{display:flex;gap:8px;flex-wrap:wrap}
          .cert-import-page .nav-btn{padding:8px 16px;border-radius:var(--r);border:1px solid var(--b2);background:var(--s1);color:var(--sub);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
          .cert-import-page .nav-btn-primary{background:var(--blue2);border-color:var(--blue2);color:#fff}
          .cert-import-page .mode-toggle{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap}
          .cert-import-page .mode-btn{flex:1;min-width:200px;padding:14px 18px;border-radius:12px;border:1px solid var(--b2);background:var(--s1);color:var(--sub);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:flex-start;gap:4px;transition:all .2s;text-align:left}
          .cert-import-page .mode-btn.active{border-color:var(--accent);background:rgba(0,212,255,.07);color:var(--text)}
          .cert-import-page .mode-sub{font-size:11px;font-weight:400;color:var(--hint)}
          .cert-import-page .mode-btn.active .mode-sub{color:var(--sub)}
          .cert-import-page .card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--rxl);overflow:hidden;margin-bottom:14px}
          .cert-import-page .card-header{padding:14px 18px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
          .cert-import-page .card-title{font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:8px}
          .cert-import-page .card-sub{font-size:11px;color:var(--sub);margin-top:2px}
          .cert-import-page .card-body{padding:16px 18px}
          .cert-import-page .layout{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
          .cert-import-page .left-col{display:grid;gap:14px}
          .cert-import-page .browse-label{padding:7px 13px;border-radius:var(--r);background:var(--blue2);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
          .cert-import-page .drop-area{border:1.5px dashed var(--b2);border-radius:var(--rl);padding:24px 16px;text-align:center;background:var(--s2);cursor:pointer;position:relative;transition:border-color .2s,background .2s;margin-bottom:12px}
          .cert-import-page .drop-area:hover,.cert-import-page .drop-area.drag{border-color:var(--accent);background:rgba(0,212,255,.04)}
          .cert-import-page .drop-area input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
          .cert-import-page .drop-icon-ring{width:48px;height:48px;border-radius:50%;border:1.5px solid var(--b3);background:var(--s3);display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
          .cert-import-page .drop-h{font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px}
          .cert-import-page .drop-p{font-size:11px;color:var(--sub)}
          .cert-import-page .type-chips{display:flex;gap:5px;justify-content:center;margin-top:10px;flex-wrap:wrap}
          .cert-import-page .chip{font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--s3);border:1px solid var(--b2);color:var(--sub);letter-spacing:.06em}
          .cert-import-page .action-row{display:flex;gap:8px;align-items:center}
          .cert-import-page .btn{padding:9px 16px;border-radius:var(--r);border:1px solid var(--b2);background:var(--s2);color:var(--sub);cursor:pointer;font-size:12px;font-weight:500;font-family:inherit}
          .cert-import-page .btn-ghost{background:transparent;border-color:transparent;color:var(--hint)}
          .cert-import-page .btn-primary{background:var(--blue2);border-color:var(--blue2);color:#fff;flex:1;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px}
          .cert-import-page .btn-primary:disabled{opacity:.35;cursor:not-allowed}
          .cert-import-page .btn-save{padding:7px 14px;border-radius:var(--r);border:1px solid var(--green-b);background:var(--green-bg);color:var(--green-t);cursor:pointer;font-size:12px;font-weight:500;font-family:inherit}
          .cert-import-page .btn-save:disabled{opacity:.4;cursor:not-allowed}
          .cert-import-page .btn-remove{padding:4px 9px;border-radius:6px;border:1px solid var(--red-b);background:var(--red-bg);color:var(--red-t);cursor:pointer;font-size:11px;font-family:inherit}
          .cert-import-page .btn-saveall{padding:9px 16px;border-radius:var(--r);border:none;background:var(--blue2);color:#fff;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;display:inline-flex;align-items:center;gap:6px}
          .cert-import-page .btn-saveall:disabled{opacity:.35;cursor:not-allowed}
          .cert-import-page .prog-wrap{margin-top:12px}
          .cert-import-page .prog-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:6px}
          .cert-import-page .prog-pct{font-weight:700;color:var(--text)}
          .cert-import-page .prog-track{height:3px;background:var(--b1);border-radius:999px;overflow:hidden}
          .cert-import-page .prog-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .3s ease}
          .cert-import-page .override-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
          .cert-import-page .ov-f{display:flex;flex-direction:column;gap:4px}
          .cert-import-page .ov-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--hint)}
          .cert-import-page .ov-input{padding:8px 10px;border-radius:var(--r);border:1px solid var(--b1);background:var(--s2);color:var(--text);font-size:12px;outline:none;font-family:inherit;width:100%;min-height:36px;-webkit-tap-highlight-color:transparent}
          .cert-import-page .ov-input:focus{border-color:var(--blue)}
          .cert-import-page select.ov-input option{background:#0a1420}
          .cert-import-page .abadge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:var(--blue-dim);color:var(--blue-t);border:1px solid #1a3a6a}
          .cert-import-page .q-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r);border:1px solid var(--b1);background:var(--s2);margin-bottom:6px}
          .cert-import-page .q-icon{width:32px;height:32px;border-radius:7px;background:var(--blue-dim);color:var(--blue-t);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
          .cert-import-page .q-name{font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
          .cert-import-page .q-size{font-size:11px;color:var(--hint)}
          .cert-import-page .empty-state{padding:20px 0;font-size:12px;color:var(--hint);text-align:center}
          .cert-import-page .result-list{display:grid;gap:10px}
          .cert-import-page .rcard{border:1px solid var(--b1);border-radius:var(--rl);overflow:hidden}
          .cert-import-page .rcard.is-err{border-color:var(--red-b)}
          .cert-import-page .rcard.is-saved{border-color:var(--green-b)}
          .cert-import-page .rhead{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--s2);flex-wrap:wrap;border-bottom:1px solid var(--b1)}
          .cert-import-page .rnum{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
          .cert-import-page .rfname{font-size:12px;font-weight:600;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .cert-import-page .pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;flex-shrink:0;gap:4px}
          .cert-import-page .p-info{background:var(--blue-dim);color:var(--blue-t);border:1px solid #1a3a6a}
          .cert-import-page .p-pass{background:var(--green-bg);color:var(--green-t);border:1px solid var(--green-b)}
          .cert-import-page .p-fail{background:var(--red-bg);color:var(--red-t);border:1px solid var(--red-b)}
          .cert-import-page .p-cond{background:var(--amber-bg);color:var(--amber-t);border:1px solid var(--amber-b)}
          .cert-import-page .p-ok{background:var(--green-bg);color:var(--green-t);border:1px solid var(--green-b)}
          .cert-import-page .p-err{background:var(--red-bg);color:var(--red-t);border:1px solid var(--red-b)}
          .cert-import-page .p-neutral{background:var(--s3);color:var(--sub);border:1px solid var(--b2)}
          .cert-import-page .cert-num{font-size:10px;font-family:"IBM Plex Mono",monospace;color:var(--green-t);background:var(--green-bg);border:1px solid var(--green-b);border-radius:5px;padding:2px 8px;font-weight:700}
          .cert-import-page .rbody{padding:14px 16px}
          .cert-import-page .kv-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
          .cert-import-page .kv{background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:9px 11px}
          .cert-import-page .kv-lbl{font-size:10px;color:var(--hint);margin-bottom:3px}
          .cert-import-page .kv-val{font-size:12px;font-weight:600;color:var(--text)}
          .cert-import-page .strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:10px 12px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);margin-bottom:12px}
          .cert-import-page .strip-lbl{font-size:10px;color:var(--hint);margin-bottom:2px}
          .cert-import-page .strip-val{font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .cert-import-page .two-fields{display:grid;grid-template-columns:1fr 1.6fr;gap:10px;margin-bottom:12px}
          .cert-import-page .field-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:5px;display:block}
          .cert-import-page .sel{padding:8px 10px;border-radius:var(--r);border:1px solid var(--b1);background:var(--s2);color:var(--text);font-size:12px;outline:none;width:100%;font-family:inherit}
          .cert-import-page .sel:disabled{opacity:.45}
          .cert-import-page .ta{padding:8px 10px;border-radius:var(--r);border:1px solid var(--b1);background:var(--s2);color:var(--text);font-size:12px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;line-height:1.5}
          .cert-import-page .ta:disabled{opacity:.45}
          .cert-import-page .raw-sum{font-size:11px;color:var(--hint);line-height:1.65;margin-bottom:10px;padding:10px 12px;background:var(--s2);border-radius:var(--r);border-left:2px solid var(--b3)}
          .cert-import-page .err-box{background:var(--red-bg);border:1px solid var(--red-b);border-radius:var(--r);padding:12px 14px}
          .cert-import-page .err-title{font-size:12px;font-weight:600;color:var(--red-t);margin-bottom:4px}
          .cert-import-page .err-detail{font-size:11px;color:#f87171;line-height:1.6}
          .cert-import-page .save-err{background:var(--red-bg);border:1px solid var(--red-b);border-radius:var(--r);padding:8px 12px;font-size:11px;color:var(--red-t);margin-bottom:10px}
          .cert-import-page .rfoot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--b1);margin-top:2px}
          .cert-import-page .expand-btn{background:none;border:none;color:var(--hint);font-size:11px;cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;text-underline-offset:2px}
          .cert-import-page .foot-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
          .cert-import-page .view-btn{padding:6px 12px;border-radius:var(--r);border:1px solid var(--blue-dim);background:transparent;color:var(--blue-t);font-size:11px;text-decoration:none;display:inline-flex;align-items:center}
          .cert-import-page .edit-btn{padding:6px 12px;border-radius:var(--r);border:1px solid var(--amber-b);background:var(--amber-bg);color:var(--amber-t);font-size:11px;text-decoration:none;display:inline-flex;align-items:center}
          .cert-import-page .drawer{border-top:1px solid var(--b1);background:var(--bg);padding:12px 16px}
          .cert-import-page .drawer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:7px}
          .cert-import-page .dc{background:var(--s1);border:1px solid var(--b1);border-radius:var(--r);padding:8px 10px}
          .cert-import-page .dc-k{font-size:10px;color:var(--hint);margin-bottom:3px;text-transform:capitalize}
          .cert-import-page .dc-v{font-size:11px;font-weight:600;color:var(--text);word-break:break-word;line-height:1.4}
          .cert-import-page .spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--b3);border-top-color:var(--blue-t);border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:4px}
          @keyframes spin{to{transform:rotate(360deg)}}
          .cert-import-page .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
          .cert-import-page .stat-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--rl);padding:14px 16px;position:relative;overflow:hidden}
          .cert-import-page .stat-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;border-radius:var(--rl) var(--rl) 0 0}
          .cert-import-page .stat-card.blue::before{background:var(--blue)}
          .cert-import-page .stat-card.green::before{background:var(--green)}
          .cert-import-page .stat-card.red::before{background:var(--red)}
          .cert-import-page .stat-card.amber::before{background:var(--amber)}
          .cert-import-page .stat-lbl{font-size:11px;color:var(--sub);font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
          .cert-import-page .stat-val{font-size:26px;font-weight:700;letter-spacing:-.03em}
          .cert-import-page .stat-val.blue{color:var(--blue-t)}
          .cert-import-page .stat-val.green{color:var(--green-t)}
          .cert-import-page .stat-val.red{color:var(--red-t)}
          .cert-import-page .stat-val.amber{color:var(--amber-t)}
          .cert-import-page .list-table-wrap{overflow-x:auto}
          .cert-import-page .list-table{width:100%;border-collapse:collapse;font-size:12px}
          .cert-import-page .list-table th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--hint);border-bottom:1px solid var(--b2);white-space:nowrap;background:var(--s2)}
          .cert-import-page .list-table td{padding:8px 12px;border-bottom:1px solid var(--b1);vertical-align:middle}
          .cert-import-page .list-table tr:last-child td{border-bottom:none}
          .cert-import-page .list-table tr.row-saved td{background:rgba(34,197,94,.04)}
          .cert-import-page .list-table tr.row-err td{background:rgba(239,68,68,.04)}
          .cert-import-page .list-input{padding:6px 9px;border-radius:6px;border:1px solid var(--b1);background:var(--s2);color:var(--text);font-size:12px;font-family:inherit;width:100%;outline:none;min-height:32px;-webkit-tap-highlight-color:transparent}
          .cert-import-page .list-input:focus{border-color:var(--blue)}
          .cert-import-page .list-input:disabled{opacity:.5}
          .cert-import-page .list-banner-text{font-size:14px;font-weight:700;color:var(--text)}
          .cert-import-page .list-banner-sub{font-size:11px;color:var(--sub);margin-top:3px}
          .cert-import-page .bf-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--b1);flex-wrap:wrap}
          .cert-import-page .bf-cert{font-size:12px;font-weight:700;color:var(--accent);font-family:"IBM Plex Mono",monospace;min-width:160px}
          .cert-import-page .bf-name{font-size:11px;color:var(--sub);flex:1;min-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .cert-import-page .bf-status{font-size:11px;font-weight:700;min-width:80px}
          .cert-import-page .two-page-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.3);color:#c4b5fd}
          .cert-import-page .leg-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
          .cert-import-page .leg-tag{font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--blue-dim);border:1px solid #1a3a6a;color:var(--blue-t)}
          @media(max-width:900px){
            .cert-import-page .layout{grid-template-columns:1fr}
            .cert-import-page .stats{grid-template-columns:repeat(2,1fr)}
            .cert-import-page .kv-grid,.cert-import-page .strip{grid-template-columns:repeat(2,1fr)}
            .cert-import-page .two-fields{grid-template-columns:1fr}
            .cert-import-page .mode-toggle{flex-direction:column}
          }
        `}</style>
      </div>
    </AppLayout>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DOCUMENT MODE
════════════════════════════════════════════════════════════════════════════ */
function DocumentMode(){
  const[files,setFiles]=useState([]);
  const[results,setResults]=useState([]);
  const[dragActive,setDragActive]=useState(false);
  const[extracting,setExtracting]=useState(false);
  const[savingAll,setSavingAll]=useState(false);
  const[progress,setProgressState]=useState({visible:false,pct:0,label:""});
  const[overrides,setOverrides]=useState({client_name:"",location:"",inspection_date:"",expiry_date:""});
  const fileInputRef=useRef(null);
  const dropInputRef=useRef(null);
  const certSeqRef=useRef(1);

  const overrideCount=useMemo(()=>Object.values(overrides).filter(v=>String(v||"").trim()).length,[overrides]);
  const stats=useMemo(()=>{
    const ok=results.filter(x=>x.ok).length;
    const pending=results.filter(x=>x.pending).length;
    const err=results.filter(x=>x.ok===false&&!x.pending).length;
    const pass=results.filter(x=>x.ok&&(x.manualResult||x.data?.result)==="PASS").length;
    return{total:results.length,ok,pending,err,pass,canSaveAll:results.some(x=>x.ok&&!x.saved&&!x.saving)};
  },[results]);

  function setProgress(pct,label){setProgressState({visible:true,pct:Math.round(pct),label});}
  function resetInputs(){if(fileInputRef.current)fileInputRef.current.value="";if(dropInputRef.current)dropInputRef.current.value="";}
  function addFiles(list){
    setFiles(prev=>{
      const next=[...prev];
      list.filter(isAllowedFile).forEach(f=>{
        if(!next.find(x=>x.file.name===f.name&&x.file.size===f.size)&&next.length<MAX_FILES)
          next.push({id:uid(),file:f});
      });
      return next;
    });
    resetInputs();
  }
  function clearAll(){setFiles([]);setResults([]);setSavingAll(false);setProgressState({visible:false,pct:0,label:""});resetInputs();}
  function setOverride(k,v){setOverrides(p=>({...p,[k]:v}));}
  function clearOverrides(){setOverrides({client_name:"",location:"",inspection_date:"",expiry_date:""});}

  function genCert(data,fileName){
    const base=slugify(data?.serial_number)||slugify(data?.inspection_number)||slugify(String(fileName||"").replace(/\.[^.]+$/,""));
    return`CERT-${base}-${String(certSeqRef.current++).padStart(2,"0")}`;
  }

  function normalizeExtractedResult(item,fileEntry){
    const raw=item?.data||item||{};
    const rawData={
      ...raw,
      inspection_date:normalizeDate(raw.inspection_date||raw.issue_date),
      expiry_date:normalizeDate(raw.expiry_date),
      next_inspection_due:normalizeDate(raw.next_inspection_due),
      result:raw.result||"PASS",
    };
    // Apply overrides
    if(overrides.client_name)rawData.client_name=overrides.client_name;
    if(overrides.location)rawData.location=overrides.location;
    if(overrides.inspection_date)rawData.inspection_date=overrides.inspection_date;
    if(overrides.expiry_date)rawData.expiry_date=overrides.expiry_date;
    return{
      fileId:fileEntry.id,fileName:fileEntry.file.name,
      ok:true,pending:false,data:rawData,
      saved:false,saving:false,saveError:null,savedId:null,
      expanded:false,certNumber:null,pdfUrl:null,
      manualResult:rawData.result||"PASS",
      manualDefects:rawData.defects_found||"",
    };
  }

  async function extractSingleFile(fileEntry){
    const file=fileEntry.file;
    const mimeType=file.type||(file.name.toLowerCase().endsWith(".pdf")?"application/pdf":"image/jpeg");
    const base64Data=await toBase64(file);
    if(!base64Data||typeof base64Data!=="string"||base64Data.length<10)
      throw new Error(`Failed to read file "${file.name}". Try re-uploading.`);
    const res=await fetch("/api/ai/extract",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({files:[{fileName:file.name,mimeType,base64Data}],systemPrompt:DOC_PROMPT}),
    });
    const json=await safeJson(res);
    if(!res.ok)throw new Error(json?.error||json?.message||`Extraction failed (HTTP ${res.status}).`);
    const first=Array.isArray(json?.results)?json.results[0]:null;
    if(!first)throw new Error("No results returned from the extraction route.");
    if(first.ok===false)throw new Error(first.error||"AI could not extract data from this file.");
    const data=first?.data;
    if(!data||typeof data!=="object")throw new Error("Extraction returned an unexpected data format.");
    return normalizeExtractedResult({data},fileEntry);
  }

  async function handleExtract(){
    if(!files.length||extracting)return;
    setExtracting(true);setSavingAll(false);
    const initial=files.map(entry=>({
      fileId:entry.id,fileName:entry.file.name,ok:false,pending:true,
      error:null,saved:false,saving:false,saveError:null,
      expanded:false,certNumber:null,savedId:null,pdfUrl:null,
      manualResult:"PASS",manualDefects:"",
    }));
    setResults(initial);
    setProgress(2,`Starting: ${files.length} file${files.length===1?"":"s"}`);
    let completed=0;
    try{
      await runWithConcurrency(files,PARALLEL_LIMIT,async(fileEntry,index)=>{
        setResults(prev=>prev.map((it,i)=>i===index?{...it,pending:true,error:null}:it));
        try{
          const item=await extractSingleFile(fileEntry);
          completed+=1;
          setResults(prev=>prev.map((it,i)=>i===index?item:it));
          setProgress(5+(completed/files.length)*90,`Extracted ${completed}/${files.length}`);
          return item;
        }catch(e){
          completed+=1;
          const failed={fileId:fileEntry.id,fileName:fileEntry.file.name,ok:false,pending:false,
            error:e.message||"Extraction failed",saved:false,saving:false,saveError:null,
            expanded:false,certNumber:null,savedId:null,pdfUrl:null,manualResult:"PASS",manualDefects:""};
          setResults(prev=>prev.map((it,i)=>i===index?failed:it));
          setProgress(5+(completed/files.length)*90,`Processed ${completed}/${files.length}`);
          return failed;
        }
      });
      setProgress(100,"Extraction complete");
    }catch(e){
      setResults([{fileName:"Request failed",ok:false,pending:false,error:e.message||"Unexpected error",
        saved:false,saving:false,saveError:null,expanded:false,certNumber:null,savedId:null,pdfUrl:null,
        manualResult:"PASS",manualDefects:""}]);
      setProgress(100,"Extraction failed");
    }finally{setExtracting(false);}
  }

  function setResultField(idx,key,value){setResults(prev=>prev.map((it,i)=>i===idx?{...it,[key]:value}:it));}
  function toggleExpanded(idx){setResults(prev=>prev.map((it,i)=>i===idx?{...it,expanded:!it.expanded}:it));}

  function generateCompanyCode(name){
    const initials=name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
    return`${initials}-${String(Math.floor(Math.random()*900)+100)}`;
  }
  function generateSerialNumber(clientName,equipmentType){
    const cc=(clientName||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
    const ec=(equipmentType||"EQP").trim().split(/[\s/—-]+/).filter(Boolean).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
    return`${cc}-${ec}-${String(Date.now()).slice(-6)}`;
  }
  async function ensureClient(clientName,city){
    if(!clientName||!clientName.trim())return{skip:true};
    const name=clientName.trim();
    try{
      const{data:existing,error:lookupErr}=await supabase.from("clients").select("id").ilike("company_name",name).maybeSingle();
      if(lookupErr)return{error:lookupErr.message};
      if(existing)return{exists:true};
      const{error:insertErr}=await supabase.from("clients").insert({
        company_name:name,company_code:generateCompanyCode(name),
        city:city||"",country:"Botswana",status:"active",
      });
      if(insertErr)return{error:insertErr.message};
      return{created:true};
    }catch(e){return{error:e.message};}
  }

  async function saveOne(idx){
    const row=results[idx];
    if(!row?.ok||row.saved||row.saving)return;
    setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:true,saveError:null}:it));
    try{
      const certNumber=genCert(row.data,row.fileName);
      if(!row.data.serial_number||!row.data.serial_number.trim()){
        row.data.serial_number=generateSerialNumber(
          overrides.client_name?.trim()||row.data.client_name||"",
          row.data.equipment_type||""
        );
      }
      const effectiveClient=overrides.client_name?.trim()||row.data.client_name;
      const effectiveCity=overrides.location?.trim()||row.data.location||"";
      const clientResult=await ensureClient(effectiveClient,effectiveCity);
      if(clientResult?.error)console.warn("Client auto-register failed:",clientResult.error);

      const payload=buildCertPayload(certNumber,row,overrides);
      const res=await fetch("/api/certificates",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      const json=await res.json();
      if(!res.ok)throw new Error(json?.error||`Save failed: ${res.status}`);
      const certId=json?.id||json?.data?.id||null;

      let pdfUrl=null;
      const fileEntry=files.find(f=>f.file.name===row.fileName);
      if(fileEntry?.file&&fileEntry.file.type==="application/pdf"){
        pdfUrl=await uploadPdfToStorage(fileEntry.file,certId,certNumber);
        if(pdfUrl&&certId)await supabase.from("certificates").update({pdf_url:pdfUrl}).eq("id",certId);
      }
      setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:false,saved:true,certNumber,savedId:certId,saveError:null,pdfUrl}:it));
    }catch(e){
      setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:false,saved:false,saveError:e.message||"Save failed."}:it));
    }
  }

  async function saveAll(){
    const indexes=results.map((_,i)=>i).filter(i=>results[i].ok&&!results[i].saved&&!results[i].saving);
    if(!indexes.length||savingAll)return;
    setSavingAll(true);
    let completed=0;
    setProgress(2,`Saving ${indexes.length} certificate${indexes.length===1?"":"s"}...`);
    await runWithConcurrency(indexes,PARALLEL_LIMIT,async idx=>{
      await saveOne(idx);
      completed+=1;
      setProgress(5+(completed/indexes.length)*90,`Saved ${completed}/${indexes.length}`);
    });
    setProgress(100,"Save complete");
    setSavingAll(false);
  }

  return(
    <>
      <div className="stats">
        <div className="stat-card blue"><div className="stat-lbl">Processed</div><div className="stat-val blue">{stats.total}</div></div>
        <div className="stat-card green"><div className="stat-lbl">Successful</div><div className="stat-val green">{stats.ok}</div></div>
        <div className="stat-card red"><div className="stat-lbl">Errors</div><div className="stat-val red">{stats.err}</div></div>
        <div className="stat-card amber"><div className="stat-lbl">Passed</div><div className="stat-val amber">{stats.pass}</div></div>
      </div>
      <div className="layout">
        <div className="left-col">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Upload zone</div><div className="card-sub">PDF · PNG · JPG — max 20 files, 10 MB each</div></div>
              <label className="browse-label">Browse<input ref={fileInputRef} type="file" multiple accept=".pdf,image/*" style={{display:"none"}} onChange={e=>addFiles(Array.from(e.target.files||[]))}/></label>
            </div>
            <div className="card-body">
              <div className={`drop-area${dragActive?" drag":""}`}
                onDragOver={e=>{e.preventDefault();setDragActive(true);}}
                onDragLeave={()=>setDragActive(false)}
                onDrop={e=>{e.preventDefault();setDragActive(false);addFiles(Array.from(e.dataTransfer.files||[]));}}
              >
                <input ref={dropInputRef} type="file" multiple accept=".pdf,image/*" onChange={e=>addFiles(Array.from(e.target.files||[]))}/>
                <div className="drop-icon-ring">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="drop-h">Drop files here</div>
                <div className="drop-p">Certificates, nameplates, equipment photos</div>
                <div className="type-chips"><span className="chip">PDF</span><span className="chip">PNG</span><span className="chip">JPG</span><span className="chip">WEBP</span></div>
              </div>
              <div className="action-row">
                <button className="btn btn-ghost" type="button" onClick={clearAll}>Clear all</button>
                <button className="btn btn-primary" type="button" onClick={handleExtract} disabled={!files.length||extracting||savingAll}>
                  {extracting?`Extracting ${stats.pending}...`:"⚡ Extract with AI"}
                </button>
              </div>
              {progress.visible&&(
                <div className="prog-wrap">
                  <div className="prog-meta"><span>{progress.label}</span><span className="prog-pct">{progress.pct}%</span></div>
                  <div className="prog-track"><div className="prog-fill" style={{width:`${progress.pct}%`}}/></div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{gap:8}}>
                  Override{overrideCount?<span className="abadge">{overrideCount} active</span>:null}
                </div>
                <div className="card-sub">Overwrites extracted values when set.</div>
              </div>
              {overrideCount?<button className="btn btn-ghost" type="button" style={{fontSize:11,padding:"5px 10px"}} onClick={clearOverrides}>Clear</button>:null}
            </div>
            <div className="card-body">
              <div className="override-grid">
                <div className="ov-f"><label className="ov-lbl">Client name</label><input className="ov-input" type="text" placeholder="e.g. Debswana" value={overrides.client_name} onChange={e=>setOverride("client_name",e.target.value)}/></div>
                <div className="ov-f"><label className="ov-lbl">Location / Site</label><input className="ov-input" type="text" placeholder="e.g. Processing Plant" value={overrides.location} onChange={e=>setOverride("location",e.target.value)}/></div>
                <div className="ov-f"><label className="ov-lbl">Inspection date</label><input className="ov-input" type="date" value={overrides.inspection_date} onChange={e=>setOverride("inspection_date",e.target.value)}/></div>
                <div className="ov-f"><label className="ov-lbl">Expiry date</label><input className="ov-input" type="date" value={overrides.expiry_date} onChange={e=>setOverride("expiry_date",e.target.value)}/></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div><div className="card-title">Queue</div><div className="card-sub">{files.length} / 20 selected</div></div></div>
            <div className="card-body" style={{paddingBottom:10}}>
              {!files.length
                ?<div className="empty-state">No files added yet.</div>
                :files.map(item=>(
                  <div className="q-item" key={item.id}>
                    <div className="q-icon">{item.file.type==="application/pdf"?"PDF":"IMG"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="q-name" title={item.file.name}>{item.file.name}</div>
                      <div className="q-size">{fileSizeLabel(item.file)}</div>
                    </div>
                    <button className="btn-remove" type="button" onClick={()=>setFiles(p=>p.filter(x=>x.id!==item.id))}>✕</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="card" style={{borderRadius:"var(--rxl)"}}>
          <div className="card-header">
            <div><div className="card-title">Extracted results</div><div className="card-sub">All fields preserved — review, confirm, save</div></div>
            <button className="btn-saveall" type="button" onClick={saveAll} disabled={!stats.canSaveAll||savingAll}>
              {savingAll?"Saving...":"Save all successful"}
            </button>
          </div>
          <div className="card-body">
            <div className="result-list">
              {!results.length
                ?<div className="empty-state" style={{padding:"32px 0"}}>Upload files and click Extract with AI to begin</div>
                :results.map((item,idx)=>{
                  const d=item.data||{};
                  const rv=item.manualResult||d.result||"UNKNOWN";
                  const disabled=item.saved||item.saving;
                  const is2Page=d.extracted_data?.has_second_page===true;
                  const legislation=Array.isArray(d.extracted_data?.legislation)?d.extracted_data.legislation:[];
                  const hasPartners=Array.isArray(d.extracted_data?.partners)&&d.extracted_data.partners.length>0;
                  return(
                    <div key={`${item.fileName}-${idx}`} className={`rcard${item.ok?(item.saved?" is-saved":""):(item.pending?"":" is-err")}`}>
                      <div className="rhead">
                        <div className="rnum" style={item.ok?{background:"var(--green-bg)",color:"var(--green-t)"}:item.pending?{background:"var(--blue-dim)",color:"var(--blue-t)"}:{background:"var(--red-bg)",color:"var(--red-t)"}}>{idx+1}</div>
                        <div className="rfname" title={item.fileName}>{item.fileName}</div>
                        {item.ok&&<span className="pill p-info">{nonEmpty(d)} fields</span>}
                        {item.ok&&d.equipment_type&&<span className="pill p-neutral">{d.equipment_type}</span>}
                        {item.ok&&<span className={`pill ${pillClass(rv)}`}>{rv}</span>}
                        {item.ok&&is2Page&&<span className="two-page-badge">📄📄 2-page cert</span>}
                        {item.saved&&item.certNumber&&<span className="cert-num">{item.certNumber}</span>}
                        {item.saved&&item.pdfUrl&&<span className="pill p-pass">📎 PDF stored</span>}
                        <span className={`pill ${item.ok?"p-ok":item.pending?"p-info":"p-err"}`}>
                          {item.ok?"OK":item.pending?"Extracting":"Error"}
                        </span>
                      </div>

                      {item.pending?(
                        <div className="rbody"><div className="raw-sum"><span className="spinner"/> Extracting ALL data with AI — please wait...</div></div>
                      ):!item.ok?(
                        <div className="rbody">
                          <div className="err-box">
                            <div className="err-title">{item.error||"Extraction failed."}</div>
                            <div className="err-detail">Check GEMINI_API_KEY is set in Render environment variables.</div>
                          </div>
                        </div>
                      ):(
                        <>
                          <div className="rbody">
                            <div className="kv-grid">
                              <div className="kv"><div className="kv-lbl">Certificate no.</div><div className="kv-val">{item.certNumber||<span style={{color:"var(--hint)",fontWeight:400}}>Auto on save</span>}</div></div>
                              <div className="kv"><div className="kv-lbl">Equipment type</div><div className="kv-val">{d.equipment_type||"—"}</div></div>
                              <div className="kv"><div className="kv-lbl">Inspection date</div><div className="kv-val">{d.inspection_date||"—"}</div></div>
                              <div className="kv"><div className="kv-lbl">Expiry date</div><div className="kv-val">{d.expiry_date||"—"}</div></div>
                            </div>
                            <div className="strip">
                              <div><div className="strip-lbl">Equipment</div><div className="strip-val">{d.equipment_description||"—"}</div></div>
                              <div><div className="strip-lbl">Client</div><div className="strip-val">{d.client_name||"—"}</div></div>
                              <div><div className="strip-lbl">Serial no.</div><div className="strip-val">{d.serial_number||"—"}</div></div>
                              <div><div className="strip-lbl">Location</div><div className="strip-val">{d.location||"—"}</div></div>
                            </div>

                            {/* Legislation tags */}
                            {legislation.length>0&&(
                              <div className="leg-tags">
                                {legislation.map((l,i)=><span key={i} className="leg-tag">{l}</span>)}
                              </div>
                            )}

                            {/* 2-page detection + structural/functional results */}
                            {is2Page&&(
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6,fontSize:11,color:"var(--sub)"}}>
                                {d.extracted_data?.structural_integrity&&<span>Structural: <b style={{color:"var(--green-t)"}}>{d.extracted_data.structural_integrity}</b></span>}
                                {d.extracted_data?.functional_test&&<span>Functional: <b style={{color:"var(--green-t)"}}>{d.extracted_data.functional_test}</b></span>}
                                {d.extracted_data?.overall_assessment&&<span>Overall: <b style={{color:"var(--text)"}}>{d.extracted_data.overall_assessment}</b></span>}
                                {hasPartners&&<span>Partners: <b style={{color:"var(--text)"}}>{d.extracted_data.partners.join(", ")}</b></span>}
                              </div>
                            )}

                            {d.raw_text_summary&&<div className="raw-sum" style={{marginTop:8}}>{d.raw_text_summary}</div>}

                            <div className="two-fields">
                              <div>
                                <label className="field-lbl">Inspection result</label>
                                <select className="sel" value={item.manualResult} disabled={disabled} onChange={e=>setResultField(idx,"manualResult",e.target.value)}>
                                  <option value="PASS">PASS</option>
                                  <option value="FAIL">FAIL</option>
                                  <option value="CONDITIONAL">CONDITIONAL</option>
                                  <option value="UNKNOWN">UNKNOWN</option>
                                </select>
                              </div>
                              <div>
                                <label className="field-lbl">Defects found</label>
                                <textarea className="ta" value={item.manualDefects} disabled={disabled} placeholder="Describe defects, cracks, wear..." onChange={e=>setResultField(idx,"manualDefects",e.target.value)}/>
                              </div>
                            </div>

                            {item.saveError&&<div className="save-err">{item.saveError}</div>}

                            <div className="rfoot">
                              <button className="expand-btn" type="button" onClick={()=>toggleExpanded(idx)}>
                                {item.expanded?"Hide all fields ↑":"Show all fields ↓"}
                              </button>
                              <div className="foot-actions">
                                {item.saved&&item.savedId&&(
                                  <>
                                    <Link href={`/certificates/${item.savedId}`} className="view-btn">View →</Link>
                                    <Link href={`/certificates/${item.savedId}/edit`} className="edit-btn">Edit</Link>
                                  </>
                                )}
                                <button className="btn-save" type="button" disabled={disabled} onClick={()=>saveOne(idx)}>
                                  {item.saved?"Saved ✓":item.saving?<><span className="spinner"/>Saving...</>:"Save to register"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {item.expanded&&(
                            <div className="drawer">
                              <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--hint)",marginBottom:10}}>All extracted fields</div>
                              <div className="drawer-grid">
                                {Object.entries(d).map(([k,v])=>{
                                  if(k==="extracted_data"||k==="photo_evidence")return null;
                                  const display=typeof v==="object"&&v!==null
                                    ?JSON.stringify(v,null,1).slice(0,200)
                                    :String(v||"");
                                  return(
                                    <div className="dc" key={k}>
                                      <div className="dc-k">{k.replace(/_/g," ")}</div>
                                      <div className="dc-v">{display||"—"}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              {d.extracted_data&&Object.keys(d.extracted_data).length>0&&(
                                <>
                                  <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--hint)",margin:"12px 0 8px"}}>extracted_data (JSONB)</div>
                                  <div className="drawer-grid">
                                    {Object.entries(d.extracted_data).map(([k,v])=>{
                                      const display=typeof v==="object"&&v!==null
                                        ?JSON.stringify(v,null,1).slice(0,200)
                                        :String(v||"");
                                      return(
                                        <div className="dc" key={k} style={typeof v==="object"&&v!==null?{gridColumn:"span 2"}:{}}>
                                          <div className="dc-k">{k.replace(/_/g," ")}</div>
                                          <div className="dc-v" style={typeof v==="object"?{fontSize:9,fontFamily:"monospace"}:{}}>{display||"—"}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BACKFILL MODE
════════════════════════════════════════════════════════════════════════════ */
function BackfillMode(){
  const[files,setFiles]=useState([]);
  const[rows,setRows]=useState([]);
  const[loading,setLoading]=useState(false);
  const[running,setRunning]=useState(false);
  const[progress,setProgressState]=useState({visible:false,pct:0,done:0,total:0});
  const fileInputRef=useRef(null);

  function addFiles(list){
    const pdfs=Array.from(list).filter(f=>f.type==="application/pdf"&&f.size<=MAX_FILE_SIZE);
    setFiles(prev=>{const next=[...prev];pdfs.forEach(f=>{if(!next.find(x=>x.name===f.name&&x.size===f.size))next.push(f);});return next;});
    if(fileInputRef.current)fileInputRef.current.value="";
  }
  async function matchFiles(){
    if(!files.length)return;
    setLoading(true);
    const{data:certs}=await supabase.from("certificates").select("id,certificate_number,equipment_description,client_name").is("pdf_url",null).order("created_at",{ascending:false}).limit(2000);
    const matched=files.map(file=>{
      const fname=file.name.replace(/\.pdf$/i,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
      const cert=(certs||[]).find(c=>{const cnum=(c.certificate_number||"").toUpperCase().replace(/[^A-Z0-9]/g,"");return fname.includes(cnum)||cnum.includes(fname);});
      return{file,certId:cert?.id||null,certNumber:cert?.certificate_number||null,clientName:cert?.client_name||null,status:cert?"ready":"unmatched",pdfUrl:null,error:null};
    });
    setRows(matched);
    setLoading(false);
  }
  async function uploadOne(idx){
    const row=rows[idx];
    if(!row.certId||row.status==="done"||row.status==="uploading")return;
    setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"uploading",error:null}:r));
    const pdfUrl=await uploadPdfToStorage(row.file,row.certId,row.certNumber);
    if(!pdfUrl){setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"error",error:"Upload failed"}:r));return;}
    const{error:patchErr}=await supabase.from("certificates").update({pdf_url:pdfUrl}).eq("id",row.certId);
    if(patchErr){setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"error",error:patchErr.message}:r));return;}
    setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"done",pdfUrl}:r));
  }
  async function uploadAll(){
    setRunning(true);
    const ready=rows.map((_,i)=>i).filter(i=>rows[i].status==="ready");
    setProgressState({visible:true,pct:0,done:0,total:ready.length});
    for(let i=0;i<ready.length;i++){await uploadOne(ready[i]);setProgressState({visible:true,pct:Math.round(((i+1)/ready.length)*100),done:i+1,total:ready.length});}
    setRunning(false);
  }
  const readyCount=rows.filter(r=>r.status==="ready").length;
  const doneCount=rows.filter(r=>r.status==="done").length;
  const errCount=rows.filter(r=>r.status==="error").length;

  return(
    <div style={{display:"grid",gap:14}}>
      <div className="card">
        <div className="card-header"><div><div className="card-title">🗂 Backfill PDFs for existing certificates</div><div className="card-sub">Upload original PDFs — matched by filename to existing records.</div></div></div>
        <div className="card-body">
          <div style={{background:"rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:12,color:"var(--sub)",lineHeight:1.7}}>
            <strong style={{color:"var(--accent)"}}>How it works:</strong> Name your PDF files after the certificate number (e.g.{" "}
            <code style={{background:"var(--s3)",padding:"1px 6px",borderRadius:4}}>CERT-CR00040.pdf</code>).
            Upload them — the tool matches each file to the right certificate automatically.
          </div>
          <div className="drop-area" onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}>
            <input ref={fileInputRef} type="file" multiple accept=".pdf" onChange={e=>addFiles(e.target.files)}/>
            <div className="drop-icon-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
            <div className="drop-h">Drop PDF files here</div>
            <div className="drop-p">Named after certificate numbers — e.g. CERT-CR00040.pdf</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {files.length>0&&(
              <>
                <span style={{fontSize:12,color:"var(--sub)",alignSelf:"center"}}>{files.length} PDF{files.length===1?"":"s"} selected</span>
                <button className="btn btn-primary" type="button" onClick={matchFiles} disabled={loading} style={{flex:"none",padding:"8px 18px"}}>{loading?"Matching…":"🔍 Match to certificates"}</button>
                <button className="btn btn-ghost" type="button" onClick={()=>{setFiles([]);setRows([]);}} style={{flex:"none"}}>Clear</button>
              </>
            )}
          </div>
        </div>
      </div>
      {rows.length>0&&(
        <div className="card">
          <div className="card-header">
            <div>
              <div className="list-banner-text">{readyCount} ready · {doneCount} uploaded · {errCount} errors · {rows.filter(r=>r.status==="unmatched").length} unmatched</div>
              <div className="list-banner-sub">Unmatched files couldn't be linked — rename to match the cert number.</div>
            </div>
            <button className="btn-saveall" type="button" onClick={uploadAll} disabled={readyCount===0||running}>
              {running?<><span className="spinner"/>Uploading…</>:`⬆ Upload all (${readyCount})`}
            </button>
          </div>
          {progress.visible&&(
            <div style={{padding:"8px 18px",borderBottom:"1px solid var(--b1)"}}>
              <div className="prog-meta"><span>{progress.done}/{progress.total} uploaded</span><span className="prog-pct">{progress.pct}%</span></div>
              <div className="prog-track"><div className="prog-fill" style={{width:`${progress.pct}%`}}/></div>
            </div>
          )}
          <div>
            {rows.map((row,idx)=>(
              <div key={idx} className="bf-row">
                <div className="q-icon" style={{background:row.status==="done"?"var(--green-bg)":row.status==="error"?"var(--red-bg)":row.status==="unmatched"?"var(--amber-bg)":"var(--blue-dim)",color:row.status==="done"?"var(--green-t)":row.status==="error"?"var(--red-t)":row.status==="unmatched"?"var(--amber-t)":"var(--blue-t)"}}>PDF</div>
                <div className="bf-cert">{row.certNumber||<span style={{color:"var(--hint)"}}>—</span>}</div>
                <div className="bf-name" title={row.file.name}>{row.file.name}</div>
                {row.clientName&&<div style={{fontSize:11,color:"var(--hint)",minWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.clientName}</div>}
                <div className="bf-status" style={{color:row.status==="done"?"var(--green-t)":row.status==="error"?"var(--red-t)":row.status==="unmatched"?"var(--amber-t)":row.status==="uploading"?"var(--blue-t)":"var(--sub)"}}>
                  {row.status==="done"?"✓ Uploaded":row.status==="error"?`⚠ ${row.error}`:row.status==="unmatched"?"No match":row.status==="uploading"?<><span className="spinner"/>Uploading…</>:"Ready"}
                </div>
                {row.status==="ready"&&<button className="btn-save" type="button" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>uploadOne(idx)}>Upload</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIST MODE
════════════════════════════════════════════════════════════════════════════ */
function ListMode(){
  const[files,setFiles]=useState([]);
  const[dragActive,setDragActive]=useState(false);
  const[extracting,setExtracting]=useState(false);
  const[progress,setProgressState]=useState({visible:false,pct:0,label:""});
  const[items,setItems]=useState([]);
  const[overrides,setOverrides]=useState({client_name:"",location:"",inspection_date:"",expiry_date:""});
  const[savingAll,setSavingAll]=useState(false);
  const[error,setError]=useState("");
  const fileInputRef=useRef(null);
  const certSeqRef=useRef(1);

  const savedCount=useMemo(()=>items.filter(x=>x.saved).length,[items]);
  const pendingCount=useMemo(()=>items.filter(x=>!x.saved&&!x.saving).length,[items]);

  function setProgress(pct,label){setProgressState({visible:true,pct:Math.round(pct),label});}
  function addFiles(list){
    setFiles(prev=>{const next=[...prev];Array.from(list).filter(isAllowedFile).forEach(f=>{if(!next.find(x=>x.file.name===f.name&&x.file.size===f.size)&&next.length<5)next.push({id:uid(),file:f});});return next;});
    if(fileInputRef.current)fileInputRef.current.value="";
  }
  function clearAll(){setFiles([]);setItems([]);setError("");setProgressState({visible:false,pct:0,label:""});}

  async function handleExtract(){
    if(!files.length||extracting)return;
    setExtracting(true);setError("");setItems([]);
    setProgress(10,"Reading list photos...");
    try{
      const payloads=[];
      for(let i=0;i<files.length;i++){
        setProgress(10+(i/files.length)*35,`Reading page ${i+1}/${files.length}...`);
        const mimeType=files[i].file.type||"image/jpeg";
        const base64Data=await toBase64(files[i].file);
        if(!base64Data||base64Data.length<10)throw new Error(`Failed to read image ${files[i].file.name}`);
        payloads.push({fileName:files[i].file.name,mimeType,base64Data});
      }
      setProgress(50,"AI reading list...");
      const res=await fetch("/api/ai/extract",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          files:payloads,
          systemPrompt:buildListPrompt(overrides.client_name,overrides.inspection_date,overrides.expiry_date),
          listMode:true,
        }),
      });
      setProgress(80,"Parsing items...");
      const json=await safeJson(res);
      if(!res.ok)throw new Error(json?.error||`Server error ${res.status}`);
      let allItems=[];
      const errors=[];
      for(const result of(json.results||[])){
        if(!result.ok){errors.push(result.error||"File extraction failed");continue;}
        const its=result.data?.items;
        if(Array.isArray(its)&&its.length>0)allItems=[...allItems,...its];
        else errors.push(`${result.fileName}: AI returned 0 items`);
      }
      setProgress(100,allItems.length>0?`Found ${allItems.length} items`:"Failed");
      if(allItems.length===0){
        setError(`${errors.join(" | ")||"AI could not extract any items."} — Tips: Better lighting, avoid shadows over text.`);
        setExtracting(false);
        return;
      }
      if(errors.length>0)setError(`Warning: Some pages had issues — ${errors.join(" | ")}`);
      setItems(allItems.map((item,i)=>({
        id:uid(),
        serial_number:String(item.serial_number||"").trim(),
        swl:String(item.swl||"").trim(),
        equipment_type:String(item.equipment_type||"Other").trim(),
        equipment_description:item.equipment_description||`${item.equipment_type||"Equipment"} SN ${item.serial_number||i+1} SWL ${item.swl||""}`.trim(),
        result:String(item.result||"PASS").trim().toUpperCase()||"PASS",
        defects_found:String(item.defects_found||"").trim(),
        manufacturer:item.manufacturer||"",
        year_built:item.year_built||"",
        asset_tag:item.asset_tag||"",
        standard_code:item.standard_code||"",
        extracted_data:item.extracted_data||{},
        saved:false,saving:false,savedId:null,certNumber:null,saveError:null,
      })));
    }catch(e){
      setError(e.message||"Extraction failed.");
      setProgress(100,"Failed");
    }finally{setExtracting(false);}
  }

  function updateItem(id,key,value){setItems(prev=>prev.map(it=>it.id===id?{...it,[key]:value}:it));}
  function removeItem(id){setItems(prev=>prev.filter(it=>it.id!==id));}
  function addBlankItem(){
    setItems(prev=>[...prev,{
      id:uid(),serial_number:"",swl:"",equipment_type:"Other",
      equipment_description:"",result:"PASS",defects_found:"",
      manufacturer:"",year_built:"",asset_tag:"",standard_code:"",
      extracted_data:{},saved:false,saving:false,savedId:null,certNumber:null,saveError:null,
    }]);
  }

  function generateCompanyCode(name){const initials=name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");return`${initials}-${String(Math.floor(Math.random()*900)+100)}`;}
  function generateSerialNumber(clientName,equipmentType){const cc=(clientName||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");const ec=(equipmentType||"EQP").trim().split(/[\s/—-]+/).filter(Boolean).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");return`${cc}-${ec}-${String(Date.now()).slice(-6)}`;}
  async function ensureClient(clientName,city){if(!clientName||!clientName.trim())return{skip:true};const name=clientName.trim();try{const{data:existing,error:lookupErr}=await supabase.from("clients").select("id").ilike("company_name",name).maybeSingle();if(lookupErr)return{error:lookupErr.message};if(existing)return{exists:true};const{error:insertErr}=await supabase.from("clients").insert({company_name:name,company_code:generateCompanyCode(name),city:city||"",country:"Botswana",status:"active"});if(insertErr)return{error:insertErr.message};return{created:true};}catch(e){return{error:e.message};}}

  async function saveOne(id){
    const row=items.find(x=>x.id===id);
    if(!row||row.saved||row.saving)return;
    setItems(prev=>prev.map(it=>it.id===id?{...it,saving:true,saveError:null}:it));
    try{
      if(overrides.client_name){const cr=await ensureClient(overrides.client_name,overrides.location||"");if(cr?.error)console.warn("Client auto-register failed:",cr.error);}
      const rowSerial=row.serial_number?.trim()||generateSerialNumber(overrides.client_name||"",row.equipment_type||"");
      const certNumber=`CERT-${slugify(rowSerial||String(certSeqRef.current))}-${String(certSeqRef.current++).padStart(2,"0")}`;
      const payload=buildCertPayload(certNumber,{
        data:{
          ...row,
          client_name:overrides.client_name||null,
          location:overrides.location||null,
          inspection_date:normalizeDate(overrides.inspection_date)||null,
          expiry_date:normalizeDate(overrides.expiry_date)||null,
        },
        manualResult:row.result,
        manualDefects:row.defects_found,
      },overrides);
      const res=await fetch("/api/certificates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const json=await res.json();
      if(!res.ok)throw new Error(json?.error||`Save failed: ${res.status}`);
      setItems(prev=>prev.map(it=>it.id===id?{...it,saving:false,saved:true,certNumber,savedId:json?.id||json?.data?.id||null,saveError:null}:it));
    }catch(e){setItems(prev=>prev.map(it=>it.id===id?{...it,saving:false,saved:false,saveError:e.message}:it));}
  }

  async function saveAll(){
    const unsaved=items.filter(x=>!x.saved&&!x.saving).map(x=>x.id);
    if(!unsaved.length||savingAll)return;
    setSavingAll(true);
    let completed=0;
    setProgress(2,`Saving ${unsaved.length} item${unsaved.length===1?"":"s"}...`);
    await runWithConcurrency(unsaved,PARALLEL_LIMIT,async id=>{await saveOne(id);completed+=1;setProgress(5+(completed/unsaved.length)*90,`Saved ${completed}/${unsaved.length}`);});
    setProgress(100,"Save complete");
    setSavingAll(false);
  }

  return(
    <div style={{display:"grid",gap:14}}>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Override</div><div className="card-sub">Client, dates applied to ALL extracted items.</div></div>
        </div>
        <div className="card-body">
          <div className="override-grid">
            <div className="ov-f"><label className="ov-lbl">Client name</label><input className="ov-input" type="text" placeholder="e.g. Unitrans" value={overrides.client_name} onChange={e=>setOverrides(p=>({...p,client_name:e.target.value}))}/></div>
            <div className="ov-f"><label className="ov-lbl">Location / Site</label><input className="ov-input" type="text" placeholder="e.g. Processing Plant" value={overrides.location} onChange={e=>setOverrides(p=>({...p,location:e.target.value}))}/></div>
            <div className="ov-f"><label className="ov-lbl">Inspection date</label><input className="ov-input" type="date" value={overrides.inspection_date} onChange={e=>setOverrides(p=>({...p,inspection_date:e.target.value}))}/></div>
            <div className="ov-f"><label className="ov-lbl">Expiry date</label><input className="ov-input" type="date" value={overrides.expiry_date} onChange={e=>setOverrides(p=>({...p,expiry_date:e.target.value}))}/></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">📸 Upload list photos</div><div className="card-sub">Up to 5 pages — AI reads every line</div></div>
          <label className="browse-label">Browse<input ref={fileInputRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/></label>
        </div>
        <div className="card-body">
          <div className={`drop-area${dragActive?" drag":""}`} style={{padding:"20px 16px"}}
            onDragOver={e=>{e.preventDefault();setDragActive(true);}}
            onDragLeave={()=>setDragActive(false)}
            onDrop={e=>{e.preventDefault();setDragActive(false);addFiles(e.dataTransfer.files);}}>
            <input type="file" multiple accept="image/*" onChange={e=>addFiles(e.target.files)}/>
            <div className="drop-icon-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
            <div className="drop-h">Drop list photos here</div>
            <div className="drop-p">Multiple pages OK — max 5 images</div>
          </div>
          {files.length>0&&(
            <div style={{display:"grid",gap:6,marginBottom:12}}>
              {files.map(item=>(
                <div className="q-item" key={item.id}>
                  <div className="q-icon">IMG</div>
                  <div style={{flex:1,minWidth:0}}><div className="q-name" title={item.file.name}>{item.file.name}</div><div className="q-size">{fileSizeLabel(item.file)}</div></div>
                  <button className="btn-remove" type="button" onClick={()=>setFiles(p=>p.filter(x=>x.id!==item.id))}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="action-row">
            <button className="btn btn-ghost" type="button" onClick={clearAll}>Clear</button>
            <button className="btn btn-primary" type="button" onClick={handleExtract} disabled={!files.length||extracting}>
              {extracting?<><span className="spinner"/>Reading list...</>:"⚡ Read List with AI"}
            </button>
          </div>
          {progress.visible&&(
            <div className="prog-wrap">
              <div className="prog-meta"><span>{progress.label}</span><span className="prog-pct">{progress.pct}%</span></div>
              <div className="prog-track"><div className="prog-fill" style={{width:`${progress.pct}%`}}/></div>
            </div>
          )}
          {error&&<div className="err-box" style={{marginTop:12}}><div className="err-title">⚠ {error}</div></div>}
        </div>
      </div>

      {items.length>0&&(
        <div className="card">
          <div className="card-header">
            <div>
              <div className="list-banner-text">📋 {items.length} items · {savedCount} saved · {pendingCount} pending</div>
              <div className="list-banner-sub">Client: {overrides.client_name||"not set"} · Inspection: {overrides.inspection_date||"not set"} · Expiry: {overrides.expiry_date||"not set"}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn" type="button" style={{fontSize:11,padding:"6px 12px"}} onClick={addBlankItem}>+ Add row</button>
              <button className="btn-saveall" type="button" onClick={saveAll} disabled={pendingCount===0||savingAll}>
                {savingAll?<><span className="spinner"/>Saving...</>:`Save all (${pendingCount})`}
              </button>
            </div>
          </div>
          <div style={{padding:0}}>
            <div className="list-table-wrap">
              <table className="list-table">
                <thead>
                  <tr>
                    <th style={{width:36}}>#</th>
                    <th style={{minWidth:160}}>Equipment Type</th>
                    <th style={{width:140}}>Serial Number</th>
                    <th style={{width:80}}>SWL</th>
                    <th>Description</th>
                    <th style={{width:110}}>Result</th>
                    <th style={{width:80}}>Status</th>
                    <th style={{width:110}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item,idx)=>(
                    <tr key={item.id} className={item.saved?"row-saved":item.saveError?"row-err":""}>
                      <td style={{color:"var(--hint)",fontWeight:700,fontSize:11}}>{idx+1}</td>
                      <td><select className="list-input" value={item.equipment_type} disabled={item.saved} onChange={e=>updateItem(item.id,"equipment_type",e.target.value)}>{EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></td>
                      <td><input className="list-input" style={{fontFamily:"'IBM Plex Mono',monospace"}} value={item.serial_number} disabled={item.saved} onChange={e=>updateItem(item.id,"serial_number",e.target.value)}/></td>
                      <td><input className="list-input" value={item.swl} disabled={item.saved} onChange={e=>updateItem(item.id,"swl",e.target.value)}/></td>
                      <td><input className="list-input" value={item.equipment_description} disabled={item.saved} onChange={e=>updateItem(item.id,"equipment_description",e.target.value)}/></td>
                      <td>
                        <select className="list-input" value={item.result} disabled={item.saved} onChange={e=>updateItem(item.id,"result",e.target.value)}>
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                          <option value="CONDITIONAL">CONDITIONAL</option>
                        </select>
                      </td>
                      <td>
                        {item.saved?<span className="pill p-pass">✓ Saved</span>
                        :item.saving?<span className="pill p-neutral"><span className="spinner"/>Saving</span>
                        :item.saveError?<span className="pill p-err" title={item.saveError}>⚠ Error</span>
                        :<span className="pill p-neutral">Pending</span>}
                      </td>
                      <td>
                        <div style={{display:"flex",gap:5,alignItems:"center"}}>
                          {item.saved&&item.savedId
                            ?<Link href={`/certificates/${item.savedId}`} className="view-btn" style={{fontSize:11,padding:"4px 9px"}}>View →</Link>
                            :<button className="btn-save" type="button" disabled={item.saved||item.saving} onClick={()=>saveOne(item.id)} style={{fontSize:11,padding:"4px 10px"}}>Save</button>
                          }
                          {!item.saved&&<button type="button" onClick={()=>removeItem(item.id)} style={{background:"none",border:"none",color:"var(--hint)",cursor:"pointer",fontSize:14,padding:"2px 4px",lineHeight:1}}>✕</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {items.length===0&&!extracting&&(
        <div style={{textAlign:"center",padding:"8px 0"}}>
          <button className="btn" type="button" onClick={addBlankItem} style={{fontSize:12,padding:"8px 16px"}}>
            + Add items manually
          </button>
        </div>
      )}
    </div>
  );
}
