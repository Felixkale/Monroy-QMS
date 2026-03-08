"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getEquipment, getEquipmentStats } from "@/services/equipment";
import { getClientById } from "@/services/clients";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",
  [C.pink]:"244,114,182",[C.yellow]:"251,191,36",
};
const typeColors = {
  "Pressure Vessel":C.green,"Boiler":C.purple,"Air Receiver":C.blue,
  "Lifting Equipment":C.yellow,"Compressor":C.pink,"Storage Tank":"#a78bfa",
};
const licenseColor = { valid:C.green, expiring:C.yellow, expired:C.pink };

export default function EquipmentPage() {
  const searchParams  = useSearchParams();
  const clientId      = searchParams.get("client");

  const [equipment, setEquipment] = useState([]);
  const [stats, setStats]         = useState({ total:0, active:0, expiring:0, expired:0 });
  const [client, setClient]       = useState(null);
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [equipRes, statsRes] = await Promise.all([
        getEquipment(clientId),
        getEquipmentStats(clientId),
      ]);
      if (equipRes.error) setError("Failed to load equipment.");
      setEquipment(equipRes.data || []);
      setStats(statsRes);

      if (clientId) {
        const { data } = await getClientById(clientId);
        setClient(data);
      }
      setLoading(false);
    }
    load();
  }, [clientId]);

  const types    = ["All", ...Array.from(new Set(equipment.map(e => e.asset_type).filter(Boolean)))];
  const filtered = equipment.filter(e => {
    const matchType   = filterType === "All" || e.asset_type === filterType;
    const q           = search.toLowerCase();
    const matchSearch = (e.asset_tag || "").toLowerCase().includes(q) ||
                        (e.clients?.company_name || "").toLowerCase().includes(q) ||
                        (e.description || "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const title = client ? `Equipment — ${client.company_name}` : "Equipment Register";

  return (
    <AppLayout title={title}>

      {/* Breadcrumb if filtered by client */}
      {client && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, fontSize:13 }}>
          <a href="/clients" style={{ color:"#64748b", textDecoration:"none" }}>Clients</a>
          <span style={{ color:"#64748b" }}>→</span>
          <a href={`/clients/${clientId}`} style={{ color:"#64748b", textDecoration:"none" }}>{client.company_name}</a>
          <span style={{ color:"#64748b" }}>→</span>
          <span style={{ color:"#e2e8f0" }}>Equipment</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
          {client ? `All equipment registered under ${client.company_name}` : "Full asset register with nameplate data"}
        </p>
        <div style={{ display:"flex", gap:10 }}>
          {clientId && (
            <a href={`/clients/${clientId}`} style={{
              padding:"9px 16px", borderRadius:10, textDecoration:"none",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#94a3b8", fontSize:13, fontWeight:600,
            }}>← Back to Client</a>
          )}
          <a href="/equipment/register" style={{
            padding:"10px 18px", borderRadius:12, textDecoration:"none",
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            color:"#fff", fontWeight:700, fontSize:13,
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>+ Register Equipment</a>
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Assets",      value: loading ? "…" : stats.total,    color:C.blue   },
          { label:"Active",            value: loading ? "…" : stats.active,   color:C.green  },
          { label:"Lic. Expiring",     value: loading ? "…" : stats.expiring, color:C.yellow },
          { label:"Lic. Expired",      value: loading ? "…" : stats.expired,  color:C.pink   },
        ].map(s => (
          <div key={s.label} style={{ background:`rgba(${rgbaMap[s.color]},0.07)`, border:`1px solid rgba(${rgbaMap[s.color]},0.25)`, borderRadius:14, padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by tag, client or description…"
          style={{ flex:"1 1 220px", padding:"10px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)", borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
              background: filterType===t ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterType===t ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterType===t ? C.purple : "#94a3b8",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"18px 20px", height:160 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.15)", borderRadius:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚙️</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:6 }}>
            {search || filterType !== "All" ? "No equipment matches your search" : "No equipment registered yet"}
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
            {client ? `No equipment found for ${client.company_name}` : "Register your first piece of equipment to get started"}
          </div>
          <a href="/equipment/register" style={{ padding:"10px 24px", borderRadius:10, textDecoration:"none", background:`linear-gradient(135deg,${C.purple},${C.blue})`, color:"#fff", fontWeight:700, fontSize:13 }}>
            + Register Equipment
          </a>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {filtered.map(e => {
            const tColor = typeColors[e.asset_type] || C.purple;
            const tRgba  = rgbaMap[tColor] || "124,92,252";
            const lColor = licenseColor[e.license_status] || C.green;
            const lRgba  = rgbaMap[lColor] || "0,245,196";
            return (
              <a key={e.id} href={`/equipment/${e.id}`} style={{ textDecoration:"none" }}>
                <div
                  style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:`1px solid rgba(${tRgba},0.25)`, borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden", cursor:"pointer", transition:"all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=`rgba(${tRgba},0.5)`; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.background=`rgba(${tRgba},0.06)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=`rgba(${tRgba},0.25)`; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.background="linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))"; }}
                >
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${tColor},transparent)` }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{e.asset_tag || "—"}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>{e.serial_number}</div>
                    </div>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:`rgba(${tRgba},0.15)`, color:tColor, border:`1px solid rgba(${tRgba},0.3)` }}>
                      {e.asset_type || "Equipment"}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12, marginBottom:12 }}>
                    <div><span style={{ color:"#64748b" }}>Client: </span><span style={{ color:"#cbd5e1" }}>{e.clients?.company_name || "—"}</span></div>
                    <div><span style={{ color:"#64748b" }}>Mfr: </span><span style={{ color:"#cbd5e1" }}>{e.manufacturer || "—"}</span></div>
                    <div><span style={{ color:"#64748b" }}>Model: </span><span style={{ color:"#cbd5e1" }}>{e.model || "—"}</span></div>
                    <div><span style={{ color:"#64748b" }}>Status: </span><span style={{ color: e.status==="active" ? C.green : "#64748b", textTransform:"capitalize" }}>{e.status || "—"}</span></div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:`rgba(${lRgba},0.12)`, color:lColor, border:`1px solid rgba(${lRgba},0.3)`, textTransform:"capitalize" }}>
                      🔐 {e.license_status || "valid"}
                    </span>
                    {e.license_expiry && (
                      <span style={{ fontSize:11, color:"#64748b" }}>Expires: {new Date(e.license_expiry).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
