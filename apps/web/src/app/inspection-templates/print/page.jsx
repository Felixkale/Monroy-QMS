// src/app/inspection-templates/print/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INSPECTOR_NAME = "Moemedi Masupe";
const INSPECTOR_ID   = "700117910";
const COMPANY_NAME   = "Monroy (Pty) Ltd";

/* ── CHECKLISTS ─────────────────────────────────────────── */
const CHECKLISTS = {
  CRANE: [
    "Hook condition & safety latch",
    "Wire rope — broken wires, corrosion, kinking",
    "Sheaves & drums",
    "Brakes — hoist, slew, travel",
    "Limit switches — upper, lower, travel",
    "Electrical systems & controls",
    "Structural members & welds",
    "Outriggers / stabilisers",
    "Load test performed",
    "SWL markings legible",
    "Safety devices functional",
    "Lubrication adequate",
  ],
  WIRE_ROPE: [
    "Broken wires (count per lay)",
    "Corrosion — internal & external",
    "Kinking or crushing",
    "Reduction in diameter",
    "End terminations & sockets",
    "Lubrication condition",
    "Abrasion wear",
    "Core condition",
    "Bird-caging or waviness",
    "Fatigue cracking",
  ],
  WIRE_SLING: [
    "Eyes & ferrules / swaged fittings",
    "Abrasion damage on body",
    "Kinking or twisting",
    "SWL tag present & legible",
    "Angle factor markings",
    "Core wire integrity",
    "End fittings secure",
    "Deformation / flattening",
    "Corrosion",
    "Broken wires at terminations",
  ],
  PRESSURE_VESSEL: [
    "Shell — dents, cracks, corrosion",
    "Nozzles & flanges",
    "Relief / safety valve operation",
    "Pressure gauges calibrated",
    "Support structure & foundations",
    "Hydrostatic / pneumatic test",
    "Nameplate legible",
    "Drains & vents",
    "Insulation condition",
    "ASME / safety certification current",
  ],
  FORKLIFT: [
    "Fork tines — cracks, bend, wear",
    "Mast & carriage assembly",
    "Tyres — wear, damage, pressure",
    "Brakes — service & park",
    "Lights & horn functional",
    "Fluid levels — oil, water, fuel",
    "Overhead guard intact",
    "Seat belt present & functional",
    "Load backrest extension",
    "Controls — smooth operation",
    "Exhaust / emissions",
    "Battery / fuel system",
  ],
  MACHINE: [
    "Guards & covers secure",
    "Electrical systems & wiring",
    "Fasteners — loose / missing",
    "Lubrication — levels & condition",
    "Controls function correctly",
    "Emergency stop functional",
    "Safety devices operational",
    "Structural integrity",
    "Vibration / noise abnormal",
    "Seals & gaskets",
  ],
  DEFAULT: [
    "Visual inspection — general condition",
    "Functional test",
    "Safety devices operational",
    "Load / pressure test",
    "Labelling & markings legible",
    "Structural integrity",
    "Controls — correct operation",
    "Documentation current",
    "Maintenance records reviewed",
    "Compliance with standards",
  ],
};

function getChecklist(equipType) {
  const t = (equipType || "").toUpperCase();
  if (t.includes("CRANE") || t.includes("HOIST") || t.includes("DAVIT")) return { label:"Crane / Lifting Equipment", items: CHECKLISTS.CRANE };
  if (t.includes("WIRE ROPE") || t.includes("WIREROPE"))                  return { label:"Wire Rope",                  items: CHECKLISTS.WIRE_ROPE };
  if (t.includes("SLING") || t.includes("WIRE SLING"))                    return { label:"Wire Sling",                 items: CHECKLISTS.WIRE_SLING };
  if (t.includes("PRESSURE") || t.includes("VESSEL") || t.includes("COMPRESSOR")) return { label:"Pressure Vessel",   items: CHECKLISTS.PRESSURE_VESSEL };
  if (t.includes("FORKLIFT") || t.includes("FORK LIFT"))                  return { label:"Forklift",                  items: CHECKLISTS.FORKLIFT };
  if (t.includes("MACHINE") || t.includes("GENERATOR") || t.includes("PUMP") || t.includes("MOTOR")) return { label:"Machine / Equipment", items: CHECKLISTS.MACHINE };
  return { label:"General Equipment", items: CHECKLISTS.DEFAULT };
}

function formatDate(v) {
  if (!v) return "";
  try {
    const d = new Date(v + (v.includes("T") ? "" : "T00:00:00Z"));
    return d.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric", timeZone:"UTC" });
  } catch { return v; }
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
}

/* ── PRINT CSS ───────────────────────────────────────────── */
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

  *,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;padding:0;font-family:'IBM Plex Sans',sans-serif;background:#e2e8f0}

  /* TOOLBAR */
  .tp-toolbar{
    position:fixed;top:0;left:0;right:0;z-index:100;
    background:#0b1d3a;border-bottom:2px solid #22d3ee;
    padding:10px 20px;display:flex;align-items:center;
    justify-content:space-between;gap:12px;
    font-family:'IBM Plex Sans',sans-serif;
  }
  .tp-toolbar-left{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
  .tp-toolbar-title{font-size:13px;font-weight:800;color:#f0f6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tp-toolbar-sub{font-size:10px;color:rgba(240,246,255,0.40)}
  .tp-btn-row{display:flex;gap:8px;flex-shrink:0}
  .tp-btn{padding:8px 16px;border-radius:9px;border:none;font-size:12px;font-weight:800;
          cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;
          min-height:38px;-webkit-tap-highlight-color:transparent}
  .tp-btn-back{background:rgba(255,255,255,0.06);color:#f0f6ff;border:1px solid rgba(148,163,184,0.2)}
  .tp-btn-print{background:linear-gradient(135deg,#22d3ee,#0891b2);color:#001018}

  /* CONTENT AREA */
  .tp-content{
    padding-top:76px;
    display:flex;flex-direction:column;align-items:center;
    padding-bottom:40px;gap:0;
  }

  /* A4 PAGE */
  .tp-page{
    width:794px;max-width:100%;
    background:#ffffff;
    padding:28px 32px;
    box-shadow:0 4px 32px rgba(0,0,0,0.18);
    font-size:11px;
    line-height:1.5;
    color:#0f172a;
  }

  /* HEADER BAND */
  .tp-header{
    display:flex;align-items:stretch;justify-content:space-between;
    border:2px solid #0f172a;margin-bottom:0;
  }
  .tp-header-logo{
    display:flex;flex-direction:column;justify-content:center;
    padding:12px 18px;border-right:2px solid #0f172a;min-width:180px;
  }
  .tp-company{font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-0.01em}
  .tp-company-sub{font-size:9px;color:#475569;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-top:2px}
  .tp-header-title{
    flex:1;display:flex;align-items:center;justify-content:center;
    padding:12px 18px;text-align:center;
  }
  .tp-form-title{font-size:15px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;line-height:1.3}
  .tp-form-subtitle{font-size:9px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px}
  .tp-header-ref{
    display:flex;flex-direction:column;justify-content:center;align-items:flex-end;
    padding:12px 18px;border-left:2px solid #0f172a;min-width:160px;
  }
  .tp-ref-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b}
  .tp-ref-val{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:#0f172a;margin-top:1px}

  /* SECTION BLOCKS */
  .tp-section{border:1px solid #cbd5e1;margin-top:-1px}
  .tp-section-head{
    background:#0f172a;color:#f8fafc;
    padding:5px 12px;font-size:9px;font-weight:800;
    letter-spacing:0.12em;text-transform:uppercase;
  }
  .tp-section-head-accent{background:#0e7490}
  .tp-section-head-green{background:#065f46}

  /* GRID FIELDS */
  .tp-grid{display:grid;border-top:1px solid #e2e8f0}
  .tp-grid-2{grid-template-columns:1fr 1fr}
  .tp-grid-3{grid-template-columns:1fr 1fr 1fr}
  .tp-grid-4{grid-template-columns:1fr 1fr 1fr 1fr}

  .tp-field{
    padding:7px 12px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;
  }
  .tp-field:last-child,.tp-field.tp-field-last{border-right:none}
  .tp-field-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#64748b;margin-bottom:3px}
  .tp-field-value{
    font-size:11px;font-weight:600;color:#0f172a;
    font-family:'IBM Plex Mono',monospace;
    min-height:16px;
  }
  .tp-field-value.blank{
    border-bottom:1px solid #94a3b8;min-height:20px;
    color:#0f172a;
  }
  .tp-field-value.prefilled{color:#0e7490;font-weight:700}

  /* OBSERVATION / TEXT AREAS */
  .tp-textarea-field{padding:7px 12px;border-bottom:1px solid #e2e8f0}
  .tp-textarea-field .tp-field-label{margin-bottom:4px}
  .tp-lines{margin-top:4px}
  .tp-line{border-bottom:1px solid #cbd5e1;height:20px;margin-bottom:2px}

  /* CHECKLIST TABLE */
  .tp-checklist{width:100%;border-collapse:collapse;margin-top:-1px}
  .tp-checklist th{
    background:#1e293b;color:#f8fafc;padding:5px 10px;
    font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;
    border:1px solid #334155;text-align:center;
  }
  .tp-checklist th:first-child{text-align:left;width:60%}
  .tp-checklist td{
    padding:5px 10px;border:1px solid #e2e8f0;font-size:10px;color:#1e293b;
    vertical-align:middle;
  }
  .tp-checklist td:not(:first-child){text-align:center;width:13.3%}
  .tp-checklist tr:nth-child(even) td{background:#f8fafc}
  .tp-check-box{
    display:inline-block;width:14px;height:14px;
    border:1.5px solid #94a3b8;border-radius:2px;
  }
  .tp-item-num{
    display:inline-block;width:16px;font-family:'IBM Plex Mono',monospace;
    font-size:9px;color:#64748b;margin-right:4px;
  }

  /* RESULT SECTION */
  .tp-result-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #e2e8f0}
  .tp-result-box{
    padding:10px 12px;border-right:1px solid #e2e8f0;
    display:flex;align-items:center;gap:10px;
  }
  .tp-result-box:last-child{border-right:none}
  .tp-result-check{
    width:22px;height:22px;border:2px solid #94a3b8;border-radius:3px;flex-shrink:0;
  }
  .tp-result-label{font-size:12px;font-weight:800;color:#0f172a;letter-spacing:0.02em}
  .tp-result-sub{font-size:8px;color:#64748b;margin-top:1px}

  /* SIGNATURE BLOCK */
  .tp-sig-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0}
  .tp-sig-box{padding:10px 12px 16px;border-right:1px solid #e2e8f0}
  .tp-sig-box:last-child{border-right:none}
  .tp-sig-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:8px}
  .tp-sig-name{font-size:11px;font-weight:700;color:#0f172a;margin-bottom:2px}
  .tp-sig-id{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#64748b}
  .tp-sig-line{border-top:1px solid #94a3b8;margin-top:20px;padding-top:3px;font-size:8px;color:#94a3b8}
  .tp-sig-date{margin-top:10px}
  .tp-sig-date-label{font-size:8px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.08em}
  .tp-sig-date-line{border-bottom:1px solid #94a3b8;height:20px;margin-top:4px}

  /* FOOTER */
  .tp-footer{
    margin-top:12px;display:flex;justify-content:space-between;align-items:center;
    font-size:8px;color:#94a3b8;
    border-top:1px solid #e2e8f0;padding-top:6px;
  }

  /* DEFECTS TABLE */
  .tp-defects{width:100%;border-collapse:collapse}
  .tp-defects th{background:#7f1d1d;color:#fee2e2;padding:4px 10px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border:1px solid #991b1b;text-align:left}
  .tp-defects td{padding:5px 10px;border:1px solid #e2e8f0;font-size:10px;color:#1e293b;height:22px}
  .tp-defects tr:nth-child(even) td{background:#fff7f7}

  @media print {
    .tp-toolbar{display:none!important}
    .tp-content{padding:0!important;background:white!important;display:block!important}
    .tp-page{box-shadow:none!important;width:100%!important;padding:14px 18px!important}
    body{background:white!important}
    @page{size:A4;margin:8mm}
  }

  @media(max-width:860px){
    .tp-page{width:100%;padding:16px}
    .tp-grid-4{grid-template-columns:1fr 1fr}
  }
  @media(max-width:480px){
    .tp-toolbar{padding:8px 12px}
    .tp-grid-3{grid-template-columns:1fr 1fr}
  }
`;

/* ── FORM COMPONENT ──────────────────────────────────────── */
function TemplateForm({ cert }) {
  const { label: checklistLabel, items: checklistItems } = getChecklist(cert.equipment_type);

  const Field = ({ label, value, blank = false, span = 1, last = false }) => (
    <div className={`tp-field${last ? " tp-field-last" : ""}`} style={span > 1 ? { gridColumn:`span ${span}` } : {}}>
      <div className="tp-field-label">{label}</div>
      <div className={`tp-field-value ${value ? "prefilled" : "blank"}`}>{value || ""}</div>
    </div>
  );

  return (
    <div className="tp-page">

      {/* ── HEADER ── */}
      <div className="tp-header">
        <div className="tp-header-logo">
          <div className="tp-company">{COMPANY_NAME}</div>
          <div className="tp-company-sub">Lifting & Inspection Services</div>
        </div>
        <div className="tp-header-title">
          <div>
            <div className="tp-form-title">INSPECTION REPORT FORM</div>
            <div className="tp-form-subtitle">{checklistLabel} · ISO 9001:2015</div>
          </div>
        </div>
        <div className="tp-header-ref">
          <div className="tp-ref-label">Ref. Certificate</div>
          <div className="tp-ref-val">{cert.certificate_number || cert.id}</div>
          <div className="tp-ref-label" style={{ marginTop:6 }}>Template Date</div>
          <div className="tp-ref-val" style={{ fontSize:9 }}>{today()}</div>
        </div>
      </div>

      {/* ── SECTION 1: EQUIPMENT DETAILS ── */}
      <div className="tp-section">
        <div className="tp-section-head">1. Equipment Details</div>
        <div className="tp-grid tp-grid-3">
          <Field label="Equipment Type"    value={cert.equipment_type} />
          <Field label="Manufacturer"      value={cert.manufacturer} />
          <Field label="Model"             value={cert.model} last />
        </div>
        <div className="tp-grid tp-grid-3">
          <Field label="Serial Number"     value={cert.serial_number} />
          <Field label="Fleet / Asset No." value={cert.fleet_number} />
          <Field label="Reg. / Tag No."    value={cert.reg_number} last />
        </div>
        <div className="tp-grid tp-grid-4">
          <Field label="SWL / Capacity"    value={cert.swl} />
          <Field label="Working Pressure"  value={cert.working_pressure} />
          <Field label="Year Built"        value={cert.year_built} />
          <Field label="Asset Condition"   value="" last />
        </div>
        <div className="tp-grid tp-grid-2">
          <Field label="Equipment Description / Name" value={cert.equipment_description} span={2} last />
        </div>
      </div>

      {/* ── SECTION 2: INSPECTION DETAILS ── */}
      <div className="tp-section">
        <div className="tp-section-head tp-section-head-accent">2. Inspection Details</div>
        <div className="tp-grid tp-grid-3">
          <Field label="Client / Company"  value={cert.client_name} />
          <Field label="Site / Location"   value={cert.location} />
          <Field label="Department"        value="" last />
        </div>
        <div className="tp-grid tp-grid-4">
          <Field label="Inspection Date"   value="" />
          <Field label="Next Due Date"     value="" />
          <Field label="Inspection Type"   value="" />
          <Field label="Work Order No."    value="" last />
        </div>
        <div className="tp-grid tp-grid-3">
          <Field label="Previous Cert No." value={cert.certificate_number} />
          <Field label="Prev. Inspection"  value={formatDate(cert.inspection_date)} />
          <Field label="Prev. Result"      value={cert.result} last />
        </div>
      </div>

      {/* ── SECTION 3: INSPECTION CHECKLIST ── */}
      <div className="tp-section">
        <div className="tp-section-head">3. Inspection Checklist — {checklistLabel}</div>
        <table className="tp-checklist">
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
            {checklistItems.map((item, i) => (
              <tr key={i}>
                <td>
                  <span className="tp-item-num">{String(i + 1).padStart(2, "0")}</span>
                  {item}
                </td>
                <td><span className="tp-check-box"/></td>
                <td><span className="tp-check-box"/></td>
                <td><span className="tp-check-box"/></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SECTION 4: DEFECTS FOUND ── */}
      <div className="tp-section">
        <div className="tp-section-head" style={{ background:"#7f1d1d" }}>4. Defects / Non-Conformances Found</div>
        <table className="tp-defects">
          <thead>
            <tr>
              <th style={{ width:"5%" }}>No.</th>
              <th style={{ width:"40%" }}>Defect Description</th>
              <th style={{ width:"20%" }}>Location on Equipment</th>
              <th style={{ width:"20%" }}>Severity (High/Med/Low)</th>
              <th style={{ width:"15%" }}>Action Required</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map(n => (
              <tr key={n}>
                <td style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#94a3b8", textAlign:"center" }}>{n}</td>
                <td></td><td></td><td></td><td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SECTION 5: RECOMMENDATIONS ── */}
      <div className="tp-section">
        <div className="tp-section-head">5. Recommendations &amp; Corrective Actions</div>
        <div className="tp-textarea-field">
          <div className="tp-field-label">Recommendations</div>
          <div className="tp-lines">
            {[1,2,3].map(n => <div className="tp-line" key={n}/>)}
          </div>
        </div>
        <div className="tp-textarea-field">
          <div className="tp-field-label">Comments / Additional Notes</div>
          <div className="tp-lines">
            {[1,2].map(n => <div className="tp-line" key={n}/>)}
          </div>
        </div>
      </div>

      {/* ── SECTION 6: OVERALL RESULT ── */}
      <div className="tp-section">
        <div className="tp-section-head tp-section-head-green">6. Overall Inspection Result</div>
        <div className="tp-result-grid">
          <div className="tp-result-box">
            <div className="tp-result-check"/>
            <div>
              <div className="tp-result-label" style={{ color:"#065f46" }}>PASS</div>
              <div className="tp-result-sub">Equipment fit for service</div>
            </div>
          </div>
          <div className="tp-result-box">
            <div className="tp-result-check"/>
            <div>
              <div className="tp-result-label" style={{ color:"#92400e" }}>CONDITIONAL</div>
              <div className="tp-result-sub">Subject to repairs / monitoring</div>
            </div>
          </div>
          <div className="tp-result-box">
            <div className="tp-result-check"/>
            <div>
              <div className="tp-result-label" style={{ color:"#991b1b" }}>FAIL</div>
              <div className="tp-result-sub">Equipment out of service</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 7: SIGNATURES ── */}
      <div className="tp-section">
        <div className="tp-section-head">7. Authorisation &amp; Signatures</div>
        <div className="tp-sig-grid">
          <div className="tp-sig-box">
            <div className="tp-sig-label">Inspector</div>
            <div className="tp-sig-name">{INSPECTOR_NAME}</div>
            <div className="tp-sig-id">ID: {INSPECTOR_ID}</div>
            <div className="tp-sig-line">Signature</div>
            <div className="tp-sig-date">
              <div className="tp-sig-date-label">Date</div>
              <div className="tp-sig-date-line"/>
            </div>
          </div>
          <div className="tp-sig-box" style={{ borderRight:"none" }}>
            <div className="tp-sig-label">Competent Person / Client Representative</div>
            <div className="tp-sig-name" style={{ borderBottom:"1px solid #cbd5e1", minHeight:18, marginBottom:2 }}></div>
            <div className="tp-sig-id" style={{ borderBottom:"1px solid #cbd5e1", minHeight:16 }}></div>
            <div className="tp-sig-line">Signature</div>
            <div className="tp-sig-date">
              <div className="tp-sig-date-label">Date</div>
              <div className="tp-sig-date-line"/>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="tp-footer">
        <span>{COMPANY_NAME} · Inspection Report Form · {checklistLabel}</span>
        <span>Ref: {cert.certificate_number || cert.id} · Generated: {today()}</span>
        <span>ISO 9001:2015 · Page 1 of 1</span>
      </div>

    </div>
  );
}

/* ── PRINT PAGE ──────────────────────────────────────────── */
function TemplatePrintInner() {
  const sp     = useSearchParams();
  const router = useRouter();
  const certId = sp.get("certId");

  const [cert,    setCert]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!certId) { setError("No certificate ID provided."); setLoading(false); return; }
    (async () => {
      const { data, error: e } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", certId)
        .single();
      if (e || !data) { setError(e?.message || "Certificate not found."); setLoading(false); return; }
      setCert(data);
      setLoading(false);
    })();
  }, [certId]);

  if (loading) return (
    <>
      <style>{PRINT_CSS}</style>
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#f0f6ff" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(34,211,238,0.15)", borderTopColor:"#22d3ee", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
          <div style={{ fontSize:13, color:"rgba(240,246,255,0.5)" }}>Loading template…</div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  if (error || !cert) return (
    <>
      <style>{PRINT_CSS}</style>
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'IBM Plex Sans',sans-serif" }}>
        <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:16, padding:28, color:"#f87171", fontSize:14, fontWeight:700, maxWidth:400, textAlign:"center" }}>
          ⚠ {error || "Certificate not found."}<br/>
          <button onClick={() => router.back()} style={{ marginTop:14, padding:"8px 18px", borderRadius:9, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", cursor:"pointer", fontWeight:800, fontFamily:"'IBM Plex Sans',sans-serif" }}>← Back</button>
        </div>
      </div>
    </>
  );

  const { label: checklistLabel } = getChecklist(cert.equipment_type);

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* TOOLBAR */}
      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <div className="tp-toolbar-title">
            {cert.equipment_description || cert.equipment_type} — Inspection Template
          </div>
          <div className="tp-toolbar-sub">
            {cert.certificate_number} · {cert.client_name} · {checklistLabel}
          </div>
        </div>
        <div className="tp-btn-row">
          <button type="button" className="tp-btn tp-btn-back" onClick={() => router.back()}>← Back</button>
          <button type="button" className="tp-btn tp-btn-print" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* TEMPLATE */}
      <div className="tp-content">
        <TemplateForm cert={cert}/>
      </div>
    </>
  );
}

export default function TemplatePrintPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#f0f6ff", fontSize:13 }}>
        Loading…
      </div>
    }>
      <TemplatePrintInner/>
    </Suspense>
  );
}
