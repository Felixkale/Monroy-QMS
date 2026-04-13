"use client";

import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import JSZip from "jszip";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6)}
  .be-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .be-table{display:block}
  .be-mob{display:none}
  @media(max-width:600px){
    .be-grid{grid-template-columns:1fr}
    .be-table{display:none!important}
    .be-mob{display:grid!important;gap:0}
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  #bulk-iframe{
    position:fixed;top:0;left:0;width:794px;height:100vh;
    border:none;background:#fff;z-index:9000;display:none;
  }
  #bulk-iframe.active{display:block;}
  #bulk-overlay{
    position:fixed;inset:0;z-index:9500;
    background:rgba(7,14,24,0.97);
    display:none;align-items:center;justify-content:center;
    flex-direction:column;gap:14px;
  }
  #bulk-overlay.active{display:flex;}
`;

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function formatDate(v){
  if(!v)return"—";
  const d=new Date(v+"T00:00:00Z");
  if(isNaN(d))return String(v);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"});
}

function formatTime(seconds){
  if(!seconds||seconds<=0)return"—";
  if(seconds<60)return`${Math.round(seconds)}s`;
  const m=Math.floor(seconds/60),s=Math.round(seconds%60);
  return s>0?`${m}m ${s}s`:`${m}m`;
}

const inputStyle={width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(148,163,184,0.2)",borderRadius:9,padding:"9px 12px",color:"#f0f6ff",fontSize:13,fontFamily:"'IBM Plex Sans',sans-serif",outline:"none"};
const labelStyle={fontSize:9,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(240,246,255,0.40)",marginBottom:6,display:"block"};

export default function BulkExportClient() {
  const [clientOpts,setClientOpts]=useState([]);
  const [clientName,setClientName]=useState("");
  const [inspectionDate,setInspectionDate]=useState("");
  const [preview,setPreview]=useState([]);
  const [loadingPreview,setLoadingPreview]=useState(false);
  const [previewLoaded,setPreviewLoaded]=useState(false);
  const [error,setError]=useState("");
  const [exporting,setExporting]=useState(false);
  const [exportStep,setExportStep]=useState("");
  const [exportDone,setExportDone]=useState(0);
  const [exportTotal,setExportTotal]=useState(0);
  const [exportSkipped,setExportSkipped]=useState(0);
  const [timeRemaining,setTimeRemaining]=useState(null);
  const [avgSpeed,setAvgSpeed]=useState(null);
  const [doneMsg,setDoneMsg]=useState("");
  const [iframeActive,setIframeActive]=useState(false);
  const iframeRef=useRef(null);
  const startTimeRef=useRef(null);
  const timingsRef=useRef([]);

  useEffect(()=>{
    supabase.from("certificates").select("client_name").then(({data})=>{
      if(!data)return;
      const names=new Set();
      data.forEach(r=>{if(r.client_name?.trim())names.add(r.client_name.trim());});
      setClientOpts([...names].sort());
    });
  },[]);

  function statusColor(s){
    if(!s||s==="active")return{color:T.green,bg:T.greenDim,brd:T.greenBrd};
    if(s==="expired")return{color:T.red,bg:T.redDim,brd:T.redBrd};
    return{color:T.textDim,bg:T.card,brd:T.border};
  }

  async function handlePreview(){
    setError("");setLoadingPreview(true);setPreviewLoaded(false);setDoneMsg("");
    let query=supabase.from("certificates")
      .select("id,certificate_number,client_name,equipment_type,equipment_description,inspection_date,issue_date,expiry_date,status,result")
      .order("certificate_number",{ascending:true}).limit(1000);
    if(clientName) query=query.ilike("client_name",clientName.trim());
    if(inspectionDate) query=query.eq("inspection_date",inspectionDate);
    const{data,error:qErr}=await query;
    setLoadingPreview(false);
    if(qErr){setError(qErr.message);return;}
    setPreview(data||[]);
    setPreviewLoaded(true);
  }

  function captureViaIframe(cert){
    return new Promise((resolve,reject)=>{
      const iframe=iframeRef.current;
      if(!iframe){reject(new Error("iframe not found"));return;}
      iframe.src=`/certificates/print/${encodeURIComponent(String(cert.id))}`;
      const timeout=setTimeout(()=>reject(new Error(`Timeout: ${cert.certificate_number}`)),30000);
      iframe.onload=async()=>{
        clearTimeout(timeout);
        try{
          const iDoc=iframe.contentDocument||iframe.contentWindow?.document;
          const iWin=iframe.contentWindow;
          if(!iDoc||!iWin)throw new Error("Cannot access iframe");
          try{await iDoc.fonts.ready;}catch{}
          let lastH=0,stable=0;
          for(let i=0;i<40;i++){
            await sleep(200);
            const h=iDoc.body?.scrollHeight||0;
            if(h>200&&h===lastH){stable++;if(stable>=2)break;}
            else stable=0;
            lastH=h;
          }
          const imgs=Array.from(iDoc.querySelectorAll("img"));
          await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;})));
          await sleep(800);
          if(!iWin.html2pdf){
            await new Promise((res,rej)=>{
              const s=iDoc.createElement("script");
              s.src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
              s.onload=res;s.onerror=rej;
              iDoc.head.appendChild(s);
            });
            await sleep(200);
          }
          const toolbar=iDoc.querySelector(".pt-toolbar");
          if(toolbar)toolbar.style.display="none";
          const certEl=iDoc.querySelector(".pt-content")||iDoc.body;
          const blob=await iWin.html2pdf().set({
            margin:0,
            filename:`${cert.certificate_number||cert.id}.pdf`,
            image:{type:"jpeg",quality:0.97},
            html2canvas:{scale:2,useCORS:true,allowTaint:true,logging:false,letterRendering:true,windowWidth:794,backgroundColor:"#ffffff",scrollX:0,scrollY:0},
            jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},
          }).from(certEl).outputPdf("blob");
          if(!blob||blob.size<5000)throw new Error("PDF empty");
          const ab=await blob.arrayBuffer();
          resolve(new Uint8Array(ab));
        }catch(e){reject(e);}
        finally{iframe.src="about:blank";}
      };
      iframe.onerror=()=>{clearTimeout(timeout);reject(new Error("iframe load error"));};
    });
  }

  async function handleExport(){
    if(!preview.length)return;
    setExporting(true);setIframeActive(true);setError("");setDoneMsg("");
    setExportDone(0);setExportTotal(preview.length);setExportSkipped(0);
    setTimeRemaining(null);setAvgSpeed(null);
    startTimeRef.current=Date.now();
    timingsRef.current=[];

    try{
      const ids=preview.map(c=>c.id);
      const allCerts=[];
      for(let i=0;i<ids.length;i+=50){
        const{data,error:e}=await supabase.from("certificates")
          .select("id,certificate_number,client_name,inspection_date,issue_date")
          .in("id",ids.slice(i,i+50))
          .order("certificate_number",{ascending:true});
        if(e)throw new Error(e.message);
        allCerts.push(...(data||[]));
      }

      const zip=new JSZip();
      let done=0,skipped=0;

      for(const cert of allCerts){
        setExportStep(`${cert.certificate_number||cert.id}`);
        const certStart=Date.now();
        try{
          const ab=await captureViaIframe(cert);
          const folder=(cert.client_name||"Unknown").trim().replace(/[^a-zA-Z0-9_\- ]/g,"_");
          const date=(cert.inspection_date||cert.issue_date||"NoDate").replace(/-/g,"");
          const num=(cert.certificate_number||cert.id).toString().replace(/[^a-zA-Z0-9_-]/g,"_");
          zip.file(`${folder}/${date}_${num}.pdf`,ab);

          // Track timing
          const elapsed=(Date.now()-certStart)/1000;
          timingsRef.current.push(elapsed);
          // Use last 5 certs for rolling average
          const recent=timingsRef.current.slice(-5);
          const avg=recent.reduce((a,b)=>a+b,0)/recent.length;
          const remaining=allCerts.length-(done+1);
          setAvgSpeed(avg);
          setTimeRemaining(avg*remaining);
        }catch(e){
          console.error(`Skipped ${cert.certificate_number}:`,e.message);
          skipped++;
          setExportSkipped(skipped);
        }
        done++;
        setExportDone(done);
      }

      setExportStep("Compressing ZIP…");
      setTimeRemaining(null);
      const zipBlob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:1}});
      if(zipBlob.size<100)throw new Error("ZIP is empty — all PDFs failed to generate.");

      const clientLabel=clientName?clientName.trim().replace(/\s+/g,"_"):"AllClients";
      const dateLabel=inspectionDate?`_${inspectionDate}`:"";
      const url=URL.createObjectURL(zipBlob);
      const a=document.createElement("a");
      a.href=url;a.download=`Certificates_${clientLabel}${dateLabel}.zip`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),5000);

      const totalTime=formatTime((Date.now()-startTimeRef.current)/1000);
      const successCount=done-skipped;
      setDoneMsg(`✓ ${successCount} exported${skipped>0?`, ${skipped} skipped`:""} · Total time: ${totalTime}`);
    }catch(err){
      setError(err.message||"Export failed.");
    }finally{
      setExporting(false);setIframeActive(false);setExportStep("");
      if(iframeRef.current)iframeRef.current.src="about:blank";
    }
  }

  const pct=exportTotal>0?Math.round((exportDone/exportTotal)*100):0;
  const elapsed=startTimeRef.current?Math.round((Date.now()-startTimeRef.current)/1000):0;

  return(
    <AppLayout title="Bulk Export">
      <style>{CSS}</style>

      {/* Full-screen overlay */}
      <div id="bulk-overlay" className={exporting?"active":""}>
        {/* Spinner + current cert */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{display:"inline-block",width:20,height:20,border:"3px solid rgba(34,211,238,0.2)",borderTopColor:"#22d3ee",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
          <div>
            <div style={{color:"#f0f6ff",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:13,fontWeight:700}}>
              Rendering {exportStep||"…"}
            </div>
            <div style={{color:"rgba(240,246,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:11,marginTop:2}}>
              {exportDone} of {exportTotal} certificates
              {exportSkipped>0&&<span style={{color:"#f87171",marginLeft:8}}>{exportSkipped} skipped</span>}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {exportTotal>0&&(
          <div style={{width:360}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontFamily:"'IBM Plex Sans',sans-serif"}}>
              <span style={{fontSize:11,color:"rgba(240,246,255,0.5)"}}>{pct}%</span>
              <span style={{fontSize:11,color:"rgba(240,246,255,0.5)",fontWeight:700,color:"#22d3ee"}}>{pct}% complete</span>
            </div>
            <div style={{background:"rgba(34,211,238,0.08)",borderRadius:99,height:8,overflow:"hidden",border:"1px solid rgba(34,211,238,0.15)"}}>
              <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#22d3ee,#34d399)",width:`${pct}%`,transition:"width 0.4s ease",boxShadow:"0 0 8px rgba(34,211,238,0.4)"}}/>
            </div>
          </div>
        )}

        {/* Time stats */}
        <div style={{display:"flex",gap:24,fontFamily:"'IBM Plex Sans',sans-serif"}}>
          {timeRemaining!=null&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#22d3ee",letterSpacing:"-0.02em"}}>{formatTime(timeRemaining)}</div>
              <div style={{fontSize:10,color:"rgba(240,246,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>Remaining</div>
            </div>
          )}
          {avgSpeed!=null&&(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#34d399",letterSpacing:"-0.02em"}}>{avgSpeed.toFixed(1)}s</div>
              <div style={{fontSize:10,color:"rgba(240,246,255,0.35)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>Per cert</div>
            </div>
          )}
        </div>

        <div style={{fontSize:11,color:"rgba(240,246,255,0.25)",fontFamily:"'IBM Plex Sans',sans-serif",animation:"pulse 2s infinite"}}>
          Do not close this tab
        </div>
      </div>

      <iframe id="bulk-iframe" className={iframeActive?"active":""} ref={iframeRef} src="about:blank" title="cert-render"/>

      <div style={{background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:20,paddingBottom:60,minHeight:"100vh"}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.green},rgba(52,211,153,0.3))`,flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.green}}>ISO 9001 · Document Export</span>
            </div>
            <h1 style={{margin:0,fontSize:"clamp(18px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Bulk Export Certificates</h1>
            <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Filter · preview · download exact CertificateSheet output as ZIP</p>
          </div>

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"16px 18px",backdropFilter:"blur(20px)"}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:14}}>Filters</div>
            <div className="be-grid">
              <div>
                <label style={labelStyle}>Client</label>
                <select value={clientName} onChange={e=>{setClientName(e.target.value);setPreviewLoaded(false);setDoneMsg("");}} style={{...inputStyle,cursor:"pointer"}}>
                  <option value="">All Clients</option>
                  {clientOpts.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Inspection Date</label>
                <input type="date" value={inspectionDate} onChange={e=>{setInspectionDate(e.target.value);setPreviewLoaded(false);setDoneMsg("");}} style={inputStyle}/>
              </div>
            </div>

            {(clientName||inspectionDate)&&(
              <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {clientName&&<span style={{padding:"3px 10px",borderRadius:99,background:T.accentDim,border:`1px solid ${T.accentBrd}`,color:T.accent,fontSize:11,fontWeight:700}}>{clientName.trim()}</span>}
                {inspectionDate&&<span style={{padding:"3px 10px",borderRadius:99,background:T.amberDim,border:`1px solid ${T.amberBrd}`,color:T.amber,fontSize:11,fontWeight:700}}>Inspected {formatDate(inspectionDate)}</span>}
                <button onClick={()=>{setClientName("");setInspectionDate("");setPreviewLoaded(false);setPreview([]);setDoneMsg("");}} style={{background:"none",border:"none",color:T.textDim,fontSize:11,cursor:"pointer",fontWeight:700,padding:"3px 6px"}}>Clear ×</button>
              </div>
            )}

            <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={handlePreview} disabled={loadingPreview||exporting} style={{padding:"9px 20px",borderRadius:10,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",opacity:(loadingPreview||exporting)?0.6:1}}>
                {loadingPreview?"Loading…":"Preview Matches"}
              </button>
              {previewLoaded&&preview.length>0&&!exporting&&(
                <button onClick={handleExport} style={{padding:"9px 20px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",display:"flex",alignItems:"center",gap:8}}>
                  ⬇ Export {preview.length} Certificate{preview.length!==1?"s":""} as ZIP
                </button>
              )}
            </div>

            {doneMsg&&!exporting&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>{doneMsg}</div>}
            {error&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>⚠ {error}</div>}
          </div>

          {/* PREVIEW TABLE */}
          {previewLoaded&&(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:800}}>Preview — <span style={{color:T.accent}}>{preview.length} certificate{preview.length!==1?"s":""}</span></span>
                {preview.length===0&&<span style={{fontSize:12,color:T.textDim}}>No results.</span>}
              </div>
              {preview.length>0&&(
                <>
                  <div className="be-table" style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                      <thead>
                        <tr style={{background:"rgba(255,255,255,0.02)"}}>
                          {["Certificate No","Client","Equipment","Inspection Date","Expiry Date","Status"].map(h=>(
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
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid}}>{cert.client_name?.trim()||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.equipment_description||cert.equipment_type||"—"}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,whiteSpace:"nowrap"}}>{formatDate(cert.inspection_date)}</td>
                              <td style={{padding:"10px 14px",fontSize:12,color:T.textMid,whiteSpace:"nowrap"}}>{formatDate(cert.expiry_date)}</td>
                              <td style={{padding:"10px 14px"}}><span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:sc.bg,color:sc.color,border:`1px solid ${sc.brd}`,fontSize:10,fontWeight:800,textTransform:"capitalize",whiteSpace:"nowrap"}}>{cert.status||"active"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                            <span>{cert.client_name?.trim()||"—"}</span>
                            <span>Inspected: {formatDate(cert.inspection_date)}</span>
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
