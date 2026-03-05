"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const allReports = [
  {
    id:"RPT-001", title:"Q1 2026 Inspection Summary", type:"Inspection", client:"Acme Industrial Corp", date:"2026-03-05",
    status:"Completed", equipment:24, inspections:18, compliance:"98%",
    content:"Comprehensive inspection report for Q1 2026 covering all registered equipment. All inspections passed with flying colors.",
    details: { totalEquipment: 24, passedInspections: 18, failedInspections: 0, pendingInspections: 6, averageCompliance: "98%" },
    fullContent: `This comprehensive inspection report covers all equipment registered under Acme Industrial Corp for Q1 2026.

Summary:
- Total Equipment Inspected: 24
- Passed Inspections: 18
- Failed Inspections: 0
- Pending Inspections: 6
- Average Compliance Rate: 98%

Key Findings:
1. All pressure vessels met ASME VIII Div 1 requirements
2. Boiler systems showed excellent steam generation efficiency
3. Air receiver units within acceptable pressure parameters
4. Lifting equipment passed load test requirements
5. Minor recommendations for preventive maintenance on 2 units

Recommendations:
- Schedule preventive maintenance for equipment ID: CP-0089
- Renew licenses for equipment ID: BL-0012 (Expiring April 15, 2026)
- Continue current inspection schedule for all other equipment

Generated on: ${new Date().toLocaleDateString()}
Report ID: RPT-001`
  },
  {
    id:"RPT-002", title:"Equipment License Expiry Report", type:"License", client:"All Clients", date:"2026-02-28",
    status:"Completed", equipment:4, inspections:0, compliance:"N/A",
    content:"Report showing equipment with expiring or expired licenses in the next 90 days.",
    details: { expiringLicenses: 4, expiredLicenses: 2, validLicenses: 180 },
    fullContent: `Equipment License Status Report - February 28, 2026

Expired Licenses (2):
1. PV-0055 (PowerGen Africa) - Expired: January 15, 2026
2. CP-0089 (TechPlant Inc) - Expired: February 10, 2026

Expiring Licenses - Next 90 Days (4):
1. BL-0012 (SteelWorks Ltd) - Expires: April 15, 2026
2. ST-0023 (Delta Refineries) - Expires: May 20, 2026
3. LE-0034 (Cargo Hub) - Expires: June 10, 2026
4. AR-0067 (MineOps Ltd) - Expires: July 5, 2026

Valid Licenses: 180

Action Required:
- Immediately renew licenses for expired equipment
- Schedule inspections for equipment expiring within 30 days
- Notify all affected clients of renewal requirements

Generated on: ${new Date().toLocaleDateString()}
Report ID: RPT-002`
  },
];

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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
    loadReport();
  }

  function loadReport() {
    const id = params.id;
    const foundReport = allReports.find(r => r.id === id);
    if (foundReport) {
      setReport(foundReport);
    }
    setLoading(false);
  }

  function downloadReport() {
    const element = document.createElement("a");
    const file = new Blob([report?.fullContent || ""], {type:'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${report?.id}-${report?.title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function printReport() {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${report?.title}</title>
          <style>
            body { font-family: Arial; margin: 40px; color: #333; line-height: 1.6; }
            h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .meta { color: #666; font-size: 12px; margin: 10px 0; }
            .content { margin-top: 20px; white-space: pre-wrap; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>${report?.title}</h1>
          <div class="meta">
            <p><strong>Report ID:</strong> ${report?.id}</p>
            <p><strong>Date:</strong> ${report?.date}</p>
            <p><strong>Status:</strong> ${report?.status}</p>
            <p><strong>Client:</strong> ${report?.client}</p>
          </div>
          <div class="content">${report?.fullContent}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!report) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Report Not Found</h2>
          <button onClick={() => router.push("/reports")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Reports</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/reports" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Reports</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {report.title}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{report.id} · {report.type} · {report.date}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={downloadReport} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:"#00f5c4", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>⬇️ Download</button>
          <button onClick={printReport} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)",
            color:C.blue, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>🖨️ Print</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Status", value:report.status, color:report.status==="Completed"?C.green:C.yellow },
          { label:"Type", value:report.type, color:C.blue },
          { label:"Client", value:report.client, color:C.purple },
          { label:"Compliance", value:report.compliance, color:report.compliance!=="N/A"?C.green:"#64748b" },
        ].map(s=>(
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"14px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
        borderRadius:16, padding:"24px",
      }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#fff", marginTop:0 }}>Report Details</h2>
        <div style={{ whiteSpace:"pre-wrap", color:"#cbd5e1", fontSize:13, lineHeight:"1.8", fontFamily:"monospace" }}>
          {report.fullContent}
        </div>
      </div>
    </AppLayout>
  );
}
