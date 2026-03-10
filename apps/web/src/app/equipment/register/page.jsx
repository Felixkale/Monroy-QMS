"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

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

const PRESSURE_EQUIPMENT_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
];

const LIFTING_EQUIPMENT_TYPES = [
  "Trestle Jack",
  "Lever Hoist",
  "Bottle Jack",
  "Safety Harness",
  "Jack Stand",
  "Chain Block",
  "Bow Shackle",
  "Mobile Crane",
  "Trolley Jack",
  "Step Ladders",
  "Tifor",
  "Crawl Beam",
  "Beam Crawl",
  "Beam Clamp",
  "Webbing Sling",
  "Nylon Sling",
  "Wire Sling",
  "Fall Arrest",
  "Man Cage",
  "Shutter Clamp",
  "Drum Clamp",
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
  "Compliance Certificate",
  "Pressure Test Certificate",
  "NDT Certificate",
  "Compliance and Test Certificate",
];

const INSPECTION_FREQS = ["3 Months", "6 Months", "12 Months", "24 Months"];

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

function SelectField({ name, value, onChange, required = false, disabled = false, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        style={{
          ...inputStyle,
          cursor: disabled ? "not-allowed" : "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          paddingRight: 40,
          background: "#1a1f2e",
          color: "#e2e8f0",
        }}
      >
        {children}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#94a3b8",
          pointerEvents: "none",
          fontSize: 12,
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
      onChange({ target: { name, value: "" } });
    } else {
      setManual(false);
      onChange(e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

const emptyForm = {
  serial_number: "",
  equipment_type: "Pressure Vessel",
  manufacturer: "",
  model: "",
  year_built: "",
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
  proof_load: "",
  lifting_height: "",
  sling_length: "",
  chain_size: "",
  rope_diameter: "",
  last_inspection_date: "",
  next_inspection_date: "",
  license_status: "valid",
  license_expiry: "",
  condition: "Good",
  status: "active",
  notes: "",
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
        .select("id, company_name, company_code, status")
        .eq("status", "active")
        .order("company_name", { ascending: true });

      if (!error) {
        setClients(data || []);
      } else {
        setClients([]);
      }

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

        if (pressure) {
          next.safe_working_load = "";
          next.proof_load = "";
          next.lifting_height = "";
          next.sling_length = "";
          next.chain_size = "";
          next.rope_diameter = "";
        }

        if (lifting) {
          next.design_pressure = "";
          next.working_pressure = "";
          next.test_pressure = "";
          next.design_temperature = "";
          next.capacity_volume = "";
          next.fluid_type = "";
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
        }
      }

      return next;
    });
  };

  const handleClear = () => {
    setFormData(emptyForm);
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      const selectedClient = clients.find((c) => c.id === formData.client_id);

      if (!selectedClient) {
        throw new Error("Please select a registered client.");
      }

      const assetName = formData.model
        ? `${formData.equipment_type} - ${formData.model}`
        : `${formData.equipment_type} - ${formData.serial_number}`;

      const payload = {
        asset_name: assetName,
        client_id: formData.client_id,
        asset_type: formData.equipment_type,
        serial_number: formData.serial_number,
        manufacturer: formData.manufacturer,
        model: formData.model,
        year_built: formData.year_built,
        location: formData.location,
        department: formData.department,
        cert_type: formData.cert_type,
        design_standard: formData.design_standard,
        inspection_freq: formData.inspection_freq,
        shell_material: formData.shell_material,
        fluid_type: formData.fluid_type,
        design_pressure: formData.design_pressure,
        working_pressure: formData.working_pressure,
        test_pressure: formData.test_pressure,
        design_temperature: formData.design_temperature,
        capacity_volume: formData.capacity_volume,
        safe_working_load: formData.safe_working_load,
        proof_load: formData.proof_load,
        lifting_height: formData.lifting_height,
        sling_length: formData.sling_length,
        chain_size: formData.chain_size,
        rope_diameter: formData.rope_diameter,
        last_inspection_date: formData.last_inspection_date,
        next_inspection_date: formData.next_inspection_date,
        license_status: formData.license_status,
        license_expiry: formData.license_expiry,
        condition: formData.condition,
        status: formData.status,
        notes: formData.notes,
        description: formData.notes
          ? `${formData.equipment_type} | ${formData.notes}`
          : formData.equipment_type,
      };

      const { data: asset, error: assetError } = await registerEquipment(payload);
      if (assetError) throw assetError;

      const { data: certificate, error: certError } = await supabase
        .from("certificates")
        .insert([
          {
            certificate_type: formData.cert_type || "Compliance Certificate",
            asset_id: asset.id,
            company: selectedClient.company_name,
            equipment_description: formData.equipment_type,
            equipment_location: formData.location || null,
            equipment_id: asset.asset_tag,
            swl: formData.safe_working_load
              ? `${formData.safe_working_load} Tons`
              : null,
            mawp: formData.working_pressure
              ? `${formData.working_pressure} kPa`
              : null,
            equipment_status: "PASS",
            issued_at: new Date().toISOString(),
            valid_to: formData.next_inspection_date || null,
            status: "issued",
            legal_framework: formData.design_standard || null,
          },
        ])
        .select("id, certificate_number")
        .single();

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

  return (
    <AppLayout title="Register Equipment">
      <style>{`
        select {
          background: #1a1f2e !important;
          color: #e2e8f0 !important;
        }
        select option {
          background: #111827 !important;
          color: #f8fafc !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8);
          cursor: pointer;
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#fff" }}>
          Register Equipment
        </h1>
        <div style={{ marginTop: 8, width: 72, height: 4, borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>
          Equipment tag is auto generated as CERT-01, CERT-02, CERT-03 and continues automatically.
        </p>
      </div>

      {submitError && (
        <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.pink, fontSize: 13 }}>
          ⚠️ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))", border: "1px solid rgba(102,126,234,0.2)", borderRadius: 16, padding: 28, maxWidth: 900, overflow: "visible" }}>
        <div style={sectionHeadStyle}>⚙️ Equipment Identity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Equipment Tag</label>
            <input style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed" }} type="text" value="Auto generated, example CERT-01" readOnly />
          </div>

          <div>
            <label style={labelStyle}>Serial Number *</label>
            <input style={inputStyle} type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} required />
          </div>

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
            <input style={inputStyle} type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} required />
          </div>

          <div>
            <label style={labelStyle}>Model / Drawing No.</label>
            <input style={inputStyle} type="text" name="model" value={formData.model} onChange={handleChange} />
          </div>

          <div>
            <label style={labelStyle}>Year Built</label>
            <input
              style={inputStyle}
              type="text"
              name="year_built"
              value={formData.year_built}
              onChange={handleChange}
              placeholder="Type freely"
            />
          </div>
        </div>

        <div style={sectionHeadStyle}>🏢 Ownership & Site</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Client *</label>
            <SelectField name="client_id" value={formData.client_id} onChange={handleChange} required disabled={clientsLoading}>
              <option value="">{clientsLoading ? "Loading clients..." : "Select registered client"}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name} {client.company_code ? `(${client.company_code})` : ""}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Location / Town *</label>
            <BotswanaLocationPicker name="location" value={formData.location} onChange={handleChange} required />
          </div>

          <div>
            <label style={labelStyle}>Department / Plant</label>
            <input style={inputStyle} type="text" name="department" value={formData.department} onChange={handleChange} />
          </div>
        </div>

        <div style={sectionHeadStyle}>📜 Certificate Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
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
                <label style={labelStyle}>Design Pressure (kPa)</label>
                <input style={inputStyle} type="text" name="design_pressure" value={formData.design_pressure} onChange={handleChange} placeholder="Manual text, unit is kPa" />
              </div>

              <div>
                <label style={labelStyle}>Working Pressure (kPa)</label>
                <input style={inputStyle} type="text" name="working_pressure" value={formData.working_pressure} onChange={handleChange} placeholder="Manual text, unit is kPa" />
              </div>

              <div>
                <label style={labelStyle}>Test Pressure (kPa)</label>
                <input style={inputStyle} type="text" name="test_pressure" value={formData.test_pressure} onChange={handleChange} placeholder="Manual text, unit is kPa" />
              </div>

              <div>
                <label style={labelStyle}>Design Temperature</label>
                <input style={inputStyle} type="text" name="design_temperature" value={formData.design_temperature} onChange={handleChange} />
              </div>

              <div>
                <label style={labelStyle}>Volume / Capacity</label>
                <input style={inputStyle} type="text" name="capacity_volume" value={formData.capacity_volume} onChange={handleChange} />
              </div>
            </>
          )}

          {isLiftingEquipment && (
            <>
              <div>
                <label style={labelStyle}>SWL (Tons)</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="safe_working_load"
                  value={formData.safe_working_load}
                  onChange={handleChange}
                  placeholder="Manual text, unit is Tons"
                />
              </div>

              <div>
                <label style={labelStyle}>Proof Load (Tons)</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="proof_load"
                  value={formData.proof_load}
                  onChange={handleChange}
                  placeholder="Manual text, unit is Tons"
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
                  placeholder="Fully manual text"
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
                  placeholder="Fully manual text"
                />
              </div>

              <div>
                <label style={labelStyle}>Chain Size</label>
                <input style={inputStyle} type="text" name="chain_size" value={formData.chain_size} onChange={handleChange} />
              </div>

              <div>
                <label style={labelStyle}>Rope / Wire Diameter</label>
                <input style={inputStyle} type="text" name="rope_diameter" value={formData.rope_diameter} onChange={handleChange} />
              </div>
            </>
          )}
        </div>

        <div style={sectionHeadStyle}>📅 Inspection & Service Dates</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Last Inspection Date</label>
            <input style={inputStyle} type="date" name="last_inspection_date" value={formData.last_inspection_date} onChange={handleChange} />
          </div>

          <div>
            <label style={labelStyle}>Next Inspection Due</label>
            <input style={inputStyle} type="date" name="next_inspection_date" value={formData.next_inspection_date} onChange={handleChange} />
          </div>

          <div>
            <label style={labelStyle}>License Expiry</label>
            <input style={inputStyle} type="date" name="license_expiry" value={formData.license_expiry} onChange={handleChange} />
          </div>
        </div>

        <div style={sectionHeadStyle}>📘 Operational Status</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Condition</label>
            <input style={inputStyle} type="text" name="condition" value={formData.condition} onChange={handleChange} />
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
        <div style={{ marginBottom: 24 }}>
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} name="notes" value={formData.notes} onChange={handleChange} />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid rgba(102,126,234,0.12)" }}>
          <button type="button" onClick={handleClear} style={{ padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, background: "rgba(102,126,234,0.1)", border: "1px solid rgba(102,126,234,0.25)", color: "#667eea" }}>
            Clear Form
          </button>

          <button type="submit" disabled={loading || clientsLoading} style={{ padding: "11px 28px", borderRadius: 8, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "#fff", boxShadow: "0 0 20px rgba(102,126,234,0.4)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : "Register Equipment"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
