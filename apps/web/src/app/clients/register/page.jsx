"use client";
import { useState } from "react";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
};
const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};
const selectStyle = { ...inputStyle, cursor:"pointer" };

export default function RegisterClientPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name:"", tradingName:"", regNumber:"", vatNumber:"",
    industry:"", website:"", status:"Active",
    street:"", city:"", province:"", postalCode:"", country:"South Africa",
    contactName:"", contactTitle:"", contactEmail:"", contactPhone:"",
    altContactName:"", altContactEmail:"", altContactPhone:"",
    portalAccess:false, portalEmail:"", portalRole:"Client",
    notes:"", contractStart:"", contractType:"Annual",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (submitted) return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
        <div style={{
          width:80, height:80, borderRadius:"50%",
          background:"rgba(0,245,196,0.15)", border:`2px solid ${C.green}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:36, marginBottom:20, boxShadow:`0 0 40px rgba(0,245,196,0.3)`,
        }}>🏢</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>Client Registered</h2>
        <p style={{ color:"#64748b", fontSize:14, marginBottom:4 }}>
          <strong style={{ color:C.green }}>{form.name || "New Client"}</strong> has been added to the system.
        </p>
        <p style={{ color:"#64748b", fontSize:13, marginBottom:28 }}>
          Client ID <strong style={{ color:C.blue }}>CLT-{Date.now().toString().slice(-3)}</strong> assigned.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={() => { setSubmitted(false); setStep(1); setForm({ name:"",tradingName:"",regNumber:"",vatNumber:"",industry:"",website:"",status:"Active",street:"",city:"",province:"",postalCode:"",country:"South Africa",contactName:"",contactTitle:"",contactEmail:"",contactPhone:"",altContactName:"",altContactEmail:"",altContactPhone:"",portalAccess:false,portalEmail:"",portalRole:"Client",notes:"",contractStart:"",contractType:"Annual" }); }} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>+ Register Another</button>
          <a href="/clients" style={{
            padding:"11px 24px", borderRadius:12, fontWeight:700, fontSize:13,
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", textDecoration:"none", display:"inline-flex", alignItems:"center",
          }}>View All Clients</a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <a href="/clients" style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Clients</a>
            <span style={{ color:"#475569" }}>›</span>
            <span style={{ color:"#e2e8f0", fontSize:13 }}>Register Client</span>
          </div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Register Client</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Add a new client organisation to the system</p>
        </div>

        <div style={{ display:"flex", gap:0, marginBottom:28 }}>
          {[
            { n:1, label:"Company"  },
            { n:2, label:"Location" },
            { n:3, label:"Contact"  },
            { n:4, label:"Portal"   },
            { n:5, label:"Review"   },
          ].map((s, i, arr) => (
            <div key={s.n} style={{ display:"flex", alignItems:"center", flex:i < arr.length - 1 ? 1 : "none" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div onClick={() => step > s.n && setStep(s.n)} style={{
                  width:36, height:36, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:14, cursor: step > s.n ? "pointer" : "default",
                  background: step > s.n ? C.green : step === s.n ? `linear-gradient(135deg,${C.purple},${C.blue})` : "rgba(255,255,255,0.06)",
                  color: step > s.n ? "#0d0d1a" : "#fff",
                  border: step === s.n ? `2px solid ${C.purple}` : "2px solid transparent",
                  boxShadow: step === s.n ? `0 0 16px rgba(124,92,252,0.5)` : "none",
                  transition:"all 0.2s",
                }}>{step > s.n ? "✓" : s.n}</div>
                <span style={{ fontSize:10, color:step >= s.n ? "#e2e8f0" : "#475569", fontWeight:600, whiteSpace:"nowrap" }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div style={{
                  flex:1, height:2, margin:"0 6px", marginBottom:18,
                  background:step > s.n ? C.green : "rgba(255,255,255,0.07)", borderRadius:2,
                }}/>
              )}
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:760,
        }}>

          {step === 1 && (
            <div>
              <SectionTitle color={C.blue} title="Company Information" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
                <Field label="Company Name *">
                  <input style={inputStyle} placeholder="e.g. Acme Industrial Corp" value={form.name} onChange={e => set("name", e.target.value)} />
                </Field>
                <Field label="Trading Name">
                  <input style={inputStyle} placeholder="If different from above" value={form.tradingName} onChange={e => set("tradingName", e.target.value)} />
                </Field>
                <Field label="Registration Number">
                  <input style={inputStyle} placeholder="e.g. 2005/123456/07" value={form.regNumber} onChange={e => set("regNumber", e.target.value)} />
                </Field>
                <Field label="VAT Number">
                  <input style={inputStyle} placeholder="e.g. 4123456789" value={form.vatNumber} onChange={e => set("vatNumber", e.target.value)} />
                </Field>
                <Field label="Industry *">
                  <select style={selectStyle} value={form.industry} onChange={e => set("industry", e.target.value)}>
                    <option value="">Select industry…</option>
                    {["Manufacturing","Mining","Oil & Gas","Energy","Steel & Metals","Technology","Logistics","Maritime","Chemical","Food & Beverage","Pharmaceutical","Construction"].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Website">
                  <input style={inputStyle} placeholder="www.company.co.za" value={form.website} onChange={e => set("website", e.target.value)} />
                </Field>
                <Field label="Contract Start Date">
                  <input type="date" style={inputStyle} value={form.contractStart} onChange={e => set("contractStart", e.target.value)} />
                </Field>
                <Field label="Contract Type">
                  <select style={selectStyle} value={form.contractType} onChange={e => set("contractType", e.target.value)}>
                    <option>Annual</option>
                    <option>Monthly</option>
                    <option>Per Inspection</option>
                    <option>Once-Off</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select style={selectStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                    <option>Active</option>
                    <option>Suspended</option>
                    <option>Pending</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionTitle color={C.purple} title="Address & Location" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
                <Field label="Street Address *">
                  <input style={inputStyle} placeholder="14 Industrial Drive" value={form.street} onChange={e => set("street", e.target.value)} />
                </Field>
                <Field label="City *">
                  <input style={inputStyle} placeholder="e.g. Johannesburg" value={form.city} onChange={e => set("city", e.target.value)} />
                </Field>
                <Field label="Province / Region">
                  <select style={selectStyle} value={form.province} onChange={e => set("province", e.target.value)}>
                    <option value="">Select province…</option>
                    {["Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape","Free State","Limpopo","Mpumalanga","North West","Northern Cape"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Postal Code">
                  <input style={inputStyle} placeholder="e.g. 1401" value={form.postalCode} onChange={e => set("postalCode", e.target.value)} />
                </Field>
                <Field label="Country">
                  <select style={selectStyle} value={form.country} onChange={e => set("country", e.target.value)}>
                    {["South Africa","Botswana","Zimbabwe","Namibia","Zambia","Mozambique","Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{
                marginTop:20, height:140, borderRadius:12,
                background:"rgba(124,92,252,0.06)", border:"1px dashed rgba(124,92,252,0.25)",
                display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8,
              }}>
                <span style={{ fontSize:28 }}>📍</span>
                <span style={{ fontSize:13, color:"#64748b" }}>Map preview will appear here</span>
                <span style={{ fontSize:11, color:"#475569" }}>Complete address fields above to pin location</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionTitle color={C.green} title="Contact Person Details" />
              <div style={{
                padding:"12px 16px", borderRadius:10, marginBottom:20,
                background:"rgba(0,245,196,0.06)", border:"1px solid rgba(0,245,196,0.15)",
                fontSize:12, color:"#94a3b8",
              }}>
                👤 Primary contact — the main person Monroy QMS will communicate with.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
                <Field label="Full Name *">
                  <input style={inputStyle} placeholder="e.g. James Wright" value={form.contactName} onChange={e => set("contactName", e.target.value)} />
                </Field>
                <Field label="Job Title">
                  <input style={inputStyle} placeholder="e.g. Engineering Manager" value={form.contactTitle} onChange={e => set("contactTitle", e.target.value)} />
                </Field>
                <Field label="Email Address *">
                  <input type="email" style={inputStyle} placeholder="james@company.co.za" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} />
                </Field>
                <Field label="Phone Number">
                  <input style={inputStyle} placeholder="+27 11 555 0101" value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} />
                </Field>
              </div>

              <SectionTitle color={C.yellow} title="Alternate Contact (Optional)" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
                <Field label="Full Name">
                  <input style={inputStyle} placeholder="Alternate contact name" value={form.altContactName} onChange={e => set("altContactName", e.target.value)} />
                </Field>
                <Field label="Email Address">
                  <input type="email" style={inputStyle} placeholder="alt@company.co.za" value={form.altContactEmail} onChange={e => set("altContactEmail", e.target.value)} />
                </Field>
                <Field label="Phone Number">
                  <input style={inputStyle} placeholder="+27 11 555 0202" value={form.altContactPhone} onChange={e => set("altContactPhone", e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <SectionTitle color={C.pink} title="Client Portal Access" />
              <div style={{
                padding:"14px 18px", borderRadius:12, marginBottom:24,
                background:"rgba(124,92,252,0.07)", border:"1px solid rgba(124,92,252,0.2)",
                fontSize:13, color:"#94a3b8",
              }}>
                🔐 Client portal access allows the client to log in and view their own inspection history, certificates, and equipment status.
              </div>

              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"16px 18px", borderRadius:12, marginBottom:20,
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
              }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Enable Portal Access</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Client will receive login credentials by email</div>
                </div>
                <div onClick={() => set("portalAccess", !form.portalAccess)} style={{
                  width:48, height:26, borderRadius:13, cursor:"pointer",
                  background: form.portalAccess ? C.green : "rgba(255,255,255,0.1)",
                  position:"relative", transition:"background 0.3s",
                  border:`1px solid rgba(${form.portalAccess ? "0,245,196" : "255,255,255"},0.3)`,
                }}>
                  <div style={{
                    position:"absolute", top:3, left: form.portalAccess ? 24 : 3,
                    width:18, height:18, borderRadius:"50%",
                    background: form.portalAccess ? "#0d0d1a" : "#64748b",
                    transition:"left 0.3s",
                  }}/>
                </div>
              </div>

              {form.portalAccess && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
                  <Field label="Portal Login Email *">
                    <input type="email" style={inputStyle} placeholder="portal@company.co.za" value={form.portalEmail} onChange={e => set("portalEmail", e.target.value)} />
                  </Field>
                  <Field label="Portal Role">
                    <select style={selectStyle} value={form.portalRole} onChange={e => set("portalRole", e.target.value)}>
                      <option>Client</option>
                      <option>Client Admin</option>
                      <option>Read Only</option>
                    </select>
                  </Field>
                </div>
              )}

              <div style={{ marginTop:24 }}>
                <Field label="Internal Notes">
                  <textarea style={{ ...inputStyle, minHeight:90, resize:"vertical" }}
                    placeholder="Any internal notes about this client…"
                    value={form.notes} onChange={e => set("notes", e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <SectionTitle color={C.yellow} title="Review & Register" />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:10, marginBottom:16 }}>
                {[
                  { label:"Company Name",     value:form.name         || "—" },
                  { label:"Registration No.", value:form.regNumber    || "—" },
                  { label:"Industry",         value:form.industry     || "—" },
                  { label:"Contract Type",    value:form.contractType        },
                  { label:"Status",           value:form.status              },
                  { label:"Address",          value:[form.street, form.city, form.province].filter(Boolean).join(", ") || "—" },
                  { label:"Country",          value:form.country             },
                  { label:"Primary Contact",  value:form.contactName  || "—" },
                  { label:"Contact Email",    value:form.contactEmail || "—" },
                  { label:"Contact Phone",    value:form.contactPhone || "—" },
                  { label:"Portal Access",    value:form.portalAccess ? `✅ Enabled (${form.portalEmail || "no email set"})` : "❌ Disabled" },
                  { label:"Contract Start",   value:form.contractStart || "—" },
                ].map(r => (
                  <div key={r.label} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    padding:"10px 14px", borderRadius:8,
                    background:"rgba(255,255,255,0.03)", gap:12,
                  }}>
                    <span style={{ fontSize:12, color:"#64748b", minWidth:120, flexShrink:0 }}>{r.label}</span>
                    <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, textAlign:"right" }}>{r.value}</span>
                  </div>
                ))}
              </div>
              {form.notes && (
                <div style={{
                  padding:"12px 16px", borderRadius:10,
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                  fontSize:12, color:"#94a3b8", marginBottom:16,
                }}>
                  <span style={{ color:"#64748b" }}>Notes: </span>{form.notes}
                </div>
              )}
              <div style={{
                padding:"12px 16px", borderRadius:10,
                background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)",
                fontSize:12, color:C.yellow,
              }}>
                ⚠️ Once registered, the client will appear in your client database and can be assigned equipment and inspections.
              </div>
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, gap:12 }}>
            {step > 1
              ? <button onClick={() => setStep(s => s - 1)} style={{
                  padding:"11px 22px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
                }}>← Back</button>
              : <div />
            }
            {step < 5
              ? <button onClick={() => setStep(s => s + 1)} style={{
                  padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                  background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                  border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
                }}>Continue →</button>
              : <button onClick={() => setSubmitted(true)} style={{
                  padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                  background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
                  border:"none", color:"#0d0d1a", boxShadow:`0 0 20px rgba(0,245,196,0.4)`,
                }}>🏢 Register Client</button>
            }
          </div>
        </div>
      </main>
    </div>
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
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
      <div style={{ width:4, height:22, borderRadius:2, background:color }} />
      <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{title}</span>
    </div>
  );
}
