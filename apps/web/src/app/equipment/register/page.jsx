"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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

const nameplateSections = {
  "Pressure Vessel": [
    { key:"mawp",              label:"MAWP (bar)"                },
    { key:"shellThickness",    label:"Shell Thickness (mm)"      },
    { key:"headThickness",     label:"Head Thickness (mm)"       },
    { key:"corrosionAllowance",label:"Corrosion Allowance (mm)"  },
    { key:"jointEfficiency",   label:"Joint Efficiency"          },
    { key:"mdmt",              label:"MDMT (°C)"                 },
    { key:"reliefValve",       label:"Relief Valve Set Pressure" },
  ],
  "Boiler": [
    { key:"workingPressure",   label:"Working Pressure (bar)"    },
    { key:"steamCapacity",     label:"Steam Capacity (kg/h)"     },
    { key:"heatingSurface",    label:"Heating Surface Area (m²)" },
    { key:"fuelType",          label:"Fuel Type"                 },
  ],
  "Lifting Equipment": [
    { key:"swl",               label:"Safe Working Load (t)"     },
    { key:"proofLoad",         label:"Proof Load (t)"            },
    { key:"ropeDetails",       label:"Rope Details"              },
    { key:"hookSerial",        label:"Hook Serial Number"        },
  ],
  "Air Receiver": [
    { key:"receiverVolume",    label:"Receiver Volume (L)"           },
    { key:"reliefSetting",     label:"Relief Valve Setting (bar)"    },
    { key:"compressorCapacity",label:"Compressor Capacity (m³/min)"  },
  ],
};

export default function RegisterEquipmentPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    tag:"", serial:"", type:"Pressure Vessel", client:"", manufacturer:"",
    model:"", year:"", location:"", status:"Active",
    designCode:"", designPressure:"", testPressure:"", designTemp:"",
    material:"", capacity:"",
    mawp:"", shellThickness:"", headThickness:"", corrosionAllowance:"",
    jointEfficiency:"", mdmt:"", reliefValve:"",
    workingPressure:"", steamCapacity:"", heatingSurface:"", fuelType:"",
    swl:"", proofLoad:"", ropeDetails:"", hookSerial:"",
    receiverVolume:"", reliefSetting:"", compressorCapacity:"",
    photos:[], documents:[],
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const typeSpecificFields = nameplateSections[form.type] || [];

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedPhotos = [];
    
    try {
      for (const file of files) {
        const fileName = `${form.tag}-${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("equipment-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });
        
        if (error) {
          console.error("Upload error:", error);
          alert(`Error uploading ${file.name}: ${error.message}`);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from("equipment-photos")
          .getPublicUrl(fileName);
        
        uploadedPhotos.push({
          name: file.name,
          path: fileName,
          url: urlData.publicUrl,
        });
      }
      
      if (uploadedPhotos.length > 0) {
        set("photos", [...(form.photos || []), ...uploadedPhotos]);
        alert(`${uploadedPhotos.length} photo(s) uploaded successfully!`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading photos: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDocumentUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedDocs = [];
    
    try {
      for (const file of files) {
        const fileName = `${form.tag}-${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("equipment-documents")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });
        
        if (error) {
          console.error("Upload error:", error);
          alert(`Error uploading ${file.name}: ${error.message}`);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from("equipment-documents")
          .getPublicUrl(fileName);
        
        uploadedDocs.push({
          name: file.name,
          path: fileName,
          url: urlData.publicUrl,
        });
      }
      
      if (uploadedDocs.length > 0) {
        set("documents", [...(form.documents || []), ...uploadedDocs]);
        alert(`${uploadedDocs.length} document(s) uploaded successfully!`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading documents: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!form.tag || !form.type || !form.client) {
      alert("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const { data, error } = await supabase
        .from("equipment")
        .insert([{
          tag: form.tag,
          serial: form.serial,
          type: form.type,
          client: form.client,
          manufacturer: form.manufacturer,
          model: form.model,
          year: form.year ? parseInt(form.year) : null,
          location: form.location,
          status: form.status,
          nameplate: {
            designCode: form.designCode,
            designPressure: form.designPressure,
            testPressure: form.testPressure,
            designTemp: form.designTemp,
            material: form.material,
            capacity: form.capacity,
            mawp: form.mawp,
            shellThickness: form.shellThickness,
            headThickness: form.headThickness,
            corrosionAllowance: form.corrosionAllowance,
            jointEfficiency: form.jointEfficiency,
            mdmt: form.mdmt,
            reliefValve: form.reliefValve,
            workingPressure: form.workingPressure,
            steamCapacity: form.steamCapacity,
            heatingSurface: form.heatingSurface,
            fuelType: form.fuelType,
            swl: form.swl,
            proofLoad: form.proofLoad,
            ropeDetails: form.ropeDetails,
            hookSerial: form.hookSerial,
            receiverVolume: form.receiverVolume,
            reliefSetting: form.reliefSetting,
            compressorCapacity: form.compressorCapacity,
          },
          photos: form.photos,
          documents: form.documents,
          created_at: new Date(),
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      alert("Error registering equipment: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  if (submitted) return (
    <AppLayout>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{
          width:80, height:80, borderRadius:"50%",
          background:"rgba(0,245,196,0.15)", border:`2px solid ${C.green}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:36, marginBottom:20, boxShadow:`0 0 40px rgba(0,245,196,0.3)`,
        }}>⚙️</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>Equipment Registered</h2>
        <p style={{ color:"#64748b", fontSize:14, marginBottom:8 }}><strong style={{ color:C.green }}>{form.tag}</strong> has been added to the asset register.</p>
        <p style={{ color:"#64748b", fontSize:13, marginBottom:28 }}>A QR code has been automatically generated.</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={()=>{ setSubmitted(false); setStep(1); set("tag",""); set("serial",""); }} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff",
          }}>+ Register Another</button>
          <a href="/equipment" style={{
            padding:"11px 24px", borderRadius:12, fontWeight:700, fontSize:13,
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", textDecoration:"none", display:"inline-flex", alignItems:"center",
          }}>View Equipment Register</a>
          <a href={`/qr-codes?tag=${form.tag}`} style={{
            padding:"11px 24px", borderRadius:12, fontWeight:700, fontSize:13,
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:C.green, textDecoration:"none", display:"inline-flex", alignItems:"center",
          }}>🏷️ Generate QR Code</a>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <a href="/equipment" style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Equipment</a>
          <span style={{ color:"#475569" }}>›</span>
          <span style={{ color:"#e2e8f0", fontSize:13 }}>Register Equipment</span>
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Register Equipment</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Add new asset to the enterprise equipment register</p>
      </div>

      <div style={{ display:"flex", gap:0, marginBottom:28 }}>
        {[{n:1,label:"Identity"},{n:2,label:"Nameplate"},{n:3,label:"Review"}].map((s,i,arr)=>(
          <div key={s.n} style={{ display:"flex", alignItems:"center", flex:i<arr.length-1?1:"none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:14,
                background: step>s.n ? C.green : step===s.n ? `linear-gradient(135deg,${C.blue},${C.purple})` : "rgba(255,255,255,0.06)",
                color: step>s.n ? "#0d0d1a" : "#fff",
                border: step===s.n ? `2px solid ${C.blue}` : "2px solid transparent",
                boxShadow: step===s.n ? `0 0 16px rgba(79,195,247,0.5)` : "none",
              }}>{step>s.n?"✓":s.n}</div>
              <span style={{ fontSize:10, color:step>=s.n?"#e2e8f0":"#475569", fontWeight:600 }}>{s.label}</span>
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
        border:"1px solid rgba(79,195,247,0.2)", borderRadius:18,
        padding:"28px", maxWidth:"100%", overflowX:"auto",
      }}>

        {step===1 && (
          <div>
            <SectionTitle color={C.blue} title="Equipment Identity"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
              <Field label="Equipment Tag *">
                <input style={inputStyle} placeholder="e.g. PV-0042" value={form.tag} onChange={e=>set("tag",e.target.value)}/>
              </Field>
              <Field label="Serial Number">
                <input style={inputStyle} placeholder="e.g. S-10042" value={form.serial} onChange={e=>set("serial",e.target.value)}/>
              </Field>
              <Field label="Equipment Type *">
                <select style={selectStyle} value={form.type} onChange={e=>set("type",e.target.value)}>
                  {["Pressure Vessel","Boiler","Air Receiver","Compressor","Lifting Equipment","Pipeline","Storage Tank","Industrial Machinery"].map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Client *">
                <select style={selectStyle} value={form.client} onChange={e=>set("client",e.target.value)}>
                  <option value="">Select client…</option>
                  {["Acme Industrial Corp","SteelWorks Ltd","TechPlant Inc","MineOps Ltd","Cargo Hub","Delta Refineries","SafePort Holdings","PowerGen Africa"].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Manufacturer">
                <input style={inputStyle} placeholder="e.g. ASME Corp" value={form.manufacturer} onChange={e=>set("manufacturer",e.target.value)}/>
              </Field>
              <Field label="Model">
                <input style={inputStyle} placeholder="Model number or name" value={form.model} onChange={e=>set("model",e.target.value)}/>
              </Field>
              <Field label="Year Built">
                <input style={inputStyle} type="number" placeholder="e.g. 2020" value={form.year} onChange={e=>set("year",e.target.value)}/>
              </Field>
              <Field label="Location / Site">
                <input style={inputStyle} placeholder="e.g. Plant A – Bay 3" value={form.location} onChange={e=>set("location",e.target.value)}/>
              </Field>
              <Field label="Status">
                <select style={selectStyle} value={form.status} onChange={e=>set("status",e.target.value)}>
                  <option>Active</option>
                  <option>Decommissioned</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop:18, gridColumn:"1/-1" }}>
              <label style={labelStyle}>Equipment Photos</label>
              <label style={{
                display:"block", border:"2px dashed rgba(79,195,247,0.3)", borderRadius:10,
                padding:"24px", textAlign:"center", cursor:"pointer", transition:"all 0.25s",
                background:"rgba(79,195,247,0.04)",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(79,195,247,0.6)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(79,195,247,0.3)"}>
                <div style={{ fontSize:28, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:13, color:"#64748b" }}>Upload equipment photos</div>
                <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>PNG, JPG up to 20MB each</div>
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} disabled={uploading}/>
              </label>
              {form.photos.length > 0 && (
                <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8 }}>
                  {form.photos.map((photo,idx)=>(
                    <div key={idx} style={{ fontSize:11, color:"#94a3b8", padding:8, background:"rgba(255,255,255,0.03)", borderRadius:6, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      ✓ {photo.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step===2 && (
          <div>
            <SectionTitle color={C.green} title="Nameplate Data"/>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:18 }}>Enter general nameplate data and {form.type}-specific fields.</p>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
                General Nameplate Fields
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
                {[
                  {key:"designCode",    label:"Design Code / Standard"},
                  {key:"designPressure",label:"Design Pressure (bar)"},
                  {key:"testPressure",  label:"Test Pressure (bar)"},
                  {key:"designTemp",    label:"Design Temperature (°C)"},
                  {key:"material",      label:"Material Specification"},
                  {key:"capacity",      label:"Capacity / Volume"},
                ].map(f=>(
                  <Field key={f.key} label={f.label}>
                    <input style={inputStyle} placeholder={f.label} value={form[f.key]} onChange={e=>set(f.key,e.target.value)}/>
                  </Field>
                ))}
              </div>
            </div>
            {typeSpecificFields.length>0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
                  {form.type} Specific Fields
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
                  {typeSpecificFields.map(f=>(
                    <Field key={f.key} label={f.label}>
                      <input style={inputStyle} placeholder={f.label} value={form[f.key]} onChange={e=>set(f.key,e.target.value)}/>
                    </Field>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop:20 }}>
              <label style={labelStyle}>Attach Documents / Manuals</label>
              <label style={{
                display:"block", border:"2px dashed rgba(0,245,196,0.25)", borderRadius:10,
                padding:"24px", textAlign:"center", cursor:"pointer", transition:"all 0.25s",
                background:"rgba(0,245,196,0.03)",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(0,245,196,0.6)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(0,245,196,0.25)"}>
                <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                <div style={{ fontSize:13, color:"#64748b" }}>Upload technical drawings, manuals, certificates</div>
                <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>PDF, DOCX, DWG up to 50MB</div>
                <input type="file" multiple onChange={handleDocumentUpload} style={{ display:"none" }} disabled={uploading}/>
              </label>
              {form.documents.length > 0 && (
                <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8 }}>
                  {form.documents.map((doc,idx)=>(
                    <div key={idx} style={{ fontSize:11, color:"#94a3b8", padding:8, background:"rgba(255,255,255,0.03)", borderRadius:6, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      ✓ {doc.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step===3 && (
          <div>
            <SectionTitle color={C.yellow} title="Review & Register"/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:10 }}>
              {[
                {label:"Tag",           value:form.tag          ||"—"},
                {label:"Serial",        value:form.serial       ||"—"},
                {label:"Type",          value:form.type},
                {label:"Client",        value:form.client       ||"—"},
                {label:"Manufacturer",  value:form.manufacturer ||"—"},
                {label:"Model",         value:form.model        ||"—"},
                {label:"Year Built",    value:form.year         ||"—"},
                {label:"Location",      value:form.location     ||"—"},
                {label:"Status",        value:form.status},
                {label:"Photos",        value:`${form.photos.length} uploaded`},
                {label:"Documents",     value:`${form.documents.length} uploaded`},
              ].map(r=>(
                <div key={r.label} style={{
                  display:"flex", justifyContent:"space-between",
                  padding:"10px 14px", borderRadius:8,
                  background:"rgba(255,255,255,0.03)", gap:12,
                }}>
                  <span style={{ fontSize:12, color:"#64748b" }}>{r.label}</span>
                  <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600, textAlign:"right" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop:16, padding:"12px 16px", borderRadius:10,
              background:"rgba(0,245,196,0.07)", border:"1px solid rgba(0,245,196,0.2)",
              fontSize:12, color:C.green,
            }}>
              ✅ A QR code will be automatically generated upon registration.
            </div>
          </div>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, gap:12, flexWrap:"wrap" }}>
          {step>1
            ? <button onClick={()=>setStep(s=>s-1)} style={{
                padding:"11px 22px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
              }}>← Back</button>
            : <div/>
          }
          {step<3
            ? <button onClick={()=>setStep(s=>s+1)} style={{
                padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:`linear-gradient(135deg,${C.blue},${C.purple})`,
                border:"none", color:"#fff", boxShadow:`0 0 20px rgba(79,195,247,0.4)`,
              }}>Continue →</button>
            : <button onClick={handleSubmit} disabled={uploading || !form.tag} style={{
                padding:"11px 28px", borderRadius:12, cursor:uploading || !form.tag?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
                border:"none", color:"#0d0d1a", boxShadow:`0 0 20px rgba(0,245,196,0.4)`,
                opacity:uploading || !form.tag?0.6:1,
              }}>{uploading ? "Registering..." : "⚙️ Register Equipment"}</button>
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
