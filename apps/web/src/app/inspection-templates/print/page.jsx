// src/app/inspection-templates/print/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// BLANK INSPECTION TEMPLATE — Multi-unit A4 print
//
// ROUTING:
//   TABLE         → Wire Rope Sling, Chain Sling, Bottle Jack
//                   Batch row table — 14 units/page
//
//   QUAD MACHINE  → Crane, Telehandler, Cherry Picker, Forklift,
//                   Mixer Truck, Diesel Bowser, Water Bowser,
//                   Grader, TLB, Bus, Compactor, Horse & Trailer
//                   Shared header + 4 units/page
//                   Each unit: Reg / Fleet / Model
//                              Inspection checklist
//                              Onboard Pressure Vessel (full fields)
//                              Result + Signatures
//                   (Horse & Trailer: adds Trailer Reg row, NO PV section)
//
//   QUAD TACKLE   → Shackle, Hook, Eye Bolt, Fork Arm, Wire Rope (standalone)
//                   Shared header + 4 units/page
//                   Each unit: Tag/ID + Serial + SWL + specific tech fields
//                              Inspection checklist (NO Reg, NO Fleet, NO PV)
//                              Result + Signatures
//
//   SINGLE        → Pressure Vessel, Air Receiver, Boiler, Autoclave
//                   Full A4 — 1 unit/page
// ─────────────────────────────────────────────────────────────────────────────

"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* ══════════════════════════════════════════════════════════════
   ROUTING LISTS
══════════════════════════════════════════════════════════════ */

// Exact-match table types — batch row format, 14/page
const TABLE_TYPES  = ["wire rope sling","chain sling","bottle jack"];

// Single full-A4 page — pressure systems only
const SINGLE_TYPES = [
  "pressure vessel","air receiver","boiler","autoclave",
  "air compressor","sandblast pot","oxygen tank",
];

// Lifting tackle & accessories — NO Reg, NO Fleet, NO PV section
// These are matched against the full type string (lowercased)
const TACKLE_KEYWORDS = [
  // Shackles
  "shackle",
  // Hooks
  "hook","crane hook","grab hook","clevis hook","hook block",
  // Eyebolts
  "eye bolt","eyebolt",
  // Fork arms
  "fork arm",
  // Wire rope standalone (NOT sling — slings are TABLE above)
  "wire rope",
  // Clamps & beams
  "clamp","spreader beam","lift beam","lifting beam","crawl beam","lifting accessory","universal lifter",
  // Slings that are NOT wire rope sling / chain sling (those are TABLE)
  "webbing sling","round sling","wire sling","polyester sling","flat web sling",
  "multi-leg chain sling","4-leg chain sling","endless round sling",
  // Chain hoists & blocks (hand-operated lifting devices, no reg)
  "chain block","chain hoist","lever hoist","tirfor","davit","crane boom",
  // Fall protection
  "safety harness","harness","lanyard","rope absorber","shock absorber",
];

// Horse & trailer — vehicle identity + trailer reg row, NO PV section
const HT_TYPES = ["horse","trailer","lowbed","horse and trailer","horse & trailer"];

function routeType(raw) {
  const t = (raw || "").toLowerCase();

  // 1. Multi-leg / 4-leg / endless slings contain "chain sling" — catch BEFORE table check
  if (t.includes("multi-leg") || t.includes("4-leg") || t.includes("4 leg") ||
      t.includes("multi leg")  || t.includes("endless")) return "quad-tackle";

  // 2. TABLE — batch row 14/page: wire rope sling, chain sling, bottle jack
  if (TABLE_TYPES.some(k => t.includes(k))) return "table";

  // 3. SINGLE — full A4: pressure vessels & pressure systems
  if (SINGLE_TYPES.some(k => t.includes(k))) return "single";

  // 4. QUAD-TACKLE — lifting tackle & accessories: no Reg, no Fleet, no PV
  if (TACKLE_KEYWORDS.some(k => t.includes(k))) return "quad-tackle";

  // 5. QUAD-MACHINE — everything else: machines, vehicles, cranes with cabs
  return "quad-machine";
}

function isHT(raw) {
  const t = (raw || "").toLowerCase();
  return HT_TYPES.some(k => t.includes(k));
}

/* ══════════════════════════════════════════════════════════════
   COLOUR TOKENS
══════════════════════════════════════════════════════════════ */
const RED  = "#cc0000";
const NAVY = "#0b1d3a";
const LGREY= "#f4f4f4";
const MGREY= "#777";
const WHITE= "#ffffff";
const LINE = "#000000";

const pageStyle = {
  width:"210mm", minHeight:"297mm", maxHeight:"297mm",
  padding:"7mm 9mm 5mm", background:WHITE,
  fontFamily:"'Arial','Helvetica',sans-serif", fontSize:9, color:"#333",
  boxSizing:"border-box", display:"flex", flexDirection:"column",
  overflow:"hidden", pageBreakAfter:"always", breakAfter:"page",
};

/* ══════════════════════════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════════════════════════ */
function WL({ label, flex=1, mono }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex, minWidth:0 }}>
      <span style={{ fontSize:5.5, color:MGREY, lineHeight:1, marginBottom:1 }}>{label}</span>
      <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:11,
        fontFamily:mono?"monospace":"inherit" }}>&nbsp;</div>
    </div>
  );
}

function WR({ fields, mb=3 }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:mb }}>
      {fields.map((f,i) => <WL key={i} label={f.l} flex={f.f||1} mono={f.mono} />)}
    </div>
  );
}

function CK({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:2, marginBottom:2 }}>
      <div style={{ width:7,height:7, border:`1px solid ${LINE}`, flexShrink:0, marginTop:1 }} />
      <div style={{ width:7,height:7, border:`1px solid ${LINE}`, flexShrink:0, marginTop:1 }} />
      <span style={{ fontSize:6.5, lineHeight:1.2, flex:1 }}>{label}</span>
    </div>
  );
}

function SB({ title, children, flex, mb=3, s }) {
  return (
    <div style={{ border:"1px solid #ccc", marginBottom:mb,
      flex:flex||undefined, minHeight:0, ...s }}>
      <div style={{ background:NAVY, color:WHITE, fontWeight:700,
        fontSize:6.5, padding:"1.5px 4px", letterSpacing:0.3 }}>{title}</div>
      <div style={{ padding:"3px 4px" }}>{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE HEADER + FOOTER + SHARED IDENTITY ROW
══════════════════════════════════════════════════════════════ */
function PageHeader({ equipType, perPage }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      borderBottom:`2.5px solid ${RED}`, paddingBottom:5, marginBottom:5 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
        <div style={{ background:NAVY, color:WHITE, padding:"4px 8px", borderRadius:2,
          textAlign:"center", lineHeight:1.25 }}>
          <div style={{ fontSize:5.5, color:"#aaa", letterSpacing:1 }}>MONROY</div>
          <div style={{ fontSize:13, fontWeight:900 }}>M</div>
          <div style={{ fontSize:5.5, color:"#aaa" }}>(PTY) LTD</div>
        </div>
        <div>
          <div style={{ fontWeight:900, fontSize:10, color:NAVY, marginBottom:1 }}>MONROY (PTY) LTD</div>
          <div style={{ fontSize:6, color:MGREY, maxWidth:300, lineHeight:1.4 }}>
            Mobile Crane Hire · Rigging · NDT Testing · Scaffolding · Painting ·
            Inspection of Lifting Equipment &amp; Machinery · Pressure Vessels &amp; Air Receivers ·
            Steel Fabrication · Mechanical Engineering · Maintenance
          </div>
          <div style={{ fontSize:6, color:"#444", marginTop:2 }}>
            Mophane Avenue, Maun, Botswana &nbsp;|&nbsp; Tel: +267 XXX XXXX &nbsp;|&nbsp; www.monroy.bw
          </div>
        </div>
      </div>
      <div style={{ textAlign:"right", minWidth:148 }}>
        <div style={{ background:RED, color:WHITE, fontWeight:900, fontSize:8.5,
          padding:"3px 8px", borderRadius:2, marginBottom:3, display:"inline-block" }}>
          BLANK INSPECTION TEMPLATE
        </div>
        <div style={{ fontSize:8, fontWeight:700, color:NAVY }}>{(equipType||"").toUpperCase()}</div>
        <div style={{ fontSize:6.5, color:MGREY, marginTop:1 }}>{perPage}</div>
        <div style={{ fontSize:6, color:MGREY, marginTop:1 }}>
          Mines, Quarries, Works &amp; Machinery Act Cap 44:02
        </div>
      </div>
    </div>
  );
}

function SharedRow() {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:5 }}>
      <WL label="Client / Company"   flex={2} />
      <WL label="Site / Location"    flex={2} />
      <WL label="Date of Inspection" flex={1} />
      <WL label="Inspector Name"     flex={1.5} />
      <WL label="Certificate No."    flex={1} mono />
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{ marginTop:"auto", borderTop:`1px solid ${RED}`, paddingTop:3,
      display:"flex", justifyContent:"space-between", fontSize:6, color:MGREY }}>
      <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana · Quality · Safety · Excellence</span>
      <span>All inspections by a Competent Person — Cap 44:02 of Botswana</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHECKLISTS
══════════════════════════════════════════════════════════════ */
function getChecklist(raw) {
  const t = (raw || "").toLowerCase();

  if (t.includes("shackle")) return [
    "Body — no cracks, gouges or deformation",
    "Throat opening within tolerance (≤5% wear)",
    "Pin — not bent, no wear groove",
    "Pin thread — fully engaged & moused",
    "SWL stamped & legible on body",
    "Grade mark present & legible",
    "No corrosion pitting on body or pin",
    "Proof load test performed & recorded",
  ];

  if (t.includes("hook")) return [
    "Safety latch — present & functional",
    "Throat opening within 5% of nominal",
    "Twist ≤ 10° from plane of hook",
    "No cracks at shank or bowl",
    "No gouges from sling contact",
    "Wear at saddle < 10% diameter loss",
    "Swivel — free rotation, no seizure",
    "SWL / traceability mark legible",
  ];

  if (t.includes("eye bolt") || t.includes("eyebolt")) return [
    "Shoulder seated flush on mating surface",
    "Thread engagement ≥ 1× bolt diameter",
    "Eye ring — no cracks or deformation",
    "Thread — no stripping or cross-threading",
    "No bend or deformation at shank",
    "SWL & angle rating stamped & legible",
    "Locking / backing nut fitted",
    "Proof load test performed & recorded",
  ];

  if (t.includes("fork arm") || (t.includes("fork") && !t.includes("forklift"))) return [
    "Blade wear — heel thickness ≥ 90% original",
    "Tip thickness within tolerance",
    "Blade — no cracks (MPI/PT if required)",
    "Shank & heel — no deformation",
    "Lateral bending ≤ 0.5% of blade length",
    "Vertical bending ≤ 0.5% of blade length",
    "Hook & locking pawl condition",
    "SWL marking present & legible",
  ];

  if (t.includes("wire rope") && !t.includes("sling")) return [
    "Broken wires — count per lay length",
    "Broken wires at end terminations",
    "Diameter reduction > 3% of nominal",
    "External corrosion condition",
    "Internal corrosion (probe check)",
    "Kinking, crushing or bird-caging",
    "Abrasion / wear on outer wires",
    "End termination — type & condition",
    "Drum spooling & fleet angle OK",
    "Lubrication — adequate coverage",
    "Sheave groove condition",
    "Rope lay consistent along length",
  ];

  if (t.includes("crane") && !t.includes("overhead")) return [
    "Hook condition & safety latch",
    "Wire rope — broken wires, kinking, corrosion",
    "Sheaves & drum condition",
    "Hoist brake — function & holding",
    "Slew brake & lock",
    "Travel brake & drive",
    "Upper & lower limit switches",
    "Load moment indicator (LMI)",
    "Anti-two-block device",
    "Outriggers, pads & locks",
    "Boom structure, pins & welds",
    "Electrical systems & controls",
    "SWL markings legible in cab",
    "Load test performed & result",
  ];

  if (t.includes("overhead crane") || t.includes("eot") || t.includes("gantry")) return [
    "Hook & safety latch",
    "Wire rope / chain condition",
    "Hoist brake — function & drift",
    "Cross-travel & long-travel brakes",
    "Limit switches — upper, lower, travel",
    "End stops on all axes",
    "Rail & runway condition",
    "Structural girder — welds & deflection",
    "Electrical controls & pendant",
    "Overload protection device",
    "SWL marking on bridge",
    "Load test performed & result",
  ];

  if (t.includes("telehandler")) return [
    "Boom structure, pivot pins & bushes",
    "Carriage & attachment locking",
    "Hydraulic cylinders — no drift",
    "Hydraulic hoses & connections",
    "Tyres — tread, pressure & damage",
    "ROPS / FOPS structure integrity",
    "Load chart present & legible in cab",
    "Seat, seatbelt & restraint",
    "Overload protection device",
    "Stabilisers / outriggers & locks",
    "Lights, mirrors & indicators",
    "Engine oil, coolant, belts",
  ];

  if (t.includes("cherry picker") || t.includes("aerial") || t.includes("mewp") || t.includes("ewp")) return [
    "Platform structure & guardrails",
    "Platform gate & self-closing latch",
    "Self-levelling system function",
    "Emergency lowering — manual",
    "Tilt alarm & platform cut-out",
    "Overload protection device",
    "Hydraulic cylinders & seals",
    "Boom articulation & locking pins",
    "Outrigger pads & interlock",
    "Harness anchor points (EN795)",
    "Ground / base controls functional",
    "Platform controls — all axes",
  ];

  if (t.includes("forklift")) return [
    "Fork arms — wear, twist & cracks",
    "Mast rails, rollers & chain",
    "Hydraulic cylinder — no drift",
    "Hydraulic hoses & couplings",
    "Tyres & wheels",
    "Lights, horn & indicators",
    "Seatbelt & operator restraint",
    "Overhead guard (FOPS)",
    "Load backrest extension",
    "Service brake & parking brake",
    "Steering system",
    "Capacity plate legible in cab",
  ];

  if (t.includes("mixer") || t.includes("concrete truck")) return [
    "Drum shell — cracks, corrosion, fin wear",
    "Drum drive — PTO, gearbox & chain",
    "Discharge chute & scraper",
    "Water pump & spray bar",
    "Hydraulic system — no leaks",
    "Tyres & wheels",
    "Lights & indicators",
    "Service & parking brake",
    "Steering",
    "Frame & sub-frame integrity",
    "Engine — oil, coolant, air filter",
    "Safety & hazard markings",
  ];

  if (t.includes("diesel bowser") || t.includes("fuel bowser") || t.includes("fuel truck")) return [
    "Tank shell — dents, cracks, corrosion",
    "Bund / secondary containment",
    "Fuel pump & flowmeter condition",
    "Delivery hose — no cracking/perishing",
    "Nozzle & deadman handle",
    "Earthing / bonding point functional",
    "Emergency shut-off valves",
    "Pressure / vacuum vent valve",
    "Level gauge functional",
    "GHS / product hazard labels present",
    "Fire extinguisher on board",
    "Spill kit on board",
  ];

  if (t.includes("water bowser") || t.includes("water tanker")) return [
    "Tank shell — dents, cracks, corrosion",
    "Bund / overflow containment",
    "Water pump — prime & delivery",
    "Delivery hose & fittings",
    "Spray bar & nozzles (if fitted)",
    "Outlet valves — open/close",
    "Venting — no blockage",
    "Level gauge functional",
    "Pipe connections — no leaks",
    "Chassis & mounting structure",
    "Tyres & wheels",
    "Lights & indicators",
  ];

  if (t.includes("grader") || t.includes("motor grader")) return [
    "Blade & cutting edge — wear & cracks",
    "Moldboard & circle drive",
    "Blade hydraulic cylinders",
    "Drawbar & pivot pins",
    "Articulation joint & lock cylinder",
    "Tyres — tread, pressure & damage",
    "Service & parking brake",
    "Steering — front & rear",
    "ROPS cab structure",
    "Lights & indicators",
    "Engine — oil, coolant, air filter",
    "All blade axis controls functional",
  ];

  if (t.includes("tlb") || t.includes("backhoe") || t.includes("jcb")) return [
    "Bucket — edge wear, cracks & pins",
    "Boom & dipper arm — welds & pins",
    "Hydraulic cylinders — no drift/leaks",
    "Loader bucket & linkage",
    "Stabiliser legs & pads",
    "Tyres & wheels",
    "Service & parking brake",
    "Steering",
    "ROPS / FOPS cab structure",
    "Lights & indicators",
    "Engine — oil, coolant, belts",
    "All hydraulic functions operational",
  ];

  if (t.includes("bus") || t.includes("coach")) return [
    "Body structure — floor, pillars, roof",
    "Emergency exits — doors, windows, hatches",
    "Seats & seatbelts — all positions",
    "Service & parking brake",
    "Steering",
    "Tyres — tread, pressure & spare",
    "Lights, indicators & hazards",
    "Windscreen & wipers",
    "Fire extinguisher mounted & tagged",
    "First aid kit present",
    "Engine — oil, coolant, belts",
    "Exhaust — no leaks into cabin",
  ];

  if (t.includes("compactor") || t.includes("roller")) return [
    "Drum — no cracks or flat spots",
    "Drum bearing & vibration system",
    "Water sprinkler system",
    "Scraper blade condition",
    "Hydraulic system — no leaks",
    "Articulation joint",
    "Service & parking brake",
    "ROPS structure",
    "Operator controls & gauges",
    "Lights & indicators",
    "Engine — oil, coolant, belts",
    "Pad feet condition (if pad foot type)",
  ];

  if (t.includes("horse") || t.includes("trailer") || t.includes("lowbed")) return [
    "Fifth wheel / king pin — wear & lock",
    "Fifth wheel locking mechanism",
    "Air brake system — no leaks",
    "Brake chambers & slack adjusters",
    "Landing gear — extends & locks",
    "Lights & reflective markings",
    "Tyres — horse & trailer",
    "Chassis & cross-member integrity",
    "Load securing rings & lashing points",
    "Mudguards & fenders",
    "Safety chains / breakaway cables",
    "Suspension — springs & bushes",
  ];

  // Generic machine fallback
  return [
    "Visual inspection — no cracks or damage",
    "Functional test — all systems operational",
    "SWL / rated capacity marked & legible",
    "Safety devices present & functional",
    "Fasteners & fixings secure",
    "Lubrication adequate",
    "Load / function test performed",
    "Documentation reviewed & complete",
  ];
}

/* ══════════════════════════════════════════════════════════════
   TACKLE-SPECIFIC TECHNICAL FIELDS (no reg, no fleet, no PV)
══════════════════════════════════════════════════════════════ */
function getTackleIdFields(raw) {
  const t = (raw || "").toLowerCase();

  if (t.includes("shackle")) return {
    rows: [
      [{l:"Tag / ID No.",      f:1, mono:true},{l:"Type (Bow / D / Screw Pin)",f:2},{l:"Grade / Standard",f:1}],
      [{l:"Body Size (mm)",    f:1},{l:"SWL (t)",f:1},{l:"Proof Load (t)",f:1},{l:"Manufacturer",f:2}],
    ],
  };

  if (t.includes("hook")) return {
    rows: [
      [{l:"Tag / ID No.",      f:1, mono:true},{l:"Type (Clevis / Eye / Grab)",f:2},{l:"Grade / Standard",f:1}],
      [{l:"SWL (t)",           f:1},{l:"Throat Opening — Actual (mm)",f:1.5},{l:"Throat Max Allowed (mm)",f:1.5},{l:"Twist from Plane (°)",f:1}],
    ],
  };

  if (t.includes("eye bolt") || t.includes("eyebolt")) return {
    rows: [
      [{l:"Tag / ID No.",      f:1, mono:true},{l:"Type (Shouldered / Plain)",f:2},{l:"Thread Size",f:1},{l:"Material Grade",f:1}],
      [{l:"SWL Vertical (t)",  f:1},{l:"SWL @ 45° (t)",f:1},{l:"SWL @ 90° (t)",f:1},{l:"Proof Load (t)",f:1}],
    ],
  };

  if (t.includes("fork arm") || (t.includes("fork") && !t.includes("forklift"))) return {
    rows: [
      [{l:"Fork No. / ID",     f:1, mono:true},{l:"Pair (L / R)",f:1},{l:"Blade Length (mm)",f:1},{l:"Blade Width (mm)",f:1}],
      [{l:"Heel Thickness (mm)",f:1},{l:"Tip Thickness (mm)",f:1},{l:"SWL (t)",f:1},{l:"Load Centre (mm)",f:1}],
    ],
  };

  if (t.includes("wire rope")) return {
    rows: [
      [{l:"Rope ID / Ref",     f:1, mono:true},{l:"Construction (e.g. 6×36 IWRC)",f:2},{l:"Grade (e.g. 1770)",f:1}],
      [{l:"Nominal Dia. (mm)", f:1},{l:"Actual Dia. (mm)",f:1},{l:"Breaking Force (kN)",f:1},{l:"Length (m)",f:1}],
    ],
  };

  // Generic tackle fallback
  return {
    rows: [
      [{l:"Tag / ID No.",      f:1, mono:true},{l:"Description / Type",f:2},{l:"Standard / Grade",f:1}],
      [{l:"SWL (t)",           f:1},{l:"Proof Load (t)",f:1},{l:"Manufacturer",f:2}],
    ],
  };
}

/* ══════════════════════════════════════════════════════════════
   SHARED RESULT + SIGNATURES STRIP
══════════════════════════════════════════════════════════════ */
function ResultAndSign() {
  return (
    <>
      {/* Result */}
      <div style={{ border:"1px solid #ccc", padding:"2px 5px", marginBottom:3,
        display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:6.5, color:NAVY, marginRight:2 }}>RESULT:</span>
        {["PASS","FAIL","CONDITIONAL","REPAIR REQ."].map(r => (
          <span key={r} style={{ display:"flex", alignItems:"center", gap:2, fontSize:6.5 }}>
            <span style={{ display:"inline-block", width:7, height:7, border:`1px solid ${LINE}` }} />
            {r}
          </span>
        ))}
      </div>
      {/* Remarks */}
      <SB title="REMARKS / DEFECTS" mb={3}>
        {[0,1].map(i => (
          <div key={i} style={{ borderBottom:"1px solid #ddd", minHeight:10, marginBottom:3 }} />
        ))}
      </SB>
      {/* Signatures */}
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        {[["Inspector","ID / Cert No.","Signature"],["Client Rep","Date","Signature"]].map((cols,i) => (
          <div key={i} style={{ flex:1, border:"1px solid #ccc", padding:"2px 4px" }}>
            {cols.map((lbl,j) => (
              <div key={j} style={{ marginBottom:j<2?3:0 }}>
                <span style={{ fontSize:6, color:MGREY }}>{lbl}: </span>
                <span style={{ display:"inline-block", borderBottom:`1px solid ${LINE}`,
                  width:"55%", marginLeft:2 }}>&nbsp;</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MINI UNIT — MACHINE
   Reg No. / Fleet No. / Model → Checklist → PV → Result + Sign
   Horse & Trailer: adds Trailer Reg row, skips PV
══════════════════════════════════════════════════════════════ */
function MachineMiniUnit({ n, equipType }) {
  const ht = isHT(equipType);
  const checks = getChecklist(equipType);
  const half = Math.ceil(checks.length / 2);

  return (
    <div style={{ border:`1.5px solid ${NAVY}`, borderRadius:2, display:"flex",
      flexDirection:"column", overflow:"hidden", flex:1, minHeight:0 }}>
      {/* Unit bar */}
      <div style={{ background:NAVY, color:WHITE, fontWeight:900, fontSize:7.5,
        padding:"2px 5px", display:"flex", justifyContent:"space-between",
        alignItems:"center", flexShrink:0 }}>
        <span>UNIT {n}</span>
        <span style={{ fontWeight:400, fontSize:6, color:"#9db3cc" }}>
          {(equipType||"").toUpperCase()}
        </span>
      </div>

      <div style={{ padding:"3px 4px", flex:1, display:"flex", flexDirection:"column" }}>

        {/* ── MACHINE IDENTITY: Reg / Fleet / Model ── */}
        <SB title="MACHINE IDENTITY" mb={3}>
          <WR fields={[
            {l:"Registration No.", f:2, mono:true},
            {l:"Fleet No.",        f:1, mono:true},
            {l:"Make & Model",     f:2},
          ]} mb={0} />
          {ht && (
            <WR fields={[
              {l:"Trailer Registration No.", f:2, mono:true},
              {l:"Trailer Make & Model",     f:2},
              {l:"No. of Axles",             f:1},
            ]} mb={0} />
          )}
        </SB>

        {/* ── CHECKLIST ── */}
        <SB title="INSPECTION CHECKLIST   ☐ = Pass   ☐ = Fail" mb={3} flex={1}>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ flex:1 }}>
              {checks.slice(0, half).map((item,i) => <CK key={i} label={item} />)}
            </div>
            <div style={{ flex:1 }}>
              {checks.slice(half).map((item,i) => <CK key={i} label={item} />)}
            </div>
          </div>
        </SB>

        {/* ── ONBOARD PRESSURE VESSEL (machines only, not H&T) ── */}
        {!ht && (
          <SB title="ONBOARD PRESSURE VESSEL(S)" mb={3}>
            <WR fields={[
              {l:"PV Description / Location", f:2},
              {l:"Working Pressure (bar)",    f:1},
              {l:"Test Pressure (bar)",       f:1},
            ]} mb={3} />
            <WR fields={[
              {l:"Capacity / Volume (L)",  f:1},
              {l:"Safety Valve Set (bar)", f:1},
              {l:"Last Test Date",         f:1},
              {l:"Result (P / F)",         f:1},
            ]} mb={0} />
          </SB>
        )}

        <ResultAndSign />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MINI UNIT — LIFTING TACKLE
   Tag/ID + type-specific tech fields → Checklist → Result + Sign
   NO Registration, NO Fleet No., NO Pressure Vessel section
══════════════════════════════════════════════════════════════ */
function TackleMiniUnit({ n, equipType }) {
  const checks   = getChecklist(equipType);
  const techDef  = getTackleIdFields(equipType);
  const half     = Math.ceil(checks.length / 2);

  return (
    <div style={{ border:`1.5px solid ${NAVY}`, borderRadius:2, display:"flex",
      flexDirection:"column", overflow:"hidden", flex:1, minHeight:0 }}>
      {/* Unit bar */}
      <div style={{ background:NAVY, color:WHITE, fontWeight:900, fontSize:7.5,
        padding:"2px 5px", display:"flex", justifyContent:"space-between",
        alignItems:"center", flexShrink:0 }}>
        <span>UNIT {n}</span>
        <span style={{ fontWeight:400, fontSize:6, color:"#9db3cc" }}>
          {(equipType||"").toUpperCase()}
        </span>
      </div>

      <div style={{ padding:"3px 4px", flex:1, display:"flex", flexDirection:"column" }}>

        {/* ── TACKLE IDENTITY: tag, SWL, type-specific fields ── */}
        <SB title="EQUIPMENT IDENTITY" mb={3}>
          {techDef.rows.map((row,i) => (
            <WR key={i} fields={row} mb={i < techDef.rows.length-1 ? 3 : 0} />
          ))}
        </SB>

        {/* ── CHECKLIST ── */}
        <SB title="INSPECTION CHECKLIST   ☐ = Pass   ☐ = Fail" mb={3} flex={1}>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ flex:1 }}>
              {checks.slice(0, half).map((item,i) => <CK key={i} label={item} />)}
            </div>
            <div style={{ flex:1 }}>
              {checks.slice(half).map((item,i) => <CK key={i} label={item} />)}
            </div>
          </div>
        </SB>

        <ResultAndSign />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   QUAD PAGE — 4 units in 2×2 grid
══════════════════════════════════════════════════════════════ */
function QuadPage({ equipType, isTackle }) {
  return (
    <div className="a4-page" style={pageStyle}>
      <PageHeader equipType={equipType} perPage="4 units per page" />
      <SharedRow />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
        gridTemplateRows:"1fr 1fr", gap:5, flex:1, minHeight:0 }}>
        {[1,2,3,4].map(n => (
          isTackle
            ? <TackleMiniUnit key={n} n={n} equipType={equipType} />
            : <MachineMiniUnit key={n} n={n} equipType={equipType} />
        ))}
      </div>
      <PageFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABLE TEMPLATE — Wire Rope Sling / Chain Sling / Bottle Jack
   14 batch rows per page
══════════════════════════════════════════════════════════════ */
const TH_S = {
  border:"1px solid rgba(255,255,255,0.25)", padding:"3px 4px",
  fontWeight:700, fontSize:7, textAlign:"left",
};
const TD_S = {
  border:"1px solid #ccc", padding:"2px 3px", height:16, fontSize:7.5,
};

function TableTemplate({ equipType }) {
  const t = (equipType||"").toLowerCase();
  const ROWS = 14;
  let cols, checks;

  if (t.includes("wire rope sling")) {
    cols = [
      {l:"Tag / ID No.",      w:50},{l:"Diameter (mm)",w:46},{l:"Length (m)",w:42},
      {l:"No. of Legs",       w:36},{l:"Configuration",w:46},{l:"SWL (t)",   w:34},
      {l:"Termination Type",  w:54},
    ];
    checks = [
      "Eyes & ferrules / swaged fittings intact","Abrasion damage on rope body",
      "Kinking or twisting","SWL tag present & legible",
      "Core wire integrity OK","Corrosion — internal & external",
      "Bird-caging or core protrusion","End fitting security",
      "Broken wires at terminations","Deformation / flattening",
      "Rope diameter consistent","Lubrication condition",
    ];
  } else if (t.includes("chain sling")) {
    cols = [
      {l:"Tag / ID No.",      w:50},{l:"Chain Grade",w:42},{l:"Diameter (mm)",w:46},
      {l:"Length (m)",        w:42},{l:"No. of Legs",w:36},{l:"SWL (t)",     w:34},
      {l:"Master Link Type",  w:54},
    ];
    checks = [
      "Link condition — no cracks or gouges","Wear at crown & bearing points",
      "Master link & sub-link condition","Hooks & fittings — latches OK",
      "Grade mark legible on all components","Elongation check — max 5% per link",
      "Corrosion — pitting, general rust","SWL / traceability tag present",
      "Weld quality on master link","Deformation — bending or twisting",
      "No unauthorised repairs or welds","Coupling links & shortening clutches",
    ];
  } else {
    // Bottle Jack
    cols = [
      {l:"Jack No. / ID",      w:52},{l:"Rated Cap. (t)",w:52},{l:"Stroke (mm)",w:46},
      {l:"Extended Ht (mm)",   w:52},{l:"Closed Ht (mm)",w:48},{l:"Oil Level OK",w:44},
      {l:"Seals OK",           w:44},
    ];
    checks = [
      "Ram seals — no oil leaks","Ram surface — no scoring / corrosion",
      "Hydraulic oil level adequate","Pump handle & release valve",
      "Base plate — flat, no cracks","Load collar / bearing surface",
      "Safety collar / mechanical lock nut","Rated capacity marking legible",
      "Saddle / load pad condition","No visible cracks in body",
      "Pump mechanism — smooth operation","Overall serviceability",
    ];
  }

  return (
    <div className="a4-page" style={pageStyle}>
      <PageHeader equipType={equipType} perPage={`${ROWS} units per page`} />
      <div style={{ display:"flex", gap:8, marginBottom:5 }}>
        <WL label="Client / Company"   flex={2} />
        <WL label="Site / Location"    flex={2} />
        <WL label="Date of Inspection" flex={1} />
        <WL label="Inspector Name"     flex={1.5} />
        <WL label="Certificate No."    flex={1} mono />
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:7.5, marginBottom:5 }}>
        <thead>
          <tr style={{ background:NAVY, color:WHITE }}>
            <th style={{...TH_S, width:20}}>#</th>
            {cols.map((c,i) => <th key={i} style={{...TH_S, width:c.w}}>{c.l}</th>)}
            <th style={{...TH_S, width:36}}>P / F</th>
            <th style={{...TH_S, width:30}}>Sign</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({length:ROWS}).map((_,i) => (
            <tr key={i} style={{ background:i%2===0?WHITE:LGREY }}>
              <td style={{...TD_S, textAlign:"center", fontWeight:700, color:MGREY}}>{i+1}</td>
              {cols.map((_c,j) => <td key={j} style={TD_S} />)}
              <td style={{...TD_S, textAlign:"center", fontSize:7}}>
                <span style={{marginRight:4}}>☐P</span><span>☐F</span>
              </td>
              <td style={TD_S} />
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display:"flex", gap:8, marginBottom:5 }}>
        <SB title="INSPECTION CHECKLIST — applies to all units above   ☐ Pass  ☐ Fail" flex={1.2} mb={0}>
          <div style={{ fontSize:6.5, color:MGREY, marginBottom:3 }}>
            Tick each item. Note unit row numbers with defects in Remarks.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>{checks.slice(0,6).map((item,i) => <CK key={i} label={item} />)}</div>
            <div style={{ flex:1 }}>{checks.slice(6).map((item,i)  => <CK key={i} label={item} />)}</div>
          </div>
        </SB>
        <SB title="REMARKS / DEFECTS  (reference row # from table)" flex={1} mb={0}>
          {Array.from({length:9}).map((_,i) => (
            <div key={i} style={{ borderBottom:"1px solid #ddd", minHeight:12, marginBottom:3 }} />
          ))}
        </SB>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        {[
          ["Inspector Name","Inspector ID / Certificate No.","Inspector Signature"],
          ["Client Representative","Designation / Title","Client Signature & Date"],
        ].map((sig,i) => (
          <div key={i} style={{ flex:1, border:"1px solid #ccc", padding:"3px 6px" }}>
            {sig.map((l,j) => (
              <div key={j} style={{ display:"flex", flexDirection:"column", marginBottom:j<2?5:0 }}>
                <span style={{ fontSize:6.5, color:MGREY }}>{l}</span>
                <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:13 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <PageFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SINGLE TEMPLATE — Pressure Vessel / Air Receiver / Boiler
   Full A4 — 1 unit per page
══════════════════════════════════════════════════════════════ */
function SingleTemplate({ equipType }) {
  const t = (equipType||"").toLowerCase();
  const isAR = t.includes("air receiver");

  const checks = isAR ? [
    "Shell — no pitting, cracks or wall loss",
    "End plates & longitudinal seam welds",
    "Safety relief valve — set & pop-tested",
    "Pressure gauge — calibrated, zero check",
    "Auto-drain valve — functional",
    "Isolation valve — opens & closes fully",
    "Moisture trap / separator",
    "Pressure switch — cut-in & cut-out",
    "Compressor unload cycle",
    "Max allowable WP marked on vessel",
    "Hydrostatic test record on file",
    "Nameplate — legible & accessible",
    "Foundation & mounting secure",
    "Pipe connections — no leaks",
  ] : [
    "External visual — corrosion, deformation, cracks",
    "Internal visual inspection (where accessible)",
    "Shell & head plate — pitting, laminations",
    "Nozzle & flange face condition",
    "Safety valve — set pressure correct",
    "Safety valve — functional pop test",
    "Pressure gauge — calibrated, reads zero at ambient",
    "Pressure relief device(s) tagged & accessible",
    "Drain & vent valve — condition & operation",
    "Insulation condition (if fitted)",
    "Support saddles & foundation integrity",
    "Nameplate — stamped, legible, accessible",
    "Pressure test (hydraulic/pneumatic) performed",
    "Test pressure held for full required duration",
    "Welded joints — NDT performed (if required)",
    "Documentation & previous test records reviewed",
  ];

  return (
    <div className="a4-page" style={pageStyle}>
      <PageHeader equipType={equipType} perPage="1 unit per page" />
      <SB title="CERTIFICATE & EQUIPMENT DETAILS" mb={5}>
        <WR fields={[{l:"Certificate No.",f:1,mono:true},{l:"Inspection No.",f:1,mono:true},{l:"Issue Date",f:1},{l:"Expiry Date",f:1}]} />
        <WR fields={[{l:"Client / Company",f:2},{l:"Site / Location",f:2}]} />
        <WR fields={[{l:"Equipment Description",f:2},{l:"Equipment Type",f:1},{l:"Year Built",f:1}]} />
        <WR fields={[{l:"Manufacturer",f:2},{l:"Model",f:1},{l:"Serial No.",f:1,mono:true},{l:"Asset / Fleet No.",f:1,mono:true}]} />
        <WR fields={[{l:"Country of Origin",f:1},{l:"Design Standard / Code",f:2},{l:"Certificate Type",f:1}]} mb={0} />
      </SB>
      <SB title="TECHNICAL DATA" mb={5}>
        <WR fields={[{l:"Working Pressure (bar)",f:1},{l:"Design Pressure (bar)",f:1},{l:"Test Pressure (bar)",f:1},{l:"Pressure Unit",f:1}]} />
        <WR fields={[{l:"Capacity / Volume (L)",f:1},{l:"Shell Thickness (mm)",f:1},{l:"Medium / Fluid",f:1},{l:"Design Temperature (°C)",f:1}]} />
        <WR fields={[{l:"Safety Valve Set Pressure",f:1},{l:"No. of Safety Valves",f:1},{l:"Relief Valve Size",f:1},{l:"Last Hydrostatic Test Date",f:1}]} mb={0} />
      </SB>
      <div style={{ display:"flex", gap:8, flex:1, minHeight:0, marginBottom:5 }}>
        <SB title="INSPECTION CHECKLIST   ☐ = Pass   ☐ = Fail" flex={2} mb={0}>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>{checks.slice(0,Math.ceil(checks.length/2)).map((item,i) => <CK key={i} label={item} />)}</div>
            <div style={{ flex:1 }}>{checks.slice(Math.ceil(checks.length/2)).map((item,i) => <CK key={i} label={item} />)}</div>
          </div>
        </SB>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
          <SB title="TEST DATA" mb={0}>
            <WR fields={[{l:"Test Load / Pressure"},{l:"Test Method"}]} />
            <WR fields={[{l:"Test Duration"},{l:"Test Equipment / Ref"}]} />
            <WR fields={[{l:"Test Result",f:2}]} mb={0} />
          </SB>
          <div style={{ border:`1.5px solid ${NAVY}`, padding:"5px 7px" }}>
            <div style={{ fontWeight:700, fontSize:8, color:NAVY, marginBottom:5 }}>OVERALL RESULT</div>
            {["☐  PASS","☐  FAIL","☐  CONDITIONAL","☐  REPAIR REQUIRED"].map((r,i) => (
              <div key={i} style={{ fontSize:8.5, marginBottom:5 }}>{r}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background:"#eaf2fb", border:"1px solid #c2daf0",
        borderLeft:`4px solid ${NAVY}`, padding:"4px 8px", marginBottom:5, fontSize:7.5 }}>
        <strong style={{ color:NAVY }}>LEGAL FRAMEWORK &amp; COMPLIANCE DECLARATION — </strong>
        The inspection, testing and certification of the above equipment has been carried out by a
        <strong> Competent Person</strong> in full compliance with the requirements of the
        <strong> Mines, Quarries, Works and Machinery Act Cap 44:02 of Botswana</strong> and applicable
        regulations. Additional standard applied:&nbsp;
        <span style={{ display:"inline-block", borderBottom:`1px solid ${LINE}`, minWidth:180 }}>&nbsp;</span>
      </div>
      <SB title="REMARKS / DEFECTS / RECOMMENDATIONS" mb={5}>
        {Array.from({length:4}).map((_,i) => (
          <div key={i} style={{ borderBottom:"1px solid #ddd", minHeight:14, marginBottom:5 }} />
        ))}
      </SB>
      <div style={{ display:"flex", gap:10 }}>
        {[
          ["Inspector Name","Inspector ID / Certificate No.","Inspector Signature","Date"],
          ["Client Representative","Designation / Title","Client Signature","Date"],
        ].map((sig,i) => (
          <div key={i} style={{ flex:1, border:"1px solid #ccc", padding:"5px 7px" }}>
            {sig.map((l,j) => (
              <div key={j} style={{ display:"flex", flexDirection:"column", marginBottom:j<3?6:0 }}>
                <span style={{ fontSize:7, color:MGREY }}>{l}</span>
                <div style={{ borderBottom:`1px solid ${LINE}`, minHeight:14 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <PageFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════════════════ */
function PrintPageInner() {
  const params    = useSearchParams();
  const equipType = params.get("type") || "General Equipment";
  const layout    = routeType(equipType);

  const css = `
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#cbd5e1; }
    .a4-page {
      width:210mm; min-height:297mm; max-height:297mm;
      background:#fff; box-shadow:0 4px 20px rgba(0,0,0,0.20);
      margin:24px auto; overflow:hidden;
    }
    .topbar {
      position:fixed; top:0; left:0; right:0; z-index:999;
      background:#0b1d3a; color:#fff;
      display:flex; align-items:center; justify-content:space-between;
      padding:9px 22px; font-family:Arial,sans-serif; font-size:13px; gap:12px;
    }
    .pbtn {
      background:#cc0000; color:#fff; border:none;
      padding:7px 22px; border-radius:3px;
      font-weight:700; font-size:12px; cursor:pointer;
    }
    .pbtn:hover { background:#aa0000; }
    .wrap { padding-top:52px; padding-bottom:24px; }
    @media print {
      .topbar { display:none !important; }
      .wrap { padding-top:0 !important; padding-bottom:0 !important; }
      .a4-page { margin:0 !important; box-shadow:none !important; }
      html, body { background:white !important; }
    }
  `;

  const label =
    layout === "table"        ? "Batch table — 14 units per page" :
    layout === "quad-tackle"  ? "4 units per page — Lifting Tackle (no vehicle fields)" :
    layout === "quad-machine" ? "4 units per page — Machine / Vehicle" :
                                "Full A4 — 1 unit per page";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}} />
      <div className="topbar">
        <div>
          <span style={{fontWeight:700, marginRight:8}}>🖨 Blank Template:</span>
          <span style={{color:"#38bdf8", marginRight:14}}>{equipType}</span>
          <span style={{fontSize:11, color:"#94a3b8"}}>{label}</span>
        </div>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <span style={{fontSize:11, color:"#64748b"}}>
            Set printer margins to <strong style={{color:"#94a3b8"}}>None</strong>
          </span>
          <button className="pbtn" onClick={() => window.print()}>
            🖨 Print / Save PDF
          </button>
        </div>
      </div>
      <div className="wrap">
        {layout === "table"        && <TableTemplate  equipType={equipType} />}
        {layout === "quad-tackle"  && <QuadPage equipType={equipType} isTackle={true}  />}
        {layout === "quad-machine" && <QuadPage equipType={equipType} isTackle={false} />}
        {layout === "single"       && <SingleTemplate equipType={equipType} />}
      </div>
    </>
  );
}

export default function InspectionTemplatePrintPage() {
  return (
    <Suspense fallback={
      <div style={{ padding:60, textAlign:"center", color:"#888",
        fontFamily:"Arial", fontSize:14 }}>
        Loading template…
      </div>
    }>
      <PrintPageInner />
    </Suspense>
  );
}
