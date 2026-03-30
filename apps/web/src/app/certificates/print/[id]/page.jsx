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

  useEffect(() => {
    if (!loading && cert && !printed.current) {
      printed.current = true;
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

        .print-toolbar{
          position:fixed;top:0;left:0;right:0;z-index:100;
          background:#0b1929;padding:10px 20px;
          display:flex;align-items:center;justify-content:space-between;gap:12px;
          box-shadow:0 2px 16px rgba(0,0,0,0.4);
        }
        .tb-left{display:flex;align-items:center;gap:10px}
        .tb-title{font-size:13px;font-weight:700;color:#fff}
        .tb-sub{font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px}
        .tb-right{display:flex;align-items:center;gap:10px}
        .tb-hint{font-size:11px;color:rgba(255,255,255,0.4);text-align:right;line-height:1.5}
        .tb-hint b{color:rgba(255,255,255,0.65)}
        .btn-close{padding:7px 13px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-print{padding:8px 16px;border-radius:8px;border:none;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px}
        .btn-pdf{padding:8px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:7px}

        .print-content{padding-top:60px;padding-bottom:30px}

        @media print{
          .print-toolbar{display:none!important}
          .print-content{padding:0!important}
          html,body{background:#fff!important}
          @page{size:A4;margin:0}
        }
      `}</style>

      <div className="print-toolbar">
        <div className="tb-left">
          <button className="btn-close" type="button" onClick={()=>window.close()}>← Close</button>
          <div>
            <div className="tb-title">
              {bundle.length>1?`${bundle.length} Certificates — Folder Print`:cert?.certificate_number||"Certificate"}
            </div>
            <div className="tb-sub">
              {bundle.length>1?"All linked certificates will print on separate pages":cert?.equipment_description||cert?.equipment_type||""}
            </div>
          </div>
        </div>
        <div className="tb-right">
          <div className="tb-hint">
            To save as PDF: click <b>⬇ Save PDF</b> →<br/>
            then select <b>Save as PDF</b> as the printer
          </div>
          <button className="btn-print" type="button" onClick={()=>window.print()}>
            🖨 Print
          </button>
          <button className="btn-pdf" type="button" onClick={()=>window.print()}>
            ⬇ Save PDF
          </button>
        </div>
      </div>

      <div className="print-content">
        {bundle.map((c, i) => (
          <div key={c.id} style={{ pageBreakAfter: i < bundle.length-1 ? "always" : "auto" }}>
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
