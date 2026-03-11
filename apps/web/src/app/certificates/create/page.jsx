"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

const PRESSURE_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
];

const LIFTING_TYPES = [
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
  "Overhead Crane",
  "Forklift Attachment",
];

const STATUS_OPTIONS = ["PASS", "FAIL", "CONDITIONAL"];

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

function SelectField({ name, value, onChange, children, required = false }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          ...inputStyle,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          paddingRight: 40,
          background: "#1a1f2e",
          color: "#e2e8f0",
          cursor: "pointer",
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

export default function CreateCertificatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentList, setEquipmentList] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    asset_id: "",
    certificate_type: "Pressure Test Certificate",
    status: "PASS",
    inspector_name: "",
    inspector_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    inspection_date: new Date().toISOString().slice(0, 10),
    valid_to: "",
    company: "",
    equipment_description: "",
    equipment_location: "",
    equipment_id: "",
    equipment_category: "",
    legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
    equipment_status: "PASS",
    compliance_notes: "",
    inspection_method: "",
    waiver_issue_date: "",
    waiver_expiry_date: "",
    waiver_reference: "",
    waiver_conditions: "",
    waiver_restrictions: "",
    signature_url: "",
    logo_url: "/monroy-logo.png",
  });

  useEffect(() => {
    async function loadEquipment() {
      setEquipmentLoading(true);

      const { data, error } = await supabase
        .from("assets")
        .select(`
          id,
          asset_tag,
          asset_name,
          asset_type,
          manufacturer,
          model,
          serial_number,
          year_built,
          location,
          design_standard,
          design_pressure,
          working_pressure,
          test_pressure,
          design_temperature,
          capacity_volume,
          safe_working_load,
          proof_load,
          lifting_height,
          sling_length,
          chain_size,
          rope_diameter,
          shell_material,
          fluid_type,
          notes,
          next_inspection_date,
          clients (
            company_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setEquipmentList([]);
      } else {
        setEquipmentList(data || []);
      }

      setEquipmentLoading(false);
    }

    loadEquipment();
  }, []);

  const selectedEquipment = useMemo(() => {
    return equipmentList.find((item) => item.id === form.asset_id) || null;
  }, [equipmentList, form.asset_id]);

  useEffect(() => {
    if (!selectedEquipment) return;

    const assetType = selectedEquipment.asset_type || "";
    const isPressure = PRESSURE_TYPES.includes(assetType);
    const isLifting = LIFTING_TYPES.includes(assetType);

    setForm((prev) => ({
      ...prev,
      company: selectedEquipment.clients?.company_name || "",
      equipment_description: selectedEquipment.asset_name || assetType || "",
      equipment_location: selectedEquipment.location || "",
      equipment_id: selectedEquipment.asset_tag || "",
      equipment_category: assetType || "",
      certificate_type: isPressure
        ? "Pressure Test Certificate"
        : isLifting
        ? "Load Test Certificate"
        : "Certificate of Statutory Inspection",
      equipment_status: prev.status,
      valid_to: selectedEquipment.next_inspection_date || prev.valid_to,
      inspection_method: isPressure
        ? "Visual Examination / Ultrasonic Thickness Testing / Hydrostatic Pressure Test"
        : isLifting
        ? "Visual Examination / Functional Test / Proof Load Test"
        : "Visual Examination / Statutory Inspection",
      compliance_notes:
        "This certificate is issued in compliance with the Mines, Quarries, Works and Machinery Act Cap 44:02.",
    }));
  }, [selectedEquipment]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "status" ? { equipment_status: value } : {}),
    }));
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError("");

      const ext = file.name.split(".").pop();
      const fileName = `signature-${Date.now()}.${ext}`;
      const path = `certificate-signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("documents").getPublicUrl(path);

      setForm((prev) => ({
        ...prev,
        signature_url: data?.publicUrl || "",
      }));
    } catch (err) {
      setError(err?.message || "Failed to upload signature.");
    } finally {
      setLoading(false);
    }
  };

  const buildNameplatePayload = (asset) => {
    if (!asset) return {};

    const isPressure = PRESSURE_TYPES.includes(asset.asset_type || "");
    const isLifting = LIFTING_TYPES.includes(asset.asset_type || "");

    if (isPressure) {
      return {
        design_code: asset.design_standard || null,
        material: asset.shell_material || null,
        mawp: asset.working_pressure ? `${asset.working_pressure} kPa` : null,
        swl: null,
        thickness: null,
        diameter: null,
        height: null,
        weight: null,
        extra_json: {
          design_pressure: asset.design_pressure ? `${asset.design_pressure} kPa` : null,
          test_pressure: asset.test_pressure ? `${asset.test_pressure} kPa` : null,
          design_temperature: asset.design_temperature || null,
          capacity_volume: asset.capacity_volume || null,
          fluid_type: asset.fluid_type || null,
          year_built: asset.year_built || null,
          manufacturer: asset.manufacturer || null,
          model: asset.model || null,
          serial_number: asset.serial_number || null,
        },
      };
    }

    if (isLifting) {
      return {
        design_code: asset.design_standard || null,
        material: asset.shell_material || null,
        mawp: null,
        swl: asset.safe_working_load ? `${asset.safe_working_load} Tons` : null,
        thickness: null,
        diameter: null,
        height: asset.lifting_height || null,
        weight: null,
        extra_json: {
          proof_load: asset.proof_load ? `${asset.proof_load} Tons` : null,
          sling_length: asset.sling_length || null,
          chain_size: asset.chain_size || null,
          rope_diameter: asset.rope_diameter || null,
          year_built: asset.year_built || null,
          manufacturer: asset.manufacturer || null,
          model: asset.model || null,
          serial_number: asset.serial_number || null,
        },
      };
    }

    return {
      design_code: asset.design_standard || null,
      material: asset.shell_material || null,
      mawp: asset.working_pressure || null,
      swl: asset.safe_working_load || null,
      thickness: null,
      diameter: null,
      height: null,
      weight: null,
      extra_json: {
        year_built: asset.year_built || null,
        manufacturer: asset.manufacturer || null,
        model: asset.model || null,
        serial_number: asset.serial_number || null,
      },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEquipment) {
      setError("Please select equipment.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const insertPayload = {
        certificate_type: form.certificate_type,
        asset_id: form.asset_id,
        company: form.company || null,
        equipment_description: form.equipment_description || null,
        equipment_location: form.equipment_location || null,
        equipment_id: form.equipment_id || null,
        equipment_status: form.equipment_status || null,
        legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
        inspector_name: form.inspector_name || null,
        inspector_id: form.inspector_id || null,
        issued_at: form.issue_date ? new Date(form.issue_date).toISOString() : new Date().toISOString(),
        valid_to: form.valid_to || null,
        status: "issued",
        pdf_url: null,
        signature_url: form.signature_url || null,
        logo_url: "/monroy-logo.png",
        swl: selectedEquipment.safe_working_load
          ? `${selectedEquipment.safe_working_load} Tons`
          : null,
        mawp: selectedEquipment.working_pressure
          ? `${selectedEquipment.working_pressure} kPa`
          : null,
      };

      const { data: cert, error: certError } = await supabase
        .from("certificates")
        .insert([insertPayload])
        .select("*")
        .single();

      if (certError) throw certError;

      const nameplatePayload = buildNameplatePayload(selectedEquipment);

      await supabase
        .from("asset_nameplate")
        .upsert([
          {
            asset_id: selectedEquipment.id,
            design_code: nameplatePayload.design_code,
            material: nameplatePayload.material,
            mawp: nameplatePayload.mawp,
            swl: nameplatePayload.swl,
            thickness: nameplatePayload.thickness,
            diameter: nameplatePayload.diameter,
            height: nameplatePayload.height,
            weight: nameplatePayload.weight,
          },
        ], { onConflict: "asset_id" });

      router.push(`/certificates/${cert.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create certificate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Create Certificate">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#fff" }}>
          Create Certificate
        </h1>
        <div style={{ marginTop: 8, width: 72, height: 4, borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
      </div>

      {error && (
        <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.pink, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))", border: "1px solid rgba(102,126,234,0.2)", borderRadius: 16, padding: 28, maxWidth: 980 }}>
        <div style={sectionHeadStyle}>Certificate Setup</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Select Equipment *</label>
            <SelectField name="asset_id" value={form.asset_id} onChange={handleChange} required>
              <option value="">{equipmentLoading ? "Loading equipment..." : "Select equipment"}</option>
              {equipmentList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.asset_tag} - {item.asset_name || item.asset_type || "Equipment"}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Certificate Type</label>
            <input style={inputStyle} type="text" value={form.certificate_type} readOnly />
          </div>

          <div>
            <label style={labelStyle}>Issue Date *</label>
            <input style={inputStyle} type="date" name="issue_date" value={form.issue_date} onChange={handleChange} required />
          </div>

          <div>
            <label style={labelStyle}>Inspection Date *</label>
            <input style={inputStyle} type="date" name="inspection_date" value={form.inspection_date} onChange={handleChange} required />
          </div>

          <div>
            <label style={labelStyle}>Expiry Date</label>
            <input style={inputStyle} type="date" name="valid_to" value={form.valid_to} onChange={handleChange} />
          </div>

          <div>
            <label style={labelStyle}>Inspector Name *</label>
            <input style={inputStyle} type="text" name="inspector_name" value={form.inspector_name} onChange={handleChange} required placeholder="Type inspector name" />
          </div>

          <div>
            <label style={labelStyle}>Inspector ID / Registration</label>
            <input style={inputStyle} type="text" name="inspector_id" value={form.inspector_id} onChange={handleChange} placeholder="Type inspector ID" />
          </div>

          <div>
            <label style={labelStyle}>Inspection Result *</label>
            <SelectField name="status" value={form.status} onChange={handleChange} required>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </SelectField>
          </div>

          <div>
            <label style={labelStyle}>Legal Compliance</label>
            <input style={inputStyle} type="text" value="Mines, Quarries, Works and Machinery Act Cap 44:02" readOnly />
          </div>

          <div>
            <label style={labelStyle}>Upload Signature</label>
            <input
              style={inputStyle}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
            />
          </div>
        </div>

        {form.status === "CONDITIONAL" && (
          <>
            <div style={sectionHeadStyle}>Conditional Approval / Waiver</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Waiver Issue Date</label>
                <input style={inputStyle} type="date" name="waiver_issue_date" value={form.waiver_issue_date} onChange={handleChange} />
              </div>

              <div>
                <label style={labelStyle}>Waiver Expiry Date</label>
                <input style={inputStyle} type="date" name="waiver_expiry_date" value={form.waiver_expiry_date} onChange={handleChange} />
              </div>

              <div>
                <label style={labelStyle}>Waiver Reference No.</label>
                <input style={inputStyle} type="text" name="waiver_reference" value={form.waiver_reference} onChange={handleChange} placeholder="e.g. WAV-2026-001" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Non-Conformance / Rectification Required</label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} name="waiver_conditions" value={form.waiver_conditions} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Operating Restrictions During Waiver Period</label>
              <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} name="waiver_restrictions" value={form.waiver_restrictions} onChange={handleChange} />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid rgba(102,126,234,0.12)" }}>
          <button
            type="button"
            onClick={() => router.push("/certificates")}
            style={{ padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "11px 28px", borderRadius: 8, cursor: loading ? "wait" : "pointer", fontWeight: 700, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating..." : "Create Certificate"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
