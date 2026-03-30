// src/app/certificates/print/[id]/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

export default function PrintPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [cert, setCert] = useState(null);
  const [bundle, setBundle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printed = useRef(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data, error: e } = await supabase
        .from("certificates").select("*").eq("id", id).maybeSingle();
      if (e || !data) { setError("Certificate not found."); setLoading(false); return; }
      setCert(data);
      if (data.folder_id) {
        const { data: linked } = await supabase
          .from("certificates").select("*")
          .eq("folder_id", data.folder_id)
          .order("folder_position", { ascending: true });
        setBundle(linked?.length ? linked : [data]);
      } else {
        setBundle([data]);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Auto-trigger print after content renders
  useEffect(() => {
    if (!loading && cert && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 800);
    }
  }, [loading, cert]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#334155", fontSize:14 }}>
      Loading certificate…
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#dc2626", fontSize:14 }}>
      {error}
    </div>
  );

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#f1f5f9;font-family:'IBM Plex Sans',sans-serif}

        /* Screen toolbar — hidden when printing */
        .print-toolbar{
          position:fixed;top:0;left:0;right:0;z-index:100;
          background:#0b1d3a;
          padding:10px 20px;
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          box-shadow:0 2px 12px rgba(0,0,0,0.3);
        }
        .print-toolbar-left{display:flex;align-items:center;gap:12px}
        .print-toolbar-title{font-size:13px;font-weight:700;color:#fff}
        .print-toolbar-sub{font-size:11px;color:rgba(255,255,255,0.5)}
        .print-btn{
          padding:8px 18px;border-radius:8px;border:none;
          background:linear-gradient(135deg,#34d399,#14b8a6);
          color:#052e16;font-weight:900;font-size:13px;
          cursor:pointer;font-family:inherit;
          display:inline-flex;align-items:center;gap:7px;
        }
        .close-btn{
          padding:8px 14px;border-radius:8px;
          border:1px solid rgba(255,255,255,0.15);
          background:transparent;color:rgba(255,255,255,0.7);
          font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
        }
        .print-hint{font-size:11px;color:rgba(255,255,255,0.45);text-align:right}

        /* Page content */
        .print-content{padding-top:62px;padding-bottom:30px}

        /* Print styles */
        @media print{
          .print-toolbar{display:none!important}
          .print-content{padding:0!important}
          html,body{background:#fff!important}
          @page{size:A4;margin:0}
        }
      `}</style>

      {/* Toolbar — only visible on screen */}
      <div className="print-toolbar">
        <div className="print-toolbar-left">
          <button className="close-btn" type="button" onClick={() => window.close()}>← Close</button>
          <div>
            <div className="print-toolbar-title">
              {bundle.length > 1 ? `Certificate Folder (${bundle.length} certs)` : cert?.certificate_number || "Certificate"}
            </div>
            <div className="print-toolbar-sub">
              {bundle.length > 1 ? "All certificates will print together" : cert?.equipment_description || cert?.equipment_type || ""}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div className="print-hint">In the print dialog → select<br/><strong style={{color:"rgba(255,255,255,0.7)"}}>Save as PDF</strong> to download</div>
          <button className="print-btn" type="button" onClick={() => window.print()}>
            🖨 Print / Save PDF
          </button>
        </div>
      </div>

      {/* Certificate content */}
      <div className="print-content">
        {bundle.map((c, i) => (
          <div key={c.id} style={{ pageBreakAfter: i < bundle.length - 1 ? "always" : "auto" }}>
            <CertificateSheet
              certificate={c}
              index={i}
              total={bundle.length}
              printMode={true}
            />
          </div>
        ))}
      </div>
    </>
  );
}
