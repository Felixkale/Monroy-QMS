"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

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
    loadCertificate();
  }

  function loadCertificate() {
    const id = params.id;
    const found = allCertificates.find(c => c.id === id);
    if (found) {
      setCertificate(found);
    }
    setLoading(false);
  }

  function downloadPDF() {
    if (!certificate) return;
    
    setExporting(true);
    const element = document.getElementById("certificate-content");
    
    const html2canvas = window.html2canvas || (() => Promise.resolve(null));
    const jsPDF = window.jsPDF?.jsPDF;

    if (!jsPDF) {
      alert("PDF library not available. Using Word export instead.");
      downloadWord();
      setExporting(false);
      return;
    }

    // Create a temporary container for printing
    const printWindow = window.open("", "_blank");
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${certificate.certNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: white; color: #333; }
            .container { max-width: 900px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #667eea; font-size: 28px; }
            .header p { margin: 5px 0; font-size: 12px; color: #666; }
            .section { margin: 30px 0; }
            .section-title { font-size: 14px; font-weight: bold; color: #667eea; background: #f5f5f5; padding: 10px; margin-bottom: 15px; border-left: 4px solid #667eea; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #667eea; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 12px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; }
            .status-valid { background: #00f5c420; color: #00c851; border: 1px solid #00c851; }
            .status-expired { background: #f4728620; color: #d81b60; border: 1px solid #d81b60; }
            .status-expiring { background: #fbbf2420; color: #ff6f00; border: 1px solid #ff6f00; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
            .signature-area { margin-top: 40px; display: flex; justify-content: space-around; }
            .signature-line { text-align: center; width: 30%; }
            .signature-line p { margin: 30px 0 0; border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CERTIFICATE OF COMPLIANCE</h1>
              <p>Monroy QMS Platform - Official Certificate</p>
            </div>

            <div class="section">
              <div class="section-title">Certificate Information</div>
              <table>
                <tr>
                  <th style="width: 40%;">Field</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td><strong>Certificate Number</strong></td>
                  <td>${certificate.certNo}</td>
                </tr>
                <tr>
                  <td><strong>Certificate Type</strong></td>
                  <td>${certificate.type}</td>
                </tr>
                <tr>
                  <td><strong>Status</strong></td>
                  <td><span class="status status-${certificate.status.toLowerCase()}">${certificate.status}</span></td>
                </tr>
                <tr>
                  <td><strong>Date Issued</strong></td>
                  <td>${certificate.issued}</td>
                </tr>
                <tr>
                  <td><strong>Expiry Date</strong></td>
                  <td>${certificate.expiry}</td>
                </tr>
                <tr>
                  <td><strong>Client</strong></td>
                  <td>${certificate.client}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Equipment Information</div>
              <table>
                <tr>
                  <th style="width: 40%;">Field</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td><strong>Equipment Tag</strong></td>
                  <td>${certificate.equipmentTag}</td>
                </tr>
                <tr>
                  <td><strong>Equipment Type</strong></td>
                  <td>${certificate.equipmentType}</td>
                </tr>
                <tr>
                  <td><strong>Serial Number</strong></td>
                  <td>${certificate.serialNo}</td>
                </tr>
                <tr>
                  <td><strong>Model</strong></td>
                  <td>${certificate.model}</td>
                </tr>
                <tr>
                  <td><strong>Manufacturer</strong></td>
                  <td>${certificate.manufacturer}</td>
                </tr>
                <tr>
                  <td><strong>Year of Manufacture</strong></td>
                  <td>${certificate.yearOfManufacture}</td>
                </tr>
                <tr>
                  <td><strong>Country of Origin</strong></td>
                  <td>${certificate.countryOfOrigin}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Technical Specifications</div>
              <table>
                <tr>
                  <th style="width: 40%;">Field</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td><strong>Safe Working Load (SWL)</strong></td>
                  <td>${certificate.swl}</td>
                </tr>
                <tr>
                  <td><strong>Maximum Allowable Working Pressure (MAWP)</strong></td>
                  <td>${certificate.mawp}</td>
                </tr>
                <tr>
                  <td><strong>Inspection Date</strong></td>
                  <td>${certificate.inspectionDate}</td>
                </tr>
                <tr>
                  <td><strong>Next Inspection Date</strong></td>
                  <td>${certificate.nextInspectionDate}</td>
                </tr>
                <tr>
                  <td><strong>Test Status</strong></td>
                  <td><span class="status status-${certificate.testStatus.toLowerCase()}">${certificate.testStatus}</span></td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Legal Framework & Compliance</div>
              <p style="padding: 10px; background: #f9f9f9; border-left: 4px solid #667eea; font-size: 12px; line-height: 1.6;">
                This certificate confirms compliance with the following legal frameworks and regulations:
              </p>
              <p style="font-size: 12px; line-height: 1.8; margin: 10px 0;">
                ${certificate.legalFramework}
              </p>
            </div>

            <div class="signature-area">
              <div class="signature-line">
                <p>Inspector Name</p>
              </div>
              <div class="signature-line">
                <p>Date</p>
              </div>
              <div class="signature-line">
                <p>Monroy QMS Authority</p>
              </div>
            </div>

            <div class="footer">
              <p>Generated on ${new Date().toLocaleDateString()} | Monroy QMS Platform</p>
              <p>This is an official certificate. For verification and inquiries, contact Monroy QMS.</p>
              <p>Certificate No: ${certificate.certNo} | Validity Period: ${certificate.issued} to ${certificate.expiry}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setExporting(false);
    }, 500);
  }

  function downloadWord() {
    if (!certificate) return;

    setExporting(true);
    
    try {
      const wordContent = `
        CERTIFICATE OF COMPLIANCE

        Certificate Information
        ${'-'.repeat(80)}
        Certificate Number:          ${certificate.certNo}
        Certificate Type:            ${certificate.type}
        Status:                      ${certificate.status}
        Date Issued:                 ${certificate.issued}
        Expiry Date:                 ${certificate.expiry}
        Client:                      ${certificate.client}

        Equipment Information
        ${'-'.repeat(80)}
        Equipment Tag:               ${certificate.equipmentTag}
        Equipment Type:              ${certificate.equipmentType}
        Serial Number:               ${certificate.serialNo}
        Model:                       ${certificate.model}
        Manufacturer:                ${certificate.manufacturer}
        Year of Manufacture:         ${certificate.yearOfManufacture}
        Country of Origin:           ${certificate.countryOfOrigin}

        Technical Specifications
        ${'-'.repeat(80)}
        Safe Working Load (SWL):     ${certificate.swl}
        Max Allowable Working 
        Pressure (MAWP):             ${certificate.mawp}
        Inspection Date:             ${certificate.inspectionDate}
        Next Inspection Date:        ${certificate.nextInspectionDate}
        Test Status:                 ${certificate.testStatus}

        Legal Framework & Compliance
        ${'-'.repeat(80)}
        ${certificate.legalFramework}

        ---
        Generated: ${new Date().toLocaleDateString()}
        Monroy QMS Platform - Official Certificate
        For verification, contact Monroy QMS
        Certificate No: ${certificate.certNo}
        Validity: ${certificate.issued} to ${certificate.expiry}
      `;

      const element = document.createElement("a");
      const file = new Blob([wordContent], {type:'application/msword'});
      element.href = URL.createObjectURL(file);
      element.download = `${certificate.certNo}.doc`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setExporting(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Error downloading Word document");
      setExporting(false);
    }
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!certificate) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Certificate Not Found</h2>
          <button onClick={() => router.push("/certificates")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Certificates</button>
        </div>
      </AppLayout>
    );
  }

  const statusColor = { Valid:"#00c851", Expiring:"#ff6f00", Expired:"#d81b60" };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {certificate.certNo}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{certificate.type} · {certificate.client}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={downloadPDF} disabled={exporting} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:"#00f5c4", fontWeight:700, fontSize:12, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit",
            opacity:exporting?0.6:1,
          }}>📄 Export PDF</button>
          <button onClick={downloadWord} disabled={exporting} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)",
            color:C.blue, fontWeight:700, fontSize:12, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit",
            opacity:exporting?0.6:1,
          }}>📋 Export Word</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Status", value:certificate.status, color:statusColor[certificate.status] },
          { label:"Issued", value:certificate.issued, color:C.blue },
          { label:"Expiry", value:certificate.expiry, color:statusColor[certificate.status] },
          { label:"Test Status", value:certificate.testStatus, color:"#00c851" },
        ].map(s=>(
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"14px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div id="certificate-content" style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
        borderRadius:16, padding:"24px",
      }}>
        <div style={{ textAlign:"center", marginBottom:30, paddingBottom:20, borderBottom:"3px solid #667eea" }}>
          <h2 style={{ color:"#667eea", margin:"0 0 8px", fontSize:28 }}>CERTIFICATE OF COMPLIANCE</h2>
          <p style={{ margin:0, color:"#64748b", fontSize:12 }}>Monroy QMS Platform - Official Certificate</p>
        </div>

        {/* Certificate Information Table */}
        <div style={{ marginBottom:30 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#667eea", background:"#f5f5f5", padding:"10px", marginBottom:0, borderLeft:"4px solid #667eea" }}>
            Certificate Information
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", margin:"0" }}>
            <tbody>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, width:"40%", color:"#333" }}>Certificate Number</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.certNo}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Certificate Type</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.type}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Status</td>
                <td style={{ padding:"12px" }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:statusColor[certificate.status]+"33", color:statusColor[certificate.status],
                    border:`1px solid ${statusColor[certificate.status]}`,
                  }}>{certificate.status}</span>
                </td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Date Issued</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.issued}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Expiry Date</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.expiry}</td>
              </tr>
              <tr>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Client</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.client}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equipment Information Table */}
        <div style={{ marginBottom:30 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#667eea", background:"#f5f5f5", padding:"10px", marginBottom:0, borderLeft:"4px solid #667eea" }}>
            Equipment Information
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", margin:"0" }}>
            <tbody>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, width:"40%", color:"#333" }}>Equipment Tag</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.equipmentTag}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Equipment Type</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.equipmentType}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Serial Number</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.serialNo}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Model</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.model}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Manufacturer</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.manufacturer}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Year of Manufacture</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.yearOfManufacture}</td>
              </tr>
              <tr>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Country of Origin</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.countryOfOrigin}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Technical Specifications Table */}
        <div style={{ marginBottom:30 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#667eea", background:"#f5f5f5", padding:"10px", marginBottom:0, borderLeft:"4px solid #667eea" }}>
            Technical Specifications
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", margin:"0" }}>
            <tbody>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, width:"40%", color:"#333" }}>Safe Working Load (SWL)</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.swl}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Maximum Allowable Working Pressure (MAWP)</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.mawp}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Inspection Date</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.inspectionDate}</td>
              </tr>
              <tr style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Next Inspection Date</td>
                <td style={{ padding:"12px", color:"#666" }}>{certificate.nextInspectionDate}</td>
              </tr>
              <tr>
                <td style={{ padding:"12px", background:"#fafafa", fontWeight:600, color:"#333" }}>Test Status</td>
                <td style={{ padding:"12px" }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:"#00c85133", color:"#00c851",
                    border:"1px solid #00c851",
                  }}>{certificate.testStatus}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Framework Table */}
        <div style={{ marginBottom:30 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#667eea", background:"#f5f5f5", padding:"10px", marginBottom:0, borderLeft:"4px solid #667eea" }}>
            Legal Framework & Compliance
          </h3>
          <div style={{ padding:"16px", background:"#fafafa", borderTop:"1px solid #ddd" }}>
            <p style={{ margin:"0 0 10px", color:"#333", fontSize:12, fontWeight:600 }}>
              This certificate confirms compliance with the following legal frameworks and regulations:
            </p>
            <p style={{ margin:0, color:"#666", fontSize:12, lineHeight:"1.8" }}>
              {certificate.legalFramework}
            </p>
          </div>
        </div>

        {/* Signature Area */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginTop:40, paddingTop:20, borderTop:"1px solid #ddd"
        }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ height:"60px", marginBottom:"10px" }}></div>
            <p style={{ margin:0, borderTop:"1px solid #333", paddingTop:"8px", fontSize:11, color:"#333" }}>Inspector Signature</p>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ height:"60px", marginBottom:"10px" }}></div>
            <p style={{ margin:0, borderTop:"1px solid #333", paddingTop:"8px", fontSize:11, color:"#333" }}>Date</p>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ height:"60px", marginBottom:"10px" }}></div>
            <p style={{ margin:0, borderTop:"1px solid #333", paddingTop:"8px", fontSize:11, color:"#333" }}>Monroy QMS Authority</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop:40, textAlign:"center", paddingTop:20, borderTop:"1px solid #ddd" }}>
          <p style={{ margin:"5px 0", fontSize:11, color:"#999" }}>
            Generated on {new Date().toLocaleDateString()} | Monroy QMS Platform
          </p>
          <p style={{ margin:"5px 0", fontSize:11, color:"#999" }}>
            This is an official certificate. For verification and inquiries, contact Monroy QMS.
          </p>
          <p style={{ margin:"5px 0", fontSize:11, color:"#999" }}>
            Certificate No: {certificate.certNo} | Validity Period: {certificate.issued} to {certificate.expiry}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
