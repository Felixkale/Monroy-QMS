// src/app/bulk-print/page.jsx
"use client";

import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.90)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  .bp-toolbar{
    position:sticky;top:0;z-index:100;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:12px 20px;
    background:rgba(7,14,24,0.97);
    border-bottom:1px solid rgba(148,163,184,0.12);
    backdrop-filter:blur(16px);
    flex-wrap:wrap;
    -webkit-tap-highlight-color:transparent;
  }
  .bp-btn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .bp-btn{
    display:inline-flex;align-items:center;justify-content:center;gap:7px;
    padding:10px 18px;border-radius:11px;
    font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:800;
    cursor:pointer;border:none;
    min-height:44px;min-width:44px;
    -webkit-tap-highlight-color:transparent;
    transition:filter .15s,transform .15s;
  }
  .bp-btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px)}
  .bp-btn:active:not(:disabled){transform:scale(0.97)}
  .bp-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
  .bp-btn-save{background:linear-gradient(135deg,#22d3ee,#60a5fa);color:#001018}
  .bp-btn-print{background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16}
  .bp-btn-back{background:rgba(255,255,255,0.06);border:1px solid rgba(148,163,184,0.18)!important;color:#f0f6ff}

  .bp-info{display:flex;flex-direction:column;gap:2px;min-width:0}
  .bp-title{
    font-size:13px;font-weight:800;color:#f0f6ff;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;
  }
  .bp-sub{font-size:10px;color:rgba(240,246,255,0.40);font-family:'IBM Plex Mono',monospace}

  .bp-progress-overlay{
    position:fixed;inset:0;z-index:200;
    background:rgba(7,14,24,0.97);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:16px;padding:40px;
    font-family:'IBM Plex Sans',sans-serif;color:#f0f6ff;
  }
  .bp-spinner{
    width:52px;height:52px;border-radius:50%;
    border:3px solid rgba(34,211,238,0.15);border-top-color:#22d3ee;
    animation:spin 0.8s linear infinite;
  }
  .bp-progress-bar-wrap{
    width:260px;height:4px;background:rgba(148,163,184,0.12);border-radius:99px;overflow:hidden;
  }
  .bp-progress-bar{
    height:100%;border-radius:99px;
    background:linear-gradient(90deg,#22d3ee,#60a5fa);
    transition:width .4s ease;
  }

  @keyframes spin{to{transform:rotate(360deg)}}

  /* Content area — light grey so cert pages look elevated in the UI */
  .bp-content{
    min-height:100vh;
    background:#d8dde3;
    padding:24px;
    display:flex;
    flex-direction:column;
    align-items:center;
  }

  /*
   * KEY FIX: the certRef wrapper must be pure white with no padding/margin/gap.
   * html2canvas captures this element — any dark colour outside the cert pages
   * becomes a black/dark extra page in the PDF.
   */
  .bp-cert-wrap{
    background:#ffffff;
    padding:0;
    margin:0;
    display:block;
    width:794px; /* A4 at 96dpi */
    max-width:100%;
  }

  /* Each cert block — no gap between them, page-break only */
  .bp-cert-page{
    display:block;
    background:#ffffff;
    width:794px;
    max-width:100%;
    /* page-break-after is set inline per cert */
  }

  @media print{
    .bp-toolbar{display:none!important}
    .bp-content{
      background:white!important;
      padding:0!important;
      display:block!important;
    }
    .bp-cert-wrap{width:100%!important}
    .bp-cert-page{width:100%!important}
    body{background:white!important}
    @page{size:A4;margin:0}
  }
  @media(max-width:840px){
    .bp-cert-wrap{width:100%}
    .bp-cert-page{width:100%}
    .bp-content{padding:12px}
  }
  @media(max-width:768px){
    .bp-toolbar{padding:10px 14px}
    .bp-btn{padding:10px 14px;font-size:12px}
    .bp-title{max-width:160px;font-size:12px}
  }
  @media(max-width:480px){
    .bp-btn-row{width:100%}
    .bp-btn{flex:1}
    .bp-title{display:none}
    .bp-content{padding:8px}
  }
`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Build html2pdf options.
 * windowHeight is set to the element's actual scrollHeight so html2canvas
 * never captures empty dark space below the content.
 */
function pdfOpt(filename, el) {
  const h = el ? el.scrollHeight : 1122;
  return {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.97 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      letterRendering: true,
      backgroundColor: "#ffffff",   // ← force white — kills the dark bleed
      windowWidth: 794,
      windowHeight: h,              // ← match exact content height — no extra page
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    },
    pagebreak: { mode: ["css", "legacy"] },
  };
}

// ─── Inner component (needs useSearchParams inside Suspense) ─────────────────
function BulkPrintInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const certRef      = useRef(null);

  const [certs,          setCerts]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState("");
  const [uploadPhase,    setUploadPhase]    = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [html2pdfReady,  setHtml2pdfReady]  = useState(false);
  const [autoSaveDone,   setAutoSaveDone]   = useState(false);

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [searchParams]);

  // Load html2pdf from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.html2pdf) { setHtml2pdfReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload  = () => setHtml2pdfReady(true);
    s.onerror = () => console.warn("html2pdf CDN failed");
    document.head.appendChild(s);
  }, []);

  // Load certs from Supabase
  useEffect(() => {
    if (!ids.length) {
      setError("No certificate IDs provided.");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true); setError("");
      const { data, error: e } = await supabase
        .from("certificates")
        .select("*")
        .in("id", ids);
      if (e || !data?.length) {
        setError(e?.message || "No certificates found for the selected IDs.");
        setLoading(false);
        return;
      }
      const ordered = ids
        .map(id => data.find(c => String(c.id) === String(id)))
        .filter(Boolean);
      setCerts(ordered);
      setLoading(false);
    })();
  }, [ids]);

  // Auto-upload after render settles
  useEffect(() => {
    if (!certs.length || loading || autoSaveDone) return;
    const timer = setTimeout(() => {
      setAutoSaveDone(true);
      runAutoUpload();
    }, 3500);
    return () => clearTimeout(timer);
  }, [certs, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function waitForRender() {
    if (typeof document === "undefined") return;
    await document.fonts.ready;
    if (!certRef.current) return;
    const imgs = Array.from(certRef.current.querySelectorAll("img"));
    await Promise.all(imgs.map(img =>
      img.complete ? Promise.resolve() :
      new Promise(r => { img.onload = r; img.onerror = r; })
    ));
    await sleep(1500);
  }

  async function runAutoUpload() {
    if (!certRef.current) return;
    if (!window.html2pdf) { await sleep(2500); if (!window.html2pdf) return; }

    const missing = certs.filter(c => !c.pdf_url);
    if (!missing.length) { setUploadPhase("done"); return; }

    setUploadPhase("generating");
    setUploadProgress(5);

    try {
      await waitForRender();
      setUploadProgress(15);

      const certEls = Array.from(certRef.current.querySelectorAll("[data-cert-id]"));
      let done  = 0;
      const total = missing.length;

      for (const el of certEls) {
        const certId = el.getAttribute("data-cert-id");
        const cert   = missing.find(c => String(c.id) === String(certId));
        if (!cert) continue;

        setUploadPhase("uploading");

        const safeName = (cert.certificate_number || cert.id)
          .toString().replace(/[^a-zA-Z0-9_-]/g, "_");

        let blob;
        try {
          // Force white background on this element before capture
          const prevBg = el.style.background;
          el.style.background = "#ffffff";

          blob = await window.html2pdf()
            .set(pdfOpt(`${safeName}.pdf`, el))
            .from(el)
            .outputPdf("blob");

          el.style.background = prevBg;
        } catch (pdfErr) {
          console.warn(`PDF render failed for ${safeName}:`, pdfErr.message);
          done++;
          setUploadProgress(15 + Math.round((done / total) * 80));
          continue;
        }

        if (!blob || blob.size < 3000) {
          done++;
          setUploadProgress(15 + Math.round((done / total) * 80));
          continue;
        }

        const path = `generated/${safeName}.pdf`;
        const { data: sd, error: se } = await supabase.storage
          .from("certificates")
          .upload(path, blob, { contentType: "application/pdf", upsert: true });

        if (!se && sd) {
          const { data: ud } = supabase.storage.from("certificates").getPublicUrl(sd.path);
          if (ud?.publicUrl) {
            await supabase.from("certificates")
              .update({ pdf_url: ud.publicUrl })
              .eq("id", cert.id);
          }
        } else if (se) {
          console.warn(`Upload failed for ${safeName}:`, se.message);
        }

        done++;
        setUploadProgress(15 + Math.round((done / total) * 80));
        await sleep(80);
      }

      setUploadProgress(100);
      setUploadPhase("done");
    } catch (err) {
      console.warn("Auto-upload failed:", err.message);
      setUploadPhase("error");
    }
  }

  async function handleSavePDF() {
    if (!certRef.current || !window.html2pdf) {
      alert("PDF engine is still loading. Please wait a moment.");
      return;
    }
    setSaving(true); setSaveMsg("Generating PDF…");
    try {
      const clientName = certs[0]?.client_name || certs[0]?.company || "Certificates";
      const inspDate   = certs[0]?.inspection_date
        || (certs[0]?.issue_date ? certs[0].issue_date.split("T")[0] : "")
        || "batch";
      const fileName = `${clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${inspDate}.pdf`
        .replace(/__+/g, "_");

      const el = certRef.current;

      // Temporarily force white background on wrapper before capture
      const prevBg = el.style.background;
      el.style.background = "#ffffff";
      await sleep(100);

      await window.html2pdf()
        .set(pdfOpt(fileName, el))
        .from(el)
        .save();

      el.style.background = prevBg;

      setSaveMsg("✓ Saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error("PDF save failed:", err);
      setSaveMsg("Falling back to print…");
      setTimeout(() => { window.print(); setSaveMsg(""); }, 400);
    } finally {
      setSaving(false);
    }
  }

  const clientName = certs[0]?.client_name || certs[0]?.company || "";
  const inspDate   = certs[0]?.inspection_date || "";

  const phaseLabel = {
    generating: "Rendering PDFs…",
    uploading:  "Uploading to storage…",
    done:       "✓ All PDFs stored",
    error:      "Auto-upload failed (print still works)",
  }[uploadPhase] || "";

  const phaseColor = {
    generating: T.accent,
    uploading:  T.amber,
    done:       T.green,
    error:      T.red,
  }[uploadPhase] || T.textDim;

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="bp-progress-overlay">
        <div className="bp-spinner"/>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(240,246,255,0.7)" }}>
          Loading {ids.length} certificate{ids.length !== 1 ? "s" : ""}…
        </div>
      </div>
    </>
  );

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (error) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'IBM Plex Sans',sans-serif" }}>
        <div style={{ background: T.redDim, border: `1px solid ${T.redBrd}`, borderRadius: 16, padding: 28, color: T.red, fontSize: 14, fontWeight: 700, maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          {error}
          <br/>
          <button onClick={() => router.push("/bulk-export")}
            style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "none", background: T.redDim, color: T.red, cursor: "pointer", fontWeight: 800, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13 }}>
            ← Back to Bulk Export
          </button>
        </div>
      </div>
    </>
  );

  // ── MAIN ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {saving && (
        <div className="bp-progress-overlay">
          <div className="bp-spinner"/>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{saveMsg || "Generating PDF…"}</div>
          <div style={{ fontSize: 12, color: "rgba(240,246,255,0.40)", marginTop: 4 }}>
            {certs.length} certificate{certs.length !== 1 ? "s" : ""} — please wait
          </div>
          <div className="bp-progress-bar-wrap" style={{ marginTop: 8 }}>
            <div className="bp-progress-bar" style={{ width: "60%" }}/>
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="bp-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
          <div className="bp-info">
            <div className="bp-title">
              {clientName || `${certs.length} Certificates`}
            </div>
            <div className="bp-sub">
              {certs.length} cert{certs.length !== 1 ? "s" : ""}
              {inspDate ? ` · ${inspDate}` : ""}
              {phaseLabel && (
                <span style={{ color: phaseColor, marginLeft: 8 }}>{phaseLabel}</span>
              )}
            </div>
          </div>
          {(uploadPhase === "generating" || uploadPhase === "uploading") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div className="bp-progress-bar-wrap" style={{ width: 100 }}>
                <div className="bp-progress-bar" style={{ width: `${uploadProgress}%` }}/>
              </div>
              <span style={{ fontSize: 10, color: T.textDim, minWidth: 28 }}>{uploadProgress}%</span>
            </div>
          )}
          {uploadPhase === "done" && (
            <span style={{ fontSize: 11, fontWeight: 800, color: T.green, flexShrink: 0 }}>✓ Stored</span>
          )}
        </div>

        <div className="bp-btn-row">
          <button type="button" className="bp-btn bp-btn-back"
            onClick={() => router.push("/bulk-export")}
            style={{ border: "1px solid rgba(148,163,184,0.18)" }}>
            ← Back
          </button>
          <button type="button" className="bp-btn bp-btn-print"
            onClick={() => window.print()}>
            🖨 Print All
          </button>
          <button type="button" className="bp-btn bp-btn-save"
            onClick={handleSavePDF}
            disabled={saving || !html2pdfReady}
            title={!html2pdfReady ? "Loading PDF engine…" : "Download combined PDF"}>
            {saving ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,16,24,0.3)", borderTopColor: "#001018", animation: "spin 0.8s linear infinite", display: "inline-block" }}/>
                Saving…
              </>
            ) : (saveMsg || "⬇ Save PDF")}
          </button>
        </div>
      </div>

      {/* CERTIFICATE PAGES */}
      <div className="bp-content">
        {/*
          certRef wraps ONLY the cert pages.
          background:#ffffff and no padding = html2canvas captures only white cert content.
          No dark UI chrome = no extra black/dark page at the end.
        */}
        <div ref={certRef} className="bp-cert-wrap">
          {certs.map((cert, i) => (
            <div
              key={cert.id}
              data-cert-id={String(cert.id)}
              className="bp-cert-page"
              style={{
                pageBreakAfter: i < certs.length - 1 ? "always" : "avoid",
                breakAfter:     i < certs.length - 1 ? "page"   : "avoid",
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

// ─── Suspense wrapper (required by Next.js 14 for useSearchParams) ────────────
const CSS_FALLBACK = `@keyframes spin{to{transform:rotate(360deg)}}`;

export default function BulkPrintPage() {
  return (
    <Suspense fallback={
      <>
        <style>{CSS_FALLBACK}</style>
        <div style={{
          minHeight: "100vh", background: "#070e18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'IBM Plex Sans',sans-serif", color: "#f0f6ff",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "3px solid rgba(34,211,238,0.15)", borderTopColor: "#22d3ee",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }}/>
            <div style={{ fontSize: 14, color: "rgba(240,246,255,0.6)" }}>
              Preparing certificates…
            </div>
          </div>
        </div>
      </>
    }>
      <BulkPrintInner />
    </Suspense>
  );
}
