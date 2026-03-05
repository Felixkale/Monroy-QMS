"use client";
import { useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function QRCodesPage() {
  const [searchTag, setSearchTag] = useState("");
  const [qrData, setQrData] = useState(null);
  const printRef = useRef();

  const generateQR = (tag) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/equipment/${tag}`)}`;
    setQrData({ tag, url: qrUrl });
  };

  const downloadQR = () => {
    if (!qrData) return;
    const link = document.createElement("a");
    link.href = qrData.url;
    link.download = `${qrData.tag}-qr.png`;
    link.click();
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${qrData.tag}</title>
          <style>
            body { margin: 0; padding: 20px; text-align: center; font-family: Arial; }
            .qr-container { max-width: 600px; margin: 0 auto; }
            h2 { color: #333; margin: 20px 0; }
            img { max-width: 400px; margin: 20px 0; border: 2px dashed #999; padding: 20px; }
            .label { font-size: 14px; color: #666; margin-top: 10px; }
            @media print {
              body { margin: 0; padding: 0; }
              .qr-container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Equipment QR Code</h2>
            <p>${qrData.tag}</p>
            <img src="${qrData.url}" />
            <p class="label">Scan to view equipment profile</p>
          </div>
          <script>window.print(); window.close();</script>
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
        padding:"28px", maxWidth:600,
      }}>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
            Equipment Tag
          </label>
          <input
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
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
            fontFamily:"inherit", marginBottom:24,
          }}
        >
          🏷️ Generate QR Code
        </button>

        {qrData && (
          <div style={{
            background:"rgba(255,255,255,0.03)", borderRadius:16, padding:20,
            textAlign:"center",
          }}>
            <h3 style={{ color:"#fff", margin:"0 0 16px" }}>QR Code for {qrData.tag}</h3>
            <img src={qrData.url} style={{ maxWidth:"300px", marginBottom:20 }} />
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <button
                onClick={downloadQR}
                style={{
                  padding:"12px", borderRadius:10, cursor:"pointer",
                  background:`rgba(${C.green.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.15)`,
                  border:`1px solid rgba(${C.green.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.3)`,
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
                  background:`rgba(${C.blue.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.15)`,
                  border:`1px solid rgba(${C.blue.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.3)`,
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
