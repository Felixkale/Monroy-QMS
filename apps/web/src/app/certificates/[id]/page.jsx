// src/app/certificates/[id]/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  .view-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
  .view-btn-row{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}
  .bundle-item{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .link-search-result{cursor:pointer;padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,0.12);background:rgba(255,255,255,0.025);transition:background .15s}
  .link-search-result:hover{background:rgba(34,211,238,0.07);border-color:rgba(34,211,238,0.25)}
  @media(max-width:768px){
    .view-page-pad{padding:12px!important}
    .view-hdr{flex-direction:column!important;gap:12px!important}
    .view-btn-row{width:100%}
    .view-btn-row a,.view-btn-row button{flex:1;text-align:center;justify-content:center}
  }
  @media(max-width:480px){
    .view-cert-title{font-size:18px!important}
    .view-btn-row a,.view-btn-row button{font-size:11px!important;padding:8px 10px!important}
  }
`;

function normalizeId(v){return Array.isArray(v)?v[0]:v;}

function pickResult(c){
  if(!c)return "UNKNOWN";
  const ex=c.extracted_data||{};
  const candidates=[c.result,c.equipment_status,ex.result,ex.equipment_status,ex.inspection_result];
  for(const raw of candidates){
    if(!raw)continue;
    const n=String(raw).trim().toUpperCase().replace(/\s+/g,"_");
    if(n==="UNKNOWN")continue;
    if(n==="CONDITIONAL"||n==="REPAIR REQUIRED")return "REPAIR_REQUIRED";
    if(n==="OUT OF SERVICE")return "OUT_OF_SERVICE";
    if(["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n))return n;
  }
  return "UNKNOWN";
}

function resultTone(v){
  if(v==="PASS")           return{color:T.green, bg:T.greenDim, brd:T.greenBrd, label:"Pass"};
  if(v==="FAIL")           return{color:T.red,   bg:T.redDim,  brd:T.redBrd,   label:"Fail"};
  if(v==="REPAIR_REQUIRED")return{color:T.amber, bg:T.amberDim,brd:T.amberBrd, label:"Repair Required"};
  if(v==="OUT_OF_SERVICE") return{color:T.purple,bg:T.purpleDim,brd:T.purpleBrd,label:"Out of Service"};
  return{color:T.textMid,bg:T.card,brd:T.border,label:"Unknown"};
}

function CertificateDetailsInner(){
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const id           = normalizeId(params?.id);

  const [loading,   setLoading]   = useState(true);
  const [record,    setRecord]    = useState(null);
  const [bundle,    setBundle]    = useState([]);
  const [error,     setError]     = useState("");

  // Link panel state
  const [showLink,  setShowLink]  = useState(false);
  const [linkSearch,setLinkSearch]= useState("");
  const [linkResults,setLinkResults]=useState([]);
  const [linkLoading,setLinkLoading]=useState(false);
  const [linking,   setLinking]   = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkMsg,   setLinkMsg]   = useState("");

  useEffect(()=>{if(id)loadCertificate();},[id]);

  useEffect(()=>{
    if(!id)return;
    if(searchParams.get("download")==="1")
      window.location.replace(`/certificates/print/${id}`);
  },[searchParams,id]);

  async function loadCertificate(){
    setLoading(true);setError("");
    const{data,error:e}=await supabase.from("certificates").select("*").eq("id",id).maybeSingle();
    if(e||!data){setRecord(null);setBundle([]);setError(e?.message||"Certificate not found.");setLoading(false);return;}
    setRecord(data);
    if(data.folder_id){
      const{data:linked,error:le}=await supabase.from("certificates").select("*")
        .eq("folder_id",data.folder_id)
        .order("folder_position",{ascending:true})
        .order("created_at",{ascending:true});
      setBundle(le||!linked?.length?[data]:linked);
    }else{
      setBundle([data]);
    }
    setLoading(false);
  }

  // Search for certificates to link
  async function searchCerts(q){
    if(!q||q.length<2){setLinkResults([]);return;}
    setLinkLoading(true);
    const{data}=await supabase.from("certificates")
      .select("id,certificate_number,equipment_description,equipment_type,client_name,folder_id")
      .or(`certificate_number.ilike.%${q}%,equipment_description.ilike.%${q}%,client_name.ilike.%${q}%`)
      .neq("id",id)
      .is("folder_id",null)  // only unlinked certs
      .limit(8);
    setLinkResults(data||[]);
    setLinkLoading(false);
  }

  useEffect(()=>{
    const t=setTimeout(()=>searchCerts(linkSearch),300);
    return()=>clearTimeout(t);
  },[linkSearch]);

  // Link this cert to another
  async function handleLink(targetId){
    setLinking(true);setLinkMsg("");
    const folderId=record?.folder_id||crypto.randomUUID();
    const folderName=record?.folder_name||`Folder-${record?.certificate_number||id}`;
    // Update both certs to same folder
    const[r1,r2]=await Promise.all([
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:1}).eq("id",id),
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:2}).eq("id",targetId),
    ]);
    if(r1.error||r2.error){
      setLinkMsg("Link failed: "+(r1.error?.message||r2.error?.message));
    }else{
      setLinkMsg("Linked successfully!");
      setShowLink(false);
      setLinkSearch("");
      setLinkResults([]);
      await loadCertificate();
    }
    setLinking(false);
  }

  // Unlink this cert from its folder
  async function handleUnlink(){
    if(!record?.folder_id)return;
    setUnlinking(true);setLinkMsg("");
    const{error:e}=await supabase.from("certificates")
      .update({folder_id:null,folder_name:null,folder_position:null})
      .eq("id",id);
    if(e){setLinkMsg("Unlink failed: "+e.message);}
    else{setLinkMsg("Unlinked.");await loadCertificate();}
    setUnlinking(false);
  }

  const tone=useMemo(()=>resultTone(pickResult(record)),[record]);
  const isLinked=!!record?.folder_id;

  return(
    <AppLayout title="Certificate View">
      <style>{CSS}</style>
      <div className="view-page-pad" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"grid",gap:18}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="view-hdr">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>Certificate Viewer</div>
                <h1 className="view-cert-title" style={{margin:"0 0 10px",fontSize:26,fontWeight:900,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {record?.certificate_number||"Certificate"}
                </h1>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{padding:"5px 12px",borderRadius:99,background:tone.bg,color:tone.color,border:`1px solid ${tone.brd}`,fontSize:11,fontWeight:800}}>{tone.label}</span>
                  {isLinked&&(
                    <span style={{padding:"5px 12px",borderRadius:99,background:T.accentDim,color:T.accent,border:`1px solid ${T.accentBrd}`,fontSize:11,fontWeight:800}}>
                      📁 {record.folder_name||"Linked Folder"} · {bundle.length} certs
                    </span>
                  )}
                  {record?.equipment_type&&(
                    <span style={{padding:"5px 12px",borderRadius:99,background:T.card,color:T.textMid,border:`1px solid ${T.border}`,fontSize:11,fontWeight:700}}>{record.equipment_type}</span>
                  )}
                </div>
              </div>

              <div className="view-btn-row">
                <button type="button" onClick={()=>router.push("/certificates")} style={S.btnGhost}>← Back</button>

                {/* Link / Unlink */}
                {!isLinked?(
                  <button type="button" onClick={()=>{setShowLink(p=>!p);setLinkMsg("");}}
                    style={{...S.btnPurple,background:showLink?"rgba(167,139,250,0.20)":"rgba(167,139,250,0.10)"}}>
                    🔗 Link Certificate
                  </button>
                ):(
                  <button type="button" onClick={handleUnlink} disabled={unlinking}
                    style={{...S.btnPurple,opacity:unlinking?.5:1}}>
                    {unlinking?"Unlinking…":"🔗 Unlink"}
                  </button>
                )}

                <Link href={`/certificates/${id}/edit`} style={S.btnAmber}>Edit</Link>
                <button type="button"
                  onClick={()=>{
                    if(isLinked&&bundle.length>1){
                      bundle.forEach((c,i)=>setTimeout(()=>window.open(`/certificates/print/${encodeURIComponent(String(c.id))}`,"_blank"),i*400));
                    }else{
                      window.open(`/certificates/print/${id}`,"_blank","noopener,noreferrer");
                    }
                  }}
                  style={S.btnGreen}>
                  {isLinked&&bundle.length>1?"🖨 Print All":"🖨 Print"}
                </button>
              </div>
            </div>

            {/* Link feedback */}
            {linkMsg&&(
              <div style={{marginTop:10,padding:"8px 12px",borderRadius:9,background:linkMsg.includes("fail")||linkMsg.includes("Failed")?T.redDim:T.greenDim,color:linkMsg.includes("fail")||linkMsg.includes("Failed")?T.red:T.green,fontSize:12,fontWeight:700}}>
                {linkMsg}
              </div>
            )}
          </div>

          {/* LINK PANEL */}
          {showLink&&!isLinked&&(
            <div style={{background:T.panel,border:`1px solid ${T.purpleBrd}`,borderRadius:16,padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontSize:15}}>🔗</span>
                <div style={{fontSize:14,fontWeight:800,color:T.purple}}>Link to Another Certificate</div>
                <div style={{fontSize:11,color:T.textDim,marginLeft:"auto"}}>Links create a folder — both print together</div>
              </div>
              <input
                value={linkSearch}
                onChange={e=>setLinkSearch(e.target.value)}
                placeholder="Search by certificate number, equipment, or client…"
                style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.70)",color:T.text,fontSize:13,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",marginBottom:12}}
              />
              {linkLoading&&<div style={{fontSize:12,color:T.textDim,textAlign:"center",padding:"8px 0"}}>Searching…</div>}
              {!linkLoading&&linkSearch.length>=2&&linkResults.length===0&&(
                <div style={{fontSize:12,color:T.textDim,textAlign:"center",padding:"8px 0"}}>No unlinked certificates found matching "{linkSearch}"</div>
              )}
              <div style={{display:"grid",gap:8}}>
                {linkResults.map(cert=>(
                  <div key={cert.id} className="link-search-result"
                    onClick={()=>!linking&&handleLink(cert.id)}
                    style={{WebkitTapHighlightColor:"transparent"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{cert.certificate_number||"—"}</div>
                        <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{cert.equipment_description||"No description"} · {cert.equipment_type||""}</div>
                        {cert.client_name&&<div style={{fontSize:11,color:T.textDim}}>{cert.client_name}</div>}
                      </div>
                      <button type="button" disabled={linking}
                        style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent"}}>
                        {linking?"Linking…":"Link →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CERTIFICATE CONTENT */}
          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:18,padding:32,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:24,marginBottom:10,opacity:.4}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading certificate…</div>
            </div>
          ):error?(
            <div style={{background:T.redDim,border:`1px solid ${T.redBrd}`,borderRadius:18,padding:18,color:T.red,fontSize:14,fontWeight:700}}>⚠ {error}</div>
          ):(
            <>
              <CertificateSheet certificate={record} index={0} total={bundle.length||1}/>

              {/* BUNDLE PANEL */}
              {bundle.length>1&&(
                <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:18,padding:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                    <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`}}/>
                    <div style={{fontSize:15,fontWeight:900}}>Linked certificates in this folder</div>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,background:T.accentDim,color:T.accent,border:`1px solid ${T.accentBrd}`}}>{bundle.length}</span>
                  </div>
                  <div style={{display:"grid",gap:10}}>
                    {bundle.map(item=>{
                      const active=String(item.id)===String(id);
                      const itemTone=resultTone(pickResult(item));
                      return(
                        <div key={item.id} className="bundle-item" style={{border:`1px solid ${active?T.accentBrd:T.border}`,background:active?T.accentDim:T.card,borderRadius:14,padding:"13px 16px"}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div style={{fontSize:14,fontWeight:800,color:T.text}}>{item.certificate_number||"—"}</div>
                              <span style={{padding:"2px 8px",borderRadius:99,background:itemTone.bg,color:itemTone.color,border:`1px solid ${itemTone.brd}`,fontSize:10,fontWeight:800}}>{itemTone.label}</span>
                              {active&&<span style={{fontSize:10,fontWeight:800,color:T.accent}}>← Current</span>}
                            </div>
                            <div style={{color:T.textMid,fontSize:13}}>{item.equipment_description||item.asset_name||"Unnamed equipment"}</div>
                            <div style={{color:T.textDim,fontSize:11,marginTop:4}}>Position {item.folder_position||1}</div>
                          </div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <Link href={`/certificates/${item.id}`}      style={S.btnGhostSm}>View</Link>
                            <Link href={`/certificates/${item.id}/edit`} style={S.btnGhostSm}>Edit</Link>
                            <button type="button"
                              onClick={async()=>{
                                await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:null}).eq("id",item.id);
                                await loadCertificate();
                              }}
                              style={{...S.btnGhostSm,border:`1px solid ${T.redBrd}`,color:T.red,background:T.redDim,cursor:"pointer"}}>
                              Unlink
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateDetailsPage(){
  return(
    <Suspense fallback={
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontSize:14,fontFamily:"'IBM Plex Sans',sans-serif"}}>
        Loading…
      </div>
    }>
      <CertificateDetailsInner/>
    </Suspense>
  );
}

const S={
  btnGhost:  {padding:"10px 16px",borderRadius:12,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"},
  btnAmber:  {padding:"10px 16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#fbbf24,#f97316)",color:"#1a0a00",fontWeight:900,fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center",justifyContent:"center"},
  btnGreen:  {padding:"10px 16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#34d399,#14b8a6)",color:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"},
  btnPurple: {padding:"10px 16px",borderRadius:12,border:`1px solid rgba(167,139,250,0.25)`,background:"rgba(167,139,250,0.10)",color:"#a78bfa",fontWeight:800,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"},
  btnGhostSm:{padding:"7px 12px",borderRadius:9,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:12,textDecoration:"none",display:"inline-flex",alignItems:"center",WebkitTapHighlightColor:"transparent"},
};
