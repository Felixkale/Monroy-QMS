"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const allNCRs = [
  {
    id:"NCR-0001", ncrNo:"NCR-0001", equipmentTag:"PV-0041", client:"Acme Industrial Corp", 
    date:"2026-02-15", raisedBy:"John Smith", status:"Open", priority:"High",
    issue:"Minor corrosion detected on external surface", actionRequired:"Surface treatment",
    targetDate:"2026-03-15", assignedTo:"Michael Chen",
    details: {
      description: "Minor corrosion patches observed on the external surface of the pressure vessel during routine inspection.",
      location: "Plant A - Bay 3",
      impact: "Aesthetic concern, no structural impact at this time",
      rootCause: "Exposure to moisture and inadequate protective coating",
      correctiveAction: "1. Clean corroded area\n2. Apply rust treatment\n3. Reapply protective coating\n4. Implement moisture control measures",
      preventiveAction: "1. Monthly visual inspections\n2. Quarterly coating inspections\n3. Environmental controls in storage area",
      timeline: "1. Cleaning: 2-3 days\n2. Treatment: 1 day\n3. Coating: 3-5 days\n4. Curing: 7 days",
      assignedToUser: "Michael Chen (michael@monroy.com)",
      notes: "Client approval required before proceeding with treatment.",
    },
    history: [
      { action: "NCR Raised", date: "2026-02-15", user: "John Smith", notes: "Initial non-conformance identified" },
      { action: "Assigned", date: "2026-02-16", user: "Admin", notes: "Assigned to Michael Chen" },
      { action: "In Progress", date: "2026-02-20", user: "Michael Chen", notes: "Cleaning work commenced" },
    ]
  },
  {
    id:"NCR-0002", ncrNo:"NCR-0002", equipmentTag:"CP-0089", client:"TechPlant Inc",
    date:"2026-02-10", raisedBy:"Sarah Johnson", status:"Resolved", priority:"Critical",
    issue:"Pressure seal failure", actionRequired:"Replace seals",
    targetDate:"2026-02-25", assignedTo:"John Smith", completedDate:"2026-02-23",
    details: {
      description: "Critical seal failure in the main compressor unit causing pressure loss during operation.",
      location: "TechPlant Inc - Factory Floor",
      impact: "Equipment non-operational, production halted",
      rootCause: "Seal material degradation due to extended service life (7+ years)",
      correctiveAction: "1. Replace main seal assembly\n2. Inspect secondary seals\n3. Pressure test equipment\n4. Certification",
      preventiveAction: "1. Implement 5-year seal replacement schedule\n2. Quarterly maintenance inspections\n3. Pressure monitoring system upgrade",
      timeline: "1. Seal replacement: 2 days\n2. Inspection: 1 day\n3. Testing: 1 day\n4. Certification: 1 day",
      assignedToUser: "John Smith (john@monroy.com)",
      notes: "Completed ahead of schedule. Equipment returned to service on 2026-02-23.",
    },
    history: [
      { action: "NCR Raised", date: "2026-02-10", user: "Sarah Johnson", notes: "Critical equipment failure reported" },
      { action: "Emergency Response", date: "2026-02-11", user: "Admin", notes: "Fast-tracked priority" },
      { action: "Assigned", date: "2026-02-11", user: "Admin", notes: "Assigned to John Smith" },
      { action: "Work Started", date: "2026-02-12", user: "John Smith", notes: "Seal replacement in progress" },
      { action: "Resolved", date: "2026-02-23", user: "John Smith", notes: "Equipment tested and certified" },
    ]
  },
];

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ncr, setNCR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");

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
    loadNCR();
  }

  function loadNCR() {
    const id = params.id;
    const found = allNCRs.find(n => n.id === id);
    if (found) {
      setNCR(found);
    }
    setLoading(false);
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!ncr) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>NCR Not Found</h2>
          <button onClick={() => router.push("/ncr")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to NCRs</button>
        </div>
      </AppLayout>
    );
  }

  const statusColor = { Open:C.pink, "In Progress":C.yellow, Resolved:C.green };
  const priorityColor = { Low:C.green, Medium:C.yellow, High:C.pink, Critical:C.pink };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/ncr" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to NCRs</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {ncr.ncrNo}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{ncr.equipmentTag} · {ncr.client}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={{
            padding:"8px 16px", borderRadius:20, fontSize:12, fontWeight:700,
            background:`rgba(${C.pink.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.12)`,
            color:statusColor[ncr.status],
            border:`1px solid rgba(${C.pink.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.3)`,
          }}>{ncr.status}</span>
          <span style={{
            padding:"8px 16px", borderRadius:20, fontSize:12, fontWeight:700,
            background:`rgba(${priorityColor[ncr.priority].substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.12)`,
            color:priorityColor[ncr.priority],
            border:`1px solid rgba(${priorityColor[ncr.priority].substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.3)`,
          }}>{ncr.priority} Priority</span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Raised Date", value:ncr.date, color:C.blue },
          { label:"Raised By", value:ncr.raisedBy, color:C.green },
          { label:"Assigned To", value:ncr.assignedTo, color:C.purple },
          { label:"Target Date", value:ncr.targetDate, color:C.yellow },
        ].map(s=>(
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"14px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
        {[
          { id:"overview", label:"Overview", icon:"📋" },
          { id:"capa", label:"CAPA", icon:"✓" },
          { id:"history", label:"History", icon:"📜" },
        ].map(t=>(
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap",
            background: tab===t.id ? "rgba(244,114,182,0.2)" : "transparent",
            border:"none", borderBottom: tab===t.id ? `2px solid ${C.pink}` : "2px solid transparent",
            color: tab===t.id ? C.pink : "#64748b",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(244,114,182,0.2)",
          borderRadius:16, padding:"24px",
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Non-Conformance Details</h3>
          {[
            { label:"Issue", value:ncr.issue },
            { label:"Location", value:ncr.details.location },
            { label:"Impact", value:ncr.details.impact },
            { label:"Root Cause", value:ncr.details.rootCause },
            { label:"Action Required", value:ncr.actionRequired },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.pink, textTransform:"uppercase", marginBottom:6 }}>{f.label}</div>
              <div style={{ fontSize:13, color:"#cbd5e1", padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="capa" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
          borderRadius:16, padding:"24px",
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Corrective & Preventive Actions</h3>
          {[
            { label:"Corrective Action", value:ncr.details.correctiveAction },
            { label:"Preventive Action", value:ncr.details.preventiveAction },
            { label:"Implementation Timeline", value:ncr.details.timeline },
            { label:"Assigned To", value:ncr.details.assignedToUser },
            { label:"Notes", value:ncr.details.notes },
          ].map(f=>(
            <div key={f.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.green, textTransform:"uppercase", marginBottom:6 }}>{f.label}</div>
              <div style={{ fontSize:13, color:"#cbd5e1", padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:8, whiteSpace:"pre-wrap" }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="history" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:"24px",
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Activity History</h3>
          {ncr.history.map((entry, idx) => (
            <div key={idx} style={{
              display:"flex", alignItems:"flex-start", gap:14, padding:"14px 0",
              borderBottom: idx < ncr.history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{
                width:8, height:8, borderRadius:"50%", background:C.pink,
                boxShadow:"0 0 6px rgba(244,114,182,0.8)", flexShrink:0, marginTop:5,
              }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{entry.action}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{entry.notes}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, color:"#64748b" }}>{entry.user}</div>
                <div style={{ fontSize:10, color:"#475569" }}>{entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
