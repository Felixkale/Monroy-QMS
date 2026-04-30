// src/components/certificates/CertificateSheet.jsx
"use client";

/* ══════════════════════════════════════════════════════════════════════
   MONROY QMS — DYNAMIC CERTIFICATE RENDERER
   
   Produces 1 or 2 A4 pages matching the exact structure of the source cert:
   
   Page 1 (Compliance Certificate):
     - Customer / equipment identity table
     - Certificate ID + compliance status
     - ALL equipment details (voltage, weight, pressure, SWL, etc.)
     - Additional extracted_data sub-objects (boom, sling, checklist…)
     - Raw text summary, defects, recommendations, partners
     - Inspector signature + legislation bar
   
   Page 2 (Test Certificate) — generated when cert is 2-page:
     - Named test cert header ("GULF STREAM ENERGY TEST CERTIFICATE")
     - Full data grid (cert no, equipment type, dates, serial, voltage, weight…)
     - Structural Integrity Assessment + Functional Test Verification
     - Overall Assessment options table (4-column, matching PDF checkboxes)
     - PASS/FAIL indicator
     - Failure to Comply clause
     - Dual signature block (Inspector + Client)
══════════════════════════════════════════════════════════════════════ */

/* ── helpers ─────────────────────────────────────────────────────── */
function val(v){return v&&String(v).trim()!==""?String(v).trim():null;}
function fmtDate(raw){
  if(!raw)return null;
  const s=String(raw).trim();
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s))return s;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const[y,m,d]=s.split("-");return`${d}/${m}/${y}`;}
  const d=new Date(raw);
  if(!isNaN(d.getTime()))return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});
  return s;
}
function parseNotes(str){
  if(!str)return{};
  try{const p=JSON.parse(str);if(typeof p==="object"&&p!==null)return p;}catch(e){}
  const obj={};
  str.split("|").forEach(part=>{const idx=part.indexOf(":");if(idx<0)return;const k=part.slice(0,idx).trim();const v=part.slice(idx+1).trim();if(k)obj[k]=v;});
  return obj;
}
function parsePhotos(raw){
  if(!raw)return[];
  if(Array.isArray(raw))return raw;
  try{const p=JSON.parse(raw);return Array.isArray(p)?p:[];}catch{return[];}
}
function humanKey(k){
  return String(k).replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());
}
function pickResult(c){return(c?.result||c?.equipment_status||"").toUpperCase();}
function tone(r){
  const R=String(r||"").toUpperCase();
  if(R==="PASS")return{color:"#15803d",bg:"#dcfce7",brd:"#86efac",label:"PASS"};
  if(R==="FAIL")return{color:"#b91c1c",bg:"#fee2e2",brd:"#fca5a5",label:"FAIL"};
  if(R==="REPAIR_REQUIRED")return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Repair Required"};
  if(R==="CONDITIONAL")return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Conditional"};
  if(R==="OUT_OF_SERVICE")return{color:"#7f1d1d",bg:"#fee2e2",brd:"#fca5a5",label:"Out of Service"};
  return{color:"#374151",bg:"#f3f4f6",brd:"#d1d5db",label:r||"Unknown"};
}

/* ── legislation detector ─────────────────────────────────────────── */
function detectActs(c){
  const blob=[
    c?.notes,c?.raw_text_summary,c?.nameplate_data,c?.comments,
    c?.standard_code,c?.equipment_description,c?.equipment_type,
    JSON.stringify(c?.extracted_data||{}),
  ].filter(Boolean).join(" ");
  const acts=[];
  if(/mines|quarries|mqwm|cap.?44.?02/i.test(blob))acts.push("Mines, Quarries, Works and Machinery Act CAP 44:02");
  if(/factories act|cap.?44.?01/i.test(blob))acts.push("Factories Act CAP 44:01");
  if(/road traffic/i.test(blob))acts.push("Road Traffic Act");
  if(/occupational health|ohs act/i.test(blob))acts.push("Occupational Health and Safety Act");
  if(/iso 9001/i.test(blob))acts.push("ISO 9001");
  if(/iso 45001/i.test(blob))acts.push("ISO 45001");
  if(/en 13157/i.test(blob))acts.push("EN 13157");
  if(/bs 6166/i.test(blob))acts.push("BS 6166");
  if(/asme b30/i.test(blob))acts.push("ASME B30");
  if(acts.length===0)acts.push("Mines, Quarries, Works and Machinery Act CAP 44:02");
  return[...new Set(acts)];
}

/* ── full data merger ─────────────────────────────────────────────── */
function mergeAll(c){
  const pn=parseNotes(val(c?.notes||"")||"");
  const ex=(c?.extracted_data&&typeof c.extracted_data==="object")?c.extracted_data:{};
  const M={};
  Object.entries(pn).forEach(([k,v])=>{if(v!=null&&String(v).trim()!=="")M[k]=v;});
  Object.entries(ex).forEach(([k,v])=>{
    if(v==null)return;
    if(typeof v==="object"&&!Array.isArray(v))M[k]={...(M[k]||{}),...v};
    else if(String(v).trim()!=="")M[k]=v;
  });
  const cols={
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
    registration_number:c?.registration_number,
    manufacturer:c?.manufacturer,
    model:c?.model,
    swl:c?.swl,
    working_pressure:c?.working_pressure||c?.mawp,
    design_pressure:c?.design_pressure,
    test_pressure:c?.test_pressure,
    pressure_unit:c?.pressure_unit,
    capacity_volume:c?.capacity_volume,
    material:c?.material,
    standard_code:c?.standard_code,
    inspector_name:c?.inspector_name,
    inspector_id:c?.inspector_id,
    inspection_body:c?.inspection_body,
    defects_found:c?.defects_found,
    recommendations:c?.recommendations,
    comments:c?.comments||c?.remarks,
    year_built:c?.year_built,
    asset_tag:c?.asset_tag,
    nameplate_data:c?.nameplate_data,
    raw_text_summary:c?.raw_text_summary,
    machine_hours:c?.machine_hours,
  };
  Object.entries(cols).forEach(([k,v])=>{if(v!=null&&String(v).trim()!=="")M[k]=v;});
  return M;
}

/* ── detect 2-page ───────────────────────────────────────────────── */
function needs2Pages(c,D){
  if(c?.extracted_data?.has_second_page===true)return true;
  const ex=c?.extracted_data||{};
  if(ex.structural_integrity||ex.functional_test||ex.structural_integrity_assessment||ex.functional_test_verification||ex.overall_assessment)return true;
  const hasCL=ex.checklist&&Object.keys(ex.checklist).length>2;
  const hasLT=ex.boom&&(ex.boom.test_load||ex.boom.swl_at_actual_config);
  if(hasCL&&hasLT)return true;
  const t=String(D.equipment_type||"").toLowerCase();
  if(/mobile.crane|^crane$|cherry.picker|aerial.work|sandblast|blasting.pot/i.test(t))return true;
  const txt=(D.raw_text_summary||"").toLowerCase();
  if(/test certificate/i.test(txt)&&/compliance certificate|checklist/i.test(txt))return true;
  return false;
}

/* ── fields that are rendered by dedicated sections ─────────────── */
const RENDERED_SEPARATELY=new Set([
  "id","created_at","updated_at","deleted_at","tenant_id","organisation_id",
  "logo_url","pdf_url","photo_evidence","signature_url","extracted_data","notes",
  "certificate_number","result","issue_date","issued_at","inspection_date",
  "expiry_date","client_name","company","location","equipment_location",
  "serial_number","fleet_number","manufacturer","model","equipment_type",
  "asset_type","equipment_description","asset_name","swl","safe_working_load",
  "inspector_name","inspector_id","defects_found","recommendations","comments",
  "remarks","raw_text_summary","nameplate_data","registration_number",
  "year_built","asset_tag","fleet_number","machine_hours",
]);

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const CSS=`
  @page{size:A4;margin:0}
  .dyn-wrap{background:rgba(6,12,24,.94);border:1px solid rgba(148,163,184,.12);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px}
  .dyn-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,.3);overflow:hidden;page-break-after:always;break-after:page}
  .dyn-page.pm{box-shadow:none;width:100%}
  .dyn-page.last{page-break-after:avoid!important;break-after:avoid!important}
  .dyn-pb{page-break-after:always;break-after:page;height:0;display:block}
  /* header */
  .dyn-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .dyn-hdr-geo{position:absolute;inset:0;pointer-events:none}
  .dyn-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:80px}
  .dyn-logo{background:#fff;width:108px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px;clip-path:polygon(0 0,100% 0,80% 100%,0 100%)}
  .dyn-logo img{width:84px;height:60px;object-fit:contain}
  .dyn-hdr-txt{flex:1;padding:9px 9px 9px 24px;display:flex;flex-direction:column;justify-content:center}
  .dyn-brand{font-size:6.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px}
  .dyn-title{font-size:13.5px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.15}
  .dyn-sub{font-size:6.5px;color:rgba(255,255,255,.4);margin-top:3px;line-height:1.5}
  .dyn-hdr-right{padding:9px 13px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:5px;flex-shrink:0}
  .dyn-badge{font-size:9.5px;font-weight:900;padding:3px 11px;border-radius:99px;letter-spacing:.1em;text-transform:uppercase}
  .dyn-certno{font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:700;color:rgba(255,255,255,.55)}
  /* accent */
  .dyn-acc{height:3px;flex-shrink:0}
  .dyn-acc.blue{background:linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)}
  .dyn-acc.green{background:linear-gradient(90deg,#22c55e,#16a34a 55%,#4ade80)}
  .dyn-acc.orange{background:linear-gradient(90deg,#f97316,#fb923c 55%,#fbbf24)}
  .dyn-acc.red{background:linear-gradient(90deg,#ef4444,#dc2626 55%,#f87171)}
  /* body */
  .dyn-body{flex:1;padding:6px 13px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0}
  /* section label */
  .dyn-sl{font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0b1d3a;padding-left:5px;border-left:3px solid #22d3ee;flex-shrink:0}
  /* identity table */
  .dyn-ct{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-ct td{padding:3px 6px;border:1px solid #c3d4e8}
  .dyn-ct td:nth-child(odd){font-weight:700;background:#0b1d3a;color:#4fc3f7;white-space:nowrap;width:95px}
  .dyn-ct td:nth-child(even){background:#f4f8ff;font-weight:600;color:#0b1d3a}
  /* KV grid */
  .dyn-kvg{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-kv{padding:3.5px 7px;border-right:1px solid #e2ecf8;border-bottom:1px solid #e2ecf8;background:#f4f8ff}
  .dyn-kv:nth-child(odd){background:#eef4ff}
  .dyn-kv.red{background:#fff5f5!important;border-left:3px solid #ef4444}
  .dyn-kv-l{font-size:6.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:1px}
  .dyn-kv.red .dyn-kv-l{color:#b91c1c}
  .dyn-kv-v{font-size:9px;font-weight:600;color:#0b1d3a;word-break:break-word;line-height:1.3}
  .dyn-kv-v.mono{font-family:'IBM Plex Mono',monospace;font-size:8px;color:#0e7490}
  .dyn-kv.red .dyn-kv-v{color:#b91c1c;font-weight:700}
  /* checklist grid */
  .dyn-clg{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-clc{border-right:1px solid #1e3a5f;overflow:hidden}
  .dyn-clc:last-child{border-right:none}
  .dyn-cl-hd{background:#0b1d3a;color:#4fc3f7;font-size:6.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:2.5px 7px;border-bottom:1px solid #22d3ee}
  .dyn-cli{display:flex;align-items:center;justify-content:space-between;padding:2px 7px;border-bottom:1px solid #e8f0fb;font-size:7px}
  .dyn-cli:last-child{border-bottom:none}
  .dyn-cli:nth-child(even){background:#f8faff}
  .dyn-cl-lbl{color:#0b1d3a;font-weight:500;flex:1}
  .dyn-cl-p{color:#15803d;font-weight:900;font-size:9px;width:14px;text-align:center}
  .dyn-cl-f{color:#b91c1c;font-weight:900;font-size:9px;width:14px;text-align:center}
  .dyn-cl-n{color:#9ca3af;font-size:6.5px;width:14px;text-align:center}
  /* test cert table */
  .dyn-tc{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-tc td{padding:4px 8px;border:1px solid #c3d4e8}
  .dyn-tc td:nth-child(odd){font-weight:700;background:#0b1d3a;color:#4fc3f7;width:22%;white-space:nowrap}
  .dyn-tc td:nth-child(even){background:#f4f8ff;font-weight:600;color:#0b1d3a;width:28%}
  /* overall assessment */
  .dyn-oa{width:100%;border-collapse:collapse;font-size:7.5px;border:1px solid #1e3a5f;flex-shrink:0}
  .dyn-oa th{background:#0b1d3a;color:#4fc3f7;padding:3px 5px;font-size:6.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;border:1px solid #1e3a5f;text-align:center}
  .dyn-oa td{padding:5px 5px;border:1px solid #c3d4e8;text-align:center;font-size:7.5px;font-weight:600;color:#64748b;background:#fff;vertical-align:middle}
  .dyn-oa td.sel{background:#dcfce7;color:#15803d;font-weight:900;border:2px solid #86efac}
  .dyn-oa td.sel-f{background:#fee2e2;color:#b91c1c;font-weight:900;border:2px solid #fca5a5}
  .dyn-oa td.sel-a{background:#fef3c7;color:#b45309;font-weight:900;border:2px solid #fcd34d}
  /* compliance box */
  .dyn-compbox{border:2px solid #1e3a5f;border-radius:5px;padding:6px 10px;display:flex;align-items:center;justify-content:space-between;background:#f4f8ff;flex-shrink:0}
  /* defect/comment */
  .dyn-red{border:1px solid #fca5a5;border-radius:4px;padding:4px 8px;background:#fff5f5;flex-shrink:0}
  .dyn-red-lbl{font-size:6.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px}
  .dyn-red-val{font-size:8px;font-weight:700;color:#b91c1c;line-height:1.45}
  .dyn-comm{border:1px solid #c3d4e8;border-radius:4px;padding:4px 8px;background:#f4f8ff;flex-shrink:0}
  .dyn-comm-lbl{font-size:6.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .dyn-comm-val{font-size:8px;color:#334155;line-height:1.5}
  /* legislation */
  .dyn-leg{font-size:6.5px;color:#4b5563;border:1px solid #1e3a5f;border-radius:4px;padding:3px 8px;background:#f4f8ff;text-align:center;font-weight:700;flex-shrink:0}
  /* failure to comply */
  .dyn-ftc{border:1px solid #fca5a5;border-radius:4px;padding:4px 8px;background:#fff5f5;flex-shrink:0}
  .dyn-ftc-lbl{font-size:6.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px}
  .dyn-ftc-txt{font-size:7px;color:#7f1d1d;line-height:1.6;font-style:italic}
  /* partners */
  .dyn-partners{background:#f9fafb;border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px;flex-shrink:0}
  .dyn-partners-lbl{font-size:6.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .dyn-partners-list{display:flex;flex-wrap:wrap;gap:5px}
  .dyn-partner{font-size:7px;font-weight:600;color:#0b1d3a;background:#fff;border:1px solid #c3d4e8;border-radius:3px;padding:2px 6px}
  /* photos */
  .dyn-ev{border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex-shrink:0}
  .dyn-ev-hdr{background:#0b1d3a;color:#4fc3f7;font-size:6.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:2.5px 7px;border-bottom:1px solid #22d3ee}
  .dyn-ev-grid{display:flex;gap:5px;flex-wrap:wrap;padding:6px 7px;background:#f4f8ff}
  .dyn-ev-img{width:90px;height:62px;object-fit:cover;border-radius:3px;border:1px solid #c3d4e8;display:block}
  .dyn-ev-cap{font-size:6px;color:#4b5563;line-height:1.4;text-align:center;max-width:90px;word-break:break-word;margin-top:2px}
  /* sig */
  .dyn-sig{padding:4px 12px;flex-shrink:0}
  .dyn-sig-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .dyn-sig-lbl{font-size:6.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .dyn-sig-line{border-bottom:1px solid #1e3a5f;min-height:32px;display:flex;align-items:flex-end;padding-bottom:2px;margin-bottom:2px;background:#fff}
  .dyn-sig-name{font-size:8px;font-weight:700;color:#0b1d3a}
  .dyn-sig-role{font-size:7px;color:#64748b}
  /* footer strips */
  .dyn-svc{background:#c41e3a;padding:3px 12px;flex-shrink:0}
  .dyn-svc p{font-size:6px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600;letter-spacing:.02em}
  .dyn-foot{background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 12px;display:flex;justify-content:space-between;flex-shrink:0}
  .dyn-foot span{font-size:6.5px;color:rgba(255,255,255,.35);font-weight:600}
  @media print{
    @page{size:A4;margin:0}html,body{margin:0;padding:0}
    .dyn-wrap{background:none!important;padding:0!important;border:none!important;gap:0!important;display:block!important}
    .dyn-page{box-shadow:none!important;width:210mm!important;height:297mm!important;overflow:hidden!important;page-break-after:always;break-after:page;margin:0!important}
    .dyn-page.last{page-break-after:avoid!important;break-after:avoid!important}
    .dyn-pb{page-break-after:always;break-after:page;height:0}
  }
`;

/* ══════════════════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════════════════ */
function Hdr({logo,title,subtitle,certNo,result,acc="blue"}){
  const t=tone(result||"");
  return(
    <>
      <div className="dyn-hdr">
        <svg className="dyn-hdr-geo" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice">
          <circle cx="520" cy="-10" r="100" fill="rgba(34,211,238,0.06)"/>
          <circle cx="480" cy="70"  r="55"  fill="rgba(59,130,246,0.05)"/>
          <circle cx="30"  cy="120" r="65"  fill="rgba(167,139,250,0.04)"/>
        </svg>
        <div className="dyn-hdr-inner">
          <div className="dyn-logo"><img src={logo||"/logo.png"} alt="Monroy" onError={e=>e.target.style.display="none"}/></div>
          <div className="dyn-hdr-txt">
            <div className="dyn-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
            <div className="dyn-title">{title||"Certificate of Inspection"}</div>
            {subtitle&&<div className="dyn-sub">{subtitle}</div>}
            <div className="dyn-sub">Mobile Crane Hire · Rigging · NDT Test · Scaffolding · Painting · Inspection of Lifting Equipment &amp; Machinery · Pressure Vessels · Steel Fabricating · Mechanical Engineering</div>
          </div>
          <div className="dyn-hdr-right">
            {result&&<span className="dyn-badge" style={{background:t.bg,color:t.color,border:`1px solid ${t.brd}`}}>{t.label}</span>}
            {certNo&&<div className="dyn-certno">{certNo}</div>}
          </div>
        </div>
      </div>
      <div className={`dyn-acc ${acc}`}/>
    </>
  );
}

function Footer(){
  return(
    <>
      <div className="dyn-svc"><p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment &amp; Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating &amp; Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p></div>
      <div className="dyn-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </>
  );
}

function Sig({name,id,sigUrl}){
  return(
    <div className="dyn-sig">
      <div className="dyn-sig-g">
        <div>
          <div className="dyn-sig-lbl">Competent Person / Inspector</div>
          <div className="dyn-sig-line"><img src={sigUrl||"/Signature"} alt="sig" style={{maxHeight:28,maxWidth:88,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/></div>
          <div className="dyn-sig-name">{name||"Moemedi Masupe"}</div>
          <div className="dyn-sig-role">Inspector ID: {id||"700117910"}</div>
        </div>
        <div>
          <div className="dyn-sig-lbl">Client Name &amp; Signature</div>
          <div className="dyn-sig-line"/>
          <div className="dyn-sig-name" style={{minHeight:11}}/>
          <div className="dyn-sig-role">Name &amp; Signature</div>
        </div>
      </div>
    </div>
  );
}

function LegBar({c}){
  const acts=detectActs(c);
  return<div className="dyn-leg">INSPECTION CARRIED OUT IN ACCORDANCE WITH: {acts.join(" · ")}</div>;
}

function Evidence({photos}){
  if(!photos||!photos.length)return null;
  return(
    <div className="dyn-ev">
      <div className="dyn-ev-hdr">Photo Evidence ({photos.length})</div>
      <div className="dyn-ev-grid">
        {photos.map((p,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",gap:1}}>
            <img className="dyn-ev-img" src={p.dataURL} alt={p.caption||`Photo ${i+1}`} onError={e=>e.target.style.display="none"}/>
            {p.caption&&<div className="dyn-ev-cap">{p.caption}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RBadge({v}){
  if(!v)return null;
  const t=tone(v.toUpperCase());
  return<span style={{display:"inline-block",fontSize:7,fontWeight:800,padding:"1px 5px",borderRadius:3,background:t.bg,color:t.color,border:`1px solid ${t.brd}`}}>{t.label}</span>;
}

/* KV grid: renders every field in obj (flattens 1 level) */
function KVGrid({data,skip=new Set()}){
  const flat={};
  function flatten(obj,pfx){
    if(!obj||typeof obj!=="object"||Array.isArray(obj))return;
    Object.entries(obj).forEach(([k,v])=>{
      const key=pfx?`${pfx} ${k}`:k;
      if(v==null)return;
      if(typeof v==="object"&&!Array.isArray(v))flatten(v,key);
      else if(Array.isArray(v)){if(v.length)flat[key]=v.join(", ");}
      else{const s=String(v).trim();if(s)flat[key]=v;}
    });
  }
  Object.entries(data||{}).forEach(([k,v])=>{
    if(skip.has(k))return;
    if(v==null||String(v).trim()==="")return;
    if(typeof v==="object"&&!Array.isArray(v))flatten(v,k);
    else if(Array.isArray(v)){if(v.length)flat[k]=v.join(", ");}
    else flat[k]=v;
  });
  const entries=Object.entries(flat);
  if(!entries.length)return null;
  const isMono=k=>/serial|number|no\.|id|code|cert|ref|voltage/i.test(k);
  const isRedVal=(k,v)=>/defect|fail|crack|condemn|reject/i.test(k)||/^fail|^reject/i.test(String(v));
  const isResultField=k=>/result|status|condition|assessment|serviceability|integrity|verification/i.test(k);
  return(
    <div className="dyn-kvg">
      {entries.map(([k,v])=>{
        const red=isRedVal(k,v);
        const rish=isResultField(k);
        return(
          <div key={k} className={`dyn-kv${red?" red":""}`}>
            <div className="dyn-kv-l">{humanKey(k)}</div>
            <div className={`dyn-kv-v${isMono(k)?" mono":""}`}>
              {rish?<RBadge v={String(v)}/>:String(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Checklist({data,title}){
  if(!data||typeof data!=="object")return null;
  const entries=Object.entries(data).filter(([,v])=>v!=null&&String(v).trim()!=="");
  if(!entries.length)return null;
  const toR=v=>{
    const s=String(v||"").toUpperCase().trim();
    if(["PASS","YES","Y","TRUE","OK","GOOD","PASSED","SERVICEABLE","SATISFACTORY"].includes(s))return"p";
    if(["FAIL","NO","N","FALSE","BAD","POOR","FAILED","DEFECTIVE","REJECT"].includes(s))return"f";
    return"n";
  };
  const mid=Math.ceil(entries.length/2);
  const left=entries.slice(0,mid);
  const right=entries.slice(mid);
  return(
    <div className="dyn-clg">
      <div className="dyn-clc">
        <div className="dyn-cl-hd">{title||"Inspection Checklist"}</div>
        {left.map(([k,v])=>{const r=toR(v);return(
          <div key={k} className="dyn-cli">
            <span className="dyn-cl-lbl">{humanKey(k)}</span>
            {r==="n"?<span className="dyn-cl-n">N/A</span>:<><span className="dyn-cl-p">{r==="p"?"✓":""}</span><span className="dyn-cl-f">{r==="f"?"✗":""}</span></>}
          </div>
        );})}
      </div>
      <div className="dyn-clc">
        {right.length>0&&<div className="dyn-cl-hd">— continued —</div>}
        {right.map(([k,v])=>{const r=toR(v);return(
          <div key={k} className="dyn-cli">
            <span className="dyn-cl-lbl">{humanKey(k)}</span>
            {r==="n"?<span className="dyn-cl-n">N/A</span>:<><span className="dyn-cl-p">{r==="p"?"✓":""}</span><span className="dyn-cl-f">{r==="f"?"✗":""}</span></>}
          </div>
        );})}
      </div>
    </div>
  );
}

function CT({D}){
  const co=val(D.client_name)||"—";
  const loc=val(D.location)||"—";
  const dt=fmtDate(D.issue_date)||"—";
  const make=val(D.manufacturer||D.model||D.equipment_type)||"—";
  const sn=val(D.serial_number)||"—";
  const fl=val(D.fleet_number);
  const swl=val(D.swl);
  const yr=val(D.year_built);
  const reg=val(D.registration_number);
  const mh=val(D.machine_hours);
  return(
    <table className="dyn-ct"><tbody>
      <tr><td>Customer</td><td>{co}</td><td>Make / Type</td><td>{make}</td></tr>
      <tr><td>Site / Location</td><td>{loc}</td><td>Serial Number</td><td>{sn}</td></tr>
      <tr><td>Date</td><td>{dt}</td><td>Fleet No.</td><td>{fl||"—"}</td></tr>
      {(swl||yr)&&<tr><td>Capacity / SWL</td><td>{swl||"—"}</td><td>Year Built</td><td>{yr||"—"}</td></tr>}
      {reg&&<tr><td>Registration No.</td><td>{reg}</td><td>Asset Tag</td><td>{val(D.asset_tag)||"—"}</td></tr>}
      {mh&&<tr><td>Machine Hours</td><td colSpan={3}>{mh}</td></tr>}
    </tbody></table>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE 1 — COMPLIANCE / INSPECTION CERTIFICATE
══════════════════════════════════════════════════════════ */
function Page1({c,D,pm,logo,isLast}){
  const certNo=val(D.certificate_number);
  const result=pickResult(c);
  const t=tone(result);
  const inspName=val(D.inspector_name)||"Moemedi Masupe";
  const inspId=val(D.inspector_id)||"700117910";
  const defects=val(D.defects_found);
  const recs=val(D.recommendations);
  const comms=val(D.comments);
  const rawSum=val(D.raw_text_summary);
  const expiryDate=fmtDate(D.expiry_date);
  const photos=parsePhotos(c?.photo_evidence);
  const ex=c?.extracted_data||{};

  // accent colour
  const acc=result==="FAIL"?"red":result==="CONDITIONAL"?"orange":"blue";

  // Build cert title
  const equipType=val(D.equipment_type)||"Equipment";
  const acts=detectActs(c);
  const isFactories=acts.some(a=>/factories act/i.test(a));
  const certTitle=`${equipType} — ${isFactories?"Compliance Certificate":"Certificate of Inspection"}`;

  // Sub-objects from extracted_data
  const checklist=ex.checklist||ex.general_checklist||ex.inspection_checklist||{};
  const boom=ex.boom||ex.boom_configuration||{};
  const sling=ex.sling_details||{};
  const condAssess=ex.condition_assessment||{};
  const pvChecklist=ex.pressure_vessel_checklist||{};

  const HANDLED=new Set(["checklist","general_checklist","inspection_checklist","boom","boom_configuration","sling_details","condition_assessment","pressure_vessel_checklist","has_second_page","legislation","partners","failure_to_comply","failure_to_comply_note","structural_integrity","functional_test","structural_integrity_assessment","functional_test_verification","overall_assessment","source_cert_number","original_cert_number"]);

  // Extra extracted fields not in HANDLED
  const extraEx={};
  Object.entries(ex).forEach(([k,v])=>{
    if(HANDLED.has(k))return;
    if(v==null||String(v).trim()==="")return;
    if(typeof v==="object"&&!Array.isArray(v)){
      // Only add it to extra if it's not empty
      const inner=Object.values(v).filter(x=>x!=null&&String(x).trim()!=="");
      if(inner.length)extraEx[k]=v;
      return;
    }
    extraEx[k]=v;
  });

  // Top-level extra fields (not in CT table, not rendered separately)
  const topExtra={};
  Object.entries(D).forEach(([k,v])=>{
    if(RENDERED_SEPARATELY.has(k))return;
    if(v==null||String(v).trim()==="")return;
    topExtra[k]=v;
  });

  const partners=Array.isArray(ex.partners)?ex.partners:[];

  return(
    <div className={`dyn-page${pm?" pm":""}${isLast?" last":""}`}>
      <Hdr logo={logo} title={certTitle}
        subtitle={`${val(D.client_name)||"Client"} · ${val(D.location)||"Site"} · Ref: ${certNo||"—"}`}
        certNo={certNo} result={result} acc={acc}/>
      <div className="dyn-body">

        <CT D={D}/>

        {/* Cert identity + compliance tick */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:5,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"6px 9px",background:"#f4f8ff"}}>
            <div style={{fontSize:11,fontWeight:900,color:"#0b1d3a"}}>{certTitle}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,fontWeight:800,color:"#0e7490",marginTop:2}}>{certNo||"—"}</div>
            {expiryDate&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:3,border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 6px",marginTop:3,fontSize:7.5,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>
                <span style={{color:"#3b6ea5"}}>Valid until:</span> {expiryDate}
              </div>
            )}
          </div>
          <div className="dyn-compbox" style={{padding:"5px 12px"}}>
            <div>
              <div style={{fontSize:9.5,fontWeight:900,color:"#0b1d3a"}}>Compliance</div>
              <div style={{fontSize:7.5,color:"#64748b",marginTop:1}}>{result==="FAIL"?"Not to be issued":"Certificate issued"}</div>
            </div>
            <div style={{fontSize:28,color:t.color,fontWeight:900,marginLeft:10}}>{result==="FAIL"?"✗":"✓"}</div>
          </div>
        </div>

        {/* All top-level extra fields (power voltage, weight, etc.) */}
        {Object.keys(topExtra).length>0&&(
          <>
            <div className="dyn-sl">Equipment Details</div>
            <KVGrid data={topExtra}/>
          </>
        )}

        {/* Extra extracted data */}
        {Object.keys(extraEx).length>0&&(
          <>
            <div className="dyn-sl">Additional Data</div>
            <KVGrid data={extraEx} skip={new Set([])}/>
          </>
        )}

        {/* Boom/load data */}
        {Object.values(boom).some(v=>v!=null&&String(v).trim()!=="")&&(
          <>
            <div className="dyn-sl">Boom Configuration &amp; Load Test</div>
            <KVGrid data={boom} skip={new Set([])}/>
          </>
        )}

        {/* Sling / condition */}
        {Object.values(sling).some(v=>v!=null&&String(v).trim()!=="")&&(
          <><div className="dyn-sl">Sling Details</div><KVGrid data={sling} skip={new Set([])}/></>
        )}
        {Object.values(condAssess).some(v=>v!=null&&String(v).trim()!=="")&&(
          <><div className="dyn-sl">Condition Assessment</div><KVGrid data={condAssess} skip={new Set([])}/></>
        )}

        {/* PV checklist */}
        {Object.keys(pvChecklist).length>0&&(
          <><div className="dyn-sl">Pressure Vessel Inspection Results</div><Checklist title="Pressure Vessel Checklist" data={pvChecklist}/></>
        )}

        {/* General checklist */}
        {Object.keys(checklist).length>0&&(
          <><div className="dyn-sl">Inspection Checklist</div><Checklist title="Checklist" data={checklist}/></>
        )}

        {/* Raw text summary */}
        {rawSum&&(
          <div className="dyn-comm">
            <div className="dyn-comm-lbl">Source Document Summary</div>
            <div className="dyn-comm-val" style={{fontSize:7,lineHeight:1.6}}>{rawSum}</div>
          </div>
        )}

        {/* Defects / recs / comments */}
        {defects&&<div className="dyn-red"><div className="dyn-red-lbl">Defects Found</div><div className="dyn-red-val">{defects}</div></div>}
        {recs&&<div className="dyn-red"><div className="dyn-red-lbl">Recommendations</div><div className="dyn-red-val">{recs}</div></div>}
        {comms&&<div className="dyn-comm"><div className="dyn-comm-lbl">Comments / Notes</div><div className="dyn-comm-val">{comms}</div></div>}

        {/* Partners */}
        {partners.length>0&&(
          <div className="dyn-partners">
            <div className="dyn-partners-lbl">Our Partners</div>
            <div className="dyn-partners-list">{partners.map((p,i)=><span key={i} className="dyn-partner">{p}</span>)}</div>
          </div>
        )}

        {photos.length>0&&<Evidence photos={photos}/>}
        <LegBar c={c}/>
      </div>
      <Sig name={inspName} id={inspId} sigUrl="/Signature"/>
      <Footer/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE 2 — TEST CERTIFICATE
   Mirrors exactly the "GULF STREAM ENERGY TEST CERTIFICATE
   (FACTORIES ACT CAP 44:01)" structure from the PDF:
   
   • Header with client name + test cert title + legislation
   • Full data table (cert no, equipment, dates, serial, technical specs)
   • Structural Integrity + Functional Test side-by-side
   • Overall Assessment 4-column options grid with selected cell highlighted
   • PASS THOROUGH INSPECTION / FAILED row
   • Failure to Comply clause (italicised)
   • Dual signature block
══════════════════════════════════════════════════════════ */
function Page2({c,D,pm,logo}){
  const certNo=val(D.certificate_number);
  const result=pickResult(c);
  const t=tone(result);
  const inspName=val(D.inspector_name)||"Moemedi Masupe";
  const inspId=val(D.inspector_id)||"700117910";
  const defects=val(D.defects_found);
  const recs=val(D.recommendations);
  const photos=parsePhotos(c?.photo_evidence);
  const issueDate=fmtDate(D.issue_date);
  const expiryDate=fmtDate(D.expiry_date);
  const ex=c?.extracted_data||{};

  // Test-cert specific values
  const structInteg=val(ex.structural_integrity||ex.structural_integrity_assessment)||"Passed";
  const funcTest=val(ex.functional_test||ex.functional_test_verification)||"Passed";
  const ftcText=val(ex.failure_to_comply||ex.failure_to_comply_note)||
    "Failure to comply may result in prosecution under section 70, penalties under section 71, or court ordered remedial action under section 72 of the applicable legislation.";
  const srcCertNo=val(ex.source_cert_number||ex.original_cert_number)||certNo;

  // Partners
  const partners=Array.isArray(ex.partners)?ex.partners:[];

  // Legislation for subtitle
  const acts=detectActs(c);
  const actsStr=acts.join(" · ");
  const clientName=val(D.client_name)||"Client";
  const equipType=val(D.equipment_type)||"Equipment";

  // Result flags
  const isPass=result==="PASS";
  const isFail=result==="FAIL";
  const isCond=result==="CONDITIONAL"||/corrective/i.test(ex.overall_assessment||"");
  const isOOS=result==="OUT_OF_SERVICE";

  // Build data rows for the main table — pairs
  const allRows=[
    ["Certificate No.", srcCertNo||certNo,         "Equipment Type", equipType],
    ["Date of Inspection", issueDate||"—",          "Next Inspection Date", expiryDate||"—"],
    ["Serial No.", val(D.serial_number)||"—",        "Client", clientName],
    val(ex.power_voltage||ex.voltage)
      ?["Power Voltage", val(ex.power_voltage||ex.voltage), "Client's Location", val(D.location)||"—"]
      :val(D.working_pressure)
        ?["Voltage / Pressure", `${D.working_pressure}${D.pressure_unit?` ${D.pressure_unit}`:""}`, "Client's Location", val(D.location)||"—"]
        :["Client's Location", val(D.location)||"—", "", ""],
    val(ex.weight||D.capacity_volume)
      ?["Weight (kg)", val(ex.weight||D.capacity_volume), val(D.swl)?"Capacity / SWL":"", val(D.swl)||""]
      :null,
  ].filter(Boolean);

  return(
    <div className={`dyn-page last${pm?" pm":""}`}>
      <Hdr
        logo={logo}
        title={`${clientName} Test Certificate`}
        subtitle={`(${actsStr}) · ${equipType}`}
        certNo={certNo}
        result={result}
        acc={result==="FAIL"?"red":"green"}
      />
      <div className="dyn-body">

        {/* Main data table */}
        <table className="dyn-tc"><tbody>
          {allRows.map(([l1,v1,l2,v2],i)=>(
            <tr key={i}>
              {l1&&<><td>{l1}</td><td>{v1}</td></>}
              {l2?<><td>{l2}</td><td>{v2}</td></>:<td colSpan={2}/>}
            </tr>
          ))}
        </tbody></table>

        {/* Structural Integrity + Functional Test side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,flexShrink:0}}>
          {[
            ["Structural Integrity Assessment",structInteg],
            ["Functional Test Verification",funcTest],
          ].map(([lbl,v])=>{
            const isPassed=/^pass/i.test(v)||/^good/i.test(v)||/^satisf/i.test(v);
            const isFailed=/^fail/i.test(v)||/^poor/i.test(v);
            return(
              <div key={lbl} style={{border:"1px solid #1e3a5f",borderRadius:4,overflow:"hidden"}}>
                <div style={{background:"#0b1d3a",color:"#4fc3f7",fontSize:6.5,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",padding:"2.5px 7px",borderBottom:"1px solid #22d3ee"}}>{lbl}</div>
                <div style={{padding:"6px 9px",background:isPassed?"#f0fdf4":isFailed?"#fff5f5":"#fff",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,color:isPassed?"#15803d":isFailed?"#b91c1c":"#64748b",fontWeight:900}}>{isPassed?"✓":isFailed?"✗":"—"}</span>
                  <span style={{fontSize:9,color:"#334155",fontWeight:600}}>{v}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Assessment — 4-column checkbox grid */}
        <div className="dyn-sl">Overall Assessment</div>
        <table className="dyn-oa">
          <thead>
            <tr>
              <th>Safe for operation</th>
              <th>Safe for operation subject to corrective action</th>
              <th>Not safe for operation</th>
              <th>Safe for operation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={isPass&&!isCond?"sel":""}>
                {isPass&&!isCond&&<><b>✓</b><br/></>}Safe for operation
              </td>
              <td className={isCond?"sel-a":""}>
                {isCond&&<><b>✓</b><br/></>}Safe for operation subject to corrective action
              </td>
              <td className={isFail||isOOS?"sel-f":""}>
                {(isFail||isOOS)&&<><b>✓</b><br/></>}Not safe for operation
              </td>
              <td className={isPass?"sel":""}>
                {isPass&&<><b>✓</b><br/></>}Safe for operation
              </td>
            </tr>
          </tbody>
        </table>

        {/* PASS THOROUGH INSPECTION / FAILED row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,overflow:"hidden"}}>
            <div style={{background:"#0b1d3a",color:"#4fc3f7",fontSize:6.5,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",padding:"2.5px 7px",borderBottom:"1px solid #22d3ee"}}>
              Pass Thorough Inspection / Failed
            </div>
            <div style={{display:"flex",gap:24,padding:"6px 12px",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:8,fontWeight:700,color:"#0b1d3a"}}>Pass:</span>
                <span style={{fontSize:18,color:"#15803d",fontWeight:900,lineHeight:1}}>{!isFail?"✓":""}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:8,fontWeight:700,color:"#0b1d3a"}}>Fail:</span>
                <span style={{fontSize:18,color:"#b91c1c",fontWeight:900,lineHeight:1}}>{isFail?"✗":""}</span>
              </div>
            </div>
          </div>
          <div style={{border:`2px solid ${t.brd}`,borderRadius:4,padding:"6px 12px",background:t.bg,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,fontWeight:900,color:t.color,letterSpacing:".1em"}}>{t.label}</div>
              <div style={{fontSize:7.5,color:"#64748b",marginTop:2}}>Test Certificate Result</div>
            </div>
            <div style={{fontSize:28,color:t.color,fontWeight:900}}>{isFail?"✗":"✓"}</div>
          </div>
        </div>

        {/* Failure to Comply */}
        <div className="dyn-ftc">
          <div className="dyn-ftc-lbl">⚠ Failure to Comply</div>
          <div className="dyn-ftc-txt">{ftcText}</div>
        </div>

        {/* Defects / recs */}
        {defects&&<div className="dyn-red"><div className="dyn-red-lbl">Defects Found</div><div className="dyn-red-val">{defects}</div></div>}
        {recs&&<div className="dyn-red"><div className="dyn-red-lbl">Recommendations</div><div className="dyn-red-val">{recs}</div></div>}

        {/* Partners */}
        {partners.length>0&&(
          <div className="dyn-partners">
            <div className="dyn-partners-lbl">Our Partners</div>
            <div className="dyn-partners-list">{partners.map((p,i)=><span key={i} className="dyn-partner">{p}</span>)}</div>
          </div>
        )}

        {photos.length>1&&<Evidence photos={photos.slice(Math.ceil(photos.length/2))}/>}
        <LegBar c={c}/>
      </div>

      {/* Dual sig block matching original PDF layout */}
      <div style={{padding:"4px 12px",flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{fontSize:7,fontWeight:700,color:"#3b6ea5",marginBottom:1}}>Inspector's Name: {inspName}</div>
            <div style={{fontSize:7,color:"#3b6ea5",marginBottom:3}}>Inspector ID: {inspId}</div>
            <div style={{fontSize:7,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#3b6ea5",marginBottom:2}}>Signature:</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:3,minHeight:32,display:"flex",alignItems:"flex-end",padding:"2px 7px",background:"#fff"}}>
              <img src="/Signature" alt="sig" style={{maxHeight:28,maxWidth:88,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
            </div>
          </div>
          <div>
            <div style={{fontSize:7,fontWeight:700,color:"#3b6ea5",marginBottom:1}}>Client's Name:</div>
            <div style={{minHeight:18,marginBottom:3}}/>
            <div style={{fontSize:7,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#3b6ea5",marginBottom:2}}>Signature:</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:3,minHeight:32,background:"#fff",padding:"2px 7px"}}/>
          </div>
        </div>
      </div>

      <Footer/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function CertificateSheet({
  certificate:c,
  index=0,
  total=1,
  printMode=false,
}){
  if(!c)return null;
  const logo=c.logo_url||"/logo.png";
  const pm=printMode;
  const D=mergeAll(c);
  const twoPage=needs2Pages(c,D);

  const wrap=ch=>(
    <><style>{CSS}</style><div className={pm?"":"dyn-wrap"}>{ch}</div></>
  );

  if(twoPage){
    return wrap(
      <>
        <Page1 c={c} D={D} pm={pm} logo={logo} isLast={false}/>
        <div className="dyn-pb"/>
        <Page2 c={c} D={D} pm={pm} logo={logo}/>
      </>
    );
  }
  return wrap(<Page1 c={c} D={D} pm={pm} logo={logo} isLast={true}/>);
}
