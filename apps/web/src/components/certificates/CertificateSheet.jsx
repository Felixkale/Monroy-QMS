// src/components/certificates/CertificateSheet.jsx
"use client";

function val(v) { return v && String(v).trim() !== "" ? String(v).trim() : null; }
function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function parseNotes(str) {
  if (!str) return {};
  const obj = {};
  str.split("|").forEach(part => {
    const idx = part.indexOf(":");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) obj[k] = v;
  });
  return obj;
}
function pickResult(c) { return (c?.result || c?.equipment_status || "").toUpperCase(); }
function resultStyle(r) {
  if (r === "PASS")           return { color:"#15803d", bg:"#dcfce7", brd:"#86efac", label:"PASS" };
  if (r === "FAIL")           return { color:"#b91c1c", bg:"#fee2e2", brd:"#fca5a5", label:"FAIL" };
  if (r === "REPAIR_REQUIRED")return { color:"#b45309", bg:"#fef3c7", brd:"#fcd34d", label:"Repair Required" };
  if (r === "CONDITIONAL")    return { color:"#b45309", bg:"#fef3c7", brd:"#fcd34d", label:"Conditional" };
  if (r === "OUT_OF_SERVICE") return { color:"#7f1d1d", bg:"#fee2e2", brd:"#fca5a5", label:"Out of Service" };
  return { color:"#374151", bg:"#f3f4f6", brd:"#d1d5db", label:r || "Unknown" };
}
function detectFail(defects, ...kws) {
  if (!defects) return "PASS";
  const d = defects.toLowerCase();
  return kws.some(k => d.includes(k.toLowerCase())) ? "FAIL" : "PASS";
}

const CSS = `
  .cs-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;display:flex;justify-content:center;flex-direction:column;align-items:center;gap:20px}
  .cs-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden}
  .cs-page.pm{box-shadow:none;width:100%;height:297mm}
  .cs-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .cs-geo{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .cs-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:120px}
  .cs-logo-box{background:#fff;width:140px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:14px;position:relative}
  .cs-logo-box::after{content:'';position:absolute;right:-24px;top:0;width:0;height:0;border-top:60px solid #fff;border-bottom:60px solid #fff;border-right:24px solid transparent}
  .cs-logo-box img{width:108px;height:108px;object-fit:contain}
  .cs-hdr-text{flex:1;padding:20px 20px 20px 44px;display:flex;flex-direction:column;justify-content:center}
  .cs-brand{font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:5px}
  .cs-title{font-size:21px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.1;margin-bottom:6px}
  .cs-sub{font-size:10px;color:rgba(255,255,255,0.50);font-weight:500}
  .cs-hdr-right{padding:20px 22px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:10px;flex-shrink:0}
  .cs-badge{font-size:11px;font-weight:900;padding:6px 16px;border-radius:99px;letter-spacing:.10em;text-transform:uppercase}
  .cs-certno{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:rgba(255,255,255,0.50)}
  .cs-accent{height:4px;background:linear-gradient(90deg,#22d3ee 0%,#3b82f6 55%,#a78bfa 100%);flex-shrink:0}
  .cs-body{flex:1;padding:14px 22px 0;display:flex;flex-direction:column;gap:8px;overflow:hidden}
  .cs-sec{border:1px solid #1e3a5f;border-radius:7px;overflow:hidden}
  .cs-sec-ttl{background:#0b1d3a;border-bottom:1px solid #22d3ee;padding:6px 12px;font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;display:flex;align-items:center;gap:8px}
  .cs-sec-ttl::before{content:'';width:3px;height:10px;background:#22d3ee;border-radius:2px;flex-shrink:0}
  .cs-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr))}
  .cs-field{padding:8px 12px;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;background:#f4f8ff}
  .cs-field:nth-child(odd){background:#eef4ff}
  .cs-field:last-child{border-right:none}
  .cs-fl{font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .cs-fv{font-size:11.5px;font-weight:600;color:#0b1d3a;line-height:1.3;word-break:break-word}
  .cs-fv.mono{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#0e7490}
  .cs-fv.large{font-size:13px;font-weight:900;color:#0b1d3a}
  .cs-remarks{font-size:11px;color:#334155;line-height:1.65;padding:9px 12px;background:#f4f8ff}
  .cs-sig-wrap{padding:0 22px 10px;flex-shrink:0}
  .cs-sig-card{background:#0b1d3a;border-radius:8px;padding:14px 16px}
  .cs-sig-card-title{font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .cs-sig-card-title::before{content:'';width:3px;height:10px;background:#22d3ee;border-radius:2px}
  .cs-sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .cs-sig-label{font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4fc3f7;margin-bottom:6px}
  .cs-sig-name{font-size:10px;color:#fff;font-weight:600;margin-top:6px}
  .cs-sig-role{font-size:8.5px;color:rgba(255,255,255,0.50);margin-top:1px}
  .cs-sig-img-wrap{background:#fff;border-radius:6px;min-height:64px;display:flex;align-items:flex-end;padding:6px 10px 4px;margin-bottom:6px}
  .cs-legal{padding:10px 22px 10px;flex-shrink:0}
  .cs-legal-box{border:1px solid #1e3a5f;border-radius:6px;padding:8px 12px;font-size:8.5px;color:#4b5563;line-height:1.55}
  .cs-services{background:#c41e3a;padding:6px 22px;flex-shrink:0}
  .cs-services p{font-size:7.5px;color:#fff;margin:0;line-height:1.5;text-align:center;font-weight:600;letter-spacing:0.02em}
  .cs-footer{background:#0b1d3a;border-top:2px solid #22d3ee;padding:5px 22px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .cs-footer span{font-size:8px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:.05em}
  /* PROFESSIONAL FORMAT */
  .pro-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:20px;align-items:center}
  .pro-page{background:#fff;width:210mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28)}
  .pro-page.pm{box-shadow:none;width:100%;height:297mm}
  .pro-hdr{background:#0b1d3a;display:flex;align-items:center;min-height:88px}
  .pro-logo-box{background:#fff;width:120px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:10px;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)}
  .pro-logo-box img{width:95px;height:72px;object-fit:contain}
  .pro-hdr-txt{flex:1;padding:12px 12px 12px 32px}
  .pro-hdr-brand{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:3px;font-weight:800}
  .pro-hdr-name{font-size:13px;font-weight:900;color:#fff}
  .pro-hdr-svc{font-size:7px;color:rgba(255,255,255,0.4);margin-top:4px;line-height:1.5}
  .pro-hdr-contact{padding:10px 14px;display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
  .pro-cr{font-size:8px;color:rgba(255,255,255,0.65)}
  .pro-body{flex:1;padding:10px 14px;display:flex;flex-direction:column;gap:7px;overflow:hidden}
  .pro-ct{width:100%;border-collapse:collapse;font-size:9px;border:1px solid #1e3a5f}
  .pro-ct td{padding:3.5px 7px;border:1px solid #c3d4e8}
  .pro-ct td:first-child,.pro-ct td:nth-child(3){font-weight:700;background:#0b1d3a;color:#4fc3f7;width:85px;white-space:nowrap}
  .pro-ct td:nth-child(2),.pro-ct td:nth-child(4){background:#f4f8ff;font-weight:600;color:#0b1d3a}
  .pro-cb{display:flex;align-items:center;border:1px solid #1e3a5f;border-radius:5px;overflow:hidden;margin-bottom:3px}
  .pro-cb-lbl{background:#0b1d3a;color:#4fc3f7;font-size:10px;font-weight:800;padding:7px 12px;flex:1}
  .pro-cb-yes{background:#eef4ff;color:#0b1d3a;font-size:10px;font-weight:800;padding:7px 12px;width:46px;text-align:center}
  .pro-cb-num{background:#f4f8ff;color:#0e7490;font-size:9px;font-weight:700;padding:7px 12px;font-family:monospace;flex:1}
  .pro-pass{background:#dcfce7;color:#15803d;font-size:10px;font-weight:900;padding:7px 12px;border-left:1px solid #86efac}
  .pro-fail{background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:900;padding:7px 12px;border-left:1px solid #fca5a5}
  .pro-lt{width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f}
  .pro-lt th{background:#0b1d3a;color:#4fc3f7;padding:4px 5px;text-align:center;border:1px solid #1e3a5f;font-size:7.5px;font-weight:700}
  .pro-lt td{padding:3.5px 5px;border:1px solid #c3d4e8;text-align:center;font-weight:600;font-size:8.5px}
  .pro-lt td:first-child{text-align:left;background:#eef4ff;font-weight:700;color:#0b1d3a}
  .pro-lt tr:nth-child(even) td:not(:first-child){background:#f8faff}
  .pro-lt tr:nth-child(odd) td:not(:first-child){background:#fff}
  .pro-st{width:100%;border-collapse:collapse;font-size:9px;border:1px solid #1e3a5f}
  .pro-st td{padding:4px 8px;border:1px solid #c3d4e8}
  .pro-st td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a;width:220px}
  .pro-st td:nth-child(2){background:#fff;color:#0b1d3a;font-weight:600}
  .pro-stl{font-size:8.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#0b1d3a;margin:6px 0 3px;padding-left:4px;border-left:3px solid #22d3ee}
  .pro-mhdr{display:flex;align-items:center;justify-content:space-between;border:1px solid #1e3a5f;border-radius:5px;padding:9px 12px;background:#f4f8ff;margin-bottom:6px}
  .pro-mt{font-size:13px;font-weight:900;color:#0b1d3a}
  .pro-ms{font-size:7.5px;color:#64748b;margin-top:2px}
  .pro-mf{display:flex;flex-direction:column;gap:3px;font-size:9px;font-weight:700;color:#0b1d3a}
  .pro-mfr{display:flex;align-items:center;gap:7px}
  .pro-cg{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #1e3a5f;border-radius:5px;overflow:hidden}
  .pro-cc{border-right:1px solid #1e3a5f}
  .pro-cc:last-child{border-right:none}
  .pro-csec{background:#0b1d3a;color:#4fc3f7;font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;border-bottom:1px solid #22d3ee}
  .pro-cr2{display:flex;align-items:center;justify-content:space-between;padding:2.5px 9px;border-bottom:1px solid #e8f0fb;font-size:8px}
  .pro-cr2:last-child{border-bottom:none}
  .pro-cr2:nth-child(even){background:#f8faff}
  .pro-cl{color:#0b1d3a;font-weight:500;flex:1}
  .pro-pp{display:flex;gap:5px;flex-shrink:0}
  .pro-p{color:#15803d;font-weight:800;font-size:8.5px;width:14px;text-align:center}
  .pro-f{color:#b91c1c;font-weight:800;font-size:8.5px;width:14px;text-align:center}
  .pro-na{color:#9ca3af;font-size:7.5px;width:14px;text-align:center}
  .pro-hrt{width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f}
  .pro-hrt th{background:#0b1d3a;color:#4fc3f7;padding:4px 7px;text-align:center;border:1px solid #1e3a5f;font-weight:700;font-size:7.5px}
  .pro-hrt th:first-child{text-align:left}
  .pro-hrt td{padding:3.5px 7px;border:1px solid #c3d4e8;font-weight:500}
  .pro-hrt td:first-child{font-weight:700;background:#eef4ff;color:#0b1d3a}
  .pro-hrt td:not(:first-child){background:#fff;text-align:center;font-weight:600}
  .pro-compbox{border:2px solid #1e3a5f;border-radius:7px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;background:#f4f8ff}
  .pro-sig{padding:14px 14px 8px;flex-shrink:0;margin-top:auto}
  .pro-sigg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .pro-sgl{font-size:7.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .pro-sgl2{font-size:7.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .pro-sgline{border-bottom:1px solid #1e3a5f;min-height:44px;display:flex;align-items:flex-end;padding-bottom:3px;margin-bottom:3px}
  .pro-sgname{font-size:9px;font-weight:700;color:#0b1d3a}
  .pro-sgrole{font-size:8px;color:#64748b}
  .pro-foot{background:#0b1d3a;border-top:2px solid #22d3ee;padding:4px 14px;display:flex;justify-content:space-between;flex-shrink:0}
  .pro-foot span{font-size:7.5px;color:rgba(255,255,255,0.35);font-weight:600}
  .pro-pb{break-after:page;page-break-after:always}
  @media print{
    .cs-wrap,.pro-wrap{background:none!important;padding:0!important;border:none!important}
    .cs-page,.pro-page{box-shadow:none!important;width:100%!important;height:297mm!important}
    .pro-pb{break-after:page;page-break-after:always}
  }
`;

function Field({ label, value, mono=false, large=false, full=false }) {
  if (!value) return null;
  return (
    <div className="cs-field" style={full?{gridColumn:"1/-1"}:{}}>
      <div className="cs-fl">{label}</div>
      <div className={`cs-fv${mono?" mono":""}${large?" large":""}`}>{value}</div>
    </div>
  );
}
function Section({ title, children }) {
  const kids = Array.isArray(children)?children.filter(Boolean):[children].filter(Boolean);
  if(!kids.length) return null;
  return (
    <div className="cs-sec">
      <div className="cs-sec-ttl">{title}</div>
      <div className="cs-fields">{kids}</div>
    </div>
  );
}

function ProHdr({ logoUrl }) {
  return (
    <div className="pro-hdr">
      <div className="pro-logo-box">
        <img src={logoUrl} alt="Monroy" onError={e=>e.target.style.display="none"}/>
      </div>
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

function ProCT({ company, location, issueDate, equipMake, serialNo, fleetNo, swl }) {
  return (
    <table className="pro-ct"><tbody>
      <tr><td>Customer</td><td>{company||"—"}</td><td>Make of Crane</td><td>{equipMake||"—"}</td></tr>
      <tr><td>Site location</td><td>{location||"—"}</td><td>Serial number</td><td>{serialNo||"—"}</td></tr>
      <tr><td>Date</td><td>{issueDate||"—"}</td><td>Fleet number</td><td>{fleetNo||"—"}</td></tr>
      <tr><td></td><td></td><td>Capacity</td><td>{swl||"—"}</td></tr>
    </tbody></table>
  );
}

function ProSig({ inspName, inspId, sigUrl }) {
  return (
    <div className="pro-sig">
      <div className="pro-sigg">
        <div>
          <div className="pro-sgl">Competent Person / Inspector</div>
          <div className="pro-sgline">
            <img src={sigUrl} alt="sig" style={{maxHeight:42,maxWidth:110,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
          </div>
          <div className="pro-sgname">{inspName||"Moemedi Masupe"}</div>
          <div className="pro-sgrole">Inspector ID: {inspId||"700117910"}</div>
        </div>
        <div>
          <div className="pro-sgl">Client / User / Owner</div>
          <div className="pro-sgline"/>
          <div className="pro-sgname" style={{minHeight:14}}></div>
          <div className="pro-sgrole">Client representative sign here</div>
        </div>
      </div>
    </div>
  );
}

function CI({ label, result="PASS", na=false }) {
  return (
    <div className="pro-cr2">
      <span className="pro-cl">{label}</span>
      <div className="pro-pp">
        {na
          ? <span className="pro-na">N/A</span>
          : <>
              <span className="pro-p">{result==="PASS"?"✓":""}</span>
              <span className="pro-f">{(result==="FAIL"||result==="REPAIR_REQUIRED")?"✗":""}</span>
            </>
        }
      </div>
    </div>
  );
}

function CraneLoadTestPage({ c, pn, tone, pm, logo }) {
  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name||c.company)||"—";
  const location   = val(c.location)||"—";
  const issueDate  = formatDate(c.issue_date||c.issued_at);
  const equipMake  = val(c.manufacturer||c.model||c.equipment_type);
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const defects    = val(c.defects_found);
  const recommendations = val(c.recommendations);
  const inspName   = val(c.inspector_name)||"Moemedi Masupe";
  const inspId     = val(c.inspector_id)||"700117910";

  const C1 = { boom:pn["C1 boom"]||"", angle:pn["C1 angle"]||"", radius:pn["C1 radius"]||"", rated:pn["C1 rated"]||"", test:"" };
  const C2 = { boom:pn["C2 boom"]||"", angle:pn["C2 angle"]||"", radius:pn["C2 radius"]||"", rated:pn["C2 rated"]||"", test:pn["C2 test"]||pn["Crane test load"]||"" };
  const C3 = { boom:pn["C3 boom"]||"", angle:pn["C3 angle"]||"", radius:pn["C3 radius"]||"", rated:pn["C3 rated"]||"", test:"" };

  const sliRes   = pn["Computer"]||pn["SLI"]||"PASS";
  const opCode   = pn["Operating code"]||"MAIN/AUX-FULL OUTRIGGER-360DEG";
  const ctrWts   = pn["Counterweights"]||"STD FITTED";
  const jib      = pn["Jib"]||"";

  return (
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate}
          equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>

        <div style={{marginTop:6}}>
          <div className="pro-cb">
            <div className="pro-cb-lbl">SLI Certificate</div>
            <div className="pro-cb-yes">YES</div>
            <div className="pro-cb-num">{certNumber}</div>
            <div className={tone.label==="PASS"?"pro-pass":"pro-fail"}>{tone.label}</div>
            <div style={{flex:1,padding:"7px 10px",fontSize:9,color:"#94a3b8",textAlign:"right"}}>Fail</div>
          </div>
          <div className="pro-cb">
            <div className="pro-cb-lbl">Load Test Certificate</div>
            <div className="pro-cb-yes">YES</div>
            <div className="pro-cb-num" style={{fontWeight:900,color:"#0b1d3a",fontSize:11}}>
              {certNumber?.replace("CERT-","SLI ")}
            </div>
          </div>
        </div>

        <div className="pro-stl">Details of Applied Load</div>
        <table className="pro-lt">
          <thead>
            <tr>
              <th rowSpan={2} style={{textAlign:"left",width:150}}>Details of Applied Load</th>
              <th colSpan={2}>1 — Main (Short Boom)</th>
              <th colSpan={2}>2 — Main (Test Config)</th>
              <th colSpan={2}>3 — Aux / Max Boom</th>
            </tr>
            <tr>
              <th>Actual</th><th>SLI Indicate</th>
              <th>Actual</th><th>SLI Indicate</th>
              <th>Actual</th><th>SLI Indicate</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Boom Length Reading</td><td>{C1.boom}</td><td>{C1.boom}</td><td>{C2.boom}</td><td>{C2.boom}</td><td>{C3.boom}</td><td>{C3.boom}</td></tr>
            <tr><td>Boom Angle Reading</td><td>{C1.angle}</td><td>{C1.angle}</td><td>{C2.angle}</td><td>{C2.angle}</td><td>{C3.angle}</td><td>{C3.angle}</td></tr>
            <tr><td>Radius Reading</td><td>{C1.radius}</td><td>{C1.radius}</td><td>{C2.radius}</td><td>{C2.radius}</td><td>{C3.radius}</td><td>{C3.radius}</td></tr>
            <tr><td>Rated Load (SWL)</td><td>{C1.rated}</td><td>{C1.rated}</td><td>{C2.rated}</td><td>{C2.rated}</td><td>{C3.rated}</td><td>{C3.rated}</td></tr>
            <tr><td style={{fontWeight:900}}>Test Load Applied</td><td style={{fontWeight:800}}>{C1.test}</td><td style={{fontWeight:800}}>{C1.test}</td><td style={{fontWeight:800,color:"#0b1d3a"}}>{C2.test}</td><td style={{fontWeight:800}}>{C2.test}</td><td style={{fontWeight:800}}>{C3.test}</td><td style={{fontWeight:800}}>{C3.test}</td></tr>
          </tbody>
        </table>

        <div className="pro-stl">SLI / Load Management Indicator Details</div>
        <table className="pro-st"><tbody>
          {jib&&<tr><td>Jib Configuration</td><td>{jib}</td></tr>}
          <tr><td>Operating Code used for testing</td><td>{opCode}</td></tr>
          <tr><td>Counter weights during test</td><td>{ctrWts}</td></tr>
          <tr><td>SLI cut off system — Hoist up</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
          <tr><td>SLI cut off system — Tele out</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
          <tr><td>SLI cut out system — Boom down</td><td>{sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
        </tbody></table>

        {(defects||recommendations)&&(
          <>
            <div className="pro-stl">Comments &amp; Recommendations</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:5,padding:"7px 11px",fontSize:9,color:"#0b1d3a",lineHeight:1.6,background:"#f4f8ff"}}>
              {defects&&<div><strong>Defects:</strong> {defects}</div>}
              {recommendations&&<div><strong>Recommendations:</strong> {recommendations}</div>}
            </div>
          </>
        )}

        <div style={{fontSize:8,color:"#4b5563",lineHeight:1.55,border:"1px solid #1e3a5f",borderRadius:5,padding:"7px 11px",background:"#f4f8ff",marginTop:4,textAlign:"center",fontWeight:700}}>
          THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE'S LOAD CHART AND TESTED CORRECTLY TO ORIGINAL MANUFACTURERS SPECIFICATIONS.
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <div className="pro-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </div>
  );
}

function CraneChecklistPage({ c, pn, pm, logo }) {
  const company    = val(c.client_name||c.company)||"—";
  const location   = val(c.location)||"—";
  const issueDate  = formatDate(c.issue_date||c.issued_at);
  const expiryDate = formatDate(c.expiry_date);
  const equipMake  = val(c.manufacturer||c.model||c.equipment_type);
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const defects    = val(c.defects_found)||"";
  const inspName   = val(c.inspector_name)||"Moemedi Masupe";
  const inspId     = val(c.inspector_id)||"700117910";

  const structural = pn["Structural"]||"PASS";
  const boom       = pn["Boom"]||"PASS";
  const outriggers = pn["Outriggers"]||"PASS";
  const computer   = pn["Computer"]||"PASS";
  const lmi        = pn["LMI"]||computer;
  const oilLeaks   = detectFail(defects,"oil leak","oil leaks","leak");
  const tires      = detectFail(defects,"tire","tyre");
  const brakes     = detectFail(defects,"brake");
  const hoist      = detectFail(defects,"hoist");
  const teleCyl    = detectFail(defects,"tele cylinder","cylinder");
  const boomCyl    = detectFail(defects,"boom cylinder","lift cylinder");
  const mcirNo     = "MCIR "+(c.inspection_number||c.certificate_number?.replace("CERT-CR","")||"1993");

  return (
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate}
          equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>

        <div className="pro-mhdr">
          <div>
            <div className="pro-mt">Mobile Cranes Inspection Report: {mcirNo}</div>
            <div className="pro-ms">Inspected with regards to the MQWMR Act CAP 44:02 Under Regulations 2</div>
            {expiryDate&&<div style={{fontSize:10,fontWeight:700,color:"#0b1d3a",marginTop:4}}>Validity: {expiryDate}</div>}
          </div>
          <div className="pro-mf">
            <div className="pro-mfr"><span>Annually:</span><span style={{fontSize:13}}>&#10003;</span></div>
            <div className="pro-mfr"><span>Bi-annually:</span><span></span></div>
            <div className="pro-mfr"><span>Quarterly:</span><span></span></div>
          </div>
        </div>

        <div className="pro-cg">
          <div className="pro-cc">
            <div className="pro-csec">Cab Condition</div>
            <CI label="Windows" result="PASS"/>
            <CI label="Control Levers Marked" result="PASS"/>
            <CI label="Control Lever return to neutral" result="PASS"/>
            <CI label="Level Gauges Correct" result="PASS"/>
            <CI label="Reverse Warning" result="PASS"/>
            <CI label="Load Charts Available" result="PASS"/>
            <CI label="Horn Warning" result="PASS"/>
            <CI label="Lights, Rotating Lights" result="PASS"/>
            <CI label="Tires" result={tires}/>
            <CI label="Crane Brakes" result={brakes}/>
            <CI label="Fire Extinguisher" result="PASS"/>
            <CI label="Beacon Lights" result="PASS"/>
            <CI label="SWL Correctly Indicated" result="PASS"/>
            <CI label="Oil Leaks" result={oilLeaks}/>
            <CI label="Operator Seat Condition" result="PASS"/>
            <div className="pro-csec">Safe Load Indicator</div>
            <CI label="Override Key Safe" result={computer}/>
            <CI label="Load Reading" result={computer}/>
            <CI label="A2B System Working" result={computer}/>
            <CI label="Cut Off System Working" result={computer}/>
            <CI label="Radius Reading" result={computer}/>
            <CI label="Boom Length Reading" result={computer}/>
            <CI label="Boom Angle Reading" result={computer}/>
          </div>
          <div className="pro-cc">
            <div className="pro-csec">Crane Superstructure</div>
            <CI label="Outrigger Beams (Visual)" result={outriggers}/>
            <CI label="Outrigger Jacks (Visual)" result={outriggers}/>
            <CI label="Fly-Jib Condition (Visual)" result={boom}/>
            <CI label="Outrigger Pads Condition" result={outriggers}/>
            <CI label="Outrigger Boxes (Cracks)" result={outriggers}/>
            <CI label="Hoist Drum Condition" result={hoist}/>
            <CI label="Hoist Brake Condition" result={hoist}/>
            <CI label="Hoist Drum Mounting" result="PASS"/>
            <CI label="Leaks on Hoist Drum" result={oilLeaks}/>
            <CI label="Top Head Sheaves" result="PASS"/>
            <CI label="Bottom Head Sheaves" result="PASS"/>
            <CI label="Boom Retract Ropes Visible" na/>
            <CI label="Boom Retract Sheaves" na/>
            <CI label="Slew Bearing Checked" result="PASS"/>
            <CI label="Slew Brake Checked" result="PASS"/>
            <CI label="Boom Lock Pins Checked" result={boom}/>
            <CI label="Boom Pivot Point Checked" result={boom}/>
            <CI label="Control Valve Checked" result="PASS"/>
            <CI label="Tele Cylinders — Leaks" result={teleCyl}/>
            <CI label="Tele Cylinders Holding under load" result={teleCyl}/>
            <CI label="Tele Sections — Damage" result={structural}/>
            <CI label="Tele's checked for bending" result={boom}/>
            <CI label="Boom Lift Cylinder (leaks)" result={boomCyl}/>
            <CI label="Boom Cylinder Mounting Points" result={boom}/>
            <CI label="Boom Cylinder holding under load" result={boom}/>
            <CI label="Counterweights" result="PASS"/>
          </div>
        </div>
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <div className="pro-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </div>
  );
}

function HookRopePage({ c, pn, tone, pm, logo, isRope }) {
  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name||c.company)||"—";
  const location   = val(c.location)||"—";
  const issueDate  = formatDate(c.issue_date||c.issued_at);
  const expiryDate = formatDate(c.expiry_date);
  const equipMake  = val(c.manufacturer||c.model||c.equipment_type);
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const defects    = val(c.defects_found);
  const inspName   = val(c.inspector_name)||"Moemedi Masupe";
  const inspId     = val(c.inspector_id)||"700117910";

  const latch      = pn["Latch"]||"PASS";
  const structural = pn["Structural"]||"PASS";
  const wear       = pn["Wear"];
  const brokenW    = pn["Broken wires"]||"none";
  const corrosion  = pn["Corrosion"]||"none";
  const kinks      = pn["Kinks"]||"none";
  const ropeDia    = val(c.capacity_volume)||"—";
  const reportNo   = certNumber?.replace("CERT-","HR ")||"HR 0001";

  return (
    <div className={`pro-page${pm?" pm":""}`}>
      <ProHdr logoUrl={logo}/>
      <div className="pro-body">
        <ProCT company={company} location={location} issueDate={issueDate}
          equipMake={equipMake} serialNo={serialNo} fleetNo={fleetNo} swl={swl}/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}}>
          <div style={{border:"1px solid #1e3a5f",borderRadius:5,padding:"9px 12px",background:"#f4f8ff"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#0b1d3a"}}>{isRope?"Wire Rope Inspection Report":"Hook &amp; Rope Inspection Report"}</div>
            <div style={{fontSize:11,fontWeight:700,color:"#0e7490",marginTop:3}}>{reportNo}</div>
            {expiryDate&&<div style={{display:"inline-block",border:"1px solid #1e3a5f",borderRadius:4,padding:"3px 9px",marginTop:7,fontSize:9,fontWeight:700,color:"#0b1d3a",background:"#fff"}}>Expiry date: {expiryDate}</div>}
          </div>
          <div className="pro-compbox">
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"#0b1d3a"}}>Compliance Certificate</div>
              <div style={{fontSize:9,color:"#64748b"}}>to be issued</div>
            </div>
            <div style={{fontSize:28,color:tone.label==="PASS"?"#15803d":"#b91c1c",fontWeight:900}}>{tone.label==="PASS"?"✓":"✗"}</div>
          </div>
        </div>

        <div className="pro-stl">Hoist Drum &amp; Rope Condition</div>
        <table className="pro-hrt"><thead><tr><th>Item</th><th>Main Hoist</th><th>Auxiliary Hoist</th></tr></thead>
          <tbody>
            <tr><td>Hoist Drum Condition</td><td>Good</td><td>Good</td></tr>
            <tr><td>Hoist Rope Lay on Drum</td><td>Good</td><td>Good</td></tr>
          </tbody>
        </table>

        <div className="pro-stl">Steel Wire Rope Inspection</div>
        <table className="pro-hrt">
          <thead><tr><th style={{textAlign:"left"}}>Inspection Item</th><th>Main</th><th>Aux</th><th>Inspection Item</th><th>Main</th><th>Aux</th></tr></thead>
          <tbody>
            <tr><td>Rope Diameter (mm)</td><td>{ropeDia?.replace(/[^\d.]/g,"")||"—"}</td><td>—</td><td>Rope length (3x windings)</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Reduction in rope Dia. (max 10%)</td><td>none</td><td>none</td><td>Core Protrusion</td><td>None</td><td>None</td></tr>
            <tr><td>Corrosion</td><td>{corrosion}</td><td>{corrosion}</td><td>Broken wires</td><td>{brokenW}</td><td>{brokenW}</td></tr>
            <tr><td>Rope kinks / deforming</td><td>{kinks}</td><td>{kinks}</td><td>Other defects</td><td>none</td><td>none</td></tr>
            <tr><td>Cond of end fitting / attachments</td><td>Good</td><td>Good</td><td>Serviceability of main hoist rope</td><td>Good</td><td>Good</td></tr>
            <tr><td>Damaged strands</td><td>none</td><td>none</td><td>Hoist lower limit cut off</td><td>Yes</td><td>Yes</td></tr>
          </tbody>
        </table>

        {!isRope&&(
          <>
            <div className="pro-stl">Hook Inspection Criteria</div>
            <table className="pro-hrt">
              <thead><tr><th style={{textAlign:"left",width:"40%"}}>Hook inspection criteria</th><th colSpan={2}>Hook 1 (Main)</th><th colSpan={2}>Hook 2 (Aux)</th><th colSpan={2}>Hook 3</th></tr></thead>
              <tbody>
                <tr><td>Hook block SWL</td><td colSpan={2}>{swl||"—"}</td><td colSpan={2}>—</td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>SWL marked on hook</td><td style={{color:"#15803d",fontWeight:800}}>Yes</td><td></td><td style={{color:"#15803d",fontWeight:800}}>Yes</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>Safety catch fitted &amp; in good condition</td><td style={{color:latch==="PASS"?"#15803d":"#b91c1c",fontWeight:800}}>{latch==="PASS"?"Yes":"No"}</td><td></td><td style={{color:"#15803d",fontWeight:800}}>Yes</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>Signs of cracks on hook</td><td style={{color:structural==="PASS"?"#15803d":"#b91c1c",fontWeight:800}}>{structural==="PASS"?"No":"Yes"}</td><td></td><td style={{color:"#15803d",fontWeight:800}}>No</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>Swivel free under load</td><td style={{color:"#15803d",fontWeight:800}}>Yes</td><td></td><td style={{color:"#15803d",fontWeight:800}}>Yes</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>Excessive corrosion on hook block</td><td style={{color:"#15803d",fontWeight:800}}>No</td><td></td><td style={{color:"#15803d",fontWeight:800}}>No</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
                <tr><td>Hook side bending (max 5%)</td><td style={{color:(!wear||parseFloat(wear)<=5)?"#15803d":"#b91c1c",fontWeight:800}}>{wear?`${wear} — ${parseFloat(wear)<=5?"OK":"Excessive"}`:"OK"}</td><td></td><td style={{color:"#15803d",fontWeight:800}}>OK</td><td></td><td colSpan={2} style={{color:"#9ca3af"}}>N/A</td></tr>
              </tbody>
            </table>
          </>
        )}

        {defects&&(
          <>
            <div className="pro-stl">Comments</div>
            <div style={{border:"1px solid #1e3a5f",borderRadius:5,padding:"7px 11px",fontSize:9,color:"#b91c1c",fontWeight:600,lineHeight:1.6,background:"#fff8f8"}}>{defects}</div>
          </>
        )}
      </div>
      <ProSig inspName={inspName} inspId={inspId} sigUrl="/Signature"/>
      <div className="pro-foot"><span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span><span>Quality · Safety · Excellence</span></div>
    </div>
  );
}

export default function CertificateSheet({ certificate: c, index=0, total=1, printMode=false }) {
  if (!c) return null;
  const ex = c.extracted_data || {};

  const equipType  = val(c.equipment_type||c.asset_type||ex.equipment_type);
  const _rawType   = String(equipType||"").toLowerCase();
  const _isLifting = /lift|hoist|crane|sling|chain|shackle|hook|swivel|beam|spreader|harness|lanyard|rope|rigging|winch|pulley|block|tackle/i.test(_rawType);
  const _isPressure= /pressure|vessel|boiler|autoclave|receiver|accumulator|compressor|hydraulic|tank|cylinder|drum|pipeline/i.test(_rawType);
  const certType   = val(c.certificate_type||ex.certificate_type)||
    (_isLifting?"Load Test Certificate":_isPressure?"Pressure Test Certificate":"Certificate of Inspection");

  const certNumber = val(c.certificate_number);
  const inspNumber = val(c.inspection_no||c.inspection_number||ex.inspection_no);
  const issueDate  = formatDate(c.issue_date||c.issued_at||ex.issue_date);
  const expiryDate = formatDate(c.expiry_date||c.valid_to||c.next_inspection_date||ex.expiry_date);
  const company    = val(c.company||c.client_name||ex.client_name)||"Monroy (Pty) Ltd";
  const location   = val(c.equipment_location||c.location||ex.equipment_location);
  const equipDesc  = val(c.equipment_description||c.asset_name||ex.equipment_description);
  const equipId    = val(c.equipment_id||c.asset_tag||ex.equipment_id);
  const serialNo   = val(c.serial_number||ex.serial_number);
  const fleetNo    = val(c.fleet_number||ex.fleet_number);
  const regNo      = val(c.registration_number||ex.registration_number);
  const mfg        = val(c.manufacturer||ex.manufacturer);
  const model      = val(c.model||ex.model);
  const yearBuilt  = val(c.year_built||ex.year_built);
  const swl        = val(c.swl||ex.swl||c.safe_working_load);
  const mawp       = val(c.mawp||ex.mawp||c.working_pressure);
  const capacity   = val(c.capacity||ex.capacity||c.capacity_volume);
  const designP    = val(c.design_pressure||ex.design_pressure);
  const testP      = val(c.test_pressure||ex.test_pressure);
  const countryOrig= val(c.country_of_origin||ex.country_of_origin);
  const mfgYear    = val(c.year_built||ex.year_built);
  const legalFmwk  = val(c.legal_framework)||"Mines, Quarries, Works and Machinery Act Cap 44:02";
  const inspName   = val(c.inspector_name||ex.inspector_name)||"Moemedi Masupe";
  const inspId     = val(c.inspector_id||ex.inspector_id)||"700117910";
  const defects    = val(c.defects_found||ex.defects_found);
  const recommendations = val(c.recommendations||ex.recommendations);
  const rawNotes   = val(c.notes||"")||"";
  const pressureUnit = val(c.pressure_unit||ex.pressure_unit)||"bar";
  const lanyardSN  = val(c.lanyard_serial_no||ex.lanyard_serial_no);
  const remarks    = val(c.remarks||c.comments||ex.remarks||c.description||ex.comments);

  const _isCrane = /crane/i.test(_rawType)&&!/hook|rope|boom/i.test(_rawType);
  const _isBoom  = /boom/i.test(_rawType);
  const _isHook  = /hook/i.test(_rawType);
  // Crane rope = exactly 'Wire Rope' → compliance cert format
  // Wire Rope Sling, Round Sling etc → normal generic cert
  const _isCraneRope = _rawType === 'wire rope';
  const _isRope  = _isCraneRope;
  const _isPV    = /pressure.vessel|pressure vessel/i.test(_rawType);

  const pn     = parseNotes(rawNotes);
  const logo   = c.logo_url||"/logo.png";
  const tone   = resultStyle(pickResult(c));
  const pm     = printMode;

  if (_isCrane) return (
    <>
      <style>{CSS}</style>
      <div className={pm?"":"pro-wrap"}>
        <CraneLoadTestPage c={c} pn={pn} tone={tone} pm={pm} logo={logo}/>
        <div className="pro-pb" style={{height:pm?0:18}}/>
        <CraneChecklistPage c={c} pn={pn} pm={pm} logo={logo}/>
      </div>
    </>
  );

  if (_isHook||_isCraneRope) return (
    <>
      <style>{CSS}</style>
      <div className={pm?"":"pro-wrap"}>
        <HookRopePage c={c} pn={pn} tone={tone} pm={pm} logo={logo} isRope={_isCraneRope&&!_isHook}/>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className={pm?"":"cs-wrap"}>
        <div className={`cs-page${pm?" pm":""}`}>
          <div className="cs-hdr">
            <svg className="cs-geo" viewBox="0 0 600 130" preserveAspectRatio="xMidYMid slice">
              <circle cx="520" cy="-10" r="110" fill="rgba(34,211,238,0.06)"/>
              <circle cx="480" cy="80"  r="70"  fill="rgba(59,130,246,0.05)"/>
              <circle cx="30"  cy="130" r="80"  fill="rgba(167,139,250,0.04)"/>
            </svg>
            <div className="cs-hdr-inner">
              <div className="cs-logo-box">
                <img src={logo} alt="Monroy" onError={e=>e.target.style.display="none"}/>
              </div>
              <div className="cs-hdr-text">
                <div className="cs-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
                <div className="cs-title">{certType}</div>
                <div className="cs-sub">{company} · {location||"Botswana"}{(fleetNo||regNo)?` · ${fleetNo||regNo}`:""}</div>
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
              <Field label="Certificate Number"       value={certNumber}   mono large/>
              <Field label="Inspection Number"        value={inspNumber}   mono/>
              <Field label="Issue Date"               value={issueDate}/>
              <Field label="Expiry / Next Inspection" value={expiryDate}/>
            </Section>
            <Section title="Client &amp; Location">
              <Field label="Client / Company" value={company}/>
              <Field label="Location"         value={location}/>
              <Field label="Certificate Type" value={certType}/>
            </Section>
            <Section title="Equipment">
              <Field label="Description"   value={equipDesc}/>
              <Field label="Type"          value={equipType}/>
              <Field label="Serial Number" value={serialNo} mono/>
              {mfg      &&<Field label="Manufacturer"       value={mfg}/>}
              {model    &&<Field label="Model"              value={model}/>}
              {yearBuilt&&<Field label="Year Built"         value={yearBuilt}/>}
              {equipId  &&<Field label="Equipment ID"       value={equipId} mono/>}
              {_isBoom&&fleetNo&&<Field label="Fleet Number"        value={fleetNo} mono/>}
              {_isBoom&&regNo  &&<Field label="Registration Number" value={regNo}   mono/>}
              {_isBoom&&pn["Actual length"]  &&<Field label="Actual Boom Length"    value={pn["Actual length"]}/>}
              {_isBoom&&pn["Extended"]       &&<Field label="Extended / Telescoped" value={pn["Extended"]}/>}
              {_isBoom&&pn["Angle"]          &&<Field label="Boom Angle"            value={pn["Angle"]}/>}
              {_isBoom&&pn["Jib"]            &&<Field label="Jib Configuration"     value={pn["Jib"]}/>}
            </Section>
            <Section title="Technical Data">
              {swl&&<Field label="Safe Working Load (SWL)" value={swl}/>}
              {_isBoom&&pn["Min radius"]  &&<Field label="Min Working Radius"  value={pn["Min radius"]}/>}
              {_isBoom&&pn["Max radius"]  &&<Field label="Max Working Radius"  value={pn["Max radius"]}/>}
              {_isBoom&&pn["Test radius"] &&<Field label="Test Radius"         value={pn["Test radius"]}/>}
              {_isBoom&&pn["SWL@min"]     &&<Field label="SWL at Min Radius"   value={pn["SWL@min"]}/>}
              {_isBoom&&pn["SWL@max"]     &&<Field label="SWL at Max Radius"   value={pn["SWL@max"]}/>}
              {_isBoom&&pn["SWL@config"]  &&<Field label="SWL at Test Config"  value={pn["SWL@config"]}/>}
              {_isBoom&&pn["Test load"]   &&<Field label="Load Test Applied"   value={pn["Test load"]}/>}
              {_isBoom&&pn["Min length"]  &&<Field label="Min Boom Length"     value={pn["Min length"]}/>}
              {_isBoom&&pn["Max length"]  &&<Field label="Max Boom Length"     value={pn["Max length"]}/>}
              {!_isBoom&&mawp             &&<Field label="Working Pressure"    value={`${mawp} ${pressureUnit}`}/>}
              {!_isBoom&&capacity&&!_isCraneRope&&<Field label="Capacity / Volume"  value={capacity}/>}
              {designP  &&<Field label="Design Pressure"      value={`${designP} ${pressureUnit}`}/>}
              {testP    &&<Field label="Test Pressure"        value={`${testP} ${pressureUnit}`}/>}
              {mfg&&!_isBoom&&<Field label="Manufacturer"    value={mfg}/>}
              {mfgYear  &&<Field label="Year of Manufacture" value={mfgYear}/>}
              {countryOrig&&<Field label="Country of Origin" value={countryOrig}/>}
              {lanyardSN  &&<Field label="Lanyard Serial No." value={lanyardSN} mono/>}
            </Section>
            <div className="cs-sec" style={{marginTop:8}}>
              <div className="cs-sec-ttl">Legal Compliance</div>
              <div className="cs-fields">
                <div className="cs-field" style={{gridColumn:"1/-1",background:"#f4f8ff"}}>
                  <div className="cs-fv" style={{fontSize:8.5,color:"#4b5563",lineHeight:1.55,fontWeight:400}}>
                    This inspection has been performed by a <strong>competent person</strong> as defined under the{" "}
                    <strong>{legalFmwk}</strong> of the Laws of Botswana. The inspection, testing and certification
                    of the above equipment has been carried out in full compliance with the requirements of the said Act
                    and applicable regulations.
                  </div>
                </div>
              </div>
            </div>
{_isBoom&&(
              <Section title="Boom Systems Condition">
                {pn["Boom structure"] &&<Field label="Boom Structure"           value={pn["Boom structure"]}/>}
                {pn["Boom pins"]      &&<Field label="Boom Pins &amp; Connections"  value={pn["Boom pins"]}/>}
                {pn["Luffing"]        &&<Field label="Luffing System"           value={pn["Luffing"]}/>}
                {pn["Slew"]           &&<Field label="Slew System"              value={pn["Slew"]}/>}
                {pn["Hoist"]          &&<Field label="Hoist System"             value={pn["Hoist"]}/>}
                {pn["LMI"]            &&<Field label="LMI / Crane Computer"    value={pn["LMI"]}/>}
                {pn["Anti-two-block"] &&<Field label="Anti-Two Block"           value={pn["Anti-two-block"]}/>}
                {pn["Anemometer"]     &&<Field label="Anemometer"               value={pn["Anemometer"]}/>}
                {pn["Notes"]          &&<Field label="Notes"                    value={pn["Notes"]} full/>}
              </Section>
            )}
            {(defects||recommendations)&&(
              <Section title="Defects &amp; Recommendations">
                {defects        &&<Field label="Defects Found"   value={defects}         full/>}
                {recommendations&&<Field label="Recommendations" value={recommendations} full/>}
              </Section>
            )}
            {remarks&&(
              <div className="cs-sec">
                <div className="cs-sec-ttl">Remarks / Comments</div>
                <div className="cs-remarks">{remarks}</div>
              </div>
            )}
          </div>
          <div className="cs-sig-wrap">
            <div className="cs-sig-card">
              <div className="cs-sig-card-title">Signatures &amp; Authorisation</div>
              <div className="cs-sig-grid">
                <div>
                  <div className="cs-sig-label">Inspector Signature</div>
                  <div className="cs-sig-img-wrap">
                    <img src="/Signature" alt="Inspector signature" style={{maxHeight:44,maxWidth:120,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
                  </div>
                  <div className="cs-sig-name">{inspName}</div>
                  <div className="cs-sig-role">Inspector ID: {inspId}</div>
                </div>
                <div>
                  <div className="cs-sig-label">Client / Witness Signature</div>
                  <div className="cs-sig-img-wrap"/>
                  <div className="cs-sig-name" style={{minHeight:16}}></div>
                  <div className="cs-sig-role">Client representative sign here</div>
                </div>
              </div>
            </div>
          </div>
          <div className="cs-services">
            <p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p>
          </div>
          <div className="cs-footer">
            <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
            <span>Quality · Safety · Excellence</span>
          </div>
        </div>
      </div>
    </>
  );
}
