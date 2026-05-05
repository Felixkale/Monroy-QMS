// src/app/inspection-templates/page.jsx
"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

// ── type= values must match routeType() in the print page ──────────────────
// quad-tackle : shackle, hook, eye bolt, fork arm, wire rope
// quad-machine: crane, telehandler, cherry picker, forklift, mixer truck,
//               diesel bowser, water bowser, grader, tlb, bus, compactor,
//               horse & trailer, + any other machine
// table       : wire rope sling, chain sling, bottle jack
// single      : pressure vessel, air receiver, boiler, autoclave

const TEMPLATES = [
  // MACHINES
  { type:"Telehandler",          label:"Telehandler",                   icon:"🏗", certType:"Load Test Certificate",       hasPV:true,  cat:"machine", desc:"Boom + fork arms + PV" },
  { type:"Cherry Picker",        label:"Cherry Picker / AWP",           icon:"🚒", certType:"Load Test Certificate",       hasPV:false, cat:"machine", desc:"Boom + bucket/platform checklist" },
  { type:"Forklift",             label:"Forklift",                      icon:"🏭", certType:"Load Test Certificate",       hasPV:false, cat:"machine", desc:"Mast + forks + brakes + tyres" },
  { type:"Crane Truck",          label:"Crane Truck / Hiab",            icon:"🚛", certType:"Load Test Certificate",       hasPV:true,  cat:"machine", desc:"Full crane + hook + rope + PV" },
  { type:"TLB",                  label:"TLB (Tractor Loader Backhoe)",  icon:"🚜", certType:"Certificate of Inspection",   hasPV:false, cat:"machine", desc:"Loader + backhoe + hydraulics" },
  { type:"Front Loader",         label:"Front Loader / Wheel Loader",   icon:"🏗", certType:"Certificate of Inspection",   hasPV:false, cat:"machine", desc:"Bucket + hydraulics + ROPS" },
  { type:"Service Truck",        label:"Service Truck",                 icon:"🔧", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Vehicle + tools + air receivers" },
  { type:"Horse & Trailer",      label:"Horse & Trailer",               icon:"🚛", certType:"Vehicle Registration Cert",   hasPV:false, cat:"machine", desc:"Prime mover + trailer reg" },
  { type:"Water Bowser",         label:"Water Bowser",                  icon:"🚰", certType:"Pressure Test Certificate",   hasPV:true,  cat:"machine", desc:"Tank + vehicle checklist + PV" },
  { type:"Tipper Truck",         label:"Tipper Truck",                  icon:"🚚", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Tipper body + hydraulics + PV" },
  { type:"Bus",                  label:"Bus / Personnel Carrier",       icon:"🚌", certType:"Vehicle Inspection Cert",     hasPV:false, cat:"machine", desc:"Full bus safety checklist" },
  { type:"Compactor",            label:"Compactor / Roller",            icon:"⚙️", certType:"Certificate of Inspection",   hasPV:true,  cat:"machine", desc:"Drum + vibration + PV" },
  { type:"Diesel Bowser",        label:"Diesel Bowser",                 icon:"⛽", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Tank + fittings + vehicle + PV" },
  { type:"Mixer Truck",          label:"Mixer Truck",                   icon:"🚛", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Drum + hydraulics + vehicle + PV" },
  { type:"Grader",               label:"Grader / Motor Grader",         icon:"🚧", certType:"Certificate of Inspection",   hasPV:true,  cat:"machine", desc:"Blade + circle drive + PV" },
  { type:"General Machine",      label:"Other Machine / Equipment",     icon:"🔩", certType:"Certificate of Inspection",   hasPV:true,  cat:"machine", desc:"General machine checklist + PV" },

  // CRANES
  { type:"Mobile Crane",         label:"Mobile Crane",                  icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Full crane + SLI + hook & rope" },
  { type:"Overhead Crane",       label:"Overhead / Gantry Crane",       icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Bridge + hoist + hooks + limits" },
  { type:"Chain Block",          label:"Chain Block / Chain Hoist",     icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Chain, hook, latch, SWL" },
  { type:"Lever Hoist",          label:"Lever Hoist / Tirfor",          icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Lever, chain, hooks, pawl" },
  { type:"Davit Crane",          label:"Davit / JIB Crane",             icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Structure, slew, hoist, load test" },
  { type:"Crane Boom",           label:"Crane Boom",                    icon:"📏", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Boom sections, pins, wear pads" },

  // SLINGS
  { type:"Wire Rope Sling",      label:"Wire Rope Sling",               icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Diameter, legs, ferrules, SWL" },
  { type:"Chain Sling",          label:"Chain Sling (Single Leg)",      icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Links, hooks, grade, SWL" },
  { type:"Multi-Leg Chain Sling",label:"Multi-Leg Chain Sling",         icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"All legs, master link, hooks" },
  { type:"Webbing Sling",        label:"Webbing / Flat Web Sling",      icon:"🟩", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Stitching, labels, cuts, SWL" },
  { type:"Round Sling",          label:"Round / Polyester Sling",       icon:"🔵", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Cover, core, SWL, colour code" },
  { type:"Wire Sling",           label:"Wire Sling",                    icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Wire body, eyes, ferrules, SWL" },
  { type:"4-Leg Chain Sling",    label:"4-Legged Chain Sling",          icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"4 legs, master link, hooks, SWL" },

  // HOOKS & SHACKLES
  { type:"Shackle",              label:"Shackle — Bow / Anchor",        icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Pin, bow, WLL marking, cracks" },
  { type:"D-Shackle",            label:"Shackle — D / Dee",             icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Pin, dee body, thread, SWL" },
  { type:"Crane Hook",           label:"Crane Hook",                    icon:"🪝", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Latch, A-B, A-C, swivel, cracks" },
  { type:"Hook Block",           label:"Hook Block Assembly",           icon:"🪝", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Sheaves, hook, latch, reeving" },

  // CLAMPS & BEAMS
  { type:"Lifting Clamp",        label:"Lifting Clamp — General",       icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Mechanism, SWL, deformation" },
  { type:"Plate Clamp",          label:"Plate Clamp",                   icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Jaws, locking, SWL, wear" },
  { type:"Drum Clamp",           label:"Drum Clamp",                    icon:"🥁", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Jaws, locking pin, SWL" },
  { type:"Spreader Beam",        label:"Spreader Beam",                 icon:"📏", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Beam, end fittings, SWL, welds" },
  { type:"Lift Beam",            label:"Lift Beam / Lifting Frame",     icon:"⬆️", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Structure, pins, SWL, load test" },
  { type:"Lifting Accessory",    label:"Lifting Accessory — General",   icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"General lifting accessory checklist" },

  // JACKS
  { type:"Bottle Jack",          label:"Bottle Jack / Hydraulic Jack",  icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Cylinder, seal, SWL, load test" },
  { type:"Axle Jack",            label:"Axle Jack",                     icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Frame, saddle, SWL, load test" },
  { type:"Jack Stand",           label:"Jack Stand / Trestle Jack",     icon:"🦯", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Legs, locking pin, SWL, stability" },
  { type:"Pallet Jack",          label:"Pallet Jack — Manual",          icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Forks, pump, lowering valve, SWL" },

  // FALL PROTECTION
  { type:"Safety Harness",       label:"Safety Harness — Full Body",    icon:"🦺", certType:"Certificate of Inspection",   hasPV:false, cat:"fall",    desc:"Straps, buckles, D-rings, webbing" },
  { type:"Lanyard",              label:"Lanyard / Energy Absorbing",    icon:"🔗", certType:"Certificate of Inspection",   hasPV:false, cat:"fall",    desc:"Snap hooks, webbing, absorber pack" },

  // PRESSURE
  { type:"Air Receiver",         label:"Air Receiver",                  icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Shell, safety valve, gauge, test" },
  { type:"Pressure Vessel",      label:"Pressure Vessel",               icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Full pressure vessel inspection" },
  { type:"Air Compressor",       label:"Air Compressor",                icon:"💨", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Vessel + motor + safety devices" },
  { type:"Sandblast Pot",        label:"Sandblasting Pot",              icon:"💨", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Vessel + checklist + wall thickness" },

  // ROPE
  { type:"Wire Rope",            label:"Wire Rope (Crane Rope)",        icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"rope",    desc:"Main + aux rope, drum, broken wires" },

  // OTHER
  { type:"Fork Arm",             label:"Fork Arm / Tine",               icon:"🍴", certType:"Fork Arm Inspection Cert",    hasPV:false, cat:"other",   desc:"Length, thickness, wear%, cracks" },
  { type:"Eye Bolt",             label:"Eye Bolt",                      icon:"🔩", certType:"Load Test Certificate",       hasPV:false, cat:"other",   desc:"Thread, shoulder, SWL, angle rating" },
  { type:"Step Ladder",          label:"Step Ladder",                   icon:"🪜", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Rungs, feet, locking, SWL" },
  { type:"Welding Machine",      label:"Welding Machine",               icon:"⚡", certType:"Compliance Certificate",      hasPV:false, cat:"other",   desc:"Electrical, voltage, condition" },
  { type:"General Equipment",    label:"General / Other Equipment",     icon:"🔩", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Visual, functional, safety, SWL" },
];

const CATEGORIES = [
  { id:"machine",  label:"Machines & Vehicles",      color:"#22d3ee" },
  { id:"crane",    label:"Cranes & Hoists",           color:"#60a5fa" },
  { id:"sling",    label:"Slings",                    color:"#a78bfa" },
  { id:"rigging",  label:"Hooks, Shackles & Clamps",  color:"#fbbf24" },
  { id:"jack",     label:"Jacks & Stands",            color:"#f97316" },
  { id:"fall",     label:"Fall Protection",           color:"#f87171" },
  { id:"pressure", label:"Pressure Vessels",          color:"#34d399" },
  { id:"rope",     label:"Wire Rope",                 color:"#22d3ee" },
  { id:"other",    label:"Other Equipment",           color:"#94a3b8" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.18);border-radius:99px}
  .pg{min-height:100vh;background:radial-gradient(ellipse 80% 40% at 10% 0%,rgba(34,211,238,0.05),transparent),radial-gradient(ellipse 60% 50% at 90% 100%,rgba(167,139,250,0.04),transparent),#070e18;color:#f0f6ff;font-family:'IBM Plex Sans',sans-serif;padding:24px;padding-bottom:60px}
  .wrap{max-width:1200px;margin:0 auto;display:grid;gap:22px}
  .hero{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:20px;padding:22px 26px;backdrop-filter:blur(20px);position:relative;overflow:hidden}
  .hero::before{content:'';position:absolute;top:0;right:0;width:300px;height:100%;background:radial-gradient(ellipse at right,rgba(34,211,238,0.06),transparent 70%);pointer-events:none}
  .hero-tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#22d3ee;margin-bottom:10px}
  .hero-tag::before{content:'';width:4px;height:16px;border-radius:2px;background:linear-gradient(to bottom,#22d3ee,rgba(34,211,238,0.3));flex-shrink:0}
  .hero h1{margin:0 0 6px;font-family:'Syne',sans-serif;font-size:clamp(20px,3vw,26px);font-weight:900;letter-spacing:-0.02em}
  .hero p{margin:0;color:rgba(240,246,255,0.45);font-size:13px;line-height:1.5}
  .hero-count{margin-top:10px;font-size:11px;color:rgba(240,246,255,0.3);font-weight:700}
  .cat-section{display:flex;flex-direction:column;gap:10px}
  .cat-hd{display:flex;align-items:center;gap:8px;padding:2px 0}
  .cat-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .cat-label{font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase}
  .cat-count{font-size:10px;color:rgba(240,246,255,0.28);font-weight:700}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:9px}
  .card{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.10);border-radius:11px;padding:12px;cursor:pointer;transition:all .14s;display:flex;flex-direction:column;gap:7px;-webkit-tap-highlight-color:transparent}
  .card:hover{border-color:rgba(34,211,238,0.28);background:rgba(34,211,238,0.05);transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.18)}
  .card:active{transform:scale(0.97)}
  .card-top{display:flex;align-items:flex-start;gap:9px}
  .card-icon{font-size:19px;flex-shrink:0;line-height:1}
  .card-label{font-size:12px;font-weight:800;color:#f0f6ff;line-height:1.3}
  .card-cert{font-size:8.5px;color:rgba(240,246,255,0.32);margin-top:2px;font-weight:600}
  .card-desc{font-size:9px;color:rgba(240,246,255,0.4);line-height:1.5}
  .card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:7px;border-top:1px solid rgba(148,163,184,0.08)}
  .pv-badge{font-size:8px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.22);color:#34d399}
  .no-pv{font-size:8px;color:rgba(240,246,255,0.18);font-weight:600}
  .print-btn{font-size:10px;font-weight:800;padding:5px 11px;border-radius:7px;border:none;background:linear-gradient(135deg,#22d3ee,#0891b2);color:#001018;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;-webkit-tap-highlight-color:transparent;white-space:nowrap;min-height:30px}
  .print-btn:hover{filter:brightness(1.1)}
  .footer-note{background:rgba(34,211,238,0.05);border:1px solid rgba(34,211,238,0.12);border-radius:10px;padding:10px 16px;font-size:11px;color:rgba(240,246,255,0.4);text-align:center}
  @media(max-width:640px){.pg{padding:14px}.grid{grid-template-columns:1fr 1fr}}
  @media(max-width:380px){.grid{grid-template-columns:1fr}}
`;

export default function InspectionTemplatesPage() {
  // Pass type= so the print page routing works correctly
  function open(type) {
    window.open(`/inspection-templates/print?type=${encodeURIComponent(type)}`, "_blank");
  }

  return (
    <AppLayout title="Inspection Templates">
      <style>{CSS}</style>
      <div className="pg">
        <div className="wrap">

          <div className="hero">
            <div className="hero-tag">Certificate Management · ISO 9001</div>
            <h1>Blank Inspection Templates</h1>
            <p>Click any equipment type to open a fully blank printable A4 form. All fields are empty — fill in manually on-site. Machines include a Pressure Vessel section where applicable.</p>
            <div className="hero-count">📋 {TEMPLATES.length} templates · {CATEGORIES.length} categories</div>
          </div>

          {CATEGORIES.map(cat => {
            const items = TEMPLATES.filter(t => t.cat === cat.id);
            if (!items.length) return null;
            return (
              <div key={cat.id} className="cat-section">
                <div className="cat-hd">
                  <span className="cat-dot" style={{background:cat.color}}/>
                  <span className="cat-label" style={{color:cat.color}}>{cat.label}</span>
                  <span className="cat-count">({items.length})</span>
                </div>
                <div className="grid">
                  {items.map(t => (
                    <div key={t.type} className="card" onClick={() => open(t.type)}>
                      <div className="card-top">
                        <span className="card-icon">{t.icon}</span>
                        <div>
                          <div className="card-label">{t.label}</div>
                          <div className="card-cert">{t.certType}</div>
                        </div>
                      </div>
                      <div className="card-desc">{t.desc}</div>
                      <div className="card-footer">
                        <span className={t.hasPV ? "pv-badge" : "no-pv"}>
                          {t.hasPV ? "✓ Incl. PV" : "No PV"}
                        </span>
                        <button type="button" className="print-btn"
                          onClick={e => { e.stopPropagation(); open(t.type); }}>
                          🖨 Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="footer-note">
            All {TEMPLATES.length} templates are fully blank — no database data is used. Inspector fills in all fields manually after printing.
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
