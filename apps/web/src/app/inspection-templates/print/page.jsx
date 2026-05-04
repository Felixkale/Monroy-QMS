// src/app/inspection-templates/print/page.jsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const CHECKLISTS = {
  CRANE: ["Hook condition & safety latch","Wire rope — broken wires, corrosion, kinking","Sheaves & drums condition","Brakes — hoist, slew, travel","Limit switches — upper, lower, travel","Electrical systems & controls","Structural members & welds","Outriggers / stabilisers","Load test performed","SWL markings legible","Safety devices functional","Lubrication adequate","Anti-two-block device","SLI / Load indicator"],
  WIRE_ROPE: ["Broken wires (count per lay)","Corrosion — internal & external","Kinking or crushing","Reduction in diameter","End terminations & sockets","Lubrication condition","Abrasion wear","Core condition","Bird-caging or waviness","Fatigue cracking","Rope lay on drum","Lower limit cut-off"],
  WIRE_SLING: ["Eyes & ferrules / swaged fittings","Abrasion damage on body","Kinking or twisting","SWL tag present & legible","Angle factor markings","Core wire integrity","End fittings secure","Deformation / flattening","Corrosion","Broken wires at terminations","Bird-caging / core protrusion","Serviceability"],
  PRESSURE_VESSEL: ["Shell — dents, cracks, corrosion","Nozzles & flanges","Relief / safety valve operation","Pressure gauges calibrated","Support structure & foundations","Hydrostatic / pneumatic test","Nameplate legible","Drains & vents","No external leakages","Pipe connections good condition","Drain valves operational","Vessel internal condition"],
  FORKLIFT: ["Fork tines — cracks, bend, wear","Mast & carriage assembly","Tyres — wear, damage, pressure","Brakes — service & park","Lights & horn functional","Fluid levels — oil, water, fuel","Overhead guard intact","Seat belt present & functional","Load backrest extension","Controls — smooth operation","Hydraulic hoses & fittings","Mast chain lubrication"],
  CHERRY_PICKER: ["Boom structure & welds","Boom pins & connections","Hydraulic system — no leaks","Structural integrity","Safety devices & interlocks","Emergency stop functional","Outrigger / stabiliser interlocks","Platform / bucket structure","Guardrails & toe boards","Gate / latch system","Harness anchor points","Auto-levelling system","Emergency lowering device","Tilt / inclination alarm","LMI / load indicator","Machine stable under load"],
  TELEHANDLER: ["Boom structure & welds","Boom pins & connections","Hydraulic system","Structural integrity","Brakes — service & park","Tyres condition","Lights & horn","Seat belt","LMI / load indicator","Emergency stop","Outrigger interlocks","Fork tines condition","Fork retention pins","Controls marked correctly","Load chart available","Machine stable under load"],
  MACHINE: ["Guards & covers secure","Electrical systems & wiring","Fasteners — loose / missing","Lubrication — levels & condition","Controls function correctly","Emergency stop functional","Safety devices operational","Structural integrity","Drive transmission","Steering system","Seals & gaskets","Oil leaks"],
  LIFTING: ["Visual inspection — general condition","Structural integrity","SWL marking legible","Cracks / deformation","Corrosion","Moving parts functional","Safety latch / locking device","End fittings / attachments","Angle / orientation markings","Serviceability"],
  DEFAULT: ["Visual inspection — general condition","Functional test","Safety devices operational","Load / pressure test","Labelling & markings legible","Structural integrity","Controls — correct operation","Documentation current","Maintenance records reviewed","Compliance with standards"],
};

function getConfig(equipType) {
  const t = (equipType || "").toUpperCase();
  if (t.includes("CRANE") || t.includes("HOIST") || t.includes("DAVIT"))
    return { label:"Crane / Lifting Equipment", items:CHECKLISTS.CRANE, accent:"#22d3ee",
      fields:["Equipment Type","Make / Manufacturer","Serial Number","Fleet Number","SWL / Capacity","Machine Hours","Boom Length (m)","Boom Angle (°)","Working Radius (m)","Test Load Applied"] };
  if (t.includes("WIRE ROPE SLING") || t.includes("WIRE SLING"))
    return { label:"Wire Rope Sling", items:CHECKLISTS.WIRE_SLING, accent:"#a78bfa",
      fields:["Sling Type","Diameter (mm)","Length (m)","No. of Legs","Construction","Core Type","SWL","Serial Number"] };
  if (t.includes("WIRE ROPE") && !t.includes("SLING"))
    return { label:"Wire Rope Inspection", items:CHECKLISTS.WIRE_ROPE, accent:"#22d3ee",
      fields:["Rope Diameter (mm)","Rope Length (m)","Construction","Fleet / Machine No.","Main Drum Condition","Aux Drum Condition"] };
  if (t.includes("PRESSURE") || t.includes("AIR RECEIVER") || t.includes("VESSEL") || t.includes("COMPRESSOR") || t.includes("OXYGEN") || t.includes("BOWSER"))
    return { label:"Pressure Vessel / Equipment", items:CHECKLISTS.PRESSURE_VESSEL, accent:"#fbbf24",
      fields:["Vessel Type","Serial Number","Capacity / Volume","Year of Manufacture","MAWP (bar)","Design Pressure (bar)","Test Pressure (bar)","Test Type"] };
  if (t.includes("CHERRY") || t.includes("AERIAL") || t.includes("AWP") || t.includes("BOOM LIFT"))
    return { label:"Cherry Picker / AWP", items:CHECKLISTS.CHERRY_PICKER, accent:"#f97316",
      fields:["Make / Model","Serial Number","Fleet Number","Max Working Height (m)","SWL / Platform Capacity","Test Load Applied","Boom Length (m)","Working Radius (m)"] };
  if (t.includes("TELEHANDLER"))
    return { label:"Telehandler", items:CHECKLISTS.TELEHANDLER, accent:"#22d3ee",
      fields:["Make / Model","Serial Number","Fleet Number","SWL / Capacity","Max Boom Length (m)","Test Load Applied","Working Radius (m)","Machine Hours"] };
  if (t.includes("FORKLIFT") || t.includes("FORK LIFT"))
    return { label:"Forklift", items:CHECKLISTS.FORKLIFT, accent:"#34d399",
      fields:["Make / Model","Serial Number","Fleet Number","SWL / Capacity","Fork Length (mm)","Heel Thickness (mm)","Blade Thickness (mm)","Wear %"] };
  if (t.includes("MIXER") || t.includes("TIPPER") || t.includes("SERVICE TRUCK") || t.includes("TRUCK"))
    return { label:"Vehicle / Machine", items:CHECKLISTS.MACHINE, accent:"#60a5fa",
      fields:["Make / Model","Registration No.","Fleet Number","GVM","Year of Manufacture","Engine Hours / Odometer","Tyre Size","Payload Capacity"] };
  if (t.includes("SLING") || t.includes("SHACKLE") || t.includes("HOOK") || t.includes("CHAIN") || t.includes("CLAMP") || t.includes("BEAM") || t.includes("HARNESS") || t.includes("LANYARD") || t.includes("SPREADER") || t.includes("ROUND"))
    return { label:"Lifting Accessory", items:CHECKLISTS.LIFTING, accent:"#a78bfa",
      fields:["Equipment Type","Serial / Tag Number","SWL / Capacity","Manufacturer","Size / Diameter","Grade / Standard"] };
  return { label:"General Equipment", items:CHECKLISTS.DEFAULT, accent:"#22d3ee",
    fields:["Equipment Type","Make / Manufacturer","Serial Number","Fleet Number","SWL / Capacity","Year of Manufacture"] };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;font-family:'IBM Plex Sans',sans-serif;background:#e2e8f0}
  .toolbar{position:fixed;top:0;left:0;right:0;z-index:100;background:#0b1d3a;border-bottom:2px solid #22d3ee;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .tleft{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
  .ttitle{font-size:13px;font-weight:800;color:#f0f6ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tsub{font-size:10px;color:rgba(240,246,255,0.4)}
  .tbtns{display:flex;gap:8px;flex-shrink:0}
  .tbtn{padding:8px 16px;border-radius:9px;border:none;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;min-height:38px;-webkit-tap-highlight-color:transparent}
  .tbtn-back{background:rgba(255,255,255,0.06);color:#f0f6ff;border:1px solid rgba(148,163,184,0.2)}
  .tbtn-print{background:linear-gradient(135deg,#22d3ee,#0891b2);color:#001018}
  .content{padding-top:76px;display:flex;flex-direction:column;align-items:center;background:#e2e8f0;min-height:100vh;padding-bottom:40px}
  .page{width:794px;max-width:100%;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;font-size:10px;color:#0f172a}
  .hdr{background:#0b1d3a;display:flex;align-items:stretch;min-height:70px;flex-shrink:0}
  .logo-box{background:#fff;width:96px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:6px;clip-path:polygon(0 0,100% 0,76% 100%,0 100%)}
  .logo-box img{width:76px;height:54px;object-fit:contain}
  .hdr-txt{flex:1;padding:8px 8px 8px 22px;display:flex;flex-direction:column;justify-content:center}
  .hdr-brand{font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px;font-weight:800}
  .hdr-name{font-size:12px;font-weight:900;color:#fff}
  .hdr-svc{font-size:6px;color:rgba(255,255,255,0.35);margin-top:2px;line-height:1.4}
  .hdr-right{padding:6px 12px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;flex-shrink:0}
  .hdr-contact{font-size:7px;color:rgba(255,255,255,0.6)}
  .accent{height:3px;background:linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa);flex-shrink:0}
  .form-title-row{padding:7px 12px;border-bottom:2px solid #0b1d3a;display:flex;align-items:center;justify-content:space-between;background:#f8faff;flex-shrink:0}
  .form-name{font-size:13px;font-weight:900;color:#0b1d3a}
  .form-sub{font-size:7.5px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-top:1px}
  .ref-box{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
  .ref-label{font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
  .ref-line{width:130px;border-bottom:1px solid #94a3b8;height:15px}
  .body{flex:1;padding:7px 12px 0;display:flex;flex-direction:column;gap:5px}
  .sec{border:1px solid #cbd5e1;border-radius:3px;overflow:hidden;flex-shrink:0}
  .sec-hd{color:#fff;padding:4px 10px;font-size:7.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:6px;background:#0b1d3a}
  .sec-hd-dot{width:2px;height:8px;border-radius:2px;display:inline-block;flex-shrink:0}
  .wgrid{display:grid;border-top:1px solid #e2e8f0}
  .wgrid-2{grid-template-columns:1fr 1fr}
  .wgrid-4{grid-template-columns:1fr 1fr 1fr 1fr}
  .wfield{padding:5px 10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}
  .wfield:nth-child(even){background:#f8faff}
  .wlabel{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:3px}
  .wline{border-bottom:1px solid #94a3b8;height:17px;width:100%}
  .cl{width:100%;border-collapse:collapse}
  .cl th{background:#1e293b;color:#f8fafc;padding:4px 8px;font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border:1px solid #334155;text-align:center}
  .cl th:first-child{text-align:left;width:56%}
  .cl th:nth-child(2),.cl th:nth-child(3),.cl th:nth-child(4){width:10%}
  .cl th:last-child{width:24%;text-align:left;padding-left:8px}
  .cl td{padding:4px 8px;border:1px solid #e2e8f0;font-size:9.5px;color:#1e293b;vertical-align:middle}
  .cl td:not(:first-child){text-align:center}
  .cl td:last-child{text-align:left}
  .cl tr:nth-child(even) td{background:#f8fafc}
  .cl tr:nth-child(odd) td{background:#fff}
  .chk{display:inline-block;width:13px;height:13px;border:1.5px solid #94a3b8;border-radius:2px;vertical-align:middle}
  .ino{display:inline-block;width:18px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:#94a3b8;margin-right:3px}
  .result-row{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #e2e8f0}
  .result-box{padding:8px 12px;border-right:1px solid #e2e8f0;display:flex;align-items:center;gap:8px}
  .result-box:last-child{border-right:none}
  .rchk{width:20px;height:20px;border:2px solid #94a3b8;border-radius:2px;flex-shrink:0}
  .rlbl{font-size:11px;font-weight:800}
  .rsub{font-size:7px;color:#64748b;margin-top:1px}
  .def-t{width:100%;border-collapse:collapse}
  .def-t th{background:#7f1d1d;color:#fee2e2;padding:4px 8px;font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border:1px solid #991b1b;text-align:left}
  .def-t td{padding:5px 8px;border:1px solid #e2e8f0;height:21px}
  .def-t tr:nth-child(even) td{background:#fff7f7}
  .txtfield{padding:5px 10px;border-bottom:1px solid #e2e8f0}
  .txtlbl{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:3px}
  .line{border-bottom:1px solid #cbd5e1;height:17px;margin-bottom:2px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0}
  .sig-box{padding:7px 12px 12px;border-right:1px solid #e2e8f0}
  .sig-box:last-child{border-right:none}
  .sig-lbl{font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:5px}
  .sig-name{font-size:8.5px;font-weight:700;color:#0b1d3a}
  .sig-id{font-family:'IBM Plex Mono',monospace;font-size:7.5px;color:#64748b}
  .sig-line{border-top:1px solid #94a3b8;margin-top:20px;padding-top:3px;font-size:7px;color:#94a3b8}
  .sig-date-lbl{font-size:7px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:7px}
  .sig-date-line{border-bottom:1px solid #94a3b8;height:17px;margin-top:3px}
  .sig-write-lbl{font-size:7.5px;font-weight:700;color:#0b1d3a;margin-bottom:2px}
  .sig-write-line{border-bottom:1px solid #94a3b8;height:17px;margin-bottom:5px}
  .legal{padding:4px 12px;flex-shrink:0}
  .legal-box{border:1px solid #cbd5e1;border-radius:3px;padding:4px 10px;font-size:7px;color:#4b5563;line-height:1.5;text-align:center;font-weight:700;background:#f8faff}
  .svc{background:#c41e3a;padding:3px 12px;flex-shrink:0}
  .svc p{font-size:6.5px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600;letter-spacing:.02em}
  .foot{background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 12px;display:flex;justify-content:space-between;flex-shrink:0}
  .foot span{font-size:7px;color:rgba(255,255,255,0.35);font-weight:600}
  @media print{
    .toolbar{display:none!important}
    .content{padding:0!important;background:white!important;display:block!important;min-height:unset!important}
    .page{box-shadow:none!important;width:100%!important}
    body{background:white!important}
    @page{size:A4;margin:5mm}
  }
  @media(max-width:860px){.page{width:100%}.wgrid-4{grid-template-columns:1fr 1fr}}
  @media(max-width:480px){.toolbar{padding:8px 12px}.wgrid-2{grid-template-columns:1fr}}
`;

function BlankTemplate({ equipType }) {
  const cfg = getConfig(equipType);
  const cols = cfg.fields.length <= 6 ? 2 : 4;

  return (
    <div className="page">
      <div className="hdr">
        <div className="logo-box">
          <img src="/logo.png" alt="Monroy" onError={e => e.target.style.display="none"} />
        </div>
        <div className="hdr-txt">
          <div className="hdr-brand">Monroy (Pty) Ltd · Process Control & Cranes</div>
          <div className="hdr-name">WE ARE ▶▶ YOUR SOLUTION</div>
          <div className="hdr-svc">Mobile Crane Hire · Rigging · NDT Test · Scaffolding · Painting · Inspection of Lifting Equipment and Machinery · Pressure Vessels & Air Receiver · Steel Fabricating and Structural · Mechanical Engineering · Fencing · Maintenance</div>
        </div>
        <div className="hdr-right">
          <div className="hdr-contact">✆ (+267) 71 450 610 / 77 906 461</div>
          <div className="hdr-contact">✉ monroybw@gmail.com</div>
          <div className="hdr-contact">📍 Phase 2, Letlhakane</div>
        </div>
      </div>
      <div className="accent" />

      <div className="form-title-row">
        <div>
          <div className="form-name">INSPECTION REPORT FORM</div>
          <div className="form-sub">{cfg.label} · ISO 9001:2015 · MQWM Act Cap 44:02</div>
        </div>
        <div className="ref-box">
          <div className="ref-label">Certificate / Report No.</div>
          <div className="ref-line" />
          <div className="ref-label" style={{marginTop:3}}>Date of Inspection</div>
          <div className="ref-line" />
        </div>
      </div>

      <div className="body">

        {/* 1. CLIENT */}
        <div className="sec">
          <div className="sec-hd">
            <span className="sec-hd-dot" style={{background:cfg.accent}}/>
            1. Client &amp; Site Information
          </div>
          <div className="wgrid wgrid-2">
            {["Client / Company Name","Site / Location","Department / Section","Work Order / PO Number","Inspection Date","Next Inspection Due"].map(l => (
              <div className="wfield" key={l}>
                <div className="wlabel">{l}</div>
                <div className="wline"/>
              </div>
            ))}
          </div>
        </div>

        {/* 2. EQUIPMENT */}
        <div className="sec">
          <div className="sec-hd">
            <span className="sec-hd-dot" style={{background:cfg.accent}}/>
            2. Equipment Details
          </div>
          <div className={`wgrid ${cols === 4 ? "wgrid-4" : "wgrid-2"}`}>
            {cfg.fields.map(l => (
              <div className="wfield" key={l}>
                <div className="wlabel">{l}</div>
                <div className="wline"/>
              </div>
            ))}
            <div className="wfield" style={{gridColumn:"1 / -1"}}>
              <div className="wlabel">Equipment Description / Full Name</div>
              <div className="wline"/>
            </div>
          </div>
        </div>

        {/* 3. CHECKLIST */}
        <div className="sec">
          <div className="sec-hd">
            <span className="sec-hd-dot" style={{background:cfg.accent}}/>
            3. Inspection Checklist — {cfg.label}
          </div>
          <table className="cl">
            <thead>
              <tr>
                <th>Inspection Item</th>
                <th>PASS ✓</th>
                <th>FAIL ✗</th>
                <th>N/A</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {cfg.items.map((item, i) => (
                <tr key={i}>
                  <td><span className="ino">{String(i+1).padStart(2,"0")}</span>{item}</td>
                  <td><span className="chk"/></td>
                  <td><span className="chk"/></td>
                  <td><span className="chk"/></td>
                  <td style={{minWidth:60}}/>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. DEFECTS */}
        <div className="sec">
          <div className="sec-hd" style={{background:"#7f1d1d",color:"#fee2e2"}}>
            <span className="sec-hd-dot" style={{background:"#fca5a5"}}/>
            4. Defects / Non-Conformances Found
          </div>
          <table className="def-t">
            <thead>
              <tr>
                <th style={{width:"4%"}}>No.</th>
                <th style={{width:"40%"}}>Defect Description</th>
                <th style={{width:"20%"}}>Location on Equipment</th>
                <th style={{width:"20%"}}>Severity (High / Med / Low)</th>
                <th style={{width:"16%"}}>Action Required</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(n => (
                <tr key={n}>
                  <td style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#94a3b8",textAlign:"center"}}>{n}</td>
                  <td/><td/><td/><td/>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. RECOMMENDATIONS */}
        <div className="sec">
          <div className="sec-hd">
            <span className="sec-hd-dot" style={{background:cfg.accent}}/>
            5. Recommendations &amp; Additional Notes
          </div>
          <div className="txtfield">
            <div className="txtlbl">Recommendations / Corrective Actions</div>
            {[1,2,3].map(n => <div className="line" key={n}/>)}
          </div>
          <div className="txtfield">
            <div className="txtlbl">Comments / Additional Notes</div>
            {[1,2].map(n => <div className="line" key={n}/>)}
          </div>
        </div>

        {/* 6. RESULT */}
        <div className="sec">
          <div className="sec-hd" style={{background:"#065f46",color:"#d1fae5"}}>
            <span className="sec-hd-dot" style={{background:"#34d399"}}/>
            6. Overall Inspection Result
          </div>
          <div className="result-row">
            <div className="result-box">
              <div className="rchk"/>
              <div><div className="rlbl" style={{color:"#065f46"}}>PASS</div><div className="rsub">Equipment fit for service</div></div>
            </div>
            <div className="result-box">
              <div className="rchk"/>
              <div><div className="rlbl" style={{color:"#92400e"}}>CONDITIONAL</div><div className="rsub">Subject to repairs / monitoring</div></div>
            </div>
            <div className="result-box">
              <div className="rchk"/>
              <div><div className="rlbl" style={{color:"#991b1b"}}>FAIL</div><div className="rsub">Equipment out of service</div></div>
            </div>
          </div>
        </div>

        {/* 7. SIGNATURES */}
        <div className="sec">
          <div className="sec-hd">
            <span className="sec-hd-dot" style={{background:cfg.accent}}/>
            7. Authorisation &amp; Signatures
          </div>
          <div className="sig-grid">
            <div className="sig-box">
              <div className="sig-lbl">Inspector / Competent Person</div>
              <div className="sig-name">Moemedi Masupe</div>
              <div className="sig-id">ID: 700117910</div>
              <div className="sig-line">Signature</div>
              <div className="sig-date-lbl">Date</div>
              <div className="sig-date-line"/>
            </div>
            <div className="sig-box">
              <div className="sig-lbl">Client Representative</div>
              <div className="sig-write-lbl">Name:</div>
              <div className="sig-write-line"/>
              <div className="sig-write-lbl">Designation:</div>
              <div className="sig-write-line"/>
              <div className="sig-line" style={{marginTop:8}}>Signature</div>
              <div className="sig-date-lbl">Date</div>
              <div className="sig-date-line"/>
            </div>
          </div>
        </div>

      </div>

      <div className="legal" style={{marginTop:5}}>
        <div className="legal-box">
          INSPECTION CARRIED OUT IN ACCORDANCE WITH: MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 · FACTORIES ACT CAP 44:01 OF THE LAWS OF BOTSWANA · ISO 9001:2015
        </div>
      </div>
      <div className="svc" style={{marginTop:4}}>
        <p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment &amp; Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating &amp; Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p>
      </div>
      <div className="foot">
        <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
        <span>{cfg.label} Inspection Form</span>
        <span>Quality · Safety · Excellence</span>
      </div>
    </div>
  );
}

function TemplatePrintInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const equipType = decodeURIComponent(sp.get("type") || "");
  const cfg = getConfig(equipType);

  if (!equipType) return (
    <>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif",color:"#f0f6ff",fontSize:14}}>
        No equipment type.
        <button onClick={() => router.back()} style={{marginLeft:12,padding:"8px 16px",borderRadius:9,border:"none",background:"rgba(34,211,238,0.15)",color:"#22d3ee",cursor:"pointer",fontWeight:800,fontFamily:"inherit"}}>← Back</button>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="toolbar">
        <div className="tleft">
          <div className="ttitle">Blank Inspection Template — {equipType}</div>
          <div className="tsub">All fields blank · {cfg.items.length} checklist items · fill in manually after printing</div>
        </div>
        <div className="tbtns">
          <button type="button" className="tbtn tbtn-back" onClick={() => router.back()}>← Back</button>
          <button type="button" className="tbtn tbtn-print" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      <div className="content">
        <BlankTemplate equipType={equipType} />
      </div>
    </>
  );
}

export default function TemplatePrintPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif",color:"rgba(240,246,255,0.5)",fontSize:13}}>
        Loading template…
      </div>
    }>
      <TemplatePrintInner />
    </Suspense>
  );
}
