// src/app/clients/register/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { registerClient } from "@/services/clients";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const IS = { width:"100%", padding:"11px 14px", background:"rgba(18,30,50,0.70)", border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color .2s" };
const LS = { display:"block", fontSize:10, fontWeight:700, color:T.textDim, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" };

const BOTSWANA_CITIES = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Tsabong","Shakawe","Serowe","Molepolole","Kanye",
  "Mahalapye","Palapye","Mochudi","Ramotswa","Mogoditshane","Tlokweng","Gabane",
  "Letlhakane","Bobonong","Tutume","Tonota","Tati Siding","Mmadinare",
  "Morupule Colliery","Sua Pan (Botash)","Damtshaa Mine","Letlhakane Mine",
  "Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)","Morupule Power Station",
  "Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];

const INDUSTRIES = [
  "Mining","Construction","Oil & Gas","Manufacturing","Energy & Utilities",
  "Logistics & Transport","Agriculture","Food & Beverage","Retail","Healthcare",
  "Finance & Banking","Government","Education","Telecommunications","Other",
];

function CityPicker({ value, onChange }) {
  const [manual, setManual] = useState(value && !BOTSWANA_CITIES.includes(value));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <select style={{ ...IS, cursor:"pointer" }}
        value={manual ? "__manual__" : (value || "")}
        onChange={e => { if(e.target.value==="__manual__"){setManual(true);onChange("");}else{setManual(false);onChange(e.target.value);} }}>
        <option value="">— Select city / town —</option>
        {BOTSWANA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__manual__">✏ Type manually…</option>
      </select>
      {manual && (
        <input style={{ ...IS, borderColor:"rgba(34,211,238,0.35)" }} type="text" value={value}
          onChange={e => onChange(e.target.value)} placeholder="Enter city / town name" autoFocus/>
      )}
    </div>
  );
}

export default function RegisterClientPage() {
  const router = useRouter();
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    company_name:"", industry:"",
    contact_person:"", contact_email:"", contact_phone:"",
    address:"", city:"", country:"Botswana", status:"active",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.company_name.trim()) { setError("Company name is required."); return; }
    setSaving(true);
    try {
      const payload = {
        company_name:   form.company_name.trim(),
        industry:       form.industry?.trim() || null,
        contact_person: form.contact_person?.trim() || null,
        contact_email:  form.contact_email?.trim() || null, // optional
        contact_phone:  form.contact_phone?.trim() || null,
        address:        form.address?.trim() || null,
        city:           form.city?.trim() || null,
        country:        "Botswana",
        status:         form.status || "active",
      };
      const { error: saveError } = await registerClient(payload);
      if (saveError) throw saveError;
      setSuccess(true);
      setTimeout(() => router.push("/clients"), 1500);
    } catch(err) {
      setError(typeof err === "string" ? err : err?.message || "Failed to register client.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Register Client">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        input:focus,select:focus{border-color:${T.accent}!important;outline:none}
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <p style={{ color:T.textDim, fontSize:13, margin:0 }}>Add a new client organisation to the system</p>
        <a href="/clients" style={{ padding:"8px 14px", borderRadius:9, textDecoration:"none", background:T.card, border:`1px solid ${T.border}`, color:T.textMid, fontSize:13, fontWeight:600 }}>← Back to Clients</a>
      </div>

      {success && <div style={{ padding:"12px 16px", borderRadius:10, background:T.greenDim, border:`1px solid ${T.greenBrd}`, color:T.green, fontSize:13, fontWeight:700, marginBottom:16 }}>✓ Client registered successfully! Company code was generated automatically.</div>}
      {error   && <div style={{ padding:"12px 16px", borderRadius:10, background:T.redDim,   border:`1px solid ${T.redBrd}`,   color:T.red,   fontSize:13, marginBottom:16 }}>⚠ {error}</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))", gap:18 }}>

        {/* Company Details */}
        <div style={{ background:T.panel, border:`1px solid ${T.purpleBrd}`, borderRadius:16, padding:24 }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.purple, marginBottom:18 }}>🏢 Company Details</div>
          <div style={{ display:"grid", gap:14 }}>
            <div>
              <label style={LS}>Company Name *</label>
              <input style={IS} value={form.company_name} onChange={e=>set("company_name",e.target.value)} placeholder="e.g. Kgalagadi Mining (Pty) Ltd"/>
            </div>
            <div>
              <label style={LS}>Company Code</label>
              <input style={{ ...IS, opacity:0.5, cursor:"not-allowed" }} value="Auto generated by system" readOnly/>
            </div>
            <div>
              <label style={LS}>Industry</label>
              <select style={{ ...IS, cursor:"pointer" }} value={form.industry} onChange={e=>set("industry",e.target.value)}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Status</label>
              <select style={{ ...IS, cursor:"pointer" }} value={form.status} onChange={e=>set("status",e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={LS}>Physical Address</label>
              <input style={IS} value={form.address} onChange={e=>set("address",e.target.value)} placeholder="e.g. Plot 1234, Tlokweng Road"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={LS}>City / Town</label>
                <CityPicker value={form.city} onChange={v=>set("city",v)}/>
              </div>
              <div>
                <label style={LS}>Country</label>
                <input style={{ ...IS, opacity:0.5 }} value="Botswana" readOnly/>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div style={{ background:T.panel, border:`1px solid ${T.accentBrd}`, borderRadius:16, padding:24 }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.accent, marginBottom:18 }}>👤 Contact Details</div>
          <div style={{ display:"grid", gap:14 }}>
            <div>
              <label style={LS}>Contact Person</label>
              <input style={IS} value={form.contact_person} onChange={e=>set("contact_person",e.target.value)} placeholder="Full name"/>
            </div>
            <div>
              <label style={LS}>Contact Email <span style={{ color:T.textDim, fontWeight:400, textTransform:"none" }}>(optional)</span></label>
              <input style={IS} type="email" value={form.contact_email} onChange={e=>set("contact_email",e.target.value)} placeholder="email@company.co.bw"/>
            </div>
            <div>
              <label style={LS}>Contact Phone</label>
              <input style={IS} value={form.contact_phone} onChange={e=>set("contact_phone",e.target.value)} placeholder="+267 3900 000"/>
            </div>
          </div>

          {/* Preview */}
          {form.company_name && (
            <div style={{ marginTop:20, padding:14, background:T.card, border:`1px solid ${T.border}`, borderRadius:12 }}>
              <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Preview</div>
              <div style={{ fontSize:15, fontWeight:800, color:T.text, marginBottom:4 }}>{form.company_name}</div>
              <div style={{ fontSize:11, color:T.textDim, marginBottom:4 }}>Code will be auto generated</div>
              {form.industry      && <div style={{ fontSize:12, color:T.blue,    marginBottom:3 }}>🏭 {form.industry}</div>}
              {form.contact_person&& <div style={{ fontSize:12, color:T.textMid, marginBottom:3 }}>👤 {form.contact_person}</div>}
              {form.contact_email && <div style={{ fontSize:12, color:T.textMid, marginBottom:3 }}>📧 {form.contact_email}</div>}
              {form.contact_phone && <div style={{ fontSize:12, color:T.textMid, marginBottom:3 }}>📞 {form.contact_phone}</div>}
              <div style={{ fontSize:12, color:T.textMid }}>📍 {[form.address, form.city, "Botswana"].filter(Boolean).join(", ")}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:20, justifyContent:"flex-end" }}>
        <a href="/clients" style={{ padding:"12px 24px", borderRadius:11, textDecoration:"none", background:T.card, border:`1px solid ${T.border}`, color:T.textMid, fontSize:13, fontWeight:600 }}>Cancel</a>
        <button type="button" onClick={handleSubmit} disabled={saving||success}
          style={{ padding:"12px 32px", borderRadius:11, cursor:saving?"not-allowed":"pointer", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#0891b2)", border:"none", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontSize:14, fontWeight:900, fontFamily:"inherit", opacity:saving?0.7:1 }}>
          {saving ? "Saving…" : "✅ Register Client"}
        </button>
      </div>
    </AppLayout>
  );
}
