// src/app/admin/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  .adm-tab{padding:10px 16px;border:none;background:none;color:rgba(240,246,255,0.45);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;font-family:'IBM Plex Sans',sans-serif;min-height:44px;-webkit-tap-highlight-color:transparent}
  .adm-tab.active{color:#22d3ee;border-bottom-color:#22d3ee}
  .adm-tab:hover:not(.active){color:rgba(240,246,255,0.7)}
  .adm-tabs{display:flex;gap:0;border-bottom:1px solid rgba(148,163,184,0.12);margin-bottom:20px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .qa-btn{padding:12px 14px;border-radius:10px;border:1px solid ${T.purpleBrd};background:${T.purpleDim};color:${T.purple};fontWeight:700;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;text-align:left;transition:filter .15s;-webkit-tap-highlight-color:transparent}
  .qa-btn:hover{filter:brightness(1.15)}
  .usr-card{background:${T.card};border:1px solid ${T.purpleBrd};border-radius:14px;padding:18px;cursor:pointer;transition:border-color .2s,transform .2s;-webkit-tap-highlight-color:transparent}
  .usr-card:hover{border-color:${T.purple};transform:translateY(-2px)}
  .cl-row:hover td{background:rgba(255,255,255,0.02)}
  @media(max-width:768px){
    .adm-stats{grid-template-columns:repeat(2,1fr)!important}
    .adm-qa{grid-template-columns:1fr 1fr!important}
    .adm-usr-grid{grid-template-columns:1fr!important}
  }
`;

const TABS = [
  { id:"overview", label:"📊 Overview"       },
  { id:"users",    label:"👥 User Management" },
  { id:"clients",  label:"🏢 Clients"         },
  { id:"system",   label:"⚙️ System"          },
];

function roleStyle(r) {
  if(r==="admin")    return{color:T.accent, bg:T.accentDim, brd:T.accentBrd};
  if(r==="inspector")return{color:T.green,  bg:T.greenDim,  brd:T.greenBrd};
  return{color:T.textMid,bg:T.card,brd:T.border};
}

function avatar(name,email){
  return(name||email||"U").trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";
}

export default function AdminPage() {
  const router = useRouter();
  const [tab,        setTab]        = useState("overview");
  const [stats,      setStats]      = useState({clients:0,equipment:0,certificates:0,ncrs:0});
  const [users,      setUsers]      = useState([]);
  const [clients,    setClients]    = useState([]);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll(){
    setLoading(true); setError("");
    try{
      const[
        {count:clientCount},
        {count:assetCount},
        {count:certCount},
        {count:ncrCount},
        {data:userData},
        {data:clientData},
      ]=await Promise.all([
        supabase.from("clients").select("*",{count:"exact",head:true}),
        supabase.from("assets").select("*",{count:"exact",head:true}),
        supabase.from("certificates").select("*",{count:"exact",head:true}),
        supabase.from("ncrs").select("*",{count:"exact",head:true}),
        supabase.from("users").select("id,full_name,email,role,status,created_at").order("created_at",{ascending:false}),
        supabase.from("clients").select("id,company_name,status,created_at").order("company_name"),
      ]);
      setStats({clients:clientCount||0,equipment:assetCount||0,certificates:certCount||0,ncrs:ncrCount||0});
      setUsers(userData||[]);
      setClients(clientData||[]);
    }catch(e){setError(e.message||"Failed to load admin data.");}
    setLoading(false);
  }

  const roles=["All",...Array.from(new Set(users.map(u=>u.role).filter(Boolean)))];
  const filteredUsers=users.filter(u=>{
    const matchRole=roleFilter==="All"||u.role===roleFilter;
    const q=search.toLowerCase();
    return matchRole&&(!q||(u.full_name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q));
  });

  return(
    <AppLayout title="Administration">
      <style>{CSS}</style>
      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",color:T.text,padding:20,maxWidth:1200,margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>System</div>
          <h1 style={{margin:"0 0 4px",fontSize:"clamp(22px,4vw,30px)",fontWeight:900,letterSpacing:"-0.02em"}}>Administration</h1>
          <p style={{margin:0,color:T.textDim,fontSize:13}}>System management, users and configuration</p>
        </div>

        {error&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,marginBottom:16,fontWeight:700}}>⚠ {error}</div>}

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`adm-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <div style={{display:"grid",gap:20}}>
            <div className="adm-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {[
                {label:"Clients",      value:stats.clients,      color:T.accent, bg:T.accentDim, brd:T.accentBrd, icon:"🏢", href:"/clients"},
                {label:"Equipment",    value:stats.equipment,    color:T.green,  bg:T.greenDim,  brd:T.greenBrd,  icon:"⚙️", href:"/equipment"},
                {label:"Certificates", value:stats.certificates, color:T.blue,   bg:T.blueDim,   brd:T.blueBrd,   icon:"📜", href:"/certificates"},
                {label:"Open NCRs",    value:stats.ncrs,         color:T.red,    bg:T.redDim,    brd:T.redBrd,    icon:"⚠️", href:"/ncr"},
              ].map(s=>(
                <div key={s.label} onClick={()=>router.push(s.href)}
                  style={{background:s.bg,border:`1px solid ${s.brd}`,borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"transform .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <span style={{fontSize:9,fontWeight:800,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.label}</span>
                    <span style={{fontSize:18}}>{s.icon}</span>
                  </div>
                  <div style={{fontSize:32,fontWeight:900,color:s.color,fontFamily:"'IBM Plex Mono',monospace"}}>
                    {loading?"…":s.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:20}}>
              <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:14}}>Quick Actions</div>
              <div className="adm-qa" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                {[
                  {label:"Register Client",    href:"/clients/register"},
                  {label:"Register Equipment", href:"/equipment/register"},
                  {label:"AI Import Certs",    href:"/certificates/import"},
                  {label:"Generate Report",    href:"/reports/export"},
                  {label:"Manage Users",       href:"/admin/users"},
                  {label:"View Certificates",  href:"/certificates"},
                ].map(a=>(
                  <button key={a.label} className="qa-btn" type="button" onClick={()=>router.push(a.href)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab==="users"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:T.text}}>{users.length} registered user{users.length!==1?"s":""}</div>
                <div style={{fontSize:12,color:T.textDim,marginTop:2}}>Click a user to view their profile and edit their role</div>
              </div>
              <button type="button" onClick={()=>router.push("/admin/users")}
                style={{padding:"9px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22d3ee,#0891b2)",color:"#052e16",fontWeight:900,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                + Invite User
              </button>
            </div>

            {/* Search + filter */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{flex:"1 1 220px",padding:"10px 13px",borderRadius:9,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.70)",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {roles.map(r=>(
                  <button key={r} type="button" onClick={()=>setRoleFilter(r)}
                    style={{padding:"8px 13px",borderRadius:99,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
                      background:roleFilter===r?T.purpleDim:T.card,
                      border:`1px solid ${roleFilter===r?T.purpleBrd:T.border}`,
                      color:roleFilter===r?T.purple:T.textDim}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {loading?(
              <div style={{padding:"40px 0",textAlign:"center",color:T.textDim,fontSize:13}}>Loading users…</div>
            ):filteredUsers.length===0?(
              <div style={{padding:"40px 0",textAlign:"center",color:T.textDim,fontSize:13}}>
                {users.length===0?"No users found. Go to Users page to invite users.":"No users match your search."}
              </div>
            ):(
              <div className="adm-usr-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {filteredUsers.map(u=>{
                  const rs=roleStyle(u.role);
                  const av=avatar(u.full_name,u.email);
                  return(
                    <div key={u.id} className="usr-card" onClick={()=>router.push(`/admin/users/${u.id}`)}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                        <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#052e16",flexShrink:0}}>
                          {av}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"Unnamed User"}</div>
                          <div style={{fontSize:11,color:T.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                        <span style={{padding:"3px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:rs.bg,border:`1px solid ${rs.brd}`,color:rs.color,textTransform:"uppercase"}}>
                          {u.role||"viewer"}
                        </span>
                        <span style={{padding:"3px 9px",borderRadius:99,fontSize:10,fontWeight:800,
                          background:u.status==="active"?T.greenDim:T.redDim,
                          border:`1px solid ${u.status==="active"?T.greenBrd:T.redBrd}`,
                          color:u.status==="active"?T.green:T.red}}>
                          {u.status||"active"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS ── */}
        {tab==="clients"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800}}>{clients.length} clients</div>
              <button type="button" onClick={()=>router.push("/clients/register")}
                style={{padding:"9px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22d3ee,#0891b2)",color:"#052e16",fontWeight:900,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                + Register Client
              </button>
            </div>
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
              {loading?(
                <div style={{padding:"40px 0",textAlign:"center",color:T.textDim,fontSize:13}}>Loading…</div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr>
                      {["Company","Status","Registered","Actions"].map(h=>(
                        <th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,borderBottom:`1px solid ${T.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length===0?(
                      <tr><td colSpan={4} style={{padding:"32px",textAlign:"center",color:T.textDim}}>No clients found.</td></tr>
                    ):clients.map(c=>(
                      <tr key={c.id} className="cl-row" style={{borderBottom:`1px solid ${T.border}`}}>
                        <td style={{padding:"12px 16px",fontWeight:600,color:T.text}}>{c.company_name}</td>
                        <td style={{padding:"12px 16px"}}>
                          <span style={{padding:"3px 9px",borderRadius:99,fontSize:10,fontWeight:800,
                            background:c.status==="active"?T.greenDim:T.redDim,
                            border:`1px solid ${c.status==="active"?T.greenBrd:T.redBrd}`,
                            color:c.status==="active"?T.green:T.red}}>
                            {c.status||"active"}
                          </span>
                        </td>
                        <td style={{padding:"12px 16px",color:T.textDim,fontSize:12}}>
                          {c.created_at?new Date(c.created_at).toLocaleDateString("en-GB"):"—"}
                        </td>
                        <td style={{padding:"12px 16px"}}>
                          <button type="button" onClick={()=>router.push(`/clients/${c.id}`)}
                            style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab==="system"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
              <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:14}}>System Info</div>
              {[
                {label:"Platform",  value:"Monroy QMS"},
                {label:"Version",   value:"v1.0.0"},
                {label:"Database",  value:"Supabase (PostgreSQL)"},
                {label:"Auth",      value:"Supabase Auth"},
                {label:"Hosting",   value:"Render.com"},
                {label:"Domain",    value:"monroy-qms.co.bw"},
              ].map(item=>(
                <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                  <span style={{color:T.textDim}}>{item.label}</span>
                  <span style={{color:T.text,fontWeight:600}}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
              <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:14}}>Database Tables</div>
              {["clients","assets","certificates","users","ncrs","capas","inspections"].map(t=>(
                <div key={t} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                  <span style={{color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>{t}</span>
                  <span style={{fontSize:11,fontWeight:700,color:T.green}}>● Connected</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
