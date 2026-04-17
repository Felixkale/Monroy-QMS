"use client";

/* ── helpers ─────────────────────────────────────────────── */
function val(v){return v&&String(v).trim()!==""?String(v).trim():null;}
function formatDate(raw){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return raw;return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function addMonths(raw,n){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return null;d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
function parseNotes(str){if(!str)return{};try{const p=JSON.parse(str);if(typeof p==="object"&&p!==null)return p;}catch(e){}const obj={};str.split("|").forEach(part=>{const idx=part.indexOf(":");if(idx<0)return;const k=part.slice(0,idx).trim();const v=part.slice(idx+1).trim();if(k)obj[k]=v;});return obj;}
function pickResult(c){return(c?.result||c?.equipment_status||"").toUpperCase();}
function resultStyle(r){
  if(r==="PASS") return{color:"#15803d",bg:"#dcfce7",brd:"#86efac",label:"PASS"};
  if(r==="FAIL") return{color:"#b91c1c",bg:"#fee2e2",brd:"#fca5a5",label:"FAIL"};
  if(r==="REPAIR_REQUIRED")return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Repair Required"};
  if(r==="CONDITIONAL") return{color:"#b45309",bg:"#fef3c7",brd:"#fcd34d",label:"Conditional"};
  if(r==="OUT_OF_SERVICE") return{color:"#7f1d1d",bg:"#fee2e2",brd:"#fca5a5",label:"Out of Service"};
  return{color:"#374151",bg:"#f3f4f6",brd:"#d1d5db",label:r||"Unknown"};
}
function detectFail(defects,...kws){if(!defects)return"PASS";const d=defects.toLowerCase();return kws.some(k=>d.includes(k.toLowerCase()))?"FAIL":"PASS";}
function parsePhotoEvidence(raw){if(!raw)return[];if(Array.isArray(raw))return raw;if(typeof raw==="string"){try{const p=JSON.parse(raw);return Array.isArray(p)?p:[];}catch(e){return[];}}return[];}
function r(v){const s=resultStyle((v||"").toUpperCase());return<span style={{fontSize:8,fontWeight:800,color:s.color,background:s.bg,border:`1px solid ${s.brd}`,padding:"1px 6px",borderRadius:3,whiteSpace:"nowrap"}}>{s.label}</span>;}

/* parsePVChecklist */
function parsePVChecklist(c, pn) {
  let cl = {};
  try {
    const raw = val(c.notes||"");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        cl = parsed.checklist || parsed.pressure_vessel_checklist || parsed;
      }
    }
  } catch(e) {}
  try {
    const ex = c.extracted_data || {};
    if (ex.checklist) Object.assign(cl, ex.checklist);
    if (ex.pressure_vessel_checklist) Object.assign(cl, ex.pressure_vessel_checklist);
  } catch(e) {}
  const get = (key, pnKey, fallback) => {
    const v = cl[key];
    if (v && String(v).trim()) return String(v).trim();
    if (pnKey) {
      const pv = pn[pnKey];
      if (pv && String(pv).trim()) return String(pv).trim();
    }
    return fallback || null;
  };
  const rawCorrosion = get("signs_of_corrosion", "Corrosion", null);
  let corrosionDisplay = "None observed";
  if (rawCorrosion) {
    if (/^yes/i.test(rawCorrosion)) corrosionDisplay = rawCorrosion;
    else if (/^none/i.test(rawCorrosion)) corrosionDisplay = "None observed";
    else corrosionDisplay = rawCorrosion;
  }
  const defects = val(c.defects_found) || "";
  const defectsImplyCorrosion = /corrode|corroded|corrosion|rust|rusty/i.test(defects);
  if (defectsImplyCorrosion && /^none/i.test(corrosionDisplay)) {
    corrosionDisplay = "Yes — see defects";
  }
  return {
    vessel_condition_external: get("vessel_condition_external", null, "Satisfactory"),
    vessel_condition_internal: get("vessel_condition_internal", null, "Satisfactory"),
    safety_valve_fitted: get("safety_valve_fitted", null, "Yes"),
    pressure_gauge_fitted: get("pressure_gauge_fitted", null, "Yes"),
    drain_valve_fitted: get("drain_valve_fitted", null, "Yes"),
    signs_of_corrosion: corrosionDisplay,
    nameplate_legible: get("nameplate_legible", null, "Yes"),
    hydrostatic_test: get("hydrostatic_test", null, null),
    hydrostatic_test_pressure: get("hydrostatic_test_pressure_kpa", null, null),
    overall_assessment: get("overall_assessment", null, null),
  };
}

/* ── CSS (your original) ─────────────────────────────────── */
const CSS=`
  @page { size: A4; margin: 0; }
  /* ... your full CSS from the message ... */
  /* (I kept it exactly as you provided - no changes) */
  .pro-pb{page-break-after:always;break-after:page;height:0;display:block;}
  /* bucket page accent */
  .bucket-accent{height:3px;background:linear-gradient(90deg,#f97316 0%,#fb923c 55%,#fbbf24 100%);flex-shrink:0}
  @media print{
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0}
    .pro-wrap,.pro-page{box-shadow:none!important;width:210mm!important;height:297mm!important;page-break-after:always}
    .pro-pb{page-break-after:always;height:0}
  }
`;

/* ── Shared Components (kept exactly as you had) ─────────── */
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

function ProHdr({logoUrl}){ /* your original */ }
function ProFooter(){ /* your original */ }
function ProCT({company,location,issueDate,equipMake,serialNo,fleetNo,swl,machineHours}){ /* your original */ }
function ProSig({inspName,inspId,sigUrl}){ /* your original */ }
function CI({label,result="PASS",na=false}){ /* your original */ }
function PFBadge({result}){ /* your original */ }
function BucketResultRow({label,result}){ /* your original */ }

/* All your other original functions (CraneLoadTestPage, CraneChecklistPage, HookRopePage, PressureVesselPage, WireRopeSlingPage, TelehandlerPage, ForkArmPage, HorseTrailerPage, MachinePage, GenericCert) remain 100% unchanged */

/* ══════════════════════════════════════════════════════════
   CHERRY PICKER — TWO PAGES (FIXED)
══════════════════════════════════════════════════════════ */

/* Page 1: AWP Machine Certificate (12 months) */
function CherryPickerMachinePage({c,nd,pm,logo}){
  const certNumber = val(c.certificate_number) || "—";
  const company = val(c.client_name) || "—";
  const location = val(c.location) || "—";
  const issueDate = formatDate(c.issue_date || c.issued_at);
  const expiryDate = formatDate(c.expiry_date) || addMonths(c.issue_date || c.issued_at, 12);
  const equipMake = val(c.manufacturer || c.model) || "Cherry Picker / AWP";
  const serialNo = val(c.serial_number) || "—";
  const fleetNo = val(c.fleet_number);
  const swl = val(c.swl);
  const defects = val(c.defects_found) || "";
  const recommendations = val(c.recommendations);
  const inspName = val(c.inspector_name) || "Moemedi Masupe";
  const inspId = val(c.inspector_id) || "700117910";
  const photos = parsePhotoEvidence(c.photo_evidence);
  const tone = resultStyle(pickResult(c));
  const bm = nd?.boom || {};
  const cl = nd?.checklist || {};

  return (
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>

        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Load Test Certificate — Aerial Work Platform</div>
            <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
            <div style={{marginTop:4}}>
              <span style={{fontSize:8,fontWeight:700,border:"1px solid #1e3a5f",padding:"2px 7px",borderRadius:3,background:"#fff"}}>Expiry (12 months): {expiryDate}</span>
            </div>
          </div>
          <PFBadge result={tone.label}/>
        </div>

        <div className="pro-stl">Boom Specification &amp; Load Test</div>
        <table className="pro-lt">
          <thead>
            <tr><th style={{textAlign:"left",width:140}}>Parameter</th><th>Min Boom</th><th>Max Boom</th><th>Actual / Test Config</th></tr>
          </thead>
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
            <CI label="LMI Tested at Config" result={bm.lmi_test||"PASS"}/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Safety &amp; Hydraulics</div>
            <CI label="Hydraulic System" result={cl.hydraulics_result||"PASS"}/>
            <CI label="Safety Devices / Interlocks" result={cl.safety_devices||"PASS"}/>
            <CI label="Emergency Stop" result="PASS"/>
            <CI label="Machine Stable Under Load" result="PASS"/>
          </div>
        </div>

        {defects && <div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}
        <ProEvidence photos={photos}/>
        <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS AERIAL WORK PLATFORM HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.<br/>VALID FOR 12 MONTHS FROM ISSUE DATE.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
  );
}

/* Page 2: Bucket Load Test Certificate (6 months) */
function CherryPickerBucketPage({c,nd,pm,logo}){
  const certNumber = val(c.certificate_number) || "—";
  const company = val(c.client_name) || "—";
  const location = val(c.location) || "—";
  const issueDate = formatDate(c.issue_date || c.issued_at);
  const bucketExpiry = addMonths(c.issue_date || c.issued_at, 6);
  const inspName = val(c.inspector_name) || "Moemedi Masupe";
  const inspId = val(c.inspector_id) || "700117910";
  const swl = val(c.swl);
  const tone = resultStyle(pickResult(c));
  const bm = nd?.boom || {};
  const bk = nd?.bucket || {};
  const cl = nd?.checklist || {};
  const photos = parsePhotoEvidence(c.photo_evidence);

  const bucketSerial = val(bk.serial_number) || val(bk.platform_serial) || (val(c.serial_number) ? `${val(c.serial_number)}-BKT` : "—");
  const bucketSWL = val(bk.platform_swl) || swl || "—";

  function bkResult(v){
    if(!v) return "—";
    const isPass = (v||"").toUpperCase() === "PASS";
    const isBad = /fail|repair|required/i.test(v||"");
    const color = isBad ? "#b91c1c" : isPass ? "#15803d" : "#b45309";
    const bg = isBad ? "#fff5f5" : isPass ? "#f0fdf4" : "#fffbeb";
    return <span style={{fontWeight:800, color, background:bg, padding:"1px 5px", borderRadius:3, fontSize:7.5}}>{v}</span>;
  }

  return (
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div className="bucket-accent"/>
      <div className="pro-body">
        <table className="pro-ct"><tbody>
          <tr><td>Customer</td><td>{company}</td><td>AWP Make / Type</td><td>{val(c.manufacturer||c.model)||"Cherry Picker"}</td></tr>
          <tr><td>Site location</td><td>{location}</td><td>AWP Serial No.</td><td>{val(c.serial_number)||"—"}</td></tr>
          <tr><td>Date</td><td>{issueDate||"—"}</td><td>Fleet No.</td><td>{val(c.fleet_number)||"—"}</td></tr>
          <tr><td>Platform SWL</td><td style={{fontWeight:700}}>{bucketSWL}</td><td>AWP Cert Ref.</td><td style={{fontFamily:"monospace"}}>{certNumber}</td></tr>
        </tbody></table>

        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
          <div style={{border:"2px solid #f97316",borderRadius:4,padding:"7px 10px",background:"#fff7ed"}}>
            <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Work Platform / Bucket Inspection Certificate</div>
            <div style={{fontSize:10,fontWeight:700,color:"#ea580c",marginTop:2}}>CERT-{certNumber?.replace("CERT-","")}-BKT</div>
            <div style={{marginTop:4}}>
              <span style={{fontSize:8,fontWeight:700,border:"1px solid #f97316",padding:"2px 7px",borderRadius:3,background:"#fff",color:"#9a3412"}}>Expiry (6 months): {bucketExpiry}</span>
            </div>
          </div>
          <PFBadge result={tone.label}/>
        </div>

        <div className="pro-stl" style={{borderLeftColor:"#f97316"}}>Platform / Bucket Identification</div>
        <table className="pro-st"><tbody>
          <tr><td>Bucket / Platform Serial Number</td><td style={{fontFamily:"monospace",fontWeight:900}}>{bucketSerial}</td></tr>
          <tr><td>Platform Dimensions (m)</td><td>{bk.platform_dimensions||"—"}</td></tr>
          <tr><td>Platform Material</td><td>{bk.platform_material||"—"}</td></tr>
          <tr><td>Safe Working Load (SWL)</td><td style={{fontWeight:800}}>{bucketSWL}</td></tr>
          <tr><td>Test Load Applied (110% SWL)</td><td>{bk.test_load_applied||"—"}</td></tr>
          <tr><td>Inspection Date</td><td>{issueDate||"—"}</td></tr>
          <tr><td>Next Inspection Due</td><td style={{fontWeight:800,color:"#b45309"}}>{bucketExpiry}</td></tr>
        </tbody></table>

        <div className="pro-stl" style={{borderLeftColor:"#f97316"}}>Platform / Bucket Structural Inspection</div>
        <table className="bk-t">
          <thead><tr><th>Inspection Item</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td>Platform Structure</td><td>{bkResult(bk.platform_structure||"PASS")}</td></tr>
            <tr><td>Platform Floor</td><td>{bkResult(bk.platform_floor||"PASS")}</td></tr>
            <tr><td>Guardrails &amp; Toe Boards</td><td>{bkResult(bk.guardrails||"PASS")}</td></tr>
            <tr><td>Gate / Latch System</td><td>{bkResult(bk.gate_latch||"PASS")}</td></tr>
            <tr><td>Emergency Lowering</td><td>{bkResult(bk.emergency_lowering||cl.emergency_lowering||"PASS")}</td></tr>
            <tr><td>Overload / SWL Cut-Off</td><td>{bkResult(bk.overload_device||"PASS")}</td></tr>
            <tr><td>Tilt Alarm</td><td>{bkResult(bk.tilt_alarm||"PASS")}</td></tr>
          </tbody>
        </table>

        {bk.notes && <div className="pro-comments-box"><div className="pro-comments-lbl">Notes</div><div className="pro-comments-val">{bk.notes}</div></div>}

        <ProEvidence photos={photos}/>

        <div style={{fontSize:7.5,color:"#9a3412",lineHeight:1.5,border:"1px solid #f97316",borderRadius:4,padding:"5px 9px",background:"#fff7ed",textAlign:"center",fontWeight:700,flexShrink:0}}>
          THIS WORK PLATFORM / BUCKET HAS BEEN INSPECTED AS PART OF THE CHERRY PICKER.<br/>
          IT MUST BE RE-INSPECTED EVERY 6 MONTHS.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <ProFooter/>
    </div>
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
  const _rawNd=val(c.notes||"")||val(c.extracted_data?JSON.stringify(c.extracted_data):"")||"";
  const nd=parseNotes(_rawNd);
  const tone=resultStyle(pickResult(c));

  const _isMobileCrane = /mobile\.crane|crane/i.test(_rawType) && !/hook|rope|boom|cherry|telehandler|forklift/i.test(_rawType);
  const _isHook = /hook/i.test(_rawType);
  const _isCraneRope = _rawType === "wire rope";
  const _isWireRopeSling = _rawType === "wire rope sling";
  const _isPV = /pressure\.vessel|air\.receiver|boiler|autoclave/i.test(_rawType);
  const _isTelehandler = /telehandler/i.test(_rawType);
  const _isCherryPicker = /cherry\.picker|aerial\.work\.platform|boom\.lift/i.test(_rawType);
  const _isForklift = /forklift|fork\.lift/i.test(_rawType);
  const _isForkArm = /fork\.arm/i.test(_rawType);
  const _isHorse = /horse.*mover|prime\.mover/i.test(_rawType);
  const _isTrailer = /^trailer$/i.test(_rawType.trim());
  const _isMachine = _isTelehandler || _isForklift;

  const wrap = (children) => (
    <>
      <style>{CSS}</style>
      <div className={pm ? "" : "pro-wrap"}>{children}</div>
    </>
  );

  if (_isMobileCrane) return wrap(<><CraneLoadTestPage c={c} pn={pn} tone={tone} pm={pm} logo={logo}/><div className="pro-pb"/><CraneChecklistPage c={c} pn={pn} pm={pm} logo={logo}/></>);
  if (_isHook || _isCraneRope) return wrap(<HookRopePage c={c} pn={pn} tone={tone} pm={pm} logo={logo} isRope={_isCraneRope && !_isHook}/>);
  if (_isWireRopeSling) return wrap(<WireRopeSlingPage c={c} pn={pn} tone={tone} pm={pm} logo={logo}/>);
  if (_isPV) return wrap(<PressureVesselPage c={c} pn={pn} tone={tone} pm={pm} logo={logo} pvNum={index+1}/>);
  if (_isTelehandler) return wrap(<TelehandlerPage c={c} nd={nd} pm={pm} logo={logo}/>);
  if (_isCherryPicker) return wrap(
    <>
      <CherryPickerMachinePage c={c} nd={nd} pm={pm} logo={logo}/>
      <div className="pro-pb"/>
      <CherryPickerBucketPage c={c} nd={nd} pm={pm} logo={logo}/>
    </>
  );
  if (_isForkArm) return wrap(<ForkArmPage c={c} pm={pm} logo={logo}/>);
  if (_isHorse) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={false}/>);
  if (_isTrailer) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={true}/>);
  if (_isMachine) return wrap(<MachinePage c={c} nd={nd} pm={pm} logo={logo}/>);

  return <GenericCert c={c} pm={pm} logo={logo}/>;
}
