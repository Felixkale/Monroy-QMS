"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)",card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)",borderMid:"rgba(148,163,184,0.22)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6)}
  .be-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .be-table{display:block}
  .be-mob{display:none}
  @media(max-width:900px){.be-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:600px){
    .be-grid{grid-template-columns:1fr}
    .be-table{display:none!important}
    .be-mob{display:grid!important;gap:0}
  }
  @keyframes spin{to{transform:rotate(360deg)}}
`;

function formatDate(v){
  if(!v)return "—";
  const d=new Date(v);
  if(isNaN(d))return String(v);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
}

const inputStyle={
  width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid rgba(148,163,184,0.2)`,
  borderRadius:9,padding:"9px 12px",color:"#f0f6ff",fontSize:13,
  fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",
};
const labelStyle={
  fontSize:9,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",
  color:"rgba(240,246,255,0.40)",marginBottom:6,display:"block",
};

export default function BulkExportPage(){
  const [clients,setClients]=useState([]);
  const [clientId,setClientId]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [preview,setPreview]=useState([]);
  const [loadingPreview,setLoadingPreview]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [error,setError]=useState("");
  const [previewLoaded,setPreviewLoaded]=useState(false);

  useEffect(()=>{
    supabase.from("clients").select("id,company_name").order("company_name")
      .then(({data})=>setClients(data||[]));
  },[]);

  async function handlePreview(){
    setError("");setLoadingPreview(true);setPreviewLoaded(false);
    let query=supabase
      .from("certificates")
      .select("id,certificate_number,issue_date,expiry_date,status,equipment_type,equipment_description,client_name,clients(company_name)")
      .order("issue_date",{ascending:false})
      .limit(500);
    if(clientId) query=query.eq("client_id",clientId);
    if(dateFrom) query=query.gte("issue_date",dateFrom);
    if(dateTo)   query=query.lte("issue_date",dateTo);
    const{data,error:qErr}=await query;
    setLoadingPreview(false);
    if(qErr){setError(qErr.message);return;}
    setPreview(data||[]);
    setPreviewLoaded(true);
  }

  async function handleExport(){
    if(!preview.length)return;
    setExporting(true);setError("");
    try{
      const res=await fetch("/api/certificates/bulk-export",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({clientId,dateFrom,dateTo}),
      });
      if(!res.ok){
        const json=await res.json();
        setError(json.error||"Export failed.");
        setExporting(false);return;
      }
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      const disposition=res.headers.get("Content-Disposition")||"";
      const match=disposition.match(/filename="(.+?)"/);
      a.download=match?match[1]:"certificates.zip";
      a.click();
      URL.revokeObjectURL(url);
    }catch(err){setError(err.message||"Unexpected error.");}
    setExporting(false);
  }

  function statusColor(s){
    if(!s||s==="active")return{color:T.green,bg:T.greenDim,brd:T.greenBrd};
    if(s==="expired")   return{color:T.red,  bg:T.redDim,  brd:T.redBrd};
    return{color:T.textDim,bg:T.card,brd:T.border};
  }

  return(
    <AppLayout title="Bulk Export">
      <style>{CSS}</style>
      <div style={{
        background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.05),transparent),${T.bg}`,
        color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:20,paddingBottom:60,minHeight:"100vh",
      }}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.green},rgba(52,211,153,0.3))`,flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.green}}>ISO 9001 · Document Export</span>
            </div>
            <h1 style={{margin:0,fontSize:"clamp(18px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Bulk Export Certificates</h1>
            <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Filter by client and inspection date · preview matches · download as ZIP</p>
          </div>

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"16px 18px",backdropFilter:"blur(20px)"}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:14}}>Filters</div>
            <div className="be-grid">
              <div>
                <label style={labelStyle}>Client</label>
                <select value={clientId} onChange={e=>{setClientId(e.target.value);setPreviewLoaded(false);}} style={{...inputStyle,cursor:"pointer"}}>
                  <option value="">All Clients</option>
                  {clients.map(c=>(
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Inspection Date From</label>
                <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPreviewLoaded(false);}} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Inspection Date To</label>
                <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPreviewLoaded(false);}} style={inputStyle}/>
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
              <button onClick={handlePreview} disabled={loadingPreview} style={{
                padding:"9px 20px",borderRadius:10,border:`1px solid ${T.accentBrd}`,
                background:T.accentDim,color:T.accent,fontWeight:900,fontSize:13,
                cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",opacity:loadingPreview?0.6:1,
              }}>
                {loadingPreview?"Loading…":"Preview Matches"}
              </button>

              {previewLoaded&&preview.length>0&&(
                <button onClick={handleExport} disabled={exporting} style={{
                  padding:"9px 20px",borderRadius:10,border:`1px solid ${T.greenBrd}`,
                  background:T.greenDim,color:T.green,fontWeight:900,fontSize:13,
                  cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",
                  display:"flex",alignItems:"center",gap:8,opacity:exporting?0.6:1,
                }}>
                  {exporting?(
                    <>
                      <span style={{display:"inline-block",width:13,height:13,border:`2px solid ${T.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
                      Exporting…
                    </>
                  ):(
                    <>⬇ Export {preview.length} Certificate{preview.length!==1?"s":""} as ZIP</>
                  )}
                </button>
              )}
            </div>

            {error&&(
              <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* PREVIEW */}
          {previewLoaded&&(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:800}}>
                  Preview —{" "}
                  <span style={{color:T.accent}}>{preview.length} certificate{preview.length!==1?"s":""}</span>
                </span>
                {preview.length===0&&<span style={{fontSize:12,color:T.textDim}}>No results for selected filters.</span>}
              </div>

              {preview.length>0&&(
                <>
                  {/* Desktop table */}
                  <div className="be-table" style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                      <thead>
                        <tr style={{background:"rgba(255,255,255,0.02)"}}>
                          {["Certificate No","Client","Equipment","Issue Date","Expiry Date","Status"].map(h=>(
                            <td key={h} style={{padding:"9px 14px",fontSize:9,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map(cert=>{
                          const sc=statusColor(cert.status);
                          return(
                            <tr key={cert.id} style={{borderBottom:`1px solid ${T.border}`}}>
                              <td style={{padding:"10px 14px",fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.accent,fontWeight:800,whiteSpace:"nowrap"}}>{cert.certificate_number||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid}}>{cert.clients?.company_name||cert.client_name||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.equipment_description||cert.equipment_type||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,whiteSpace:"nowrap"}}>{formatDate(cert.issue_date)}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,whiteSpace:"nowrap"}}>{formatDate(cert.expiry_date)}</td>
                              <td style={{padding:"10px 14px"}}>
                                <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:sc.bg,color:sc.color,border:`1px solid ${sc.brd}`,fontSize:10,fontWeight:800,textTransform:"capitalize",whiteSpace:"nowrap"}}>
                                  {cert.status||"active"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="be-mob">
                    {preview.map(cert=>{
                      const sc=statusColor(cert.status);
                      return(
                        <div key={cert.id} style={{padding:"13px 14px",borderBottom:`1px solid ${T.border}`,display:"grid",gap:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                            <span style={{color:T.accent,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",fontSize:13}}>{cert.certificate_number||"—"}</span>
                            <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:sc.bg,color:sc.color,border:`1px solid ${sc.brd}`,fontSize:10,fontWeight:800,textTransform:"capitalize"}}>{cert.status||"active"}</span>
                          </div>
                          <div style={{fontSize:12,color:T.textMid}}>{cert.equipment_description||cert.equipment_type||"—"}</div>
                          <div style={{fontSize:11,color:T.textDim,display:"flex",gap:12,flexWrap:"wrap"}}>
                            <span>{cert.clients?.company_name||cert.client_name||"—"}</span>
                            <span>Issue: {formatDate(cert.issue_date)}</span>
                            <span>Expiry: {formatDate(cert.expiry_date)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
