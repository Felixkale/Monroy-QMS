// src/app/certificates/cover-print/page.jsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CoverPage from "@/components/certificates/CoverPage";

const TOOLBAR_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  .pt-toolbar{position:fixed;top:0;left:0;right:0;z-index:100;background:#0b1d3a;border-bottom:2px solid #22d3ee;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'IBM Plex Sans',sans-serif}
  .pt-title{font-size:14px;font-weight:800;color:#f0f6ff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pt-hint{font-size:10px;color:rgba(240,246,255,0.45);margin-top:1px}
  .pt-btn-row{display:flex;gap:8px;flex-shrink:0}
  .pt-btn{padding:8px 16px;border-radius:9px;border:none;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent;min-height:38px}
  .pt-btn-back{background:rgba(255,255,255,0.06);color:#f0f6ff;border:1px solid rgba(148,163,184,0.2)}
  .pt-btn-print{background:linear-gradient(135deg,#22d3ee,#0891b2);color:#052e16}
  .pt-btn-save{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}
  .pt-content{padding-top:70px;background:#e2e8f0;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding-bottom:40px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media print{
    .pt-toolbar{display:none!important}
    .pt-content{padding:0!important;background:none!important;min-height:unset!important;display:block!important}
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

  function handlePrint() { window.print(); }

  async function handleSavePDF() {
    if (!ref.current) return;
    setSaving(true);
    try {
      if (!window.html2pdf) throw new Error("not loaded");
      const client = sp.get("client") || "Cover";
      await window.html2pdf()
        .set({
          margin: 0,
          filename: `${client.replace(/\s+/g, "_")}_Cover_${sp.get("year") || "2026"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: "avoid-all" },
        })
        .from(ref.current)
        .save();
    } catch (e) {
      window.print();
    }
    setSaving(false);
  }

  const client  = sp.get("client")       || "UNITRANS";
  const title   = sp.get("title")        || "Statutory Inspection";
  const year    = sp.get("year")         || "2026";
  const location= sp.get("location")     || "KHOEMACAU MINE";
  const period  = sp.get("period")       || year;
  const certs   = sp.get("certs")        || "";

  // Passed / Failed counts — sent as URL params during bulk/single print
  // e.g. ?passed=18&failed=3
  const passed  = sp.get("passed")  ?? null;
  const failed  = sp.get("failed")  ?? null;

  const preparedBy   = sp.get("preparedBy")   || "Andrew Kale";
  const preparedRole = sp.get("preparedRole") || "Inspector";
  const approvedBy   = sp.get("approvedBy")   || "Moemedi Masupe";
  const approvedRole = sp.get("approvedRole") || "Competent Person · ID: 700117910";

  return (
    <>
      <style>{TOOLBAR_CSS}</style>

      {/* TOOLBAR */}
      <div className="pt-toolbar">
        <div>
          <div className="pt-title">{client} — Cover Page</div>
          <div className="pt-hint">Save PDF → choose "Save as PDF" as printer for best results</div>
        </div>
        <div className="pt-btn-row">
          <button type="button" className="pt-btn pt-btn-back" onClick={() => router.back()}>← Back</button>
          <button type="button" className="pt-btn pt-btn-print" onClick={handlePrint}>🖨 Print</button>
          <button type="button" className="pt-btn pt-btn-save" onClick={handleSavePDF} disabled={saving}>
            {saving
              ? <><span style={{ width:12, height:12, borderRadius:"50%", border:"2px solid rgba(0,16,24,0.3)", borderTopColor:"#001018", animation:"spin 0.8s linear infinite", display:"inline-block" }}/>Saving…</>
              : <>⬇ Save PDF</>
            }
          </button>
        </div>
      </div>

      {/* COVER */}
      <div className="pt-content">
        <div ref={ref} style={{ display: "block" }}>
          <CoverPage
            client           = {client}
            title            = {title}
            year             = {year}
            location         = {location}
            preparedBy       = {preparedBy}
            preparedRole     = {preparedRole}
            approvedBy       = {approvedBy}
            approvedRole     = {approvedRole}
            inspectionPeriod = {period}
            totalCerts       = {certs}
            passedCount      = {passed}
            failedCount      = {failed}
            printMode        = {true}
          />
        </div>
      </div>
    </>
  );
}

export default function CoverPrintPage() {
  return (
    <Suspense fallback={<div style={{ background:"#070e18", minHeight:"100vh" }}/>}>
      <CoverPrint/>
    </Suspense>
  );
}
