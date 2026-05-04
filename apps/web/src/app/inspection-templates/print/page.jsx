// src/app/inspection-templates/print/page.jsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CertificateSheet from "@/components/certificates/CertificateSheet";

// Blank certificate — only equipment_type set, everything else empty
// CertificateSheet will render the correct template layout with all fields blank
function makeBlankCert(equipmentType) {
  return {
    id:                    null,
    certificate_number:    "",
    certificate_type:      "",
    equipment_type:        equipmentType,
    equipment_description: "",
    serial_number:         "",
    fleet_number:          "",
    manufacturer:          "",
    model:                 "",
    swl:                   "",
    working_pressure:      "",
    design_pressure:       "",
    test_pressure:         "",
    capacity_volume:       "",
    year_built:            "",
    client_name:           "",
    company:               "",
    location:              "",
    inspector_name:        "Moemedi Masupe",
    inspector_id:          "700117910",
    issue_date:            "",
    issued_at:             "",
    expiry_date:           "",
    inspection_date:       "",
    result:                "PASS",
    equipment_status:      "PASS",
    defects_found:         "",
    recommendations:       "",
    comments:              "",
    notes:                 "",
    extracted_data:        {},
    photo_evidence:        [],
    logo_url:              "/logo.png",
  };
}

const TOOLBAR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800&family=IBM+Plex+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
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
  .tp-content{
    padding-top:76px;
    display:flex;flex-direction:column;align-items:center;
    background:#e2e8f0;min-height:100vh;
    padding-bottom:40px;
  }
  @media print{
    .tp-toolbar{display:none!important}
    .tp-content{padding:0!important;background:white!important;display:block!important;min-height:unset!important}
    body{background:white!important}
    @page{size:A4;margin:0}
  }
`;

function TemplatePrintInner() {
  const sp     = useSearchParams();
  const router = useRouter();

  const equipType = decodeURIComponent(sp.get("type") || "");

  if (!equipType) {
    return (
      <>
        <style>{TOOLBAR_CSS}</style>
        <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#f0f6ff", fontSize:14 }}>
          No equipment type specified.{" "}
          <button onClick={() => router.back()} style={{ marginLeft:12, padding:"8px 16px", borderRadius:9, border:"none", background:"rgba(34,211,238,0.15)", color:"#22d3ee", cursor:"pointer", fontWeight:800, fontFamily:"inherit" }}>
            ← Back
          </button>
        </div>
      </>
    );
  }

  const blankCert = makeBlankCert(equipType);

  return (
    <>
      <style>{TOOLBAR_CSS}</style>

      {/* TOOLBAR */}
      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <div className="tp-toolbar-title">
            Blank Inspection Template — {equipType}
          </div>
          <div className="tp-toolbar-sub">
            All fields are blank — fill in manually after printing
          </div>
        </div>
        <div className="tp-btn-row">
          <button type="button" className="tp-btn tp-btn-back" onClick={() => router.back()}>← Back</button>
          <button type="button" className="tp-btn tp-btn-print" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* TEMPLATE — CertificateSheet with blank cert */}
      <div className="tp-content">
        <CertificateSheet
          certificate={blankCert}
          index={0}
          total={1}
          printMode={true}
        />
      </div>
    </>
  );
}

export default function TemplatePrintPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"rgba(240,246,255,0.5)", fontSize:13 }}>
        Loading template…
      </div>
    }>
      <TemplatePrintInner/>
    </Suspense>
  );
}
