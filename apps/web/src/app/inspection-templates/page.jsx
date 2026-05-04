// src/app/inspection-templates/page.jsx
"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const TEMPLATES = [
  // MACHINES
  { id:"telehandler",    label:"Telehandler",                   icon:"🏗", certType:"Load Test Certificate",       hasPV:true,  cat:"machine", desc:"Boom + fork arms + PV" },
  { id:"cherry_picker",  label:"Cherry Picker / AWP",           icon:"🚒", certType:"Load Test Certificate",       hasPV:false, cat:"machine", desc:"Boom + bucket/platform checklist" },
  { id:"forklift",       label:"Forklift",                      icon:"🏭", certType:"Load Test Certificate",       hasPV:false, cat:"machine", desc:"Mast + forks + brakes + tyres" },
  { id:"crane_truck",    label:"Crane Truck / Hiab",            icon:"🚛", certType:"Load Test Certificate",       hasPV:true,  cat:"machine", desc:"Full crane + hook + rope + PV" },
  { id:"tlb",            label:"TLB (Tractor Loader Backhoe)",  icon:"🚜", certType:"Certificate of Inspection",   hasPV:false, cat:"machine", desc:"Loader + backhoe + hydraulics" },
  { id:"frontloader",    label:"Front Loader / Wheel Loader",   icon:"🏗", certType:"Certificate of Inspection",   hasPV:false, cat:"machine", desc:"Bucket + hydraulics + ROPS" },
  { id:"service_truck",  label:"Service Truck",                 icon:"🔧", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Vehicle + tools + air receivers" },
  { id:"horse_trailer",  label:"Horse & Trailer",               icon:"🚛", certType:"Vehicle Registration Cert",   hasPV:true,  cat:"machine", desc:"Prime mover + trailer + PV" },
  { id:"water_bowser",   label:"Water Bowser",                  icon:"🚰", certType:"Pressure Test Certificate",   hasPV:true,  cat:"machine", desc:"Vessel + vehicle checklist" },
  { id:"tipper_truck",   label:"Tipper Truck",                  icon:"🚚", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Tipper body + hydraulics + PV" },
  { id:"bus",            label:"Bus / Personnel Carrier",       icon:"🚌", certType:"Vehicle Inspection Cert",     hasPV:false, cat:"machine", desc:"Full bus safety checklist" },
  { id:"compressor",     label:"Air Compressor",                icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  cat:"machine", desc:"Vessel + motor + safety devices" },
  { id:"diesel_bowser",  label:"Diesel Bowser",                 icon:"⛽", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Tank + fittings + vehicle + PV" },
  { id:"mixer_truck",    label:"Mixer Truck",                   icon:"🚛", certType:"Vehicle Inspection Cert",     hasPV:true,  cat:"machine", desc:"Drum + hydraulics + vehicle + PV" },
  { id:"other_machine",  label:"Other Machine / Equipment",     icon:"🔩", certType:"Certificate of Inspection",   hasPV:true,  cat:"machine", desc:"General machine checklist + PV" },
  // CRANES
  { id:"mobile_crane",   label:"Mobile Crane",                  icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Full crane + SLI + hook & rope" },
  { id:"overhead_crane", label:"Overhead / Gantry Crane",       icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Bridge + hoist + hooks + limits" },
  { id:"chain_block",    label:"Chain Block / Chain Hoist",     icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Chain, hook, latch, SWL" },
  { id:"lever_hoist",    label:"Lever Hoist / Tirfor",          icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Lever, chain, hooks, pawl" },
  { id:"davit",          label:"Davit / JIB Crane",             icon:"🏗", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Structure, slew, hoist, load test" },
  { id:"crane_boom",     label:"Crane Boom",                    icon:"📏", certType:"Load Test Certificate",       hasPV:false, cat:"crane",   desc:"Boom sections, pins, wear pads" },
  // SLINGS
  { id:"wire_rope_sling",label:"Wire Rope Sling",               icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Diameter, legs, ferrules, SWL" },
  { id:"chain_sling",    label:"Chain Sling (Single Leg)",      icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Links, hooks, grade, SWL" },
  { id:"multi_leg_sling",label:"Multi-Leg Chain Sling",         icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"All legs, master link, hooks" },
  { id:"webbing_sling",  label:"Webbing / Flat Web Sling",      icon:"🟩", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Stitching, labels, cuts, SWL" },
  { id:"round_sling",    label:"Round / Polyester Sling",       icon:"🔵", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Cover, core, SWL, colour code" },
  { id:"endless_sling",  label:"Endless Round Sling",           icon:"⭕", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Continuous loop, core, cover" },
  { id:"wire_sling",     label:"Wire Sling",                    icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"Wire body, eyes, ferrules, SWL" },
  { id:"4leg_chain_sling",label:"4-Legged Chain Sling",         icon:"⛓", certType:"Load Test Certificate",       hasPV:false, cat:"sling",   desc:"4 legs, master link, hooks, SWL" },
  // HOOKS & SHACKLES
  { id:"shackle_bow",    label:"Shackle — Bow / Anchor",        icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Pin, bow, WLL marking, cracks" },
  { id:"shackle_dee",    label:"Shackle — D / Dee",             icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Pin, dee body, thread, SWL" },
  { id:"crane_hook",     label:"Crane Hook",                    icon:"🪝", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Latch, A-B, A-C, swivel, cracks" },
  { id:"hook_block",     label:"Hook Block Assembly",           icon:"🪝", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Sheaves, hook, latch, reeving" },
  // CLAMPS
  { id:"plate_clamp",    label:"Plate Clamp",                   icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Jaws, locking, SWL, wear" },
  { id:"plate_clamp_v",  label:"Plate Clamp — Vertical",        icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Vertical jaw, cam, SWL" },
  { id:"lifting_clamp",  label:"Lifting Clamp — General",       icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Mechanism, SWL, deformation" },
  { id:"drum_clamp",     label:"Drum Clamp",                    icon:"🥁", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Jaws, locking pin, SWL" },
  { id:"vertical_clamp", label:"Vertical Clamp",                icon:"🔒", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Cam, spring, SWL, jaw condition" },
  { id:"spreader_beam",  label:"Spreader Beam",                 icon:"📏", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Beam, end fittings, SWL, welds" },
  { id:"lift_beam",      label:"Lift Beam / Lifting Frame",     icon:"⬆️", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Structure, pins, SWL, load test" },
  { id:"crawl_beam",     label:"Crawl Beam",                    icon:"📏", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Track, trolley, end stops, SWL" },
  { id:"universal_lift", label:"Universal Lifter",              icon:"⬆️", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"Frame, adjusters, SWL, load test" },
  { id:"lifting_acc",    label:"Lifting Accessory — General",   icon:"🔗", certType:"Load Test Certificate",       hasPV:false, cat:"rigging", desc:"General lifting accessory checklist" },
  // JACKS
  { id:"bottle_jack",    label:"Bottle Jack / Hydraulic Jack",  icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Cylinder, seal, SWL, load test" },
  { id:"axle_jack",      label:"Axle Jack",                     icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Frame, saddle, SWL, load test" },
  { id:"titan_jack",     label:"TITAN Hydraulic Jack",          icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"High-capacity jack, SWL, seals" },
  { id:"jack_stand",     label:"Jack Stand / Trestle Jack",     icon:"🦯", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Legs, locking pin, SWL, stability" },
  { id:"pallet_jack",    label:"Pallet Jack — Manual",          icon:"🔧", certType:"Load Test Certificate",       hasPV:false, cat:"jack",    desc:"Forks, pump, lowering valve, SWL" },
  { id:"hydraulic_pump", label:"Hydraulic Pump / Power Unit",   icon:"⚙️", certType:"Certificate of Inspection",   hasPV:false, cat:"jack",    desc:"Pump, hoses, pressure, fittings" },
  // FALL PROTECTION
  { id:"safety_harness", label:"Safety Harness — Full Body",    icon:"🦺", certType:"Certificate of Inspection",   hasPV:false, cat:"fall",    desc:"Straps, buckles, D-rings, webbing" },
  { id:"lanyard",        label:"Lanyard / Energy Absorbing",    icon:"🔗", certType:"Certificate of Inspection",   hasPV:false, cat:"fall",    desc:"Snap hooks, webbing, absorber pack" },
  { id:"rope_absorber",  label:"Rope Shock Absorber",           icon:"🔗", certType:"Certificate of Inspection",   hasPV:false, cat:"fall",    desc:"Absorber condition, stitching, hooks" },
  // PRESSURE
  { id:"air_receiver",   label:"Air Receiver / Pressure Vessel",icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Shell, safety valve, gauge, test" },
  { id:"oxygen_tank",    label:"Oxygen Tank / Cylinder",        icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Cylinder, valve, gauge, pressure" },
  { id:"sandblast_pot",  label:"Sandblasting Pot",              icon:"💨", certType:"Pressure Test Certificate",   hasPV:true,  cat:"pressure",desc:"Vessel + checklist + wall thickness" },
  { id:"portable_oven",  label:"Portable / Welding Oven",       icon:"🔥", certType:"Compliance Certificate",      hasPV:false, cat:"pressure",desc:"Temperature, electrical, condition" },
  // ROPE
  { id:"wire_rope",      label:"Wire Rope (Crane Rope)",        icon:"🪢", certType:"Load Test Certificate",       hasPV:false, cat:"rope",    desc:"Main + aux rope, drum, broken wires" },
  // OTHER
  { id:"fork_arm",       label:"Fork Arm / Tine",               icon:"🍴", certType:"Fork Arm Inspection Cert",    hasPV:false, cat:"other",   desc:"Length, thickness, wear%, cracks" },
  { id:"impact_wrench",  label:"Impact Wrench",                 icon:"🔧", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Tool condition, torque, trigger" },
  { id:"welding_machine",label:"Welding Machine",               icon:"⚡", certType:"Compliance Certificate",      hasPV:false, cat:"other",   desc:"Electrical, voltage, weight" },
  { id:"step_ladder",    label:"Step Ladder",                   icon:"🪜", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Rungs, feet, locking, SWL" },
  { id:"manual_rod",     label:"Manual Rod Handlers",           icon:"🔧", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Handles, grip, structural condition" },
  { id:"other_general",  label:"General / Other Equipment",     icon:"🔩", certType:"Certificate of Inspection",   hasPV:false, cat:"other",   desc:"Visual, functional, safety, SWL" },
];

const CATEGORIES = [
  { id:"machine",  label:"Machines & Vehicles",      color:"#22d3ee" },
  { id:"crane",    label:"Cranes & Hoists",           color:"#60a5fa" },
  { id:"sling",    label:"Slings",                    color:"#a78bfa" },
  { id:"rigging",  label:"Hooks, Shackles & Clamps",  color:"#fbbf24" },
  { id:"jack",     label:"Jacks & Stands",            color:"#f97316" },
  { id:"fall",     label:"Fall Protection",           color:"#f87171" },
  { id:"pressure", label:"Pressure Vessels & Ovens",  color:"#34d399" },
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
  function open(id) {
    window.open(`/inspection-templates/print?machine=${id}`, "_blank");
  }

  return (
    <AppLayout title="Inspection Templates">
      <style>{CSS}</style>
      <div className="pg">
        <div className="wrap">

          <div className="hero">
            <div className="hero-tag">Certificate Management · ISO 9001</div>
            <h1>Blank Inspection Templates</h1>
            <p>Click any equipment type to open a fully blank printable A4 form. All fields are empty — fill in manually on-site. Machines with pressure vessels include separate blank PV pages.</p>
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
                    <div key={t.id} className="card" onClick={() => open(t.id)}>
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
                          onClick={e => { e.stopPropagation(); open(t.id); }}>
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
