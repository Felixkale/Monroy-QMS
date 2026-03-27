// src/app/ncr/new/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}

  .nc-layout{display:grid;grid-template-columns:1.3fr 0.7fr;gap:16px;align-items:start}
  .nc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}

  @media(max-width:900px){
    .nc-layout{grid-template-columns:1fr}
    .nc-sidebar{order:-1}
  }
  @media(max-width:600px){
    .nc-page{padding:10px!important}
    .nc-grid2{grid-template-columns:1fr}
    .nc-hdr{flex-direction:column!important;gap:10px!important}
    .nc-btn-row{flex-direction:column}
    .nc-btn-row button{width:100%}
  }
`;

const IS={width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS={display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.45)",marginBottom:6};

function nz(v,fb=""){if(v===null||v===undefined)return fb;const s=String(v).trim();return s||fb;}
function normalizeResult(v){return nz(v).toUpperCase().replace(/\s+/g,"_");}
function resultLabel(v){const x=normalizeResult(v);if(x==="FAIL")return "Fail";if(x==="REPAIR_REQUIRED")return "Repair Required";if(x==="OUT_OF_SERVICE")return "Out of Service";if(x==="PASS")return "Pass";return x||"Unknown";}
function defaultSeverity(r){const x=normalizeResult(r);if(x==="OUT_OF_SERVICE")return "critical";if(x==="FAIL"||x==="REPAIR_REQUIRED")return "major";return "minor";}
function defaultDue(s){const d=new Date();d.setDate(d.getDate()+(s==="critical"?7:s==="major"?14:30));return d.toISOString().slice(0,10);}
function genNcrNum(){const n=new Date();const p=v=>String(v).padStart(2,"0");const rand=Math.random().toString(36).slice(2,6).toUpperCase();return `NCR-${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}-${rand}`;}

function buildDesc(src){return `${resultLabel(src.result)} detected from certificate ${nz(src.certificate_number,"—")} for ${nz(src.equipment_description||src.asset_name||src.asset_tag,"equipment")}.`;}
function buildDetails(src){return ["NCR created from certificate.",`Cert: ${nz(src.certificate_number,"—")}`,`Client: ${nz(src.client_name,"—")}`,`Asset: ${nz(src.asset_tag,"—")} / ${nz(src.asset_name,"—")}`,`Equipment: ${nz(src.equipment_description,"—")}`,`Type: ${nz(src.equipment_type,"—")}`,`Result: ${resultLabel(src.result)}`,`Issued: ${nz(src.issue_date,"—")}`,`Expiry: ${nz(src.expiry_date,"—")}`].join("\n");}

async function fetchAssets(src){
  const sel="id,asset_tag,asset_name,asset_type,client_id,clients(id,company_name)";
  const tries=[];
  if(nz(src.asset_tag))tries.push(supabase.from("assets").select(sel).eq("asset_tag",src.asset_tag).limit(20));
  if(nz(src.asset_name))tries.push(supabase.from("assets").select(sel).ilike("asset_name",`%${src.asset_name}%`).limit(20));
  if(nz(src.equipment_description))tries.push(supabase.from("assets").select(sel).ilike("asset_name",`%${src.equipment_description}%`).limit(20));
  tries.push(supabase.from("assets").select(sel).order("created_at",{ascending:false}).limit(50));
  for(const q of tries){const{data,error}=await q;if(!error&&Array.isArray(data)&&data.length)return data;}
  return [];
}

function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:14}}>{icon}</span>
        <div style={{fontSize:13,fontWeight:800,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}
function F({label,children}){return <label style={{display:"grid",gap:6}}><span style={LS}>{label}</span>{children}</label>;}
function InfoRow({label,value}){return(
  <div style={{display:"flex",justifyContent:"space-between",gap:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`,fontSize:12}}>
    <span style={{color:T.textDim,flexShrink:0}}>{label}</span>
    <span style={{color:T.textMid,fontWeight:600,textAlign:"right",wordBreak:"break-word"}}>{value||"—"}</span>
  </div>
);}

function NCRCreateInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const src = useMemo(()=>({
    source:nz(sp.get("source")),certificate_id:nz(sp.get("certificate_id")),
    certificate_number:nz(sp.get("certificate_number")),inspection_number:nz(sp.get("inspection_number")),
    asset_tag:nz(sp.get("asset_tag")),asset_name:nz(sp.get("asset_name")),
    equipment_description:nz(sp.get("equipment_description")),equipment_type:nz(sp.get("equipment_type")),
    client_name:nz(sp.get("client_name")),result:nz(sp.get("result")),
    issue_date:nz(sp.get("issue_date")),expiry_date:nz(sp.get("expiry_date")),
  }),[sp]);

  const initSev=defaultSeverity(src.result);
  const [ncrNum,setNcrNum]=useState(genNcrNum());
  const [assetId,setAssetId]=useState("");
  const [severity,setSeverity]=useState(initSev);
  const [status,setStatus]=useState("open");
  const [desc,setDesc]=useState(buildDesc(src));
  const [details,setDetails]=useState(buildDetails(src));
  const [dueDate,setDueDate]=useState(defaultDue(initSev));
  const [assets,setAssets]=useState([]);
  const [loadingA,setLoadingA]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [assetErr,setAssetErr]=useState("");

  useEffect(()=>{
    let ig=false;
    async function load(){
      setLoadingA(true);setAssetErr("");
      try{const rows=await fetchAssets(src);if(!ig){setAssets(rows||[]);if(rows?.length)setAssetId(p=>p||rows[0].id);}}
      catch(e){if(!ig){setAssetErr(e?.message||"Failed to load equipment.");setAssets([]);}}
      finally{if(!ig)setLoadingA(false);}
    }
    load();return()=>{ig=true;};
  },[src]);

  useEffect(()=>{
    const s=defaultSeverity(src.result);
    setSeverity(s);setDueDate(defaultDue(s));setDesc(buildDesc(src));setDetails(buildDetails(src));
  },[src]);

  const selectedAsset=useMemo(()=>assets.find(a=>String(a.id)===String(assetId))||null,[assets,assetId]);

  async function handleCreate(e){
    e.preventDefault();setSaving(true);setError("");
    try{
      if(!assetId){setError("Select equipment first.");setSaving(false);return;}
      if(!desc.trim()){setError("Description is required.");setSaving(false);return;}
      const payload={
        ncr_number:ncrNum.trim()||genNcrNum(),
        title:desc.trim().slice(0,120),
        asset_id:assetId,severity,status,
        description:desc.trim(),details:details.trim(),due_date:dueDate||null,
      };
      const{data,error:ie}=await supabase.from("ncrs").insert(payload).select("id").single();
      if(ie)throw ie;
      router.push(`/ncr/${data.id}`);
    }catch(e){setError(e?.message||"Failed to create NCR.");setSaving(false);}
  }

  return(
    <AppLayout title="Create NCR">
      <style>{CSS}</style>
      <div className="nc-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="nc-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>Non-Conformance Report</div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,24px)",fontWeight:900,letterSpacing:"-0.02em"}}>Create NCR</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Auto-filled from certificate data where available</p>
              </div>
              <Link href="/ncr" style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,textDecoration:"none",whiteSpace:"nowrap"}}>← Back to NCRs</Link>
            </div>
          </div>

          {error&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}

          <div className="nc-layout">
            <form onSubmit={handleCreate} style={{display:"grid",gap:14}}>

              <Sec icon="📋" title="NCR Information">
                <div className="nc-grid2">
                  <F label="NCR Number"><input value={ncrNum} onChange={e=>setNcrNum(e.target.value)} style={IS} placeholder="NCR Number"/></F>
                  <F label="Severity">
                    <select value={severity} onChange={e=>setSeverity(e.target.value)} style={IS}>
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </F>
                  <F label="Status">
                    <select value={status} onChange={e=>setStatus(e.target.value)} style={IS}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </F>
                  <F label="Due Date"><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={IS}/></F>
                </div>
                <div style={{display:"grid",gap:12}}>
                  <F label="Description"><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={{...IS,resize:"vertical",minHeight:80}} placeholder="NCR description"/></F>
                  <F label="Details"><textarea value={details} onChange={e=>setDetails(e.target.value)} rows={8} style={{...IS,resize:"vertical",minHeight:160}} placeholder="Full NCR details"/></F>
                </div>
              </Sec>

              <Sec icon="⚙️" title="Equipment Link">
                {loadingA?(
                  <div style={{color:T.textDim,fontSize:12}}>Loading equipment…</div>
                ):assetErr?(
                  <div style={{padding:"10px 12px",borderRadius:9,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:12}}>{assetErr}</div>
                ):(
                  <>
                    <F label="Select Equipment">
                      <select value={assetId} onChange={e=>setAssetId(e.target.value)} style={IS}>
                        <option value="">Select equipment</option>
                        {assets.map(a=><option key={a.id} value={a.id}>{nz(a.asset_tag,"NO-TAG")} · {nz(a.asset_name,"Unnamed")} · {nz(a.clients?.company_name,"No Client")}</option>)}
                      </select>
                    </F>
                    {selectedAsset?(
                      <div style={{marginTop:10,display:"grid",gap:8,padding:12,borderRadius:10,background:T.card,border:`1px solid ${T.border}`}}>
                        <InfoRow label="Asset Tag"   value={selectedAsset.asset_tag}/>
                        <InfoRow label="Asset Name"  value={selectedAsset.asset_name}/>
                        <InfoRow label="Asset Type"  value={selectedAsset.asset_type}/>
                        <InfoRow label="Client"      value={selectedAsset.clients?.company_name}/>
                      </div>
                    ):(
                      <div style={{marginTop:10,padding:"10px 12px",borderRadius:9,border:`1px solid ${T.amberBrd}`,background:T.amberDim,color:T.amber,fontSize:12,fontWeight:600}}>
                        No equipment auto-selected. Pick the correct equipment before saving.
                      </div>
                    )}
                  </>
                )}
              </Sec>

              <div className="nc-btn-row" style={{display:"flex",gap:10,flexWrap:"wrap",paddingBottom:8}}>
                <button type="submit" disabled={saving} style={{padding:"12px 24px",borderRadius:11,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#60a5fa)",color:saving?"rgba(240,246,255,0.4)":"#001018",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:240}}>
                  {saving?"Creating…":"Create NCR"}
                </button>
                <button type="button" onClick={()=>router.push("/ncr")} disabled={saving} style={{padding:"12px 18px",borderRadius:11,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  Cancel
                </button>
              </div>
            </form>

            {/* SIDEBAR */}
            <div className="nc-sidebar" style={{display:"grid",gap:14}}>
              <Sec icon="📄" title="Certificate Source">
                <div style={{display:"grid",gap:8}}>
                  <InfoRow label="Certificate No." value={src.certificate_number}/>
                  <InfoRow label="Inspection No."  value={src.inspection_number}/>
                  <InfoRow label="Result"          value={resultLabel(src.result)}/>
                  <InfoRow label="Client"          value={src.client_name}/>
                  <InfoRow label="Asset Tag"        value={src.asset_tag}/>
                  <InfoRow label="Asset Name"       value={src.asset_name}/>
                  <InfoRow label="Equipment"        value={src.equipment_description}/>
                  <InfoRow label="Type"             value={src.equipment_type}/>
                  <InfoRow label="Issue Date"       value={src.issue_date}/>
                  <InfoRow label="Expiry Date"      value={src.expiry_date}/>
                </div>
                {src.certificate_id&&(
                  <Link href={`/certificates/${encodeURIComponent(src.certificate_id)}`}
                    style={{marginTop:12,display:"inline-flex",padding:"9px 14px",borderRadius:9,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,textDecoration:"none",fontWeight:700,fontSize:12}}>
                    Open Source Certificate →
                  </Link>
                )}
              </Sec>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function NCRCreatePage() {
  return(
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:14}}>Loading…</div>}>
      <NCRCreateInner/>
    </Suspense>
  );
}
