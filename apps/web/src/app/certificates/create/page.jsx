"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import AppLayout from "../../../components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

// Inline helpers (replaces missing @/lib/security and @/lib/authContext)
const sanitizeInput = (val) => String(val || "").trim().replace(/[<>]/g, "");
const validateEmail  = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone  = (v) => /^[+\d\s()-]{7,20}$/.test(v);
const validateMeasurement = (v) => /^[\d.,]+ ?[a-zA-Z]+$/.test(v);

const inputStyle = {
  width:"100%", padding:"10px 12px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:8, color:"#e2e8f0", fontSize:12,
  fontFamily:"inherit", outline:"none",
};
const labelStyle = { display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 };

export default function CreateCertificatePage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState(null);
  const [errors, setErrors]     = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    certificateNumber: `CERT-${Date.now().toString().slice(-6)}`,
    certificateType:   "Load Test Certificate",
    issueDate:         new Date().toISOString().split("T")[0],
    expiryDate:        new Date(Date.now() + 180*24*60*60*1000).toISOString().split("T")[0],
    status:            "issued",
    company:           "",
    contactPerson:     "",
    contactEmail:      "",
    contactPhone:      "",
    equipmentDescription: "",
    equipmentLocation:    "",
    identificationNumber: "",
    swl:               "",
    mawp:              "",
    equipmentStatus:   "pass",
    inspectorName:     "",
    inspectorID:       "",
    inspectorEmail:    "",
    inspectorPhone:    "",
    legalFramework:    "Mines and Quarries Act CAP 4.4:02, Factories Act 44.01, Machinery and Related Industries Safety and Health Regulations",
  });

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { router.push("/login"); return; }
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  function validateForm() {
    const e = {};
    if (!formData.company.trim())              e.company              = "Company is required";
    if (!formData.equipmentDescription.trim()) e.equipmentDescription = "Equipment description is required";
    if (!validateEmail(formData.contactEmail)) e.contactEmail         = "Invalid email format";
    if (!validateEmail(formData.inspectorEmail)) e.inspectorEmail     = "Invalid inspector email format";
    if (formData.contactPhone  && !validatePhone(formData.contactPhone))   e.contactPhone  = "Invalid phone format";
    if (formData.inspectorPhone && !validatePhone(formData.inspectorPhone)) e.inspectorPhone = "Invalid phone format";
    if (formData.swl  && !validateMeasurement(formData.swl))  e.swl  = "Invalid SWL format (e.g., 50 TON)";
    if (formData.mawp && !validateMeasurement(formData.mawp)) e.mawp = "Invalid MAWP format (e.g., 10 bar)";
    if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) e.expiryDate = "Expiry must be after issue date";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    try {
      const sanitized = {
        certificate_number:    sanitizeInput(formData.certificateNumber),
        certificate_type:      sanitizeInput(formData.certificateType),
        company:               sanitizeInput(formData.company),
        equipment_description: sanitizeInput(formData.equipmentDescription),
        equipment_location:    sanitizeInput(formData.equipmentLocation),
        contact_person:        sanitizeInput(formData.contactPerson),
        contact_email:         formData.contactEmail.toLowerCase().trim(),
        contact_phone:         sanitizeInput(formData.contactPhone),
        inspector_name:        sanitizeInput(formData.inspectorName),
        inspector_id:          sanitizeInput(formData.inspectorID),
        inspector_email:       formData.inspectorEmail.toLowerCase().trim(),
        issued_at:             new Date(formData.issueDate).toISOString(),
        valid_to:              formData.expiryDate,
        status:                sanitizeInput(formData.status),
        legal_framework:       sanitizeInput(formData.legalFramework),
        created_by:            user?.id,
      };
      const { error } = await supabase.from("certificates").insert([sanitized]);
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  }

  if (loading) return <AppLayout><div style={{ padding:40, color:"#fff" }}>Loading...</div></AppLayout>;

  if (submitted) return (
    <AppLayout>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(0,245,196,0.15)", border:`2px solid ${C.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, marginBottom:20 }}>📜</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:8 }}>Certificate Created</h2>
        <p style={{ color:"#64748b", marginBottom:24 }}><strong style={{ color:C.green }}>{formData.certificateNumber}</strong> has been issued.</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <button onClick={()=>setSubmitted(false)} style={{ padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:"none", color:"#fff" }}>+ Create Another</button>
          <a href="/certificates" style={{ padding:"11px 24px", borderRadius:12, fontWeight:700, fontSize:13, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", textDecoration:"none", display:"inline-flex", alignItems:"center" }}>View Certificates</a>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", display:"block", marginBottom:4 }}>← Certificates</a>
        <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0, background:`linear-gradient(90deg,#fff 30%,${C.green})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Create Certificate</h1>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"clamp(16px,4vw,28px)", maxWidth:760 }}>

        <Section title="Certificate Details" color={C.blue}/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Certificate Number"><input style={inputStyle} value={formData.certificateNumber} readOnly /></Field>
          <Field label="Certificate Type">
            <select style={{ ...inputStyle, cursor:"pointer" }} value={formData.certificateType} onChange={e=>set("certificateType",e.target.value)}>
              {["Load Test Certificate","Equipment Certification","ISO Certification","Compliance Certificate","Pressure Test Certificate"].map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Issue Date *"><input type="date" style={inputStyle} value={formData.issueDate} onChange={e=>set("issueDate",e.target.value)}/></Field>
          <Field label="Expiry Date *">
            <input type="date" style={{ ...inputStyle, border: errors.expiryDate?"1px solid #f472b6":inputStyle.border }} value={formData.expiryDate} onChange={e=>set("expiryDate",e.target.value)}/>
            {errors.expiryDate && <Err msg={errors.expiryDate}/>}
          </Field>
        </div>

        <Section title="Company & Contact" color={C.purple}/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Company *">
            <input style={{ ...inputStyle, border:errors.company?"1px solid #f472b6":inputStyle.border }} value={formData.company} onChange={e=>set("company",e.target.value)}/>
            {errors.company && <Err msg={errors.company}/>}
          </Field>
          <Field label="Contact Person"><input style={inputStyle} value={formData.contactPerson} onChange={e=>set("contactPerson",e.target.value)}/></Field>
          <Field label="Contact Email *">
            <input type="email" style={{ ...inputStyle, border:errors.contactEmail?"1px solid #f472b6":inputStyle.border }} value={formData.contactEmail} onChange={e=>set("contactEmail",e.target.value)}/>
            {errors.contactEmail && <Err msg={errors.contactEmail}/>}
          </Field>
          <Field label="Contact Phone">
            <input style={{ ...inputStyle, border:errors.contactPhone?"1px solid #f472b6":inputStyle.border }} value={formData.contactPhone} onChange={e=>set("contactPhone",e.target.value)}/>
            {errors.contactPhone && <Err msg={errors.contactPhone}/>}
          </Field>
        </div>

        <Section title="Equipment Details" color={C.green}/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Equipment Description *">
            <input style={{ ...inputStyle, border:errors.equipmentDescription?"1px solid #f472b6":inputStyle.border }} value={formData.equipmentDescription} onChange={e=>set("equipmentDescription",e.target.value)}/>
            {errors.equipmentDescription && <Err msg={errors.equipmentDescription}/>}
          </Field>
          <Field label="Equipment Location"><input style={inputStyle} value={formData.equipmentLocation} onChange={e=>set("equipmentLocation",e.target.value)}/></Field>
          <Field label="ID / Tag Number"><input style={inputStyle} value={formData.identificationNumber} onChange={e=>set("identificationNumber",e.target.value)}/></Field>
          <Field label="SWL (e.g. 50 TON)">
            <input style={{ ...inputStyle, border:errors.swl?"1px solid #f472b6":inputStyle.border }} value={formData.swl} onChange={e=>set("swl",e.target.value)} placeholder="50 TON"/>
            {errors.swl && <Err msg={errors.swl}/>}
          </Field>
          <Field label="MAWP (e.g. 10 bar)">
            <input style={{ ...inputStyle, border:errors.mawp?"1px solid #f472b6":inputStyle.border }} value={formData.mawp} onChange={e=>set("mawp",e.target.value)} placeholder="10 bar"/>
            {errors.mawp && <Err msg={errors.mawp}/>}
          </Field>
          <Field label="Equipment Status">
            <select style={{ ...inputStyle, cursor:"pointer" }} value={formData.equipmentStatus} onChange={e=>set("equipmentStatus",e.target.value)}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="conditional">Conditional</option>
            </select>
          </Field>
        </div>

        <Section title="Inspector Details" color={C.yellow}/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Inspector Name"><input style={inputStyle} value={formData.inspectorName} onChange={e=>set("inspectorName",e.target.value)}/></Field>
          <Field label="Inspector ID"><input style={inputStyle} value={formData.inspectorID} onChange={e=>set("inspectorID",e.target.value)}/></Field>
          <Field label="Inspector Email *">
            <input type="email" style={{ ...inputStyle, border:errors.inspectorEmail?"1px solid #f472b6":inputStyle.border }} value={formData.inspectorEmail} onChange={e=>set("inspectorEmail",e.target.value)}/>
            {errors.inspectorEmail && <Err msg={errors.inspectorEmail}/>}
          </Field>
          <Field label="Inspector Phone">
            <input style={{ ...inputStyle, border:errors.inspectorPhone?"1px solid #f472b6":inputStyle.border }} value={formData.inspectorPhone} onChange={e=>set("inspectorPhone",e.target.value)}/>
            {errors.inspectorPhone && <Err msg={errors.inspectorPhone}/>}
          </Field>
        </div>

        <Section title="Legal Framework" color={C.pink}/>
        <div style={{ marginBottom:28 }}>
          <Field label="Legal References">
            <textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={formData.legalFramework} onChange={e=>set("legalFramework",e.target.value)}/>
          </Field>
        </div>

        <button onClick={handleSubmit} style={{
          width:"100%", padding:12, borderRadius:12, cursor:"pointer",
          background:`linear-gradient(135deg,${C.green}cc,${C.blue})`,
          border:"none", color:"#0d0d1a", fontWeight:800, fontSize:14, fontFamily:"inherit",
          boxShadow:`0 0 20px rgba(0,245,196,0.3)`,
        }}>📜 Create Certificate</button>
      </div>
    </AppLayout>
  );
}

function Section({ title, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <div style={{ width:4, height:20, borderRadius:2, background:color }}/>
      <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{title}</span>
    </div>
  );
}
function Field({ label, children }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>;
}
function Err({ msg }) {
  return <span style={{ color:"#f472b6", fontSize:10, marginTop:4, display:"block" }}>❌ {msg}</span>;
}
