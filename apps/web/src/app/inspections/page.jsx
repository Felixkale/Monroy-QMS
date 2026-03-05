"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
};
const labelStyle = { fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" };
const selectStyle = { ...inputStyle, cursor:"pointer" };

export default function CreateInspectionPage() {
  const [form, setForm] = useState({
    equipment:"", client:"", inspector:"", type:"Statutory",
    date:"", scheduled:"", checklist:[], findings:"", result:"Pass",
    notes:"", files:[],
  });
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const checklistItems = [
    "Visual inspection completed",
    "Nameplate data verified",
    "Safety relief valve checked",
    "Pressure test conducted",
    "Corrosion assessment done",
    "Documentation reviewed",
    "Photos captured",
  ];

  const toggleCheck = (item) => {
    set("checklist", form.checklist.includes(item)
      ? form.checklist.filter(i=>i!==item)
      : [...form.checklist, item]
    );
  };

  if (submitted) return (
    <AppLayout>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{
          width:80, height:80, borderRadius:"50%",
          background:"rgba(0,245,196,0.15)", border:`2px solid ${C.green}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:36, marginBottom:20,
          boxShadow:`0 0 40px rgba(0,245,196,0.3)`,
        }}>✅</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>Inspection Submitted</h2>
        <p style={{ color:"#64748b", fontSize:14, marginBottom:28 }}>INS-{Date.now().toString().slice(-4)} has been created and sent for supervisor review.</p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={()=>{ setSubmitted(false); setStep(1); setForm({ equipment:"",client:"",inspector:"",type:"Statutory",date:"",scheduled:"",checklist:[],findings:"",result:"Pass",notes:"",files:[] }); }} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>+ New Inspection</button>
          <a href="/inspections" style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", textDecoration:"none", display:"inline-flex", alignItems:"center",
          }}>View All Inspections</a>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <a href="/inspections" style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Inspections</a>
          <span style={{ color:"#475569" }}>›</span>
          <span style={{ color:"#e2e8f0", fontSize:13 }}>Create Inspection</span>
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Create Inspection</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Complete all steps to submit the inspection report</p>
      </div>

      {/* Step Indicator */}
      <div style={{ display:"flex", gap:0, marginBottom:28, position:"relative" }}>
        {[
          { n:1, label:"Equipment"  },
          { n:2, label:"Checklist"  },
          { n:3, label:"Findings"   },
          { n:4, label:"Submit"     },
        ].map((s,i,arr)=>(
          <div key={s.n} style={{ display:"flex", alignItems:"center", flex: i<arr.length-1 ? 1 : "none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:14,
                background: step>s.n ? C.green : step===s.n ? `linear-gradient(135deg,${C.purple},${C.blue})` : "rgba(255,255,255,0.06)",
                color: step>s.n ? "#0d0d1a" : "#fff",
                border: step===s.n ? `2px solid ${C.purple}` : "2px solid transparent",
                boxShadow: step===s.n ? `0 0 16px rgba(124,92,252,0.5)` : "none",
              }}>{step>s.n ? "✓" : s.n}</div>
              <span style={{ fontSize:10, color: step>=s.n ? "#e2e8f0" : "#475569", fontWeight:600, whiteSpace:"nowrap" }}>{s.label}</span>
            </div>
            {i<arr.length-1 && (
              <div style={{ flex:1, height:2, margin:"0 8px", marginBottom:18,
                background: step>s.n ? C.green : "rgba(255,255,255,0.07)", borderRadius:2 }}/>
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
        padding:"28px 28px", maxWidth:720,
      }}>

        {/* Step 1 – Equipment Details */}
        {step===1 && (
          <div>
            <SectionTitle color={C.purple} title="Equipment & Inspector Details"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:18 }}>
              <Field label="Equipment Tag *">
                <input style={inputStyle} placeholder="e.g. PV-0041" value={form.equipment} onChange={e=>set("equipment",e.target.value)}/>
              </Field>
              <Field label="Client *">
                <select style={selectStyle} value={form.client} onChange={e=>set("client",e.target.value)}>
                  <option value="">Select client…</option>
                  {["Acme Industrial Corp","SteelWorks Ltd","TechPlant Inc","MineOps Ltd","Cargo Hub","Delta Refineries","SafePort Holdings"].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Inspector *">
                <select style={selectStyle} value={form.inspector} onChange={e=>set("inspector",e.target.value)}>
                  <option value="">Select inspector…</option>
                  {["John Smith","Sarah Johnson","Michael Chen","Emily Davis"].map(i=>(
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Inspection Type *">
                <select style={selectStyle} value={form.type} onChange={e=>set("type",e.target.value)}>
                  {["Statutory","UT Thickness","Visual","Hydro Test","Load Test","NDT"].map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Inspection Date *">
                <input type="date" style={inputStyle} value={form.date} onChange={e=>set("date",e.target.value)}/>
              </Field>
              <Field label="Next Inspection Due">
                <input type="date" style={inputStyle} value={form.scheduled} onChange={e=>set("scheduled",e.target.value)}/>
              </Field>
            </div>
          </div>
        )}

        {/* Step 2 – Checklist */}
        {step===2 && (
          <div>
            <SectionTitle color={C.blue} title="Inspection Checklist"/>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:18 }}>Check all items that have been completed during this inspection.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {checklistItems.map(item=>{
                const checked = form.checklist.includes(item);
                return (
                  <div key={item} onClick={()=>toggleCheck(item)} style={{
                    display:"flex", alignItems:"center", gap:14,
                    padding:"14px 16px", borderRadius:12, cursor:"pointer",
                    background: checked ? "rgba(0,245,196,0.08)" : "rgba(255,255,255,0.03)",
                    border: checked ? `1px solid rgba(0,245,196,0.3)` : "1px solid rgba(255,255,255,0.07)",
                    transition:"all 0.2s",
                  }}>
                    <div style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      background: checked ? C.green : "rgba(255,255,255,0.06)",
                      border: checked ? "none" : "1px solid rgba(255,255,255,0.15)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:"#0d0d1a", fontWeight:900, fontSize:13,
                    }}>{checked ? "✓" : ""}</div>
                    <span style={{ fontSize:13, color: checked ? "#e2e8f0" : "#94a3b8", fontWeight: checked ? 600 : 400 }}>{item}</span>
                  </div>
                );
              })}
            </div>
            <div style={{
              marginTop:16, padding:"10px 14px", borderRadius:10,
              background:"rgba(0,245,196,0.06)", border:"1px solid rgba(0,245,196,0.15)",
              fontSize:12, color:C.green,
            }}>
              {form.checklist.length} / {checklistItems.length} items completed
            </div>
          </div>
        )}

        {/* Step 3 – Findings */}
        {step===3 && (
          <div>
            <SectionTitle color={C.green} title="Findings & Result"/>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <Field label="Inspection Result *">
                <div style={{ display:"flex", gap:10 }}>
                  {["Pass","Fail","Conditional"].map(r=>(
                    <button key={r} onClick={()=>set("result",r)} style={{
                      flex:1, padding:"12px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                      fontWeight:700, fontSize:13,
                      background: form.result===r
                        ? r==="Pass" ? "rgba(0,245,196,0.2)" : r==="Fail" ? "rgba(244,114,182,0.2)" : "rgba(251,191,36,0.2)"
                        : "rgba(255,255,255,0.04)",
                      border: form.result===r
                        ? `2px solid ${r==="Pass"?C.green:r==="Fail"?C.pink:C.yellow}`
                        : "2px solid rgba(255,255,255,0.08)",
                      color: form.result===r
                        ? r==="Pass"?C.green:r==="Fail"?C.pink:C.yellow
                        : "#64748b",
                    }}>{r==="Pass"?"✅":r==="Fail"?"❌":"⚠️"} {r}</button>
                  ))}
                </div>
              </Field>
              <Field label="Findings & Observations *">
                <textarea style={{ ...inputStyle, minHeight:100, resize:"vertical" }}
                  placeholder="Describe findings, observations, measurements…"
                  value={form.findings} onChange={e=>set("findings",e.target.value)}/>
              </Field>
              <Field label="Additional Notes">
                <textarea style={{ ...inputStyle, minHeight:70, resize:"vertical" }}
                  placeholder="Recommendations, actions required…"
                  value={form.notes} onChange={e=>set("notes",e.target.value)}/>
              </Field>
              <Field label="Upload Evidence (Photos / Reports)">
                <div style={{
                  border:"2px dashed rgba(124,92,252,0.3)", borderRadius:10,
                  padding:"24px", textAlign:"center", cursor:"pointer",
                  background:"rgba(124,92,252,0.04)",
                }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                  <div style={{ fontSize:13, color:"#64748b" }}>Click to upload or drag and drop</div>
                  <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>PNG, JPG, PDF up to 20MB</div>
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* Step 4 – Review & Submit */}
        {step===4 && (
          <div>
            <SectionTitle color={C.yellow} title="Review & Submit"/>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { label:"Equipment",    value:form.equipment || "—" },
                { label:"Client",       value:form.client    || "—" },
                { label:"Inspector",    value:form.inspector || "—" },
                { label:"Type",         value:form.type },
                { label:"Date",         value:form.date      || "—" },
                { label:"Next Due",     value:form.scheduled || "—" },
                { label:"Checklist",    value:`${form.checklist.length} / ${checklistItems.length} items` },
                { label:"Result",       value:form.result },
                { label:"Findings",     value:form.findings  || "—" },
              ].map(r=>(
                <div key={r.label} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                  padding:"10px 14px", borderRadius:8,
                  background:"rgba(255,255,255,0.03)", gap:16,
                }}>
                  <span style={{ fontSize:12, color:"#64748b", minWidth:100 }}>{r.label}</span>
                  <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, textAlign:"right" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop:16, padding:"12px 16px", borderRadius:10,
              background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)",
              fontSize:12, color:C.yellow,
            }}>
              ⚠️ Once submitted, this inspection will enter the supervisor review workflow.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, gap:12 }}>
          {step>1
            ? <button onClick={()=>setStep(s=>s-1)} style={{
                padding:"11px 22px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
              }}>← Back</button>
            : <div/>
          }
          {step<4
            ? <button onClick={()=>setStep(s=>s+1)} style={{
                padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
              }}>Continue →</button>
            : <button onClick={()=>setSubmitted(true)} style={{
                padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
                border:"none", color:"#0d0d1a", boxShadow:`0 0 20px rgba(0,245,196,0.4)`,
              }}>✅ Submit Inspection</button>
          }
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ color, title }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
      <div style={{ width:4, height:22, borderRadius:2, background:color }}/>
      <span style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{title}</span>
    </div>
  );
}
