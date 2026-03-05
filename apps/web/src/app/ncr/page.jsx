"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allNCRs = [
  {
    id:"NCR-0001", ncrNo:"NCR-0001", equipmentTag:"PV-0041", client:"Acme Industrial Corp", 
    date:"2026-02-15", raisedBy:"John Smith", status:"Open", priority:"High",
    issue:"Minor corrosion detected on external surface", actionRequired:"Surface treatment",
    targetDate:"2026-03-15", assignedTo:"Michael Chen",
  },
  {
    id:"NCR-0002", ncrNo:"NCR-0002", equipmentTag:"CP-0089", client:"TechPlant Inc",
    date:"2026-02-10", raisedBy:"Sarah Johnson", status:"Resolved", priority:"Critical",
    issue:"Pressure seal failure", actionRequired:"Replace seals",
    targetDate:"2026-02-25", assignedTo:"John Smith", completedDate:"2026-02-23",
  },
  {
    id:"NCR-0003", ncrNo:"NCR-0003", equipmentTag:"BL-0012", client:"SteelWorks Ltd",
    date:"2026-03-01", raisedBy:"Michael Chen", status:"In Progress", priority:"Medium",
    issue:"Relief valve response time slower than standard", actionRequired:"Valve adjustment",
    targetDate:"2026-03-10", assignedTo:"Sarah Johnson",
  },
];

export default function NCRPage() {
  const router = useRouter();
  const [ncrs, setNCRs] = useState(allNCRs);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ncrNo: "", equipmentTag: "", client: "", issue: "", actionRequired: "", priority: "Medium"
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
  }

  const statuses = ["All", "Open", "In Progress", "Resolved"];
  const filtered = ncrs.filter(n =>
    (filterStatus === "All" || n.status === filterStatus) &&
    (n.ncrNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     n.equipmentTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNCRClick = (id) => {
    router.push(`/ncr/${id}`);
  };

  const handleRaiseNCR = async () => {
    if (!formData.equipmentTag || !formData.issue) {
      alert("Please fill in required fields");
      return;
    }

    const newNCR = {
      id: `NCR-${String(ncrs.length + 1).padStart(4, '0')}`,
      ncrNo: `NCR-${String(ncrs.length + 1).padStart(4, '0')}`,
      equipmentTag: formData.equipmentTag,
      client: formData.client,
      issue: formData.issue,
      actionRequired: formData.actionRequired,
      priority: formData.priority,
      date: new Date().toISOString().split('T')[0],
      raisedBy: user?.email || "Admin",
      status: "Open",
      assignedTo: "Pending",
      targetDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
    };

    try {
      const { data, error } = await supabase
        .from("ncr")
        .insert([newNCR]);

      if (error) {
        console.error("NCR Insert Error:", error);
        alert("Error creating NCR: " + error.message);
        return;
      }

      setNCRs([...ncrs, newNCR]);
      setFormData({ ncrNo: "", equipmentTag: "", client: "", issue: "", actionRequired: "", priority: "Medium" });
      setShowForm(false);
      alert("NCR raised successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("Error creating NCR: " + error.message);
    }
  };

  const statusColor = { Open:C.pink, "In Progress":C.yellow, Resolved:C.green };
  const priorityColor = { Low:C.green, Medium:C.yellow, High:C.pink, Critical:C.pink };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.pink})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Non-Conformance Reports</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage equipment non-conformances and corrective actions</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding:"10px 18px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
        }}>
          ⚠️ Raise NCR
        </button>
      </div>

      {showForm && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(244,114,182,0.2)",
          borderRadius:16, padding:"20px", marginBottom:20,
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Raise New NCR</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>
            <input
              placeholder="Equipment Tag" value={formData.equipmentTag} onChange={e=>setFormData({...formData, equipmentTag: e.target.value})}
              style={{
                padding:"11px 14px", background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)", borderRadius:10,
                color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
              }}
            />
            <input
              placeholder="Client" value={formData.client} onChange={e=>setFormData({...formData, client: e.target.value})}
              style={{
                padding:"11px 14px", background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)", borderRadius:10,
                color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
              }}
            />
            <select
              value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})}
              style={{
                padding:"11px 14px", background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)", borderRadius:10,
                color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none", cursor:"pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(244,114,182,0.15)";
                e.currentTarget.style.borderColor = "rgba(244,114,182,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(124,92,252,0.25)";
              }}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <textarea
            placeholder="Issue Description" value={formData.issue} onChange={e=>setFormData({...formData, issue: e.target.value})}
            style={{
              width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(124,92,252,0.25)", borderRadius:10,
              color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
              marginTop:14, minHeight:"80px", resize:"vertical",
            }}
          />
          <textarea
            placeholder="Action Required" value={formData.actionRequired} onChange={e=>setFormData({...formData, actionRequired: e.target.value})}
            style={{
              width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(124,92,252,0.25)", borderRadius:10,
              color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
              marginTop:14, minHeight:"80px", resize:"vertical",
            }}
          />
          <div style={{ display:"flex", gap:12, marginTop:16 }}>
            <button onClick={handleRaiseNCR} style={{
              padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
              fontWeight:700, fontSize:13, background:`linear-gradient(135deg,${C.pink},${C.purple})`,
              border:"none", color:"#fff", boxShadow:`0 0 20px rgba(244,114,182,0.4)`,
            }}>✓ Submit NCR</button>
            <button onClick={() => setShowForm(false)} style={{
              padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
              fontWeight:700, fontSize:13, background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total NCRs", value:allNCRs.length, color:C.blue },
          { label:"Open", value:allNCRs.filter(n=>n.status==="Open").length, color:C.pink },
          { label:"In Progress", value:allNCRs.filter(n=>n.status==="In Progress").length, color:C.yellow },
          { label:"Resolved", value:allNCRs.filter(n=>n.status==="Resolved").length, color:C.green },
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

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search NCRs…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterStatus===s ? "rgba(79,195,247,0.25)" : "rgba(255,255,255,0.04)",
              border: filterStatus===s ? `1px solid ${C.blue}` : "1px solid rgba(255,255,255,0.08)",
              color: filterStatus===s ? C.blue : "#64748b",
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(n=>(
          <div
            key={n.id}
            onClick={() => handleNCRClick(n.id)}
            style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(244,114,182,0.25)",
              borderRadius:14, padding:"20px",
              cursor:"pointer", transition:"all 0.25s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(244,114,182,0.5)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(244,114,182,0.2)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(244,114,182,0.25)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>{n.ncrNo}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{n.equipmentTag} · {n.client}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[priorityColor[n.priority]]},0.12)`, color:priorityColor[n.priority],
                border:`1px solid rgba(${rgbaMap[priorityColor[n.priority]]},0.3)`,
              }}>{n.priority}</span>
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:"0 0 12px" }}>{n.issue}</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[statusColor[n.status]]},0.12)`, color:statusColor[n.status],
                border:`1px solid rgba(${rgbaMap[statusColor[n.status]]},0.3)`,
              }}>{n.status}</span>
              <span style={{ fontSize:11, color:"#64748b" }}>{n.date}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
