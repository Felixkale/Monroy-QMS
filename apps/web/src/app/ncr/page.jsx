// src/app/ncr/page.jsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getNCRs, getNCRStats } from "@/services/ncrs";
import { getClientById } from "@/services/clients";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder{color:rgba(240,246,255,0.28)} select option{background:#0a1420;color:#f0f6ff}
  .ncr-row{cursor:pointer;transition:background .15s}.ncr-row:hover{background:rgba(34,211,238,0.03)!important}
  .flt-btn{transition:all .15s}

  .ncr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .ncr-mob-cards{display:none}

  @media(max-width:1024px){.ncr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:768px){
    .ncr-page-pad{padding:12px!important}
    .ncr-hdr{flex-direction:column!important;gap:12px!important;align-items:flex-start!important}
    .ncr-hdr-btns{width:100%}.ncr-hdr-btns a{flex:1;justify-content:center;text-align:center}
    .ncr-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .ncr-filters{flex-direction:column!important;gap:8px!important}
    .ncr-filters input{width:100%}
    .ncr-tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
    .ncr-mob-cards{display:grid;gap:10px;padding:12px}
    .ncr-tbl-inner{display:none!important}
  }
  @media(max-width:480px){
    .ncr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
    .flt-btn{font-size:11px!important;padding:7px 10px!important}
  }
`;

const severityCfg = {
  critical:{color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Critical"},
  major:   {color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"Major"},
  minor:   {color:T.blue, bg:T.blueDim, brd:T.blueBrd, label:"Minor"},
};
const statusCfg = {
  open:       {color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Open"},
  closed:     {color:T.green,bg:T.greenDim,brd:T.greenBrd,label:"Closed"},
  in_progress:{color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"In Progress"},
};
const sCfg = v => severityCfg[v] || {color:T.textDim,bg:T.card,brd:T.border,label:v||"—"};
const stCfg = v => statusCfg[v]   || {color:T.textDim,bg:T.card,brd:T.border,label:v||"Unknown"};

function formatDate(v){if(!v)return "—";const d=new Date(v);if(isNaN(d))return "—";return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}

function Badge({label,color,bg,brd}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{label}</span>;
}

function NCRPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");

  const [ncrs,setNCRs]=useState([]);
  const [stats,setStats]=useState({total:0,open:0,closed:0,critical:0});
  const [client,setClient]=useState(null);
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let ignore=false;
    async function load(){
      setLoading(true);setError("");
      try{
        const [ncrsRes,statsRes,clientRes]=await Promise.all([
          getNCRs(clientId),getNCRStats(clientId),
          clientId?getClientById(clientId):Promise.resolve({data:null}),
        ]);
        if(ignore)return;
        if(ncrsRes?.error) throw new Error(ncrsRes.error.message||"Failed to load NCRs.");
        setNCRs(ncrsRes?.data||[]);
        setStats(statsRes||{total:0,open:0,closed:0,critical:0});
        setClient(clientRes?.data||null);
      }catch(err){
        if(!ignore){setError(err.message||"Failed to load NCRs.");setNCRs([]);setStats({total:0,open:0,closed:0,critical:0});}
      }finally{if(!ignore)setLoading(false);}
    }
    load();
    return()=>{ignore=true;};
  },[clientId]);

  const filtered=useMemo(()=>ncrs.filter(n=>{
    const f=filter==="All"?"all":filter.toLowerCase().replace(" ","_");
    const mf=f==="all"||n.status===f;
    const q=search.trim().toLowerCase();
    const ms=!q||(n.ncr_number||"").toLowerCase().includes(q)||(n.description||"").toLowerCase().includes(q)||
      (n.assets?.asset_tag||"").toLowerCase().includes(q)||(n.assets?.asset_name||"").toLowerCase().includes(q)||
      (n.assets?.clients?.company_name||"").toLowerCase().includes(q);
    return mf&&ms;
  }),[ncrs,filter,search]);

  const FILTERS=[
    {key:"All",label:"All",count:ncrs.length},
    {key:"Open",label:"Open",count:stats.open},
    {key:"Closed",label:"Closed",count:stats.closed},
    {key:"In Progress",label:"In Progress",count:ncrs.filter(n=>n.status==="in_progress").length},
  ];

  const title=client?`NCRs — ${client.company_name}`:"Non-Conformance Reports";

  return(
    <AppLayout title={title}>
      <style>{CSS}</style>
      <div className="ncr-page-pad" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"grid",gap:18}}>

          {/* BREADCRUMB */}
          {client&&(
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.textDim,flexWrap:"wrap"}}>
              <a href="/clients" style={{color:T.textDim,textDecoration:"none"}}>Clients</a>
              <span>→</span>
              <a href={`/clients/${clientId}`} style={{color:T.textDim,textDecoration:"none"}}>{client.company_name}</a>
              <span>→</span>
              <span style={{color:T.textMid}}>NCRs</span>
            </div>
          )}

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px 24px",backdropFilter:"blur(20px)"}}>
            <div className="ncr-hdr" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,marginBottom:18}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:5,height:22,borderRadius:3,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent}}>Non-Conformance Reports</span>
                </div>
                <h1 style={{margin:0,fontSize:"clamp(20px,3vw,28px)",fontWeight:900,letterSpacing:"-0.02em"}}>{title}</h1>
                <p style={{margin:"6px 0 0",color:T.textDim,fontSize:13}}>{client?`All NCRs for ${client.company_name}`:"Track and manage equipment non-conformances"}</p>
              </div>
              <div className="ncr-hdr-btns" style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                {clientId&&<a href={`/clients/${clientId}`} style={S.btnGhost}>← Back to Client</a>}
                <a href={clientId?`/ncr/new?client=${clientId}`:"/ncr/new"} style={S.btnAccent}>+ Create NCR</a>
              </div>
            </div>

            {/* Stats */}
            <div className="ncr-stats">
              {[
                {label:"Total NCRs",value:stats.total,color:T.accent,glow:"rgba(34,211,238,0.15)"},
                {label:"Open",value:stats.open,color:T.red,glow:"rgba(248,113,113,0.15)"},
                {label:"Closed",value:stats.closed,color:T.green,glow:"rgba(52,211,153,0.15)"},
                {label:"Critical",value:stats.critical,color:T.amber,glow:"rgba(251,191,36,0.15)"},
              ].map(({label,value,color,glow})=>(
                <div key={label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at top right,${glow},transparent 70%)`,pointerEvents:"none"}}/>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:8}}>{label}</div>
                  <div style={{fontSize:28,fontWeight:900,color,lineHeight:1}}>{loading?"…":value}</div>
                </div>
              ))}
            </div>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>⚠ {error}</div>}

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:14,backdropFilter:"blur(20px)"}}>
            <div className="ncr-filters" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:"1 1 240px",minWidth:180}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by NCR number, equipment or description…"
                  style={{width:"100%",padding:"10px 12px 10px 30px",borderRadius:10,border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.03)",color:T.text,fontSize:13,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif"}}/>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {FILTERS.map(f=>(
                  <button key={f.key} type="button" className="flt-btn" onClick={()=>setFilter(f.key)}
                    style={{padding:"8px 14px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",
                      background:filter===f.key?T.accentDim:T.card,color:filter===f.key?T.accent:T.textDim,
                      outline:filter===f.key?`1px solid ${T.accentBrd}`:"none"}}>
                    {f.label} ({loading?"…":f.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:24,opacity:.4,marginBottom:10}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading NCRs…</div>
            </div>
          ):filtered.length===0?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:"48px 24px",textAlign:"center"}}>
              <div style={{fontSize:32,opacity:.3,marginBottom:12}}>⚠️</div>
              <div style={{fontSize:16,fontWeight:800,marginBottom:6}}>{search||filter!=="All"?"No NCRs match your search":"No NCRs recorded yet"}</div>
              <div style={{fontSize:13,color:T.textDim}}>{client?`No NCRs found for ${client.company_name}`:"Create an NCR to get started"}</div>
            </div>
          ):(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
              {/* Desktop table */}
              <div className="ncr-tbl-inner">
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
                    <thead>
                      <tr style={{background:"rgba(255,255,255,0.02)"}}>
                        {["NCR Number","Equipment","Client","Severity","Status","Due Date",""].map(h=>(
                          <td key={h} style={{padding:"10px 14px",fontSize:10,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((ncr,i)=>{
                        const sv=sCfg(ncr.severity);
                        const st=stCfg(ncr.status);
                        return(
                          <tr key={ncr.id} className="ncr-row" onClick={()=>router.push(`/ncr/${ncr.id}`)} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"12px 14px"}}>
                              <div style={{fontSize:13,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{ncr.ncr_number||ncr.id?.slice(0,8)}</div>
                              {ncr.description&&<div style={{fontSize:11,color:T.textDim,marginTop:3,maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ncr.description}</div>}
                            </td>
                            <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{ncr.assets?.asset_tag||"—"}<br/><span style={{fontSize:11,color:T.textDim}}>{ncr.assets?.asset_name||""}</span></td>
                            <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{ncr.assets?.clients?.company_name||"—"}</td>
                            <td style={{padding:"12px 14px"}}>{ncr.severity&&<Badge label={sv.label} color={sv.color} bg={sv.bg} brd={sv.brd}/>}</td>
                            <td style={{padding:"12px 14px"}}><Badge label={st.label} color={st.color} bg={st.bg} brd={st.brd}/></td>
                            <td style={{padding:"12px 14px",fontSize:12,color:T.textDim}}>{formatDate(ncr.due_date)}</td>
                            <td style={{padding:"12px 14px"}}><span style={{fontSize:11,color:T.accent,fontWeight:700}}>View →</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="ncr-mob-cards">
                {filtered.map(ncr=>{
                  const sv=sCfg(ncr.severity);
                  const st=stCfg(ncr.status);
                  return(
                    <div key={ncr.id} onClick={()=>router.push(`/ncr/${ncr.id}`)}
                      style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",display:"grid",gap:10,cursor:"pointer"}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:800,color:T.accent}}>{ncr.ncr_number||ncr.id?.slice(0,8)}</span>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {ncr.severity&&<Badge label={sv.label} color={sv.color} bg={sv.bg} brd={sv.brd}/>}
                          <Badge label={st.label} color={st.color} bg={st.bg} brd={st.brd}/>
                        </div>
                      </div>
                      {ncr.description&&<div style={{fontSize:12,color:T.textMid,lineHeight:1.4}}>{ncr.description.slice(0,100)}{ncr.description.length>100?"…":""}</div>}
                      <div style={{display:"flex",gap:16,fontSize:11,color:T.textDim,flexWrap:"wrap"}}>
                        {ncr.assets?.asset_tag&&<span>⚙ {ncr.assets.asset_tag}</span>}
                        {ncr.assets?.clients?.company_name&&<span>🏢 {ncr.assets.clients.company_name}</span>}
                        {ncr.due_date&&<span>📅 {formatDate(ncr.due_date)}</span>}
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

export default function NCRPage() {
  return(
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif"}}>Loading…</div>}>
      <NCRPageInner/>
    </Suspense>
  );
}

const S={
  btnAccent:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 18px",borderRadius:12,border:"none",background:`linear-gradient(135deg,#22d3ee,#60a5fa)`,color:"#001018",fontWeight:900,fontSize:13,textDecoration:"none",whiteSpace:"nowrap",fontFamily:"'IBM Plex Sans',sans-serif"},
  btnGhost:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",borderRadius:12,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,textDecoration:"none",whiteSpace:"nowrap",fontFamily:"'IBM Plex Sans',sans-serif"},
};
