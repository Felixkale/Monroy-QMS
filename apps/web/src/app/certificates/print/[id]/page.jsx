// src/app/certificates/print/[id]/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.90)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  /* Toolbar — hidden on print */
  .pt-toolbar{
    position:sticky;top:0;z-index:100;
    display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:12px 20px;
    background:rgba(7,14,24,0.96);
    border-bottom:1px solid rgba(148,163,184,0.12);
    backdrop-filter:blur(16px);
    flex-wrap:wrap;
    -webkit-tap-highlight-color:transparent;
  }
  .pt-btn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pt-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:10px 18px;border-radius:11px;font-family:'IBM Plex Sans',sans-serif;
    font-size:13px;font-weight:800;cursor:pointer;border:none;
    min-height:44px;min-width:44px;
    -webkit-tap-highlight-color:transparent;
    transition:filter .15s,transform .15s;
  }
  .pt-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
  .pt-btn:active{transform:scale(0.97)}
  .pt-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}

  .pt-btn-save{background:linear-gradient(135deg,#22d3ee,#60a5fa);color:#001018}
  .pt-btn-print{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}
  .pt-btn-back{background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.18)!important;color:#f0f6ff}

  .pt-title{font-size:13px;font-weight:700;color:rgba(240,246,255,0.70);font-family:'IBM Plex Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}

  .pt-progress{
    position:fixed;top:0;left:0;right:0;z-index:200;
    background:rgba(7,14,24,0.97);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:16px;padding:40px;
    min-height:100vh;
    font-family:'IBM Plex Sans',sans-serif;
    color:#f0f6ff;
  }
  .pt-spinner{
    width:48px;height:48px;border-radius:50%;
    border:3px solid rgba(34,211,238,0.15);
    border-top-color:#22d3ee;
    animation:spin 0.8s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Page content area */
  .pt-content{
    min-height:100vh;
    background:#e8ecf0;
    padding:24px;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:20px;
  }

  /* Print — only show certificate, hide everything else */
  @media print{
    .pt-toolbar{display:none!important}
    .pt-content{background:white!important;padding:0!important}
    body{background:white!important}
    @page{size:A4;margin:0}
  }

  @media(max-width:768px){
    .pt-toolbar{padding:10px 14px}
    .pt-btn{padding:10px 14px;font-size:12px}
    .pt-title{max-width:160px;font-size:11px}
    .pt-content{padding:12px}
  }
  @media(max-width:480px){
    .pt-btn-row{width:100%}.pt-btn{flex:1}
    .pt-title{display:none}
  }
`;

function pickResult(c) {
  if (!c) return "UNKNOWN";
  const ex = c.extracted_data || {};
  for (const raw of [c.result, c.equipment_status, ex.result, ex.equipment_status]) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
    if (n === "UNKNOWN") continue;
    if (["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  }
  return "UNKNOWN";
}

export default function CertificatePrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const certRef = useRef(null);

  const [certs,setCerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");
  const [html2pdfLoaded,setHtml2pdfLoaded]=useState(false);

  // Load html2pdf.js from CDN
  useEffect(()=>{
    if (typeof window === "undefined") return;
    if (window.html2pdf) { setHtml2pdfLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => setHtml2pdfLoaded(true);
    script.onerror = () => console.warn("html2pdf failed to load — browser print fallback available");
    document.head.appendChild(script);
  },[]);

  useEffect(()=>{
    if (!id) return;
    async function load(){
      setLoading(true);setError("");
      const { data, error: e } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (e || !data) { setError(e?.message || "Certificate not found."); setLoading(false); return; }

      // If part of a folder, load all certs in folder
      if (data.folder_id) {
        const { data: folder } = await supabase
          .from("certificates")
          .select("*")
          .eq("folder_id", data.folder_id)
          .order("folder_position", { ascending: true });
        setCerts(folder?.length ? folder : [data]);
      } else {
        setCerts([data]);
      }
      setLoading(false);
    }
    load();
  },[id]);

  const certNumber  = certs[0]?.certificate_number || "Certificate";
  const folderName  = certs[0]?.folder_name || "";
  const clientName  = certs[0]?.client_name || "";
  const siteLocation= certs[0]?.location    || "";
  const isFolder    = certs.length > 1;
  const fileName   = `${certNumber.replace(/[^a-zA-Z0-9-]/g,"_")}.pdf`;

  async function handleSavePDF() {
    if (!certRef.current) return;
    setSaving(true);
    setSaveMsg("Generating PDF…");

    try {
      if (!window.html2pdf) throw new Error("html2pdf not loaded");

      const el = certRef.current;
      const opt = {
        margin:       0,
        filename:     fileName,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  {
          scale:       2,
          useCORS:     true,
          logging:     false,
          letterRendering: true,
        },
        jsPDF: {
          unit:        "mm",
          format:      "a4",
          orientation: "portrait",
          compress:    true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await window.html2pdf().set(opt).from(el).save();
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error("PDF save failed:", err);
      setSaveMsg("Falling back to print…");
      setTimeout(() => { window.print(); setSaveMsg(""); }, 400);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="pt-progress">
          <div className="pt-spinner" />
          <div style={{ fontSize:14, fontWeight:600, color:"rgba(240,246,255,0.6)" }}>Loading certificate…</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'IBM Plex Sans',sans-serif" }}>
          <div style={{ background:T.redDim, border:`1px solid ${T.redBrd}`, borderRadius:14, padding:"20px 24px", color:T.red, fontSize:14, fontWeight:700, maxWidth:400, textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:10 }}>⚠</div>
            {error}
            <br/>
            <button onClick={() => router.push("/certificates")}
              style={{ marginTop:14, padding:"9px 18px", borderRadius:10, border:"none", background:T.redDim, color:T.red, cursor:"pointer", fontWeight:700, fontFamily:"'IBM Plex Sans',sans-serif" }}>
              ← Back to Certificates
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Saving overlay */}
      {saving && (
        <div className="pt-progress" style={{ position:"fixed", zIndex:300 }}>
          <div className="pt-spinner" />
          <div style={{ fontSize:15, fontWeight:700 }}>{saveMsg || "Generating PDF…"}</div>
          <div style={{ fontSize:12, color:"rgba(240,246,255,0.45)" }}>Please wait, this may take a moment</div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="pt-toolbar">
        <div className="pt-title">
          {isFolder ? `${clientName} — ${certs.length} Certificates` : certNumber}
        </div>
        <div className="pt-btn-row">
          <button
            type="button"
            className="pt-btn pt-btn-back"
            onClick={() => router.push(`/certificates/${id}`)}
            style={{ border:"1px solid rgba(148,163,184,0.18)" }}
          >
            ← Back
          </button>

          <button
            type="button"
            className="pt-btn pt-btn-print"
            onClick={handlePrint}
          >
            🖨 Print
          </button>

          {isFolder && (
            <button
              type="button"
              className="pt-btn"
              onClick={() => {
                const params = new URLSearchParams({
                  client: clientName,
                  title:  "Statutory Inspection",
                  year:   new Date().getFullYear().toString(),
                  location: siteLocation,
                  period: new Date().toLocaleString("en-GB",{month:"long",year:"numeric"}),
                  certs:  String(certs.length),
                });
                window.open(`/certificates/cover-print?${params.toString()}`, `_blank`);
              }}
              style={{ background:"linear-gradient(135deg,#a78bfa,#7c3aed)", color:"#fff", border:"none" }}
            >
              📄 Print Cover
            </button>
          )}

          <button
            type="button"
            className="pt-btn pt-btn-save"
            onClick={handleSavePDF}
            disabled={saving || !html2pdfLoaded}
            title={!html2pdfLoaded ? "Loading PDF engine…" : "Save as PDF"}
          >
            {saving ? (
              <><span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(0,16,24,0.3)", borderTopColor:"#001018", animation:"spin 0.8s linear infinite", display:"inline-block" }} /> Saving…</>
            ) : saveMsg ? (
              <>{saveMsg}</>
            ) : (
              <>⬇ Save as PDF</>
            )}
          </button>
        </div>
      </div>

      {/* CERTIFICATE CONTENT */}
      <div className="pt-content">
        <div ref={certRef}>
          {certs.map((cert, i) => (
            <div
              key={cert.id}
              style={{
                marginBottom: i < certs.length - 1 ? 24 : 0,
                pageBreakAfter: i < certs.length - 1 ? "always" : "auto",
              }}
            >
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
