"use client";
import { useState } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

// ── All known Botswana towns, cities & industrial areas ──────────────────────
export const BOTSWANA_LOCATIONS = [
  // Major cities & towns
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Tsabong","Shakawe",
  // Large villages & district centres
  "Serowe","Molepolole","Kanye","Mahalapye","Palapye","Mochudi","Ramotswa",
  "Mogoditshane","Tlokweng","Gabane","Letlhakane","Bobonong","Tutume",
  "Tonota","Tati Siding","Mmadinare","Sefhare","Mmashoro","Machaneng",
  "Lerala","Maunatlala","Artesia","Dibete","Palla Road",
  // Southern District
  "Moshupa","Thamaga","Kopong","Otse","Mogobane","Ramotswa","Ramatlabama",
  "Pitsane","Goodhope","Mabule","Moshaneng","Phitshane Molopo","Metlojane",
  "Barolong","Mmathethe","Molapowabojang","Sekoma","Werda","Khakhea",
  // Kgatleng & South-East
  "Pilane","Bokaa","Mmathubudukwane","Sikwane","Oodi","Modipane","Boatlaname",
  "Rasesa","Malolwane","Artesia",
  // Central District
  "Khumaga","Letlhakeng","Takatokwane","Dutlwe","Shoshong","Paje","Mookane",
  "Mosolotshane","Ramokgonami","Tamasane","Gweta","Nata","Dukwi","Nkange",
  "Tobane","Tsetsebjwe","Sefophe","Mathangwane","Chadibe","Mosetse",
  "Matshelagabedi","Tsamaya","Goshwe",
  // North-East & Chobe
  "Masunga","Gulumani","Matsinde","Zwenshambe","Mapoka","Siviya","Ramokgwebana",
  "Kazungula","Kavimba","Pandamatenga","Kachikau","Satau","Muchenje",
  // Ngamiland
  "Sehithwa","Nokaneng","Gumare","Etsha 6","Etsha 13","Seronga","Beetsha",
  "Tsau","Kareng","Toteng","Bodibeng","Shorobe","Khwai","Sankoyo",
  // Kgalagadi
  "Hukuntsi","Tshane","Lehututu","Kang","Charleshill","Bere","Ncojane",
  "Hunhukwe","Kokotsha","Zutshwa","Struizendam",
  // Industrial / Mining Sites
  "Morupule Colliery","Sua Pan (Botash)","Damtshaa Mine","Letlhakane Mine",
  "Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)","Morupule Power Station",
  "Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
  boxSizing:"border-box",
};

const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};

const sectionHeadStyle = {
  fontSize:11, fontWeight:800, color:"#7c5cfc",
  textTransform:"uppercase", letterSpacing:"0.12em",
  borderBottom:"1px solid rgba(124,92,252,0.2)",
  paddingBottom:8, marginBottom:16, marginTop:8,
};

// ── Reusable Botswana location picker (used here AND in client registration) ─
export function BotswanaLocationPicker({ name, value, onChange, required }) {
  const [manual, setManual] = useState(
    value && !BOTSWANA_LOCATIONS.includes(value) && value !== ""
  );

  const handleSelect = (e) => {
    if (e.target.value === "__manual__") {
      setManual(true);
      onChange({ target: { name, value: "" } });
    } else {
      setManual(false);
      onChange(e);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <select
        style={{ ...inputStyle, cursor:"pointer" }}
        name={name}
        value={manual ? "__manual__" : (value || "")}
        onChange={handleSelect}
        required={required && !manual}
      >
        <option value="">— Select location —</option>
        {BOTSWANA_LOCATIONS.map(loc => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
        <option value="__manual__">✏️  Type manually…</option>
      </select>
      {manual && (
        <input
          style={{ ...inputStyle, borderColor:"rgba(0,245,196,0.4)" }}
          type="text"
          name={name}
          placeholder="Enter location / site name"
          value={value}
          onChange={onChange}
          required={required}
          autoFocus
        />
      )}
    </div>
  );
}

const EQUIPMENT_TYPES = [
  "Pressure Vessel","Boiler","Air Receiver","Lifting Equipment",
  "Compressor","Storage Tank","Heat Exchanger","Autoclave",
  "Fired Heater","Separator","Column / Tower","Gas Cylinder",
  "Hydraulic System","Other",
];

const STANDARDS = [
  "ASME Section VIII Div 1","ASME Section VIII Div 2",
  "BS PD 5500","EN 13445","AD 2000 (Germany)",
  "AS 1210 (Australia)","SANS 347 (South Africa)",
  "Local / In-house","Other",
];

const MATERIALS = [
  "Carbon Steel","Stainless Steel 304","Stainless Steel 316",
  "Duplex Stainless","Low Alloy Steel","Hastelloy","Inconel",
  "Aluminium","Copper","Fibreglass (GRP)","Other",
];

const FLUID_TYPES = [
  "Air / Compressed Air","Steam","Water","Hot Oil","Natural Gas",
  "LPG / Propane","Hydrogen","Nitrogen","Oxygen","Ammonia",
  "Hydrocarbons","Chemicals / Corrosive","Other",
];

export default function RegisterEquipmentPage() {
  const [formData, setFormData] = useState({
    // ── Identity ──────────────────────────────
    tag: "",
    serial: "",
    type: "Pressure Vessel",
    manufacturer: "",
    model: "",
    yearBuilt: new Date().getFullYear(),
    // ── Ownership / Site ──────────────────────
    client: "",
    location: "",
    department: "",
    // ── Design / Technical (certificate fields) ─
    standard: "ASME Section VIII Div 1",
    shellMaterial: "Carbon Steel",
    fluidType: "Air / Compressed Air",
    designPressure: "",
    workingPressure: "",
    testPressure: "",
    designTemperature: "",
    volume: "",
    safeWorkingLoad: "",   // for lifting equipment
    // ── Registration / Compliance ─────────────
    nationalRegNo: "",     // e.g. BW-PV-2024-00123
    notifiedBody: "",      // inspection authority
    installationDate: "",
    lastInspectionDate: "",
    nextInspectionDate: "",
    // ── Notes ────────────────────────────────
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const isLifting = formData.type === "Lifting Equipment";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // try {
    //   const { data, error } = await supabase.from("equipment").insert([formData]);
    //   if (error) throw error;
    //   setSubmitted(true);
    // } catch (err) { alert("Error: " + err.message); }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:20 }}>✅</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:10 }}>Equipment Registered</h2>
          <p style={{ color:"#64748b", marginBottom:4 }}>
            <span style={{ color:C.green, fontWeight:700 }}>{formData.tag}</span> has been added to the asset register
          </p>
          <p style={{ color:"#475569", fontSize:12, marginBottom:24 }}>
            {formData.type} · {formData.client} · {formData.location}
          </p>
          <button onClick={() => setSubmitted(false)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>Register Another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>

        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Register Equipment</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Add new equipment to the asset register</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:900,
        }}>

          {/* ── SECTION 1: Identity ───────────────────────────────────── */}
          <div style={sectionHeadStyle}>Equipment Identity</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Equipment Tag *</label>
              <input style={inputStyle} type="text" name="tag" placeholder="e.g. PV-0042" value={formData.tag} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Serial Number *</label>
              <input style={inputStyle} type="text" name="serial" placeholder="e.g. S-10042" value={formData.serial} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Equipment Type *</label>
              <select style={{ ...inputStyle, cursor:"pointer" }} name="type" value={formData.type} onChange={handleChange}>
                {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Manufacturer *</label>
              <input style={inputStyle} type="text" name="manufacturer" placeholder="e.g. ASME Corp" value={formData.manufacturer} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Model / Drawing No.</label>
              <input style={inputStyle} type="text" name="model" placeholder="Model or drawing ref" value={formData.model} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Year Built</label>
              <input style={inputStyle} type="number" name="yearBuilt" placeholder="2024" value={formData.yearBuilt} onChange={handleChange} />
            </div>
          </div>

          {/* ── SECTION 2: Ownership / Site ──────────────────────────── */}
          <div style={sectionHeadStyle}>Ownership & Site</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Client *</label>
              <input style={inputStyle} type="text" name="client" placeholder="Client / company name" value={formData.client} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Location / Town *</label>
              <BotswanaLocationPicker name="location" value={formData.location} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Department / Plant</label>
              <input style={inputStyle} type="text" name="department" placeholder="e.g. Plant A – Bay 3" value={formData.department} onChange={handleChange} />
            </div>
          </div>

          {/* ── SECTION 3: Design / Technical ────────────────────────── */}
          <div style={sectionHeadStyle}>Design & Technical (Certificate Fields)</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Design Standard *</label>
              <select style={{ ...inputStyle, cursor:"pointer" }} name="standard" value={formData.standard} onChange={handleChange}>
                {STANDARDS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Shell / Body Material</label>
              <select style={{ ...inputStyle, cursor:"pointer" }} name="shellMaterial" value={formData.shellMaterial} onChange={handleChange}>
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fluid / Contents Type</label>
              <select style={{ ...inputStyle, cursor:"pointer" }} name="fluidType" value={formData.fluidType} onChange={handleChange}>
                {FLUID_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            {!isLifting && <>
              <div>
                <label style={labelStyle}>Design Pressure (bar)</label>
                <input style={inputStyle} type="number" step="0.01" name="designPressure" placeholder="e.g. 15.0" value={formData.designPressure} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>Working Pressure (kPa)</label>
                <input style={inputStyle} type="number" step="0.01" name="workingPressure" placeholder="e.g. 10.0" value={formData.workingPressure} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>Test Pressure (kPa)</label>
                <input style={inputStyle} type="number" step="0.01" name="testPressure" placeholder="e.g. 22.5" value={formData.testPressure} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>Design Temperature (°C)</label>
                <input style={inputStyle} type="number" step="0.1" name="designTemperature" placeholder="e.g. 250" value={formData.designTemperature} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>Volume / Capacity (L)</label>
                <input style={inputStyle} type="number" step="0.1" name="volume" placeholder="e.g. 5000" value={formData.volume} onChange={handleChange} />
              </div>
            </>}

            {isLifting && (
              <div>
                <label style={labelStyle}>Safe Working Load (kg)</label>
                <input style={inputStyle} type="number" step="1" name="safeWorkingLoad" placeholder="e.g. 5000" value={formData.safeWorkingLoad} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* ── SECTION 4: Registration / Compliance ─────────────────── */}
          <div style={sectionHeadStyle}>Registration & Compliance</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>National Reg. Number</label>
              <input style={inputStyle} type="text" name="nationalRegNo" placeholder="e.g. BW-PV-2024-00123" value={formData.nationalRegNo} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Notified Body / Inspector</label>
              <input style={inputStyle} type="text" name="notifiedBody" placeholder="Inspecting authority" value={formData.notifiedBody} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Installation Date</label>
              <input style={inputStyle} type="date" name="installationDate" value={formData.installationDate} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Last Inspection Date</label>
              <input style={inputStyle} type="date" name="lastInspectionDate" value={formData.lastInspectionDate} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Next Inspection Due</label>
              <input style={inputStyle} type="date" name="nextInspectionDate" value={formData.nextInspectionDate} onChange={handleChange} />
            </div>
          </div>

          {/* ── SECTION 5: Notes ──────────────────────────────────────── */}
          <div style={sectionHeadStyle}>Notes</div>
          <div style={{ marginBottom:24 }}>
            <textarea
              style={{ ...inputStyle, minHeight:80, resize:"vertical" }}
              name="notes"
              placeholder="Any additional remarks, modifications, or special conditions…"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button type="button" onClick={() => window.history.back()} style={{
              padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}>Cancel</button>
            <button type="submit" style={{
              padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
            }}>Register Equipment</button>
          </div>
        </form>
      </main>
    </div>
  );
}
