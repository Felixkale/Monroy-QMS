"use client";

/* ── helpers ─────────────────────────────────────────────── */
function val(v){return v&&String(v).trim()!==""?String(v).trim():null;}
function formatDate(raw){if(!raw)return null;const d=new Date(raw);if(isNaN(d.getTime()))return raw;return d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}

function addMonths(dateStr, m) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().split("T")[0];
}

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

/* ── CSS (keep your full original CSS here) ─────────────────────────────────────────────────── */
const CSS=`
  @page { size: A4; margin: 0; }
  .cs-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:16px;display:flex;justify-content:center;flex-direction:column;align-items:center;gap:16px}
  .cs-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;page-break-after:always;break-after:page;}
  .cs-page.pm{box-shadow:none;width:100%}
  /* ... your full CSS continues here ... (keep everything you had) */
  .pro-pb{page-break-after:always;break-after:page;height:0;display:block;}
  @media print{
    @page{size:A4;margin:0}
    html,body{margin:0;padding:0}
    .cs-wrap,.pro-wrap{background:none!important;padding:0!important;border:none!important;gap:0!important;border-radius:0!important;display:block!important}
    .cs-page,.pro-page{box-shadow:none!important;width:210mm!important;height:297mm!important;overflow:hidden!important;page-break-after:always;break-after:page;margin:0!important}
    .pro-pb{page-break-after:always;break-after:page;height:0}
  }
`;

/* ── Shared Components (keep all your original ones: ProEvidence, Field, Section, ProHdr, ProFooter, ProCT, ProSig, CI, PFBadge, etc.) ── */
// ... Paste all your shared functions here exactly as they were in your original file ...

/* ══════════════════════════════════════════════════════════
   CHERRY PICKER / AWP CERTIFICATE — TWO PAGES (FINAL FIXED)
══════════════════════════════════════════════════════════ */
function CherryPickerPage({c, nd, pm, logo}) {
  const certNumber = val(c.certificate_number) || "—";
  const company = val(c.client_name) || "—";
  const location = val(c.location) || "—";
  const issueDate = formatDate(c.issue_date || c.issued_at);
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
  const bk = nd?.bucket || {};
  const cl = nd?.checklist || {};

  const bucketSerial = val(bk.serial_number) || 
                       (serialNo !== "—" ? `BUCKET-${serialNo}` : `BUCKET-${Date.now().toString().slice(-6)}`);

  const awpExpiry = formatDate(c.expiry_date);
  let bucketExpiry = "—";
  try {
    const issueD = c.issue_date || c.issued_at || new Date().toISOString().split("T")[0];
    const sixMonthsLater = addMonths(issueD, 6);
    bucketExpiry = formatDate(sixMonthsLater);
  } catch (e) {}

  function bkResult(val) {
    if (!val) return "—";
    const isPass = String(val).toUpperCase() === "PASS";
    const isBad = /fail|repair|required/i.test(String(val));
    const color = isBad ? "#b91c1c" : isPass ? "#15803d" : "#b45309";
    const bg = isBad ? "#fff5f5" : isPass ? "#f0fdf4" : "#fffbeb";
    return <span style={{fontWeight:800, color, background:bg, padding:"1px 5px", borderRadius:3, fontSize:7.5}}>{val}</span>;
  }

  return (
    <>
      {/* PAGE 1: Cherry Picker / AWP — 12 months */}
      <div className={`pro-page${pm ? " pm" : ""}`}>
        <ProHdr logoUrl={logo} />
        <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
        <div className="pro-body">
          <ProCT company={company} location={location} issueDate={issueDate} equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
            <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
              <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Load Test Certificate — Cherry Picker / AWP</div>
              <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>{certNumber}</div>
              {awpExpiry && <div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry: {awpExpiry} (12 months)</div>}
            </div>
            <PFBadge result={tone.label} />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,flexShrink:0}}>
            <div>
              <div className="pro-stl">Boom Specification</div>
              <table className="pro-st"><tbody>
                <tr><td>Max Working Height (m)</td><td style={{fontWeight:800}}>{bm.max_height||"—"}</td></tr>
                <tr><td>Actual Boom Length (m)</td><td>{bm.actual_boom_length||"—"}</td></tr>
                <tr><td>SWL at Test Config</td><td style={{fontWeight:800}}>{bm.swl_at_actual_config || swl || "—"}</td></tr>
                <tr style={{background:"#0b1d3a"}}><td style={{background:"#1e3a5f",color:"#4fc3f7",fontWeight:800}}>Test Load (110% SWL)</td><td style={{background:"#0b1d3a",color:"#fff",fontWeight:900}}>{bm.test_load||"—"}</td></tr>
              </tbody></table>
            </div>
            <div>
              <div className="pro-stl">Key Systems</div>
              <table className="pro-st"><tbody>
                <tr><td>Boom Structure</td><td>{r(bm.boom_structure||"PASS")}</td></tr>
                <tr><td>Hydraulics</td><td>{r(cl.hydraulics_result||"PASS")}</td></tr>
                <tr><td>LMI / Safety</td><td>{r(cl.lmi_result || bm.lmi_test || "PASS")}</td></tr>
              </tbody></table>
            </div>
          </div>

          <ProEvidence photos={photos}/>

          <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
            THIS AERIAL WORK PLATFORM HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.<br/>VALID FOR 12 MONTHS FROM ISSUE DATE.
          </div>
        </div>
        <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
        <ProFooter/>
      </div>

      <div className="pro-pb"/>

      {/* PAGE 2: Bucket / Platform — 6 months with Serial Number */}
      <div className={`pro-page${pm ? " pm" : ""}`}>
        <ProHdr logoUrl={logo} />
        <div style={{height:3,background:"linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa)",flexShrink:0}}/>
        <div className="pro-body">
          <ProCT company={company} location={location} issueDate={issueDate} equipMake="Bucket / Platform" serialNo={bucketSerial} fleetNo={fleetNo} swl={bk.platform_swl || swl}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,flexShrink:0}}>
            <div style={{border:"1px solid #1e3a5f",borderRadius:4,padding:"7px 10px",background:"#f4f8ff"}}>
              <div style={{fontSize:12,fontWeight:900,color:"#0b1d3a"}}>Bucket / Platform Inspection Certificate</div>
              <div style={{fontSize:10,fontWeight:700,color:"#0e7490",marginTop:2}}>Linked to AWP Cert: {certNumber}</div>
              {bucketExpiry && <div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:3,padding:"2px 7px",marginTop:4,fontSize:8,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry: {bucketExpiry} (6 months)</div>}
            </div>
            <PFBadge result={tone.label} />
          </div>

          <div className="pro-stl">Bucket / Platform Details</div>
          <table className="bk-t">
            <thead><tr><th>Item</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Platform Serial Number</td><td style={{fontFamily:"monospace",fontWeight:700}}>{bucketSerial}</td></tr>
              <tr><td>Platform SWL</td><td style={{fontWeight:800}}>{bk.platform_swl || swl || "—"}</td></tr>
              <tr><td>Dimensions (m)</td><td>{bk.platform_dimensions || "—"}</td></tr>
              <tr><td>Material</td><td>{bk.platform_material || "—"}</td></tr>
            </tbody>
          </table>

          <div className="pro-stl">Inspection Results</div>
          <table className="bk-t">
            <thead><tr><th>Inspection Item</th><th>Result</th></tr></thead>
            <tbody>
              <tr><td>Platform Structure</td><td>{bkResult(bk.platform_structure || "PASS")}</td></tr>
              <tr><td>Platform Floor</td><td>{bkResult(bk.platform_floor || "PASS")}</td></tr>
              <tr><td>Guardrails &amp; Toe Boards</td><td>{bkResult(bk.guardrails || "PASS")}</td></tr>
              <tr><td>Gate / Latch System</td><td>{bkResult(bk.gate_latch || "PASS")}</td></tr>
              <tr><td>Emergency Lowering</td><td>{bkResult(bk.emergency_lowering || cl.emergency_lowering || "PASS")}</td></tr>
              <tr><td>Overload / SWL Cut-Off</td><td>{bkResult(bk.overload_device || "PASS")}</td></tr>
              <tr><td>Tilt Alarm</td><td>{bkResult(bk.tilt_alarm || "PASS")}</td></tr>
            </tbody>
          </table>

          {bk.notes && <div style={{marginTop:8,padding:"6px 10px",background:"#f4f8ff",border:"1px solid #c3d4e8",borderRadius:4,fontSize:7.5}}><strong>Notes:</strong> {bk.notes}</div>}

          {defects && <div className="pro-red-box"><div className="pro-red-lbl">Defects Found</div><div className="pro-red-val">{defects}</div></div>}

          <ProEvidence photos={photos}/>

          <div style={{fontSize:7.5,color:"#4b5563",lineHeight:1.5,border:"1px solid #1e3a5f",borderRadius:4,padding:"5px 9px",background:"#f4f8ff",textAlign:"center",fontWeight:700,flexShrink:0}}>
            THIS BUCKET / PLATFORM HAS BEEN INSPECTED AS PART OF THE CHERRY PICKER.<br/>
            IT MUST BE RE-INSPECTED EVERY 6 MONTHS.
          </div>
        </div>
        <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
        <ProFooter/>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT — DEFAULT EXPORT (FIXED)
══════════════════════════════════════════════════════════ */
export default function CertificateSheet({certificate: c, index = 0, total = 1, printMode = false}) {
  if (!c) return null;

  const equipType = val(c.equipment_type || c.asset_type) || "";
  const _rawType = String(equipType).toLowerCase();
  const logo = c.logo_url || "/logo.png";
  const pm = printMode;

  const pn = parseNotes(val(c.notes || "") || "");
  const _rawNd = val(c.notes || "") || (c.extracted_data ? JSON.stringify(c.extracted_data) : "") || "";
  const nd = parseNotes(_rawNd);
  const tone = resultStyle(pickResult(c));

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
  const _isMachine = _isTelehandler || _isCherryPicker || _isForklift;

  const wrap = (children) => (
    <>
      <style>{CSS}</style>
      <div className={pm ? "" : "pro-wrap"}>{children}</div>
    </>
  );

  if (_isMobileCrane) return wrap(<><CraneLoadTestPage c={c} pn={pn} tone={tone} pm={pm} logo={logo} /><div className="pro-pb"/><CraneChecklistPage c={c} pn={pn} pm={pm} logo={logo} /></>);
  if (_isHook || _isCraneRope) return wrap(<HookRopePage c={c} pn={pn} tone={tone} pm={pm} logo={logo} isRope={_isCraneRope && !_isHook} />);
  if (_isWireRopeSling) return wrap(<WireRopeSlingPage c={c} pn={pn} tone={tone} pm={pm} logo={logo} />);
  if (_isPV) return wrap(<PressureVesselPage c={c} pn={pn} tone={tone} pm={pm} logo={logo} pvNum={index + 1} />);
  if (_isTelehandler) return wrap(<TelehandlerPage c={c} nd={nd} pm={pm} logo={logo} />);
  if (_isCherryPicker) return wrap(<CherryPickerPage c={c} nd={nd} pm={pm} logo={logo} />);
  if (_isForkArm) return wrap(<ForkArmPage c={c} pm={pm} logo={logo} />);
  if (_isHorse) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={false} />);
  if (_isTrailer) return wrap(<HorseTrailerPage c={c} pm={pm} logo={logo} isTrailer={true} />);
  if (_isMachine) return wrap(<MachinePage c={c} nd={nd} pm={pm} logo={logo} />);

  return <GenericCert c={c} pm={pm} logo={logo} />;
}
