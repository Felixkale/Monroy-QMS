"use client";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const reportTypes = [
  { title:"Inspection Performance Report",  desc:"Full breakdown of all inspections by period, inspector, and result.",  icon:"🔍", color:C.purple, formats:["PDF","Word"] },
  { title:"Equipment Compliance Report",    desc:"Per-equipment compliance status, license validity, and overdue alerts.", icon:"⚙️", color:C.green,  formats:["PDF","Word"] },
  { title:"Client Inspection Report",       desc:"Client-specific inspection history, findings, and certification status.",icon:"🏢", color:C.blue,   formats:["PDF","Word"] },
  { title:"NCR Statistics Report",          desc:"NCR trends, severity analysis, open/closed ratios, and root causes.",   icon:"⚠️", color:C.yellow, formats:["PDF","Word"] },
  { title:"Certification Status Report",    desc:"All certificate validity, expiry tracking, and renewal pipeline.",       icon:"📜", color:C.pink,   formats:["PDF","Word"] },
  { title:"Equipment Register Export",      desc:"Full asset register with nameplate data and QR code references.",        icon:"📋", color:C.blue,   formats:["PDF","Word"] },
];

const recentReports = [
  { name:"Inspection Performance – Feb 2026", generated:"2026-03-01", by:"John Smith",   format:"PDF",  size:"1.2 MB" },
  { name:"Client Report – Acme Industrial",   generated:"2026-02-28", by:"Sarah Johnson",format:"Word", size:"840 KB" },
  { name:"NCR Statistics – Q1 2026",          generated:"2026-02-25", by:"Michael Chen", format:"PDF",  size:"560 KB" },
  { name:"Equipment Compliance – Feb 2026",   generated:"2026-02-20", by:"Emily Davis",  format:"PDF",  size:"2.1 MB" },
];

export default function ReportsPage() {
  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.pink})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Reports</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Generate and export enterprise inspection reports</p>
      </div>

      {/* Notice */}
      <div style={{
        padding:"14px 18px", borderRadius:12, marginBottom:22,
        background:"rgba(79,195,247,0.07)", border:"1px solid rgba(79,195,247,0.2)",
        fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:10,
      }}>
        <span style={{ fontSize:18 }}>ℹ️</span>
        <span>Reports are exported in <strong style={{ color:C.blue }}>PDF</strong> and <strong style={{ color:C.blue }}>Word (.docx)</strong> formats only. No Excel or CSV exports are available.</span>
      </div>

      {/* Report type cards */}
      <h2 style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:14 }}>Generate Report</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14, marginBottom:32 }}>
        {reportTypes.map(r=>(
          <div key={r.title} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border:`1px solid rgba(${rgbaMap[r.color]},0.22)`,
            borderRadius:16, padding:"20px",
            boxShadow:`0 0 20px rgba(${rgbaMap[r.color]},0.07)`,
            position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
              background:`linear-gradient(90deg,${r.color},transparent)` }}/>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
              <div style={{
                width:40, height:40, borderRadius:10, fontSize:20,
                background:`rgba(${rgbaMap[r.color]},0.12)`,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>{r.icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{r.title}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:3, lineHeight:1.4 }}>{r.desc}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              {r.formats.map(fmt=>(
                <button key={fmt} style={{
                  flex:1, padding:"8px", borderRadius:8, fontSize:12, cursor:"pointer",
                  fontFamily:"inherit", fontWeight:700,
                  background: fmt==="PDF"
                    ? `rgba(${rgbaMap[r.color]},0.15)`
                    : "rgba(255,255,255,0.05)",
                  border: fmt==="PDF"
                    ? `1px solid rgba(${rgbaMap[r.color]},0.35)`
                    : "1px solid rgba(255,255,255,0.1)",
                  color: fmt==="PDF" ? r.color : "#94a3b8",
                }}>⬇ {fmt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <h2 style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:14 }}>Recent Reports</h2>
      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden",
      }}>
        {recentReports.map((r,i)=>(
          <div key={i} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 20px", flexWrap:"wrap", gap:10,
            borderBottom: i < recentReports.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(124,92,252,0.06)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:36, height:36, borderRadius:8,
                background: r.format==="PDF" ? "rgba(244,114,182,0.15)" : "rgba(79,195,247,0.15)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, flexShrink:0,
              }}>{r.format==="PDF" ? "📄" : "📝"}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{r.name}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>By {r.by} · {r.generated} · {r.size}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background: r.format==="PDF" ? "rgba(244,114,182,0.12)" : "rgba(79,195,247,0.12)",
                color: r.format==="PDF" ? C.pink : C.blue,
                border:`1px solid rgba(${r.format==="PDF"?"244,114,182":"79,195,247"},0.3)`,
              }}>{r.format}</span>
              <button style={{
                padding:"6px 14px", borderRadius:8, fontSize:12, cursor:"pointer",
                fontFamily:"inherit", fontWeight:600,
                background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green,
              }}>⬇ Download</button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
