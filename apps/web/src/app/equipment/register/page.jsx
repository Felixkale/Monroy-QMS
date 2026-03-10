"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const C = { green: "#00f5c4", purple: "#7c5cfc", blue: "#4fc3f7", pink: "#f472b6", yellow: "#fbbf24" };

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊", href: "/dashboard" },
  { id: "clients", label: "Clients", icon: "🏢", href: "/clients" },
  { id: "register-client", label: "Register Client", icon: "➕", href: "/clients/register" },
  { id: "equipment", label: "Equipment", icon: "⚙️", href: "/equipment" },
  { id: "register-equip", label: "Register Equipment", icon: "🔧", href: "/equipment/register" },
  { id: "inspections", label: "Inspections", icon: "🔍", href: "/inspections" },
  { id: "ncr", label: "NCR", icon: "⚠️", href: "/ncr" },
  { id: "certificates", label: "Certificates", icon: "📜", href: "/certificates" },
  { id: "reports", label: "Reports", icon: "📈", href: "/reports" },
  { id: "admin", label: "Admin", icon: "⚡", href: "/admin" },
];

const BOTSWANA_LOCATIONS = [
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

const EQUIPMENT_TYPES = [
  "Pressure Vessel","Boiler","Air Receiver","Trestle Jack","Air Compressor",
  "Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Oil Separator",
  "Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders",
  "Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling",
  "Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp",
];

const STANDARDS = [
  "ASME Section VIII Div 1","ASME Section VIII Div 2","BS PD 5500","EN 13445",
  "AD 2000 (Germany)","AS 1210 (Australia)","SANS 347 (South Africa)","Local / In-house","Other",
];

const MATERIALS = [
  "Carbon Steel","Stainless Steel 304","Stainless Steel 316","Duplex Stainless",
  "Low Alloy Steel","Hastelloy","Inconel","Aluminium","Copper","Fibreglass (GRP)","Other",
];

const FLUID_TYPES = [
  "Air / Compressed Air","Steam","Water","Hot Oil","Natural Gas","LPG / Propane",
  "Hydrogen","Nitrogen","Oxygen","Ammonia","Hydrocarbons","Chemicals / Corrosive","Other",
];

const CERT_TYPES = [
  "Compliance Certificate","Pressure Test Certificate","NDT Certificate",
  "Compliance and Test Certificate",
];

const INSPECTION_FREQS = ["3 Months","6 Months","12 Months","24 Months"];

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

const sectionHeadStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#667eea",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(102,126,234,0.2)",
  paddingBottom: 8,
  marginBottom: 16,
  marginTop: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const focus = (e) => (e.target.style.borderColor = "#667eea");
const blur = (e) => (e.target.style.borderColor = "rgba(102,126,234,0.25)");

function BotswanaLocationPicker({ name, value, onChange, required }) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select
        style={{ ...inputStyle, cursor: "pointer" }}
        name={name}
        value={manual ? "__manual__" : (value || "")}
        onChange={handleSelect}
        required={required && !manual}
      >
        <option value="">— Select location —</option>
        {BOTSWANA_LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
        <option value="__manual__">✏️ Type manually…</option>
      </select>
      {manual && (
        <input
          style={{ ...inputStyle, borderColor: "rgba(0,245,196,0.4)" }}
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

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      background: "linear-gradient(180deg,#1a1f2e 0%,#16192b 100%)",
      padding: "24px 0",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid rgba(102,126,234,0.15)",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",
    }}>
      <div
        onClick={() => setActivePage("dashboard")}
        style={{
          padding: "0 24px 32px",
          borderBottom: "1px solid rgba(102,126,234,0.1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{
          width: 50,
          height: 50,
          flexShrink: 0,
          borderRadius: 10,
          background: "linear-gradient(135deg,#667eea,#764ba2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 22,
          color: "#fff",
        }}>M</div>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "#fff" }}>Monroy</h2>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
            QMS Platform
          </p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {navItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                background: active ? "rgba(102,126,234,0.16)" : "none",
                border: active ? "1px solid rgba(102,126,234,0.25)" : "1px solid transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function RegistrationForm({
  formData,
  onChange,
  onSubmit,
  onClear,
  loading,
  submitError,
  clients,
  clientsLoading,
}) {
  const isLifting = formData.equipment_type !== "Pressure Vessel" &&
    formData.equipment_type !== "Boiler" &&
    formData.equipment_type !== "Air Receiver" &&
    formData.equipment_type !== "Air Compressor" &&
    formData.equipment_type !== "Oil Separator";

  return (
    <form onSubmit={onSubmit} style={{
      background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
      border: "1px solid rgba(102,126,234,0.2)",
      borderRadius: 16,
      padding: 28,
      maxWidth: 900,
    }}>
      <div style={sectionHeadStyle}>⚙️ Equipment Identity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Equipment Tag</label>
          <input
            style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed" }}
            type="text"
            value="Auto generated by system"
            readOnly
          />
        </div>

        <div>
          <label style={labelStyle}>Serial Number *</label>
          <input
            style={inputStyle}
            type="text"
            name="serial"
            placeholder="e.g. S-10042"
            value={formData.serial}
            onChange={onChange}
            required
            onFocus={focus}
            onBlur={blur}
          />
        </div>

        <div>
          <label style={labelStyle}>Equipment Type *</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="equipment_type"
            value={formData.equipment_type}
            onChange={onChange}
          >
            {EQUIPMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Manufacturer *</label>
          <input
            style={inputStyle}
            type="text"
            name="manufacturer"
            placeholder="e.g. ASME Corp"
            value={formData.manufacturer}
            onChange={onChange}
            required
            onFocus={focus}
            onBlur={blur}
          />
        </div>

        <div>
          <label style={labelStyle}>Model / Drawing No.</label>
          <input
            style={inputStyle}
            type="text"
            name="model"
            placeholder="Model or drawing ref"
            value={formData.model}
            onChange={onChange}
            onFocus={focus}
            onBlur={blur}
          />
        </div>

        <div>
          <label style={labelStyle}>Year Built</label>
          <input
            style={inputStyle}
            type="number"
            name="year_built"
            placeholder="2024"
            value={formData.year_built}
            onChange={onChange}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      </div>

      <div style={sectionHeadStyle}>🏢 Ownership & Site</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Client *</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="client_id"
            value={formData.client_id}
            onChange={onChange}
            required
            disabled={clientsLoading}
          >
            <option value="">{clientsLoading ? "Loading clients..." : "— Select registered client —"}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name} {client.company_code ? `(${client.company_code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Location / Town *</label>
          <BotswanaLocationPicker
            name="location"
            value={formData.location}
            onChange={onChange}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Department / Plant</label>
          <input
            style={inputStyle}
            type="text"
            name="department"
            placeholder="e.g. Plant A – Bay 3"
            value={formData.department}
            onChange={onChange}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      </div>

      <div style={sectionHeadStyle}>📜 Certificate Information</div>
      <div style={{
        background: "rgba(102,126,234,0.06)",
        border: "1px solid rgba(102,126,234,0.15)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: 12,
        color: "rgba(102,126,234,0.8)",
      }}>
        ℹ️ These fields populate directly into the auto-generated certificate upon registration.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Certificate Type *</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="cert_type"
            value={formData.cert_type}
            onChange={onChange}
          >
            {CERT_TYPES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Design Standard *</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="design_standard"
            value={formData.design_standard}
            onChange={onChange}
          >
            {STANDARDS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Inspection Frequency</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="inspection_freq"
            value={formData.inspection_freq}
            onChange={onChange}
          >
            {INSPECTION_FREQS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div style={sectionHeadStyle}>📐 Design & Technical Parameters</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Shell / Body Material</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="shell_material"
            value={formData.shell_material}
            onChange={onChange}
          >
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Fluid / Contents Type</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            name="fluid_type"
            value={formData.fluid_type}
            onChange={onChange}
          >
            {FLUID_TYPES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        {!isLifting && (
          <>
            <div>
              <label style={labelStyle}>Design Pressure (bar)</label>
              <input style={inputStyle} type="number" step="0.01" name="design_pressure" value={formData.design_pressure} onChange={onChange} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>Working Pressure (kPa)</label>
              <input style={inputStyle} type="number" step="0.01" name="working_pressure" value={formData.working_pressure} onChange={onChange} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>Test Pressure (kPa)</label>
              <input style={inputStyle} type="number" step="0.01" name="test_pressure" value={formData.test_pressure} onChange={onChange} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>Design Temperature (°C)</label>
              <input style={inputStyle} type="number" step="0.01" name="design_temperature" value={formData.design_temperature} onChange={onChange} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>Volume / Capacity (L)</label>
              <input style={inputStyle} type="number" step="0.01" name="capacity_volume" value={formData.capacity_volume} onChange={onChange} onFocus={focus} onBlur={blur} />
            </div>
          </>
        )}

        {isLifting && (
          <div>
            <label style={labelStyle}>Safe Working Load (kg)</label>
            <input style={inputStyle} type="number" step="0.01" name="safe_working_load" value={formData.safe_working_load} onChange={onChange} onFocus={focus} onBlur={blur} />
          </div>
        )}
      </div>

      <div style={sectionHeadStyle}>🔍 Registration & Compliance</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>National Reg. Number</label>
          <input style={inputStyle} type="text" name="national_reg_no" value={formData.national_reg_no} onChange={onChange} onFocus={focus} onBlur={blur} />
        </div>

        <div>
          <label style={labelStyle}>Notified Body / Inspector</label>
          <input style={inputStyle} type="text" name="notified_body" value={formData.notified_body} onChange={onChange} onFocus={focus} onBlur={blur} />
        </div>

        <div>
          <label style={labelStyle}>Installation Date</label>
          <input style={inputStyle} type="date" name="installation_date" value={formData.installation_date} onChange={onChange} />
        </div>

        <div>
          <label style={labelStyle}>Last Inspection Date</label>
          <input style={inputStyle} type="date" name="last_inspection_date" value={formData.last_inspection_date} onChange={onChange} />
        </div>

        <div>
          <label style={labelStyle}>Next Inspection Due</label>
          <input style={inputStyle} type="date" name="next_inspection_date" value={formData.next_inspection_date} onChange={onChange} />
        </div>
      </div>

      <div style={sectionHeadStyle}>📝 Notes</div>
      <div style={{ marginBottom: 24 }}>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          name="notes"
          placeholder="Any additional remarks, modifications, or special conditions…"
          value={formData.notes}
          onChange={onChange}
          onFocus={focus}
          onBlur={blur}
        />
      </div>

      {submitError && (
        <div style={{
          marginBottom: 12,
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(248,113,113,0.1)",
          border: "1px solid rgba(248,113,113,0.3)",
          color: "#f87171",
          fontSize: 12
        }}>
          ❌ {submitError}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid rgba(102,126,234,0.12)" }}>
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: "11px 24px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 700,
            background: "rgba(102,126,234,0.1)",
            border: "1px solid rgba(102,126,234,0.25)",
            color: "#667eea",
          }}
        >
          Clear Form
        </button>

        <button
          type="submit"
          disabled={loading || clientsLoading}
          style={{
            padding: "11px 28px",
            borderRadius: 8,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            fontWeight: 700,
            background: "linear-gradient(135deg,#667eea,#764ba2)",
            border: "none",
            color: "#fff",
            boxShadow: "0 0 20px rgba(102,126,234,0.4)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "⏳ Saving…" : "📜 Register & Generate Certificate"}
        </button>
      </div>
    </form>
  );
}

function printCertificate(data, certNo, today) {
  const isLifting = data.equipment_type !== "Pressure Vessel" &&
    data.equipment_type !== "Boiler" &&
    data.equipment_type !== "Air Receiver" &&
    data.equipment_type !== "Air Compressor" &&
    data.equipment_type !== "Oil Separator";

  const row = (label, value) => value ? `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Certificate ${certNo}</title>
  <style>
    body { font-family: Arial, sans-serif; background:#fff; color:#111827; padding:40px; max-width:800px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:3px solid #667eea; margin-bottom:24px; }
    .cert-no { font-size:16px; font-weight:900; color:#059669; font-family:monospace; }
    .status { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; margin-bottom:24px; }
    .section-title { font-size:11px; font-weight:800; color:#667eea; text-transform:uppercase; border-bottom:1px solid #e5e7eb; padding-bottom:6px; margin:20px 0 10px; }
    table { width:100%; border-collapse:collapse; }
    tr { border-bottom:1px solid #f3f4f6; }
    td { padding:7px 4px; vertical-align:top; }
    td.label { width:45%; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; }
    td.value { width:55%; font-size:12px; font-weight:600; color:#111827; }
    .print-bar { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #e5e7eb; padding:14px 24px; display:flex; gap:10px; justify-content:flex-end; }
    .btn { padding:10px 22px; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px; border:none; }
    .btn-print { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
    .btn-close { background:#f3f4f6; color:#4b5563; }
    @media print { .no-print { display:none !important; } }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn btn-close" onclick="window.close()">Close</button>
    <button class="btn btn-print" onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="header">
    <div>
      <div style="font-size:10px;font-weight:700;color:#667eea;text-transform:uppercase;">Republic of Botswana · Pressure Equipment Directorate</div>
      <h1 style="margin:6px 0 0;font-size:24px;">${data.cert_type || "Inspection Certificate"}</h1>
      <div style="font-size:12px;color:#6b7280;">Issued under ${data.design_standard || ""}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;">Certificate No.</div>
      <div class="cert-no">${certNo}</div>
      <div style="font-size:10px;color:#9ca3af;">Issued: ${today}</div>
    </div>
  </div>

  <div class="status">
    <strong>Certificate Valid</strong><br/>
    Equipment successfully registered
  </div>

  <div class="section-title">Equipment Identity</div>
  <table>
    ${row("Equipment Tag", data.asset_tag)}
    ${row("Serial Number", data.serial_number)}
    ${row("Equipment Type", data.equipment_type)}
    ${row("Manufacturer", data.manufacturer)}
    ${row("Model / Drawing No.", data.model)}
    ${row("Year Built", data.year_built)}
  </table>

  <div class="section-title">Owner & Installation</div>
  <table>
    ${row("Owner / Client", data.client_name)}
    ${row("Installation Location", data.location)}
    ${row("Department / Plant", data.department)}
    ${row("Installation Date", data.installation_date)}
  </table>

  <div class="section-title">Design & Technical Parameters</div>
  <table>
    ${row("Design Standard", data.design_standard)}
    ${row("Shell / Body Material", data.shell_material)}
    ${row("Fluid / Contents", data.fluid_type)}
    ${!isLifting ? `
      ${row("Design Pressure", data.design_pressure ? `${data.design_pressure} bar` : "")}
      ${row("Working Pressure", data.working_pressure ? `${data.working_pressure} kPa` : "")}
      ${row("Test Pressure", data.test_pressure ? `${data.test_pressure} kPa` : "")}
      ${row("Design Temperature", data.design_temperature ? `${data.design_temperature} °C` : "")}
      ${row("Volume / Capacity", data.capacity_volume ? `${data.capacity_volume} L` : "")}
    ` : row("Safe Working Load", data.safe_working_load ? `${data.safe_working_load} kg` : "")}
  </table>

  <div class="section-title">Registration & Compliance</div>
  <table>
    ${row("National Reg. Number", data.national_reg_no)}
    ${row("Notified Body / Inspector", data.notified_body)}
    ${row("Last Inspection Date", data.last_inspection_date)}
    ${row("Next Inspection Due", data.next_inspection_date)}
    ${row("Inspection Frequency", data.inspection_freq)}
  </table>

  ${data.notes ? `<div class="section-title">Remarks</div><p>${data.notes}</p>` : ""}
  <div style="height:70px" class="no-print"></div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=860,height=900");
  win.document.write(html);
  win.document.close();
}

function CertificateModal({ data, certNo, onClose }) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.82)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: "linear-gradient(160deg,#1a1f2e,#0f1419)",
        border: "1px solid rgba(102,126,234,0.35)",
        borderRadius: 20,
        width: "100%",
        maxWidth: 680,
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <div style={{
          padding: "26px 30px 20px",
          borderBottom: "1px solid rgba(102,126,234,0.2)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#667eea", textTransform: "uppercase" }}>
                Republic of Botswana · Pressure Equipment Directorate
              </div>
              <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 900, color: "#fff" }}>
                {data.cert_type || "Inspection Certificate"}
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Certificate No.</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.green, fontFamily: "monospace" }}>{certNo}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Issued: {today}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 30px" }}>
          <div style={{
            background: "rgba(0,245,196,0.07)",
            border: "1px solid rgba(0,245,196,0.2)",
            borderRadius: 10,
            padding: "11px 16px",
            marginBottom: 22,
            color: C.green
          }}>
            ✅ Equipment successfully registered and linked to client.
          </div>

          <div style={{ color: "#e2e8f0", lineHeight: 1.8, fontSize: 13 }}>
            <div><strong>Equipment Tag:</strong> {data.asset_tag}</div>
            <div><strong>Client:</strong> {data.client_name}</div>
            <div><strong>Equipment Type:</strong> {data.equipment_type}</div>
            <div><strong>Location:</strong> {data.location}</div>
          </div>
        </div>

        <div style={{
          padding: "14px 24px",
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          borderTop: "1px solid rgba(102,126,234,0.15)"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              background: "rgba(102,126,234,0.1)",
              border: "1px solid rgba(102,126,234,0.25)",
              color: "#667eea"
            }}
          >
            Close
          </button>
          <button
            onClick={() => printCertificate(data, certNo, today)}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              border: "none",
              color: "#fff"
            }}
          >
            🖨 Preview & Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  serial: "",
  equipment_type: "Pressure Vessel",
  manufacturer: "",
  model: "",
  year_built: new Date().getFullYear(),
  client_id: "",
  location: "",
  department: "",
  cert_type: "Compliance Certificate",
  design_standard: "ASME Section VIII Div 1",
  inspection_freq: "12 Months",
  shell_material: "Carbon Steel",
  fluid_type: "Air / Compressed Air",
  design_pressure: "",
  working_pressure: "",
  test_pressure: "",
  design_temperature: "",
  capacity_volume: "",
  safe_working_load: "",
  national_reg_no: "",
  notified_body: "",
  installation_date: "",
  last_inspection_date: "",
  next_inspection_date: "",
  notes: "",
};

export default function RegisterEquipmentPage() {
  const [activePage, setActivePage] = useState("register-equip");
  const [formData, setFormData] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function loadClients() {
      setClientsLoading(true);

      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, company_code, status")
        .eq("status", "active")
        .order("company_name", { ascending: true });

      if (!error) {
        setClients(data || []);
      }

      setClientsLoading(false);
    }

    loadClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => setFormData(emptyForm);

  const handleCertClose = () => {
    setCertData(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      if (!formData.client_id) {
        throw new Error("Please select a registered client.");
      }

      const selectedClient = clients.find((c) => c.id === formData.client_id);

      if (!selectedClient) {
        throw new Error("Selected client was not found.");
      }

      const assetPayload = {
        client_id: formData.client_id,
        asset_type: formData.equipment_type,
        serial_number: formData.serial || null,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        description: `${formData.equipment_type}${formData.notes ? ` | ${formData.notes}` : ""}`,
        location: formData.location || null,
        condition: "Good",
        status: "active",
        year_built: formData.year_built ? Number(formData.year_built) : null,
        department: formData.department || null,
        cert_type: formData.cert_type || null,
        design_standard: formData.design_standard || null,
        inspection_freq: formData.inspection_freq || null,
        shell_material: formData.shell_material || null,
        fluid_type: formData.fluid_type || null,
        design_pressure: formData.design_pressure ? Number(formData.design_pressure) : null,
        working_pressure: formData.working_pressure ? Number(formData.working_pressure) : null,
        test_pressure: formData.test_pressure ? Number(formData.test_pressure) : null,
        design_temperature: formData.design_temperature ? Number(formData.design_temperature) : null,
        capacity_volume: formData.capacity_volume ? Number(formData.capacity_volume) : null,
        safe_working_load: formData.safe_working_load ? Number(formData.safe_working_load) : null,
        national_reg_no: formData.national_reg_no || null,
        notified_body: formData.notified_body || null,
        installation_date: formData.installation_date || null,
        last_inspection_date: formData.last_inspection_date || null,
        next_inspection_date: formData.next_inspection_date || null,
        notes: formData.notes || null,
      };

      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .insert([assetPayload])
        .select("id, asset_tag, asset_type, serial_number, manufacturer, model, location, client_id")
        .single();

      if (assetError) {
        throw assetError;
      }

      const certNo = `BW-CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

      const certificatePayload = {
        certificate_number: certNo,
        certificate_type: formData.cert_type || "Compliance Certificate",
        asset_id: asset.id,
        company: selectedClient.company_name,
        equipment_description: formData.equipment_type,
        equipment_location: formData.location || null,
        equipment_id: asset.asset_tag,
        swl: formData.safe_working_load ? String(formData.safe_working_load) : null,
        mawp: formData.working_pressure ? String(formData.working_pressure) : null,
        equipment_status: "active",
        issued_at: new Date().toISOString(),
        valid_to: formData.next_inspection_date || null,
        status: "issued",
        legal_framework: formData.design_standard || null,
      };

      const { error: certError } = await supabase
        .from("certificates")
        .insert([certificatePayload]);

      if (certError) {
        throw certError;
      }

      setCertData({
        ...formData,
        asset_tag: asset.asset_tag,
        client_name: selectedClient.company_name,
        equipment_type: formData.equipment_type,
        serial_number: formData.serial,
        certNo,
      });
    } catch (err) {
      setSubmitError(err.message || "Failed to register equipment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1419", color: "#e2e8f0" }}>
      <style>{`
        * { box-sizing: border-box; }
        select option { background: #1a1f2e; color: #e2e8f0; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      `}</style>

      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#fff" }}>
              Register Equipment
            </h1>
            <div style={{ marginTop: 8, width: 72, height: 4, borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>
              Link equipment to a registered client. Equipment tag is generated automatically by the system.
            </p>
          </div>

          <RegistrationForm
            formData={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onClear={handleClear}
            loading={loading}
            submitError={submitError}
            clients={clients}
            clientsLoading={clientsLoading}
          />
        </main>
      </div>

      {certData && (
        <CertificateModal
          data={certData}
          certNo={certData.certNo}
          onClose={handleCertClose}
        />
      )}
    </div>
  );
}
