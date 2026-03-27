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
  .nr{cursor:pointer;transition:background .15s}.nr:hover td{background:rgba(34,211,238,0.03)!important}
  .fb{transition:all .15s}

  .ns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .nm{display:none}
  .ntw{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .ntbl{width:100%;border-collapse:collapse;min-width:760px}

  @media(max-width:1024px){.ns{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:768px){
    .np{padding:10px!important}
    .nh{flex-direction:column!important;gap:10px!important;align-items:flex-start!important}
    .nh-btns{width:100%;display:flex!important;gap:8px}
    .nh-btns a{flex:1;justify-content:center;text-align:center}
    .nf{flex-direction:column!important;gap:8px!important}
    .nf input{width:100%!important}
    .ntw{display:none!important}
    .nm{display:grid!important;gap:10px;padding:12px}
  }
  @media(max-width:480px){
    .ns{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .fb{font-size:11px!important;padding:7px 9px!important}
    .nh-btns{flex-direction:column}
  }
`;

const sevCfg = s => ({
  critical:{color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Critical"},
  major:   {color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"Major"},
  minor:   {color:T.blue, bg:T.blueDim, brd:T.blueBrd, label:"Minor"},
}[s]||{color:T.textDim,bg:T.card,brd:T.border,label:s||"—"});

const stCfg = s => ({
  open:       {color:T.red,  bg:T.redDim,  brd:T.redBrd,  label:"Open"},
  closed:     {color:T.green,bg:T.greenDim,brd:T.greenBrd,label:"Closed"},
  in_progress:{color:T.amber,bg:T.amberDim,brd:T.amberBrd,label:"In Progress"},
}[s]||{color:T.textDim,bg:T.card,brd:T.border,label:s||"Unknown"});

function fd(v){if(!v)return "—";const d=new Date(v);return isNaN(d)?"—":d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
function Badge({label,color,bg,brd}){return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{label}</span>;}

function NCRInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const clientId = sp.get("client");
  const [ncrs,setNCRs]=useState([]);
  const [stats,setStats]=useState({total:0,open:0,closed:0,critical:0});
  const [client,setClient]=useState(null);
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let ig=false;
    async function load(){
      setLoading(true);setError("");
      try{
        const [nr,sr,cr]=await Promise.all([getNCRs(clientId),getNCRStats(clientId),clientId?getClientById(clientId):Promise.resolve({data:null})]);
        if(ig)return;
        if(nr?.error)throw new Error(nr.error.message||"Failed to load NCRs.");
        setNCRs(nr?.data||[]);setStats(sr||{total:0,open:0,closed:0,critical:0});setClient(cr?.data||null);
      }catch(e){if(!ig){setError(e.message||"Failed to load.");setNCRs([]);setStats({total:0,open:0,closed:0,critical:0});}}
      finally{if(!ig)setLoading(false);}
    }
    load();return()=>{ig=true;};
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
    {key:"All",label:"All",count:ncrs.length,ac:"linear-gradient(135deg,#22d3ee,#60a5fa)",at:"#001018"},
    {key:"Open",label:"Open",count:stats.open,ac:"linear-gradient(135deg,#f87171,#ef4444)",at:"#fff"},
    {key:"Closed",label:"Closed",count:stats.closed,ac:"linear-gradient(135deg,#34d399,#22d3ee)",at:"#001018"},
    {key:"In Progress",label:"In Progress",count:ncrs.filter(n=>n.status==="in_progress").length,ac:"linear-gradient(135deg,#fbbf24,#f97316)",at:"#1a0800"},
  ];

  const title=client?`NCRs — ${client.company_name}`:"Non-Conformance Reports";

  return(
    <AppLayout title={title}>
      <style>{CSS}</style>
      <div className="np" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"grid",gap:16}}>

          {client&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.textDim,flexWrap:"wrap"}}>
            <a href="/clients" style={{color:T.textDim,textDecoration:"none"}}>Clients</a><span>→</span>
            <a href={`/clients/${clientId}`} style={{color:T.textDim,textDecoration:"none"}}>{client.company_name}</a><span>→</span>
            <span style={{color:T.textMid}}>NCRs</span>
          </div>}

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="nh" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent}}>Non-Conformance Reports</span>
                </div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>{client?`All NCRs for ${client.company_name}`:"Track and manage equipment non-conformances"}</p>
              </div>
              <div className="nh-btns" style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                {clientId&&<a href={`/clients/${clientId}`} style={S.ghost}>← Back</a>}
                <a href={clientId?`/ncr/new?client=${clientId}`:"/ncr/new"} style={S.accent}>+ Create NCR</a>
              </div>
            </div>
            <div className="ns">
              {[
                {label:"Total",value:stats.total,color:T.accent,glow:"rgba(34,211,238,0.15)"},
                {label:"Open",value:stats.open,color:T.red,glow:"rgba(248,113,113,0.15)"},
                {label:"Closed",value:stats.closed,color:T.green,glow:"rgba(52,211,153,0.15)"},
                {label:"Critical",value:stats.critical,color:T.amber,glow:"rgba(251,191,36,0.15)"},
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

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:12,backdropFilter:"blur(20px)"}}>
            <div className="nf" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:"1 1 220px",minWidth:160}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search NCR, equipment…"
                  style={{width:"100%",padding:"9px 12px 9px 30px",borderRadius:9,border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.03)",color:T.text,fontSize:13,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif"}}/>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {FILTERS.map(f=>(
                  <button key={f.key} type="button" className="fb" onClick={()=>setFilter(f.key)}
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
              <div style={{fontSize:13,fontWeight:600}}>Loading NCRs…</div>
            </div>
          ):filtered.length===0?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:"44px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,opacity:.3,marginBottom:10}}>⚠️</div>
              <div style={{fontSize:15,fontWeight:800,marginBottom:5}}>{search||filter!=="All"?"No NCRs match your search":"No NCRs recorded yet"}</div>
              <div style={{fontSize:13,color:T.textDim}}>{client?`No NCRs found for ${client.company_name}`:"Create an NCR to get started"}</div>
            </div>
          ):(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
              {/* Desktop table */}
              <div className="ntw">
                <table className="ntbl">
                  <thead>
                    <tr style={{background:"rgba(255,255,255,0.02)"}}>
                      {["NCR Number","Equipment","Client","Severity","Status","Due Date",""].map(h=>(
                        <td key={h} style={{padding:"10px 14px",fontSize:10,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ncr=>{
                      const sv=sevCfg(ncr.severity);
                      const st=stCfg(ncr.status);
                      return(
                        <tr key={ncr.id} className="nr" onClick={()=>router.push(`/ncr/${ncr.id}`)} style={{borderBottom:`1px solid ${T.border}`}}>
                          <td style={{padding:"12px 14px"}}>
                            <div style={{fontSize:13,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{ncr.ncr_number||ncr.id?.slice(0,8)}</div>
                            {ncr.description&&<div style={{fontSize:11,color:T.textDim,marginTop:2,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ncr.description}</div>}
                          </td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{ncr.assets?.asset_tag||"—"}<br/><span style={{fontSize:11,color:T.textDim}}>{ncr.assets?.asset_name||""}</span></td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textMid}}>{ncr.assets?.clients?.company_name||"—"}</td>
                          <td style={{padding:"12px 14px"}}>{ncr.severity&&<Badge label={sv.label} color={sv.color} bg={sv.bg} brd={sv.brd}/>}</td>
                          <td style={{padding:"12px 14px"}}><Badge label={st.label} color={st.color} bg={st.bg} brd={st.brd}/></td>
                          <td style={{padding:"12px 14px",fontSize:12,color:T.textDim}}>{fd(ncr.due_date)}</td>
                          <td style={{padding:"12px 14px"}}><span style={{fontSize:11,color:T.accent,fontWeight:700,whiteSpace:"nowrap"}}>View →</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="nm">
                {filtered.map(ncr=>{
                  const sv=sevCfg(ncr.severity);
                  const st=stCfg(ncr.status);
                  return(
                    <div key={ncr.id} onClick={()=>router.push(`/ncr/${ncr.id}`)}
                      style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",display:"grid",gap:9,cursor:"pointer",WebkitTapHighlightColor:"transparent",activeOpacity:.7}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",alignItems:"flex-start"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:800,color:T.accent}}>{ncr.ncr_number||ncr.id?.slice(0,8)}</span>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {ncr.severity&&<Badge label={sv.label} color={sv.color} bg={sv.bg} brd={sv.brd}/>}
                          <Badge label={st.label} color={st.color} bg={st.bg} brd={st.brd}/>
                        </div>
                      </div>
                      {ncr.description&&<div style={{fontSize:12,color:T.textMid,lineHeight:1.4}}>{ncr.description.slice(0,100)}{ncr.description.length>100?"…":""}</div>}
                      <div style={{display:"flex",gap:12,fontSize:11,color:T.textDim,flexWrap:"wrap"}}>
                        {ncr.assets?.asset_tag&&<span>⚙ {ncr.assets.asset_tag}</span>}
                        {ncr.assets?.clients?.company_name&&<span>🏢 {ncr.assets.clients.company_name}</span>}
                        {ncr.due_date&&<span>📅 {fd(ncr.due_date)}</span>}
                      </div>
                      <div style={{display:"flex",justifyContent:"flex-end"}}>
                        <span style={{fontSize:11,color:T.accent,fontWeight:700}}>View →</span>
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
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(240,246,255,0.4)",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:14}}>Loading…</div>}>
      <NCRInner/>
    </Suspense>
  );
}

const S={
  accent:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#22d3ee,#60a5fa)",color:"#001018",fontWeight:900,fontSize:13,textDecoration:"none",whiteSpace:"nowrap",fontFamily:"'IBM Plex Sans',sans-serif"},
  ghost:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 14px",borderRadius:11,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,textDecoration:"none",whiteSpace:"nowrap",fontFamily:"'IBM Plex Sans',sans-serif"},
};
