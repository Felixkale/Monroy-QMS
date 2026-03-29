// src/app/certificates/print/[id]/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

function normalizeId(v) { return Array.isArray(v) ? v[0] : v; }

export default function PrintCertificatePage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = normalizeId(params?.id);

  const [loading, setLoading] = useState(true);
  const [rows,    setRows]    = useState([]);
  const [error,   setError]   = useState("");
  const autoTriggered = useRef(false);

  useEffect(() => { if (id) loadPrintRows(); }, [id]);

  // Auto-trigger print dialog once loaded — so opening in new tab immediately saves as PDF
  useEffect(() => {
    if (!loading && rows.length > 0 && !error && !autoTriggered.current) {
      autoTriggered.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [loading, rows, error]);

  async function loadPrintRows() {
    setLoading(true); setError("");
    const { data: cert, error: e } = await supabase
      .from("certificates").select("*").eq("id", id).maybeSingle();
    if (e || !cert) {
      setRows([]); setError(e?.message || "Certificate not found.");
      setLoading(false); return;
    }
    // Always render single cert — folder certs open in their own tabs
    setRows([cert]);
    setLoading(false);
  }

  return (
    <div style={{ background:"#0d1117", minHeight:"100vh", fontFamily:"'IBM Plex Sans',-apple-system,sans-serif" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        @page{size:A4;margin:0}
        @media print{
          .print-toolbar{display:none!important}
          body{background:#ffffff!important}
          .print-page-wrap{padding:0!important;margin:0!important;max-width:100%!important}
        }
        .print-btn-row{display:flex;gap:10px;flex-wrap:wrap}
        @media(max-width:600px){
          .print-toolbar-inner{flex-direction:column!important;gap:12px!important}
          .print-btn-row{width:100%}
          .print-btn-row button{flex:1}
          .print-toolbar-title{font-size:16px!important}
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="print-toolbar" style={{ position:"sticky", top:0, zIndex:20, background:"rgba(7,14,24,0.96)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(34,211,238,0.12)", padding:"14px 20px" }}>
        <div className="print-toolbar-inner" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, maxWidth:980, margin:"0 auto", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:"#22d3ee", marginBottom:4 }}>Print / Save as PDF</div>
            <div className="print-toolbar-title" style={{ fontSize:18, fontWeight:900, color:"#f0f6ff" }}>
              {loading ? "Loading…" : rows[0]?.certificate_number || "Certificate"}
            </div>
          </div>
          <div className="print-btn-row">
            <button type="button"
              onClick={() => window.close()}
              style={{ padding:"10px 16px", borderRadius:12, border:"1px solid rgba(148,163,184,0.18)", background:"rgba(255,255,255,0.04)", color:"rgba(240,246,255,0.7)", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", WebkitTapHighlightColor:"transparent" }}>
              ✕ Close
            </button>
            <button type="button"
              onClick={() => window.print()}
              style={{ padding:"10px 16px", borderRadius:12, border:"1px solid rgba(96,165,250,0.25)", background:"rgba(96,165,250,0.12)", color:"#60a5fa", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", WebkitTapHighlightColor:"transparent" }}>
              🖨 Print
            </button>
            <button type="button"
              onClick={() => window.print()}
              disabled={loading}
              style={{ padding:"10px 16px", borderRadius:12, border:"none", background: loading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#34d399,#14b8a6)", color: loading ? "rgba(240,246,255,0.3)" : "#052e16", fontWeight:900, fontSize:13, cursor: loading ? "not-allowed" : "pointer", fontFamily:"'IBM Plex Sans',sans-serif", WebkitTapHighlightColor:"transparent" }}>
              ⬇ Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ maxWidth:960, margin:"40px auto", textAlign:"center", color:"rgba(240,246,255,0.4)", fontSize:14 }}>
          Loading certificate…
        </div>
      ) : error ? (
        <div style={{ maxWidth:960, margin:"32px auto", background:"rgba(248,113,113,0.10)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:16, padding:18, color:"#f87171", fontWeight:700 }}>
          ⚠ {error}
        </div>
      ) : (
        <div className="print-page-wrap" style={{ maxWidth:980, margin:"0 auto", padding:20 }}>
          {rows.map((row, index) => (
            <CertificateSheet key={row.id} certificate={row} index={index} total={rows.length} printMode />
          ))}
        </div>
      )}
    </div>
  );
}
