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
    legalFramework:"MIBE, Quarries Works and Machinery Act CAP 4.4:02, Factories Act 44.01",
    issued:"2025-06-01", expiry:"2026-06-01", status:"Valid", client:"Acme Industrial Corp",
  },
  {
    id:"CERT-0856", certNo:"CERT-0856", type:"ISO Certification", equipmentTag:"BL-0012", equipmentType:"Boiler",
    serialNo:"S-20012", model:"BL-2015", swl:"N/A", mawp:"16 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2015, manufacturer:"ThermTech",
    inspectionDate:"2025-09-15", nextInspectionDate:"2026-09-15", testStatus:"Pass",
    legalFramework:"MIBE, Quarries Works and Machinery Act CAP 4.4:02",
    issued:"2025-01-15", expiry:"2026-01-15", status:"Expired", client:"SteelWorks Ltd",
  },
];

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState(null);
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

  function downloadCertificate() {
    const doc = `
CERTIFICATE OF COMPLIANCE

Certificate No: ${certificate?.certNo}
Type: ${certificate?.type}
Status: ${certificate?.status}
Date Issued: ${certificate?.issued}
Expiry Date: ${certificate?.expiry}

EQUIPMENT DETAILS
================
Equipment Tag: ${certificate?.equipmentTag}
Equipment Type: ${certificate?.equipmentType}
Serial Number: ${certificate?.serialNo}
Model: ${certificate?.model}
Manufacturer: ${certificate?.manufacturer}
Year of Manufacture: ${certificate?.yearOfManufacture}
Country of Origin: ${certificate?.countryOfOrigin}

TECHNICAL SPECIFICATIONS
========================
Safe Working Load (SWL): ${certificate?.swl}
Maximum Allowable Working Pressure (MAWP): ${certificate?.mawp}

INSPECTION DETAILS
==================
Inspection Date: ${certificate?.inspectionDate}
Next Inspection Date: ${certificate?.nextInspectionDate}
Test Status: ${certificate?.testStatus}

LEGAL FRAMEWORK
===============
This certificate confirms compliance with:
${certificate?.legalFramework}

CLIENT INFORMATION
==================
Client: ${certificate?.client}

---
Generated: ${new Date().toLocaleDateString()}
This is an official certificate issued by Monroy QMS Platform
    `;
    const element = document.createElement("a");
    const file = new Blob([doc], {type:'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${certificate?.certNo}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function printCertificate() {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${certificate?.certNo}</title>
          <style>
            body { font-family: Arial; margin: 40px; color: #333; line-height: 1.8; }
            h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; text-align: center; }
            .section { margin: 20px 0; border-left: 4px solid #667eea; padding-left: 15px; }
            .section h2 { margin: 0 0 10px; font-size: 16px; color: #667eea; }
            .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .status { color: #00c851; font-weight: bold; font-size: 18px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 2px solid #eee; padding-top: 20px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>CERTIFICATE OF COMPLIANCE</h1>
          
          <div class="section">
            <h2>Certificate Information</h2>
            <div class="field">
              <span class="label">Certificate No:</span>
              <span class="value">${certificate?.certNo}</span>
            </div>
            <div class="field">
              <span class="label">Type:</span>
              <span class="value">${certificate?.type}</span>
            </div>
            <div class="field">
              <span class="label">Status:</span>
              <span class="value status">${certificate?.status}</span>
            </div>
            <div class="field">
              <span class="label">Date Issued:</span>
              <span class="value">${certificate?.issued}</span>
            </div>
            <div class="field">
              <span class="label">Expiry Date:</span>
              <span class="value">${certificate?.expiry}</span>
            </div>
          </div>

          <div class="section">
            <h2>Equipment Details</h2>
            <div class="field">
              <span class="label">Equipment Tag:</span>
              <span class="value">${certificate?.equipmentTag}</span>
            </div>
            <div class="field">
              <span class="label">Equipment Type:</span>
              <span class="value">${certificate?.equipmentType}</span>
            </div>
            <div class="field">
              <span class="label">Serial Number:</span>
              <span class="value">${certificate?.serialNo}</span>
            </div>
            <div class="field">
              <span class="label">Model:</span>
              <span class="value">${certificate?.model}</span>
            </div>
            <div class="field">
              <span class="label">Manufacturer:</span>
              <span class="value">${certificate?.manufacturer}</span>
            </div>
            <div class="field">
              <span class="label">Year of Manufacture:</span>
              <span class="value">${certificate?.yearOfManufacture}</span>
            </div>
            <div class="field">
              <span class="label">Country of Origin:</span>
              <span class="value">${certificate?.countryOfOrigin}</span>
            </div>
          </div>

          <div class="section">
            <h2>Technical Specifications</h2>
            <div class="field">
              <span class="label">Safe Working Load (SWL):</span>
              <span class="value">${certificate?.swl}</span>
            </div>
            <div class="field">
              <span class="label">Maximum Allowable Working Pressure (MAWP):</span>
              <span class="value">${certificate?.mawp}</span>
            </div>
          </div>

          <div class="section">
            <h2>Inspection Details</h2>
            <div class="field">
              <span class="label">Inspection Date:</span>
              <span class="value">${certificate?.inspectionDate}</span>
            </div>
            <div class="field">
              <span class="label">Next Inspection Date:</span>
              <span class="value">${certificate?.nextInspectionDate}</span>
            </div>
            <div class="field">
              <span class="label">Test Status:</span>
              <span class="value">${certificate?.testStatus}</span>
            </div>
          </div>

          <div class="section">
            <h2>Legal Framework</h2>
            <p>${certificate?.legalFramework}</p>
          </div>

          <div class="footer">
            <p>Generated: ${new Date().toLocaleDateString()} | Monroy QMS Platform</p>
            <p>This is an official certificate. For verification, contact Monroy QMS.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

  const statusColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

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
          <button onClick={downloadCertificate} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:"#00f5c4", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>⬇️ Download</button>
          <button onClick={printCertificate} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)",
            color:C.blue, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>🖨️ Print</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Status", value:certificate.status, color:statusColor[certificate.status] },
          { label:"Issued", value:certificate.issued, color:C.blue },
          { label:"Expiry", value:certificate.expiry, color:certificate.status==="Valid"?C.green:C.pink },
          { label:"Test Status", value:certificate.testStatus, color:C.green },
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

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:"20px",
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Equipment Information</h3>
          {[
            { label:"Equipment Tag", value:certificate.equipmentTag },
            { label:"Equipment Type", value:certificate.equipmentType },
            { label:"Serial Number", value:certificate.serialNo },
            { label:"Model", value:certificate.model },
            { label:"Manufacturer", value:certificate.manufacturer },
            { label:"Year", value:certificate.yearOfManufacture },
            { label:"Country of Origin", value:certificate.countryOfOrigin },
          ].map(f=>(
            <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
              <span style={{ color:"#64748b" }}>{f.label}</span>
              <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
            </div>
          ))}
        </div>

        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
          borderRadius:16, padding:"20px",
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Technical Specifications</h3>
          {[
            { label:"Safe Working Load (SWL)", value:certificate.swl },
            { label:"Max Allowable Working Pressure (MAWP)", value:certificate.mawp },
            { label:"Inspection Date", value:certificate.inspectionDate },
            { label:"Next Inspection", value:certificate.nextInspectionDate },
            { label:"Test Status", value:certificate.testStatus },
          ].map(f=>(
            <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
              <span style={{ color:"#64748b" }}>{f.label}</span>
              <span style={{ color:"#00f5c4", fontWeight:600 }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
        borderRadius:16, padding:"20px", marginTop:16,
      }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Legal Framework</h3>
        <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:"1.8" }}>
          {certificate.legalFramework}
        </p>
      </div>
    </AppLayout>
  );
}
