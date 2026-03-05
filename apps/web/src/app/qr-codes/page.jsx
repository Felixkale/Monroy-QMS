"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function QRCodesPage() {
  const [searchTag, setSearchTag] = useState("");
  const [qrData, setQrData] = useState(null);

  const generateQR = (tag) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://monroy-qms.app'}/equipment/${tag}`)}`;
    setQrData({ tag, url: qrUrl });
  };

  const downloadQR = () => {
    if (!qrData) return;
    const link = document.createElement("a");
    link.href = qrData.url;
    link.download = `${qrData.tag}-qr-code.png`;
    link.click();
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${qrData.tag}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              background: white; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              padding: 20px;
            }
            .print-container { 
              max-width: 800px; 
              width: 100%;
              text-align: center;
              background: white;
              padding: 40px;
              border: 2px solid #333;
              border-radius: 8px;
            }
            h1 { 
              color: #333; 
              margin-bottom: 20px; 
              font-size: 28px;
            }
            .equipment-tag {
              font-size: 18px;
              color: #666;
              margin-bottom: 30px;
              font-weight: bold;
            }
            .qr-wrapper {
              margin: 30px 0;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 8px;
              display: inline-block;
            }
            img { 
              max-width: 100%; 
              height: auto;
              border: 2px solid #ddd;
              padding: 10px;
              background: white;
            }
            .instruction { 
              font-size: 14px; 
              color: #666; 
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { background: white; padding: 0; }
              .print-container { border: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>Equipment QR Code</h1>
            <div class="equipment-tag">${qrData.tag}</div>
            <div class="qr-wrapper">
              <img src="${qrData.url}" alt="QR Code for ${qrData.tag}" />
            </div>
            <p class="instruction">Scan this QR code to view equipment profile and details</p>
            <div class="footer">
              Generated on ${new Date().toLocaleDateString()} | Monroy QMS
            </div>
          </div>
          <script>
            window.addEventListener('load', function() {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.green})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>QR Code Generator</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Generate, download, and print QR codes for equipment</p>
      </div>

      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(79,195,247,0.2)", borderRadius:18,
        padding:"28px", maxWidth:"100%",
      }}>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Equipment Tag
          </label>
          <input
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && generateQR(searchTag)}
            placeholder="e.g. PV-0041"
            style={{
              width:"100%", padding:"12px 14px",
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(124,92,252,0.25)",
              borderRadius:10, color:"#e2e8f0",
              fontSize:13, fontFamily:"inherit", outline:"none",
            }}
          />
        </div>

        <button
          onClick={() => generateQR(searchTag)}
          disabled={!searchTag}
          style={{
            width:"100%", padding:"12px",
            background: searchTag ? `linear-gradient(135deg,${C.blue},${C.purple})` : "rgba(255,255,255,0.05)",
            border:"none", borderRadius:10,
            color: searchTag ? "#fff" : "#64748b",
            fontWeight:700, fontSize:14, cursor: searchTag ? "pointer" : "not-allowed",
            fontFamily:"inherit", marginBottom:24, transition:"all 0.25s",
          }}
        >
          🏷️ Generate QR Code
        </button>

        {qrData && (
          <div style={{
            background:"rgba(255,255,255,0.03)", borderRadius:16, padding:20,
            textAlign:"center",
          }}>
            <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:18 }}>QR Code for {qrData.tag}</h3>
            <div style={{ padding:"20px", background:"rgba(255,255,255,0.02)", borderRadius:12, marginBottom:20 }}>
              <img src={qrData.url} style={{ maxWidth:"300px", margin:"0 auto", display:"block" }} alt={`QR Code for ${qrData.tag}`}/>
            </div>
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <button
                onClick={downloadQR}
                style={{
                  padding:"12px", borderRadius:10, cursor:"pointer",
                  background:`rgba(0,245,196,0.15)`,
                  border:`1px solid rgba(0,245,196,0.3)`,
                  color:C.green, fontWeight:700, fontSize:13,
                  fontFamily:"inherit",
                }}
              >
                ⬇️ Download PNG
              </button>
              <button
                onClick={printQR}
                style={{
                  padding:"12px", borderRadius:10, cursor:"pointer",
                  background:`rgba(79,195,247,0.15)`,
                  border:`1px solid rgba(79,195,247,0.3)`,
                  color:C.blue, fontWeight:700, fontSize:13,
                  fontFamily:"inherit",
                }}
              >
                🖨️ Print QR
              </button>
            </div>

            <div style={{
              marginTop:20, padding:14, borderRadius:10,
              background:"rgba(0,245,196,0.08)", border:"1px solid rgba(0,245,196,0.2)",
              fontSize:12, color:"#94a3b8",
            }}>
              ✅ Scan this QR code to view the equipment profile
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
