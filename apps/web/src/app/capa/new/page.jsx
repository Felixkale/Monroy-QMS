// src/app/capa/new/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

const IS={width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS={display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.45)",marginBottom:7};

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  .cn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
  .cn-btn-row{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:768px){
    .cn-page{padding:12px!important}
    .cn-hdr{flex-direction:column!important;gap:10px!important}
    .cn-grid{grid-template-columns:1fr}
    .cn-btn-row{width:100%}.cn-btn-row button{flex:1}
  }
`;

function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:11,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:15}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}
function F({label,children}){return <div><label style={LS}>{label}</label>{children}</div>;}

function defaultDue(p){const d=new Date();d.setDate(d.getDate()+(p==="critical"?7:p==="high"?14:30));return d.toISOString().slice(0,10);}

function CAPACreateInner(){
  const router=useRouter();
  const sp=useSearchParams();
  const ncrId=sp.get("ncr_id")||"";
  const assetIdParam=sp.get("asset_id")||"";

  const [form,setForm]=useState({
    title:"",type:"corrective",priority:"medium",
    raised_by:"Moemedi Masupe",assigned_to:"",
    target_date:defaultDue("medium"),
    problem_description:"",immediate_action:"",
  });
  const [assets,setAssets]=useState([]);
  const [ncrs,setNCRs]=useState([]);
  const [assetId,setAssetId]=useState(assetIdParam);
  const [ncrIdVal,setNcrIdVal]=useState(ncrId);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    Promise.all([
      supabase.from("assets").select("id,asset_tag,asset_name,clients(company_name)").order("asset_tag",{ascending:true}).limit(200),
      supabase.from("ncrs").select("id,ncr_number,description,asset_id").order("created_at",{ascending:false}).limit(100),
    ]).then(([ar,nr])=>{
      setAssets(ar.data||[]);
      setNCRs(nr.data||[]);
      // Auto-fill asset from NCR
      if(ncrId&&nr.data){
        const n=nr.data.find(x=>x.id===ncrId);
        if(n?.asset_id)setAssetId(p=>p||n.asset_id);
        if(n?.description)setForm(p=>({...p,title:`CAPA for ${n.ncr_number||"NCR"}`,problem_description:n.description||""}));
      }
    });
  },[ncrId]);

  const hc=e=>{
    const{name,value}=e.target;
    setForm(p=>{
      const next={...p,[name]:value};
      if(name==="priority")next.target_date=defaultDue(value);
      return next;
    });
  };

  async function handleCreate(e){
    e.preventDefault();setSaving(true);setError("");
    try{
      if(!form.title.trim())throw new Error("Title is required.");
      const{data,error:ie}=await supabase.from("capas").insert({
        title:form.title.trim(),type:form.type,priority:form.priority,
        stage:"identification",status:"open",
        raised_by:form.raised_by||null,assigned_to:form.assigned_to||null,
        target_date:form.target_date||null,
        problem_description:form.problem_description||null,
        immediate_action:form.immediate_action||null,
        asset_id:assetId||null,ncr_id:ncrIdVal||null,
      }).select("id").single();
      if(ie)throw ie;
      router.push(`/capa/${data.id}`);
    }catch(e){setError(e?.message||"Failed to create CAPA.");}
    finally{setSaving(false);}
  }

  return(
    <AppLayout title="New CAPA">
      <style>{CSS}</style>
      <div className="cn-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gap:16}}>

          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="cn-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>CAPA · Corrective &amp; Preventive Action</div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,24px)",fontWeight:900,letterSpacing:"-0.02em"}}>Create CAPA</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Track the full lifecycle of a corrective or preventive action</p>
              </div>
              <button type="button" onClick={()=>router.push("/capa")}
                style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                ← Back
              </button>
            </div>
          </div>

          {error&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}

          <form onSubmit={handleCreate} style={{display:"grid",gap:14}}>
            <Sec icon="📋" title="CAPA Details">
              <div className="cn-grid" style={{marginBottom:14}}>
                <div style={{gridColumn:"1/-1"}}>
                  <F label="Title *"><input name="title" value={form.title} onChange={hc} style={IS} placeholder="Brief description of the CAPA"/></F>
                </div>
                <F label="Type">
                  <select name="type" value={form.type} onChange={hc} style={IS}>
                    <option value="corrective">Corrective — fix existing issue</option>
                    <option value="preventive">Preventive — prevent future issue</option>
                    <option value="both">Both</option>
                  </select>
                </F>
                <F label="Priority">
                  <select name="priority" value={form.priority} onChange={hc} style={IS}>
                    <option value="critical">Critical (due in 7 days)</option>
                    <option value="high">High (due in 14 days)</option>
                    <option value="medium">Medium (due in 30 days)</option>
                    <option value="low">Low</option>
                  </select>
                </F>
                <F label="Raised By"><input name="raised_by" value={form.raised_by} onChange={hc} style={IS}/></F>
                <F label="Assigned To"><input name="assigned_to" value={form.assigned_to} onChange={hc} style={IS}/></F>
                <F label="Target Date"><input name="target_date" type="date" value={form.target_date} onChange={hc} style={IS}/></F>
              </div>
              <div style={{display:"grid",gap:11}}>
                <F label="Problem Description">
                  <textarea name="problem_description" value={form.problem_description} onChange={hc} rows={4} style={{...IS,resize:"vertical",minHeight:100}} placeholder="What is the non-conformance or risk?"/>
                </F>
                <F label="Immediate / Containment Action">
                  <textarea name="immediate_action" value={form.immediate_action} onChange={hc} rows={2} style={{...IS,resize:"vertical"}} placeholder="What immediate action was taken to contain the issue?"/>
                </F>
              </div>
            </Sec>

            <Sec icon="🔗" title="Link to NCR &amp; Equipment">
              <div className="cn-grid">
                <F label="Linked NCR">
                  <select value={ncrIdVal} onChange={e=>setNcrIdVal(e.target.value)} style={IS}>
                    <option value="">No NCR linked</option>
                    {ncrs.map(n=><option key={n.id} value={n.id}>{n.ncr_number} — {(n.description||"").slice(0,60)}</option>)}
                  </select>
                </F>
                <F label="Linked Equipment">
                  <select value={assetId} onChange={e=>setAssetId(e.target.value)} style={IS}>
                    <option value="">No equipment linked</option>
                    {assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} · {a.asset_name} · {a.clients?.company_name||"?"}</option>)}
                  </select>
                </F>
              </div>
            </Sec>

            <div className="cn-btn-row" style={{paddingBottom:8}}>
              <button type="submit" disabled={saving}
                style={{padding:"12px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#60a5fa)",color:saving?"rgba(240,246,255,0.4)":"#001018",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:220}}>
                {saving?"Creating…":"Create CAPA"}
              </button>
              <button type="button" onClick={()=>router.push("/capa")} disabled={saving}
                style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

export default function CAPACreatePage(){
  return(
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontSize:14}}>Loading…</div>}>
      <CAPACreateInner/>
    </Suspense>
  );
}
