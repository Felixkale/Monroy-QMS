// src/app/capa/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder{color:rgba(240,246,255,0.28)}select option{background:#0a1420;color:#f0f6ff}
  .cr{cursor:pointer;transition:background .12s}.cr:hover td{background:rgba(34,211,238,0.03)!important}
  .cs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .cm{display:none}
  @media(max-width:1024px){.cs{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:768px){
    .cp{padding:10px!important}
    .ch{flex-direction:column!important;gap:10px!important;align-items:flex-start!important}
    .ch-btns{width:100%;display:flex!important;gap:8px}.ch-btns button{flex:1}
    .cs{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .cf{flex-direction:column!important;gap:8px!important}
    .ct{display:none!important}.cm{display:grid!important;gap:10px;padding:12px}
  }
  @media(max-width:480px){.cs{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

const STAGES = [
  {key:"identification",  label:"Identification",  color:T.blue,   bg:T.blueDim,   brd:T.blueBrd,   step:1},
  {key:"investigation",   label:"Investigation",   color:T.purple, bg:T.purpleDim, brd:T.purpleBrd, step:2},
  {key:"root_cause",      label:"Root Cause",      color:T.amber,  bg:T.amberDim,  brd:T.amberBrd,  step:3},
  {key:"action_plan",     label:"Action Plan",     color:T.accent, bg:T.accentDim, brd:T.accentBrd, step:4},
  {key:"implementation",  label:"Implementation",  color:T.amber,  bg:T.amberDim,  brd:T.amberBrd,  step:5},
  {key:"verification",    label:"Verification",    color:T.purple, bg:T.purpleDim, brd:T.purpleBrd, step:6},
  {key:"closed",          label:"Closed",          color:T.green,  bg:T.greenDim,  brd:T.greenBrd,  step:7},
];

const PRIORITIES = {
  critical:{color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Critical"},
  high:    {color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"High"},
  medium:  {color:T.blue, bg:T.blueDim, brd:T.blueBrd, label:"Medium"},
  low:     {color:T.green,bg:T.greenDim,brd:T.greenBrd,label:"Low"},
};

const stageCfg  = s => STAGES.find(x=>x.key===s)   || STAGES[0];
const prioCfg   = p => PRIORITIES[p] || {color:T.textDim,bg:T.card,brd:T.border,label:p||"—"};
function fd(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?"—":d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
function nz(v,fb="—"){if(!v&&v!==0)return fb;return String(v).trim()||fb;}

function Badge({label,color,bg,brd}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{label}</span>;
}

export default function CAPAPage() {
  const router = useRouter();
  const [capas,setCAPAs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");

  useEffect(()=>{
    async function load(){
      setLoading(true);setError("");
      const{data,error:e}=await supabase
        .from("capas")
        .select(`*, ncrs(ncr_number), assets(asset_tag,asset_name,clients(company_name))`)
        .order("created_at",{ascending:false});
      if(e){setError(e.message||"Failed to load CAPAs.");setCAPAs([]);}
      else setCAPAs(data||[]);
      setLoading(false);
    }
    load();
  },[]);

  const counts = useMemo(()=>({
    all:    capas.length,
    open:   capas.filter(c=>c.status!=="closed").length,
    closed: capas.filter(c=>c.status==="closed").length,
    critical:capas.filter(c=>c.priority==="critical"||c.priority==="high").length,
  }),[capas]);

  const filtered = useMemo(()=>{
    let rows = [...capas];
    if(filter==="open")   rows=rows.filter(c=>c.status!=="closed");
    if(filter==="closed") rows=rows.filter(c=>c.status==="closed");
    if(filter==="critical")rows=rows.filter(c=>c.priority==="critical"||c.priority==="high");
    if(search.trim()){
      const q=search.trim().toLowerCase();
      rows=rows.filter(c=>[c.capa_number,c.title,c.assigned_to,c.raised_by,
        c.assets?.asset_tag,c.assets?.asset_name,c.assets?.clients?.company_name,
        c.ncrs?.ncr_number].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
    }
    return rows;
  },[capas,filter,search]);

  const FILTERS=[
    {key:"all",     label:"All",        count:counts.all,     ac:"linear-gradient(135deg,#22d3ee,#60a5fa)",at:"#001018"},
    {key:"open",    label:"Open",       count:counts.open,    ac:"linear-gradient(135deg,#f87171,#ef4444)",at:"#fff"},
    {key:"closed",  label:"Closed",     count:counts.closed,  ac:"linear-gradient(135deg,#34d399,#22d3ee)",at:"#001018"},
    {key:"critical",label:"High/Critical",count:counts.critical,ac:"linear-gradient(135deg,#fbbf24,#f97316)",at:"#1a0800"},
  ];

  return(
    <AppLayout title="CAPA">
      <style>{CSS}</style>
      <div className="cp" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="ch" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent}}>ISO 9001 · Quality Management</span>
                </div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Corrective &amp; Preventive Actions</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Track root causes, actions, and verify effectiveness</p>
              </div>
              <div className="ch-btns" style={{display:"flex",gap:8,flexShrink:0}}>
                <button type="button" onClick={()=>router.push("/capa/new")}
                  style={{padding:"10px 18px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#22d3ee,#60a5fa)",color:"#001018",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap"}}>
                  + New CAPA
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="cs">
              {[
                {label:"Total CAPAs",value:counts.all,     color:T.accent,glow:"rgba(34,211,238,0.15)"},
                {label:"Open",       value:counts.open,    color:T.red,   glow:"rgba(248,113,113,0.15)"},
                {label:"Closed",     value:counts.closed,  color:T.green, glow:"rgba(52,211,153,0.15)"},
                {label:"High/Critical",value:counts.critical,color:T.amber,glow:"rgba(251,191,36,0.15)"},
              ].map(({label,value,color,glow})=>(
                <div key={label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at top right,${glow},transparent 70%)`,pointerEvents:"none"}}/>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:6}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:900,color,lineHeight:1}}>{loading?"…":value}</div>
                </div>
              ))}
            </div>
          </div>

          {error&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>⚠ {error}</div>}

          {/* WORKFLOW STAGES INDICATOR */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 16px",backdropFilter:"blur(20px)"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>CAPA Workflow Stages</div>
            <div style={{display:"flex",gap:0,alignItems:"center",overflowX:"auto",paddingBottom:4}}>
              {STAGES.map((s,i)=>(
                <div key={s.key} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:s.bg,border:`2px solid ${s.brd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:s.color}}>{s.step}</div>
                    <div style={{fontSize:9,fontWeight:700,color:T.textDim,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
                  </div>
                  {i<STAGES.length-1&&<div style={{width:24,height:2,background:`linear-gradient(90deg,${s.color},${STAGES[i+1].color})`,margin:"0 4px",opacity:.4,flexShrink:0,marginBottom:16}}/>}
                </div>
              ))}
            </div>
          </div>

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:12,backdropFilter:"blur(20px)"}}>
            <div className="cf" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:"1 1 220px",minWidth:160}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search CAPA number, title, equipment…"
                  style={{width:"100%",padding:"9px 12px 9px 30px",borderRadius:9,border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.03)",color:T.text,fontSize:13,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif"}}/>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {FILTERS.map(f=>(
                  <button key={f.key} type="button" onClick={()=>setFilter(f.key)}
                    style={{padding:"8px 12px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",
                      background:filter===f.key?f.ac:T.card,color:filter===f.key?f.at:T.textDim,
                      boxShadow:filter===f.key?"0 3px 10px rgba(0,0,0,0.25)":"none"}}>
                    {f.label} ({loading?"…":f.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading CAPAs…</div>
            </div>
          ):filtered.length===0?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:"44px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,opacity:.3,marginBottom:10}}>🔧</div>
              <div style={{fontSize:15,fontWeight:800,marginBottom:5}}>No CAPAs found</div>
              <div style={{fontSize:13,color:T.textDim}}>Create a CAPA to track corrective actions</div>
            </div>
          ):(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
              {/* Desktop table */}
              <div className="ct" style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
                  <thead>
                    <tr style={{background:"rgba(255,255,255,0.02)"}}>
                      {["CAPA Number","Title","Stage","Priority","Linked NCR","Equipment","Client","Due Date",""].map(h=>(
                        <td key={h} style={{padding:"10px 14px",fontSize:10,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c=>{
                      const stage=stageCfg(c.stage);
                      const prio=prioCfg(c.priority);
                      return(
                        <tr key={c.id} className="cr" onClick={()=>router.push(`/capa/${c.id}`)} style={{borderBottom:`1px solid ${T.border}`}}>
                          <td style={{padding:"12px 14px"}}>
                            <div style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{c.capa_number||"—"}</div>
                            <div style={{fontSize:10,color:T.textDim,marginTop:2,textTransform:"capitalize"}}>{c.type||"corrective"}</div>
                          </td>
                          <td style={{padding:"12px 14px",fontSize:13,color:T.text,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nz(c.title)}</td>
                          <td style={{padding:"12px 14px"}}><Badge label={stage.label} color={stage.color} bg={stage.bg} brd={stage.brd}/></td>
                          <td style={{padding:"12px 14px"}}><Badge label={prio.label} color={prio.color} bg={prio.bg} brd={prio.brd}/></td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>{c.ncrs?.ncr_number||"—"}</td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{c.assets?.asset_tag||"—"}</td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{c.assets?.clients?.company_name||"—"}</td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textDim}}>{fd(c.target_date)}</td>
                          <td style={{padding:"12px 14px"}}><span style={{fontSize:11,color:T.accent,fontWeight:700,whiteSpace:"nowrap"}}>View →</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="cm">
                {filtered.map(c=>{
                  const stage=stageCfg(c.stage);
                  const prio=prioCfg(c.priority);
                  return(
                    <div key={c.id} onClick={()=>router.push(`/capa/${c.id}`)}
                      style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",display:"grid",gap:9,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:800,color:T.accent}}>{c.capa_number||"—"}</span>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <Badge label={prio.label} color={prio.color} bg={prio.bg} brd={prio.brd}/>
                          <Badge label={stage.label} color={stage.color} bg={stage.bg} brd={stage.brd}/>
                        </div>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>{nz(c.title)}</div>
                      <div style={{display:"flex",gap:12,fontSize:11,color:T.textDim,flexWrap:"wrap"}}>
                        {c.assets?.asset_tag&&<span>⚙ {c.assets.asset_tag}</span>}
                        {c.assets?.clients?.company_name&&<span>🏢 {c.assets.clients.company_name}</span>}
                        {c.target_date&&<span>📅 {fd(c.target_date)}</span>}
                        {c.ncrs?.ncr_number&&<span>NCR: {c.ncrs.ncr_number}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
