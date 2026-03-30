// src/app/dashboard/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getDashboardStats } from "@/services/dashboard";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.15)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",greenGlow:"rgba(52,211,153,0.15)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",  redGlow:"rgba(248,113,113,0.15)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)", amberGlow:"rgba(251,191,36,0.15)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",purpleGlow:"rgba(167,139,250,0.15)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",  blueGlow:"rgba(96,165,250,0.15)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  .db-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;margin-bottom:20px}
  .db-bottom{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
  .db-stat-card{transition:transform .18s,box-shadow .18s;cursor:pointer;text-decoration:none;display:block}
  .db-stat-card:hover{transform:translateY(-2px)}
  .db-qa-item{transition:background .15s,color .15s;display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600}
  .db-qa-item:hover{filter:brightness(1.15)}
  @media(max-width:1100px){.db-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(max-width:768px){
    .db-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}
    .db-bottom{grid-template-columns:1fr;gap:14px}
  }
  @media(max-width:400px){.db-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}}
`;

function StatCard({ label, value, sub, color, glow, dim, brd, icon, href, loading }) {
  const router = useRouter();
  return (
    <a className="db-stat-card" href={href} onClick={e=>{e.preventDefault();router.push(href);}}>
      <div style={{background:dim,border:`1px solid ${brd}`,borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at top right,${glow},transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <span style={{fontSize:9,fontWeight:800,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</span>
          <span style={{fontSize:18}}>{icon}</span>
        </div>
        <div style={{fontSize:34,fontWeight:900,color,lineHeight:1,marginBottom:5,fontFamily:"'IBM Plex Mono',monospace"}}>
          {loading?"…":value}
        </div>
        <div style={{fontSize:11,color:T.textDim}}>{sub}</div>
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const [stats,setStats]=useState(null);
  const [capaStats,setCapaStats]=useState({total:0,open:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  useEffect(()=>{
    async function load(){
      setLoading(true);
      try{
        const[dashData,capaRes]=await Promise.all([
          getDashboardStats(),
          supabase.from("capas").select("id,status"),
        ]);
        setStats(dashData);
        if(!capaRes.error&&capaRes.data){
          setCapaStats({
            total:capaRes.data.length,
            open:capaRes.data.filter(c=>c.status!=="closed").length,
          });
        }
      }catch(e){setError("Failed to load dashboard data.");}
      finally{setLoading(false);}
    }
    load();
  },[]);

  const STAT_CARDS = stats ? [
    {label:"Clients",       value:stats.totalClients,      sub:`${stats.activeClients} active`,         color:T.accent, glow:T.accentGlow, dim:T.accentDim, brd:T.accentBrd, icon:"🏢", href:"/clients"},
    {label:"Equipment",     value:stats.totalEquipment,    sub:`${stats.activeEquipment} active`,        color:T.green,  glow:T.greenGlow,  dim:T.greenDim,  brd:T.greenBrd,  icon:"⚙️", href:"/equipment"},
    {label:"Certificates",  value:stats.totalCertificates, sub:`${stats.expiringSoon} expiring soon`,    color:T.blue,   glow:T.blueGlow,   dim:T.blueDim,   brd:T.blueBrd,   icon:"📜", href:"/certificates"},
    {label:"Open NCRs",     value:stats.openNcrs,          sub:`${stats.totalNcrs} total`,               color:T.red,    glow:T.redGlow,    dim:T.redDim,    brd:T.redBrd,    icon:"⚠️", href:"/ncr"},
    {label:"Open CAPAs",    value:capaStats.open,          sub:`${capaStats.total} total`,               color:T.purple, glow:T.purpleGlow, dim:T.purpleDim, brd:T.purpleBrd, icon:"🔧", href:"/capa"},
    {label:"Expiring ≤30d", value:stats.expiringSoon,      sub:"certificates need attention",            color:T.amber,  glow:T.amberGlow,  dim:T.amberDim,  brd:T.amberBrd,  icon:"⏰", href:"/certificates"},
  ] : [];

  const QUICK_ACTIONS = [
    {label:"Register New Client",    href:"/clients/register",   color:T.accent, dim:T.accentDim, brd:T.accentBrd, icon:"🏢"},
    {label:"Add Equipment",          href:"/equipment/register", color:T.green,  dim:T.greenDim,  brd:T.greenBrd,  icon:"⚙️"},
    {label:"Create Certificate",     href:"/certificates/create",color:T.blue,   dim:T.blueDim,   brd:T.blueBrd,   icon:"📜"},
    {label:"AI Import Certificate",  href:"/certificates/import",color:T.accent, dim:T.accentDim, brd:T.accentBrd, icon:"🤖"},
    {label:"Log NCR",                href:"/ncr/new",            color:T.red,    dim:T.redDim,    brd:T.redBrd,    icon:"⚠️"},
    {label:"Create CAPA",            href:"/capa/new",           color:T.purple, dim:T.purpleDim, brd:T.purpleBrd, icon:"🔧"},
  ];

  const OVERVIEW_BARS = stats ? [
    {label:"Clients Registered",  value:stats.totalClients,      max:Math.max(stats.totalClients,10),       color:T.accent},
    {label:"Equipment Registered", value:stats.totalEquipment,   max:Math.max(stats.totalEquipment,10),     color:T.green},
    {label:"Certificates Issued",  value:stats.totalCertificates,max:Math.max(stats.totalCertificates,10),  color:T.blue},
    {label:"Open NCRs",            value:stats.openNcrs,          max:Math.max(stats.totalNcrs,10),          color:T.red},
    {label:"Open CAPAs",           value:capaStats.open,          max:Math.max(capaStats.total,10),          color:T.purple},
  ] : [];

  return(
    <AppLayout title="Dashboard">
      <style>{CSS}</style>
      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",color:T.text}}>

        {error&&(
          <div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,marginBottom:16,fontWeight:600}}>⚠ {error}</div>
        )}

        {/* STAT CARDS */}
        <div className="db-stats">
          {loading
            ? Array.from({length:6}).map((_,i)=>(
                <div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px",height:110,opacity:.5}}/>
              ))
            : STAT_CARDS.map(s=>(
                <StatCard key={s.label} {...s} loading={loading}/>
              ))
          }
        </div>

        {/* BOTTOM GRID */}
        <div className="db-bottom">

          {/* Quick Actions */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18,backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`}}/>
              <h2 style={{fontSize:14,fontWeight:800,color:T.text,margin:0}}>Quick Actions</h2>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {QUICK_ACTIONS.map(a=>(
                <a key={a.label} href={a.href} className="db-qa-item"
                  style={{background:a.dim,border:`1px solid ${a.brd}`,color:T.textMid}}>
                  <span style={{fontSize:16,flexShrink:0}}>{a.icon}</span>
                  <span>{a.label}</span>
                  <span style={{marginLeft:"auto",color:T.textDim,fontSize:14}}>→</span>
                </a>
              ))}
            </div>
          </div>

          {/* System Overview */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:18,backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`}}/>
              <h2 style={{fontSize:14,fontWeight:800,color:T.text,margin:0}}>System Overview</h2>
            </div>
            {loading?(
              <div style={{color:T.textDim,fontSize:13}}>Loading…</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {OVERVIEW_BARS.map(item=>(
                  <div key={item.label}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:12,color:T.textDim}}>{item.label}</span>
                      <span style={{fontSize:12,fontWeight:800,color:item.color,fontFamily:"'IBM Plex Mono',monospace"}}>{item.value}</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,width:`${Math.min((item.value/item.max)*100,100)}%`,background:item.color,transition:"width 0.7s ease"}}/>
                    </div>
                  </div>
                ))}

                {/* Alerts */}
                <div style={{display:"grid",gap:8,marginTop:4}}>
                  {stats?.expiringSoon>0&&(
                    <a href="/certificates" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.amberDim,border:`1px solid ${T.amberBrd}`,borderRadius:10,textDecoration:"none"}}>
                      <span style={{fontSize:14}}>⏰</span>
                      <span style={{fontSize:12,color:T.amber,fontWeight:700}}>{stats.expiringSoon} certificate{stats.expiringSoon>1?"s":""} expiring within 30 days</span>
                      <span style={{marginLeft:"auto",color:T.amber,fontSize:12}}>→</span>
                    </a>
                  )}
                  {capaStats.open>0&&(
                    <a href="/capa" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.purpleDim,border:`1px solid ${T.purpleBrd}`,borderRadius:10,textDecoration:"none"}}>
                      <span style={{fontSize:14}}>🔧</span>
                      <span style={{fontSize:12,color:T.purple,fontWeight:700}}>{capaStats.open} open CAPA{capaStats.open>1?"s":""} in progress</span>
                      <span style={{marginLeft:"auto",color:T.purple,fontSize:12}}>→</span>
                    </a>
                  )}
                  {stats?.openNcrs>0&&(
                    <a href="/ncr" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.redDim,border:`1px solid ${T.redBrd}`,borderRadius:10,textDecoration:"none"}}>
                      <span style={{fontSize:14}}>⚠️</span>
                      <span style={{fontSize:12,color:T.red,fontWeight:700}}>{stats.openNcrs} open NCR{stats.openNcrs>1?"s":""} need attention</span>
                      <span style={{marginLeft:"auto",color:T.red,fontSize:12}}>→</span>
                    </a>
                  )}
                  {stats?.totalClients===0&&stats?.totalEquipment===0&&(
                    <a href="/clients/register" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:T.accentDim,border:`1px solid ${T.accentBrd}`,borderRadius:10,textDecoration:"none"}}>
                      <span style={{fontSize:14}}>👋</span>
                      <span style={{fontSize:12,color:T.accent,fontWeight:700}}>Start by registering your first client</span>
                      <span style={{marginLeft:"auto",color:T.accent,fontSize:12}}>→</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
