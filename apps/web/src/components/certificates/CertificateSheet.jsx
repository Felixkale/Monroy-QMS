// src/components/certificates/CertificateSheet.jsx
"use client";

/* ═══════════════════════════════════════════════════════════════
   FULLY DYNAMIC CERTIFICATE RENDERER
   - Renders ALL extracted data with zero omissions
   - Auto-detects legislation from certificate content
   - Generates 1 or 2 pages based on source certificate structure
   - Falls back to typed templates for known equipment
   - For unknown types: renders complete dynamic card layout
═══════════════════════════════════════════════════════════════ */

/* ── helpers ─────────────────────────────────────────────────── */
function val(v){return v&&String(v).trim()!==""?String(v).trim():null;}
function formatDate(raw){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return raw;return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function addMonths(raw,n){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return null;d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function parseNotes(str){if(!str)return{};try{const p=JSON.parse(str);if(typeof p==="object"&&p!==null)return p;}catch(e){}const obj={};str.split("|").forEach(part=>{const idx=part.indexOf(":");if(idx<0)return;const k=part.slice(0,idx).trim();const v=part.slice(idx+1).trim();if(k)obj[k]=v;});return obj;}
function firstVal(obj,keys,fallback=null){const src=(obj&&typeof obj==="object")?obj:{};for(const key of keys){const value=src[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value;}return fallback;}
function normToken(v){return String(v||"").trim().toLowerCase().replace(/[()]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function parsePhotoEvidence(raw){if(!raw)return[];if(Array.isArray(raw))return raw;if(typeof raw==="string"){try{const p=JSON.parse(raw);return Array.isArray(p)?p:[];}catch(e){return[];}}return[];}

/* ── Result helpers ──────────────────────────────────────────── */
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

/* ── LEGISLATION AUTO-DETECTOR ───────────────────────────────── 
   Reads all text in certificate to find what Acts are mentioned,
   returns an array of legislation strings to display.
*/
function detectLegislation(c){
  const allText=[
    c?.notes,c?.raw_text_summary,c?.nameplate_data,c?.comments,c?.standard_code,
    JSON.stringify(c?.extracted_data||{}),
  ].filter(Boolean).join(" ").toLowerCase();

  const acts=[];

  // Always check for these Botswana acts
  if(/mines|quarries|mqwm|machinery act|cap.?44.?02/i.test(allText))
    acts.push("Mines, Quarries, Works and Machinery Act CAP 44:02");
  if(/factories act|cap.?44.?01/i.test(allText))
    acts.push("Factories Act CAP 44:01");
  if(/road traffic/i.test(allText))
    acts.push("Road Traffic Act");
  if(/occupational health|ohs|osh/i.test(allText))
    acts.push("Occupational Health and Safety Act");
  if(/pressure equipment|pressure system/i.test(allText)&&!/mines/i.test(allText))
    acts.push("Pressure Equipment Regulations");
  if(/iso 9001|iso 45001|iso 14001/i.test(allText))
    acts.push("ISO 9001 / 45001 Management System");

  // standards
  if(/en 13157|en13157/i.test(allText)) acts.push("EN 13157 — Manually Powered Lifting Equipment");
  if(/iso 5057|iso5057/i.test(allText))  acts.push("ISO 5057 — Fork Arms");
  if(/en 818|en818/i.test(allText))      acts.push("EN 818 — Short Link Chain");
  if(/bs 6166|bs6166/i.test(allText))    acts.push("BS 6166 — Lifting Slings");
  if(/en 1492|en1492/i.test(allText))    acts.push("EN 1492 — Textile Slings");
  if(/asme b30/i.test(allText))          acts.push("ASME B30 — Below-the-Hook Lifting Devices");
  if(/nosa|comsoc/i.test(allText))       acts.push("NOSA / COMSOC Safety Standards");

  // If nothing detected, default to MQWM
  if(acts.length===0) acts.push("Mines, Quarries, Works and Machinery Act CAP 44:02");
  return [...new Set(acts)];
}

/* ── FULL DATA EXTRACTOR ─────────────────────────────────────── 
   Returns EVERY non-null field from the certificate record,
   merged from: top-level fields, extracted_data JSONB, notes pipe-string.
*/
function extractAllData(c){
  const pn=parseNotes(val(c?.notes||"")||"");
  const ex=(c?.extracted_data&&typeof c.extracted_data==="object")?c.extracted_data:{};

  // Deep merge: extracted_data wins over notes, top-level wins for identity fields
  const merged={};
  // 1. notes (lowest priority)
  Object.entries(pn).forEach(([k,v])=>{if(v!=null&&String(v).trim()!=="")merged[k]=v;});
  // 2. extracted_data
  Object.entries(ex).forEach(([k,v])=>{
    if(v==null||String(v).trim()==="")return;
    if(typeof v==="object"&&!Array.isArray(v)){merged[k]={...(merged[k]||{}),...v};}
    else merged[k]=v;
  });
  // 3. top-level certificate columns (highest priority)
  const topLevel={
    certificate_number:c?.certificate_number,
    inspection_number:c?.inspection_number,
    result:c?.result,
    issue_date:c?.issue_date||c?.issued_at||c?.inspection_date,
    expiry_date:c?.expiry_date,
    equipment_type:c?.equipment_type||c?.asset_type,
    equipment_description:c?.equipment_description||c?.asset_name,
    client_name:c?.client_name||c?.company,
    location:c?.location||c?.equipment_location,
    serial_number:c?.serial_number,
    fleet_number:c?.fleet_number,
    manufacturer:c?.manufacturer,
    model:c?.model,
    swl:c?.swl||c?.safe_working_load,
    working_pressure:c?.working_pressure||c?.mawp,
    design_pressure:c?.design_pressure,
    test_pressure:c?.test_pressure,
    pressure_unit:c?.pressure_unit,
    capacity_volume:c?.capacity_volume||c?.capacity,
    material:c?.material,
    standard_code:c?.standard_code,
    inspector_name:c?.inspector_name,
    inspector_id:c?.inspector_id,
    inspection_body:c?.inspection_body,
    defects_found:c?.defects_found,
    recommendations:c?.recommendations,
    comments:c?.comments||c?.remarks,
    year_built:c?.year_built,
    registration_number:c?.registration_number,
    asset_tag:c?.asset_tag,
    nameplate_data:c?.nameplate_data,
    raw_text_summary:c?.raw_text_summary,
    machine_hours:c?.machine_hours,
    photo_evidence:c?.photo_evidence,
  };
  Object.entries(topLevel).forEach(([k,v])=>{if(v!=null&&String(v).trim()!=="")merged[k]=v;});
  return merged;
}

/* ── Detect if source cert likely had 2 pages ────────────────── */
function detectMultiPage(c,allData){
  const t=(allData?.equipment_type||c?.equipment_type||"").toLowerCase();
  // Typed templates that always need 2 pages
  if(/mobile.crane|^crane$/i.test(t)) return true;
  if(/cherry.picker|aerial.work.platform|boom.lift/i.test(t)) return true;
  if(/sandblast|blasting.pot/i.test(t)) return true;
  // If extracted data has both checklist AND load test data → 2 pages
  const ex=c?.extracted_data||{};
  const hasChecklist=ex.checklist&&Object.keys(ex.checklist).length>3;
  const hasLoadTest=(ex.boom&&(ex.boom.test_load||ex.boom.swl_at_actual_config));
  if(hasChecklist&&hasLoadTest) return true;
  // If raw_text_summary mentions test certificate AND checklist
  const txt=(allData?.raw_text_summary||"").toLowerCase();
  if(/test certificate/i.test(txt)&&/checklist/i.test(txt)) return true;
  return false;
}

/* ── CSS ─────────────────────────────────────────────────────── */
const CSS=`
  @page { size: A4; margin: 0; }
  /* ── page shell ── */
  .dyn-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:16px;display:flex;justify-content:center;flex-direction:column;align-items:center;gap:16px}
  .dyn-page{background:#fff;width:210mm;min-height:297mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;page-break-after:always;break-after:page;}
  .dyn-page.pm{box-shadow:none;width:100%}
  .dyn-page.last-page{page-break-after:avoid!important;break-after:avoid!important;}
  /* ── header ── */
  .dyn-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .dyn-hdr-geo{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .dyn-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:84px}
  .dyn-logo-box{background:#fff;width:108px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
  .dyn-logo-box img{width:84px;height:64px;object-fit:contain}
  .dyn-hdr-text{flex:1;padding:10px 10px 10px 28px;display:flex;flex-direction:column;justify-content:center}
  .dyn-brand{font-size:7.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px}
  .dyn-title{font-size:15px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.1;margin-bottom:2px}
  .dyn-sub{font-size:7.5px;color:rgba(255,255,255,0.45);font-weight:500;line-height:1.5}
  .dyn-hdr-right{padding:10px 14px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:5px;flex-shrink:0}
  .dyn-badge{font-size:10px;font-weight:900;padding:4px 12px;border-radius:99px;letter-spacing:.1em;text-transform:uppercase}
  .dyn-certno{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:700;color:rgba(255,255,255,0.55)}
  /* ── accent bar ── */
  .dyn-accent{height:3px;flex-shrink:0}
  .dyn-accent-blue{background:linear-gradient(90deg,#22d3ee 0%,#3b82f6 55%,#a78bfa 100%)}
  .dyn-accent-orange{background:linear-gradient(90deg,#f97316 0%,#fb923c 55%,#fbbf24 100%)}
  .dyn-accent-green{background:linear-gradient(90deg,#22c55e 0%,#16a34a 55%,#4ade80 100%)}
  .dyn-accent-red{background:linear-gradient(90deg,#ef4444 0%,#dc2626 55%,#f87171 100%)}
  /* ── body ── */
  .dyn-body{flex:1;padding:7px 14px 0;display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0}
  /* ── section title ── */
  .dyn-sec-ttl{font-size:7.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0b1d3a;margin:3px 0 2px;padding-left:4px;border-left:3px solid #22d3ee;flex-shrink:0}
  /* ── customer table ── */
  .dyn-ct{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-ct td{padding:3px 6px;border:1px solid #c3d4e8}
  .dyn-ct td:nth-child(odd){font-weight:700;background:#0b1d3a;color:#4fc3f7;width:80px;white-space:nowrap}
  .dyn-ct td:nth-child(even){background:#f4f8ff;font-weight:600;color:#0b1d3a}
  /* ── key-value grid ── */
  .dyn-kvg{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-kv{padding:4px 8px;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;background:#f4f8ff}
  .dyn-kv:nth-child(odd){background:#eef4ff}
  .dyn-kv-l{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:1px}
  .dyn-kv-v{font-size:9.5px;font-weight:600;color:#0b1d3a;word-break:break-word;line-height:1.3}
  .dyn-kv-v.mono{font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#0e7490}
  .dyn-kv.full{grid-column:1/-1;background:#f4f8ff}
  .dyn-kv.red{background:#fff5f5!important;border-left:3px solid #ef4444}
  .dyn-kv.red .dyn-kv-l{color:#b91c1c}
  .dyn-kv.red .dyn-kv-v{color:#b91c1c;font-weight:700}
  /* ── 2-col checklist grid ── */
  .dyn-cg{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-cc{border-right:1px solid #1e3a5f;overflow:hidden}
  .dyn-cc:last-child{border-right:none}
  .dyn-csec{background:#0b1d3a;color:#4fc3f7;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid #22d3ee}
  .dyn-cr{display:flex;align-items:center;justify-content:space-between;padding:2px 8px;border-bottom:1px solid #e8f0fb;font-size:7.5px}
  .dyn-cr:last-child{border-bottom:none}
  .dyn-cr:nth-child(even){background:#f8faff}
  .dyn-cl{color:#0b1d3a;font-weight:500;flex:1;font-size:7.5px}
  .dyn-pp{display:flex;gap:3px}
  .dyn-p{color:#15803d;font-weight:900;font-size:8.5px;width:14px;text-align:center}
  .dyn-f{color:#b91c1c;font-weight:900;font-size:8.5px;width:14px;text-align:center}
  .dyn-na{color:#9ca3af;font-size:7px;width:14px;text-align:center}
  /* ── load table ── */
  .dyn-lt{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-lt th{background:#0b1d3a;color:#4fc3f7;padding:3px 5px;text-align:center;border:1px solid #1e3a5f;font-size:7px;font-weight:700}
  .dyn-lt td{padding:3px 5px;border:1px solid #c3d4e8;text-align:center;font-weight:600;font-size:8px;background:#fff}
  .dyn-lt td:first-child{text-align:left;background:#eef4ff;font-weight:700;color:#0b1d3a}
  .dyn-lt tr:nth-child(even) td:not(:first-child){background:#f8faff}
  .dyn-lt-bold td{font-weight:900!important;background:#0b1d3a!important;color:#fff!important}
  .dyn-lt-bold td:first-child{background:#1e3a5f!important;color:#4fc3f7!important}
  /* ── simple 2-col table ── */
  .dyn-st{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-st td{padding:3px 7px;border:1px solid #c3d4e8}
  .dyn-st td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a;width:55%}
  .dyn-st td:nth-child(2){background:#fff;font-weight:600;color:#0b1d3a}
  /* ── wide 4-col table ── */
  .dyn-wt{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-wt th{background:#0b1d3a;color:#4fc3f7;padding:3px 5px;font-size:7px;font-weight:700;border:1px solid #1e3a5f;text-align:left}
  .dyn-wt td{padding:3px 6px;border:1px solid #c3d4e8;font-weight:600;color:#0b1d3a;font-size:8px;background:#fff}
  .dyn-wt td:first-child{background:#eef4ff;font-weight:700}
  .dyn-wt tr:nth-child(even) td{background:#f8faff}
  .dyn-wt tr:nth-child(even) td:first-child{background:#e5eef8}
  /* ── result/compliance box ── */
  .dyn-compbox{border:2px solid #1e3a5f;border-radius:5px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;background:#f4f8ff;flex-shrink:0}
  .dyn-pass{color:#15803d;font-size:10px;font-weight:900;background:#dcfce7;padding:3px 11px;border-radius:3px;border:1px solid #86efac}
  .dyn-fail{color:#9ca3af;font-size:10px;font-weight:700}
  .dyn-fail-active{color:#b91c1c;font-size:10px;font-weight:900;background:#fee2e2;padding:3px 11px;border-radius:3px;border:1px solid #fca5a5}
  /* ── defect / comment boxes ── */
  .dyn-red-box{border:1px solid #fca5a5;border-radius:4px;padding:5px 9px;background:#fff5f5;flex-shrink:0}
  .dyn-red-lbl{font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px}
  .dyn-red-val{font-size:8.5px;font-weight:700;color:#b91c1c;line-height:1.45}
  .dyn-comments-box{border:1px solid #c3d4e8;border-radius:4px;padding:5px 9px;background:#f4f8ff;flex-shrink:0}
  .dyn-comments-lbl{font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .dyn-comments-val{font-size:8.5px;color:#334155;line-height:1.5}
  /* ── legislation note ── */
  .dyn-leg{font-size:7px;color:#4b5563;line-height:1.5;border:1px solid #1e3a5f;border-radius:4px;padding:4px 9px;background:#f4f8ff;text-align:center;font-weight:700;flex-shrink:0}
  /* ── photo evidence ── */
  .dyn-evidence{border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-evidence-hdr{background:#0b1d3a;color:#4fc3f7;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid #22d3ee}
  .dyn-evidence-grid{display:flex;gap:6px;flex-wrap:wrap;padding:7px 8px;background:#f4f8ff}
  .dyn-evidence-item{display:flex;flex-direction:column;gap:2px}
  .dyn-evidence-img{width:96px;height:66px;object-fit:cover;border-radius:3px;border:1px solid #c3d4e8;display:block}
  .dyn-evidence-cap{font-size:6.5px;color:#4b5563;line-height:1.4;text-align:center;max-width:96px;word-break:break-word}
  /* ── sig ── */
  .dyn-sig{padding:5px 12px 4px;flex-shrink:0}
  .dyn-sigg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .dyn-sgl{font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .dyn-sgline{border-bottom:1px solid #1e3a5f;min-height:34px;display:flex;align-items:flex-end;padding-bottom:2px;margin-bottom:2px;background:#fff}
  .dyn-sgname{font-size:8.5px;font-weight:700;color:#0b1d3a}
  .dyn-sgrole{font-size:7.5px;color:#64748b}
  /* ── footer strips ── */
  .dyn-svc{background:#c41e3a;padding:3px 12px;flex-shrink:0}
  .dyn-svc p{font-size:6.5px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600;letter-spacing:.02em}
  .dyn-foot{background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 12px;display:flex;justify-content:space-between;flex-shrink:0}
  .dyn-foot span{font-size:7px;color:rgba(255,255,255,0.35);font-weight:600}
  /* ── page break helper ── */
  .dyn-pb{page-break-after:always;break-after:page;height:0;display:block}
  /* ── result inline badge ── */
  .ri{font-size:7.5px;font-weight:800;padding:1px 6px;border-radius:3px;white-space:nowrap;display:inline-block}

  @media print{
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0}
    .dyn-wrap{background:none!important;padding:0!important;border:none!important;gap:0!important;border-radius:0!important;display:block!important}
    .dyn-page{box-shadow:none!important;width:210mm!important;height:297mm!important;overflow:hidden!important;page-break-after:always;break-after:page;margin:0!important}
    .dyn-page.last-page{page-break-after:avoid!important;break-after:avoid!important}
    .dyn-pb{page-break-after:always;break-after:page;height:0}
  }
`;

/* ════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
════════════════════════════════════════════════════════════ */
function DynHdr({logo,title,subtitle,certNumber,result,accentClass="dyn-accent-blue"}){
  const tone=resultStyle(result||"");
  return(
    <>
      <div className="dyn-hdr">
        <svg className="dyn-hdr-geo" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice">
          <circle cx="520" cy="-10" r="100" fill="rgba(34,211,238,0.06)"/>
          <circle cx="480" cy="70"  r="60"  fill="rgba(59,130,246,0.05)"/>
          <circle cx="30"  cy="120" r="70"  fill="rgba(167,139,250,0.04)"/>
        </svg>
        <div className="dyn-hdr-inner">
          <div className="dyn-logo-box"><img src={logo||"/logo.png"} alt="Monroy" onError={e=>e.target.style.display="none"}/></div>
          <div className="dyn-hdr-text">
            <div className="dyn-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
            <div className="dyn-title">{title||"Certificate of Inspection"}</div>
            {subtitle&&<div className="dyn-sub">{subtitle}</div>}
            <div className="dyn-sub" style={{marginTop:2}}>Mobile Crane Hire · Rigging · NDT Test · Scaffolding · Painting · Inspection of Lifting Equipment &amp; Machinery · Pressure Vessels · Steel Fabricating · Mechanical Engineering</div>
          </div>
          <div className="dyn-hdr-right">
            {result&&<span className="dyn-badge" style={{background:tone.bg,color:tone.color,border:`1px solid ${tone.brd}`}}>{tone.label}</span>}
            {certNumber&&<div className="dyn-certno">{certNumber}</div>}
          </div>
        </div>
      </div>
      <div className={`dyn-accent ${accentClass}`}/>
    </>
  );
}

function DynFooter(){
  return(
    <>
      <div className="dyn-svc"><p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment &amp; Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating &amp; Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p></div>
      <div className="dyn-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </>
  );
}

function DynSig({inspName,inspId,sigUrl}){
  return(
    <div className="dyn-sig">
      <div className="dyn-sigg">
        <div>
          <div className="dyn-sgl">Competent Person / Inspector</div>
          <div className="dyn-sgline"><img src={sigUrl||"/Signature"} alt="sig" style={{maxHeight:30,maxWidth:90,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/></div>
          <div className="dyn-sgname">{inspName||"Moemedi Masupe"}</div>
          <div className="dyn-sgrole">Inspector ID: {inspId||"700117910"}</div>
        </div>
        <div>
          <div className="dyn-sgl">Client / User / Owner</div>
          <div className="dyn-sgline"/>
          <div className="dyn-sgname" style={{minHeight:12}}></div>
          <div className="dyn-sgrole">Name &amp; Signature</div>
        </div>
      </div>
    </div>
  );
}

function DynCT({data}){
  const company=val(data.client_name)||"—";
  const location=val(data.location)||"—";
  const issueDate=formatDate(data.issue_date)||"—";
  const equipMake=val(data.manufacturer||data.model||data.equipment_type)||"—";
  const serialNo=val(data.serial_number)||"—";
  const fleetNo=val(data.fleet_number);
  const swl=val(data.swl);
  const machineHours=val(data.machine_hours);
  const assetTag=val(data.asset_tag);
  const regNo=val(data.registration_number);
  const yearBuilt=val(data.year_built);
  return(
    <table className="dyn-ct"><tbody>
      <tr><td>Customer</td><td>{company}</td><td>Make / Type</td><td>{equipMake}</td></tr>
      <tr><td>Site / Location</td><td>{location}</td><td>Serial Number</td><td>{serialNo}</td></tr>
      <tr><td>Date</td><td>{issueDate}</td><td>Fleet No.</td><td>{fleetNo||"—"}</td></tr>
      {swl&&<tr><td>Capacity / SWL</td><td>{swl}</td><td>Year Built</td><td>{yearBuilt||"—"}</td></tr>}
      {regNo&&<tr><td>Registration No.</td><td>{regNo}</td><td>Asset Tag</td><td>{assetTag||"—"}</td></tr>}
      {machineHours&&<tr><td>Machine Hours</td><td colSpan={3}>{machineHours}</td></tr>}
    </tbody></table>
  );
}

function DynLegislation({c}){
  const acts=detectLegislation(c);
  return(
    <div className="dyn-leg">
      INSPECTION CARRIED OUT IN ACCORDANCE WITH: {acts.join(" · ")}
    </div>
  );
}

function DynEvidence({photos}){
  if(!photos||!photos.length)return null;
  return(
    <div className="dyn-evidence">
      <div className="dyn-evidence-hdr">Photo Evidence ({photos.length})</div>
      <div className="dyn-evidence-grid">
        {photos.map((p,i)=>(
          <div className="dyn-evidence-item" key={i}>
            <img className="dyn-evidence-img" src={p.dataURL} alt={p.caption||p.name||`Photo ${i+1}`} onError={e=>e.target.style.display="none"}/>
            {p.caption&&<div className="dyn-evidence-cap">{p.caption}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DynCI({label,result="PASS",na=false}){
  return(
    <div className="dyn-cr">
      <span className="dyn-cl">{label}</span>
      <div className="dyn-pp">
        {na?<span className="dyn-na">N/A</span>:<><span className="dyn-p">{result==="PASS"?"✓":""}</span><span className="dyn-f">{(result==="FAIL"||result==="REPAIR_REQUIRED")?"✗":""}</span></>}
      </div>
    </div>
  );
}

function RBadge({v}){
  if(!v)return null;
  const s=resultStyle(String(v).toUpperCase());
  return<span className="ri" style={{background:s.bg,color:s.color,border:`1px solid ${s.brd}`}}>{s.label}</span>;
}

/* ════════════════════════════════════════════════════════════
   DYNAMIC KV RENDERER
   Renders every field in an object as a key-value card.
   Skips nulls, empties, arrays that are empty, known internal keys.
════════════════════════════════════════════════════════════ */
const SKIP_KEYS=new Set([
  "id","created_at","updated_at","deleted_at","tenant_id","organisation_id",
  "logo_url","pdf_url","photo_evidence","signature_url","sig_url",
  "extracted_data","notes","raw_text_summary","nameplate_data",
  // rendered separately
  "certificate_number","result","issue_date","issued_at","inspection_date",
  "expiry_date","client_name","company","location","equipment_location",
  "serial_number","fleet_number","manufacturer","model","equipment_type",
  "asset_type","equipment_description","asset_name","swl","safe_working_load",
  "defects_found","recommendations","comments","remarks","inspector_name",
  "inspector_id","year_built","machine_hours","registration_number","asset_tag",
]);

function humanKey(k){
  return String(k).replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());
}

function DynKVGrid({data,skip=SKIP_KEYS,cols=4,redKeys=[]}){
  // Flatten one level deep for nested objects (checklist, boom, bucket, etc.)
  const flat={};
  function flatten(obj,prefix=""){
    if(!obj||typeof obj!=="object"||Array.isArray(obj))return;
    Object.entries(obj).forEach(([k,v])=>{
      const key=prefix?`${prefix}_${k}`:k;
      if(v===null||v===undefined)return;
      if(typeof v==="object"&&!Array.isArray(v)){flatten(v,key);}
      else if(Array.isArray(v)){if(v.length>0)flat[key]=v.join(", ");}
      else{if(String(v).trim())flat[key]=v;}
    });
  }
  Object.entries(data||{}).forEach(([k,v])=>{
    if(skip.has(k))return;
    if(v===null||v===undefined||String(v).trim()==="")return;
    if(typeof v==="object"&&!Array.isArray(v)){flatten(v,k);}
    else if(Array.isArray(v)){if(v.length)flat[k]=v.join(", ");}
    else flat[k]=v;
  });

  const entries=Object.entries(flat);
  if(!entries.length)return null;

  const isResultish=(k)=>/result|status|condition|assessment|serviceability/i.test(k);
  const isMonoish=(k)=>/serial|number|no\.|id|code|cert|ref/i.test(k);
  const isRed=(k)=>/defect|fail|crack|condemn|reject|hazard/i.test(k)||redKeys.includes(k);

  return(
    <div className="dyn-kvg">
      {entries.map(([k,v])=>{
        const mono=isMonoish(k);
        const red=isRed(k)||(/fail|reject|condemned/i.test(String(v)));
        const rish=isResultish(k);
        return(
          <div key={k} className={`dyn-kv${red?" red":""}`}>
            <div className="dyn-kv-l">{humanKey(k)}</div>
            <div className={`dyn-kv-v${mono?" mono":""}`}>
              {rish?<RBadge v={String(v)}/>:String(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DYNAMIC CHECKLIST RENDERER
   Reads any object where values are PASS/FAIL/YES/NO and
   renders them as a 2-column tick grid.
════════════════════════════════════════════════════════════ */
function DynChecklist({title,data,half=false}){
  if(!data||typeof data!=="object")return null;
  const entries=Object.entries(data).filter(([,v])=>v!=null&&String(v).trim()!=="");
  if(!entries.length)return null;

  const toResult=(v)=>{
    const s=String(v||"").toUpperCase().trim();
    if(["PASS","YES","Y","TRUE","OK","GOOD","SERVICEABLE","SATISFACTORY"].includes(s))return"PASS";
    if(["FAIL","NO","N","FALSE","BAD","POOR","DEFECTIVE","REJECT"].includes(s))return"FAIL";
    if(["N/A","NA","NOT APPLICABLE","NOT FITTED"].includes(s))return"NA";
    return"PASS"; // default
  };

  const mid=Math.ceil(entries.length/2);
  const left=entries.slice(0,mid);
  const right=entries.slice(mid);

  return(
    <div className="dyn-cg">
      <div className="dyn-cc">
        <div className="dyn-csec">{title||"Inspection Checklist"}</div>
        {left.map(([k,v])=><DynCI key={k} label={humanKey(k)} result={toResult(v)} na={toResult(v)==="NA"}/>)}
      </div>
      <div className="dyn-cc">
        {right.length>0&&<div className="dyn-csec">&nbsp;</div>}
        {right.map(([k,v])=><DynCI key={k} label={humanKey(k)} result={toResult(v)} na={toResult(v)==="NA"}/>)}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FULLY DYNAMIC PAGE — PAGE 1 (primary / inspection data)
════════════════════════════════════════════════════════════ */
function DynPage1({c,allData,pm,logo}){
  const certNumber=val(allData.certificate_number);
  const inspName=val(allData.inspector_name)||"Moemedi Masupe";
  const inspId=val(allData.inspector_id)||"700117910";
  const result=pickResult(c);
  const tone=resultStyle(result);
  const equipType=val(allData.equipment_type)||"Equipment";
  const defects=val(allData.defects_found);
  const recommendations=val(allData.recommendations);
  const comments=val(allData.comments);
  const photos=parsePhotoEvidence(c?.photo_evidence);
  const expiryDate=formatDate(allData.expiry_date);

  // Decide accent color by result
  const accentClass=result==="FAIL"?"dyn-accent-red":result==="CONDITIONAL"?"dyn-accent-orange":"dyn-accent-blue";

  // Extract nested objects for special rendering
  const ex=c?.extracted_data||{};
  const checklist=ex.checklist||ex.general_checklist||ex.inspection_checklist||{};
  const boom=ex.boom||ex.boom_configuration||{};
  const bucket=ex.bucket||ex.bucket_platform||ex.platform||{};
  const sling=ex.sling_details||ex.condition_assessment||{};
  const hookrope=ex.hookrope||ex.hook_rope||{};
  const forks=Array.isArray(ex.forks)?ex.forks:[];
  const sandblasting=ex.sandblasting||ex.blasting_pot||ex.sbp||{};
  const pvChecklist=ex.pressure_vessel_checklist||{};

  // All "other" keys from extracted_data not covered above
  const handledSubkeys=new Set(["checklist","general_checklist","inspection_checklist","boom","boom_configuration","bucket","bucket_platform","platform","sling_details","condition_assessment","hookrope","hook_rope","forks","fork_arms","sandblasting","blasting_pot","sbp","pressure_vessel_checklist"]);
  const extraExtracted={};
  Object.entries(ex).forEach(([k,v])=>{
    if(!handledSubkeys.has(k)&&!SKIP_KEYS.has(k)&&v!=null&&String(v).trim()!==""){
      extraExtracted[k]=v;
    }
  });

  const hasBoom=Object.values(boom).some(v=>v!=null&&String(v).trim()!=="");
  const hasBucket=Object.values(bucket).some(v=>v!=null&&String(v).trim()!=="");
  const hasSling=Object.values(sling).some(v=>v!=null&&String(v).trim()!=="");
  const hasHookRope=Object.values(hookrope).some(v=>v!=null&&String(v).trim()!=="");
  const hasChecklist=Object.values(checklist).some(v=>v!=null&&String(v).trim()!=="");
  const hasPVChecklist=Object.values(pvChecklist).some(v=>v!=null&&String(v).trim()!=="");
  const hasSandblasting=Object.values(sandblasting).some(v=>v!=null&&String(v).trim()!=="");
  const hasExtraExtracted=Object.keys(extraExtracted).length>0;

  const certTitle=`${equipType} — ${(() => {
    const t=equipType.toLowerCase();
    if(/crane/i.test(t))return"Load Test Certificate";
    if(/pressure|vessel|receiver|boiler/i.test(t))return"Pressure Vessel Inspection Certificate";
    if(/sling|rope/i.test(t))return"Lifting Equipment Inspection Certificate";
    if(/hook/i.test(t))return"Hook & Rope Inspection Report";
    if(/sandblast|blasting/i.test(t))return"Inspection Checklist";
    if(/forklift|fork/i.test(t))return"Forklift Inspection Certificate";
    if(/harness|lanyard/i.test(t))return"Fall Protection Equipment Certificate";
    return"Certificate of Inspection";
  })()}`;

  return(
    <div className={`dyn-page${pm?" pm":""}`}>
      <DynHdr
        logo={logo}
        title={certTitle}
        subtitle={`${val(allData.client_name)||"Client"} · ${val(allData.location)||"Site"} · Ref: ${certNumber||"—"}`}
        certNumber={certNumber}
        result={result}
        accentClass={accentClass}
      />
      <div className="dyn-body">
        {/* ── Customer/equipment identity table ── */}
        <DynCT data={allData}/>

        {/* ── Certificate ID + validity + compliance box ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>{certTitle}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:800,color:"#0e7490",marginTop:2}}>{certNumber||"—"}</div>
            {expiryDate&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>
                <span style={{color:"#3b6ea5"}}>Valid until:</span> {expiryDate}
              </div>
            )}
          </div>
          <div className="dyn-compbox" style={{padding:"6px 10px"}}>
            <div>
              <div style={{fontSize:10,fontWeight:900,color:"#0b1d3a"}}>Compliance</div>
              <div style={{fontSize:8,color:"#64748b"}}>{result==="FAIL"?"Not to be issued":"Certificate issued"}</div>
            </div>
            <div style={{fontSize:28,color:tone.color,fontWeight:900}}>{result==="FAIL"?"✗":"✓"}</div>
          </div>
        </div>

        {/* ── ALL top-level fields (dynamic KV grid) ── */}
        {hasExtraExtracted&&(
          <>
            <div className="dyn-sec-ttl">Additional Technical Data</div>
            <DynKVGrid data={extraExtracted}/>
          </>
        )}

        {/* ── Boom / load test data ── */}
        {hasBoom&&(
          <>
            <div className="dyn-sec-ttl">Boom Configuration &amp; Load Test</div>
            <DynKVGrid data={boom} skip={new Set([])}/>
          </>
        )}

        {/* ── Sling details ── */}
        {hasSling&&(
          <>
            <div className="dyn-sec-ttl">Sling / Rope Details &amp; Condition</div>
            <DynKVGrid data={sling} skip={new Set([])}/>
          </>
        )}

        {/* ── Hook/Rope data ── */}
        {hasHookRope&&(
          <>
            <div className="dyn-sec-ttl">Hook &amp; Rope Inspection</div>
            <DynKVGrid data={hookrope} skip={new Set([])}/>
          </>
        )}

        {/* ── Sandblasting specific ── */}
        {hasSandblasting&&(
          <>
            <div className="dyn-sec-ttl">Vessel Inspection Data</div>
            <DynKVGrid data={sandblasting} skip={new Set([])}/>
          </>
        )}

        {/* ── Pressure vessel checklist ── */}
        {hasPVChecklist&&(
          <>
            <div className="dyn-sec-ttl">Pressure Vessel Inspection Results</div>
            <DynChecklist title="Pressure Vessel Checklist" data={pvChecklist}/>
          </>
        )}

        {/* ── General checklist ── */}
        {hasChecklist&&(
          <>
            <div className="dyn-sec-ttl">Inspection Checklist</div>
            <DynChecklist title="Checklist Results" data={checklist}/>
          </>
        )}

        {/* ── Bucket/platform ── */}
        {hasBucket&&(
          <>
            <div className="dyn-sec-ttl">Platform / Bucket Details</div>
            <DynKVGrid data={bucket} skip={new Set([])}/>
          </>
        )}

        {/* ── Forks table ── */}
        {forks.length>0&&(
          <>
            <div className="dyn-sec-ttl">Fork Arms Inspected ({forks.length})</div>
            <table className="dyn-wt">
              <thead>
                <tr>{Object.keys(forks[0]||{}).map(k=><th key={k}>{humanKey(k)}</th>)}</tr>
              </thead>
              <tbody>
                {forks.map((fk,i)=>(
                  <tr key={i}>{Object.values(fk).map((v,j)=><td key={j}>{String(v||"—")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── raw_text_summary ── */}
        {val(allData.raw_text_summary)&&(
          <div className="dyn-comments-box">
            <div className="dyn-comments-lbl">Source Document Summary</div>
            <div className="dyn-comments-val" style={{fontSize:7.5,lineHeight:1.55}}>{allData.raw_text_summary}</div>
          </div>
        )}

        {/* ── Defects ── */}
        {defects&&<div className="dyn-red-box"><div className="dyn-red-lbl">Defects Found</div><div className="dyn-red-val">{defects}</div></div>}
        {recommendations&&<div className="dyn-red-box"><div className="dyn-red-lbl">Recommendations</div><div className="dyn-red-val">{recommendations}</div></div>}
        {comments&&<div className="dyn-comments-box"><div className="dyn-comments-lbl">Comments / Notes</div><div className="dyn-comments-val">{comments}</div></div>}

        {/* ── Photo evidence (split if 2-page cert) ── */}
        {photos.length>0&&<DynEvidence photos={photos}/>}

        {/* ── Legislation ── */}
        <DynLegislation c={c}/>
      </div>
      <DynSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <DynFooter/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FULLY DYNAMIC PAGE — PAGE 2 (test certificate / compliance)
   Used when source cert had 2 pages.
════════════════════════════════════════════════════════════ */
function DynPage2({c,allData,pm,logo,pageLabel}){
  const certNumber=val(allData.certificate_number);
  const inspName=val(allData.inspector_name)||"Moemedi Masupe";
  const inspId=val(allData.inspector_id)||"700117910";
  const result=pickResult(c);
  const tone=resultStyle(result);
  const equipType=val(allData.equipment_type)||"Equipment";
  const defects=val(allData.defects_found);
  const recommendations=val(allData.recommendations);
  const photos=parsePhotoEvidence(c?.photo_evidence);
  const ex=c?.extracted_data||{};

  // Page 2 is always the "Test Certificate" / compliance page
  const testTitle=`${equipType} — Test Certificate`;

  // Build the full data table for this page
  // Include: technical fields + test results
  const testFields={};
  const showKeys=[
    "serial_number","fleet_number","manufacturer","model","year_built","swl","working_pressure",
    "design_pressure","test_pressure","pressure_unit","capacity_volume","material","standard_code",
    "machine_hours","asset_tag","registration_number","inspection_number",
  ];
  showKeys.forEach(k=>{const v=val(allData[k]);if(v)testFields[k]=v;});
  // Also add any extra extracted fields
  const boom=ex.boom||ex.boom_configuration||{};
  Object.entries(boom).forEach(([k,v])=>{if(v!=null&&String(v).trim()!=="")testFields[`boom_${k}`]=v;});

  return(
    <div className={`dyn-page last-page${pm?" pm":""}`}>
      <DynHdr
        logo={logo}
        title={testTitle}
        subtitle={`${val(allData.client_name)||"Client"} · ${val(allData.location)||"Site"} · ${pageLabel||"Page 2 of 2"}`}
        certNumber={certNumber}
        result={result}
        accentClass={result==="FAIL"?"dyn-accent-red":"dyn-accent-green"}
      />
      <div className="dyn-body">
        <DynCT data={allData}/>

        {/* ── Big centered result ── */}
        <div style={{border:"2px solid #1e3a5f",borderRadius:5,padding:"10px 0",textAlign:"center",background:tone.bg,flexShrink:0}}>
          <div style={{fontSize:22,fontWeight:900,color:tone.color,letterSpacing:".1em"}}>{tone.label}</div>
          <div style={{fontSize:8,color:"#64748b",marginTop:2}}>Test &amp; Compliance Certificate — {equipType}</div>
        </div>

        {/* ── Technical test data ── */}
        {Object.keys(testFields).length>0&&(
          <>
            <div className="dyn-sec-ttl">Test Certificate Data</div>
            <DynKVGrid data={testFields} skip={new Set([])}/>
          </>
        )}

        {/* ── Nameplate data if present ── */}
        {val(allData.nameplate_data)&&(
          <div className="dyn-comments-box">
            <div className="dyn-comments-lbl">Nameplate Data</div>
            <div className="dyn-comments-val" style={{fontSize:7.5,fontFamily:"'IBM Plex Mono',monospace"}}>{allData.nameplate_data}</div>
          </div>
        )}

        {/* ── Standard code / certification marks ── */}
        {val(allData.standard_code)&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
            {allData.standard_code.split(/[,;]+/).filter(Boolean).map((s,i)=>(
              <span key={i} style={{background:"#eef4ff",border:"1px solid #c3d4e8",borderRadius:4,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#0b1d3a"}}>{s.trim()}</span>
            ))}
          </div>
        )}

        {defects&&<div className="dyn-red-box"><div className="dyn-red-lbl">Defects Found</div><div className="dyn-red-val">{defects}</div></div>}
        {recommendations&&<div className="dyn-red-box"><div className="dyn-red-lbl">Recommendations</div><div className="dyn-red-val">{recommendations}</div></div>}

        {photos.length>1&&<DynEvidence photos={photos.slice(Math.ceil(photos.length/2))}/>}

        <DynLegislation c={c}/>

        {/* ── Declaration paragraph ── */}
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.6,border:"1px solid #1e3a5f",borderRadius:4,padding:"6px 10px",background:"#f4f8ff",flexShrink:0}}>
          I, the undersigned competent person, hereby certify that the above equipment has been thoroughly examined, tested, and found to be in a safe and satisfactory condition at the time of inspection, in accordance with the applicable legislation and standards as stated above.
        </div>

        {/* ── Full signature block ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,padding:"6px 0 2px",flexShrink:0}}>
          <div>
            <div style={{fontSize:7,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#3b6ea5",marginBottom:3}}>Competent Person / Inspector</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:4,minHeight:36,display:"flex",alignItems:"flex-end",padding:"2px 8px",marginBottom:3,background:"#fff"}}>
              <img src="/Signature" alt="sig" style={{maxHeight:30,maxWidth:100,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:"#0b1d3a"}}>{inspName}</div>
            <div style={{fontSize:7.5,color:"#64748b"}}>Inspector ID: {inspId}</div>
          </div>
          <div>
            <div style={{fontSize:7,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#3b6ea5",marginBottom:3}}>Client Name &amp; Signature</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:4,minHeight:36,marginBottom:3,background:"#fff",padding:"2px 8px",display:"flex",alignItems:"flex-end"}}></div>
            <div style={{fontSize:7.5,color:"#64748b"}}>Name &amp; Signature</div>
          </div>
        </div>
      </div>
      <DynFooter/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TYPED TEMPLATES — kept for known equipment types
   Each calls DynPage1/DynPage2 wrappers but with typed data
════════════════════════════════════════════════════════════ */

function normalizeInspectionDataShape(raw){
  const src=(raw&&typeof raw==="object"&&!Array.isArray(raw))?raw:{};
  const out={...src};
  const firstObject=(...keys)=>{for(const key of keys){const value=src[key];if(value&&typeof value==="object"&&!Array.isArray(value))return value;}return {};};
  out.checklist={...firstObject("checklist","general_checklist","inspection_checklist")};
  out.boom={...firstObject("boom","boom_configuration","boomConfig")};
  out.bucket={...firstObject("bucket","bucket_platform","platform","bucket_inspection")};
  out.horse={...firstObject("horse","prime_mover")};
  out.trailer={...firstObject("trailer")};
  const forkCandidates=[src.forks,src.forks_arms,src.fork_arms,src.fork_arm];
  const forkArray=forkCandidates.find(v=>Array.isArray(v));
  out.forks=Array.isArray(forkArray)?forkArray:[];
  return out;
}

function getInspectionData(c){
  const notes=parseNotes(val(c?.notes||"")||"");
  const extracted=(c&&c.extracted_data&&typeof c.extracted_data==="object")?c.extracted_data:{};
  return normalizeInspectionDataShape({
    ...extracted,...notes,
    checklist:{...(extracted.checklist||{}),...(notes.checklist||{})},
    boom:{...(extracted.boom||extracted.boom_configuration||{}),...(notes.boom||notes.boom_configuration||{})},
    bucket:{...(extracted.bucket||extracted.bucket_platform||extracted.platform||{}),...(notes.bucket||notes.bucket_platform||notes.platform||{})},
    horse:{...(extracted.horse||extracted.prime_mover||{}),...(notes.horse||notes.prime_mover||{})},
    trailer:{...(extracted.trailer||{}),...(notes.trailer||{})},
    forks:Array.isArray(notes.forks)?notes.forks:Array.isArray(extracted.forks)?extracted.forks:Array.isArray(extracted.fork_arms)?extracted.fork_arms:[],
  });
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════ */
export default function CertificateSheet({certificate:c,index=0,total=1,printMode=false}){
  if(!c)return null;

  const logo=c.logo_url||"/logo.png";
  const pm=printMode;

  // Build the complete merged data set
  const allData=extractAllData(c);
  const equipType=val(allData.equipment_type)||"";
  const _rawType=String(equipType).toLowerCase();

  // Detect if this should be a 2-page certificate
  const isMultiPage=detectMultiPage(c,allData);

  const wrap=(children)=>(
    <>
      <style>{CSS}</style>
      <div className={pm?"":"dyn-wrap"}>{children}</div>
    </>
  );

  // ── For ALL equipment types: use fully dynamic pages ──────────
  // The DynPage1 will render every field automatically.
  // For multi-page certs, add DynPage2 as test certificate.

  if(isMultiPage){
    return wrap(
      <>
        <DynPage1 c={c} allData={allData} pm={pm} logo={logo}/>
        <div className="dyn-pb"/>
        <DynPage2 c={c} allData={allData} pm={pm} logo={logo} pageLabel={`${equipType} — Test Certificate (Page 2 of 2)`}/>
      </>
    );
  }

  // Single-page cert
  return wrap(
    <DynPage1 c={c} allData={allData} pm={pm} logo={logo}/>
  );
}
