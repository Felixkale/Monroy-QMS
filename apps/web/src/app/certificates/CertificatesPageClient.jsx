"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:         "#070e18",
  surface:    "rgba(13,22,38,0.80)",
  panel:      "rgba(10,18,32,0.92)",
  card:       "rgba(255,255,255,0.025)",
  border:     "rgba(148,163,184,0.12)",
  text:       "#f0f6ff",
  textMid:    "rgba(240,246,255,0.72)",
  textDim:    "rgba(240,246,255,0.40)",
  accent:     "#22d3ee",
  accentDim:  "rgba(34,211,238,0.10)",
  accentBrd:  "rgba(34,211,238,0.25)",
  accentGlow: "rgba(34,211,238,0.18)",
  green:      "#34d399", greenDim: "rgba(52,211,153,0.10)",   greenBrd: "rgba(52,211,153,0.25)",
  red:        "#f87171", redDim:   "rgba(248,113,113,0.10)",  redBrd:   "rgba(248,113,113,0.25)",
  amber:      "#fbbf24", amberDim: "rgba(251,191,36,0.10)",   amberBrd: "rgba(251,191,36,0.25)",
  purple:     "#a78bfa", purpleDim:"rgba(167,139,250,0.10)",  purpleBrd:"rgba(167,139,250,0.25)",
  slate:      "rgba(248,250,252,0.06)", slateBrd:"rgba(248,250,252,0.14)",
};

function nz(v, fb="") { if(v===null||v===undefined) return fb; const s=String(v).trim(); return s||fb; }
function normalizeResult(v) { const r=nz(v).toUpperCase().replace(/\s+/g,"_"); if(!r) return "UNKNOWN"; if(r==="CONDITIONAL") return "REPAIR_REQUIRED"; return r; }
function formatDate(v) { if(!v) return "—"; const d=new Date(v); if(Number.isNaN(d.getTime())) return v; return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function getExpiryBucket(d) { if(!d) return "NO_EXPIRY"; const diff=Math.ceil((new Date(d)-new Date())/86400000); if(diff<0) return "EXPIRED"; if(diff<=30) return "EXPIRING_SOON"; if(diff<=90) return "EXPIRING_90"; return "VALID"; }
function daysUntil(v) { if(!v) return null; return Math.ceil((new Date(v)-new Date())/86400000); }
function safeId(id) { return encodeURIComponent(String(id??""));}
function needsNcr(c) { return ["FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(normalizeResult(c?.result)); }

function groupCertificates(rows) {
  const g={};
  for(const row of rows){
    const client=nz(row.client_name,"UNASSIGNED CLIENT");
    const type=nz(row.equipment_type||row.asset_type,"UNCATEGORIZED");
    const desc=nz(row.equipment_description||row.asset_name||row.asset_tag,"UNNAMED EQUIPMENT");
    if(!g[client]) g[client]={};
    if(!g[client][type]) g[client][type]={};
    if(!g[client][type][desc]) g[client][type][desc]=[];
    g[client][type][desc].push(row);
  }
  return Object.keys(g).sort().map(client=>({
    client,
    types:Object.keys(g[client]).sort().map(type=>({
      type,
      items:Object.keys(g[client][type]).sort().map(desc=>({
        desc,
        certs:[...g[client][type][desc]].sort((a,b)=>new Date(b.issue_date||b.created_at||0)-new Date(a.issue_date||a.created_at||0)),
      })),
    })),
  }));
}

const RESULT_CFG = {
  PASS:            {label:"Pass",           color:T.green, bg:T.greenDim,  brd:T.greenBrd},
  FAIL:            {label:"Fail",           color:T.red,   bg:T.redDim,    brd:T.redBrd},
  REPAIR_REQUIRED: {label:"Repair Req.",    color:T.amber, bg:T.amberDim,  brd:T.amberBrd},
  OUT_OF_SERVICE:  {label:"Out of Service", color:T.purple,bg:T.purpleDim, brd:T.purpleBrd},
  UNKNOWN:         {label:"Unknown",        color:T.textDim,bg:T.slate,    brd:T.slateBrd},
};
const EXPIRY_CFG = {
  EXPIRED:       {color:T.red,    bg:T.redDim},
  EXPIRING_SOON: {color:T.amber,  bg:T.amberDim},
  EXPIRING_90:   {color:T.accent, bg:T.accentDim},
  VALID:         {color:T.green,  bg:T.greenDim},
  NO_EXPIRY:     {color:T.textDim,bg:T.slate},
};
const rCfg = v => RESULT_CFG[v]||RESULT_CFG.UNKNOWN;
const eCfg = v => EXPIRY_CFG[v]||EXPIRY_CFG.NO_EXPIRY;

/* ── Global CSS ── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder{color:rgba(240,246,255,0.28)} select option{background:#0a1420;color:#f0f6ff}
  .cert-row:hover td{background:rgba(34,211,238,0.03)!important}
  .grp-btn:hover{background:rgba(255,255,255,0.03)!important}
  .act-lnk{transition:filter .15s,transform .15s}.act-lnk:hover{filter:brightness(1.2);transform:translateY(-1px)}
  .stat-card{transition:transform .2s,border-color .2s}.stat-card:hover{border-color:rgba(148,163,184,0.26)!important;transform:translateY(-2px)}

  .page-pad{padding:28px 20px;display:grid;gap:20px}
  .stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
  .filter-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(148,163,184,0.12)}
  .cert-tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .cert-tbl{width:100%;border-collapse:collapse}
  .cert-tbl-full{min-width:1240px}.cert-tbl-compact{min-width:800px}
  .cert-mob-cards{display:none}
  .act-strip{display:flex;gap:5px;flex-wrap:wrap;align-items:center}

  @media(max-width:1024px){
    .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .filter-grid{grid-template-columns:1fr 1fr 1fr}
    .cert-tbl-full{min-width:900px}
  }
  @media(max-width:768px){
    .page-pad{padding:12px;gap:12px}
    .page-hdr{padding:14px 16px!important}
    .page-title{font-size:21px!important}
    .hdr-row{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
    .hdr-actions{width:100%}.hdr-actions a{flex:1;text-align:center}
    .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .stat-val{font-size:26px!important}
    .filter-grid{grid-template-columns:1fr;gap:10px;padding:12px 14px}
    .toolbar{padding:10px 14px!important;flex-wrap:wrap;gap:8px!important}
    .cert-tbl-wrap{display:none!important}.cert-mob-cards{display:grid;gap:10px}
    .content-pad{padding:12px!important}
    .grp-hdr-pad{padding:12px 14px!important}
    .type-inner{padding:10px!important}
    .link-banner{flex-direction:column!important;align-items:flex-start!important}
    .link-banner-input{width:100%!important}
  }
  @media(max-width:480px){
    .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .page-title{font-size:18px!important}
    .stat-val{font-size:22px!important}
    .act-strip a,.act-strip button{padding:6px 8px!important;font-size:10px!important}
  }
`;

export default function CertificatesPageClient() {
  const [certs,setCerts]                     = useState([]);
  const [loading,setLoading]                 = useState(true);
  const [errorText,setErrorText]             = useState("");
  const [search,setSearch]                   = useState("");
  const [fResult,setFResult]                 = useState("ALL");
  const [fExpiry,setFExpiry]                 = useState("ALL");
  const [fClient,setFClient]                 = useState("ALL");
  const [fType,setFType]                     = useState("ALL");
  const [fLinked,setFLinked]                 = useState("ALL");
  const [view,setView]                       = useState("grouped");
  const [expandedClients,setExpandedClients] = useState({});
  const [expandedTypes,setExpandedTypes]     = useState({});
  const [linkSource,setLinkSource]           = useState(null);
  const [linkName,setLinkName]               = useState("");
  const [busyId,setBusyId]                   = useState("");

  useEffect(()=>{loadCerts();},[]);

  async function loadCerts() {
    setLoading(true); setErrorText("");
    const {data,error} = await supabase.from("certificates")
      .select(`id,certificate_number,result,issue_date,issued_at,expiry_date,valid_to,created_at,
               inspection_number,asset_tag,asset_name,equipment_description,equipment_type,
               asset_type,client_name,status,folder_id,folder_name,folder_position,extracted_data`)
      .order("created_at",{ascending:false});
    if(error){setCerts([]);setErrorText(error.message||"Failed to load.");setLoading(false);return;}
    const cleaned=(data||[]).map(row=>{
      const ex=row.extracted_data||{};
      const issueDate=row.issue_date||row.issued_at||ex.issue_date||null;
      const expiryDate=row.expiry_date||row.valid_to||ex.expiry_date||null;
      return{...row,issue_date:issueDate,expiry_date:expiryDate,
        result:normalizeResult(row.result||ex.result),
        client_name:nz(row.client_name||ex.client_name,"UNASSIGNED CLIENT"),
        equipment_type:nz(row.equipment_type||row.asset_type||ex.equipment_type,"UNCATEGORIZED"),
        equipment_description:nz(row.equipment_description||row.asset_name||row.asset_tag||ex.equipment_description,"UNNAMED EQUIPMENT"),
        status:nz(row.status,"active"),expiry_bucket:getExpiryBucket(expiryDate)};
    });
    const openClients={};cleaned.forEach(r=>{openClients[r.client_name]=true;});
    setExpandedClients(openClients);setCerts(cleaned);setLoading(false);
  }

  const clientOptions=useMemo(()=>[...new Set(certs.map(x=>x.client_name))].sort(),[certs]);
  const typeOptions  =useMemo(()=>[...new Set(certs.map(x=>x.equipment_type))].sort(),[certs]);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return certs.filter(row=>{
      const hay=[row.certificate_number,row.client_name,row.asset_tag,row.asset_name,
                 row.equipment_description,row.equipment_type,row.inspection_number,
                 row.status,row.folder_name].join(" ").toLowerCase();
      return(!q||hay.includes(q))&&
        (fResult==="ALL"||row.result===fResult)&&
        (fExpiry==="ALL"||row.expiry_bucket===fExpiry)&&
        (fClient==="ALL"||row.client_name===fClient)&&
        (fType==="ALL"||row.equipment_type===fType)&&
        (fLinked==="ALL"||(fLinked==="YES"&&!!row.folder_id)||(fLinked==="NO"&&!row.folder_id));
    });
  },[certs,search,fResult,fExpiry,fClient,fType,fLinked]);

  const grouped=useMemo(()=>groupCertificates(filtered),[filtered]);
  const stats=useMemo(()=>({
    total:certs.length,pass:certs.filter(x=>x.result==="PASS").length,
    fail:certs.filter(x=>x.result==="FAIL").length,linked:certs.filter(x=>!!x.folder_id).length,
    needNcr:certs.filter(x=>needsNcr(x)).length,
  }),[certs]);
  const hasFilters=search||fResult!=="ALL"||fExpiry!=="ALL"||fClient!=="ALL"||fType!=="ALL"||fLinked!=="ALL";

  function clearFilters(){setSearch("");setFResult("ALL");setFExpiry("ALL");setFClient("ALL");setFType("ALL");setFLinked("ALL");}
  const toggleClient=c=>setExpandedClients(p=>({...p,[c]:!p[c]}));
  const toggleType=k=>setExpandedTypes(p=>({...p,[k]:!p[k]}));

  function beginLink(cert){setLinkSource(cert);setLinkName(cert.folder_name||`${cert.asset_tag||cert.certificate_number} Folder`);}
  function cancelLink(){setLinkSource(null);setLinkName("");}

  async function handleLink(target){
    if(!linkSource||linkSource.id===target.id) return;
    /* ✅ FIX: use crypto.randomUUID() — not a custom string, Supabase needs valid uuid */
    const groupId=linkSource.folder_id||target.folder_id||crypto.randomUUID();
    const groupName=nz(linkName)||linkSource.folder_name||target.folder_name||`${linkSource.asset_tag||linkSource.certificate_number} Folder`;
    try{
      setBusyId(target.id);
      const{error:e1}=await supabase.from("certificates").update({folder_id:groupId,folder_name:groupName,folder_position:1}).eq("id",linkSource.id);
      if(e1) throw e1;
      const{error:e2}=await supabase.from("certificates").update({folder_id:groupId,folder_name:groupName,folder_position:2}).eq("id",target.id);
      if(e2) throw e2;
      cancelLink();await loadCerts();
    }catch(err){setErrorText(err.message||"Failed to link.");}
    finally{setBusyId("");}
  }

  async function handleUnlink(cert){
    if(!cert.folder_id) return;
    if(!window.confirm("Unlink all certificates in this folder?")) return;
    try{
      setBusyId(cert.id);
      const{error}=await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:null}).eq("folder_id",cert.folder_id);
      if(error) throw error;
      await loadCerts();
    }catch(err){setErrorText(err.message||"Failed to unlink.");}
    finally{setBusyId("");}
  }

  const rowProps={linkSource,beginLink,handleLink,handleUnlink,busyId,cancelLink};

  return(
    <AppLayout title="Certificates Register">
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif"}}>
        <div className="page-pad" style={{maxWidth:1600,margin:"0 auto"}}>

          {/* HEADER */}
          <div className="page-hdr" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"22px 24px",backdropFilter:"blur(20px)",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
            <div className="hdr-row" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,marginBottom:18}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:5,height:22,borderRadius:3,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
                  <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent}}>Certificates Workspace</span>
                </div>
                <h1 className="page-title" style={{margin:0,fontSize:28,fontWeight:900,letterSpacing:"-0.02em"}}>Certificates Register</h1>
                <p style={{margin:"6px 0 0",color:T.textDim,fontSize:13}}>Manage, filter and link inspection certificates</p>
              </div>
              <div className="hdr-actions" style={{display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
                <Link href="/certificates/import" style={S.btnGhost}>↑ AI Import</Link>
                <Link href="/certificates/create" style={S.btnAccent}>+ New</Link>
              </div>
            </div>

            <div className="stats-grid">
              {[{label:"Total",value:stats.total,color:T.accent,glow:"rgba(34,211,238,0.15)"},
                {label:"Passed",value:stats.pass,color:T.green,glow:"rgba(52,211,153,0.15)"},
                {label:"Failed",value:stats.fail,color:T.red,glow:"rgba(248,113,113,0.15)"},
                {label:"Linked",value:stats.linked,color:T.purple,glow:"rgba(167,139,250,0.15)"},
                {label:"Need NCR",value:stats.needNcr,color:T.amber,glow:"rgba(251,191,36,0.15)"},
              ].map(({label,value,color,glow})=>(
                <div key={label} className="stat-card" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at top right,${glow},transparent 70%)`,pointerEvents:"none"}}/>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textDim,marginBottom:8}}>{label}</div>
                  <div className="stat-val" style={{fontSize:30,fontWeight:900,color,lineHeight:1}}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LINK BANNER */}
          {linkSource&&(
            <div className="link-banner" style={{background:T.purpleDim,border:`1px solid ${T.purpleBrd}`,borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:T.purple,boxShadow:`0 0 8px ${T.purple}`,flexShrink:0}}/>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontSize:11,fontWeight:800,color:T.purple,marginBottom:3}}>Link Mode — click another certificate to link it</div>
                <div style={{fontSize:13,color:T.textMid}}><strong style={{color:T.text}}>{linkSource.certificate_number||"—"}</strong> · {linkSource.equipment_description||"—"}</div>
              </div>
              <input value={linkName} onChange={e=>setLinkName(e.target.value)} placeholder="Folder / link name" style={{...S.input,width:240}} className="link-banner-input"/>
              <button type="button" onClick={cancelLink} style={S.btnPlain}>✕ Cancel</button>
            </div>
          )}

          {/* MAIN PANEL */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,backdropFilter:"blur(20px)",overflow:"hidden"}}>
            <div className="filter-grid">
              <div>
                <div style={S.filterLabel}>Search</div>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:14,pointerEvents:"none"}}>⌕</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Certificate, client, equipment…" style={{...S.input,paddingLeft:28}}/>
                </div>
              </div>
              {[
                {label:"Result",value:fResult,set:setFResult,opts:[{v:"ALL",l:"All results"},{v:"PASS",l:"Pass"},{v:"FAIL",l:"Fail"},{v:"REPAIR_REQUIRED",l:"Repair req."},{v:"OUT_OF_SERVICE",l:"Out of service"},{v:"UNKNOWN",l:"Unknown"}]},
                {label:"Expiry",value:fExpiry,set:setFExpiry,opts:[{v:"ALL",l:"All expiry"},{v:"EXPIRED",l:"Expired"},{v:"EXPIRING_SOON",l:"≤30 days"},{v:"EXPIRING_90",l:"≤90 days"},{v:"VALID",l:"Valid"},{v:"NO_EXPIRY",l:"No expiry"}]},
                {label:"Client",value:fClient,set:setFClient,opts:[{v:"ALL",l:"All clients"},...clientOptions.map(c=>({v:c,l:c}))]},
                {label:"Type",  value:fType,  set:setFType,  opts:[{v:"ALL",l:"All types"},...typeOptions.map(t=>({v:t,l:t}))]},
                {label:"Linked",value:fLinked,set:setFLinked,opts:[{v:"ALL",l:"All"},{v:"YES",l:"Linked"},{v:"NO",l:"Unlinked"}]},
              ].map(({label,value,set,opts})=>(
                <div key={label}>
                  <div style={S.filterLabel}>{label}</div>
                  <select value={value} onChange={e=>set(e.target.value)} style={S.input}>
                    {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="toolbar" style={{padding:"10px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:T.textDim}}><span style={{color:T.text,fontWeight:700}}>{filtered.length}</span> record{filtered.length===1?"":"s"}</span>
                {hasFilters&&<button type="button" onClick={clearFilters} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.textDim,fontSize:11,padding:"3px 8px",cursor:"pointer"}}>✕ Clear</button>}
              </div>
              <div style={{display:"flex",background:T.card,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
                {["grouped","flat"].map(v=>(
                  <button key={v} type="button" onClick={()=>setView(v)} style={{border:"none",cursor:"pointer",padding:"7px 14px",fontSize:11,fontWeight:700,background:view===v?T.accentDim:"transparent",color:view===v?T.accent:T.textDim,transition:"all .15s",minWidth:60}}>
                    {v==="grouped"?"⊞ Group":"☰ Flat"}
                  </button>
                ))}
              </div>
            </div>

            {errorText&&<div style={{margin:"12px 20px",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,display:"flex",gap:8}}><span>⚠</span>{errorText}</div>}

            <div className="content-pad" style={{padding:16}}>
              {loading?<LoadingState/>:filtered.length===0?<EmptyState onClear={clearFilters}/>:
               view==="flat"?<FlatView certs={filtered} {...rowProps}/>:
               <GroupedView grouped={grouped} expandedClients={expandedClients} expandedTypes={expandedTypes} toggleClient={toggleClient} toggleType={toggleType} {...rowProps}/>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── GROUPED VIEW ── */
function GroupedView({grouped,expandedClients,expandedTypes,toggleClient,toggleType,...rp}){
  return(
    <div style={{display:"grid",gap:12}}>
      {grouped.map(cg=>{
        const open=!!expandedClients[cg.client];
        const cnt=cg.types.reduce((a,t)=>a+t.items.reduce((b,i)=>b+i.certs.length,0),0);
        return(
          <div key={cg.client} style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
            <button type="button" onClick={()=>toggleClient(cg.client)} className="grp-btn" style={{width:"100%",border:"none",background:"transparent",cursor:"pointer",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,color:T.text,textAlign:"left",minHeight:60}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:34,height:34,borderRadius:9,background:T.accentDim,border:`1px solid ${T.accentBrd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:T.accent,flexShrink:0}}>{cg.client.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:800}}>{cg.client}</div>
                  <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{cnt} cert{cnt===1?"":"s"} · {cg.types.length} type{cg.types.length===1?"":"s"}</div>
                </div>
              </div>
              <Chevron open={open}/>
            </button>
            {open&&(
              <div className="grp-hdr-pad" style={{borderTop:`1px solid ${T.border}`,padding:13,display:"grid",gap:10}}>
                {cg.types.map(tg=>{
                  const key=`${cg.client}-${tg.type}`;
                  const tOpen=expandedTypes[key]!==false;
                  const tCnt=tg.items.reduce((a,i)=>a+i.certs.length,0);
                  return(
                    <div key={key} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${T.border}`,borderRadius:13,overflow:"hidden"}}>
                      <button type="button" onClick={()=>toggleType(key)} className="grp-btn" style={{width:"100%",border:"none",background:"transparent",cursor:"pointer",padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,color:T.text,textAlign:"left",minHeight:46}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",padding:"3px 8px",borderRadius:5,background:T.accentDim,color:T.accent,border:`1px solid ${T.accentBrd}`,whiteSpace:"nowrap"}}>{tg.type}</span>
                          <span style={{fontSize:11,color:T.textDim}}>{tCnt} cert{tCnt===1?"":"s"}</span>
                        </div>
                        <Chevron open={tOpen} size={12}/>
                      </button>
                      {tOpen&&(
                        <div className="type-inner" style={{padding:12,display:"grid",gap:10}}>
                          {tg.items.map(item=>(
                            <div key={item.desc} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${T.border}`,borderRadius:11,overflow:"hidden"}}>
                              <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:7}}>
                                <span style={{width:5,height:5,borderRadius:"50%",background:T.accent,display:"inline-block",flexShrink:0}}/>
                                <span style={{fontWeight:700,fontSize:13,color:T.text}}>{item.desc}</span>
                                <span style={{fontSize:11,color:T.textDim,flexShrink:0}}>({item.certs.length})</span>
                              </div>
                              <div className="cert-tbl-wrap">
                                <table className="cert-tbl cert-tbl-compact" style={{borderCollapse:"collapse"}}>
                                  <thead><tr>{["Certificate No.","Result","Issue","Expiry","Linked","Actions"].map(h=><td key={h} style={S.th}>{h}</td>)}</tr></thead>
                                  <tbody>{item.certs.map(cert=><CertRow key={cert.id} cert={cert} compact {...rp}/>)}</tbody>
                                </table>
                              </div>
                              <div className="cert-mob-cards" style={{padding:10}}>{item.certs.map(cert=><CertCard key={cert.id} cert={cert} {...rp}/>)}</div>
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

/* ── FLAT VIEW ── */
function FlatView({certs,...rp}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
      <div className="cert-tbl-wrap">
        <table className="cert-tbl cert-tbl-full" style={{borderCollapse:"collapse"}}>
          <thead><tr>{["Certificate No.","Client","Equipment","Type","Result","Issue","Expiry","Days","Linked","Actions"].map(h=><td key={h} style={S.th}>{h}</td>)}</tr></thead>
          <tbody>{certs.map(cert=><CertRow key={cert.id} cert={cert} {...rp}/>)}</tbody>
        </table>
      </div>
      <div className="cert-mob-cards" style={{padding:12}}>{certs.map(cert=><CertCard key={cert.id} cert={cert} {...rp}/>)}</div>
    </div>
  );
}

/* ── CERT ROW (desktop) ── */
function CertRow({cert,compact=false,linkSource,beginLink,handleLink,handleUnlink,busyId,cancelLink}){
  const result=rCfg(cert.result);
  const expiry=eCfg(cert.expiry_bucket);
  const days=daysUntil(cert.expiry_date);
  const id=safeId(cert.id);
  const isLinkSource=linkSource?.id===cert.id;
  const canLinkHere=!!linkSource&&linkSource.id!==cert.id;

  const linkedBadge=cert.folder_id
    ?<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,padding:"3px 7px",borderRadius:99,background:T.purpleDim,color:T.purple,border:`1px solid ${T.purpleBrd}`,whiteSpace:"nowrap"}}>🔗 {cert.folder_name||"Linked"}{cert.folder_position?` #${cert.folder_position}`:""}</span>
    :<span style={{color:T.textDim}}>—</span>;

  const actions=(
    <div className="act-strip">
      <Link href={`/certificates/${id}`}       prefetch={false} className="act-lnk" style={S.ab(T.accent,T.accentDim,T.accentBrd)}>View</Link>
      <Link href={`/certificates/${id}/edit`}  prefetch={false} className="act-lnk" style={S.ab(T.amber,T.amberDim,T.amberBrd)}>Edit</Link>
      <Link href={`/certificates/print/${id}`} prefetch={false} className="act-lnk" style={S.ab(T.green,T.greenDim,T.greenBrd)}>Print</Link>
      {needsNcr(cert)&&<Link href={buildNcrHref(cert)} prefetch={false} className="act-lnk" style={S.ab(T.red,T.redDim,T.redBrd)}>NCR</Link>}
      {/* ✅ FIX: "Selected" is now clickable to UNSELECT */}
      {isLinkSource
        ?<button type="button" onClick={cancelLink} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer",opacity:0.8}}>✕ Unselect</button>
        :canLinkHere
          ?<button type="button" onClick={()=>handleLink(cert)} disabled={busyId===cert.id} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer"}}>{busyId===cert.id?"Linking…":"Link Here"}</button>
          :<button type="button" onClick={()=>beginLink(cert)} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer"}}>Link</button>
      }
      {cert.folder_id&&<button type="button" onClick={()=>handleUnlink(cert)} disabled={busyId===cert.id} style={{...S.ab(T.textDim,T.slate,T.slateBrd),cursor:"pointer"}}>{busyId===cert.id?"…":"Unlink"}</button>}
    </div>
  );

  if(compact) return(
    <tr className="cert-row" style={{borderBottom:`1px solid ${T.border}`}}>
      <td style={S.td}><span style={S.mono}>{cert.certificate_number||"—"}</span></td>
      <td style={S.td}><Badge {...result}/></td>
      <td style={S.td}>{formatDate(cert.issue_date)}</td>
      <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:5}}>{formatDate(cert.expiry_date)}{days!==null&&<DaysBadge days={days} expiry={expiry}/>}</div></td>
      <td style={S.td}>{linkedBadge}</td>
      <td style={S.td}>{actions}</td>
    </tr>
  );

  return(
    <tr className="cert-row" style={{borderBottom:`1px solid ${T.border}`}}>
      <td style={S.td}><span style={S.mono}>{cert.certificate_number||"—"}</span></td>
      <td style={S.td}><span style={{fontSize:12}}>{cert.client_name}</span></td>
      <td style={S.td}><div style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.equipment_description}</div></td>
      <td style={S.td}><span style={{fontSize:11,color:T.textDim}}>{cert.equipment_type}</span></td>
      <td style={S.td}><Badge {...result}/></td>
      <td style={S.td}>{formatDate(cert.issue_date)}</td>
      <td style={S.td}>{formatDate(cert.expiry_date)}</td>
      <td style={S.td}>{days!==null?<DaysBadge days={days} expiry={expiry}/>:<span style={{color:T.textDim}}>—</span>}</td>
      <td style={S.td}>{linkedBadge}</td>
      <td style={S.td}>{actions}</td>
    </tr>
  );
}

/* ── CERT CARD (mobile) ── */
function CertCard({cert,linkSource,beginLink,handleLink,handleUnlink,busyId,cancelLink}){
  const result=rCfg(cert.result);
  const expiry=eCfg(cert.expiry_bucket);
  const days=daysUntil(cert.expiry_date);
  const id=safeId(cert.id);
  const isLinkSource=linkSource?.id===cert.id;
  const canLinkHere=!!linkSource&&linkSource.id!==cert.id;
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 14px",display:"grid",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <span style={S.mono}>{cert.certificate_number||"—"}</span>
        <Badge {...result}/>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:T.text,lineHeight:1.3}}>{cert.equipment_description}</div>
        <div style={{fontSize:11,color:T.textDim,marginTop:3}}>{cert.equipment_type}{cert.client_name!=="UNASSIGNED CLIENT"?` · ${cert.client_name}`:""}</div>
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div><div style={{fontSize:10,color:T.textDim,marginBottom:2,letterSpacing:"0.08em",textTransform:"uppercase"}}>Issued</div><div style={{fontSize:12,color:T.textMid}}>{formatDate(cert.issue_date)}</div></div>
        <div><div style={{fontSize:10,color:T.textDim,marginBottom:2,letterSpacing:"0.08em",textTransform:"uppercase"}}>Expires</div><div style={{fontSize:12,color:T.textMid,display:"flex",alignItems:"center",gap:5}}>{formatDate(cert.expiry_date)}{days!==null&&<DaysBadge days={days} expiry={expiry}/>}</div></div>
        {cert.folder_id&&<div><div style={{fontSize:10,color:T.textDim,marginBottom:2,letterSpacing:"0.08em",textTransform:"uppercase"}}>Linked</div><span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:99,background:T.purpleDim,color:T.purple,border:`1px solid ${T.purpleBrd}`}}>🔗 {cert.folder_name||"Folder"}</span></div>}
      </div>
      <div className="act-strip" style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
        <Link href={`/certificates/${id}`}       prefetch={false} className="act-lnk" style={S.ab(T.accent,T.accentDim,T.accentBrd)}>View</Link>
        <Link href={`/certificates/${id}/edit`}  prefetch={false} className="act-lnk" style={S.ab(T.amber,T.amberDim,T.amberBrd)}>Edit</Link>
        <Link href={`/certificates/print/${id}`} prefetch={false} className="act-lnk" style={S.ab(T.green,T.greenDim,T.greenBrd)}>Print</Link>
        {needsNcr(cert)&&<Link href={buildNcrHref(cert)} prefetch={false} className="act-lnk" style={S.ab(T.red,T.redDim,T.redBrd)}>NCR</Link>}
        {isLinkSource
          ?<button type="button" onClick={cancelLink} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer",opacity:0.8}}>✕ Unselect</button>
          :canLinkHere
            ?<button type="button" onClick={()=>handleLink(cert)} disabled={busyId===cert.id} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer"}}>{busyId===cert.id?"Linking…":"Link Here"}</button>
            :<button type="button" onClick={()=>beginLink(cert)} style={{...S.ab(T.purple,T.purpleDim,T.purpleBrd),cursor:"pointer"}}>Link</button>
        }
        {cert.folder_id&&<button type="button" onClick={()=>handleUnlink(cert)} disabled={busyId===cert.id} style={{...S.ab(T.textDim,T.slate,T.slateBrd),cursor:"pointer"}}>{busyId===cert.id?"…":"Unlink"}</button>}
      </div>
    </div>
  );
}

/* ── HELPERS ── */
function buildNcrHref(cert){
  const p=new URLSearchParams();
  p.set("source","certificate");p.set("certificate_id",nz(cert?.id));p.set("certificate_number",nz(cert?.certificate_number));
  p.set("inspection_number",nz(cert?.inspection_number));p.set("asset_tag",nz(cert?.asset_tag));p.set("asset_name",nz(cert?.asset_name));
  p.set("equipment_description",nz(cert?.equipment_description));p.set("equipment_type",nz(cert?.equipment_type||cert?.asset_type));
  p.set("client_name",nz(cert?.client_name));p.set("result",normalizeResult(cert?.result));p.set("issue_date",nz(cert?.issue_date));p.set("expiry_date",nz(cert?.expiry_date));
  return `/ncr/new?${p.toString()}`;
}
function DaysBadge({days,expiry}){return <span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:expiry.bg,color:expiry.color,whiteSpace:"nowrap"}}>{days<0?`${Math.abs(days)}d ago`:`${days}d`}</span>;}
function Badge({label,color,bg,brd}){return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 9px",borderRadius:99,background:bg,color,border:`1px solid ${brd}`,fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>{label}</span>;}
function Chevron({open,size=14}){return <svg style={{flexShrink:0,transform:open?"rotate(90deg)":"rotate(0)",transition:"transform .2s",color:T.textDim}} width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function LoadingState(){return <div style={{padding:48,textAlign:"center",color:T.textDim}}><div style={{fontSize:28,marginBottom:12,opacity:.4}}>⏳</div><div style={{fontSize:13,fontWeight:600}}>Loading certificates…</div></div>;}
function EmptyState({onClear}){return <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:"48px 20px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:14,opacity:.3}}>📂</div><div style={{fontSize:18,fontWeight:800,marginBottom:8}}>No certificates found</div><div style={{fontSize:13,color:T.textDim,marginBottom:20}}>Try adjusting your search or filters.</div><button type="button" onClick={onClear} style={{...S.btnAccent,cursor:"pointer",border:"none"}}>Clear filters</button></div>;}

const S={
  filterLabel:{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,color:T.textDim},
  input:{width:"100%",padding:"10px 12px",borderRadius:9,border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.03)",color:T.text,fontSize:13,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"},
  th:{padding:"9px 13px",fontSize:10,color:T.textDim,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",background:"rgba(255,255,255,0.02)"},
  td:{padding:"11px 13px",verticalAlign:"middle",fontSize:12,color:T.textMid},
  mono:{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.accent,fontWeight:500},
  btnAccent:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",borderRadius:10,background:T.accent,color:"#001018",fontSize:12,fontWeight:800,textDecoration:"none",boxShadow:`0 0 20px ${T.accentGlow}`,whiteSpace:"nowrap"},
  btnGhost:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",borderRadius:10,background:"rgba(255,255,255,0.03)",color:T.textMid,fontSize:12,fontWeight:700,textDecoration:"none",border:`1px solid ${T.border}`,whiteSpace:"nowrap"},
  btnPlain:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"9px 14px",borderRadius:9,background:"rgba(255,255,255,0.05)",color:T.textMid,fontSize:12,fontWeight:700,border:`1px solid ${T.border}`,cursor:"pointer",whiteSpace:"nowrap"},
  ab:(color,bg,brd)=>({display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"6px 10px",borderRadius:7,background:bg,border:`1px solid ${brd}`,color,fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",minHeight:32}),
};
