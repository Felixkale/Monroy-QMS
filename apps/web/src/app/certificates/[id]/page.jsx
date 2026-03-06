"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import AppLayout from "../../../components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const allCertificates = [
  {
    id:"CERT-0889", certNo:"CERT-0889", type:"Equipment Certification", equipmentTag:"PV-0041", equipmentType:"Pressure Vessel",
    serialNo:"S-10041", model:"PV-Standard-2020", swl:"N/A", mawp:"10 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2018, manufacturer:"ASME Corp",
    inspectionDate:"2026-03-05", nextInspectionDate:"2026-06-01", testStatus:"Pass",
    legalFramework:"Mines and Quarries Act CAP 4.4:02, Factories Act 44.01, Machinery and Related Industries Safety and Health Regulations",
    issued:"2025-06-01", expiry:"2026-06-01", status:"Valid", client:"Acme Industrial Corp",
  },
  {
    id:"CERT-0856", certNo:"CERT-0856", type:"ISO Certification", equipmentTag:"BL-0012", equipmentType:"Boiler",
    serialNo:"S-20012", model:"BL-2015", swl:"N/A", mawp:"16 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2015, manufacturer:"ThermTech",
    inspectionDate:"2025-09-15", nextInspectionDate:"2026-09-15", testStatus:"Pass",
    legalFramework:"Mines and Quarries Act CAP 4.4:02, Factories Act 44.01",
    issued:"2025-01-15", expiry:"2026-01-15", status:"Expired", client:"SteelWorks Ltd",
  },
];

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
    loadCertificate();
  }

  function loadCertificate() {
    const found = allCertificates.find(c => c.id === params.id);
    if (found) setCertificate(found);
    setLoading(false);
  }

  function downloadPDF() {
    if (!certificate) return;
    setExporting(true);
    const printWindow = window.open("", "_blank");
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${certificate.certNo}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; background: white; color: #333; line-height: 1.6; } .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; } .header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; } .header h1 { color: #667eea; font-size: 28px; margin-bottom: 5px; } .section { margin: 25px 0; } .section-title { font-size: 13px; font-weight: bold; color: white; background: #667eea; padding: 10px; margin-bottom: 15px; border-left: 4px solid #4a5cc4; } table { width: 100%; border-collapse: collapse; } th { background: #f5f5f5; color: #333; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; font-size: 12px; } td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; } tr:nth-child(even) { background: #f9f9f9; } .label { font-weight: bold; width: 40%; color: #333; } .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 11px; } .status-valid { background: #d4edda; color: #155724; } .status-expired { background: #f8d7da; color: #721c24; } .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; } .signature-area { margin-top: 40px; display: flex; justify-content: space-between; } .signature-line { text-align: center; width: 30%; } .signature-line p { border-top: 1px solid #333; padding-top: 5px; font-size: 11px; } @media print { .container { padding: 20px; } }</style></head><body><div class="container"><div class="header"><h1>CERTIFICATE OF COMPLIANCE</h1><p>Monroy QMS Platform - Official Certificate</p></div><div class="section"><div class="section-title">CERTIFICATE INFORMATION</div><table><tr><td class="label">Certificate Number</td><td>${certificate.certNo}</td></tr><tr><td class="label">Certificate Type</td><td>${certificate.type}</td></tr><tr><td class="label">Status</td><td><span class="status status-${certificate.status.toLowerCase()}">${certificate.status}</span></td></tr><tr><td class="label">Date Issued</td><td>${certificate.issued}</td></tr><tr><td class="label">Expiry Date</td><td>${certificate.expiry}</td></tr><tr><td class="label">Client</td><td>${certificate.client}</td></tr></table></div><div class="section"><div class="section-title">EQUIPMENT INFORMATION</div><table><tr><td class="label">Equipment Tag</td><td>${certificate.equipmentTag}</td></tr><tr><td class="label">Equipment Type</td><td>${certificate.equipmentType}</td></tr><tr><td class="label">Serial Number</td><td>${certificate.serialNo}</td></tr><tr><td class="label">Manufacturer</td><td>${certificate.manufacturer}</td></tr><tr><td class="label">Year of Manufacture</td><td>${certificate.yearOfManufacture}</td></tr></table></div><div class="section"><div class="section-title">TECHNICAL SPECIFICATIONS</div><table><tr><td class="label">SWL</td><td>${certificate.swl}</td></tr><tr><td class="label">MAWP</td><td>${certificate.mawp}</td></tr><tr><td class="label">Inspection Date</td><td>${certificate.inspectionDate}</td></tr><tr><td class="label">Next Inspection</td><td>${certificate.nextInspectionDate}</td></tr><tr><td class="label">Test Status</td><td>${certificate.testStatus}</td></tr></table></div><div class="section"><div class="section-title">LEGAL FRAMEWORK</div><p style="padding:12px;background:#f9f9f9;border-left:4px solid #667eea;font-size:12px;">${certificate.legalFramework}</p></div><div class="signature-area"><div class="signature-line"><div style="height:50px;"></div><p>Inspector Signature</p></div><div class="signature-line"><div style="height:50px;"></div><p>Date</p></div><div class="signature-line"><div style="height:50px;"></div><p>Authority Representative</p></div></div><div class="footer"><p>Generated: ${new Date().toLocaleDateString()} | Monroy QMS Platform</p></div></div><script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});</script></body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setExporting(false);
  }

  function downloadWord() {
    if (!certificate) return;
    setExporting(true);
    const wordContent = `CERTIFICATE OF COMPLIANCE\nMonroy QMS Platform\n\nCERTIFICATE INFORMATION\n${"=".repeat(50)}\nCertificate Number: ${certificate.certNo}\nType: ${certificate.type}\nStatus: ${certificate.status}\nIssued: ${certificate.issued}\nExpiry: ${certificate.expiry}\nClient: ${certificate.client}\n\nEQUIPMENT INFORMATION\n${"=".repeat(50)}\nTag: ${certificate.equipmentTag}\nType: ${certificate.equipmentType}\nSerial: ${certificate.serialNo}\nManufacturer: ${certificate.manufacturer}\nYear: ${certificate.yearOfManufacture}\n\nTECHNICAL SPECIFICATIONS\n${"=".repeat(50)}\nSWL: ${certificate.swl}\nMAWP: ${certificate.mawp}\nInspection Date: ${certificate.inspectionDate}\nNext Inspection: ${certificate.nextInspectionDate}\nTest Status: ${certificate.testStatus}\n\nLEGAL FRAMEWORK\n${"=".repeat(50)}\n${certificate.legalFramework}\n\nGenerated: ${new Date().toLocaleDateString()}`;
    const element = document.createElement("a");
    const file = new Blob([wordContent], {type:"application/msword"});
    element.href = URL.createObjectURL(file);
    element.download = `${certificate.certNo}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setExporting(false);
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  if (!certificate) return (
    <AppLayout>
      <div style={{ padding:"40px", textAlign:"center" }}>
        <h2 style={{ color:"#fff" }}>Certificate Not Found</h2>
        <button onClick={()=>router.push("/certificates")} style={{ marginTop:20, padding:"10px 20px", backgroundColor:"#667eea", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit" }}>Back to Certificates</button>
      </div>
    </AppLayout>
  );

  const statusColor = { Valid:"#00c851", Expiring:"#ff6f00", Expired:"#d81b60" };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"2rem" }}>
        <div style={{ minWidth:0 }}>
          <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
          <h1 style={{ fontSize:"clamp(20px,5vw,28px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>{certificate.certNo}</h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{certificate.type} · {certificate.client}</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <button onClick={downloadPDF} disabled={exporting} style={{ padding:"8px 14px", borderRadius:10, background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:"#00f5c4", fontWeight:700, fontSize:12, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit", opacity:exporting?0.6:1 }}>📄 PDF</button>
          <button onClick={downloadWord} disabled={exporting} style={{ padding:"8px 14px", borderRadius:10, background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)", color:C.blue, fontWeight:700, fontSize:12, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit", opacity:exporting?0.6:1 }}>📋 Word</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"0.75rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Status", value:certificate.status, color:statusColor[certificate.status] },
          { label:"Issued", value:certificate.issued, color:C.blue },
          { label:"Expiry", value:certificate.expiry, color:statusColor[certificate.status] },
          { label:"Test",   value:certificate.testStatus, color:"#00c851" },
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:12 }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:"clamp(12px,3vw,16px)", fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:"clamp(16px,4vw,24px)", overflowX:"auto" }}>
        <div style={{ textAlign:"center", marginBottom:20, paddingBottom:20, borderBottom:"3px solid #667eea" }}>
          <h2 style={{ color:"#667eea", margin:"0 0 8px", fontSize:"clamp(18px,5vw,28px)" }}>CERTIFICATE OF COMPLIANCE</h2>
          <p style={{ margin:0, color:"#64748b", fontSize:12 }}>Monroy QMS Platform - Official Certificate</p>
        </div>

        {[
          { title:"CERTIFICATE INFORMATION", rows:[
            { label:"Certificate Number", value:certificate.certNo },
            { label:"Certificate Type",   value:certificate.type },
            { label:"Status",             value:certificate.status },
            { label:"Date Issued",        value:certificate.issued },
            { label:"Expiry Date",        value:certificate.expiry },
            { label:"Client",             value:certificate.client },
          ]},
          { title:"EQUIPMENT INFORMATION", rows:[
            { label:"Equipment Tag",      value:certificate.equipmentTag },
            { label:"Equipment Type",     value:certificate.equipmentType },
            { label:"Serial Number",      value:certificate.serialNo },
            { label:"Model",              value:certificate.model },
            { label:"Manufacturer",       value:certificate.manufacturer },
            { label:"Year of Manufacture",value:certificate.yearOfManufacture },
            { label:"Country of Origin",  value:certificate.countryOfOrigin },
          ]},
          { title:"TECHNICAL SPECIFICATIONS", rows:[
            { label:"Safe Working Load (SWL)", value:certificate.swl },
            { label:"MAWP",                    value:certificate.mawp },
            { label:"Inspection Date",         value:certificate.inspectionDate },
            { label:"Next Inspection Date",    value:certificate.nextInspectionDate },
            { label:"Test Status",             value:certificate.testStatus },
          ]},
        ].map(section=>(
          <div key={section.title} style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:"white", background:"#667eea", padding:10, marginBottom:0, borderLeft:"4px solid #4a5cc4" }}>{section.title}</h3>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <tbody>
                {section.rows.map((row,idx)=>(
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:10, background:"#f9f9f9", fontWeight:600, width:"40%", color:"#333", fontSize:12 }}>{row.label}</td>
                    <td style={{ padding:10, color:"#555", fontSize:12 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ marginBottom:20 }}>
          <h3 style={{ fontSize:12, fontWeight:700, color:"white", background:"#667eea", padding:10, marginBottom:0, borderLeft:"4px solid #4a5cc4" }}>LEGAL FRAMEWORK & COMPLIANCE</h3>
          <div style={{ padding:12, background:"#f9f9f9", borderTop:"1px solid #eee", fontSize:12, lineHeight:1.8 }}>
            <p style={{ margin:"0 0 8px", fontWeight:600 }}>This certificate confirms compliance with:</p>
            <p style={{ margin:0, color:"#555" }}>{certificate.legalFramework}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
