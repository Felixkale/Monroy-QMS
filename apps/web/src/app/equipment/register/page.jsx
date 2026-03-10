"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
// import AppLayout from "@/components/AppLayout";

const C = { green: "#00f5c4", purple: "#7c5cfc", blue: "#4fc3f7", pink: "#f472b6", yellow: "#fbbf24" };

// ── Nav items (matches AppLayout) ─────────────────────────────────────────────
const navItems = [
  { id: "dashboard",       label: "Dashboard",          icon: "📊", href: "/dashboard" },
  { id: "clients",         label: "Clients",             icon: "🏢", href: "/clients" },
  { id: "register-client", label: "Register Client",     icon: "➕", href: "/clients/register" },
  { id: "equipment",       label: "Equipment",           icon: "⚙️", href: "/equipment" },
  { id: "register-equip",  label: "Register Equipment",  icon: "🔧", href: "/equipment/register" },
  { id: "inspections",     label: "Inspections",         icon: "🔍", href: "/inspections" },
  { id: "ncr",             label: "NCR",                 icon: "⚠️", href: "/ncr" },
  { id: "certificates",    label: "Certificates",        icon: "📜", href: "/certificates" },
  { id: "reports",         label: "Reports",             icon: "📈", href: "/reports" },
  { id: "admin",           label: "Admin",               icon: "⚡", href: "/admin" },
];

// ── All known Botswana towns, cities & industrial areas ───────────────────────
export const BOTSWANA_LOCATIONS = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Tsabong","Shakawe",
  "Serowe","Molepolole","Kanye","Mahalapye","Palapye","Mochudi","Ramotswa",
  "Mogoditshane","Tlokweng","Gabane","Letlhakane","Bobonong","Tutume",
  "Tonota","Tati Siding","Mmadinare","Sefhare","Mmashoro","Machaneng",
  "Lerala","Maunatlala","Artesia","Dibete","Palla Road",
  "Moshupa","Thamaga","Kopong","Otse","Mogobane","Ramatlabama",
  "Pitsane","Goodhope","Mabule","Moshaneng","Phitshane Molopo","Metlojane",
  "Barolong","Mmathethe","Molapowabojang","Sekoma","Werda","Khakhea",
  "Pilane","Bokaa","Mmathubudukwane","Sikwane","Oodi","Modipane","Boatlaname",
  "Rasesa","Malolwane",
  "Khumaga","Letlhakeng","Takatokwane","Dutlwe","Shoshong","Paje","Mookane",
  "Mosolotshane","Ramokgonami","Tamasane","Gweta","Nata","Dukwi","Nkange",
  "Tobane","Tsetsebjwe","Sefophe","Mathangwane","Chadibe","Mosetse",
  "Matshelagabedi","Tsamaya","Goshwe",
  "Masunga","Gulumani","Matsinde","Zwenshambe","Mapoka","Siviya","Ramokgwebana",
  "Kazungula","Kavimba","Pandamatenga","Kachikau","Satau","Muchenje",
  "Sehithwa","Nokaneng","Gumare","Etsha 6","Etsha 13","Seronga","Beetsha",
  "Tsau","Kareng","Toteng","Bodibeng","Shorobe","Khwai","Sankoyo",
  "Hukuntsi","Tshane","Lehututu","Kang","Charleshill","Bere","Ncojane",
  "Hunhukwe","Kokotsha","Zutshwa","Struizendam",
  "Morupule Colliery","Sua Pan (Botash)","Damtshaa Mine","Letlhakane Mine",
  "Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)","Morupule Power Station",
  "Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];

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
const CERT_TYPES = [
  "Inspection Certificate","Pressure Test Certificate","NDT Certificate",
  "Calibration Certificate","Fitness-for-Service Certificate",
  "Lifting Equipment Certificate",
];
const INSPECTION_FREQS = [
  "6 Months","12 Months","18 Months","24 Months","36 Months","60 Months",
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8, color: "#e2e8f0",
  fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", transition: "border-color .2s",
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: 6, display: "block",
};
const sectionHeadStyle = {
  fontSize: 11, fontWeight: 800, color: "#667eea",
  textTransform: "uppercase", letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(102,126,234,0.2)",
  paddingBottom: 8, marginBottom: 16, marginTop: 8,
  display: "flex", alignItems: "center", gap: 8,
};

// ── Location Picker ───────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select
        style={{ ...inputStyle, cursor: "pointer" }}
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
          style={{ ...inputStyle, borderColor: "rgba(0,245,196,0.4)" }}
          type="text" name={name}
          placeholder="Enter location / site name"
          value={value} onChange={onChange}
          required={required} autoFocus
        />
      )}
    </div>
  );
}

// ── Print: opens a clean standalone certificate in a new window ──────────────
function printCertificate(data, certNo, today) {
  const isLifting = data.equipment_type === "Lifting Equipment";

  const row = (label, value) => value ? `
    <tr>
      <td class="label">${label}</td>
      <td class="value">${value}</td>
    </tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Certificate ${certNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #fff;
      color: #1e293b;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #667eea;
      margin-bottom: 24px;
    }
    .header-left .authority {
      font-size: 9px; font-weight: 700; color: #667eea;
      letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;
    }
    .header-left h1 { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px; }
    .header-left .standard { font-size: 11px; color: #64748b; }
    .header-left .standard span { color: #667eea; font-weight: 600; }
    .header-right { text-align: right; }
    .header-right .cert-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
    .header-right .cert-no { font-size: 16px; font-weight: 900; color: #059669; font-family: monospace; letter-spacing: 0.05em; }
    .header-right .cert-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
    .status {
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 10;
    }
    .status-icon { font-size: 18px; }
    .status-title { font-size: 13px; font-weight: 700; color: #16a34a; }
    .status-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .section-title {
      font-size: 10px; font-weight: 800; color: #667eea;
      text-transform: uppercase; letter-spacing: 0.12em;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 10px;
    }
    table { width: 100%; border-collapse: collapse; }
    tr { border-bottom: 1px solid #f1f5f9; }
    td { padding: 7px 4px; vertical-align: top; }
    td.label { width: 45%; font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    td.value { width: 55%; font-size: 12px; font-weight: 600; color: #1e293b; }
    .signatures {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 20px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0;
    }
    .sig-box { text-align: center; }
    .sig-line {
      border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 40px;
      font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;
    }
    .footer {
      margin-top: 24px; padding-top: 12px; border-top: 1px dashed #e2e8f0;
      text-align: center; font-size: 9px; color: #cbd5e1; line-height: 1.6;
    }
    @media print { body { padding: 20px; } .no-print { display: none !important; } }
    .print-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-top: 1px solid #e2e8f0;
      padding: 14px 24px; display: flex; gap: 10; justify-content: flex-end;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    }
    .btn { padding: 10px 22px; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 13px; border: none; }
    .btn-print { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }
    .btn-close { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0 !important; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    <button class="btn btn-print" onclick="window.print()">🖨 Save / Print PDF</button>
  </div>
  <div class="header">
    <div class="header-left">
      <div class="authority">Republic of Botswana · Pressure Equipment Directorate</div>
      <h1>${data.cert_type || "Inspection Certificate"}</h1>
      <div class="standard">Issued under <span>${data.design_standard}</span></div>
    </div>
    <div class="header-right">
      <div class="cert-label">Certificate No.</div>
      <div class="cert-no">${certNo}</div>
      <div class="cert-date">Issued: ${today}</div>
    </div>
  </div>
  <div class="status">
    <div class="status-icon">✅</div>
    <div>
      <div class="status-title">Certificate Valid — Equipment Successfully Registered</div>
      <div class="status-sub">${data.tag} · ${data.equipment_type} · ${data.location}</div>
    </div>
  </div>
  <div class="section-title">⚙ Equipment Identity</div>
  <table>
    ${row("Equipment Tag", data.tag)}
    ${row("Serial Number", data.serial)}
    ${row("Equipment Type", data.equipment_type)}
    ${row("Manufacturer", data.manufacturer)}
    ${row("Model / Drawing No.", data.model)}
    ${row("Year of Manufacture", data.year_built)}
  </table>
  <div class="section-title">🏢 Owner & Installation</div>
  <table>
    ${row("Owner / Client", data.client)}
    ${row("Installation Location", data.location)}
    ${row("Department / Plant", data.department)}
    ${row("Installation Date", data.installation_date)}
  </table>
  <div class="section-title">📐 Design & Technical Parameters</div>
  <table>
    ${row("Design Standard", data.design_standard)}
    ${row("Shell / Body Material", data.shell_material)}
    ${row("Fluid / Contents", data.fluid_type)}
    ${!isLifting ? `
      ${row("Design Pressure", data.design_pressure ? data.design_pressure + " bar" : "")}
      ${row("Working Pressure", data.working_pressure ? data.working_pressure + " kPa" : "")}
      ${row("Test Pressure", data.test_pressure ? data.test_pressure + " kPa" : "")}
      ${row("Design Temperature", data.design_temperature ? data.design_temperature + " °C" : "")}
      ${row("Volume / Capacity", data.capacity_volume ? data.capacity_volume + " L" : "")}
    ` : `
      ${row("Safe Working Load", data.safe_working_load ? data.safe_working_load + " kg" : "")}
    `}
  </table>
  <div class="section-title">📜 Registration & Compliance</div>
  <table>
    ${row("National Reg. Number", data.national_reg_no)}
    ${row("Notified Body / Inspector", data.notified_body)}
    ${row("Last Inspection Date", data.last_inspection_date)}
    ${row("Next Inspection Due", data.next_inspection_date)}
    ${row("Inspection Frequency", data.inspection_freq)}
  </table>
  ${data.notes ? `
  <div class="section-title">📝 Remarks</div>
  <p style="font-size:12px;color:#334155;line-height:1.7;padding:10px;background:#f8fafc;border-radius:6px;">${data.notes}</p>
  ` : ""}
  <div class="signatures">
    ${["Registered By", "Approved By", "Inspecting Authority"].map(r => `
      <div class="sig-box"><div class="sig-line">${r}</div></div>
    `).join("")}
  </div>
  <div class="footer">
    Computer-generated certificate &nbsp;·&nbsp; Cert No. ${certNo} &nbsp;·&nbsp; ${today}<br/>
    Verify at the Botswana Pressure Equipment Directorate portal.
  </div>
  <div style="height:70px" class="no-print"></div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=860,height=900");
  win.document.write(html);
  win.document.close();
}

// ── Certificate Modal ─────────────────────────────────────────────────────────
function CertificateModal({ data, certNo, onClose }) {
  const isLifting = data.equipment_type === "Lifting Equipment";
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const Row = ({ k, v }) => (
    <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}>
      <span style={{ width: "45%", fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
      <span style={{ width: "55%", fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{v || "—"}</span>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: "linear-gradient(160deg,#1a1f2e,#0f1419)",
        border: "1px solid rgba(102,126,234,0.35)",
        borderRadius: 20, width: "100%", maxWidth: 680,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 0 60px rgba(102,126,234,0.2)",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.1))",
          borderBottom: "1px solid rgba(102,126,234,0.2)",
          padding: "26px 30px 20px", borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#667eea", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
                Republic of Botswana · Pressure Equipment Directorate
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                {data.cert_type || "Inspection Certificate"}
              </h2>
              <div style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                Issued under <span style={{ color: C.blue }}>{data.design_standard}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Certificate No.</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.green, letterSpacing: "0.05em", fontFamily: "monospace" }}>{certNo}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Issued: {today}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 30px" }}>
          <div style={{
            background: "rgba(0,245,196,0.07)", border: "1px solid rgba(0,245,196,0.2)",
            borderRadius: 10, padding: "11px 16px", marginBottom: 22,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Certificate Valid — Equipment Successfully Registered</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {data.tag} · {data.equipment_type} · {data.location}
              </div>
            </div>
          </div>

          <div style={{ ...sectionHeadStyle, marginTop: 0 }}>⚙️ Equipment Identity</div>
          <Row k="Equipment Tag"       v={data.tag} />
          <Row k="Serial Number"       v={data.serial} />
          <Row k="Equipment Type"      v={data.equipment_type} />
          <Row k="Manufacturer"        v={data.manufacturer} />
          <Row k="Model / Drawing No." v={data.model} />
          <Row k="Year of Manufacture" v={data.year_built} />

          <div style={{ ...sectionHeadStyle, marginTop: 20 }}>🏢 Owner & Installation</div>
          <Row k="Owner / Client"        v={data.client} />
          <Row k="Installation Location" v={data.location} />
          <Row k="Department / Plant"    v={data.department} />
          <Row k="Installation Date"     v={data.installation_date} />

          <div style={{ ...sectionHeadStyle, marginTop: 20 }}>📐 Design & Technical Parameters</div>
          <Row k="Design Standard"       v={data.design_standard} />
          <Row k="Shell / Body Material" v={data.shell_material} />
          <Row k="Fluid / Contents"      v={data.fluid_type} />
          {!isLifting && <>
            <Row k="Design Pressure"             v={data.design_pressure    ? `${data.design_pressure} bar`    : null} />
            <Row k="Working Pressure"            v={data.working_pressure   ? `${data.working_pressure} kPa`   : null} />
            <Row k="Test Pressure (Hydrostatic)" v={data.test_pressure      ? `${data.test_pressure} kPa`      : null} />
            <Row k="Design Temperature"          v={data.design_temperature ? `${data.design_temperature} °C`  : null} />
            <Row k="Volume / Capacity"           v={data.capacity_volume    ? `${data.capacity_volume} L`      : null} />
          </>}
          {isLifting &&
            <Row k="Safe Working Load" v={data.safe_working_load ? `${data.safe_working_load} kg` : null} />
          }

          <div style={{ ...sectionHeadStyle, marginTop: 20 }}>📜 Registration & Compliance</div>
          <Row k="National Reg. Number"      v={data.national_reg_no} />
          <Row k="Notified Body / Inspector" v={data.notified_body} />
          <Row k="Last Inspection Date"      v={data.last_inspection_date} />
          <Row k="Next Inspection Due"       v={data.next_inspection_date} />
          <Row k="Inspection Frequency"      v={data.inspection_freq} />

          {data.notes && <>
            <div style={{ ...sectionHeadStyle, marginTop: 20 }}>📝 Remarks</div>
            <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.7, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 14px" }}>
              {data.notes}
            </div>
          </>}

          <div style={{
            marginTop: 28, borderTop: "1px solid rgba(102,126,234,0.15)", paddingTop: 20,
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          }}>
            {["Registered By", "Approved By", "Inspecting Authority"].map(role => (
              <div key={role} style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8, marginTop: 32 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{role}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20, textAlign: "center", fontSize: 10,
            color: "rgba(100,116,139,0.45)", lineHeight: 1.6,
            borderTop: "1px dashed rgba(102,126,234,0.1)", paddingTop: 14,
          }}>
            Computer-generated certificate · Cert No. {certNo} · {today}<br />
            Verify at the Botswana Pressure Equipment Directorate portal.
          </div>
        </div>

        {/* Actions */}
        <div style={{
          position: "sticky", bottom: 0, background: "#1a1f2e",
          borderTop: "1px solid rgba(102,126,234,0.15)",
          padding: "14px 24px", display: "flex", gap: 10, justifyContent: "flex-end",
          borderRadius: "0 0 20px 20px",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600, fontSize: 13,
            background: "rgba(102,126,234,0.1)", border: "1px solid rgba(102,126,234,0.25)", color: "#667eea",
          }}>Close</button>
          <button onClick={() => printCertificate(data, certNo, today)} style={{
            padding: "9px 22px", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: 13,
            background: "linear-gradient(135deg,#667eea,#764ba2)",
            border: "none", color: "#fff", boxShadow: "0 0 18px rgba(102,126,234,0.35)",
          }}>🖨 Preview & Save PDF</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RegisterEquipmentPage() {
  const [activePage, setActivePage] = useState("register-equip");
  const [certData,   setCertData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const emptyForm = {
    tag: "", serial: "", equipment_type: "Pressure Vessel",
    manufacturer: "", model: "", year_built: new Date().getFullYear(),
    client: "", location: "", department: "",
    cert_type: "Inspection Certificate", design_standard: "ASME Section VIII Div 1", inspection_freq: "12 Months",
    shell_material: "Carbon Steel", fluid_type: "Air / Compressed Air",
    design_pressure: "", working_pressure: "", test_pressure: "",
    design_temperature: "", capacity_volume: "", safe_working_load: "",
    national_reg_no: "", notified_body: "", installation_date: "",
    last_inspection_date: "", next_inspection_date: "",
    notes: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const isLifting = formData.equipment_type === "Lifting Equipment";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const focus = (e) => (e.target.style.borderColor = "#667eea");
  const blur  = (e) => (e.target.style.borderColor = "rgba(102,126,234,0.25)");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    const year   = new Date().getFullYear();
    const rand   = Math.floor(Math.random() * 90000) + 10000;
    const certNo = `BW-CERT-${year}-${rand}`;

    try {
      const { error: equipError } = await supabase
        .from("equipment")
        .insert([formData]);
      if (equipError) throw equipError;

      const { error: certError } = await supabase
        .from("certificates")
        .insert([{ ...formData, cert_no: certNo }]);
      if (certError) throw certError;

      setCertData({ ...formData, certNo });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCertClose = () => {
    setCertData(null);
    setFormData(emptyForm);
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside style={{
      width: 280, flexShrink: 0,
      background: "linear-gradient(180deg,#1a1f2e 0%,#16192b 100%)",
      padding: "24px 0", display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(102,126,234,0.15)",
      position: "sticky", top: 0, height: "100vh", overflowY: "auto",
    }}>
      <div
        onClick={() => setActivePage("dashboard")}
        style={{
          padding: "0 24px 32px",
          borderBottom: "1px solid rgba(102,126,234,0.1)",
          cursor: "pointer", transition: "all .25s",
          display: "flex", alignItems: "center", gap: 12,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <div style={{
          width: 50, height: 50, flexShrink: 0, borderRadius: 10,
          overflow: "hidden", background: "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 900, fontSize: 22, color: "#fff" }}>M</span>
        </div>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>Monroy</h2>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            QMS Platform
          </p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                background: active ? "rgba(102,126,234,0.16)" : "none",
                border: active ? "1px solid rgba(102,126,234,0.25)" : "1px solid transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
                padding: "12px 16px", fontSize: 14, fontWeight: active ? 700 : 500,
                borderRadius: 8, cursor: "pointer", transition: "all .25s",
                textAlign: "left", display: "flex", alignItems: "center", gap: 12,
                fontFamily: "inherit", width: "100%",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(102,126,234,0.12)"; e.currentTarget.style.color = "#fff"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; } }}
            >
              <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(102,126,234,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg,#667eea,#764ba2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 16, color: "#fff", flexShrink: 0,
          }}>A</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: 0 }}>admin</p>
            <p style={{ fontSize: 11, margin: "2px 0 0", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              admin@monroy.co.bw
            </p>
          </div>
        </div>
        <button
          style={{
            width: "100%", background: "rgba(102,126,234,0.15)",
            border: "1px solid rgba(102,126,234,0.3)", color: "#667eea",
            padding: "8px 12px", borderRadius: 6, fontSize: 12,
            fontWeight: 600, cursor: "pointer", transition: "all .25s", fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(102,126,234,0.25)"; e.currentTarget.style.borderColor = "rgba(102,126,234,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(102,126,234,0.15)"; e.currentTarget.style.borderColor = "rgba(102,126,234,0.3)"; }}
        >Logout</button>
      </div>
    </aside>
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  const Form = () => (
    <form onSubmit={handleSubmit} style={{
      background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
      border: "1px solid rgba(102,126,234,0.2)", borderRadius: 16,
      padding: 28, maxWidth: 900,
    }}>

      {/* 1. Equipment Identity */}
      <div style={sectionHeadStyle}>⚙️ Equipment Identity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Equipment Tag *</label>
          <input style={inputStyle} type="text" name="tag" placeholder="e.g. PV-0042" value={formData.tag} onChange={handleChange} required onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Serial Number *</label>
          <input style={inputStyle} type="text" name="serial" placeholder="e.g. S-10042" value={formData.serial} onChange={handleChange} required onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Equipment Type *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="equipment_type" value={formData.equipment_type} onChange={handleChange}>
            {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Manufacturer *</label>
          <input style={inputStyle} type="text" name="manufacturer" placeholder="e.g. ASME Corp" value={formData.manufacturer} onChange={handleChange} required onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Model / Drawing No.</label>
          <input style={inputStyle} type="text" name="model" placeholder="Model or drawing ref" value={formData.model} onChange={handleChange} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Year Built</label>
          <input style={inputStyle} type="number" name="year_built" placeholder="2024" value={formData.year_built} onChange={handleChange} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* 2. Ownership & Site */}
      <div style={sectionHeadStyle}>🏢 Ownership & Site</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Client *</label>
          <input style={inputStyle} type="text" name="client" placeholder="Client / company name" value={formData.client} onChange={handleChange} required onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Location / Town *</label>
          <BotswanaLocationPicker name="location" value={formData.location} onChange={handleChange} required />
        </div>
        <div>
          <label style={labelStyle}>Department / Plant</label>
          <input style={inputStyle} type="text" name="department" placeholder="e.g. Plant A – Bay 3" value={formData.department} onChange={handleChange} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* 3. Certificate Information */}
      <div style={sectionHeadStyle}>📜 Certificate Information</div>
      <div style={{
        background: "rgba(102,126,234,0.06)", border: "1px solid rgba(102,126,234,0.15)",
        borderRadius: 8, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: "rgba(102,126,234,0.8)",
      }}>
        ℹ️ These fields populate directly into the auto-generated certificate upon registration.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Certificate Type *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="cert_type" value={formData.cert_type} onChange={handleChange}>
            {CERT_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Design Standard *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="design_standard" value={formData.design_standard} onChange={handleChange}>
            {STANDARDS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Inspection Frequency</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="inspection_freq" value={formData.inspection_freq} onChange={handleChange}>
            {INSPECTION_FREQS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* 4. Design & Technical */}
      <div style={sectionHeadStyle}>📐 Design & Technical Parameters</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Shell / Body Material</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="shell_material" value={formData.shell_material} onChange={handleChange}>
            {MATERIALS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fluid / Contents Type</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} name="fluid_type" value={formData.fluid_type} onChange={handleChange}>
            {FLUID_TYPES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        {!isLifting && <>
          <div>
            <label style={labelStyle}>Design Pressure (bar)</label>
            <input style={inputStyle} type="number" step="0.01" name="design_pressure" placeholder="e.g. 15.0" value={formData.design_pressure} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Working Pressure (kPa)</label>
            <input style={inputStyle} type="number" step="0.01" name="working_pressure" placeholder="e.g. 1000" value={formData.working_pressure} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Test Pressure (kPa)</label>
            <input style={inputStyle} type="number" step="0.01" name="test_pressure" placeholder="e.g. 1500" value={formData.test_pressure} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Design Temperature (°C)</label>
            <input style={inputStyle} type="number" step="0.1" name="design_temperature" placeholder="e.g. 250" value={formData.design_temperature} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Volume / Capacity (L)</label>
            <input style={inputStyle} type="number" step="0.1" name="capacity_volume" placeholder="e.g. 5000" value={formData.capacity_volume} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
        </>}
        {isLifting && (
          <div>
            <label style={labelStyle}>Safe Working Load (kg)</label>
            <input style={inputStyle} type="number" step="1" name="safe_working_load" placeholder="e.g. 5000" value={formData.safe_working_load} onChange={handleChange} onFocus={focus} onBlur={blur} />
          </div>
        )}
      </div>

      {/* 5. Registration & Compliance */}
      <div style={sectionHeadStyle}>🔍 Registration & Compliance</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>National Reg. Number</label>
          <input style={inputStyle} type="text" name="national_reg_no" placeholder="e.g. BW-PV-2024-00123" value={formData.national_reg_no} onChange={handleChange} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Notified Body / Inspector</label>
          <input style={inputStyle} type="text" name="notified_body" placeholder="Inspecting authority" value={formData.notified_body} onChange={handleChange} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={labelStyle}>Installation Date</label>
          <input style={inputStyle} type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>Last Inspection Date</label>
          <input style={inputStyle} type="date" name="last_inspection_date" value={formData.last_inspection_date} onChange={handleChange} />
        </div>
        <div>
          <label style={labelStyle}>Next Inspection Due</label>
          <input style={inputStyle} type="date" name="next_inspection_date" value={formData.next_inspection_date} onChange={handleChange} />
        </div>
      </div>

      {/* 6. Notes */}
      <div style={sectionHeadStyle}>📝 Notes</div>
      <div style={{ marginBottom: 24 }}>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          name="notes"
          placeholder="Any additional remarks, modifications, or special conditions…"
          value={formData.notes}
          onChange={handleChange}
          onFocus={focus} onBlur={blur}
        />
      </div>

      {/* Actions */}
      {submitError && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 12 }}>
          ❌ {submitError}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid rgba(102,126,234,0.12)" }}>
        <button
          type="button"
          onClick={() => setFormData(emptyForm)}
          style={{
            padding: "11px 24px", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700,
            background: "rgba(102,126,234,0.1)",
            border: "1px solid rgba(102,126,234,0.25)", color: "#667eea",
          }}
        >Clear Form</button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "11px 28px", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700,
            background: "linear-gradient(135deg,#667eea,#764ba2)",
            border: "none", color: "#fff",
            boxShadow: "0 0 20px rgba(102,126,234,0.4)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "⏳ Saving…" : "📜 Register & Generate Certificate"}
        </button>
      </div>
    </form>
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1419", color: "#e2e8f0" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(102,126,234,0.25); border-radius: 10px; }
        select option { background: #1a1f2e; color: #e2e8f0; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      `}</style>

      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              Register Equipment
            </h1>
            <div style={{ marginTop: 8, width: 72, height: 4, borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>
              Add new equipment to the asset register · A certificate is auto-generated on submission
            </p>
          </div>
          <Form />
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
