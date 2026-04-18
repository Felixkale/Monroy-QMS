// src/app/certificates/import/page.jsx
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

// ── System prompts ────────────────────────────────────────────────────────
const DOC_PROMPT = `You are a senior industrial inspection AI for a QMS system. Extract ALL visible data from the image or document with maximum precision.

NAMEPLATE READING RULES:
- Read brand/manufacturer name exactly as printed
- Equipment type: identify precisely — "Chain Block", "Manual Chain Hoist", "Electric Chain Hoist", "Lever Hoist / Tirfor", "Wire Rope Sling", "Chain Sling", "Web Sling / Flat Sling", "Shackle — Bow / Anchor", "Shackle — D / Dee", "Hook — Swivel", "Safety Harness — Full Body", "Lanyard — Energy Absorbing", "Self-Retracting Lifeline (SRL)", "Spreader Beam", "Lifting Beam", "Beam Clamp", "Electric Winch", "Mobile Crane", "Overhead Crane / EOT Crane", "Pressure Vessel", "Air Receiver", etc.
- SWL/WLL/Capacity: read the large number with unit, put in swl field
- Serial number: read S/No., Serial No., S/N exactly
- Asset tag written in marker/paint, put in asset_tag field
- CE, TUV, SABS marks, put in standard_code

DATE FIELD RULES — CRITICAL:
- "Date:" on equipment nameplate = MANUFACTURE DATE, put ONLY in year_built. NEVER in inspection_date or expiry_date.
- inspection_date = date inspection was performed (from certificate document only)
- expiry_date = date certificate expires (from certificate document only)
- For nameplate photos only: leave inspection_date, expiry_date, next_inspection_due as ""

DATE FORMAT: Return dates as MM/YYYY or DD/MM/YYYY or YYYY only.

Return ONLY valid JSON, no markdown:
{"equipment_type":"","equipment_description":"","manufacturer":"","model":"","serial_number":"","asset_tag":"","year_built":"","capacity_volume":"","swl":"","working_pressure":"","design_pressure":"","test_pressure":"","pressure_unit":"","material":"","standard_code":"","inspection_number":"","client_name":"","location":"","inspection_date":"","expiry_date":"","next_inspection_due":"","inspector_name":"","inspection_body":"","result":"","defects_found":"","recommendations":"","comments":"","nameplate_data":"","raw_text_summary":""}`;

// ── LIST MODE SYSTEM PROMPT — much stronger and more explicit ──────────────
function buildListPrompt(client, inspDate, expiryDate) {
  return `You are an expert OCR and data extraction AI specializing in industrial inspection lists.

The image shows a HANDWRITTEN or PRINTED LIST of lifting/inspection equipment items.

YOUR TASK: Read EVERY single line in the image and extract each item as a JSON object.

OUTPUT FORMAT — YOU MUST RETURN EXACTLY THIS JSON STRUCTURE, nothing else:
{
  "items": [
    {
      "equipment_type": "Chain Block",
      "serial_number": "CB-001",
      "swl": "3T",
      "result": "PASS",
      "defects_found": "",
      "equipment_description": "Chain Block SN CB-001 SWL 3T"
    }
  ]
}

EQUIPMENT TYPE — pick the CLOSEST match from this list:
"Chain Block", "Manual Chain Hoist", "Electric Chain Hoist", "Lever Hoist / Tirfor", "Chain Pulley Block",
"Electric Wire Rope Hoist", "Wire Rope Winch",
"Mobile Crane", "Overhead Crane / EOT Crane", "Gantry Crane", "Jib Crane", "Knuckle Boom Crane",
"Chain Sling", "Wire Rope Sling", "Web Sling / Flat Sling", "Round Sling", "Multi-Leg Chain Sling",
"Shackle — Bow / Anchor", "Shackle — D / Dee", "Hook — Swivel", "Hook — Eye", "Swivel",
"Eye Bolt", "Turnbuckle", "Master Link", "Spreader Beam", "Lifting Beam",
"Beam Clamp", "Plate Clamp — Vertical", "Plate Clamp — Horizontal",
"Safety Harness — Full Body", "Lanyard — Energy Absorbing", "Lanyard — Twin Leg",
"Self-Retracting Lifeline (SRL)", "Fall Arrest Block",
"Electric Winch", "Hydraulic Winch", "Snatch Block", "Pulley Block",
"Trestle Jack", "Bottle Jack", "Axle Jack", "Floor Jack", "Hydraulic Jack", "Jack Stand",
"Counterbalance Forklift", "Scissor Lift", "Boom Lift / Cherry Picker",
"Pressure Vessel", "Air Receiver", "Boiler", "Compressor — Air", "Gas Cylinder",
"Scaffold", "Fire Extinguisher", "Other"

READING RULES:
1. Read EVERY line — do NOT skip any item, even if handwriting is unclear
2. Ditto marks (" or ,, or do.) mean SAME equipment type as the line above — copy it forward
3. If a serial number is unclear, make your best guess at what is written — never leave it blank if anything is visible
4. SWL/capacity: include the unit (e.g. "3T", "1000kg", "5 Ton")
5. result field: "PASS" unless you see "Fail", "F", "X", "Reject", "Condemned" on that line — then "FAIL"
6. defects_found: copy any note written next to that item
7. equipment_description: summarize as "TypeName SN serial SWL swl"
8. Skip ONLY page headers and column headers (like "S/N", "Description", "SWL", "Result")
9. If the image has multiple columns of items, read ALL columns

IMPORTANT: Return ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no extra text.

${client ? `Client name for these items: ${client}` : ""}
${inspDate ? `Inspection date: ${inspDate}` : ""}
${expiryDate ? `Expiry date: ${expiryDate}` : ""}`;
}

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EQUIPMENT_TYPES = [
  "Chain Block","Manual Chain Hoist","Electric Chain Hoist","Lever Hoist / Tirfor","Chain Pulley Block",
  "Electric Wire Rope Hoist","Wire Rope Winch",
  "Mobile Crane","Overhead Crane / EOT Crane","Gantry Crane","Jib Crane","Knuckle Boom Crane","Davit Crane",
  "Chain Sling","Wire Rope Sling","Web Sling / Flat Sling","Round Sling","Multi-Leg Chain Sling","Multi-Leg Wire Rope Sling",
  "Shackle — Bow / Anchor","Shackle — D / Dee","Hook — Swivel","Hook — Eye","Swivel","Eye Bolt","Turnbuckle","Master Link",
  "Spreader Beam","Lifting Beam","Adjustable Spreader Beam","Magnetic Lifter","Vacuum Lifter Pad",
  "Beam Clamp","Plate Clamp — Vertical","Plate Clamp — Horizontal","Pipe Clamp",
  "Safety Harness — Full Body","Lanyard — Energy Absorbing","Lanyard — Twin Leg","Self-Retracting Lifeline (SRL)","Fall Arrest Block",
  "Electric Winch","Hydraulic Winch","Snatch Block","Pulley Block",
  "Trestle Jack","Bottle Jack","Axle Jack","Floor Jack","Hydraulic Jack","Jack Stand",
  "Counterbalance Forklift","Scissor Lift","Boom Lift / Cherry Picker","Personnel Basket / Man Basket",
  "Pressure Vessel","Air Receiver","Boiler","Compressor — Air","Gas Cylinder",
  "Hydraulic Pump","Impact Wrench","Torque Wrench",
  "Scaffold","Fire Extinguisher","Other",
];

function uid() { return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,10)}`; }
function isAllowedFile(f) { return f&&(f.type==="application/pdf"||f.type.startsWith("image/"))&&f.size<=MAX_FILE_SIZE; }
function nonEmpty(d) { return Object.values(d||{}).filter(v=>v!=null&&String(v).trim()!=="").length; }
function pillClass(r) { const v=String(r||"").toUpperCase(); return v==="PASS"?"p-pass":v==="FAIL"?"p-fail":v==="CONDITIONAL"?"p-cond":"p-neutral"; }
function slugify(v) { return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,16)||"UNKNOWN"; }
function fileSizeLabel(f) { if(!f)return""; return f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${Math.round(f.size/1024)} KB`; }
function toBase64(file) { return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]); r.onerror=rej; r.readAsDataURL(file); }); }

function normalizeDate(raw) {
  if(!raw)return"";
  const s=String(raw).trim();
  if(!s||s==="—"||s==="-")return"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(/^\d{4}-\d{2}$/.test(s)){const[y,m]=s.split("-").map(Number);return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;}
  if(/^\d{1,2}\.\d{4}$/.test(s)){const[m,y]=s.split(".").map(Number);return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;}
  if(/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)){const[d,m,y]=s.split(".").map(Number);return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
  if(/^\d{1,2}\/\d{4}$/.test(s)){const[m,y]=s.split("/").map(Number);return`${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;}
  if(/^\d{1,2}\/\d{2}$/.test(s)){const[m,y]=s.split("/").map(Number);const fy=2000+y;return`${fy}-${String(m).padStart(2,"0")}-${String(new Date(fy,m,0).getDate()).padStart(2,"0")}`;}
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const[d,m,y]=s.split("/").map(Number);return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
  if(/^\d{4}$/.test(s))return`${s}-01-01`;
  const months=["january","february","march","april","may","june","july","august","september","october","november","december"];
  const mm=s.toLowerCase().match(/([a-z]+)\s*,?\s*(\d{4})/);
  if(mm){const mi=months.indexOf(mm[1]);if(mi>=0){const last=new Date(+mm[2],mi+1,0).getDate();return`${mm[2]}-${String(mi+1).padStart(2,"0")}-${String(last).padStart(2,"0")}`;}}
  try{const d=new Date(s);if(!isNaN(d))return d.toISOString().slice(0,10);}catch(e){}
  return"";
}

async function uploadPdfToStorage(file, certId, certNumber) {
  try {
    if (!file || file.type !== "application/pdf") return null;
    const safeCertNum = (certNumber || certId || "CERT").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${safeCertNum}_${safeOriginal}`;
    const { data, error } = await supabase.storage
      .from("certificates")
      .upload(storagePath, file, { contentType: "application/pdf", upsert: true });
    if (error) { console.error("PDF upload error:", error.message); return null; }
    const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(data.path);
    return urlData?.publicUrl || null;
  } catch (e) {
    console.error("PDF upload failed:", e.message);
    return null;
  }
}

export default function ImportCertificatesPage() {
  const [mode, setMode] = useState("document");

  return (
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

          {mode==="document" ? <DocumentMode/> : mode==="list" ? <ListMode/> : <BackfillMode/>}
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
          .cert-import-page .rcard.is-err{border-color:var(--red-b)}.cert-import-page .rcard.is-saved{border-color:var(--green-b)}
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
          .cert-import-page .stat-card.blue::before{background:var(--blue)}.cert-import-page .stat-card.green::before{background:var(--green)}.cert-import-page .stat-card.red::before{background:var(--red)}.cert-import-page .stat-card.amber::before{background:var(--amber)}
          .cert-import-page .stat-lbl{font-size:11px;color:var(--sub);font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
          .cert-import-page .stat-val{font-size:26px;font-weight:700;letter-spacing:-.03em}
          .cert-import-page .stat-val.blue{color:var(--blue-t)}.cert-import-page .stat-val.green{color:var(--green-t)}.cert-import-page .stat-val.red{color:var(--red-t)}.cert-import-page .stat-val.amber{color:var(--amber-t)}
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

// ══════════════════════════════════════════════════════════════
// DOCUMENT MODE
// ══════════════════════════════════════════════════════════════
function DocumentMode() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgressState] = useState({visible:false,pct:0,label:""});
  const [overrides, setOverrides] = useState({client_name:"",location:"",inspection_date:"",expiry_date:""});
  const fileInputRef = useRef(null);
  const dropInputRef = useRef(null);
  const certSeqRef = useRef(1);

  const overrideCount = useMemo(()=>Object.values(overrides).filter(v=>String(v||"").trim()).length,[overrides]);
  const stats = useMemo(()=>{
    const ok=results.filter(x=>x.ok).length;
    const err=results.filter(x=>!x.ok).length;
    const pass=results.filter(x=>x.ok&&(x.manualResult||x.data?.result)==="PASS").length;
    return{total:results.length,ok,err,pass,canSaveAll:results.some(x=>x.ok&&!x.saved&&!x.saving)};
  },[results]);

  function setProgress(pct,label){setProgressState({visible:true,pct:Math.round(pct),label});}
  function resetInputs(){if(fileInputRef.current)fileInputRef.current.value="";if(dropInputRef.current)dropInputRef.current.value="";}
  function addFiles(list){
    setFiles(prev=>{const next=[...prev];list.filter(isAllowedFile).forEach(f=>{if(!next.find(x=>x.file.name===f.name&&x.file.size===f.size)&&next.length<MAX_FILES)next.push({id:uid(),file:f});});return next;});
    resetInputs();
  }
  function clearAll(){setFiles([]);setResults([]);setProgressState({visible:false,pct:0,label:""});resetInputs();}
  function setOverride(k,v){setOverrides(p=>({...p,[k]:v}));}
  function clearOverrides(){setOverrides({client_name:"",location:"",inspection_date:"",expiry_date:""});}
  function applyOverrides(data){
    const next={...(data||{})};
    if(overrides.client_name)next.client_name=overrides.client_name;
    if(overrides.location)next.location=overrides.location;
    if(overrides.inspection_date)next.inspection_date=overrides.inspection_date;
    if(overrides.expiry_date)next.expiry_date=overrides.expiry_date;
    return next;
  }
  function genCert(data,fileName){
    const base=slugify(data?.serial_number)||slugify(data?.inspection_number)||slugify(String(fileName||"").replace(/\.[^.]+$/,""));
    return`CERT-${base}-${String(certSeqRef.current++).padStart(2,"0")}`;
  }

  async function handleExtract(){
    if(!files.length||extracting)return;
    setExtracting(true);setResults([]);setProgress(5,"Preparing files...");
    try{
      const payloads=[];
      for(let i=0;i<files.length;i++){
        setProgress(5+(i/files.length)*30,`Reading ${i+1}/${files.length}: ${files[i].file.name}`);
        payloads.push({fileName:files[i].file.name,mimeType:files[i].file.type||"application/pdf",base64Data:await toBase64(files[i].file)});
      }
      setProgress(42,"Sending to Gemini 2.5 Flash...");
      const res=await fetch("/api/ai/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({files:payloads,systemPrompt:DOC_PROMPT})});
      setProgress(85,"Parsing results...");
      const json=await res.json();
      if(!res.ok)throw new Error(json?.error||`Server error ${res.status}`);
      if(!Array.isArray(json?.results))throw new Error("Unexpected response");
      const mapped=json.results.map(item=>{
        if(!item.ok||!item.data)return{...item,saved:false,saving:false,saveError:null,expanded:false,certNumber:null,savedId:null,manualResult:"PASS",manualDefects:""};
        const rawData={...item.data,inspection_date:normalizeDate(item.data.inspection_date),expiry_date:normalizeDate(item.data.expiry_date),next_inspection_due:normalizeDate(item.data.next_inspection_due)};
        const data=applyOverrides(rawData);
        return{...item,data,saved:false,saving:false,saveError:null,savedId:null,expanded:false,certNumber:null,manualResult:data.result||"PASS",manualDefects:data.defects_found||""};
      });
      setResults(mapped);setProgress(100,"Extraction complete");
    }catch(e){
      setResults([{fileName:"Request failed",ok:false,error:e.message||"Unexpected error",saved:false,saving:false,saveError:null,expanded:false,certNumber:null,savedId:null,manualResult:"PASS",manualDefects:""}]);
      setProgress(100,"Extraction failed");
    }finally{setExtracting(false);}
  }

  function setResultField(idx,key,value){setResults(prev=>prev.map((it,i)=>i===idx?{...it,[key]:value}:it));}
  function toggleExpanded(idx){setResults(prev=>prev.map((it,i)=>i===idx?{...it,expanded:!it.expanded}:it));}
  function generateCompanyCode(name){const initials=name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");return`${initials}-${String(Math.floor(Math.random()*900)+100)}`;}
  function generateSerialNumber(clientName,equipmentType){const clientCode=(clientName||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");const equipCode=(equipmentType||"EQP").trim().split(/[\s/—-]+/).filter(Boolean).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");const ts=String(Date.now()).slice(-6);return`${clientCode}-${equipCode}-${ts}`;}
  async function ensureClient(clientName,city){if(!clientName||!clientName.trim())return{skip:true};const name=clientName.trim();try{const{data:existing,error:lookupErr}=await supabase.from("clients").select("id").ilike("company_name",name).maybeSingle();if(lookupErr)return{error:lookupErr.message};if(existing)return{exists:true};const{error:insertErr}=await supabase.from("clients").insert({company_name:name,company_code:generateCompanyCode(name),city:city||"",country:"Botswana",status:"active"});if(insertErr)return{error:insertErr.message};return{created:true};}catch(e){return{error:e.message};}}

  async function saveOne(idx){
    const row=results[idx];
    if(!row?.ok||row.saved||row.saving)return;
    setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:true,saveError:null}:it));
    try{
      const certNumber=genCert(row.data,row.fileName);
      if(!row.data.serial_number||!row.data.serial_number.trim()){
        const clientForSerial=overrides.client_name?.trim()||row.data.client_name||"";
        row.data.serial_number=generateSerialNumber(clientForSerial,row.data.equipment_type);
      }
      const effectiveClient=overrides.client_name?.trim()||row.data.client_name;
      const effectiveCity=overrides.location?.trim()||row.data.location||"";
      const clientResult=await ensureClient(effectiveClient,effectiveCity);
      if(clientResult?.error)console.warn("Client auto-register failed:",clientResult.error);
      const payload={certificate_number:certNumber,inspection_number:row.data.inspection_number||null,result:row.manualResult||row.data.result||"UNKNOWN",issue_date:row.data.inspection_date||null,inspection_date:row.data.inspection_date||null,expiry_date:row.data.expiry_date||null,next_inspection_due:row.data.next_inspection_due||null,equipment_description:row.data.equipment_description||row.data.equipment_type||null,equipment_type:row.data.equipment_type||null,asset_name:row.data.equipment_description||row.data.equipment_type||null,asset_type:row.data.equipment_type||null,client_name:row.data.client_name||null,status:"active",manufacturer:row.data.manufacturer||null,model:row.data.model||null,serial_number:row.data.serial_number||null,year_built:row.data.year_built||null,capacity_volume:row.data.capacity_volume||null,swl:row.data.swl||null,working_pressure:row.data.working_pressure||null,design_pressure:row.data.design_pressure||null,test_pressure:row.data.test_pressure||null,pressure_unit:row.data.pressure_unit||null,material:row.data.material||null,standard_code:row.data.standard_code||null,location:row.data.location||null,inspector_name:row.data.inspector_name||null,inspection_body:row.data.inspection_body||null,defects_found:row.manualDefects||row.data.defects_found||null,recommendations:row.data.recommendations||null,comments:row.data.comments||null,nameplate_data:row.data.nameplate_data||null,raw_text_summary:row.data.raw_text_summary||null,asset_tag:row.data.asset_tag||null};
      const res=await fetch("/api/certificates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const json=await res.json();
      if(!res.ok)throw new Error(json?.error||`Save failed: ${res.status}`);
      const certId=json?.id||json?.data?.id||null;
      let pdfUrl=null;
      const fileEntry=files.find(f=>f.file.name===row.fileName);
      if(fileEntry?.file&&fileEntry.file.type==="application/pdf"){
        pdfUrl=await uploadPdfToStorage(fileEntry.file,certId,certNumber);
        if(pdfUrl&&certId){await supabase.from("certificates").update({pdf_url:pdfUrl}).eq("id",certId);}
      }
      setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:false,saved:true,certNumber,savedId:certId,saveError:null,pdfUrl}:it));
    }catch(e){setResults(prev=>prev.map((it,i)=>i===idx?{...it,saving:false,saved:false,saveError:e.message||"Save failed."}:it));}
  }

  async function saveAll(){
    const indexes=results.map((_,i)=>i).filter(i=>results[i].ok&&!results[i].saved&&!results[i].saving);
    for(const idx of indexes)await saveOne(idx);
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
              <div className={`drop-area${dragActive?" drag":""}`} onDragOver={e=>{e.preventDefault();setDragActive(true);}} onDragLeave={()=>setDragActive(false)} onDrop={e=>{e.preventDefault();setDragActive(false);addFiles(Array.from(e.dataTransfer.files||[]));}}>
                <input ref={dropInputRef} type="file" multiple accept=".pdf,image/*" onChange={e=>addFiles(Array.from(e.target.files||[]))}/>
                <div className="drop-icon-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                <div className="drop-h">Drop files here</div>
                <div className="drop-p">Certificates, nameplates, equipment photos</div>
                <div className="type-chips"><span className="chip">PDF</span><span className="chip">PNG</span><span className="chip">JPG</span><span className="chip">WEBP</span></div>
              </div>
              <div className="action-row">
                <button className="btn btn-ghost" type="button" onClick={clearAll}>Clear all</button>
                <button className="btn btn-primary" type="button" onClick={handleExtract} disabled={!files.length||extracting}>{extracting?"Extracting...":"⚡ Extract with AI"}</button>
              </div>
              {progress.visible&&<div className="prog-wrap"><div className="prog-meta"><span>{progress.label}</span><span className="prog-pct">{progress.pct}%</span></div><div className="prog-track"><div className="prog-fill" style={{width:`${progress.pct}%`}}/></div></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title" style={{gap:8}}>Manual override{overrideCount?<span className="abadge">{overrideCount} active</span>:null}</div><div className="card-sub">Always overwrites extracted values when set.</div></div>
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
              {!files.length?<div className="empty-state">No files added yet.</div>:files.map(item=>(
                <div className="q-item" key={item.id}><div className="q-icon">{item.file.type==="application/pdf"?"PDF":"IMG"}</div><div style={{flex:1,minWidth:0}}><div className="q-name" title={item.file.name}>{item.file.name}</div><div className="q-size">{fileSizeLabel(item.file)}</div></div><button className="btn-remove" type="button" onClick={()=>setFiles(p=>p.filter(x=>x.id!==item.id))}>✕</button></div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{borderRadius:"var(--rxl)"}}>
          <div className="card-header">
            <div><div className="card-title">Extracted results</div><div className="card-sub">Review, set result and defects, then save to register</div></div>
            <button className="btn-saveall" type="button" onClick={saveAll} disabled={!stats.canSaveAll}>Save all successful</button>
          </div>
          <div className="card-body">
            <div className="result-list">
              {!results.length?<div className="empty-state" style={{padding:"32px 0"}}>Upload files and click Extract with AI to begin</div>
              :results.map((item,idx)=>{
                const d=item.data||{};
                const rv=item.manualResult||d.result||"UNKNOWN";
                const disabled=item.saved||item.saving;
                return(
                  <div key={`${item.fileName}-${idx}`} className={`rcard${item.ok?(item.saved?" is-saved":""):" is-err"}`}>
                    <div className="rhead">
                      <div className="rnum" style={item.ok?{background:"var(--green-bg)",color:"var(--green-t)"}:{background:"var(--red-bg)",color:"var(--red-t)"}}>{idx+1}</div>
                      <div className="rfname" title={item.fileName}>{item.fileName}</div>
                      {item.ok&&<span className="pill p-info">{nonEmpty(d)} fields</span>}
                      {item.ok&&d.equipment_type&&<span className="pill p-neutral">{d.equipment_type}</span>}
                      {item.ok&&<span className={`pill ${pillClass(rv)}`}>{rv}</span>}
                      {item.saved&&item.certNumber&&<span className="cert-num">{item.certNumber}</span>}
                      {item.saved&&item.pdfUrl&&<span className="pill p-pass">📎 PDF</span>}
                      <span className={`pill ${item.ok?"p-ok":"p-err"}`}>{item.ok?"OK":"Error"}</span>
                    </div>
                    {!item.ok?(
                      <div className="rbody"><div className="err-box"><div className="err-title">{item.error||"Extraction failed."}</div><div className="err-detail">Check /api/ai/extract is deployed and your API key is set.</div></div></div>
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
                          {d.raw_text_summary&&<div className="raw-sum">{d.raw_text_summary}</div>}
                          <div className="two-fields">
                            <div><label className="field-lbl">Inspection result</label><select className="sel" value={item.manualResult} disabled={disabled} onChange={e=>setResultField(idx,"manualResult",e.target.value)}><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="CONDITIONAL">CONDITIONAL</option><option value="UNKNOWN">UNKNOWN</option></select></div>
                            <div><label className="field-lbl">Defects found</label><textarea className="ta" value={item.manualDefects} disabled={disabled} placeholder="Describe defects, cracks, wear..." onChange={e=>setResultField(idx,"manualDefects",e.target.value)}/></div>
                          </div>
                          {item.saveError&&<div className="save-err">{item.saveError}</div>}
                          <div className="rfoot">
                            <button className="expand-btn" type="button" onClick={()=>toggleExpanded(idx)}>{item.expanded?"Hide all fields ↑":"Show all fields ↓"}</button>
                            <div className="foot-actions">
                              {item.saved&&item.savedId&&(<><Link href={`/certificates/${item.savedId}`} className="view-btn">View →</Link><Link href={`/certificates/${item.savedId}/edit`} className="edit-btn">Edit</Link></>)}
                              <button className="btn-save" type="button" disabled={disabled} onClick={()=>saveOne(idx)}>{item.saved?"Saved ✓":item.saving?<><span className="spinner"/>Saving...</>:"Save to register"}</button>
                            </div>
                          </div>
                        </div>
                        {item.expanded&&<div className="drawer"><div className="drawer-grid">{Object.entries(d).map(([k,v])=><div className="dc" key={k}><div className="dc-k">{k.replace(/_/g," ")}</div><div className="dc-v">{v!=null&&String(v).trim()!==""?String(v):"—"}</div></div>)}</div></div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// BACKFILL MODE
// ══════════════════════════════════════════════════════════════
function BackfillMode() {
  const [files, setFiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgressState] = useState({visible:false,pct:0,done:0,total:0});
  const fileInputRef = useRef(null);

  function addFiles(list) {
    const pdfs = Array.from(list).filter(f=>f.type==="application/pdf"&&f.size<=MAX_FILE_SIZE);
    setFiles(prev=>{const next=[...prev];pdfs.forEach(f=>{if(!next.find(x=>x.name===f.name&&x.size===f.size))next.push(f);});return next;});
    if(fileInputRef.current)fileInputRef.current.value="";
  }

  async function matchFiles() {
    if(!files.length)return;
    setLoading(true);
    const {data:certs}=await supabase.from("certificates").select("id,certificate_number,equipment_description,client_name").is("pdf_url",null).order("created_at",{ascending:false}).limit(2000);
    const matched = files.map(file => {
      const fname = file.name.replace(/\.pdf$/i,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
      const cert = (certs||[]).find(c=>{const cnum=(c.certificate_number||"").toUpperCase().replace(/[^A-Z0-9]/g,"");return fname.includes(cnum)||cnum.includes(fname);});
      return {file,certId:cert?.id||null,certNumber:cert?.certificate_number||null,clientName:cert?.client_name||null,status:cert?"ready":"unmatched",pdfUrl:null,error:null};
    });
    setRows(matched);
    setLoading(false);
  }

  async function uploadOne(idx) {
    const row = rows[idx];
    if(!row.certId||row.status==="done"||row.status==="uploading")return;
    setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"uploading",error:null}:r));
    const pdfUrl = await uploadPdfToStorage(row.file, row.certId, row.certNumber);
    if(!pdfUrl){setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"error",error:"Upload failed"}:r));return;}
    const {error:patchErr}=await supabase.from("certificates").update({pdf_url:pdfUrl}).eq("id",row.certId);
    if(patchErr){setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"error",error:patchErr.message}:r));return;}
    setRows(prev=>prev.map((r,i)=>i===idx?{...r,status:"done",pdfUrl}:r));
  }

  async function uploadAll() {
    setRunning(true);
    const ready = rows.map((_,i)=>i).filter(i=>rows[i].status==="ready");
    setProgressState({visible:true,pct:0,done:0,total:ready.length});
    for(let i=0;i<ready.length;i++){await uploadOne(ready[i]);setProgressState({visible:true,pct:Math.round(((i+1)/ready.length)*100),done:i+1,total:ready.length});}
    setRunning(false);
  }

  const readyCount = rows.filter(r=>r.status==="ready").length;
  const doneCount  = rows.filter(r=>r.status==="done").length;
  const errCount   = rows.filter(r=>r.status==="error").length;

  return(
    <div style={{display:"grid",gap:14}}>
      <div className="card">
        <div className="card-header"><div><div className="card-title">🗂 Backfill PDFs for existing certificates</div><div className="card-sub">Upload the original PDFs — matched to certificates by filename and stored.</div></div></div>
        <div className="card-body">
          <div style={{background:"rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:12,color:"var(--sub)",lineHeight:1.7}}>
            <strong style={{color:"var(--accent)"}}>How it works:</strong> Name your PDF files after the certificate number (e.g. <code style={{background:"var(--s3)",padding:"1px 6px",borderRadius:4}}>CERT-CR00040.pdf</code>). Upload them here — the tool matches each file to the right certificate and uploads it to storage automatically.
          </div>
          <div className="drop-area" onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}>
            <input ref={fileInputRef} type="file" multiple accept=".pdf" onChange={e=>addFiles(e.target.files)}/>
            <div className="drop-icon-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
            <div className="drop-h">Drop PDF files here</div>
            <div className="drop-p">Named after certificate numbers — e.g. CERT-CR00040.pdf</div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:files.length?12:0}}>
            {files.length>0&&<><span style={{fontSize:12,color:"var(--sub)",alignSelf:"center"}}>{files.length} PDF{files.length===1?"":"s"} selected</span><button className="btn btn-primary" type="button" onClick={matchFiles} disabled={loading} style={{flex:"none",padding:"8px 18px"}}>{loading?"Matching…":"🔍 Match to certificates"}</button><button className="btn btn-ghost" type="button" onClick={()=>{setFiles([]);setRows([]);}} style={{flex:"none"}}>Clear</button></>}
          </div>
        </div>
      </div>
      {rows.length>0&&(
        <div className="card">
          <div className="card-header">
            <div><div className="list-banner-text">{readyCount} ready · {doneCount} uploaded · {errCount} errors · {rows.filter(r=>r.status==="unmatched").length} unmatched</div><div className="list-banner-sub">Unmatched files could not be linked — rename to match the cert number.</div></div>
            <button className="btn-saveall" type="button" onClick={uploadAll} disabled={readyCount===0||running}>{running?<><span className="spinner"/>Uploading…</>:`⬆ Upload all (${readyCount})`}</button>
          </div>
          {progress.visible&&<div style={{padding:"8px 18px",borderBottom:"1px solid var(--b1)"}}><div className="prog-meta"><span>{progress.done}/{progress.total} uploaded</span><span className="prog-pct">{progress.pct}%</span></div><div className="prog-track"><div className="prog-fill" style={{width:`${progress.pct}%`}}/></div></div>}
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

// ══════════════════════════════════════════════════════════════
// LIST MODE — fixed extraction and error surfacing
// ══════════════════════════════════════════════════════════════
function ListMode() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgressState] = useState({visible:false,pct:0,label:""});
  const [items, setItems] = useState([]);
  const [overrides, setOverrides] = useState({client_name:"",location:"",inspection_date:"",expiry_date:""});
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [rawDebug, setRawDebug] = useState(""); // show raw AI response on failure
  const fileInputRef = useRef(null);
  const certSeqRef = useRef(1);

  const savedCount = useMemo(()=>items.filter(x=>x.saved).length,[items]);
  const pendingCount = useMemo(()=>items.filter(x=>!x.saved&&!x.saving).length,[items]);

  function setProgress(pct,label){setProgressState({visible:true,pct:Math.round(pct),label});}
  function addFiles(list){
    setFiles(prev=>{const next=[...prev];Array.from(list).filter(isAllowedFile).forEach(f=>{if(!next.find(x=>x.file.name===f.name&&x.file.size===f.size)&&next.length<5)next.push({id:uid(),file:f});});return next;});
    if(fileInputRef.current)fileInputRef.current.value="";
  }
  function clearAll(){setFiles([]);setItems([]);setError("");setRawDebug("");setProgressState({visible:false,pct:0,label:""});}

  async function handleExtract(){
    if(!files.length||extracting)return;
    setExtracting(true);setError("");setRawDebug("");setItems([]);
    setProgress(10,"Reading list photos...");
    try{
      const payloads=[];
      for(let i=0;i<files.length;i++){
        setProgress(10+(i/files.length)*35,`Reading page ${i+1}/${files.length}...`);
        payloads.push({fileName:files[i].file.name,mimeType:files[i].file.type||"image/jpeg",base64Data:await toBase64(files[i].file)});
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
      const json=await res.json();

      if(!res.ok){
        throw new Error(json?.error||`Server error ${res.status}`);
      }

      // Collect ALL items from ALL file results
      let allItems=[];
      const errors=[];

      for(const result of(json.results||[])){
        if(!result.ok){
          errors.push(result.error||"File extraction failed");
          continue;
        }
        // result.data should now always be { items: [...] } from the fixed route
        const items=result.data?.items;
        if(Array.isArray(items)&&items.length>0){
          allItems=[...allItems,...items];
        } else {
          errors.push(`${result.fileName}: AI returned 0 items`);
        }
      }

      setProgress(100,allItems.length>0?`Found ${allItems.length} items`:"Failed");

      if(allItems.length===0){
        const errMsg=errors.length>0?errors.join(" | "):"AI could not extract any items from the image.";
        setError(`${errMsg} — Tips: Use a higher-resolution photo, ensure good lighting, avoid shadows over text.`);
        setExtracting(false);
        return;
      }

      if(errors.length>0){
        setError(`Warning: Some pages had issues — ${errors.join(" | ")}`);
      }

      setItems(allItems.map((item,i)=>({
        id:uid(),
        serial_number:String(item.serial_number||"").trim(),
        swl:String(item.swl||"").trim(),
        equipment_type:String(item.equipment_type||"Other").trim(),
        equipment_description:item.equipment_description||`${item.equipment_type||"Equipment"} SN ${item.serial_number||i+1} SWL ${item.swl||""}`.trim(),
        result:String(item.result||"PASS").trim().toUpperCase()||"PASS",
        defects_found:String(item.defects_found||"").trim(),
        saved:false,saving:false,savedId:null,certNumber:null,saveError:null,
      })));

    }catch(e){
      setError(e.message||"Extraction failed. Check your API key and try again.");
      setProgress(100,"Failed");
    }finally{
      setExtracting(false);
    }
  }

  function updateItem(id,key,value){setItems(prev=>prev.map(it=>it.id===id?{...it,[key]:value}:it));}
  function removeItem(id){setItems(prev=>prev.filter(it=>it.id!==id));}
  function addBlankItem(){setItems(prev=>[...prev,{id:uid(),serial_number:"",swl:"",equipment_type:"Other",equipment_description:"",result:"PASS",defects_found:"",saved:false,saving:false,savedId:null,certNumber:null,saveError:null}]);}
  function generateCompanyCode(name){const initials=name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");return`${initials}-${String(Math.floor(Math.random()*900)+100)}`;}
  function generateSerialNumber(clientName,equipmentType){const clientCode=(clientName||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");const equipCode=(equipmentType||"EQP").trim().split(/[\s/—-]+/).filter(Boolean).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");const ts=String(Date.now()).slice(-6);return`${clientCode}-${equipCode}-${ts}`;}
  async function ensureClient(clientName,city){if(!clientName||!clientName.trim())return{skip:true};const name=clientName.trim();try{const{data:existing,error:lookupErr}=await supabase.from("clients").select("id").ilike("company_name",name).maybeSingle();if(lookupErr)return{error:lookupErr.message};if(existing)return{exists:true};const{error:insertErr}=await supabase.from("clients").insert({company_name:name,company_code:generateCompanyCode(name),city:city||"",country:"Botswana",status:"active"});if(insertErr)return{error:insertErr.message};return{created:true};}catch(e){return{error:e.message};}}

  async function saveOne(id){
    const row=items.find(x=>x.id===id);
    if(!row||row.saved||row.saving)return;
    setItems(prev=>prev.map(it=>it.id===id?{...it,saving:true,saveError:null}:it));
    try{
      if(overrides.client_name){const cr=await ensureClient(overrides.client_name,overrides.location||"");if(cr?.error)console.warn("Client auto-register failed:",cr.error);}
      let rowSerial=row.serial_number?.trim()||generateSerialNumber(overrides.client_name||"",row.equipment_type||"");
      const certNumber=`CERT-${slugify(rowSerial||String(certSeqRef.current))}-${String(certSeqRef.current++).padStart(2,"0")}`;
      const payload={certificate_number:certNumber,result:row.result||"PASS",equipment_type:row.equipment_type||null,equipment_description:row.equipment_description||null,asset_name:row.equipment_description||null,asset_type:row.equipment_type||null,serial_number:rowSerial||null,swl:row.swl||null,client_name:overrides.client_name||null,location:overrides.location||null,issue_date:normalizeDate(overrides.inspection_date)||null,inspection_date:normalizeDate(overrides.inspection_date)||null,expiry_date:normalizeDate(overrides.expiry_date)||null,defects_found:row.defects_found||null,status:"active"};
      const res=await fetch("/api/certificates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const json=await res.json();
      if(!res.ok)throw new Error(json?.error||`Save failed: ${res.status}`);
      setItems(prev=>prev.map(it=>it.id===id?{...it,saving:false,saved:true,certNumber,savedId:json?.id||json?.data?.id||null,saveError:null}:it));
    }catch(e){setItems(prev=>prev.map(it=>it.id===id?{...it,saving:false,saved:false,saveError:e.message}:it));}
  }

  async function saveAll(){setSavingAll(true);const unsaved=items.filter(x=>!x.saved&&!x.saving).map(x=>x.id);for(const id of unsaved)await saveOne(id);setSavingAll(false);}

  return(
    <div style={{display:"grid",gap:14}}>
      <div className="card">
        <div className="card-header"><div><div className="card-title">Manual override</div><div className="card-sub">Client, dates applied to ALL extracted items.</div></div>{Object.values(overrides).some(v=>String(v||"").trim())&&<button className="btn btn-ghost" type="button" style={{fontSize:11,padding:"5px 10px"}} onClick={()=>setOverrides({client_name:"",location:"",inspection_date:"",expiry_date:""})}>Clear</button>}</div>
        <div className="card-body"><div className="override-grid"><div className="ov-f"><label className="ov-lbl">Client name</label><input className="ov-input" type="text" placeholder="e.g. Unitrans" value={overrides.client_name} onChange={e=>setOverrides(p=>({...p,client_name:e.target.value}))}/></div><div className="ov-f"><label className="ov-lbl">Location / Site</label><input className="ov-input" type="text" placeholder="e.g. Processing Plant" value={overrides.location} onChange={e=>setOverrides(p=>({...p,location:e.target.value}))}/></div><div className="ov-f"><label className="ov-lbl">Inspection date</label><input className="ov-input" type="date" value={overrides.inspection_date} onChange={e=>setOverrides(p=>({...p,inspection_date:e.target.value}))}/></div><div className="ov-f"><label className="ov-lbl">Expiry date</label><input className="ov-input" type="date" value={overrides.expiry_date} onChange={e=>setOverrides(p=>({...p,expiry_date:e.target.value}))}/></div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">📸 Upload list photos</div><div className="card-sub">Up to 5 pages — AI reads every line of your handwritten or printed list</div></div>
          <label className="browse-label">Browse<input ref={fileInputRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/></label>
        </div>
        <div className="card-body">
          {/* Tips banner */}
          <div style={{background:"rgba(0,212,255,0.05)",border:"1px solid rgba(0,212,255,0.15)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:11,color:"var(--sub)",lineHeight:1.7}}>
            <strong style={{color:"var(--accent)"}}>Tips for best results:</strong> Take photo in good light · Keep camera parallel to page · Avoid shadows · Full resolution · Each column clearly visible
          </div>

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

          {error&&(
            <div className="err-box" style={{marginTop:12}}>
              <div className="err-title">⚠ {error}</div>
              <div className="err-detail" style={{marginTop:6}}>
                If this keeps failing, try: higher resolution photo · better lighting · fewer items per page · or add items manually below.
              </div>
            </div>
          )}
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
                      <td><select className="list-input" value={item.result} disabled={item.saved} onChange={e=>updateItem(item.id,"result",e.target.value)}><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="CONDITIONAL">CONDITIONAL</option></select></td>
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
                            :<button className="btn-save" type="button" disabled={item.saved||item.saving} onClick={()=>saveOne(item.id)} style={{fontSize:11,padding:"4px 10px"}}>Save</button>}
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

      {/* Allow adding items manually even when extraction fails */}
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
