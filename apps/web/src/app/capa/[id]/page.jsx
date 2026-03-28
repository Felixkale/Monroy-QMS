// src/app/capa/[id]/page.jsx
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
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  .cd-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  .cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .cd-stages{display:flex;gap:0;overflow-x:auto;padding-bottom:4px}
  @media(max-width:900px){.cd-grid{grid-template-columns:1fr!important}}
  @media(max-width:768px){
    .cd-page{padding:12px!important}
    .cd-hdr{flex-direction:column!important;gap:10px!important}
    .cd-hdr-btns{width:100%;display:flex;gap:8px;flex-wrap:wrap}.cd-hdr-btns button,.cd-hdr-btns a{flex:1;text-align:center;justify-content:center}
  }
`;

const IS={width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS={display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.45)",marginBottom:6};

const STAGES=[
  {key:"identification", label:"Identification", color:T.blue,   bg:T.blueDim,   brd:T.blueBrd,   step:1, icon:"🔍"},
  {key:"investigation",  label:"Investigation",  color:T.purple, bg:T.purpleDim, brd:T.purpleBrd, step:2, icon:"🔎"},
  {key:"root_cause",     label:"Root Cause",     color:T.amber,  bg:T.amberDim,  brd:T.amberBrd,  step:3, icon:"🌿"},
  {key:"action_plan",    label:"Action Plan",    color:T.accent, bg:T.accentDim, brd:T.accentBrd, step:4, icon:"📋"},
  {key:"implementation", label:"Implementation", color:T.amber,  bg:T.amberDim,  brd:T.amberBrd,  step:5, icon:"🔧"},
  {key:"verification",   label:"Verification",   color:T.purple, bg:T.purpleDim, brd:T.purpleBrd, step:6, icon:"✅"},
  {key:"closed",         label:"Closed",         color:T.green,  bg:T.greenDim,  brd:T.greenBrd,  step:7, icon:"🔒"},
];

const PRIORITIES={
  critical:{color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Critical"},
  high:    {color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"High"},
  medium:  {color:T.blue, bg:T.blueDim, brd:T.blueBrd, label:"Medium"},
  low:     {color:T.green,bg:T.greenDim,brd:T.greenBrd,label:"Low"},
};

const stageCfg = s => STAGES.find(x=>x.key===s)||STAGES[0];
const prioCfg  = p => PRIORITIES[p]||{color:T.textDim,bg:T.card,brd:T.border,label:p||"—"};
function fd(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?"—":d.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});}
function nz(v,fb="—"){if(!v&&v!==0)return fb;return String(v).trim()||fb;}
function toDate(v){if(!v)return "";const d=new Date(v);return isNaN(d.getTime())?"":d.toISOString().slice(0,10);}

function Badge({label,color,bg,brd}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:11,fontWeight:800}}>{label}</span>;
}
function Row({label,value,mono=false}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}>
      <span style={{color:T.textDim,flexShrink:0,minWidth:120}}>{label}</span>
      <span style={{color:T.textMid,fontWeight:600,textAlign:"right",wordBreak:"break-word",...(mono?{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.accent}:{})}}>{nz(value)}</span>
    </div>
  );
}
function Sec({icon,title,children,accent=false}){
  return(
    <div style={{background:accent?`rgba(34,211,238,0.04)`:T.panel,border:`1px solid ${accent?T.accentBrd:T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:11,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:15}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:accent?T.accent:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}
function TextBlock({value,placeholder="Not yet recorded."}){
  if(!value||!String(value).trim()) return <p style={{fontSize:13,color:T.textDim,fontStyle:"italic",margin:0}}>{placeholder}</p>;
  return <p style={{fontSize:13,color:T.textMid,lineHeight:1.75,margin:0,whiteSpace:"pre-wrap"}}>{value}</p>;
}
function F({label,children}){return <div><label style={LS}>{label}</label>{children}</div>;}

export default function CAPADetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [capa,setCapa]=useState(null);
  const [form,setForm]=useState({});
  const [assets,setAssets]=useState([]);
  const [ncrs,setNCRs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [editMode,setEditMode]=useState(false);

  useEffect(()=>{
    if(!id)return;
    async function load(){
      setLoading(true);setError("");
      const[capaRes,assetRes,ncrRes]=await Promise.all([
        supabase.from("capas").select(`*, ncrs(id,ncr_number,description), assets(id,asset_tag,asset_name,asset_type,location,clients(company_name))`).eq("id",id).maybeSingle(),
        supabase.from("assets").select("id,asset_tag,asset_name,clients(company_name)").order("asset_tag",{ascending:true}).limit(200),
        supabase.from("ncrs").select("id,ncr_number,description").order("created_at",{ascending:false}).limit(100),
      ]);
      if(capaRes.error||!capaRes.data){setError(capaRes.error?.message||"CAPA not found.");setLoading(false);return;}
      const c=capaRes.data;
      setCapa(c);
      setForm({
        title:c.title||"",type:c.type||"corrective",stage:c.stage||"identification",
        priority:c.priority||"medium",status:c.status||"open",
        raised_by:c.raised_by||"",assigned_to:c.assigned_to||"",verified_by:c.verified_by||"",
        target_date:toDate(c.target_date),
        problem_description:c.problem_description||"",immediate_action:c.immediate_action||"",
        investigation_notes:c.investigation_notes||"",root_cause:c.root_cause||"",
        root_cause_method:c.root_cause_method||"5_whys",corrective_action:c.corrective_action||"",
        preventive_action:c.preventive_action||"",implementation_notes:c.implementation_notes||"",
        verification_notes:c.verification_notes||"",lessons_learned:c.lessons_learned||"",remarks:c.remarks||"",
        asset_id:c.asset_id||"",ncr_id:c.ncr_id||"",
      });
      setAssets(assetRes.data||[]);
      setNCRs(ncrRes.data||[]);
      setLoading(false);
    }
    load();
  },[id]);

  const hc=e=>{const{name,value}=e.target;setForm(p=>({...p,[name]:value}));};

  async function handleSave(){
    setSaving(true);setError("");setSuccess("");
    try{
      const isClosed=form.stage==="closed";
      const{error:e}=await supabase.from("capas").update({
        title:form.title.trim()||"CAPA",type:form.type,stage:form.stage,
        priority:form.priority,status:isClosed?"closed":(form.stage==="verification"?"pending_verification":"in_progress"),
        raised_by:form.raised_by||null,assigned_to:form.assigned_to||null,verified_by:form.verified_by||null,
        target_date:form.target_date||null,
        problem_description:form.problem_description||null,immediate_action:form.immediate_action||null,
        investigation_notes:form.investigation_notes||null,root_cause:form.root_cause||null,
        root_cause_method:form.root_cause_method||null,corrective_action:form.corrective_action||null,
        preventive_action:form.preventive_action||null,implementation_notes:form.implementation_notes||null,
        verification_notes:form.verification_notes||null,lessons_learned:form.lessons_learned||null,
        remarks:form.remarks||null,asset_id:form.asset_id||null,ncr_id:form.ncr_id||null,
        actual_close_date:isClosed?new Date().toISOString().slice(0,10):null,
      }).eq("id",id);
      if(e)throw e;
      // Refresh
      const{data}=await supabase.from("capas").select(`*, ncrs(id,ncr_number,description), assets(id,asset_tag,asset_name,asset_type,location,clients(company_name))`).eq("id",id).maybeSingle();
      if(data){setCapa(data);}
      setSuccess("CAPA saved.");setEditMode(false);
    }catch(e){setError("Save failed: "+(e?.message||"Unknown error"));}
    finally{setSaving(false);}
  }

  // Advance to next stage
  async function advanceStage(){
    const currentIdx=STAGES.findIndex(s=>s.key===capa.stage);
    if(currentIdx>=STAGES.length-1)return;
    const next=STAGES[currentIdx+1];
    setSaving(true);
    const{error:e}=await supabase.from("capas").update({stage:next.key,status:next.key==="closed"?"closed":"in_progress",actual_close_date:next.key==="closed"?new Date().toISOString().slice(0,10):null}).eq("id",id);
    if(!e){setCapa(p=>({...p,stage:next.key}));setForm(p=>({...p,stage:next.key}));}
    setSaving(false);
  }

  const stage = capa ? stageCfg(capa.stage) : null;
  const prio  = capa ? prioCfg(capa.priority)  : null;
  const stageIdx = capa ? STAGES.findIndex(s=>s.key===capa.stage) : 0;
  const nextStage = stageIdx < STAGES.length-1 ? STAGES[stageIdx+1] : null;

  return(
    <AppLayout title="CAPA Detail">
      <style>{CSS}</style>
      <div className="cd-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="cd-hdr">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>CAPA · Corrective &amp; Preventive Action</div>
                <h1 style={{margin:0,fontSize:"clamp(15px,3vw,20px)",fontWeight:900,fontFamily:"'IBM Plex Mono',monospace",color:T.accent}}>
                  {loading?"Loading…":nz(capa?.capa_number)}
                </h1>
                {capa&&<p style={{margin:"4px 0 0",fontSize:14,fontWeight:700,color:T.text}}>{capa.title}</p>}
                {capa&&(
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    <Badge label={stage.label} color={stage.color} bg={stage.bg} brd={stage.brd}/>
                    <Badge label={prio.label}  color={prio.color}  bg={prio.bg}  brd={prio.brd}/>
                    {capa.type&&<span style={{padding:"4px 10px",borderRadius:99,background:T.card,border:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.textDim,textTransform:"capitalize"}}>{capa.type}</span>}
                    {capa.target_date&&<span style={{padding:"4px 10px",borderRadius:99,background:T.card,border:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.textDim}}>Due: {fd(capa.target_date)}</span>}
                  </div>
                )}
              </div>
              <div className="cd-hdr-btns" style={{display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
                <button type="button" onClick={()=>router.push("/capa")}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  ← Back
                </button>
                {capa&&nextStage&&capa.stage!=="closed"&&(
                  <button type="button" onClick={advanceStage} disabled={saving}
                    style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${nextStage.brd}`,background:nextStage.bg,color:nextStage.color,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>
                    {nextStage.icon} Advance → {nextStage.label}
                  </button>
                )}
                <button type="button" onClick={()=>setEditMode(p=>!p)}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.amberBrd}`,background:editMode?T.amberDim:T.card,color:editMode?T.amber:T.textMid,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  {editMode?"✕ Cancel Edit":"Edit"}
                </button>
              </div>
            </div>
          </div>

          {/* STAGE PROGRESS BAR */}
          {capa&&(
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 16px",backdropFilter:"blur(20px)"}}>
              <div className="cd-stages">
                {STAGES.map((s,i)=>{
                  const done=i<stageIdx;
                  const active=i===stageIdx;
                  return(
                    <div key={s.key} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:done||active?1:0.35}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:active?s.bg:done?T.greenDim:T.card,border:`2px solid ${active?s.brd:done?T.greenBrd:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:active?s.color:done?T.green:T.textDim}}>
                          {done?"✓":s.step}
                        </div>
                        <div style={{fontSize:8,fontWeight:800,color:active?s.color:done?T.green:T.textDim,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
                      </div>
                      {i<STAGES.length-1&&<div style={{width:20,height:2,background:done?T.green:T.border,margin:"0 4px",marginBottom:16,flexShrink:0,opacity:done?0.6:0.3}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error  &&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,  fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading CAPA…</div>
            </div>
          ):capa&&(
            editMode ? (
              /* ── EDIT MODE ── */
              <div style={{display:"grid",gap:14}}>
                <Sec icon="📋" title="CAPA Information" accent>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}>
                    <F label="Title"><input name="title" value={form.title} onChange={hc} style={IS}/></F>
                    <F label="Type">
                      <select name="type" value={form.type} onChange={hc} style={IS}>
                        <option value="corrective">Corrective</option>
                        <option value="preventive">Preventive</option>
                        <option value="both">Both</option>
                      </select>
                    </F>
                    <F label="Stage">
                      <select name="stage" value={form.stage} onChange={hc} style={IS}>
                        {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </F>
                    <F label="Priority">
                      <select name="priority" value={form.priority} onChange={hc} style={IS}>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </F>
                    <F label="Raised By"><input name="raised_by" value={form.raised_by} onChange={hc} style={IS}/></F>
                    <F label="Assigned To"><input name="assigned_to" value={form.assigned_to} onChange={hc} style={IS}/></F>
                    <F label="Verified By"><input name="verified_by" value={form.verified_by} onChange={hc} style={IS}/></F>
                    <F label="Target Date"><input name="target_date" type="date" value={form.target_date} onChange={hc} style={IS}/></F>
                  </div>
                  <div style={{display:"grid",gap:11}}>
                    <F label="Problem Description"><textarea name="problem_description" value={form.problem_description} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/></F>
                    <F label="Immediate / Containment Action"><textarea name="immediate_action" value={form.immediate_action} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/></F>
                    <F label="Investigation Notes"><textarea name="investigation_notes" value={form.investigation_notes} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/></F>
                    <F label="Root Cause (5 Whys / Fishbone)">
                      <select name="root_cause_method" value={form.root_cause_method} onChange={hc} style={{...IS,marginBottom:8}}>
                        <option value="5_whys">5 Whys</option>
                        <option value="fishbone">Fishbone (Ishikawa)</option>
                        <option value="pareto">Pareto Analysis</option>
                        <option value="other">Other</option>
                      </select>
                      <textarea name="root_cause" value={form.root_cause} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}} placeholder="What is the root cause?"/>
                    </F>
                    <F label="Corrective Action"><textarea name="corrective_action" value={form.corrective_action} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/></F>
                    <F label="Preventive Action"><textarea name="preventive_action" value={form.preventive_action} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/></F>
                    <F label="Implementation Evidence / Notes"><textarea name="implementation_notes" value={form.implementation_notes} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/></F>
                    <F label="Verification Notes (Was it effective?)"><textarea name="verification_notes" value={form.verification_notes} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/></F>
                    <F label="Lessons Learned"><textarea name="lessons_learned" value={form.lessons_learned} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/></F>
                    <F label="Remarks"><textarea name="remarks" value={form.remarks} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/></F>
                  </div>
                </Sec>

                <Sec icon="🔗" title="Links">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <F label="Linked NCR">
                      <select name="ncr_id" value={form.ncr_id} onChange={hc} style={IS}>
                        <option value="">No NCR linked</option>
                        {ncrs.map(n=><option key={n.id} value={n.id}>{n.ncr_number} — {(n.description||"").slice(0,50)}</option>)}
                      </select>
                    </F>
                    <F label="Linked Equipment">
                      <select name="asset_id" value={form.asset_id} onChange={hc} style={IS}>
                        <option value="">No equipment linked</option>
                        {assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} · {a.asset_name} · {a.clients?.company_name||"?"}</option>)}
                      </select>
                    </F>
                  </div>
                </Sec>

                <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingBottom:8}}>
                  <button type="button" onClick={handleSave} disabled={saving}
                    style={{padding:"12px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                    {saving?"Saving…":"Save CAPA"}
                  </button>
                  <button type="button" onClick={()=>setEditMode(false)}
                    style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <div style={{display:"grid",gap:14}}>
                <div className="cd-grid">
                  <Sec icon="📋" title="CAPA Details">
                    <Row label="CAPA Number"  value={capa.capa_number} mono/>
                    <Row label="Type"         value={capa.type}/>
                    <Row label="Stage"        value={stage.label}/>
                    <Row label="Priority"     value={prio.label}/>
                    <Row label="Raised By"    value={capa.raised_by}/>
                    <Row label="Assigned To"  value={capa.assigned_to}/>
                    <Row label="Verified By"  value={capa.verified_by}/>
                    <Row label="Target Date"  value={fd(capa.target_date)}/>
                    <Row label="Closed Date"  value={fd(capa.actual_close_date)}/>
                    <Row label="Created"      value={fd(capa.created_at)}/>
                  </Sec>

                  <Sec icon="🔗" title="Linked Records">
                    {capa.ncrs&&<>
                      <div style={{fontSize:10,fontWeight:700,color:T.textDim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Linked NCR</div>
                      <div style={{padding:"10px 12px",borderRadius:9,background:T.card,border:`1px solid ${T.border}`,marginBottom:12}}>
                        <div style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{capa.ncrs.ncr_number}</div>
                        <div style={{fontSize:11,color:T.textDim,marginTop:3}}>{(capa.ncrs.description||"").slice(0,100)}</div>
                        <Link href={`/ncr/${capa.ncr_id}`} style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700,marginTop:6,display:"inline-block"}}>View NCR →</Link>
                      </div>
                    </>}
                    {capa.assets&&<>
                      <div style={{fontSize:10,fontWeight:700,color:T.textDim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Equipment</div>
                      <div style={{padding:"10px 12px",borderRadius:9,background:T.card,border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:12,fontWeight:800,color:T.textMid,fontFamily:"'IBM Plex Mono',monospace"}}>{capa.assets.asset_tag}</div>
                        <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{capa.assets.asset_name} · {capa.assets.clients?.company_name||"?"}</div>
                        <div style={{fontSize:11,color:T.textDim}}>{capa.assets.location||""}</div>
                        <Link href={`/equipment/${capa.assets.asset_tag}`} style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700,marginTop:6,display:"inline-block"}}>View Equipment →</Link>
                      </div>
                    </>}
                    {!capa.ncrs&&!capa.assets&&<p style={{fontSize:13,color:T.textDim,fontStyle:"italic",margin:0}}>No records linked.</p>}
                  </Sec>
                </div>

                <Sec icon="🔍" title="Problem Identification">
                  <div style={{marginBottom:12}}>
                    <div style={LS}>Problem Description</div>
                    <TextBlock value={capa.problem_description}/>
                  </div>
                  <div>
                    <div style={LS}>Immediate / Containment Action</div>
                    <TextBlock value={capa.immediate_action}/>
                  </div>
                </Sec>

                <Sec icon="🔎" title="Investigation">
                  <TextBlock value={capa.investigation_notes}/>
                </Sec>

                <Sec icon="🌿" title="Root Cause Analysis">
                  {capa.root_cause_method&&<div style={{marginBottom:8}}>
                    <span style={{padding:"3px 10px",borderRadius:99,background:T.amberDim,color:T.amber,border:`1px solid ${T.amberBrd}`,fontSize:10,fontWeight:800}}>
                      Method: {(capa.root_cause_method||"").replace(/_/g," ").toUpperCase()}
                    </span>
                  </div>}
                  <TextBlock value={capa.root_cause} placeholder="Root cause not yet identified."/>
                </Sec>

                <div className="cd-grid">
                  <Sec icon="📋" title="Corrective Action">
                    <TextBlock value={capa.corrective_action} placeholder="Corrective action not yet defined."/>
                  </Sec>
                  <Sec icon="🛡️" title="Preventive Action">
                    <TextBlock value={capa.preventive_action} placeholder="Preventive action not yet defined."/>
                  </Sec>
                </div>

                <Sec icon="🔧" title="Implementation">
                  <TextBlock value={capa.implementation_notes} placeholder="Implementation not yet recorded."/>
                </Sec>

                <Sec icon="✅" title="Verification">
                  <TextBlock value={capa.verification_notes} placeholder="Verification not yet completed."/>
                </Sec>

                {capa.stage==="closed"&&(
                  <Sec icon="🔒" title="Lessons Learned" accent>
                    <TextBlock value={capa.lessons_learned} placeholder="Lessons learned not recorded."/>
                  </Sec>
                )}

                {capa.remarks&&(
                  <Sec icon="📝" title="Remarks">
                    <TextBlock value={capa.remarks}/>
                  </Sec>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
}
