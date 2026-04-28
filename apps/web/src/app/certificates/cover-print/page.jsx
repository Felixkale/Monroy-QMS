// src/app/certificates/cover-print/page.jsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CoverPage from "@/components/certificates/CoverPage";

const TOOLBAR_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  .pt-toolbar{
    position:fixed;top:0;left:0;right:0;z-index:100;
    background:#0b1d3a;border-bottom:2px solid #22d3ee;
    padding:10px 20px;display:flex;align-items:center;
    justify-content:space-between;gap:12px;
    font-family:'IBM Plex Sans',sans-serif;
  }
  .pt-title{font-size:14px;font-weight:800;color:#f0f6ff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pt-hint{font-size:10px;color:rgba(240,246,255,0.45);margin-top:1px}
  .pt-btn-row{display:flex;gap:8px;flex-shrink:0}
  .pt-btn{padding:8px 16px;border-radius:9px;border:none;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent;min-height:38px}
  .pt-btn-back{background:rgba(255,255,255,0.06);color:#f0f6ff;border:1px solid rgba(148,163,184,0.2)}
  .pt-btn-print{background:linear-gradient(135deg,#22d3ee,#0891b2);color:#052e16}
  .pt-btn-save{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}

  /* content area */
  .pt-content{
    padding-top:72px;
    background:#e2e8f0;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:24px;
    padding-bottom:40px;
  }

  /* each cover wrapper — label above it in the UI, hidden on print */
  .pt-cover-section{display:flex;flex-direction:column;align-items:center;gap:8px}
  .pt-cover-label{
    font-family:'IBM Plex Sans',sans-serif;
    font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
    padding:4px 14px;border-radius:99px;
  }
  .pt-cover-label-pass{background:#dcfce7;color:#15803d;border:1px solid #86efac}
  .pt-cover-label-fail{background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5}

  @keyframes spin{to{transform:rotate(360deg)}}

  @media print{
    .pt-toolbar{display:none!important}
    .pt-content{
      padding:0!important;background:none!important;
      min-height:unset!important;gap:0!important;
      display:block!important;
    }
    .pt-cover-section{display:block!important}
    .pt-cover-label{display:none!important}
  }
`;

function CoverPrint() {
  const sp     = useSearchParams();
  const router = useRouter();
  const ref    = useRef(null);
  const [saving,    setSaving]    = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload  = () => setPdfLoaded(true);
    s.onerror = () => setPdfLoaded(false);
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch (e) {} };
  }, []);

  const client   = sp.get("client")       || "UNITRANS";
  const title    = sp.get("title")        || "Statutory Inspection";
  const year     = sp.get("year")         || "2026";
  const location = sp.get("location")     || "KHOEMACAU MINE";
  const period   = sp.get("period")       || year;

  const approvedBy   = sp.get("approvedBy")   || "Moemedi Masupe";
  const approvedRole = sp.get("approvedRole") || "Competent Person · ID: 700117910";

  // passed / failed come in as separate params per batch
  const passedParam = sp.get("passed");
  const failedParam = sp.get("failed");

  const passed = passedParam !== null ? parseInt(passedParam, 10) : null;
  const failed  = failedParam  !== null ? parseInt(failedParam,  10) : null;

  const hasPassed = passed !== null && passed > 0;
  const hasFailed  = failed  !== null && failed  > 0;
  const both = hasPassed && hasFailed;

  const sharedProps = { client, title, year, location, inspectionPeriod: period, approvedBy, approvedRole, printMode: true };

  function handlePrint() { window.print(); }

  async function handleSavePDF() {
    if (!ref.current) return;
    setSaving(true);
    try {
      if (!window.html2pdf) throw new Error("not loaded");
      await window.html2pdf()
        .set({
          margin: 0,
          filename: `${client.replace(/\s+/g, "_")}_Covers_${year}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(ref.current)
        .save();
    } catch (e) {
      window.print();
    }
    setSaving(false);
  }

  const coverCount = (hasPassed ? 1 : 0) + (hasFailed ? 1 : 0);

  return (
    <>
      <style>{TOOLBAR_CSS}</style>

      {/* TOOLBAR */}
      <div className="pt-toolbar">
        <div>
          <div className="pt-title">
            {client} — Cover{coverCount > 1 ? "s" : ""} ({coverCount === 2 ? "Pass + Fail" : hasFailed ? "Failed" : "Passed"})
          </div>
          <div className="pt-hint">
            {both ? "2 covers will print — one per status" : "Click Print or Save PDF"}
          </div>
        </div>
        <div className="pt-btn-row">
          <button type="button" className="pt-btn pt-btn-back" onClick={() => router.back()}>← Back</button>
          <button type="button" className="pt-btn pt-btn-print" onClick={handlePrint}>🖨 Print</button>
          <button type="button" className="pt-btn pt-btn-save" onClick={handleSavePDF} disabled={saving}>
            {saving
              ? <><span style={{ width:12,height:12,borderRadius:"50%",border:"2px solid rgba(0,16,24,0.3)",borderTopColor:"#001018",animation:"spin 0.8s linear infinite",display:"inline-block" }}/>Saving…</>
              : <>⬇ Save PDF</>}
          </button>
        </div>
      </div>

      {/* COVERS — stacked list */}
      <div className="pt-content">
        <div ref={ref} style={{ display: "block" }}>

          {/* PASSED cover */}
          {hasPassed && (
            <div className="pt-cover-section" style={{ pageBreakAfter: hasFailed ? "always" : "avoid", breakAfter: hasFailed ? "page" : "avoid" }}>
              <div className="pt-cover-label pt-cover-label-pass">✓ Passed Certificates — {passed}</div>
              <CoverPage
                {...sharedProps}
                totalCerts={String(passed)}
                passedCount={String(passed)}
                failedCount="0"
              />
            </div>
          )}

          {/* FAILED cover */}
          {hasFailed && (
            <div className="pt-cover-section" style={{ pageBreakAfter: "avoid", breakAfter: "avoid" }}>
              <div className="pt-cover-label pt-cover-label-fail">✗ Failed / Discarded Certificates — {failed}</div>
              <CoverPage
                {...sharedProps}
                totalCerts={String(failed)}
                passedCount="0"
                failedCount={String(failed)}
              />
            </div>
          )}

          {/* Fallback — no counts passed at all, render a plain cover */}
          {!hasPassed && !hasFailed && (
            <div className="pt-cover-section">
              <CoverPage {...sharedProps} totalCerts={sp.get("certs") || ""} passedCount={null} failedCount={null}/>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function CoverPrintPage() {
  return (
    <Suspense fallback={<div style={{ background: "#070e18", minHeight: "100vh" }}/>}>
      <CoverPrint/>
    </Suspense>
  );
}
