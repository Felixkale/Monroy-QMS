// Update the main container and make tables responsive

{activeTab==="equipment" && (
  <div style={{
    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
    borderRadius:16, padding:"clamp(16px,4vw,20px)", overflowX:"auto",
  }}>
    <h3 style={{ fontSize:"clamp(14px,3vw,16px)", fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Equipment Register</h3>
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"400px", fontSize:"clamp(10px,2vw,12px)" }}>
        <thead>
          <tr style={{ borderBottom:"2px solid rgba(79,195,247,0.2)" }}>
            <th style={{ padding:"10px 12px", textAlign:"left", color:C.blue, fontWeight:700 }}>Equipment</th>
            <th style={{ padding:"10px 12px", textAlign:"left", color:C.blue, fontWeight:700 }}>Type</th>
            <th style={{ padding:"10px 12px", textAlign:"left", color:C.blue, fontWeight:700 }}>License</th>
            <th style={{ padding:"10px 12px", textAlign:"left", color:C.blue, fontWeight:700 }}>QR</th>
          </tr>
        </thead>
        <tbody>
          {[
            { tag:"PV-0041", type:"Pressure Vessel", license:"Valid" },
            { tag:"BL-0012", type:"Boiler", license:"Expiring" },
            { tag:"AR-0067", type:"Air Receiver", license:"Valid" },
          ].map((e, idx) => (
            <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding:"10px 12px", color:"#e2e8f0" }}>{e.tag}</td>
              <td style={{ padding:"10px 12px", color:"#94a3b8" }}>{e.type}</td>
              <td style={{ padding:"10px 12px" }}>
                <span style={{
                  padding:"2px 6px", borderRadius:12, fontSize:"clamp(9px,2vw,10px)", fontWeight:700,
                  background:e.license==="Valid"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                  color:e.license==="Valid"?C.green:C.yellow, whiteSpace:"nowrap",
                }}>{e.license}</span>
              </td>
              <td style={{ padding:"10px 12px" }}>
                <button style={{
                  padding:"3px 8px", borderRadius:6, fontSize:"clamp(9px,2vw,10px)",
                  background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
                  color:C.green, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                }}>📱 Scan</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
