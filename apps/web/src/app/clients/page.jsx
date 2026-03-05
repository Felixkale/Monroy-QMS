"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36",
};

const clients = [
  { id:"CLT-001", name:"Acme Industrial Corp",    contact:"James Wright",    email:"jwright@acme.com",    equipment:24, status:"Active",   compliance:98 },
  { id:"CLT-002", name:"SteelWorks Ltd",          contact:"Maria Santos",    email:"msantos@steelworks.com",equipment:41, status:"Active",   compliance:82 },
  { id:"CLT-003", name:"TechPlant Inc",           contact:"David Kim",       email:"dkim@techplant.com",  equipment:17, status:"Active",   compliance:95 },
  { id:"CLT-004", name:"MineOps Ltd",             contact:"Sarah Connor",    email:"sconnor@mineops.com", equipment:33, status:"Active",   compliance:71 },
  { id:"CLT-005", name:"Cargo Hub",               contact:"Robert Nkosi",    email:"rnkosi@cargohub.com", equipment:12, status:"Active",   compliance:100 },
  { id:"CLT-006", name:"PowerGen Africa",         contact:"Fatima Dlamini",  email:"fdlamini@powgen.com", equipment:29, status:"Suspended",compliance:45 },
  { id:"CLT-007", name:"Delta Refineries",        contact:"Alex Thompson",   email:"athompson@delta.com", equipment:38, status:"Active",   compliance:88 },
  { id:"CLT-008", name:"SafePort Holdings",       contact:"Linda Mokoena",   email:"lmokoena@safeport.com",equipment:9, status:"Active",   compliance:93 },
];

const statusColor = { Active:C.green, Suspended:C.pink };

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Clients</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage registered client organisations</p>
        </div>
        <button style={{
          padding:"10px 20px", borderRadius:12,
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          cursor:"pointer", fontFamily:"inherit",
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
        }}>+ Register Client</button>
      </div>

      {/* Stats Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Clients", value:24, color:C.blue   },
          { label:"Active",        value:22, color:C.green  },
          { label:"Suspended",     value:1,  color:C.pink   },
          { label:"Avg Compliance",value:"88%",color:C.yellow},
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:16 }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search clients by name or ID…"
          style={{
            width:"100%", maxWidth:400, padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden",
      }}>
        {/* Table Header */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto auto auto",
          padding:"12px 20px",
          background:"rgba(124,92,252,0.1)",
          borderBottom:"1px solid rgba(124,92,252,0.15)",
          fontSize:11, fontWeight:700, color:"#64748b",
          textTransform:"uppercase", letterSpacing:"0.08em", gap:12,
        }} className="clients-table-header">
          <div>Client</div>
          <div>Contact</div>
          <div>Email</div>
          <div>Equipment</div>
          <div>Compliance</div>
          <div>Status</div>
        </div>

        {filtered.map((c,i)=>(
          <div key={c.id} style={{
            display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto auto auto",
            padding:"14px 20px", gap:12,
            borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            alignItems:"center", cursor:"pointer", transition:"background 0.15s",
          }}
          className="table-row"
          onMouseEnter={e=>e.currentTarget.style.background="rgba(124,92,252,0.06)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
              <div style={{ fontSize:11, color:"#64748b" }}>{c.id}</div>
            </div>
            <div style={{ fontSize:13, color:"#94a3b8" }}>{c.contact}</div>
            <div style={{ fontSize:12, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email}</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.blue, textAlign:"center" }}>{c.equipment}</div>
            <div>
              <div style={{ height:4, width:60, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${c.compliance}%`,
                  background: c.compliance>=90 ? C.green : c.compliance>=70 ? C.yellow : C.pink,
                  borderRadius:4,
                }}/>
              </div>
              <div style={{ fontSize:10, color:"#64748b", marginTop:3, textAlign:"center" }}>{c.compliance}%</div>
            </div>
            <div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${c.status==="Active" ? "0,245,196" : "244,114,182"},0.12)`,
                color: statusColor[c.status] || C.yellow,
                border:`1px solid rgba(${c.status==="Active" ? "0,245,196" : "244,114,182"},0.3)`,
              }}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .clients-table-header { grid-template-columns: 1fr 1fr auto !important; }
          .clients-table-header > div:nth-child(2),
          .clients-table-header > div:nth-child(3),
          .clients-table-header > div:nth-child(4) { display: none; }
          .table-row { grid-template-columns: 1fr 1fr auto !important; }
          .table-row > div:nth-child(2),
          .table-row > div:nth-child(3),
          .table-row > div:nth-child(4) { display: none; }
        }
      `}</style>
    </AppLayout>
  );
}
