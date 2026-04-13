// src/app/certificates/bulk-print/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";
import { Suspense } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  @keyframes spin{to{transform:rotate(360deg)}}

  .bp-toolbar{
    position:sticky;top:0;z-index:100;
    display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:12px 20px;
    background:rgba(7,14,24,0.97);
    border-bottom:1px solid rgba(148,163,184,0.12);
    backdrop-filter:blur(16px);
    flex-wrap:wrap;
  }
  .bp-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:10px 20px;border-radius:11px;font-family:'IBM Plex Sans',sans-serif;
    font-size:13px;font-weight:800;cursor:pointer;border:none;
    min-height:44px;-webkit-tap-highlight-color:transparent;
  }
  .bp-content{
    background:#e8ecf0;
    padding:24px;
    display:flex;flex-direction:column;align-items:center;gap:20px;
  }
  .bp-cert-wrap{
    width:794px;
    max-width:100%;
  }

  @media print{
    .bp-toolbar{display:none!important}
    .bp-content{background:white!important;padding:0!important;gap:0!important}
    .bp-cert-wrap{width:100%!important;page-break-after:always}
    .bp-cert-wrap:last-child{page-break-after:auto}
    body{background:white!important}
    @page{size:A4;margin:0}
  }
  @media(max-width:860px){
    .bp-cert-wrap{width:100%}
    .bp-content{padding:12px}
  }
`;

function BulkPrintInner() {
  const searchParams = useSearchParams();
  const certRef = useRef(null);

  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [html2pdfReady, setHtml2pdfReady] = useState(false);

  const clientName    = searchParams.get("client") || "";
  const inspDate      = searchParams.get("date")   || "";
  const idsParam      = searchParams.get("ids")    || "";

  // Load html2pdf
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.html2pdf) { setHtml2pdfReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload  = () => setHtml2pdfReady(true);
    s.onerror = () => console.warn("html2pdf CDN failed");
    document.head.appendChild(s);
  }, []);

  // Load certs
  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      try {
        let query = supabase
          .from("certificates")
          .select("*")
          .order("certificate_number", { ascending: true })
          .limit(1000);

        if (idsParam) {
          // Specific IDs passed
          const ids = idsParam.split(",").filter(Boolean);
          query = supabase.from("certificates").select("*").in("id", ids).order("certificate_number", { ascending: true });
        } else {
          // Filter by client + date
          if (clientName) query = query.ilike("client_name", clientName.trim());
          if (inspDate)   query = query.eq("inspection_date", inspDate);
        }

        const { data, error: e } = await query;
        if (e) throw new Error(e.message);
        setCerts(data || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
  }, [clientName, inspDate, idsParam]);

  async function handleSavePDF() {
    if (!certRef.current || !window.html2pdf) return;
    setSaving(true);
    try {
      const label = clientName ? clientName.trim().replace(/\s+/g, "_") : "Certificates";
      const dateLabel = inspDate ? `_${inspDate}` : "";
      await window.html2pdf().set({
        margin: 0,
        filename: `${label}${dateLabel}.pdf`,
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: {
          scale: 2, useCORS: true, allowTaint: true,
          logging: false, letterRendering: true,
          windowWidth: 794, backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(certRef.current).save();
    } catch (err) {
      console.error(err);
      window.print();
    }
    setSaving(false);
  }

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"'IBM Plex Sans',sans-serif", color:"#f0f6ff" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", border:"3px solid rgba(34,211,238,0.15)", borderTopColor:"#22d3ee", animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontSize:14, fontWeight:600, color:"rgba(240,246,255,0.6)" }}>Loading {clientName ? `${clientName} certificates` : "certificates"}…</div>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'IBM Plex Sans',sans-serif" }}>
        <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:14, padding:"20px 24px", color:"#f87171", fontSize:14, fontWeight:700, maxWidth:400, textAlign:"center" }}>
          ⚠ {error}
        </div>
      </div>
    </>
  );

  if (!certs.length) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"rgba(240,246,255,0.4)", fontSize:14 }}>
        No certificates found for the selected filters.
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>

      <div className="bp-toolbar">
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:700, color:"rgba(240,246,255,0.7)" }}>
          {clientName || "All Clients"}{inspDate ? ` · ${inspDate}` : ""} · <span style={{ color:"#22d3ee" }}>{certs.length} certificates</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button className="bp-btn" onClick={() => window.close()}
            style={{ background:"rgba(255,255,255,0.06)", color:"#f0f6ff", border:"1px solid rgba(148,163,184,0.18)" }}>
            ← Close
          </button>
          <button className="bp-btn" onClick={() => window.print()}
            style={{ background:"linear-gradient(135deg,#34d399,#14b8a6)", color:"#052e16" }}>
            🖨 Print All
          </button>
          <button className="bp-btn" onClick={handleSavePDF} disabled={saving || !html2pdfReady}
            style={{ background:"linear-gradient(135deg,#22d3ee,#60a5fa)", color:"#001018", opacity: (saving || !html2pdfReady) ? 0.6 : 1 }}>
            {saving ? "Saving…" : "⬇ Save as PDF"}
          </button>
        </div>
      </div>

      <div className="bp-content">
        <div ref={certRef} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, width:"100%" }}>
          {certs.map((cert, i) => (
            <div key={cert.id} className="bp-cert-wrap">
              <CertificateSheet
                certificate={cert}
                index={i}
                total={certs.length}
                printMode
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function BulkPrintPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070e18", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid rgba(34,211,238,0.15)", borderTopColor:"#22d3ee", animation:"spin 0.8s linear infinite" }}/>
      </div>
    }>
      <BulkPrintInner/>
    </Suspense>
  );
}
