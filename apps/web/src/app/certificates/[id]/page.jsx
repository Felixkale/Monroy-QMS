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

    const printWindow = window.open("", "_blank");
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${certificate.certNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; color: #333; line-height: 1.6; }
            .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #667eea; font-size: 28px; margin-bottom: 5px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 13px; font-weight: bold; color: white; background: #667eea; padding: 10px; margin-bottom: 15px; border-left: 4px solid #4a5cc4; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f5f5f5; color: #333; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .label { font-weight: bold; width: 40%; color: #333; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 11px; }
            .status-valid { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .status-expired { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
            .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { text-align: center; width: 30%; }
            .signature-line p { margin-bottom: 0; border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
            @media print { body { padding: 0; } .container { padding: 20px; } }
            @media (max-width: 768px) { 
              .container { padding: 15px; } 
              .header h1 { font-size: 20px; }
              table { font-size: 11px; }
              td, th { padding: 8px; }
              .signature-area { flex-direction: column; }
              .signature-line { width: 100%; margin-bottom: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CERTIFICATE OF COMPLIANCE</h1>
              <p>Monroy QMS Platform - Official Certificate</p>
            </div>

            <div class="section">
              <div class="section-title">CERTIFICATE INFORMATION</div>
              <table>
                <tr>
                  <td class="label">Certificate Number</td>
                  <td>${certificate.certNo}</td>
                </tr>
                <tr>
                  <td class="label">Certificate Type</td>
                  <td>${certificate.type}</td>
                </tr>
                <tr>
                  <td class="label">Status</td>
                  <td>
                    <span class="status status-${certificate.status.toLowerCase()}">
                      ${certificate.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="label">Date Issued</td>
                  <td>${certificate.issued}</td>
                </tr>
                <tr>
                  <td class="label">Expiry Date</td>
                  <td>${certificate.expiry}</td>
                </tr>
                <tr>
                  <td class="label">Client</td>
                  <td>${certificate.client}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">EQUIPMENT INFORMATION</div>
              <table>
                <tr>
                  <td class="label">Equipment Tag</td>
                  <td>${certificate.equipmentTag}</td>
                </tr>
                <tr>
                  <td class="label">Equipment Type</td>
                  <td>${certificate.equipmentType}</td>
                </tr>
                <tr>
                  <td class="label">Serial Number</td>
                  <td>${certificate.serialNo}</td>
                </tr>
                <tr>
                  <td class="label">Model</td>
                  <td>${certificate.model}</td>
                </tr>
                <tr>
                  <td class="label">Manufacturer</td>
                  <td>${certificate.manufacturer}</td>
                </tr>
                <tr>
                  <td class="label">Year of Manufacture</td>
                  <td>${certificate.yearOfManufacture}</td>
                </tr>
                <tr>
                  <td class="label">Country of Origin</td>
                  <td>${certificate.countryOfOrigin}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">TECHNICAL SPECIFICATIONS</div>
              <table>
                <tr>
                  <td class="label">Safe Working Load (SWL)</td>
                  <td>${certificate.swl}</td>
                </tr>
                <tr>
                  <td class="label">Max Allowable Working Pressure (MAWP)</td>
                  <td>${certificate.mawp}</td>
                </tr>
                <tr>
                  <td class="label">Inspection Date</td>
                  <td>${certificate.inspectionDate}</td>
                </tr>
                <tr>
                  <td class="label">Next Inspection Date</td>
                  <td>${certificate.nextInspectionDate}</td>
                </tr>
                <tr>
                  <td class="label">Test Status</td>
                  <td>
                    <span class="status status-valid">${certificate.testStatus}</span>
                  </td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">LEGAL FRAMEWORK & COMPLIANCE</div>
              <p style="padding: 12px; background: #f9f9f9; border-left: 4px solid #667eea; font-size: 12px; line-height: 1.8;">
                <strong>This certificate confirms compliance with the following legal frameworks:</strong><br><br>
                ${certificate.legalFramework}
              </p>
            </div>

            <div class="signature-area">
              <div class="signature-line">
                <div style="height: 50px;"></div>
                <p>Inspector Signature</p>
              </div>
              <div class="signature-line">
                <div style="height: 50px;"></div>
                <p>Date</p>
              </div>
              <div class="signature-line">
                <div style="height: 50px;"></div>
                <p>Authority Representative</p>
              </div>
            </div>

            <div class="footer">
              <p>Generated: ${new Date().toLocaleDateString()}</p>
              <p>Monroy QMS Platform - Official Certificate</p>
              <p>Certificate: ${certificate.certNo} | Valid: ${certificate.issued} to ${certificate.expiry}</p>
            </div>
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 500);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setExporting(false);
  }

  function downloadWord() {
    if (!certificate) return;
    setExporting(true);

    const wordContent = `
CERTIFICATE OF COMPLIANCE
Monroy QMS Platform

CERTIFICATE INFORMATION
==================================================
Certificate Number:       ${certificate.certNo}
Certificate Type:         ${certificate.type}
Status:                   ${certificate.status}
Date Issued:              ${certificate.issued}
Expiry Date:              ${certificate.expiry}
Client:                   ${certificate.client}

EQUIPMENT INFORMATION
==================================================
Equipment Tag:            ${certificate.equipmentTag}
Equipment Type:           ${certificate.equipmentType}
Serial Number:            ${certificate.serialNo}
Model:                    ${certificate.model}
Manufacturer:             ${certificate.manufacturer}
Year of Manufacture:      ${certificate.yearOfManufacture}
Country of Origin:        ${certificate.countryOfOrigin}

TECHNICAL SPECIFICATIONS
==================================================
Safe Working Load (SWL):  ${certificate.swl}
Maximum Allowable 
Working Pressure (MAWP):  ${certificate.mawp}
Inspection Date:          ${certificate.inspectionDate}
Next Inspection Date:     ${certificate.nextInspectionDate}
Test Status:              ${certificate.testStatus}

LEGAL FRAMEWORK & COMPLIANCE
==================================================
${certificate.legalFramework}

---
Generated: ${new Date().toLocaleDateString()}
Monroy QMS Platform - Official Certificate
For verification, contact Monroy QMS
    `;

    const element = document.createElement("a");
    const file = new Blob([wordContent], {type:'application/msword'});
    element.href = URL.createObjectURL(file);
    element.download = `${certificate.certNo}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setExporting(false);
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;
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
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:"1rem", marginBottom:"2rem"
      }}>
        <div style={{ minWidth:0 }}>
          <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
          <h1 style={{
            fontSize:"clamp(20px,5vw,28px)", fontWeight:900, margin:"0 0 8px", color:"#fff", wordBreak:"break-word"
          }}>
            {certificate.certNo}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>
            {certificate.type} · {certificate.client}
          </p>
        </div>
        <div style={{
          display:"flex", gap:"0.5rem", flexWrap:"wrap", justifyContent:"flex-end"
        }}>
          <button onClick={downloadPDF} disabled={exporting} style={{
            padding:"8px 14px", borderRadius:10, minWidth:"fit-content",
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:"#00f5c4", fontWeight:700, fontSize:"clamp(10px,2vw,12px)",
            cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit",
            opacity:exporting?0.6:1, whiteSpace:"nowrap",
          }}>📄 PDF</button>
          <button onClick={downloadWord} disabled={exporting} style={{
            padding:"8px 14px", borderRadius:10, minWidth:"fit-content",
            background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)",
            color:C.blue, fontWeight:700, fontSize:"clamp(10px,2vw,12px)",
            cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit",
            opacity:exporting?0.6:1, whiteSpace:"nowrap",
          }}>📋 Word</button>
        </div>
      </div>

      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"0.75rem", marginBottom:"1.5rem"
      }}>
        {[
          { label:"Status", value:certificate.status, color:statusColor[certificate.status] },
          { label:"Issued", value:certificate.issued, color:C.blue },
          { label:"Expiry", value:certificate.expiry, color:statusColor[certificate.status] },
          { label:"Test", value:certificate.testStatus, color:"#00c851" },
        ].map(s=>(
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"12px",
          }}>
            <div style={{ fontSize:"10px", color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{
              fontSize:"clamp(12px,3vw,16px)", fontWeight:700, color:s.color, wordBreak:"break-word"
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div id="certificate-content" style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
        borderRadius:16, padding:"clamp(16px,4vw,24px)", overflowX:"auto",
      }}>
        <div style={{ textAlign:"center", marginBottom:20, paddingBottom:20, borderBottom:"3px solid #667eea" }}>
          <h2 style={{ color:"#667eea", margin:"0 0 8px", fontSize:"clamp(18px,5vw,28px)" }}>CERTIFICATE OF COMPLIANCE</h2>
          <p style={{ margin:0, color:"#64748b", fontSize:12 }}>Monroy QMS Platform - Official Certificate</p>
        </div>

        {/* Certificate Information */}
        <div style={{ marginBottom:20 }}>
          <h3 style={{
            fontSize:"12px", fontWeight:700, color:"white", background:"#667eea",
            padding:"10px", marginBottom:0, borderLeft:"4px solid #4a5cc4"
          }}>
            CERTIFICATE INFORMATION
          </h3>
          <table style={{
            width:"100%", borderCollapse:"collapse", margin:0
          }}>
            <tbody>
              {[
                { label:"Certificate Number", value:certificate.certNo },
                { label:"Certificate Type", value:certificate.type },
                { label:"Status", value:certificate.status },
                { label:"Date Issued", value:certificate.issued },
                { label:"Expiry Date", value:certificate.expiry },
                { label:"Client", value:certificate.client },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                  <td style={{
                    padding:"10px", background:"#f9f9f9", fontWeight:600, width:"40%", color:"#333", fontSize:"12px"
                  }}>{row.label}</td>
                  <td style={{ padding:"10px", color:"#555", fontSize:"12px" }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Equipment Information */}
        <div style={{ marginBottom:20 }}>
          <h3 style={{
            fontSize:"12px", fontWeight:700, color:"white", background:"#667eea",
            padding:"10px", marginBottom:0, borderLeft:"4px solid #4a5cc4"
          }}>
            EQUIPMENT INFORMATION
          </h3>
          <table style={{
            width:"100%", borderCollapse:"collapse", margin:0
          }}>
            <tbody>
              {[
                { label:"Equipment Tag", value:certificate.equipmentTag },
                { label:"Equipment Type", value:certificate.equipmentType },
                { label:"Serial Number", value:certificate.serialNo },
                { label:"Model", value:certificate.model },
                { label:"Manufacturer", value:certificate.manufacturer },
                { label:"Year of Manufacture", value:certificate.yearOfManufacture },
                { label:"Country of Origin", value:certificate.countryOfOrigin },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                  <td style={{
                    padding:"10px", background:"#f9f9f9", fontWeight:600, width:"40%", color:"#333", fontSize:"12px"
                  }}>{row.label}</td>
                  <td style={{ padding:"10px", color:"#555", fontSize:"12px" }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Technical Specifications */}
        <div style={{ marginBottom:20 }}>
          <h3 style={{
            fontSize:"12px", fontWeight:700, color:"white", background:"#667eea",
            padding:"10px", marginBottom:0, borderLeft:"4px solid #4a5cc4"
          }}>
            TECHNICAL SPECIFICATIONS
          </h3>
          <table style={{
            width:"100%", borderCollapse:"collapse", margin:0
          }}>
            <tbody>
              {[
                { label:"Safe Working Load (SWL)", value:certificate.swl },
                { label:"Max Allowable Working Pressure (MAWP)", value:certificate.mawp },
                { label:"Inspection Date", value:certificate.inspectionDate },
                { label:"Next Inspection Date", value:certificate.nextInspectionDate },
                { label:"Test Status", value:certificate.testStatus },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                  <td style={{
                    padding:"10px", background:"#f9f9f9", fontWeight:600, width:"40%", color:"#333", fontSize:"12px"
                  }}>{row.label}</td>
                  <td style={{ padding:"10px", color:"#555", fontSize:"12px" }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legal Framework */}
        <div style={{ marginBottom:20 }}>
          <h3 style={{
            fontSize:"12px", fontWeight:700, color:"white", background:"#667eea",
            padding:"10px", marginBottom:0, borderLeft:"4px solid #4a5cc4"
          }}>
            LEGAL FRAMEWORK & COMPLIANCE
          </h3>
          <div style={{
            padding:"12px", background:"#f9f9f9", borderTop:"1px solid #eee", fontSize:"12px", lineHeight:1.8
          }}>
            <p style={{ margin:"0 0 8px", fontWeight:600 }}>
              This certificate confirms compliance with:
            </p>
            <p style={{ margin:0, color:"#555" }}>
              {certificate.legalFramework}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          h1 { font-size: 18px !important; }
          button { font-size: 10px !important; padding: 6px 10px !important; }
          table { font-size: 11px !important; }
          td, th { padding: 8px !important; }
        }
      `}</style>
    </AppLayout>
  );
}
