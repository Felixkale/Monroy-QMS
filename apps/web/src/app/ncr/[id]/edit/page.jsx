// src/app/ncr/[id]/edit/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  .ne-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .ne-btn-row{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:768px){
    .ne-page{padding:12px!important}
    .ne-hdr{flex-direction:column!important;gap:10px!important}
    .ne-grid{grid-template-columns:1fr}
    .ne-btn-row{width:100%}.ne-btn-row button{flex:1}
  }
`;

const IS = {width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS = {display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7};

function F({label,children}){return <div><label style={LS}>{label}</label>{children}</div>;}
function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:15}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function toDate(v){if(!v)return "";const d=new Date(v);return isNaN(d.getTime())?"":d.toISOString().slice(0,10);}

export default function NCREditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [form,setForm]=useState({
    ncr_number:"",title:"",severity:"major",status:"open",
    description:"",details:"",corrective_action:"",root_cause:"",
    due_date:"",raised_by:"",assigned_to:"",remarks:"",
  });
  const [assets,setAssets]=useState([]);
  const [assetId,setAssetId]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{
    if(!id)return;
    async function load(){
      setLoading(true);setError("");
      const[ncrRes,assetRes]=await Promise.all([
        supabase.from("ncrs").select("*").eq("id",id).maybeSingle(),
        supabase.from("assets").select("id,asset_tag,asset_name,asset_type,clients(company_name)").order("asset_tag",{ascending:true}).limit(200),
      ]);
      if(ncrRes.error||!ncrRes.data){setError(ncrRes.error?.message||"NCR not found.");setLoading(false);return;}
      const n=ncrRes.data;
      setForm({
        ncr_number:n.ncr_number||"",title:n.title||"",severity:n.severity||"major",
        status:n.status||"open",description:n.description||"",details:n.details||"",
        corrective_action:n.corrective_action||"",root_cause:n.root_cause||"",
        due_date:toDate(n.due_date),raised_by:n.raised_by||"",
        assigned_to:n.assigned_to||"",remarks:n.remarks||"",
      });
      setAssetId(n.asset_id||"");
      setAssets(assetRes.data||[]);
      setLoading(false);
    }
    load();
  },[id]);

  const hc=e=>{const{name,value}=e.target;setForm(p=>({...p,[name]:value}));};

  async function handleSave(){
    setSaving(true);setError("");setSuccess("");
    try{
      const{error:e}=await supabase.from("ncrs").update({
        ncr_number:form.ncr_number.trim()||undefined,
        title:form.title.trim()||form.description.trim().slice(0,120)||"NCR",
        severity:form.severity,status:form.status,
        description:form.description.trim(),details:form.details.trim(),
        corrective_action:form.corrective_action.trim()||null,
        root_cause:form.root_cause.trim()||null,
        due_date:form.due_date||null,
        raised_by:form.raised_by.trim()||null,
        assigned_to:form.assigned_to.trim()||null,
        remarks:form.remarks.trim()||null,
        asset_id:assetId||null,
        closed_date:form.status==="closed"?new Date().toISOString().slice(0,10):null,
      }).eq("id",id);
      if(e)throw e;
      setSuccess("NCR saved successfully.");
      setTimeout(()=>router.push(`/ncr/${id}`),1100);
    }catch(e){setError("Save failed: "+(e?.message||"Unknown error"));}
    finally{setSaving(false);}
  }

  return(
    <AppLayout title="Edit NCR">
      <style>{CSS}</style>
      <div className="ne-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="ne-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>Non-Conformance Report</div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,24px)",fontWeight:900,letterSpacing:"-0.02em"}}>Edit NCR</h1>
                {form.ncr_number&&<p style={{margin:"5px 0 0",color:T.textDim,fontSize:12,fontFamily:"'IBM Plex Mono',monospace"}}>{form.ncr_number}</p>}
              </div>
              <button type="button" onClick={()=>router.push(`/ncr/${id}`)}
                style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>
                ← Back
              </button>
            </div>
          </div>

          {error  &&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,   fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green, fontSize:13,fontWeight:700}}>✓ {success}</div>}

          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading NCR…</div>
            </div>
          ):(
            <>
              <Sec icon="📋" title="NCR Information">
                <div className="ne-grid" style={{marginBottom:14}}>
                  <F label="NCR Number">
                    <input name="ncr_number" value={form.ncr_number} onChange={hc} style={IS}/>
                  </F>
                  <F label="Severity">
                    <select name="severity" value={form.severity} onChange={hc} style={IS}>
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </F>
                  <F label="Status">
                    <select name="status" value={form.status} onChange={hc} style={IS}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </F>
                  <F label="Due Date">
                    <input name="due_date" type="date" value={form.due_date} onChange={hc} style={IS}/>
                  </F>
                  <F label="Raised By">
                    <input name="raised_by" value={form.raised_by} onChange={hc} style={IS}/>
                  </F>
                  <F label="Assigned To">
                    <input name="assigned_to" value={form.assigned_to} onChange={hc} style={IS}/>
                  </F>
                </div>
                <div style={{display:"grid",gap:12}}>
                  <F label="Description">
                    <textarea name="description" value={form.description} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/>
                  </F>
                  <F label="Details">
                    <textarea name="details" value={form.details} onChange={hc} rows={8} style={{...IS,resize:"vertical",minHeight:160}}/>
                  </F>
                  <F label="Corrective Action">
                    <textarea name="corrective_action" value={form.corrective_action} onChange={hc} rows={4} style={{...IS,resize:"vertical",minHeight:100}} placeholder="What action was / will be taken?"/>
                  </F>
                  <F label="Root Cause">
                    <textarea name="root_cause" value={form.root_cause} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}} placeholder="What caused this non-conformance?"/>
                  </F>
                  <F label="Remarks">
                    <textarea name="remarks" value={form.remarks} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/>
                  </F>
                </div>
              </Sec>

              <Sec icon="⚙️" title="Equipment Link">
                <F label="Select Equipment">
                  <select value={assetId} onChange={e=>setAssetId(e.target.value)} style={IS}>
                    <option value="">No equipment linked</option>
                    {assets.map(a=>(
                      <option key={a.id} value={a.id}>
                        {a.asset_tag||"NO-TAG"} · {a.asset_name||"Unnamed"} · {a.clients?.company_name||"No Client"}
                      </option>
                    ))}
                  </select>
                </F>
              </Sec>

              <div className="ne-btn-row" style={{paddingBottom:8}}>
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{padding:"12px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:220}}>
                  {saving?"Saving…":"Save Changes"}
                </button>
                <button type="button" onClick={()=>router.push(`/ncr/${id}`)} disabled={saving}
                  style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
