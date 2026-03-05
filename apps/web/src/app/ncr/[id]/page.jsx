// Replace the existing tab rendering section with this responsive version:

{tab==="overview" && (
  <div style={{
    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(244,114,182,0.2)",
    borderRadius:16, padding:"clamp(16px,4vw,24px)",
  }}>
    <h3 style={{ fontSize:"clamp(14px,3vw,16px)", fontWeight:700, color:"#fff", marginTop:0 }}>Non-Conformance Details</h3>
    {[
      { label:"Issue", value:ncr.issue },
      { label:"Location", value:ncr.details.location },
      { label:"Impact", value:ncr.details.impact },
      { label:"Root Cause", value:ncr.details.rootCause },
      { label:"Action Required", value:ncr.actionRequired },
    ].map(f=>(
      <div key={f.label} style={{ marginBottom:"1rem" }}>
        <div style={{ fontSize:"clamp(10px,2vw,12px)", fontWeight:700, color:C.pink, textTransform:"uppercase", marginBottom:6 }}>{f.label}</div>
        <div style={{
          fontSize:"clamp(11px,2vw,13px)", color:"#cbd5e1", padding:"10px 14px",
          background:"rgba(255,255,255,0.03)", borderRadius:8, wordBreak:"break-word"
        }}>
          {f.value}
        </div>
      </div>
    ))}
  </div>
)}

{tab==="capa" && (
  <div style={{
    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
    borderRadius:16, padding:"clamp(16px,4vw,24px)",
  }}>
    <h3 style={{ fontSize:"clamp(14px,3vw,16px)", fontWeight:700, color:"#fff", marginTop:0 }}>Corrective & Preventive Actions</h3>
    {[
      { label:"Corrective Action", value:ncr.details.correctiveAction },
      { label:"Preventive Action", value:ncr.details.preventiveAction },
      { label:"Implementation Timeline", value:ncr.details.timeline },
      { label:"Assigned To", value:ncr.details.assignedToUser },
      { label:"Notes", value:ncr.details.notes },
    ].map(f=>(
      <div key={f.label} style={{ marginBottom:"1rem" }}>
        <div style={{ fontSize:"clamp(10px,2vw,12px)", fontWeight:700, color:C.green, textTransform:"uppercase", marginBottom:6 }}>{f.label}</div>
        <div style={{
          fontSize:"clamp(11px,2vw,13px)", color:"#cbd5e1", padding:"10px 14px",
          background:"rgba(255,255,255,0.03)", borderRadius:8, whiteSpace:"pre-wrap", wordBreak:"break-word"
        }}>
          {f.value}
        </div>
      </div>
    ))}
  </div>
)}

{tab==="history" && (
  <div style={{
    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
    borderRadius:16, padding:"clamp(16px,4vw,24px)",
  }}>
    <h3 style={{ fontSize:"clamp(14px,3vw,16px)", fontWeight:700, color:"#fff", marginTop:0 }}>Activity History</h3>
    {ncr.history.map((entry, idx) => (
      <div key={idx} style={{
        display:"flex", alignItems:"flex-start", gap:"0.75rem", padding:"clamp(10px,2vw,14px)",
        borderBottom: idx < ncr.history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
      }}>
        <div style={{
          width:"8px", height:"8px", borderRadius:"50%", background:C.pink,
          boxShadow:"0 0 6px rgba(244,114,182,0.8)", flexShrink:0, marginTop:5,
        }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"clamp(11px,2vw,13px)", fontWeight:600, color:"#e2e8f0" }}>{entry.action}</div>
          <div style={{ fontSize:"clamp(10px,2vw,11px)", color:"#64748b", marginTop:2 }}>{entry.notes}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0, marginLeft:"0.5rem" }}>
          <div style={{ fontSize:"clamp(10px,2vw,11px)", color:"#64748b" }}>{entry.user}</div>
          <div style={{ fontSize:"clamp(9px,2vw,10px)", color:"#475569" }}>{entry.date}</div>
        </div>
      </div>
    ))}
  </div>
)}
