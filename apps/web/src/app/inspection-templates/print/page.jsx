// src/app/inspection-templates/print/page.jsx
// Multi-unit print template — saves paper by fitting max equipment per A4 page
// Strategy:
//   TABLE FORM  → Bottle Jack, Wire Rope Sling, Shackle, Fork Arm, Chain Sling (15-20 units/page)
//   2-PER-PAGE  → Crane, Telehandler, Cherry Picker, Forklift, Mixer Truck, Diesel Bowser, Horse & Trailer
//   1-PER-PAGE  → Pressure Vessel, Air Receiver (complex, must stay single)

"use client";
import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";

/* ── Equipment routing ─────────────────────────────────────── */
const TABLE_TYPES  = ["bottle jack","wire rope sling","chain sling","shackle","fork arm","hook","eye bolt","d-shackle","bow shackle"];
const DUAL_TYPES   = ["crane","mobile crane","overhead crane","telehandler","cherry picker","forklift","mixer truck","diesel bowser","horse & trailer","horse and trailer","compactor","grader"];
const SINGLE_TYPES = ["pressure vessel","air receiver","boiler","autoclave"];

function routeType(type) {
  const t = (type || "").toLowerCase();
  if (TABLE_TYPES.some(k => t.includes(k)))  return "table";
  if (SINGLE_TYPES.some(k => t.includes(k))) return "single";
  return "dual"; // default for anything else
}

/* ── Colour tokens (Monroy theme) ──────────────────────────── */
const RED    = "#c00";
const NAVY   = "#0b1d3a";
const LGREY  = "#f5f5f5";
const DGREY  = "#333";
const MGREY  = "#888";
const WHITE  = "#fff";
const LINE   = "#000";

/* ═══════════════════════════════════════════════════════════════
   SHARED HEADER — used by all template types
═══════════════════════════════════════════════════════════════ */
function CertHeader({ equipType, qty, layout }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      borderBottom:`2.5px solid ${RED}`, paddingBottom:8, marginBottom:8 }}>
      {/* Left: logo + services */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ background:NAVY, color:WHITE, padding:"6px 10px", borderRadius:3,
          fontSize:9, fontWeight:900, lineHeight:1.35, textAlign:"center", minWidth:70 }}>
          <div style={{ fontSize:7, letterSpacing:1, color:"#aaa", fontWeight:400 }}>MONROY</div>
          <div style={{ fontSize:13 }}>M</div>
          <div style={{ fontSize:7, color:"#aaa" }}>(PTY) LTD</div>
        </div>
        <div>
          <div style={{ fontWeight:900, fontSize:11, color:NAVY }}>MONROY (PTY) LTD</div>
          <div style={{ fontSize:7, color:MGREY, maxWidth:320, lineHeight:1.5, marginTop:2 }}>
            Mobile Crane Hire · Rigging · NDT Testing · Scaffolding · Painting · Inspection of Lifting Equipment
            &amp; Machinery · Pressure Vessels &amp; Air Receivers · Steel Fabrication · Mechanical Engineering · Maintenance
          </div>
          <div style={{ fontSize:7, color:DGREY, marginTop:3 }}>
            Mophane Avenue, Maun, Botswana &nbsp;|&nbsp; Tel: +267 XXX XXXX &nbsp;|&nbsp; www.monroy.bw
          </div>
        </div>
      </div>
      {/* Right: document title */}
      <div style={{ textAlign:"right", minWidth:160 }}>
        <div style={{ background:RED, color:WHITE, fontWeight:900, fontSize:10,
          padding:"4px 10px", borderRadius:3, marginBottom:4 }}>
          BLANK INSPECTION TEMPLATE
        </div>
        <div style={{ fontSize:9, fontWeight:700, color:NAVY }}>{equipType.toUpperCase()}</div>
        <div style={{ fontSize:8, color:MGREY, marginTop:2 }}>
          {layout === "table"  ? `Up to ${qty} units per page` :
           layout === "dual"   ? "2 units per page" :
           "1 unit per page"}
        </div>
        <div style={{ fontSize:8, color:MGREY, marginTop:1 }}>
          All inspections comply with Mines, Quarries,<br/>
          Works &amp; Machinery Act Cap 44:02 of Botswana
        </div>
      </div>
    </div>
  );
}

/* ── Shared footer ─────────────────────────────────────────── */
function CertFooter() {
  return (
    <div style={{ marginTop:"auto", borderTop:`1px solid ${RED}`, paddingTop:4,
      display:"flex", justifyContent:"space-between", fontSize:7, color:MGREY }}>
      <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana · Quality · Safety · Excellence</span>
      <span>Inspections carried out by a Competent Person as defined under Cap 44:02</span>
    </div>
  );
}

/* ── Write line ────────────────────────────────────────────── */
function Line({ label, wide, mono }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex: wide ? 2 : 1, minWidth:0 }}>
      <div style={{ fontSize:7, color:MGREY, marginBottom:1 }}>{label}</div>
      <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:14,
        fontFamily: mono ? "monospace" : "inherit", fontSize:9 }}>&nbsp;</div>
    </div>
  );
}

/* ── Checkbox row ──────────────────────────────────────────── */
function CheckRow({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
      <div style={{ width:9, height:9, border:`1px solid ${LINE}`, flexShrink:0 }} />
      <div style={{ width:9, height:9, border:`1px solid ${LINE}`, flexShrink:0 }} />
      <div style={{ fontSize:8, flex:1 }}>{label}</div>
    </div>
  );
}

/* ── Section box ───────────────────────────────────────────── */
function SectionBox({ title, children, style }) {
  return (
    <div style={{ border:`1px solid #ccc`, marginBottom:5, ...style }}>
      <div style={{ background:NAVY, color:WHITE, fontWeight:700, fontSize:8,
        padding:"2px 6px", letterSpacing:0.5 }}>{title}</div>
      <div style={{ padding:"4px 6px" }}>{children}</div>
    </div>
  );
}

/* ── Field row (label + underline) ───────────────────────── */
function FieldRow({ fields }) {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:5 }}>
      {fields.map((f, i) => <Line key={i} label={f.label} wide={f.wide} mono={f.mono} />)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TABLE TEMPLATE — for simple/repetitive equipment
   Fits 12–16 units per A4 page
═══════════════════════════════════════════════════════════════ */
function TableTemplate({ equipType }) {
  const ROW_COUNT = 14;

  const columns = getTableColumns(equipType);
  const checkItems = getCheckItems(equipType);

  return (
    <div className="a4-page" style={pageStyle}>
      <CertHeader equipType={equipType} qty={ROW_COUNT} layout="table" />

      {/* Batch info row */}
      <div style={{ display:"flex", gap:10, marginBottom:6 }}>
        <Line label="Client / Company" wide />
        <Line label="Site / Location" wide />
        <Line label="Date of Inspection" />
        <Line label="Inspector" />
      </div>

      {/* Main table */}
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:8, marginBottom:6 }}>
        <thead>
          <tr style={{ background:NAVY, color:WHITE }}>
            <th style={TH}>#</th>
            {columns.map((c,i) => <th key={i} style={{...TH, width:c.width}}>{c.label}</th>)}
            <th style={{...TH, width:40}}>P / F</th>
            <th style={{...TH, width:30}}>Sign</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({length:ROW_COUNT}).map((_,i) => (
            <tr key={i} style={{ background: i%2===0 ? WHITE : LGREY }}>
              <td style={{...TD, textAlign:"center", color:MGREY, fontWeight:700}}>{i+1}</td>
              {columns.map((c,j) => <td key={j} style={TD} />)}
              <td style={{...TD, textAlign:"center"}}>
                <span style={{marginRight:3}}>☐P</span><span>☐F</span>
              </td>
              <td style={TD} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Checklist + Remarks side by side */}
      {checkItems.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:6 }}>
          <SectionBox title="INSPECTION CHECKLIST (applies to all units above)" style={{ flex:1 }}>
            <div style={{ fontSize:7.5, color:MGREY, marginBottom:3 }}>
              ☐ Pass &nbsp;☐ Fail — tick per item, note unit numbers with defects in Remarks
            </div>
            <div style={{ columns:2, columnGap:12 }}>
              {checkItems.map((item, i) => <CheckRow key={i} label={item} />)}
            </div>
          </SectionBox>
          <SectionBox title="REMARKS / DEFECTS" style={{ flex:1 }}>
            {Array.from({length:8}).map((_,i) => (
              <div key={i} style={{ borderBottom:`1px solid #ddd`, minHeight:14, marginBottom:3 }} />
            ))}
          </SectionBox>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display:"flex", gap:12, marginTop:4 }}>
        {[["Inspector Name","Inspector Signature","ID / Cert No."],
          ["Client Representative","Client Signature","Date"]].map((sig, i) => (
          <div key={i} style={{ flex:1, border:`1px solid #ccc`, padding:"4px 6px" }}>
            {sig.map((l,j) => (
              <div key={j} style={{ display:"flex", flexDirection:"column", marginBottom:j<sig.length-1?5:0 }}>
                <div style={{ fontSize:7, color:MGREY }}>{l}</div>
                <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:14 }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <CertFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DUAL TEMPLATE — 2 equipment units per A4 page
   For: Crane, Telehandler, Cherry Picker, Forklift, Mixer, Bowser, H&T
═══════════════════════════════════════════════════════════════ */
function DualTemplate({ equipType }) {
  const sections = getDualSections(equipType);
  const checkItems = getCheckItems(equipType);

  return (
    <div className="a4-page" style={pageStyle}>
      <CertHeader equipType={equipType} qty={2} layout="dual" />

      {/* PASS/FAIL legend */}
      <div style={{ fontSize:7, color:MGREY, textAlign:"right", marginBottom:4 }}>
        ☐ = Pass &nbsp; ✗ = Fail &nbsp; N/A = Not Applicable
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {[1, 2].map(unit => (
          <div key={unit} style={{ flex:1, border:`1.5px solid ${NAVY}`, borderRadius:2 }}>
            {/* Unit header */}
            <div style={{ background:NAVY, color:WHITE, fontWeight:900, fontSize:9,
              padding:"3px 8px", letterSpacing:0.5 }}>
              UNIT {unit}
            </div>
            <div style={{ padding:"5px 6px" }}>

              {/* Identity */}
              <SectionBox title="EQUIPMENT IDENTITY" style={{ marginBottom:4 }}>
                <FieldRow fields={[{label:"Reg / Fleet No.",mono:true},{label:"Serial No.",mono:true}]} />
                <FieldRow fields={[{label:"Make / Model",wide:true},{label:"Year"}]} />
                <FieldRow fields={[{label:"Client / Company",wide:true},{label:"Location"}]} />
                <FieldRow fields={[{label:"Date of Inspection"},{label:"Expiry Date"}]} />
                <FieldRow fields={[{label:"Certificate No.",mono:true},{label:"Inspection No.",mono:true}]} />
              </SectionBox>

              {/* Technical */}
              <SectionBox title="TECHNICAL DATA" style={{ marginBottom:4 }}>
                {sections.technical.map((row, i) => (
                  <FieldRow key={i} fields={row} />
                ))}
              </SectionBox>

              {/* Checklist (compact) */}
              {checkItems.length > 0 && (
                <SectionBox title="INSPECTION CHECKLIST" style={{ marginBottom:4 }}>
                  <div style={{ fontSize:7, color:MGREY, marginBottom:2 }}>☐ P &nbsp; ☐ F</div>
                  {checkItems.map((item, i) => <CheckRow key={i} label={item} />)}
                </SectionBox>
              )}

              {/* Extra sections (e.g. load test, wire rope) */}
              {sections.extra && sections.extra.map((sec, i) => (
                <SectionBox key={i} title={sec.title} style={{ marginBottom:4 }}>
                  {sec.fields.map((row, j) => <FieldRow key={j} fields={row} />)}
                </SectionBox>
              ))}

              {/* Result */}
              <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                <div style={{ flex:1, border:`1px solid #ccc`, padding:"3px 5px",
                  display:"flex", alignItems:"center", gap:8, fontSize:8 }}>
                  <b>Overall Result:</b>
                  <span>☐ PASS</span><span>☐ FAIL</span><span>☐ CONDITIONAL</span>
                </div>
              </div>

              {/* Remarks */}
              <SectionBox title="REMARKS / DEFECTS" style={{ marginBottom:4 }}>
                {Array.from({length:3}).map((_,i) => (
                  <div key={i} style={{ borderBottom:`1px solid #ddd`, minHeight:13, marginBottom:3 }} />
                ))}
              </SectionBox>

              {/* Signatures */}
              <div style={{ display:"flex", gap:5 }}>
                {[["Inspector","ID/Cert","Sign"],["Client Rep","Date","Sign"]].map((s,i) => (
                  <div key={i} style={{ flex:1 }}>
                    {s.map((l,j) => (
                      <div key={j} style={{ fontSize:7, color:MGREY, marginBottom:j<2?4:0 }}>
                        {l}: <span style={{ display:"inline-block", borderBottom:`1px solid ${LINE}`,
                          width:"70%", marginLeft:2 }}>&nbsp;</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

            </div>
          </div>
        ))}
      </div>

      <CertFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SINGLE TEMPLATE — 1 per page (Pressure Vessel, Air Receiver)
   Full-size, comprehensive
═══════════════════════════════════════════════════════════════ */
function SingleTemplate({ equipType }) {
  const isPV = /pressure|vessel|boiler|autoclave/i.test(equipType);

  return (
    <div className="a4-page" style={pageStyle}>
      <CertHeader equipType={equipType} qty={1} layout="single" />

      {/* Identity */}
      <SectionBox title="CERTIFICATE & EQUIPMENT DETAILS">
        <FieldRow fields={[{label:"Certificate No.",mono:true},{label:"Inspection No.",mono:true},{label:"Issue Date"},{label:"Expiry Date"}]} />
        <FieldRow fields={[{label:"Client / Company",wide:true},{label:"Location",wide:true}]} />
        <FieldRow fields={[{label:"Equipment Description",wide:true},{label:"Equipment Type"},{label:"Year Built"}]} />
        <FieldRow fields={[{label:"Manufacturer",wide:true},{label:"Model"},{label:"Serial No.",mono:true},{label:"Fleet / Asset No.",mono:true}]} />
        <FieldRow fields={[{label:"Country of Origin"},{label:"Design Standard / Code"},{label:"Certificate Type"}]} />
      </SectionBox>

      {/* Technical */}
      <SectionBox title="TECHNICAL DATA">
        {isPV ? (
          <>
            <FieldRow fields={[{label:"Working Pressure (bar)"},{label:"Design Pressure (bar)"},{label:"Test Pressure (bar)"},{label:"Pressure Unit"}]} />
            <FieldRow fields={[{label:"Capacity / Volume (L)"},{label:"Shell Thickness (mm)"},{label:"Medium / Fluid"},{label:"Temperature (°C)"}]} />
            <FieldRow fields={[{label:"Safety Valve Set Pressure"},{label:"Safety Valve Qty"},{label:"Relief Valve Size"},{label:"Last Hydro Test Date"}]} />
          </>
        ) : (
          <>
            <FieldRow fields={[{label:"SWL / Rated Capacity"},{label:"Boom Length (m)"},{label:"Max Radius (m)"},{label:"Max Height (m)"}]} />
            <FieldRow fields={[{label:"Tare Weight (kg)"},{label:"GVM / GCM (kg)"},{label:"Drive Type"},{label:"No. of Axles"}]} />
          </>
        )}
      </SectionBox>

      {/* Inspection checklist */}
      <div style={{ display:"flex", gap:8 }}>
        <SectionBox title="INSPECTION CHECKLIST" style={{ flex:2 }}>
          <div style={{ fontSize:7, color:MGREY, marginBottom:4 }}>
            ☐ Pass &nbsp; ☐ Fail &nbsp; ☐ N/A &nbsp; — tick each item
          </div>
          <div style={{ columns:2, columnGap:14 }}>
            {getSingleChecklist(equipType).map((item, i) => <CheckRow key={i} label={item} />)}
          </div>
        </SectionBox>

        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
          {/* Load test */}
          <SectionBox title="TEST DATA">
            <FieldRow fields={[{label:"Test Load Applied"},{label:"Test Duration"}]} />
            <FieldRow fields={[{label:"Test Method"},{label:"Test Result"}]} />
            <FieldRow fields={[{label:"Test Equipment / Ref"}]} />
          </SectionBox>
          {/* Overall result */}
          <div style={{ border:`1.5px solid ${NAVY}`, padding:"5px 8px" }}>
            <div style={{ fontWeight:700, fontSize:9, color:NAVY, marginBottom:4 }}>OVERALL RESULT</div>
            {["☐  PASS","☐  FAIL","☐  CONDITIONAL","☐  REPAIR REQUIRED"].map((r,i) => (
              <div key={i} style={{ fontSize:9, marginBottom:3 }}>{r}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Legal framework */}
      <div style={{ background:"#eaf2fb", border:`1px solid #c8dff0`,
        borderLeft:`4px solid ${NAVY}`, padding:"5px 8px", marginBottom:5, fontSize:8 }}>
        <b style={{ fontWeight:900, color:NAVY }}>LEGAL FRAMEWORK &amp; COMPLIANCE DECLARATION</b><br/>
        The inspection, testing, and certification of the above equipment has been carried out by a
        <b> Competent Person</b> in full compliance with the requirements of the
        <b> Mines, Quarries, Works and Machinery Act Cap 44:02 of Botswana</b> and applicable regulations.
        Additional standard applied (if any):&nbsp;
        <span style={{ display:"inline-block", borderBottom:`1px solid ${LINE}`, minWidth:200 }}>&nbsp;</span>
      </div>

      {/* Remarks */}
      <SectionBox title="REMARKS / DEFECTS / RECOMMENDATIONS">
        {Array.from({length:4}).map((_,i) => (
          <div key={i} style={{ borderBottom:`1px solid #ddd`, minHeight:15, marginBottom:4 }} />
        ))}
      </SectionBox>

      {/* Signatures */}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        {[
          ["Inspector Name","Inspector Signature","ID / Certificate No.","Date"],
          ["Client Representative","Client Signature","Designation / Title","Date"],
        ].map((sig, i) => (
          <div key={i} style={{ flex:1, border:`1px solid #ccc`, padding:"5px 8px" }}>
            {sig.map((l,j) => (
              <div key={j} style={{ display:"flex", flexDirection:"column", marginBottom:j<3?6:0 }}>
                <div style={{ fontSize:7.5, color:MGREY }}>{l}</div>
                <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:16 }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <CertFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA HELPERS
═══════════════════════════════════════════════════════════════ */
function getTableColumns(type) {
  const t = type.toLowerCase();
  if (t.includes("wire rope sling") || t.includes("sling")) return [
    {label:"Tag / ID",     width:50},
    {label:"Length (m)",   width:45},
    {label:"Diameter (mm)",width:50},
    {label:"Config / Legs",width:45},
    {label:"SWL (t)",      width:40},
    {label:"Termination",  width:55},
  ];
  if (t.includes("chain sling")) return [
    {label:"Tag / ID",     width:50},
    {label:"Chain Grade",  width:45},
    {label:"Length (m)",   width:45},
    {label:"Diameter (mm)",width:50},
    {label:"SWL (t)",      width:40},
    {label:"No. of Legs",  width:45},
  ];
  if (t.includes("shackle")) return [
    {label:"ID / Ref",     width:50},
    {label:"Type (Bow/D)", width:50},
    {label:"Grade",        width:40},
    {label:"SWL (t)",      width:40},
    {label:"Size (mm)",    width:40},
    {label:"Pin condition",width:55},
  ];
  if (t.includes("fork arm") || t.includes("fork")) return [
    {label:"Fork No.",     width:40},
    {label:"Length (mm)",  width:50},
    {label:"Thickness Heel",width:55},
    {label:"Thickness Blade",width:55},
    {label:"Width (mm)",   width:45},
    {label:"SWL (t)",      width:40},
  ];
  if (t.includes("hook")) return [
    {label:"ID / Ref",     width:50},
    {label:"Type",         width:50},
    {label:"SWL (t)",      width:40},
    {label:"Safety Latch", width:50},
    {label:"Deformation",  width:55},
  ];
  if (t.includes("bottle jack")) return [
    {label:"Jack No. / ID",width:55},
    {label:"Capacity (t)", width:50},
    {label:"Stroke (mm)",  width:50},
    {label:"Seals OK",     width:40},
    {label:"Ram condition",width:55},
  ];
  // Generic fallback
  return [
    {label:"ID / Serial",  width:60},
    {label:"Description",  width:80},
    {label:"Capacity/SWL", width:55},
    {label:"Condition",    width:70},
  ];
}

function getCheckItems(type) {
  const t = type.toLowerCase();
  if (t.includes("crane") || t.includes("mobile crane") || t.includes("overhead crane")) return [
    "Hook condition & safety latch","Wire rope condition","Sheaves & drums","Hoist brakes",
    "Slew brakes","Travel brakes","Limit switches (upper/lower)","LMI / Load indicator",
    "Anti-two-block device","Outriggers / stabilisers","Structural integrity","Electrical systems",
    "SWL markings legible","Load test performed","Operator cabin & controls","Lubrication",
  ];
  if (t.includes("telehandler")) return [
    "Boom structure & pivot pins","Carriage & attachment","Hydraulic system",
    "Tyres & wheels","Lights & mirrors","ROPS/FOPS structure","Load chart present",
    "Seat & seatbelt","Overload protection","Engine & transmission","Stabilisers","Fire extinguisher",
  ];
  if (t.includes("cherry picker") || t.includes("aerial")) return [
    "Platform structure & guardrails","Platform gate & latch","Levelling system",
    "Emergency lowering","Tilt alarm/cut-out","Overload device","Hydraulic cylinders",
    "Boom articulation","Outriggers","Electrical controls","SWL & safe working signs",
    "Ground controls functional","Harness attachment points",
  ];
  if (t.includes("forklift")) return [
    "Fork arms — twist, cracks, wear","Mast & chains","Hydraulic system",
    "Tyres & wheels","Lights & horn","Seatbelt","Overhead guard","Load backrest",
    "Brake system","Steering","Engine / battery","Capacity plate legible",
  ];
  if (t.includes("mixer truck") || t.includes("mixer")) return [
    "Drum condition & fins","Drum drive system","Chute & discharge","Water tank",
    "PTO & hydraulic","Tyres & wheels","Lights & indicators","Brakes","Steering",
    "Frame & chassis","Cab controls","Safety markings",
  ];
  if (t.includes("diesel bowser") || t.includes("bowser") || t.includes("tanker")) return [
    "Tank shell — corrosion, dents","Bund / containment","Pump & meter",
    "Hose & nozzle condition","Earthing/bonding point","Shut-off valves","Venting",
    "Level gauge","Pressure relief","Labelling & GHS signs","Chassis integrity","Emergency stop",
  ];
  if (t.includes("horse") || t.includes("trailer")) return [
    "Fifth wheel / king pin","Coupling devices","Brake system — air/hydraulic",
    "Lights & reflectors","Tyres & wheels","Chassis & cross-members",
    "Landing gear / outriggers","Lashing points","Mudguards","Frame integrity",
    "Load securing rings","Safety chains",
  ];
  if (t.includes("wire rope sling") || t.includes("sling")) return [
    "Eyes & ferrules / swage fittings","Abrasion on body","Kinking or twisting",
    "SWL tag present","Core wire integrity","Corrosion","Bird-caging",
    "End fitting security","Broken wires at terminations","Deformation / flattening",
  ];
  if (t.includes("chain sling")) return [
    "Link condition — no cracks","Wear measurement","Master link & sub-links",
    "Hooks & fittings","Grade mark legible","Elongation","Corrosion","SWL tag",
  ];
  if (t.includes("bottle jack")) return [
    "Ram seals — no leaks","Ram surface — corrosion, scoring","Hydraulic fluid level",
    "Pump handle & valve","Base plate condition","Collar/load bearing surface",
    "Safety collar / lock nut","Rated capacity marking",
  ];
  return [
    "Visual inspection complete","Functional test performed","SWL markings present",
    "No visible cracks or defects","Fasteners & fixings secure","Lubrication adequate",
    "Load test performed","Documentation complete",
  ];
}

function getDualSections(type) {
  const t = type.toLowerCase();
  if (t.includes("crane") || t.includes("telehandler")) return {
    technical: [
      [{label:"SWL at Min Radius (t)"},{label:"SWL at Max Radius (t)"}],
      [{label:"Max Boom Length (m)"},{label:"Max Radius (m)"},{label:"Max Height (m)"}],
      [{label:"Tare Weight (kg)"},{label:"GVM / GCM (kg)"}],
    ],
    extra: [
      { title:"LOAD TEST",
        fields: [
          [{label:"Test Load (t)"},{label:"Test Radius (m)"}],
          [{label:"Test Duration"},{label:"Test Result"}],
        ]
      },
    ],
  };
  if (t.includes("forklift")) return {
    technical: [
      [{label:"Rated Capacity (t)"},{label:"Lift Height (mm)"},{label:"Load Centre (mm)"}],
      [{label:"Mast Type"},{label:"Attachment"},{label:"Tyre Type"}],
    ],
    extra: [],
  };
  if (t.includes("horse") || t.includes("trailer")) return {
    technical: [
      [{label:"Horse Reg No.",mono:true},{label:"Trailer Reg No.",mono:true}],
      [{label:"GVM Horse (kg)"},{label:"GVM Trailer (kg)"}],
      [{label:"Coupling Type"},{label:"Brake Type"}],
    ],
    extra: [],
  };
  // Generic dual
  return {
    technical: [
      [{label:"Rated Capacity / SWL"},{label:"Gross Mass (kg)"}],
      [{label:"Drive Type"},{label:"Engine / Motor No.",mono:true}],
    ],
    extra: [],
  };
}

function getSingleChecklist(type) {
  const t = type.toLowerCase();
  if (t.includes("pressure") || t.includes("vessel")) return [
    "External visual — corrosion, cracks, deformation","Internal visual inspection",
    "Shell & head plate condition","Nozzle & flange condition","Safety valve — set pressure correct",
    "Safety valve — functional test","Pressure gauge — calibrated, reads zero",
    "Pressure relief device present","Drain & vent valve condition","Insulation condition (if applicable)",
    "Support & foundation integrity","Nameplate legible","Pressure test performed",
    "Hydraulic/pneumatic test record","Welded joints — NDT (if req)","Documentation complete",
  ];
  if (t.includes("air receiver")) return [
    "Shell condition — no pitting/cracks","End plates & seams","Safety relief valve",
    "Pressure gauge — calibrated","Automatic drain valve","Isolation valve","Moisture trap",
    "Pressure switch setting","Compressor unload check","Max allowable WP marked",
    "Hydraulic test record","Nameplate legible","Foundation secure","Pipe connections",
  ];
  return getSingleChecklist("pressure vessel");
}

/* ── CSS styles ─────────────────────────────────────────────── */
const pageStyle = {
  width: "210mm",
  minHeight: "297mm",
  maxHeight: "297mm",
  padding: "10mm 12mm 8mm",
  background: WHITE,
  fontFamily: "'Arial', 'Helvetica', sans-serif",
  fontSize: 9,
  color: DGREY,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  pageBreakAfter: "always",
  breakAfter: "page",
};

const TH = {
  border:`1px solid rgba(255,255,255,0.2)`,
  padding:"3px 4px",
  fontWeight:700,
  fontSize:7.5,
  textAlign:"left",
};

const TD = {
  border:`1px solid #ccc`,
  padding:"2px 4px",
  minHeight:15,
  height:18,
  fontSize:8,
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
function PrintPageInner() {
  const params = useSearchParams();
  const equipType = params.get("type") || "General Equipment";
  const layout = routeType(equipType);

  const printStyles = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e8e8e8; }
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      margin: 20px auto;
      overflow: hidden;
    }
    .screen-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #0b1d3a; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; z-index: 999; font-family: Arial, sans-serif;
      font-size: 13px; gap: 12px;
    }
    .print-btn {
      background: #c00; color: #fff; border: none; padding: 8px 20px;
      border-radius: 4px; font-weight: 700; font-size: 13px; cursor: pointer;
    }
    .print-tip {
      font-size: 11px; color: #aaa;
    }
    .page-wrap { padding-top: 54px; padding-bottom: 20px; }
    @media print {
      .screen-bar { display: none !important; }
      .page-wrap { padding-top: 0 !important; }
      .a4-page {
        margin: 0 !important;
        box-shadow: none !important;
        page-break-after: always;
        break-after: page;
      }
      body { background: white !important; }
    }
  `;

  const handlePrint = () => window.print();

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: printStyles}} />

      {/* Screen toolbar */}
      <div className="screen-bar">
        <div>
          <span style={{fontWeight:700, marginRight:8}}>🖨 Blank Template:</span>
          <span style={{color:"#22d3ee"}}>{equipType}</span>
          <span style={{marginLeft:16, color:"#888", fontSize:11}}>
            {layout === "table"  ? "Table format — up to 14 units per page" :
             layout === "dual"   ? "2-per-page format" :
             "Full A4 — single unit per page"}
          </span>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <span className="print-tip">Tip: Set margins to None in print dialog</span>
          <button className="print-btn" onClick={handlePrint}>Print / Save PDF</button>
        </div>
      </div>

      <div className="page-wrap">
        {layout === "table"  && <TableTemplate  equipType={equipType} />}
        {layout === "dual"   && <DualTemplate   equipType={equipType} />}
        {layout === "single" && <SingleTemplate equipType={equipType} />}
      </div>
    </>
  );
}

export default function InspectionTemplatePrintPage() {
  return (
    <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"#888"}}>Loading template…</div>}>
      <PrintPageInner />
    </Suspense>
  );
}
