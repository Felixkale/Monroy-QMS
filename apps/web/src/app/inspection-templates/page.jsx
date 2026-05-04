// src/app/inspection-templates/page.jsx
"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const MACHINE_TYPES = [
  { id:"telehandler",    label:"Telehandler",                    icon:"🏗", certType:"Load Test Certificate",        hasPV:true,  desc:"Boom config + fork arms + PV" },
  { id:"cherry_picker",  label:"Cherry Picker / AWP",            icon:"🚒", certType:"Load Test Certificate",        hasPV:false, desc:"Boom + bucket/platform checklist" },
  { id:"forklift",       label:"Forklift",                       icon:"🏭", certType:"Load Test Certificate",        hasPV:false, desc:"Mast + forks + brakes + tyres" },
  { id:"tlb",            label:"TLB (Tractor Loader Backhoe)",   icon:"🚜", certType:"Certificate of Inspection",    hasPV:false, desc:"Loader + backhoe + hydraulics" },
  { id:"frontloader",    label:"Front Loader / Wheel Loader",    icon:"🏗", certType:"Certificate of Inspection",    hasPV:false, desc:"Bucket + hydraulics + ROPS" },
  { id:"service_truck",  label:"Service Truck",                  icon:"🔧", certType:"Vehicle Inspection Cert",      hasPV:true,  desc:"Vehicle + tools + air receivers" },
  { id:"horse_trailer",  label:"Horse & Trailer",                icon:"🚛", certType:"Vehicle Registration Cert",   hasPV:true,  desc:"Prime mover + trailer + PV" },
  { id:"crane_truck",    label:"Crane Truck / Hiab",             icon:"🚛", certType:"Load Test Certificate",        hasPV:true,  desc:"Full crane + hook + rope + PV" },
  { id:"water_bowser",   label:"Water Bowser",                   icon:"🚰", certType:"Pressure Test Certificate",   hasPV:true,  desc:"Vessel + vehicle checklist" },
  { id:"tipper_truck",   label:"Tipper Truck",                   icon:"🚚", certType:"Vehicle Inspection Cert",      hasPV:true,  desc:"Tipper body + hydraulics + PV" },
  { id:"bus",            label:"Bus / Personnel Carrier",        icon:"🚌", certType:"Vehicle Inspection Cert",      hasPV:false, desc:"Full bus safety checklist" },
  { id:"compressor",     label:"Air Compressor",                 icon:"⚙️", certType:"Pressure Test Certificate",   hasPV:true,  desc:"Vessel + motor + safety devices" },
  { id:"diesel_bowser",  label:"Diesel Bowser",                  icon:"⛽", certType:"Vehicle Inspection Cert",      hasPV:true,  desc:"Tank + fittings + vehicle + PV" },
  { id:"mixer_truck",    label:"Mixer Truck",                    icon:"🚛", certType:"Vehicle Inspection Cert",      hasPV:true,  desc:"Drum + hydraulics + vehicle + PV" },
  { id:"other",          label:"Other Machine / Equipment",      icon:"🔩", certType:"Certificate of Inspection",    hasPV:true,  desc:"General machine checklist + PV" },
];

const T = {
  bg:"#070e18", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.08)", accentBrd:"rgba(34,211,238,0.22)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.08)", greenBrd:"rgba(52,211,153,0.22)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.18);border-radius:99px}
  .it-page{min-height:100vh;background:radial-gradient(ellipse 80% 40% at 10% 0%,rgba(34,211,238,0.05),transparent),radial-gradient(ellipse 60% 50% at 90% 100%,rgba(167,139,250,0.04),transparent),#070e18;color:#f0f6ff;font-family:'IBM Plex Sans',sans-serif;padding:24px;padding-bottom:60px}
  .it-wrap{max-width:1100px;margin:0 auto;display:grid;gap:20px}
  .it-hero{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:20px;padding:22px 26px;backdrop-filter:blur(20px);position:relative;overflow:hidden}
  .it-hero::before{content:'';position:absolute;top:0;right:0;width:300px;height:100%;background:radial-gradient(ellipse at right,rgba(34,211,238,0.06),transparent 70%);pointer-events:none}
  .it-hero-tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#22d3ee;margin-bottom:10px}
  .it-hero-tag::before{content:'';width:4px;height:16px;border-radius:2px;background:linear-gradient(to bottom,#22d3ee,rgba(34,211,238,0.3));flex-shrink:0}
  .it-hero h1{margin:0 0 6px;font-family:'Syne',sans-serif;font-size:clamp(20px,3vw,26px);font-weight:900;letter-spacing:-0.02em}
  .it-hero p{margin:0;color:rgba(240,246,255,0.45);font-size:13px;line-height:1.5}
  .it-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .it-card{background:rgba(13,22,38,0.8);border:1px solid rgba(148,163,184,0.12);border-radius:14px;padding:16px;cursor:pointer;transition:all .15s;backdrop-filter:blur(12px);display:flex;flex-direction:column;gap:10px;-webkit-tap-highlight-color:transparent}
  .it-card:hover{border-color:rgba(34,211,238,0.3);background:rgba(34,211,238,0.06);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}
  .it-card:active{transform:scale(0.97)}
  .it-card-top{display:flex;align-items:flex-start;gap:10px}
  .it-card-icon{font-size:22px;flex-shrink:0;line-height:1}
  .it-card-label{font-size:13px;font-weight:800;color:#f0f6ff;line-height:1.3}
  .it-card-cert{font-size:10px;color:rgba(240,246,255,0.38);margin-top:3px;font-weight:600}
  .it-card-desc{font-size:10px;color:rgba(240,246,255,0.45);line-height:1.5}
  .it-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid rgba(148,163,184,0.1)}
  .it-pv-badge{font-size:9px;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);color:#34d399}
  .it-no-pv{font-size:9px;color:rgba(240,246,255,0.25);font-weight:600}
  .it-print-btn{font-size:11px;font-weight:800;padding:5px 12px;border-radius:8px;border:none;background:linear-gradient(135deg,#22d3ee,#0891b2);color:#001018;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;-webkit-tap-highlight-color:transparent}
  .it-print-btn:hover{filter:brightness(1.1)}
  @media(max-width:640px){.it-page{padding:14px}.it-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:400px){.it-grid{grid-template-columns:1fr}}
`;

export default function InspectionTemplatesPage() {
  const router = useRouter();

  function openTemplate(machineId) {
    window.open(`/inspection-templates/print?machine=${machineId}`, "_blank");
  }

  return (
    <AppLayout title="Inspection Templates">
      <style>{CSS}</style>
      <div className="it-page">
        <div className="it-wrap">

          <div className="it-hero">
            <div className="it-hero-tag">Certificate Management · ISO 9001</div>
            <h1>Blank Inspection Templates</h1>
            <p>Select an equipment type to open a fully blank, printable A4 inspection form. All fields are empty — fill in manually on-site. Machines with pressure vessels include separate PV pages.</p>
          </div>

          <div className="it-grid">
            {MACHINE_TYPES.map(m => (
              <div
                key={m.id}
                className="it-card"
                onClick={() => openTemplate(m.id)}
              >
                <div className="it-card-top">
                  <span className="it-card-icon">{m.icon}</span>
                  <div>
                    <div className="it-card-label">{m.label}</div>
                    <div className="it-card-cert">{m.certType}</div>
                  </div>
                </div>
                <div className="it-card-desc">{m.desc}</div>
                <div className="it-card-footer">
                  <span className={m.hasPV ? "it-pv-badge" : "it-no-pv"}>
                    {m.hasPV ? "✓ Incl. PV page" : "No PV"}
                  </span>
                  <button
                    type="button"
                    className="it-print-btn"
                    onClick={e => { e.stopPropagation(); openTemplate(m.id); }}
                  >
                    🖨 Print
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
