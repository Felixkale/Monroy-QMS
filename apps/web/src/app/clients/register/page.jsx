"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { registerClient } from "@/services/clients";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const inputStyle = {
  width:"100%", padding:"11px 14px", boxSizing:"border-box",
  background:"#1a1f2e", border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
  transition:"border-color 0.2s", appearance:"none", WebkitAppearance:"none",
};

const labelStyle = {
  display:"block", fontSize:12, fontWeight:600,
  color:"#94a3b8", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em",
};

const BOTSWANA_CITIES = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Tsabong","Shakawe","Serowe","Molepolole","Kanye",
  "Mahalapye","Palapye","Mochudi","Ramotswa","Mogoditshane","Tlokweng","Gabane",
  "Letlhakane","Bobonong","Tutume","Tonota","Tati Siding","Mmadinare","Sefhare",
  "Mmashoro","Machaneng","Lerala","Maunatlala","Artesia","Dibete","Palla Road",
  "Moshupa","Thamaga","Kopong","Otse","Mogobane","Ramatlabama","Pitsane","Goodhope",
  "Mabule","Moshaneng","Phitshane Molopo","Metlojane","Barolong","Mmathethe",
  "Molapowabojang","Sekoma","Werda","Khakhea","Pilane","Bokaa","Mmathubudukwane",
  "Sikwane","Oodi","Modipane","Boatlaname","Rasesa","Malolwane","Khumaga",
  "Letlhakeng","Takatokwane","Dutlwe","Shoshong","Paje","Mookane","Mosolotshane",
  "Ramokgonami","Tamasane","Gweta","Nata","Dukwi","Nkange","Tobane","Tsetsebjwe",
  "Sefophe","Mathangwane","Chadibe","Mosetse","Matshelagabedi","Tsamaya","Goshwe",
  "Masunga","Gulumani","Matsinde","Zwenshambe","Mapoka","Siviya","Ramokgwebana",
  "Kazungula","Kavimba","Pandamatenga","Kachikau","Satau","Muchenje","Sehithwa",
  "Nokaneng","Gumare","Etsha 6","Etsha 13","Seronga","Beetsha","Tsau","Kareng",
  "Toteng","Bodibeng","Shorobe","Khwai","Sankoyo","Hukuntsi","Tshane","Lehututu",
  "Kang","Charleshill","Bere","Ncojane","Hunhukwe","Kokotsha","Zutshwa","Struizendam",
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
  const [manual, setManual] = useState(
    value && !BOTSWANA_CITIES.includes(value)
  );

  const handleSelect = (e) => {
    if (e.target.value === "__manual__") {
      setManual(true);
      onChange("");
    } else {
      setManual(false);
      onChange(e.target.value);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ position:"relative" }}>
        <select
          style={inputStyle}
          value={manual ? "__manual__" : (value || "Gaborone")}
          onChange={handleSelect}
        >
          {BOTSWANA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__manual__">✏️ Type manually…</option>
        </select>
        <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#64748b", pointerEvents:"none" }}>▾</span>
      </div>
      {manual && (
        <input
          style={{ ...inputStyle, appearance:"auto", WebkitAppearance:"auto", borderColor:"rgba(0,245,196,0.4)" }}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Enter city / town name"
          autoFocus
          onFocus={e => (e.target.style.borderColor = "#00f5c4")}
          onBlur={e => (e.target.style.borderColor = "rgba(0,245,196,0.4)")}
        />
      )}
    </div>
  );
}

export default function RegisterClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    company_name:"",
    industry:"",
    contact_person:"",
    contact_email:"",
    contact_phone:"",
    address:"",
    city:"Gaborone",
    country:"Botswana",
    status:"active",
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    try {
      setError(null);

      if (!form.company_name.trim()) {
        setError("Company name is required.");
        return;
      }

      if (!form.contact_email.trim()) {
        setError("Contact email is required.");
        return;
      }

      setSaving(true);

      const payload = {
        company_name: form.company_name.trim(),
        industry: form.industry?.trim() || null,
        contact_person: form.contact_person?.trim() || null,
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        country: "Botswana",
        status: form.status || "active",
      };

      const { data, error: saveError } = await registerClient(payload);

      if (saveError) {
        throw saveError;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/clients");
      }, 1500);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err?.message || "Failed to register client."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Register Client">
      <style>{`
        select option { background: #1a1f2e !important; color: #e2e8f0 !important; }
        select:focus { border-color: #7c5cfc !important; outline: none; }
        select:hover { border-color: rgba(124,92,252,0.5) !important; }
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>Add a new client organisation to the system</p>
        <a
          href="/clients"
          style={{
            padding:"8px 16px",
            borderRadius:10,
            textDecoration:"none",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8",
            fontSize:13,
            fontWeight:600,
          }}
        >
          ← Back to Clients
        </a>
      </div>

      {success && (
        <div style={{ background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", borderRadius:12, padding:"14px 18px", marginBottom:20, color:C.green, fontSize:14, fontWeight:600 }}>
          ✅ Client registered successfully! Company code was generated automatically.
        </div>
      )}

      {error && (
        <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(400px,1fr))", gap:20 }}>
        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"24px" }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 20px" }}>🏢 Company Details</h3>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input
                style={inputStyle}
                value={form.company_name}
                onChange={e => set("company_name", e.target.value)}
                placeholder="e.g. Kgalagadi Mining (Pty) Ltd"
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = "rgba(124,92,252,0.25)"}
              />
            </div>

            <div>
              <label style={labelStyle}>Company Code</label>
              <input
                style={{ ...inputStyle, opacity:0.65, cursor:"not-allowed" }}
                value="Auto generated by system"
                readOnly
              />
            </div>

            <div>
              <label style={labelStyle}>Industry</label>
              <div style={{ position:"relative" }}>
                <select
                  style={inputStyle}
                  value={form.industry}
                  onChange={e => set("industry", e.target.value)}
                >
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#64748b", pointerEvents:"none" }}>▾</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ position:"relative" }}>
                <select
                  style={inputStyle}
                  value={form.status}
                  onChange={e => set("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#64748b", pointerEvents:"none" }}>▾</span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Physical Address</label>
              <input
                style={inputStyle}
                value={form.address}
                onChange={e => set("address", e.target.value)}
                placeholder="e.g. Plot 1234, Tlokweng Road"
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = "rgba(124,92,252,0.25)"}
              />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={labelStyle}>City / Town</label>
                <CityPicker value={form.city} onChange={v => set("city", v)} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={{ ...inputStyle, opacity:0.6 }} value="Botswana" readOnly />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:"24px" }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 20px" }}>👤 Contact Details</h3>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                style={inputStyle}
                value={form.contact_person}
                onChange={e => set("contact_person", e.target.value)}
                placeholder="Full name"
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = "rgba(124,92,252,0.25)"}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Email *</label>
              <input
                style={inputStyle}
                type="email"
                value={form.contact_email}
                onChange={e => set("contact_email", e.target.value)}
                placeholder="email@company.co.bw"
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = "rgba(124,92,252,0.25)"}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input
                style={inputStyle}
                value={form.contact_phone}
                onChange={e => set("contact_phone", e.target.value)}
                placeholder="+267 3900 000"
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = "rgba(124,92,252,0.25)"}
              />
            </div>
          </div>

          {form.company_name && (
            <div style={{ marginTop:24, padding:"16px", background:"rgba(0,245,196,0.05)", border:"1px solid rgba(0,245,196,0.15)", borderRadius:12 }}>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Preview</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>{form.company_name}</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Code will be auto generated</div>
              {form.industry && <div style={{ fontSize:12, color:C.blue, marginBottom:4 }}>🏭 {form.industry}</div>}
              {form.contact_person && <div style={{ fontSize:12, color:"#94a3b8" }}>👤 {form.contact_person}</div>}
              {form.contact_email && <div style={{ fontSize:12, color:"#94a3b8" }}>📧 {form.contact_email}</div>}
              {form.contact_phone && <div style={{ fontSize:12, color:"#94a3b8" }}>📞 {form.contact_phone}</div>}
              <div style={{ fontSize:12, color:"#94a3b8" }}>📍 {[form.address, form.city, "Botswana"].filter(Boolean).join(", ")}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:24, justifyContent:"flex-end" }}>
        <a
          href="/clients"
          style={{
            padding:"12px 24px",
            borderRadius:12,
            textDecoration:"none",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8",
            fontSize:14,
            fontWeight:600
          }}
        >
          Cancel
        </a>

        <button
          onClick={handleSubmit}
          disabled={saving || success}
          style={{
            padding:"12px 32px",
            borderRadius:12,
            cursor: saving ? "not-allowed" : "pointer",
            background: saving ? "rgba(124,92,252,0.3)" : `linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none",
            color:"#fff",
            fontSize:14,
            fontWeight:700,
            fontFamily:"inherit",
            opacity: saving ? 0.7 : 1,
            boxShadow: saving ? "none" : `0 0 20px rgba(124,92,252,0.4)`,
            transition:"all 0.2s",
          }}
        >
          {saving ? "Saving…" : "✅ Register Client"}
        </button>
      </div>
    </AppLayout>
  );
}
