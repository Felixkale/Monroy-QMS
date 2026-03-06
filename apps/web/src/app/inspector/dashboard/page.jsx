"use client";
import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252" };

const mockTasks = [
  { id:1, equipment:"PV-0041", client:"Acme Corp", dueDate:"2026-03-10", status:"Pending" },
  { id:2, equipment:"BL-0012", client:"SteelWorks Ltd", dueDate:"2026-03-08", status:"In Progress" },
  { id:3, equipment:"AR-0067", client:"MineOps Ltd", dueDate:"2026-03-15", status:"Pending" },
];

export default function InspectorDashboardPage() {
  const [tasks, setTasks] = useState(mockTasks);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Mock user - replace with actual auth
    setUser({ name: "John Smith", email: "john@monroy.com" });
  }, []);

  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Inspector Dashboard</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Welcome back, {user?.name || "Inspector"}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:22 }}>
          {[
            { label:"Pending Tasks", value:pendingCount, color:C.blue, icon:"📋" },
            { label:"In Progress", value:inProgressCount, color:C.yellow, icon:"⏳" },
            { label:"Completed", value:tasks.length - pendingCount - inProgressCount, color:C.green, icon:"✅" },
          ].map(card => (
            <div key={card.label} style={{
              background:`rgba(${rgbaMap[card.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[card.color]},0.25)`,
              borderRadius:14, padding:"20px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>{card.label}</span>
                <span style={{ fontSize:18 }}>{card.icon}</span>
              </div>
              <div style={{ fontSize:36, fontWeight:900, color:card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px",
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>Assigned Inspections</h2>
          {tasks.map((task, i) => (
            <div key={task.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 0", borderBottom: i < tasks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{task.equipment}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{task.client}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#64748b" }}>Due: {task.dueDate}</div>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                  background: task.status === "Pending" ? `rgba(${rgbaMap[C.blue]},0.15)` : `rgba(${rgbaMap[C.yellow]},0.15)`,
                  color: task.status === "Pending" ? C.blue : C.yellow,
                }}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}"use client";
import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252" };

const mockTasks = [
  { id:1, equipment:"PV-0041", client:"Acme Corp", dueDate:"2026-03-10", status:"Pending" },
  { id:2, equipment:"BL-0012", client:"SteelWorks Ltd", dueDate:"2026-03-08", status:"In Progress" },
  { id:3, equipment:"AR-0067", client:"MineOps Ltd", dueDate:"2026-03-15", status:"Pending" },
];

export default function InspectorDashboardPage() {
  const [tasks, setTasks] = useState(mockTasks);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Mock user - replace with actual auth
    setUser({ name: "John Smith", email: "john@monroy.com" });
  }, []);

  const pendingCount = tasks.filter(t => t.status === "Pending").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Inspector Dashboard</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Welcome back, {user?.name || "Inspector"}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:22 }}>
          {[
            { label:"Pending Tasks", value:pendingCount, color:C.blue, icon:"📋" },
            { label:"In Progress", value:inProgressCount, color:C.yellow, icon:"⏳" },
            { label:"Completed", value:tasks.length - pendingCount - inProgressCount, color:C.green, icon:"✅" },
          ].map(card => (
            <div key={card.label} style={{
              background:`rgba(${rgbaMap[card.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[card.color]},0.25)`,
              borderRadius:14, padding:"20px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>{card.label}</span>
                <span style={{ fontSize:18 }}>{card.icon}</span>
              </div>
              <div style={{ fontSize:36, fontWeight:900, color:card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px",
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>Assigned Inspections</h2>
          {tasks.map((task, i) => (
            <div key={task.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 0", borderBottom: i < tasks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{task.equipment}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{task.client}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#64748b" }}>Due: {task.dueDate}</div>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                  background: task.status === "Pending" ? `rgba(${rgbaMap[C.blue]},0.15)` : `rgba(${rgbaMap[C.yellow]},0.15)`,
                  color: task.status === "Pending" ? C.blue : C.yellow,
                }}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
