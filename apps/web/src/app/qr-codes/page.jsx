"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const equipment = [
  { tag:"PV-0041", type:"Pressure Vessel", client:"Acme Industrial Corp",  license:"Valid",    lastInsp:"2026-03-05", nextInsp:"2026-06-01" },
  { tag:"BL-0012", type:"Boiler",          client:"SteelWorks Ltd",        license:"Expiring", lastInsp:"2026-03-04", nextInsp:"2026-04-15" },
  { tag:"AR-0067", type:"Air Receiver",    client:"MineOps Ltd",           license:"Valid",    lastInsp:"2026-03-03", nextInsp:"2026-08-20" },
  { tag:"LE-0034", type:"Lifting Equip",   client:"Cargo Hub",             license:"Valid",    lastInsp:"2026-02-25", nextInsp:"2026-05-10" },
  { tag:"CP-0089", type:"Compressor",      client:"TechPlant Inc",         license:"Expired",  lastInsp:"2026-02-28", nextInsp:"2026-03-01" },
  { tag:"ST-0023", type:"Storage Tank",    client:"Delta Refineries",      license:"Valid",    lastInsp:"2026-02-20", nextInsp:"2026-07-30" },
];

const licenseColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

// Simple QR-like visual placeholder
function QRVisual({ tag, size=200 }) {
  const seed = tag.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const grid = 21;
  const cells = Array.from({length:grid*grid},(_,i)=>{
    const r=(seed*i*7+i*13)%17;
    // finder patterns corners
    const row=Math.floor(i/grid), col=i%grid;
    const inCorner=(row<7&&col<7)||(row<7&&col>=grid-7)||(row>=grid-7&&col<7);
    return inCorner ? true : r>8;
  });
  const cellSize=size/grid;
  return (
    <svg width={size} height={size} style={{ display:"block" }}>
      <rect width={size} height={size} fill="#fff" rx={8}/>
      {cells.map((on,i)=>{
        const row=Math.floor(i/grid), col=i%grid;
        return on ? <rect key={i} x={col*cellSize} y={row*cellSize} width={cellSize-0.5} height={cellSize-0.5} fill="#0d0d1a"/> : null;
      })}
    </svg>
  );
}

export default function GenerateQRPage() {
  const [selected,  setSelected]  = useState(null);
  const [bulk,      setBulk]      = useState([]);
  const [generated, setGenerated] = useState(false);
  const [mode,      setMode]      = useState("single"); // single | bulk

  const selectedItem = equipment.find(e=>e.tag===selected);

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <a href="/equipment" style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Equipment</a>
          <span style={{ color:"#475569" }}>›</span>
          <span style={{ color:"#e2e8f0", fontSize:13 }}>Generate QR Codes</span>
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.green})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>QR Code Generator</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Generate and print QR codes for inspected equipment</p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {["single","bulk"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            padding:"9px 20px", borderRadius:20, fontSize:13, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, textTransform:"capitalize",
            background: mode===m ? "rgba(0,245,196,0.15)" : "rgba(255,255,255,0.04)",
            border: mode===m ? `1px solid ${C.green}` : "1px solid rgba(255,255,255,0.08)",
            color: mode===m ? C.green : "#64748b",
          }}>{m==="single"?"🏷️ Single QR":"📦 Bulk Generate"}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:24, alignItems:"start" }}>

        {/* Equipment List */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
            {mode==="single" ? "Select Equipment" : "Select Equipment (multiple)"}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {equipment.map(e=>{
              const isSel = mode==="single" ? selected===e.tag : bulk.includes(e.tag);
              return (
                <div key={e.tag} onClick={()=>{
                  if(mode==="single"){ setSelected(e.tag); setGenerated(false); }
                  else setBulk(b=>b.includes(e.tag)?b.filter(t=>t!==e.tag):[...b,e.tag]);
                }} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"14px 16px", borderRadius:12, cursor:"pointer",
                  background: isSel ? "rgba(0,245,196,0.08)" : "rgba(255,255,255,0.03)",
                  border: isSel ? `1px solid rgba(0,245,196,0.35)` : "1px solid rgba(255,255,255,0.07)",
                  transition:"all 0.2s",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      background: isSel ? C.green : "rgba(255,255,255,0.06)",
                      border: isSel ? "none" : "1px solid rgba(255,255,255,0.15)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:"#0d0d1a", fontWeight:900, fontSize:13,
                    }}>{isSel?"✓":""}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{e.tag}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>{e.type} · {e.client}</div>
                    </div>
                  </div>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`rgba(${licenseColor[e.license]===C.green?"0,245,196":licenseColor[e.license]===C.yellow?"251,191,36":"244,114,182"},0.12)`,
                    color: licenseColor[e.license],
                    border:`1px solid rgba(${licenseColor[e.license]===C.green?"0,245,196":licenseColor[e.license]===C.yellow?"251,191,36":"244,114,182"},0.3)`,
                  }}>{e.license}</span>
                </div>
              );
            })}
          </div>

          {mode==="bulk" && bulk.length>0 && (
            <button onClick={()=>setGenerated(true)} style={{
              marginTop:16, width:"100%", padding:"12px",
              borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
              background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
              border:"none", color:"#0d0d1a", boxShadow:`0 0 20px rgba(0,245,196,0.3)`,
            }}>Generate {bulk.length} QR Code{bulk.length>1?"s":""}</button>
          )}
        </div>

        {/* QR Preview Panel */}
        <div style={{ minWidth:280 }}>
          {mode==="single" && selectedItem ? (
            <div style={{
              background:"linear-gradient(135deg,rgba(0,245,196,0.06),rgba(79,195,247,0.03))",
              border:"1px solid rgba(0,245,196,0.2)", borderRadius:18,
              padding:"24px", textAlign:"center",
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>
                QR Preview
              </div>
              {/* QR Code */}
              <div style={{
                display:"inline-block", padding:12,
                background:"#fff", borderRadius:12,
                boxShadow:`0 0 30px rgba(0,245,196,0.3)`,
                marginBottom:16,
              }}>
                <QRVisual tag={selectedItem.tag} size={180}/>
              </div>
              {/* Info */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:900, color:"#fff", marginBottom:4 }}>{selectedItem.tag}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{selectedItem.type}</div>
                <div style={{ fontSize:11, color:"#475569" }}>{selectedItem.client}</div>
              </div>
              {/* Status badges */}
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18, textAlign:"left" }}>
                {[
                  { label:"License Status", value:selectedItem.license, color:licenseColor[selectedItem.license] },
                  { label:"Last Inspection", value:selectedItem.lastInsp, color:C.blue },
                  { label:"Next Due", value:selectedItem.nextInsp, color:C.purple },
                ].map(r=>(
                  <div key={r.label} style={{
                    display:"flex", justifyContent:"space-between",
                    padding:"8px 12px", borderRadius:8,
                    background:"rgba(255,255,255,0.04)",
                    fontSize:12,
                  }}>
                    <span style={{ color:"#64748b" }}>{r.label}</span>
                    <span style={{ color:r.color, fontWeight:700 }}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setGenerated(true)} style={{
                  flex:1, padding:"10px", borderRadius:10, cursor:"pointer",
                  fontFamily:"inherit", fontWeight:700, fontSize:12,
                  background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
                  border:"none", color:"#0d0d1a",
                }}>⬇ Download</button>
                <button style={{
                  flex:1, padding:"10px", borderRadius:10, cursor:"pointer",
                  fontFamily:"inherit", fontWeight:700, fontSize:12,
                  background:"rgba(124,92,252,0.15)", border:`1px solid rgba(124,92,252,0.3)`,
                  color:C.purple,
                }}>🖨️ Print Label</button>
              </div>
              {generated && (
                <div style={{
                  marginTop:12, padding:"10px", borderRadius:10,
                  background:"rgba(0,245,196,0.08)", border:"1px solid rgba(0,245,196,0.2)",
                  fontSize:12, color:C.green,
                }}>✅ QR Code downloaded successfully</div>
              )}
            </div>
          ) : mode==="bulk" && generated ? (
            <div style={{
              background:"rgba(0,245,196,0.07)", border:"1px solid rgba(0,245,196,0.2)",
              borderRadius:18, padding:"24px", textAlign:"center",
            }}>
              <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:6 }}>{bulk.length} QR Codes Ready</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:20 }}>All selected equipment QR codes have been generated.</div>
              <button style={{
                width:"100%", padding:"11px", borderRadius:10, cursor:"pointer",
                fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
                border:"none", color:"#0d0d1a",
              }}>⬇ Download All as ZIP</button>
            </div>
          ) : (
            <div style={{
              background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.08)",
              borderRadius:18, padding:"40px 24px", textAlign:"center",
            }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.3 }}>🏷️</div>
              <div style={{ fontSize:13, color:"#475569" }}>Select equipment to preview QR code</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
