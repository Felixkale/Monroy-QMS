// src/app/certificates/CertificatesPageClient.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)",card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)",borderMid:"rgba(148,163,184,0.22)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder{color:rgba(240,246,255,0.28)}select option{background:#0a1420;color:#f0f6ff}
  .cr{transition:background .12s}.cr:hover{background:rgba(34,211,238,0.03)!important}
  .cert-mob{display:none}
  .cert-tbl{display:block}
  .cert-filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr}

  @media(max-width:1100px){.cert-filters{grid-template-columns:1fr 1fr 1fr}}
  @media(max-width:768px){
    .cert-page{padding:10px!important}
    .cert-top{flex-direction:column!important;gap:10px!important;align-items:flex-start!important}
    .cert-top-btns{width:100%;display:flex!important;gap:8px}
    .cert-top-btns a{flex:1;text-align:center;justify-content:center}
    .cert-filters{grid-template-columns:1fr 1fr}
    .cert-tbl{display:none!important}
    .cert-mob{display:grid!important;gap:10px;padding:12px}
    .view-toggle{display:none!important}
  }
  @media(max-width:480px){
    .cert-filters{grid-template-columns:1fr}
    .cert-top-btns{flex-direction:column}
    .cert-top-btns a{text-align:center}
  }
`;

function nz(v,fb="—"){if(v===null||v===undefined)return fb;const s=String(v).trim();return s||fb;}
function normalizeResult(v){const x=String(v||"").toUpperCase().replace(/\s+/g,"_");if(["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(x))return x;if(x==="CONDITIONAL")return "REPAIR_REQUIRED";return "UNKNOWN";}
function formatDate(v){if(!v)return "—";const d=new Date(v);if(isNaN(d))return String(v);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
function daysDiff(v){if(!v)return null;const d=new Date(v);if(isNaN(d))return null;const t=new Date();return Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())- new Date(t.getFullYear(),t.getMonth(),t.getDate()))/86400000);}
function expiryBucket(v){const d=daysDiff(v);if(d===null)return "NO_EXPIRY";if(d<0)return "EXPIRED";if(d<=30)return "EXPIRING_SOON";if(d<=90)return "EXPIRING_90";return "VALID";}

const RC={
  PASS:         {label:"Pass",          color:T.green,  bg:T.greenDim,  brd:T.greenBrd},
  FAIL:         {label:"Fail",          color:T.red,    bg:T.redDim,    brd:T.redBrd},
  REPAIR_REQUIRED:{label:"Repair req.", color:T.amber,  bg:T.amberDim,  brd:T.amberBrd},
  OUT_OF_SERVICE: {label:"Out of svc",  color:T.purple, bg:T.purpleDim, brd:T.purpleBrd},
  UNKNOWN:      {label:"Unknown",       color:T.textDim,bg:T.card,      brd:T.border},
};
const EC={
  EXPIRED:      {color:T.red,   bg:T.redDim},
  EXPIRING_SOON:{color:T.amber, bg:T.amberDim},
  EXPIRING_90:  {color:T.purple,bg:T.purpleDim},
  VALID:        {color:T.green, bg:T.greenDim},
  NO_EXPIRY:    {color:T.textDim,bg:T.card},
};
const rc=v=>RC[v]||RC.UNKNOWN;
const ec=v=>EC[v]||EC.NO_EXPIRY;

function Badge({label,color,bg,brd}){
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{label}</span>;
}

function groupCerts(rows){
  const g={};
  for (const r of rows) {
    const cl = nz(r.client_name, "UNASSIGNED");
    const tp = nz(r.equipment_type || r.asset_type, "UNCATEGORIZED");
    const ds = nz(r.equipment_description || r.asset_name || r.asset_tag, "UNNAMED");
    if (!g[cl]) g[cl] = {};
    if (!g[cl][tp]) g[cl][tp] = {};
    if (!g[cl][tp][ds]) g[cl][tp][ds] = [];
    g[cl][tp][ds].push(r);
  }
  return Object.keys(g).sort().map(cl => ({
    client: cl,
    types: Object.keys(g[cl]).sort().map(tp => ({
      type: tp,
      items: Object.keys(g[cl][tp]).sort().map(ds => ({
        desc: ds,
        certs: [...g[cl][tp][ds]].sort(
          (a, b) => new Date(b.issue_date || b.created_at || 0) - new Date(a.issue_date || a.created_at || 0)
        ),
      })),
    })),
  }));
}

export default function CertificatesPageClient() {
  const [certs,setCerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [errTxt,setErrTxt]=useState("");
  const [search,setSearch]=useState("");
  const [fResult,setFResult]=useState("ALL");
  const [fExpiry,setFExpiry]=useState("ALL");
  const [fClient,setFClient]=useState("ALL");
  const [fType,setFType]=useState("ALL");
  const [fStatus,setFStatus]=useState("ALL");
  const [view,setView]=useState("grouped");
  const [openClients,setOpenClients]=useState({});
  const [openTypes,setOpenTypes]=useState({});

  useEffect(()=>{loadCerts();},[]);

  async function loadCerts(){
    setLoading(true);setErrTxt("");
    const{data,error}=await supabase.from("certificates").select(`
      id,certificate_number,result,issue_date,issued_at,expiry_date,valid_to,created_at,
      inspection_number,inspection_no,asset_tag,asset_name,equipment_description,equipment_type,
      asset_type,client_name,company,status,folder_id,folder_name,folder_position,extracted_data,
      assets(id,asset_tag,asset_name,asset_type,location,clients(id,company_name)),
      clients(id,company_name)
    `).order("created_at",{ascending:false});
    if(error){setCerts([]);setErrTxt(error.message||"Failed to load.");setLoading(false);return;}
    const cleaned=(data||[]).map(r=>{
      const ex=r.extracted_data||{};
      const issue=r.issue_date||r.issued_at||ex.issue_date||null;
      const expiry=r.expiry_date||r.valid_to||ex.expiry_date||null;
      // Resolve client name from join or direct column
      const resolvedClient=
        nz(r.client_name||r.company||ex.client_name,null)||
        nz(r.clients?.company_name,null)||
        nz(r.assets?.clients?.company_name,null)||
        "UNASSIGNED";
      // Resolve equipment from join or direct column
      const resolvedEquipDesc=
        nz(r.equipment_description||r.asset_name||ex.equipment_description,null)||
        nz(r.assets?.asset_name,null)||
        nz(r.asset_tag||r.assets?.asset_tag,null)||
        "UNNAMED";
      const resolvedEquipType=
        nz(r.equipment_type||r.asset_type||ex.equipment_type,null)||
        nz(r.assets?.asset_type,null)||
        "UNCATEGORIZED";
      return{...r,issue_date:issue,expiry_date:expiry,result:normalizeResult(r.result||ex.result),
        client_name:resolvedClient,
        equipment_type:resolvedEquipType,
        equipment_description:resolvedEquipDesc,
        status:nz(r.status,"active"),expiry_bucket:expiryBucket(expiry)};
    });
    const oc={};cleaned.forEach(r=>{oc[r.client_name]=true;});
    setOpenClients(oc);setCerts(cleaned);setLoading(false);
  }

  const clientOpts=useMemo(()=>[...new Set(certs.map(x=>x.client_name))].sort(),[certs]);
  const typeOpts=useMemo(()=>[...new Set(certs.map(x=>x.equipment_type))].sort(),[certs]);
  const statusOpts=useMemo(()=>[...new Set(certs.map(x=>nz(x.status,"active")))].sort(),[certs]);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return certs.filter(r=>{
      const hay=[r.certificate_number,r.client_name,r.asset_tag,r.asset_name,r.equipment_description,r.equipment_type,r.inspection_number,r.inspection_no,r.folder_name].filter(Boolean).join(" ").toLowerCase();
      return(!q||hay.includes(q))&&(fResult==="ALL"||r.result===fResult)&&(fExpiry==="ALL"||r.expiry_bucket===fExpiry)&&(fClient==="ALL"||r.client_name===fClient)&&(fType==="ALL"||r.equipment_type===fType)&&(fStatus==="ALL"||r.status===fStatus);
    });
  },[certs,search,fResult,fExpiry,fClient,fType,fStatus]);

  const grouped=useMemo(()=>groupCerts(filtered),[filtered]);
  const hasFilters=search||fResult!=="ALL"||fExpiry!=="ALL"||fClient!=="ALL"||fType!=="ALL"||fStatus!=="ALL";
  function clearFilters(){setSearch("");setFResult("ALL");setFExpiry("ALL");setFClient("ALL");setFType("ALL");setFStatus("ALL");}

  const FILTER_CELLS=[
    {label:"Search",type:"input"},
    {label:"Result",val:fResult,set:setFResult,opts:[{v:"ALL",l:"All results"},{v:"PASS",l:"Pass"},{v:"FAIL",l:"Fail"},{v:"REPAIR_REQUIRED",l:"Repair req."},{v:"OUT_OF_SERVICE",l:"Out of svc"},{v:"UNKNOWN",l:"Unknown"}]},
    {label:"Expiry",val:fExpiry,set:setFExpiry,opts:[{v:"ALL",l:"All expiry"},{v:"EXPIRED",l:"Expired"},{v:"EXPIRING_SOON",l:"≤30d"},{v:"EXPIRING_90",l:"≤90d"},{v:"VALID",l:"Valid"},{v:"NO_EXPIRY",l:"No expiry"}]},
    {label:"Client",val:fClient,set:setFClient,opts:[{v:"ALL",l:"All clients"},...clientOpts.map(c=>({v:c,l:c}))]},
    {label:"Type",val:fType,set:setFType,opts:[{v:"ALL",l:"All types"},...typeOpts.map(t=>({v:t,l:t}))]},
    {label:"Status",val:fStatus,set:setFStatus,opts:[{v:"ALL",l:"All status"},...statusOpts.map(s=>({v:s,l:s}))],last:true},
  ];

  return(
    <AppLayout title="Certificates Register">
      <style>{CSS}</style>
      <div className="cert-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:20}}>
        <div style={{maxWidth:1500,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="cert-top" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent}}>ISO 9001 · Document Register</span>
                </div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Certificates Register</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>{filtered.length} of {certs.length} records · grouped by client, equipment type, asset</p>
              </div>
              <div className="cert-top-btns" style={{display:"flex",gap:8,flexShrink:0}}>
                <Link href="/certificates/import" style={S.ghost}>↑ AI Import</Link>
                <Link href="/certificates/create" style={S.accent}>+ New</Link>
              </div>
            </div>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8}}>
              {[
                {label:"Total",value:certs.length,color:T.accent},
                {label:"Pass",value:certs.filter(c=>c.result==="PASS").length,color:T.green},
                {label:"Fail / Repair",value:certs.filter(c=>["FAIL","REPAIR_REQUIRED"].includes(c.result)).length,color:T.red},
                {label:"Expiring ≤30d",value:certs.filter(c=>c.expiry_bucket==="EXPIRING_SOON").length,color:T.amber},
              ].map(({label,value,color})=>(
                <div key={label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:22,fontWeight:900,color,lineHeight:1}}>{loading?"…":value}</div>
                </div>
              ))}
            </div>
          </div>

          {errTxt&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:600}}>⚠ {errTxt}</div>}

          {/* FILTERS */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",backdropFilter:"blur(20px)"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim}}>Filters</span>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {hasFilters&&<button type="button" onClick={clearFilters} style={{background:"none",border:"none",color:T.textDim,fontSize:11,cursor:"pointer",fontWeight:700}}>Clear ×</button>}
                <div className="view-toggle" style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
                  {["grouped","flat"].map(v=><button key={v} type="button" onClick={()=>setView(v)} style={{border:"none",cursor:"pointer",padding:"5px 12px",fontSize:11,fontWeight:700,background:view===v?T.accentDim:"transparent",color:view===v?T.accent:T.textDim,fontFamily:"'IBM Plex Sans',sans-serif"}}>{v==="grouped"?"Grouped":"Flat"}</button>)}
                </div>
              </div>
            </div>
            <div className="cert-filters">
              {FILTER_CELLS.map((cell,i)=>(
                <div key={cell.label} style={{padding:"10px 12px",borderRight:cell.last?0:`1px solid ${T.border}`,borderBottom:"0"}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:cell.val&&cell.val!=="ALL"?T.accent:T.textDim,marginBottom:6}}>{cell.label}</div>
                  {cell.type==="input"?(
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cert no, client, equipment…"
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",color:T.textMid,fontSize:12,padding:0,fontFamily:"'IBM Plex Sans',sans-serif"}}/>
                  ):(
                    <select value={cell.val} onChange={e=>cell.set(e.target.value)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",color:T.textMid,fontSize:12,cursor:"pointer",padding:0,fontFamily:"'IBM Plex Sans',sans-serif"}}>
                      {cell.opts.map(o=><option key={o.v} value={o.v} style={{background:"#0a1420",color:"#f0f6ff"}}>{o.l}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CONTENT */}
          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading certificates…</div>
            </div>
          ):filtered.length===0?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:"44px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,opacity:.3,marginBottom:10}}>📄</div>
              <div style={{fontSize:15,fontWeight:800,marginBottom:5}}>No certificates found</div>
              <div style={{fontSize:13,color:T.textDim,marginBottom:14}}>{hasFilters?"Try changing your filters.":"No records available yet."}</div>
              {hasFilters&&<button type="button" onClick={clearFilters} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>Clear Filters</button>}
            </div>
          ):view==="flat"?(
            <FlatView certs={filtered}/>
          ):(
            <GroupedView grouped={grouped} openClients={openClients} openTypes={openTypes}
              toggleClient={cl=>setOpenClients(p=>({...p,[cl]:!p[cl]}))}
              toggleType={k=>setOpenTypes(p=>({...p,[k]:!p[k]}))}
              allCerts={filtered}/>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function GroupedView({grouped,openClients,openTypes,toggleClient,toggleType,allCerts=[]}){
  return(
    <div style={{display:"grid",gap:10}}>
      {grouped.map(cg=>{
        const open=!!openClients[cg.client];
        const count=cg.types.reduce((a,t)=>a+t.items.reduce((b,i)=>b+i.certs.length,0),0);
        return(
          <div key={cg.client} style={{border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",background:T.panel}}>
            <button type="button" onClick={()=>toggleClient(cg.client)} style={{width:"100%",border:"none",cursor:"pointer",textAlign:"left",padding:"14px 16px",background:"transparent",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,color:T.text,WebkitTapHighlightColor:"transparent"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800}}>{cg.client}</div>
                <div style={{fontSize:11,color:T.textDim,marginTop:3}}>{count} cert{count===1?"":"s"}</div>
              </div>
              <div style={{fontSize:18,fontWeight:900,color:T.accent,flexShrink:0}}>{open?"−":"+"}</div>
            </button>
            {open&&(
              <div style={{borderTop:`1px solid ${T.border}`,padding:12,display:"grid",gap:10}}>
                {cg.types.map(tg=>{
                  const key=`${cg.client}__${tg.type}`;
                  const tOpen=openTypes[key]??true;
                  return(
                    <div key={key} style={{border:`1px solid ${T.border}`,borderRadius:11,overflow:"hidden",background:T.panel2}}>
                      <button type="button" onClick={()=>toggleType(key)} style={{width:"100%",border:"none",cursor:"pointer",textAlign:"left",padding:"11px 14px",background:"transparent",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,color:T.text,WebkitTapHighlightColor:"transparent"}}>
                        <div style={{fontSize:13,fontWeight:800}}>{tg.type}</div>
                        <div style={{fontSize:15,fontWeight:800,color:T.accent,flexShrink:0}}>{tOpen?"−":"+"}</div>
                      </button>
                      {tOpen&&(
                        <div style={{padding:12,borderTop:`1px solid ${T.border}`,display:"grid",gap:10}}>
                          {tg.items.map(item=>(
                            <div key={`${tg.type}-${item.desc}`} style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",background:"rgba(255,255,255,0.015)"}}>
                              <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,fontSize:13,fontWeight:800,color:T.text}}>{item.desc}</div>
                              {/* Desktop table */}
                              <div className="cert-tbl" style={{overflowX:"auto"}}>
                                <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
                                  <thead>
                                    <tr style={{background:"rgba(255,255,255,0.02)"}}>
                                      {["Certificate No","Result","Issue","Expiry","Status","Actions"].map(h=>(
                                        <td key={h} style={{padding:"8px 12px",fontSize:9,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>{item.certs.map(cert=><CertRow key={cert.id} cert={cert} compact allCerts={filtered}/>)}</tbody>
                                </table>
                              </div>
                              {/* Mobile cards */}
                              <div className="cert-mob">
                                {item.certs.map(cert=><CertMobCard key={cert.id} cert={cert}/>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FlatView({certs}){
  return(
    <div style={{border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",background:T.panel}}>
      <div className="cert-tbl" style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead>
            <tr style={{background:"rgba(255,255,255,0.02)"}}>
              {["Certificate No","Client","Equipment","Type","Result","Issue","Expiry","Days","Status","Actions"].map(h=>(
                <td key={h} style={{padding:"10px 12px",fontSize:9,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>{certs.map(cert=><CertRow key={cert.id} cert={cert} allCerts={certs}/>)}</tbody>
        </table>
      </div>
      <div className="cert-mob">
        {certs.map(cert=><CertMobCard key={cert.id} cert={cert}/>)}
      </div>
    </div>
  );
}

function CertRow({cert,compact=false,allCerts=[]}){
  const r=rc(cert.result);const e=ec(cert.expiry_bucket);
  const days=daysDiff(cert.expiry_date);
  const id=encodeURIComponent(String(cert.id??""));
  if(compact){
    return(
      <tr className="cr" style={{borderBottom:`1px solid ${T.border}`}}>
        <td style={TD}><span style={{color:T.accent,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>{cert.certificate_number||"—"}</span></td>
        <td style={TD}><Badge label={r.label} color={r.color} bg={r.bg} brd={r.brd}/></td>
        <td style={{...TD,fontSize:12,color:T.textMid}}>{formatDate(cert.issue_date)}</td>
        <td style={{...TD,fontSize:12,color:T.textMid}}>{formatDate(cert.expiry_date)}</td>
        <td style={{...TD,fontSize:12,color:T.textMid,textTransform:"capitalize"}}>{nz(cert.status,"active")}</td>
        <td style={TD}><ActBtns id={id} folderId={cert.folder_id} folderName={cert.folder_name} allCerts={allCerts} certId={cert.id}/></td>
      </tr>
    );
  }
  return(
    <tr className="cr" style={{borderBottom:`1px solid ${T.border}`}}>
      <td style={TD}><span style={{color:T.accent,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>{cert.certificate_number||"—"}</span></td>
      <td style={{...TD,fontSize:12,color:T.textMid,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.client_name}</td>
      <td style={{...TD,fontSize:12,color:T.textMid,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.equipment_description}</td>
      <td style={{...TD,fontSize:12,color:T.textMid}}>{cert.equipment_type}</td>
      <td style={TD}><Badge label={r.label} color={r.color} bg={r.bg} brd={r.brd}/></td>
      <td style={{...TD,fontSize:12,color:T.textMid}}>{formatDate(cert.issue_date)}</td>
      <td style={{...TD,fontSize:12,color:T.textMid}}>{formatDate(cert.expiry_date)}</td>
      <td style={TD}>
        {days!==null?<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:5,background:e.bg,color:e.color}}>{days<0?`${Math.abs(days)}d ago`:`${days}d`}</span>:<span style={{color:T.textDim,fontSize:12}}>—</span>}
      </td>
      <td style={{...TD,fontSize:12,color:T.textMid,textTransform:"capitalize"}}>{nz(cert.status,"active")}</td>
      <td style={TD}><ActBtns id={id} folderId={cert.folder_id} folderName={cert.folder_name} allCerts={allCerts} certId={cert.id}/></td>
    </tr>
  );
}

function CertMobCard({cert}){
  const r=rc(cert.result);const e=ec(cert.expiry_bucket);
  const days=daysDiff(cert.expiry_date);
  const id=encodeURIComponent(String(cert.id??""));
  return(
    <div style={{padding:"13px 14px",borderBottom:`1px solid ${T.border}`,display:"grid",gap:9}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
        <span style={{color:T.accent,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",fontSize:13}}>{cert.certificate_number||"—"}</span>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Badge label={r.label} color={r.color} bg={r.bg} brd={r.brd}/>
          {days!==null&&<span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,background:e.bg,color:e.color}}>{days<0?`${Math.abs(days)}d ago`:`${days}d`}</span>}
        </div>
      </div>
      <div style={{fontSize:12,color:T.textMid}}>{cert.equipment_description} · {cert.equipment_type}</div>
      <div style={{fontSize:11,color:T.textDim,display:"flex",gap:12,flexWrap:"wrap"}}>
        {cert.client_name!=="UNASSIGNED"&&<span>{cert.client_name}</span>}
        <span>Issue: {formatDate(cert.issue_date)}</span>
        <span>Expiry: {formatDate(cert.expiry_date)}</span>
      </div>
      <ActBtns id={id} folderId={cert.folder_id} folderName={cert.folder_name} allCerts={[]} certId={cert.id}/>
    </div>
  );
}

function ActBtns({id,folderId,folderName,allCerts,certId}){
  function handlePrint(e){
    e.preventDefault();
    if(folderId&&allCerts){
      // Open each cert in the folder as a separate print tab
      const folderCerts=allCerts.filter(c=>c.folder_id===folderId);
      if(folderCerts.length>1){
        folderCerts.forEach((c,i)=>{
          setTimeout(()=>window.open(`/certificates/print/${encodeURIComponent(String(c.id))}`,"_blank"),i*400);
        });
        return;
      }
    }
    window.open(`/certificates/print/${id}`,"_blank");
  }
  return(
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      <Link href={`/certificates/${id}`}      prefetch={false} style={AB(T.accent,T.accentDim,T.accentBrd)}>View</Link>
      <Link href={`/certificates/${id}/edit`} prefetch={false} style={AB(T.amber,T.amberDim,T.amberBrd)}>Edit</Link>
      <Link href={`/certificates/${id}/edit?tab=link`} prefetch={false} style={AB(T.purple,T.purpleDim,T.purpleBrd)}>Link</Link>
      <button type="button" onClick={handlePrint} style={{...AB(T.green,T.greenDim,T.greenBrd),border:`1px solid ${T.greenBrd}`,cursor:"pointer",fontFamily:"inherit"}}>
        {folderId?"Print All":"Print"}
      </button>
      {folderId&&<span style={{fontSize:10,fontWeight:800,padding:"5px 9px",borderRadius:99,background:T.purpleDim,color:T.purple,border:`1px solid ${T.purpleBrd}`,whiteSpace:"nowrap"}}>{folderName||"Folder"}</span>}
    </div>
  );
}

const TD={padding:"10px 12px",fontSize:13,color:T.textMid,verticalAlign:"top"};
const AB=(color,bg,brd)=>({display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"5px 10px",borderRadius:7,border:`1px solid ${brd}`,background:bg,color,fontSize:11,fontWeight:800,textDecoration:"none",whiteSpace:"nowrap"});
const S={
  accent:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"9px 14px",borderRadius:10,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontSize:12,fontWeight:900,textDecoration:"none",whiteSpace:"nowrap"},
  ghost:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"9px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontSize:12,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"},
};
