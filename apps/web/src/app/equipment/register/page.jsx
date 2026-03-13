"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };

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
  "Manual Rod Handlers",
];

const PRESSURE_EQUIPMENT_TYPES = [
  "Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator",
];

const LIFTING_EQUIPMENT_TYPES = [
  "Trestle Jack","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand",
  "Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders",
  "Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling",
  "Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp",
  "Manual Rod Handlers",
];

const LANYARD_EQUIPMENT_TYPES = ["Safety Harness","Fall Arrest"];

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
  "Load Test Certificate",
  "Pressure Test Certificate",
  "Certificate of Statutory Inspection",
  "Inspection Certificate",
  "Compliance Certificate",
  "NDT Certificate",
  "Compliance and Test Certificate",
];

const INSPECTION_FREQS = ["3 Months","6 Months","12 Months","24 Months"];

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(102,126,234,0.25)",
  borderRadius:8, color:"#e2e8f0", fontSize:13,
  fontFamily:"inherit", outline:"none",
  boxSizing:"border-box", transition:"border-color .2s",
};

const labelStyle = {
  fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};

const sectionHeadStyle = {
  fontSize:11, fontWeight:800, color:"#667eea",
  textTransform:"uppercase", letterSpacing:"0.12em",
  borderBottom:"1px solid rgba(102,126,234,0.2)",
  paddingBottom:8, marginBottom:16, marginTop:8,
  display:"flex", alignItems:"center", gap:8,
};

function sanitizeText(val, maxLen = 200) {
  if (val === undefined || val === null) return "";
  return String(val)
    .replace(/<[^>]*>/g, "")
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function SelectField({ name, value, onChange, required=false, disabled=false, children }) {
  return (
    <div style={{ position:"relative" }}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        style={{
          ...inputStyle,
          cursor:disabled?"not-allowed":"pointer",
          appearance:"none",
          WebkitAppearance:"none",
          MozAppearance:"none",
          paddingRight:40,
          background:"#1a1f2e",
          color:"#e2e8f0",
        }}
      >
        {children}
      </select>
      <span
        style={{
          position:"absolute",
          right:12,
          top:"50%",
          transform:"translateY(-50%)",
          color:"#94a3b8",
          pointerEvents:"none",
          fontSize:12,
        }}
      >
        ▾
      </span>
    </div>
  );
}

function BotswanaLocationPicker({ name, value, onChange, required }) {
  const [manual, setManual] = useState(
    value && !BOTSWANA_LOCATIONS.includes(value) && value !== ""
  );

  const handleSelect = (e) => {
    if (e.target.value === "__manual__") {
      setManual(true);
      onChange({ target:{ name, value:"" } });
    } else {
      setManual(false);
      onChange(e);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <SelectField
        name={name}
        value={manual ? "__manual__" : (value || "")}
        onChange={handleSelect}
        required={required && !manual}
      >
        <option value="">Select location</option>
        {BOTSWANA_LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
        <option value="__manual__">Type manually…</option>
      </SelectField>

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

const emptyForm = {
  serial_number:"",
  equipment_id:"",
  identification_number:"",
  inspection_no:"",
  equipment_type:"Pressure Vessel",
  manufacturer:"",
  model:"",
  year_built:"",
  country_of_origin:"",
  client_id:"",
  location:"",
  department:"",
  inspector_name:"",
  inspector_id:"",
  cert_type:"Pressure Test Certificate",
  design_standard:"ASME Section VIII Div 1",
  inspection_freq:"12 Months",
  shell_material:"Carbon Steel",
  fluid_type:"Air / Compressed Air",
  design_pressure:"",
  working_pressure:"",
  test_pressure:"",
  design_temperature:"",
  capacity_volume:"",
  safe_working_load:"",
  proof_load:"",
  lifting_height:"",
  sling_length:"",
  chain_size:"",
  rope_diameter:"",
  lanyard_serial_no:"",
  last_inspection_date:"",
  next_inspection_date:"",
  license_status:"valid",
  license_expiry:"",
  condition:"Good",
  status:"active",
  notes:"",
};

export default function RegisterEquipmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function loadClients() {
      setClientsLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id,company_name,company_code,status")
        .eq("status", "active")
        .order("company_name", { ascending:true });

      setClients(error ? [] : (data || []));
      setClientsLoading(false);
    }
    loadClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "equipment_type") {
        const pressure = PRESSURE_EQUIPMENT_TYPES.includes(value);
        const lifting = LIFTING_EQUIPMENT_TYPES.includes(value);
        const hasLanyard = LANYARD_EQUIPMENT_TYPES.includes(value);

        if (pressure) {
          next.safe_working_load = "";
          next.proof_load = "";
          next.lifting_height = "";
          next.sling_length = "";
          next.chain_size = "";
          next.rope_diameter = "";
          next.lanyard_serial_no = "";
          next.cert_type = "Pressure Test Certificate";
        }

        if (lifting && !hasLanyard) {
          next.design_pressure = "";
          next.working_pressure = "";
          next.test_pressure = "";
          next.design_temperature = "";
          next.capacity_volume = "";
          next.fluid_type = "";
          next.lanyard_serial_no = "";
          if (!["Load Test Certificate", "Inspection Certificate", "Certificate of Statutory Inspection"].includes(next.cert_type)) {
            next.cert_type = "Load Test Certificate";
          }
        }

        if (!pressure && !lifting) {
          next.design_pressure = "";
          next.working_pressure = "";
          next.test_pressure = "";
          next.design_temperature = "";
          next.capacity_volume = "";
          next.fluid_type = "";
          next.safe_working_load = "";
          next.proof_load = "";
          next.lifting_height = "";
          next.sling_length = "";
          next.chain_size = "";
          next.rope_diameter = "";
          next.lanyard_serial_no = "";
        }
      }

      return next;
    });
  };

  const handleClear = () => {
    setFormData(emptyForm);
    setSubmitError(null);
  };

  async function generateCertNumber(serialNumber, assetId) {
    const base = serialNumber
      ? serialNumber.replace(/[\s\-\/]+/g, "").toUpperCase()
      : `ASSET${assetId}`;

    const prefix = `CERT-${base}-`;

    const { data: existing } = await supabase
      .from("certificates")
      .select("certificate_number")
      .like("certificate_number", `${prefix}%`)
      .order("certificate_number", { ascending:false })
      .limit(1)
      .maybeSingle();

    let nextSeq = 1;
    if (existing?.certificate_number) {
      const parts = existing.certificate_number.split("-");
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) nextSeq = last + 1;
    }

    return `${prefix}${String(nextSeq).padStart(2, "0")}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      const selectedClient = clients.find((c) => c.id === formData.client_id);
      if (!selectedClient) throw new Error("Please select a registered client.");

      if (!formData.serial_number.trim()) throw new Error("Serial number / ID No. is required.");
      if (!formData.manufacturer.trim()) throw new Error("Manufacturer is required.");
      if (formData.last_inspection_date && formData.next_inspection_date) {
        if (new Date(formData.next_inspection_date) <= new Date(formData.last_inspection_date)) {
          throw new Error("Next inspection date must be after last inspection date.");
        }
      }

      const assetName = formData.model
        ? `${formData.equipment_type} - ${formData.model}`
        : `${formData.equipment_type} - ${formData.serial_number}`;

      const payload = {
        asset_name: assetName,
        client_id: formData.client_id,
        asset_type: sanitizeText(formData.equipment_type, 100),
        serial_number: sanitizeText(formData.serial_number, 80),
        manufacturer: sanitizeText(formData.manufacturer, 100),
        model: sanitizeText(formData.model, 100) || null,
        year_built: sanitizeText(formData.year_built, 20) || null,
        location: sanitizeText(formData.location, 150),
        department: sanitizeText(formData.department, 100) || null,
        cert_type: sanitizeText(formData.cert_type, 100),
        design_standard: sanitizeText(formData.design_standard, 120) || null,
        inspection_freq: sanitizeText(formData.inspection_freq, 50) || null,
        shell_material: sanitizeText(formData.shell_material, 80) || null,
        fluid_type: sanitizeText(formData.fluid_type, 80) || null,
        design_pressure: sanitizeText(formData.design_pressure, 50) || null,
        working_pressure: sanitizeText(formData.working_pressure, 50) || null,
        test_pressure: sanitizeText(formData.test_pressure, 50) || null,
        design_temperature: sanitizeText(formData.design_temperature, 50) || null,
        capacity_volume: sanitizeText(formData.capacity_volume, 50) || null,
        safe_working_load: sanitizeText(formData.safe_working_load, 50) || null,
        proof_load: sanitizeText(formData.proof_load, 50) || null,
        lifting_height: sanitizeText(formData.lifting_height, 50) || null,
        sling_length: sanitizeText(formData.sling_length, 50) || null,
        chain_size: sanitizeText(formData.chain_size, 50) || null,
        rope_diameter: sanitizeText(formData.rope_diameter, 50) || null,
        lanyard_serial_no: sanitizeText(formData.lanyard_serial_no, 80) || null,
        identification_number: sanitizeText(formData.identification_number, 80) || null,
        inspection_no: sanitizeText(formData.inspection_no, 80) || null,
        equipment_id: sanitizeText(formData.equipment_id, 80) || null,
        country_of_origin: sanitizeText(formData.country_of_origin, 80) || null,
        inspector_name: sanitizeText(formData.inspector_name, 100) || null,
        inspector_id: sanitizeText(formData.inspector_id, 80) || null,
        last_inspection_date: formData.last_inspection_date || null,
        next_inspection_date: formData.next_inspection_date || null,
        license_status: sanitizeText(formData.license_status, 30),
        license_expiry: formData.license_expiry || null,
        condition: sanitizeText(formData.condition, 50) || null,
        status: sanitizeText(formData.status, 30),
        notes: sanitizeText(formData.notes, 1000) || null,
        description: formData.notes
          ? `${formData.equipment_type} | ${sanitizeText(formData.notes, 300)}`
          : sanitizeText(formData.equipment_type, 100),
      };

      const { data: asset, error: assetError } = await registerEquipment(payload);
      if (assetError) throw assetError;
      if (!asset?.id) throw new Error("Equipment was created but asset ID was not returned.");

      const certNumber = await generateCertNumber(formData.serial_number, asset.id);

      const certificatePayload = {
        certificate_number: certNumber,
        certificate_type: formData.cert_type || "Inspection Certificate",
        asset_id: asset.id,
        company: selectedClient.company_name,
        equipment_description: sanitizeText(formData.equipment_type, 100),
        equipment_location: sanitizeText(formData.location, 150) || null,
        equipment_id:
          sanitizeText(formData.identification_number, 80) ||
          sanitizeText(formData.equipment_id, 80) ||
          sanitizeText(formData.serial_number, 80) ||
          asset.asset_tag,
        lanyard_serial_no: sanitizeText(formData.lanyard_serial_no, 80) || null,
        swl: sanitizeText(formData.safe_working_load, 50) || null,
        mawp: sanitizeText(formData.working_pressure, 50) || null,
        capacity: sanitizeText(formData.capacity_volume, 50) || null,
        country_of_origin: sanitizeText(formData.country_of_origin, 80) || null,
        year_built: sanitizeText(formData.year_built, 20) || null,
        manufacturer: sanitizeText(formData.manufacturer, 100) || null,
        model: sanitizeText(formData.model, 100) || null,
        equipment_status: "PASS",
        issued_at: formData.last_inspection_date
          ? new Date(formData.last_inspection_date).toISOString()
          : new Date().toISOString(),
        valid_to: formData.next_inspection_date || null,
        status: "issued",
        legal_framework: sanitizeText(formData.design_standard, 120) || null,
        inspector_name: sanitizeText(formData.inspector_name, 100) || null,
        inspector_id: sanitizeText(formData.inspector_id, 80) || null,
        logo_url: "/logo.png",
      };

      const { error: certError } = await supabase
        .from("certificates")
        .insert([certificatePayload]);

      if (certError) throw certError;

      router.push(`/equipment/${asset.asset_tag}`);
    } catch (err) {
      setSubmitError(err?.message || "Failed to register equipment.");
    } finally {
      setLoading(false);
    }
  };

  const isPressureEquipment = PRESSURE_EQUIPMENT_TYPES.includes(formData.equipment_type);
  const isLiftingEquipment = LIFTING_EQUIPMENT_TYPES.includes(formData.equipment_type);
  const hasLanyardField = LANYARD_EQUIPMENT_TYPES.includes(formData.equipment_type);

  return (
    <AppLayout title="Register Equipment">
      <style>{`
        select { background:#1a1f2e !important; color:#e2e8f0 !important; }
        select option { background:#111827 !important; color:#f8fafc !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.8); cursor:pointer; }
      `}</style>

      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <button
            type="button"
            onClick={() => router.push("/equipment")}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:6,
              padding:"7px 14px",
              borderRadius:8,
              cursor:"pointer",
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.1)",
              color:"#94a3b8",
              fontSize:12,
              fontWeight:600,
              fontFamily:"inherit",
            }}
          >
            ← Back to Equipment
          </button>
          <span style={{ color:"#334155" }}>›</span>
          <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>Register</span>
        </div>

        <h1 style={{ margin:0, fontSize:"clamp(22px,4vw,32px)", fontWeight:900, color:"#fff" }}>
          Register Equipment
        </h1>
        <div
          style={{
            marginTop:8,
            width:72,
            height:4,
            borderRadius:999,
            background:`linear-gradient(90deg,${C.green},${C.purple},${C.blue})`,
          }}
        />
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:"8px 0 0" }}>
          Asset tag is auto generated by the system. Certificate number stays auto generated in this format:
          <strong style={{ color:"#e2e8f0" }}> CERT - Serial Number - 01</strong> and continues upward automatically.
        </p>
      </div>

      {submitError && (
        <div
          style={{
            background:"rgba(244,114,182,0.1)",
            border:"1px solid rgba(244,114,182,0.3)",
            borderRadius:12,
            padding:"12px 16px",
            marginBottom:20,
            color:C.pink,
            fontSize:13,
          }}
        >
          ⚠️ {submitError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
          border:"1px solid rgba(102,126,234,0.2)",
          borderRadius:16,
          padding:28,
          maxWidth:900,
        }}
      >
        <div style={sectionHeadStyle}>⚙️ Equipment Identity</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Asset Tag</label>
            <input
              style={{ ...inputStyle, opacity:0.7, cursor:"not-allowed" }}
              type="text"
              value="Auto generated by system"
              readOnly
            />
          </div>

          <div>
            <label style={labelStyle}>Serial Number / ID No. *</label>
            <input
              style={inputStyle}
              type="text"
              name="serial_number"
              value={formData.serial_number}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Equipment ID</label>
            <input
              style={inputStyle}
              type="text"
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              placeholder="Optional equipment ID"
            />
          </div>

          <div>
            <label style={labelStyle}>Identification Number</label>
            <input
              style={inputStyle}
              type="text"
              name="identification_number"
              value={formData.identification_number}
              onChange={handleChange}
              placeholder="Optional identification number"
            />
          </div>

          <div>
            <label style={labelStyle}>Inspection No.</label>
            <input
              style={inputStyle}
              type="text"
              name="inspection_no"
              value={formData.inspection_no}
              onChange={handleChange}
              placeholder="Optional inspection number"
            />
          </div>

          {hasLanyardField && (
            <div>
              <label style={labelStyle}>
                Lanyard Serial No.
                <span
                  style={{
                    marginLeft:6,
                    fontSize:9,
                    color:"#00f5c4",
                    background:"rgba(0,245,196,0.1)",
                    border:"1px solid rgba(0,245,196,0.3)",
                    borderRadius:4,
                    padding:"1px 5px",
                  }}
                >
                  displayed on certificate
                </span>
              </label>
              <input
                style={{ ...inputStyle, borderColor:"rgba(0,245,196,0.35)" }}
                type="text"
                name="lanyard_serial_no"
                value={formData.lanyard_serial_no}
                onChange={handleChange}
                placeholder="e.g. 0135"
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Equipment Type *</label>
            <SelectField name="equipment_type" value={formData.equipment_type} onChange={handleChange}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Manufacturer *</label>
            <input
              style={inputStyle}
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Model / Drawing No.</label>
            <input
              style={inputStyle}
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>Year Built</label>
            <input
              style={inputStyle}
              type="text"
              name="year_built"
              placeholder="Type freely"
              value={formData.year_built}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>Country of Origin</label>
            <input
              style={inputStyle}
              type="text"
              name="country_of_origin"
              value={formData.country_of_origin}
              onChange={handleChange}
              placeholder="e.g. South Africa"
            />
          </div>
        </div>

        <div style={sectionHeadStyle}>🏢 Ownership & Site</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Client *</label>
            <SelectField
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
              disabled={clientsLoading}
            >
              <option value="">{clientsLoading ? "Loading clients..." : "Select registered client"}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} {c.company_code ? `(${c.company_code})` : ""}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Location / Town *</label>
            <BotswanaLocationPicker
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Department / Plant</label>
            <input
              style={inputStyle}
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={sectionHeadStyle}>📜 Certificate Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Certificate Type *</label>
            <SelectField name="cert_type" value={formData.cert_type} onChange={handleChange}>
              {CERT_TYPES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Inspection Frequency</label>
            <SelectField name="inspection_freq" value={formData.inspection_freq} onChange={handleChange}>
              {INSPECTION_FREQS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>License Status</label>
            <SelectField name="license_status" value={formData.license_status} onChange={handleChange}>
              <option value="valid">valid</option>
              <option value="expiring">expiring</option>
              <option value="expired">expired</option>
            </SelectField>
          </div>
        </div>

        <div style={sectionHeadStyle}>📐 Design & Technical Parameters</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Shell / Body Material</label>
            <SelectField name="shell_material" value={formData.shell_material} onChange={handleChange}>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Design Standard</label>
            <SelectField name="design_standard" value={formData.design_standard} onChange={handleChange}>
              {STANDARDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectField>
          </div>

          {isPressureEquipment && (
            <>
              <div>
                <label style={labelStyle}>Fluid / Contents Type</label>
                <SelectField name="fluid_type" value={formData.fluid_type} onChange={handleChange}>
                  {FLUID_TYPES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </SelectField>
              </div>

              <div>
                <label style={labelStyle}>Design Pressure</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="design_pressure"
                  value={formData.design_pressure}
                  onChange={handleChange}
                  placeholder="e.g. 1500 kPa"
                />
              </div>

              <div>
                <label style={labelStyle}>Working Pressure</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="working_pressure"
                  value={formData.working_pressure}
                  onChange={handleChange}
                  placeholder="e.g. 1200 kPa"
                />
              </div>

              <div>
                <label style={labelStyle}>Test Pressure</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="test_pressure"
                  value={formData.test_pressure}
                  onChange={handleChange}
                  placeholder="e.g. 2250 kPa"
                />
              </div>

              <div>
                <label style={labelStyle}>Design Temperature</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="design_temperature"
                  value={formData.design_temperature}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={labelStyle}>Volume / Capacity</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="capacity_volume"
                  value={formData.capacity_volume}
                  onChange={handleChange}
                  placeholder="e.g. 200 L"
                />
              </div>
            </>
          )}

          {isLiftingEquipment && (
            <>
              <div>
                <label style={labelStyle}>SWL</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="safe_working_load"
                  value={formData.safe_working_load}
                  onChange={handleChange}
                  placeholder="e.g. STANDARD or 2.5 Tons"
                />
              </div>

              <div>
                <label style={labelStyle}>Proof Load</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="proof_load"
                  value={formData.proof_load}
                  onChange={handleChange}
                  placeholder="e.g. 3 Tons"
                />
              </div>

              <div>
                <label style={labelStyle}>Lift Height</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="lifting_height"
                  value={formData.lifting_height}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={labelStyle}>Sling Length</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="sling_length"
                  value={formData.sling_length}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={labelStyle}>Chain Size</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="chain_size"
                  value={formData.chain_size}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={labelStyle}>Rope / Wire Diameter</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="rope_diameter"
                  value={formData.rope_diameter}
                  onChange={handleChange}
                />
              </div>
            </>
          )}
        </div>

        <div style={sectionHeadStyle}>👷 Inspector Details</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Inspector Name</label>
            <input
              style={inputStyle}
              type="text"
              name="inspector_name"
              value={formData.inspector_name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>Inspector ID</label>
            <input
              style={inputStyle}
              type="text"
              name="inspector_id"
              value={formData.inspector_id}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={sectionHeadStyle}>📅 Inspection & Service Dates</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Last Inspection Date</label>
            <input
              style={inputStyle}
              type="date"
              name="last_inspection_date"
              value={formData.last_inspection_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>Next Inspection Due</label>
            <input
              style={inputStyle}
              type="date"
              name="next_inspection_date"
              value={formData.next_inspection_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>License Expiry</label>
            <input
              style={inputStyle}
              type="date"
              name="license_expiry"
              value={formData.license_expiry}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={sectionHeadStyle}>📘 Operational Status</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Condition</label>
            <input
              style={inputStyle}
              type="text"
              name="condition"
              value={formData.condition}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <SelectField name="status" value={formData.status} onChange={handleChange}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </SelectField>
          </div>
        </div>

        <div style={sectionHeadStyle}>📝 Notes</div>
        <div style={{ marginBottom:24 }}>
          <textarea
            style={{ ...inputStyle, minHeight:100, resize:"vertical" }}
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div
          style={{
            display:"flex",
            gap:12,
            justifyContent:"flex-end",
            paddingTop:16,
            borderTop:"1px solid rgba(102,126,234,0.12)",
            flexWrap:"wrap",
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding:"11px 24px",
              borderRadius:8,
              cursor:"pointer",
              fontFamily:"inherit",
              fontWeight:700,
              background:"rgba(102,126,234,0.1)",
              border:"1px solid rgba(102,126,234,0.25)",
              color:"#667eea",
            }}
          >
            Clear Form
          </button>

          <button
            type="submit"
            disabled={loading || clientsLoading}
            style={{
              padding:"11px 28px",
              borderRadius:8,
              cursor:loading ? "wait" : "pointer",
              fontFamily:"inherit",
              fontWeight:700,
              background:"linear-gradient(135deg,#667eea,#764ba2)",
              border:"none",
              color:"#fff",
              boxShadow:"0 0 20px rgba(102,126,234,0.4)",
              opacity:loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : "Register Equipment"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
