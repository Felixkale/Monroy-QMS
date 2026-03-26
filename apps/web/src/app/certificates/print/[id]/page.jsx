// ════════════════════════════════════════════════════════════
//  apps/web/src/app/certificates/print/[id]/page.jsx
// ════════════════════════════════════════════════════════════
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

function normalizeId(v){return Array.isArray(v)?v[0]:v;}

export default function PrintCertificatePage() {
  const params=useParams(); const router=useRouter();
  const id=normalizeId(params?.id);
  const [loading,setLoading]=useState(true);
  const [rows,setRows]=useState([]);
  const [error,setError]=useState("");

  useEffect(()=>{if(id) loadPrintRows();},[id]);

  async function loadPrintRows(){
    setLoading(true);setError("");
    const{data:cert,error:e}=await supabase.from("certificates").select("*").eq("id",id).maybeSingle();
    if(e||!cert){setRows([]);setError(e?.message||"Certificate not found.");setLoading(false);return;}
    if(cert.folder_id){
      const{data:fr,error:fe}=await supabase.from("certificates").select("*").eq("folder_id",cert.folder_id).order("folder_position",{ascending:true}).order("created_at",{ascending:true});
      setRows(fe||!fr?.length?[cert]:fr);
    }else{setRows([cert]);}
    setLoading(false);
  }

  return(
    <div style={{background:"#0d1117",minHeight:"100vh",fontFamily:"'IBM Plex Sans',-apple-system,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        @page{size:A4;margin:12mm}
        @media print{
          .print-toolbar{display:none!important}
          body{background:#ffffff!important}
        }
        .print-btn-row{display:flex;gap:10px;flex-wrap:wrap}
        @media(max-width:600px){
          .print-toolbar-inner{flex-direction:column!important;gap:12px!important}
          .print-btn-row{width:100%}
          .print-btn-row button{flex:1}
          .print-toolbar-title{font-size:16px!important}
        }
      `}</style>

      {/* Toolbar */}
      <div className="print-toolbar" style={{position:"sticky",top:0,zIndex:20,background:"rgba(7,14,24,0.96)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(34,211,238,0.12)",padding:"14px 20px"}}>
        <div className="print-toolbar-inner" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,maxWidth:980,margin:"0 auto",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"#22d3ee",marginBottom:4}}>Print Mode</div>
            <div className="print-toolbar-title" style={{fontSize:18,fontWeight:900,color:"#f0f6ff"}}>{rows.length>1?"Linked Certificate Folder":"Single Certificate"}</div>
          </div>
          <div className="print-btn-row">
            <button type="button" onClick={()=>router.push(`/certificates/${id}`)} style={{padding:"10px 16px",borderRadius:12,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer"}}>← Back</button>
            <button type="button" onClick={()=>window.print()} style={{padding:"10px 16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#34d399,#14b8a6)",color:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer"}}>🖨 Print Now</button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading?(
        <div style={{maxWidth:960,margin:"32px auto",background:"rgba(13,22,38,0.80)",border:"1px solid rgba(148,163,184,0.12)",borderRadius:16,padding:24,textAlign:"center",color:"rgba(240,246,255,0.5)"}}>Loading print pages…</div>
      ):error?(
        <div style={{maxWidth:960,margin:"32px auto",background:"rgba(248,113,113,0.10)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:16,padding:18,color:"#f87171",fontWeight:700}}>⚠ {error}</div>
      ):(
        <div style={{maxWidth:980,margin:"0 auto",padding:20}}>
          {rows.map((row,index)=>(
            <div key={row.id} style={{marginBottom:20,breakAfter:index===rows.length-1?"auto":"page",pageBreakAfter:index===rows.length-1?"auto":"always"}}>
              <CertificateSheet certificate={row} index={index} total={rows.length} printMode/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
