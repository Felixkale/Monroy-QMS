/* ══════════════════════════════════════════════════════════
   CHERRY PICKER / AWP CERTIFICATE — TWO PAGES (FINAL SAFE VERSION)
   Page 1: Cherry Picker / AWP (1 year)
   Page 2: Bucket / Platform (6 months + serial number)
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

  // Bucket serial number section
  const bucketSerial = val(bk.serial_number) || 
                       (serialNo !== "—" ? `BUCKET-${serialNo}` : `BUCKET-${Date.now().toString().slice(-6)}`);

  // Expiry dates
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

      {/* PAGE 2: Bucket / Platform — 6 months + Serial Number */}
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
