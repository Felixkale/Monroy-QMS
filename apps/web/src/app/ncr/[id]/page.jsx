// src/app/ncr/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  .nd-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  .nd-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .nd-btn-row{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
  @media(max-width:768px){
    .nd-page{padding:12px!important}
    .nd-hdr{flex-direction:column!important;gap:10px!important}
    .nd-btn-row{width:100%}.nd-btn-row a,.nd-btn-row button{flex:1;text-align:center;justify-content:center}
    .nd-grid{grid-template-columns:1fr!important}
  }
  @media(max-width:480px){.nd-grid{grid-template-columns:1fr}}
`;

const sevCfg = s => ({
  critical:{color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Critical"},
  major:   {color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"Major"},
  minor:   {color:T.blue, bg:T.blueDim, brd:T.blueBrd, label:"Minor"},
}[s] || {color:T.textDim,bg:T.card,brd:T.border,label:s||"—"});

const stCfg = s => ({
  open:       {color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Open"},
  closed:     {color:T.green,bg:T.greenDim,brd:T.greenBrd,label:"Closed"},
  in_progress:{color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"In Progress"},
}[s] || {color:T.textDim,bg:T.card,brd:T.border,label:s||"Unknown"});

const capaStageCfg = s => ({
  identification: {label:"Identification", color:T.blue},
  investigation:  {label:"Investigation",  color:T.purple},
  root_cause:     {label:"Root Cause",     color:T.amber},
  action_plan:    {label:"Action Plan",    color:T.accent},
  implementation: {label:"Implementation", color:T.amber},
  verification:   {label:"Verification",   color:T.purple},
  closed:         {label:"Closed",         color:T.green},
}[s] || {label:s||"Unknown", color:T.textDim});

function fd(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?"—":d.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});}
function nz(v,fb="—"){if(!v&&v!==0)return fb;const s=String(v).trim();return s||fb;}

function Badge({label,color,bg,brd}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:11,fontWeight:800}}>{label}</span>;
}
function Row({label,value,mono=false}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
      <span style={{color:T.textDim,fontSize:12,flexShrink:0,minWidth:130}}>{label}</span>
      <span style={{color:T.textMid,fontWeight:600,textAlign:"right",wordBreak:"break-word",...(mono?{fontFamily:"'IBM Plex Mono',monospace",color:T.accent}:{})}}>{nz(value)}</span>
    </div>
  );
}
function Sec({icon,title,children,accent=false}){
  return(
    <div style={{background:accent?`rgba(34,211,238,0.04)`:T.panel,border:`1px solid ${accent?T.accentBrd:T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:15}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:accent?T.accent:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [ncr,setNcr]=useState(null);
  const [linkedCapa,setLinkedCapa]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [closing,setClosing]=useState(false);

  useEffect(()=>{
    if(!id)return;
    async function load(){
      setLoading(true);setError("");
      const[ncrRes,capaRes]=await Promise.all([
        supabase.from("ncrs").select(`
          *,
          assets(id,asset_tag,asset_name,asset_type,location,serial_number,clients(id,company_name))
        `).eq("id",id).maybeSingle(),
        supabase.from("capas").select("id,capa_number,stage,priority,title").eq("ncr_id",id).maybeSingle(),
      ]);
      if(ncrRes.error||!ncrRes.data){setError(ncrRes.error?.message||"NCR not found.");setLoading(false);return;}
      setNcr(ncrRes.data);
      setLinkedCapa(capaRes.data||null);
      setLoading(false);
    }
    load();
  },[id]);

  async function handleClose(){
    if(!ncr)return;
    setClosing(true);
    const{error:e}=await supabase.from("ncrs")
      .update({status:"closed",closed_date:new Date().toISOString().slice(0,10)})
      .eq("id",ncr.id);
    if(!e)setNcr(p=>({...p,status:"closed",closed_date:new Date().toISOString().slice(0,10)}));
    setClosing(false);
  }

  const sv = ncr ? sevCfg(ncr.severity) : null;
  const st = ncr ? stCfg(ncr.status)   : null;

  // Build CAPA creation URL with pre-filled params
  const capaNewUrl = ncr
    ? `/capa/new?ncr_id=${id}&asset_id=${ncr.asset_id||""}`
    : "/capa/new";

  return(
    <AppLayout title="NCR Detail">
      <style>{CSS}</style>
      <div className="nd-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="nd-hdr">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>Non-Conformance Report</div>
                <h1 style={{margin:0,fontSize:"clamp(16px,3vw,22px)",fontWeight:900,letterSpacing:"-0.02em",fontFamily:"'IBM Plex Mono',monospace",color:T.accent}}>
                  {loading?"Loading…":nz(ncr?.ncr_number,"NCR Detail")}
                </h1>
                {ncr&&(
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    <Badge label={sv.label} color={sv.color} bg={sv.bg} brd={sv.brd}/>
                    <Badge label={st.label} color={st.color} bg={st.bg} brd={st.brd}/>
                    {ncr.due_date&&(
                      <span style={{padding:"4px 12px",borderRadius:99,background:T.card,border:`1px solid ${T.border}`,fontSize:11,fontWeight:700,color:T.textDim}}>
                        Due: {fd(ncr.due_date)}
                      </span>
                    )}
                    {/* CAPA linked indicator */}
                    {linkedCapa&&(
                      <span style={{padding:"4px 12px",borderRadius:99,background:T.purpleDim,border:`1px solid ${T.purpleBrd}`,fontSize:11,fontWeight:800,color:T.purple}}>
                        🔧 CAPA Linked
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="nd-btn-row">
                <button type="button" onClick={()=>router.push("/ncr")}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  ← Back
                </button>

                {/* Create CAPA — only if no CAPA linked yet */}
                {ncr&&!linkedCapa&&(
                  <Link href={capaNewUrl}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,fontWeight:800,fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                    🔧 Create CAPA
                  </Link>
                )}

                {/* View existing CAPA */}
                {linkedCapa&&(
                  <Link href={`/capa/${linkedCapa.id}`}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,fontWeight:800,fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                    🔧 View CAPA
                  </Link>
                )}

                {ncr&&ncr.status!=="closed"&&(
                  <button type="button" onClick={handleClose} disabled={closing}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontWeight:800,fontSize:13,cursor:closing?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>
                    {closing?"Closing…":"✓ Close NCR"}
                  </button>
                )}

                {ncr&&(
                  <Link href={`/ncr/${id}/edit`}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.amberBrd}`,background:T.amberDim,color:T.amber,fontWeight:800,fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center"}}>
                    Edit
                  </Link>
                )}
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>⚠ {error}</div>}

          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading NCR…</div>
            </div>
          ):ncr&&(
            <>
              {/* LINKED CAPA CARD — shown at top if exists */}
              {linkedCapa&&(()=>{
                const sc=capaStageCfg(linkedCapa.stage);
                return(
                  <Sec icon="🔧" title="Linked CAPA" accent>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:12,fontFamily:"'IBM Plex Mono',monospace",color:T.accent,fontWeight:800,marginBottom:4}}>{linkedCapa.capa_number}</div>
                        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>{linkedCapa.title}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{padding:"3px 10px",borderRadius:99,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,fontSize:10,fontWeight:800,color:sc.color}}>
                            Stage: {sc.label}
                          </span>
                          <span style={{padding:"3px 10px",borderRadius:99,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.textDim,textTransform:"capitalize"}}>
                            Priority: {linkedCapa.priority}
                          </span>
                        </div>
                      </div>
                      <Link href={`/capa/${linkedCapa.id}`}
                        style={{padding:"9px 16px",borderRadius:10,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,textDecoration:"none",fontSize:13,fontWeight:800,whiteSpace:"nowrap"}}>
                        Open CAPA →
                      </Link>
                    </div>
                  </Sec>
                );
              })()}

              <div className="nd-grid">
                {/* NCR Info */}
                <Sec icon="📋" title="NCR Information">
                  <Row label="NCR Number"  value={ncr.ncr_number} mono />
                  <Row label="Title"       value={ncr.title} />
                  <Row label="Severity"    value={sv.label} />
                  <Row label="Status"      value={st.label} />
                  <Row label="Due Date"    value={fd(ncr.due_date)} />
                  <Row label="Closed Date" value={fd(ncr.closed_date)} />
                  <Row label="Raised By"   value={ncr.raised_by} />
                  <Row label="Assigned To" value={ncr.assigned_to} />
                  <Row label="Created"     value={fd(ncr.created_at)} />
                </Sec>

                {/* Equipment */}
                <Sec icon="⚙️" title="Equipment">
                  {ncr.assets?(
                    <>
                      <Row label="Asset Tag"   value={ncr.assets.asset_tag} mono />
                      <Row label="Asset Name"  value={ncr.assets.asset_name} />
                      <Row label="Asset Type"  value={ncr.assets.asset_type} />
                      <Row label="Location"    value={ncr.assets.location} />
                      <Row label="Serial No."  value={ncr.assets.serial_number} />
                      <Row label="Client"      value={ncr.assets.clients?.company_name} />
                      <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                        <Link href={`/equipment/${ncr.assets.asset_tag}`}
                          style={{padding:"7px 12px",borderRadius:9,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,textDecoration:"none",fontSize:12,fontWeight:700}}>
                          View Equipment
                        </Link>
                        {ncr.certificate_id&&(
                          <Link href={`/certificates/${ncr.certificate_id}`}
                            style={{padding:"7px 12px",borderRadius:9,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,textDecoration:"none",fontSize:12,fontWeight:700}}>
                            View Certificate
                          </Link>
                        )}
                      </div>
                    </>
                  ):(
                    <div style={{color:T.textDim,fontSize:13}}>No equipment linked.</div>
                  )}
                </Sec>
              </div>

              {ncr.description&&(
                <Sec icon="📝" title="Description">
                  <p style={{fontSize:14,color:T.textMid,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{ncr.description}</p>
                </Sec>
              )}

              {ncr.details&&(
                <Sec icon="📄" title="Details">
                  <p style={{fontSize:13,color:T.textMid,lineHeight:1.75,margin:0,whiteSpace:"pre-wrap",fontFamily:"'IBM Plex Mono',monospace"}}>{ncr.details}</p>
                </Sec>
              )}

              {ncr.corrective_action&&(
                <Sec icon="🔧" title="Corrective Action">
                  <p style={{fontSize:14,color:T.textMid,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{ncr.corrective_action}</p>
                </Sec>
              )}

              {ncr.root_cause&&(
                <Sec icon="🔍" title="Root Cause">
                  <p style={{fontSize:14,color:T.textMid,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{ncr.root_cause}</p>
                </Sec>
              )}

              {/* CTA if no CAPA yet and NCR is open */}
              {!linkedCapa&&ncr.status!=="closed"&&(
                <div style={{background:"rgba(167,139,250,0.06)",border:`1px solid ${T.purpleBrd}`,borderRadius:16,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:T.purple,marginBottom:4}}>No CAPA raised yet</div>
                    <div style={{fontSize:12,color:T.textDim}}>Create a Corrective &amp; Preventive Action to track the root cause and resolution of this NCR.</div>
                  </div>
                  <Link href={capaNewUrl}
                    style={{padding:"10px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#a78bfa,#60a5fa)",color:"#fff",fontWeight:900,fontSize:13,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>
                    🔧 Create CAPA
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
