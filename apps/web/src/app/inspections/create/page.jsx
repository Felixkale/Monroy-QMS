"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

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
      <div style={{ display:"flex", gap:0, marginBottom:28 }}>
        {[
          { n:1, label:"Equipment" },
          { n:2, label:"Checklist" },
          { n:3, label:"Findings"  },
          { n:4, label:"Submit"    },
        ].map((s,i,arr)=>(
          <div key={s.n} style={{ display:"flex", alignItems:"center", flex:i<arr.length-1?1:"none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:14,
                background: step>s.n ? C.green : step===s.n ? `linear-gradient(135deg,${C.purple},${C.blue})` : "rgba(255,255,255,0.06)",
                color: step>s.n ? "#0d0d1a" : "#fff",
                border: step===s.n ? `2px solid ${C.purple}` : "2px solid transparent",
                boxShadow: step===s.n ? `0 0 16px rgba(124,92,252,0.5)` : "none",
              }}>{step>s.n?"✓":s.n}</div>
              <span style={{ fontSize:10, color:step>=s.n?"#e2e8f0":"#475569", fontWeight:600, whiteSpace:"nowrap" }}>{s.label}</span>
            </div>
            {i<arr.length-1 && (
              <div style={{ flex:1, height:2, margin:"0 8px", marginBottom:18,
                background:step>s.n?C.green:"rgba(255,255,255,0.07)", borderRadius:2 }}/>
            )}
          </div>
        ))}
      </div>

      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
        padding:"28px", maxWidth:720,
      }}>

        {/* Step 1 */}
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

        {/* Step 2 */}
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
                    border: checked ? "1px solid rgba(0,245,196,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    transition:"all 0.2s",
                  }}>
                    <div style={{
                      width:22, height:22, borderRadius:6, flexShrink:0,
                      background: checked ? C.green : "rgba(255,255,255,0.06)",
                      border: checked ? "none" : "1px solid rgba(2
