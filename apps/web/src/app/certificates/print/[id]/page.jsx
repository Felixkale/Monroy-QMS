// src/app/certificates/print/[id]/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

export default function PrintPage() {
  const params    = useParams();
  const id        = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [cert,    setCert]    = useState(null);
  const [bundle,  setBundle]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const triggered = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
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
    })();
  }, [id]);

  useEffect(() => {
    if (!loading && cert && !triggered.current) {
      triggered.current = true;
      setTimeout(() => window.print(), 900);
    }
  }, [loading, cert]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", color:"#334155", fontSize:14 }}>
      Preparing certificate…
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
        html,body{background:#e2e8f0;font-family:'IBM Plex Sans',sans-serif}

        /* ── Screen toolbar ── */
        .pt{
          position:fixed;top:0;left:0;right:0;z-index:100;
          background:#0b1929;padding:10px 20px;
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          box-shadow:0 2px 16px rgba(0,0,0,0.4);
        }
        .pt-left{display:flex;align-items:center;gap:10px}
        .pt-title{font-size:13px;font-weight:700;color:#fff}
        .pt-sub{font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px}
        .pt-right{display:flex;align-items:center;gap:10px}
        .pt-hint{font-size:11px;color:rgba(255,255,255,0.4);text-align:right;line-height:1.5}
        .pt-hint b{color:rgba(255,255,255,0.65)}
        .btn-close{padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-back{padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center}
        .btn-print{padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
        .btn-pdf{padding:8px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit}
        .print-content{padding-top:72px;padding-bottom:40px;padding-left:20px;padding-right:20px;background:#e2e8f0;min-height:100vh}

        /* ── Print styles ── */
        @media print{
          .pt{display:none!important}
          .print-content{padding:0!important}
          html,body{background:#fff!important}
          @page{size:A4;margin:0}
        }
      `}</style>

      {/* Toolbar */}
      <div className="pt">
        <div className="pt-left">
          <button className="btn-close" type="button" onClick={() => window.history.back()}>← Back</button>
          <div>
            <div className="pt-title">
              {bundle.length > 1 ? `${bundle.length} Certificates — Folder` : cert?.certificate_number || "Certificate"}
            </div>
            <div className="pt-sub">
              {cert?.client_name || ""}{bundle.length > 1 ? ` · ${bundle.length} pages` : ""}
            </div>
          </div>
        </div>
        <div className="pt-right">
          <div className="pt-hint">
            To download: click <b>⬇ Save PDF</b> →<br/>
            select <b>Save as PDF</b> as the printer
          </div>
          <button className="btn-print" type="button" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn-pdf"   type="button" onClick={() => window.print()}>⬇ Save PDF</button>
        </div>
      </div>

      {/* Content — centered A4 on screen */}
      <div className="print-content">
        {bundle.map((c, i) => (
          <div key={c.id} style={{ pageBreakAfter: i < bundle.length - 1 ? "always" : "auto", marginBottom: i < bundle.length - 1 ? 24 : 0 }}>
            <div style={{ maxWidth:794, margin:"0 auto", boxShadow:"0 4px 32px rgba(0,0,0,0.25)", borderRadius:2 }}>
              <CertificateSheet certificate={c} index={i} total={bundle.length} printMode={true}/>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
