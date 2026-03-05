"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36",
};

const equipment = [
  { tag:"PV-0041", serial:"S-10041", type:"Pressure Vessel", client:"Acme Industrial Corp",  manufacturer:"ASME Corp",   year:2018, status:"Active",         license:"Valid",    nextInsp:"2026-06-01" },
  { tag:"BL-0012", serial:"S-20012", type:"Boiler",          client:"SteelWorks Ltd",        manufacturer:"ThermTech",   year:2015, status:"Active",         license:"Expiring", nextInsp:"2026-04-15" },
  { tag:"AR-0067", serial:"S-30067", type:"Air Receiver",    client:"MineOps Ltd",           manufacturer:"CompAir",     year:2020, status:"Active",         license:"Valid",    nextInsp:"2026-08-20" },
  { tag:"LE-0034", serial:"S-40034", type:"Lifting Equip",   client:"Cargo Hub",             manufacturer:"CraneWorks",  year:2019, status:"Active",         license:"Valid",    nextInsp:"2026-05-10" },
  { tag:"CP-0089", serial:"S-50089", type:"Compressor",      client:"TechPlant Inc",         manufacturer:"Atlas",       year:2017, status:"Active",         license:"Expired",  nextInsp:"2026-03-01" },
  { tag:"ST-0023", serial:"S-60023", type:"Storage Tank",    client:"Delta Refineries",      manufacturer:"TankCo",      year:2016, status:"Active",         license:"Valid",    nextInsp:"2026-07-30" },
  { tag:"PV-0055", serial:"S-10055", type:"Pressure Vessel", client:"PowerGen Africa",       manufacturer:"ASME Corp",   year:2014, status:"Decommissioned", license:"Expired",  nextInsp:"N/A"        },
  { tag:"BL-0031", serial:"S-20031", type:"Boiler",          client:"SafePort Holdings",     manufacturer:"ThermTech",   year:2021, status:"Active",         license:"Valid",    nextInsp:"2026-09-12" },
];

const typeColors = {
  "Pressure Vessel":C.green, "Boiler":C.purple, "Air Receiver":C.blue,
  "Lifting Equip":C.yellow, "Compressor":C.pink, "Storage Tank":"#a78bfa",
};
const licenseColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

export default function EquipmentPage() {
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("All");

  const types = ["All", ...Array.from(new Set(equipment.map(e=>e.type)))];
  const filtered = equipment.filter(e =>
    (filterType === "All" || e.type === filterType) &&
    (e.tag.toLowerCase().includes(search.toLowerCase()) ||
     e.client.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Equipment Register</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Full asset register with nameplate data</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <a href="/qr-codes" style={{
            padding:"10px 18px", borderRadius:12, textDecoration:"none",
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:C.green, fontWeight:700, fontSize:13,
          }}>🏷️ Generate QR</a>
          <a href="/equipment/register" style={{
            padding:"10px 18px", borderRadius:12, textDecoration:"none",
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:13,
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>+ Register Equipment</a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Assets",      value:186, color:C.blue   },
          { label:"Active",            value:181, color:C.green  },
          { label:"Decommissioned",    value:5,   color:"#64748b"},
          { label:"Licenses Expiring", value:11,  color:C.yellow },
          { label:"Licenses Expired",  value:4,   color:C.pink   },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]||"100,116,139"},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]||"100,116,139"},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by tag or client…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {types.map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterType===t ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterType===t ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterType===t ? C.purple : "#64748b",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Equipment Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map(e=>{
          const tColor = typeColors[e.type] || C.purple;
          const tRgba  = rgbaMap[tColor] || "124,92,252";
          const lColor = licenseColor[e.license];
          const lRgba  = rgbaMap[lColor];
          return (
            <div key={e.tag} style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:`1px solid rgba(${tRgba},0.25)`,
              borderRadius:14, padding:"18px 20px",
              boxShadow:`0 0 20px rgba(${tRgba},0.08)`,
              position:"relative", overflow:"hidden", cursor:"pointer",
            }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                background:`linear-gradient(90deg,${tColor},transparent)` }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{e.tag}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{e.serial}</div>
                </div>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${tRgba},0.15)`, color:tColor,
                  border:`1px solid rgba(${tRgba},0.3)`,
                }}>{e.type}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                <div><span style={{ color:"#64748b" }}>Client: </span><span style={{ color:"#cbd5e1" }}>{e.client}</span></div>
                <div><span style={{ color:"#64748b" }}>Mfr: </span><span style={{ color:"#cbd5e1" }}>{e.manufacturer}</span></div>
                <div><span style={{ color:"#64748b" }}>Year: </span><span style={{ color:"#cbd5e1" }}>{e.year}</span></div>
                <div><span style={{ color:"#64748b" }}>Next: </span><span style={{ color:"#cbd5e1" }}>{e.nextInsp}</span></div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${lRgba},0.12)`, color:lColor,
                  border:`1px solid rgba(${lRgba},0.3)`,
                }}>🔐 {e.license}</span>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background: e.status==="Active" ? "rgba(0,245,196,0.1)" : "rgba(100,116,139,0.15)",
                  color: e.status==="Active" ? C.green : "#64748b",
                  border: e.status==="Active" ? "1px solid rgba(0,245,196,0.3)" : "1px solid rgba(100,116,139,0.2)",
                }}>{e.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
