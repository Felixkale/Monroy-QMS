"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInspectionWithCertificate } from "@/services/inspections";

const DEFAULT_FORM = {
  asset_id: "",
  inspection_date: "",
  inspection_type: "",
  status: "PASS",
  equipment_status: "PASS",
  result: "",
  company: "",
  equipment_description: "",
  equipment_location: "",
  equipment_id: "",
  identification_number: "",
  inspection_no: "",
  lanyard_serial_no: "",
  manufacturer: "",
  model: "",
  year_built: "",
  country_of_origin: "",
  capacity: "",
  mawp: "",
  design_pressure: "",
  test_pressure: "",
  swl: "",
  proof_load: "",
  lifting_height: "",
  sling_length: "",
  chain_size: "",
  rope_diameter: "",
  legal_framework: "",
  inspector_name: "",
  inspector_id: "",
  logo_url: "",
  signature_url: "",
  issued_at: "",
  valid_to: "",
};

function fieldStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e2e8f0",
    outline: "none",
    fontSize: 14,
  };
}

function labelStyle() {
  return {
    display: "block",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

export default function InspectionCreateClient() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const { certificate } = await createInspectionWithCertificate(form);

      alert("Inspection and certificate saved successfully.");
      router.push(`/certificates/${certificate.id}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save inspection and certificate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        padding: 24,
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            Create Inspection
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            Save inspection details and automatically create the certificate.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Basic Details
            </h2>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <div>
                <label style={labelStyle()}>Asset ID</label>
                <input
                  value={form.asset_id}
                  onChange={(e) => updateField("asset_id", e.target.value)}
                  placeholder="Asset ID"
                  required
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Inspection Date</label>
                <input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => updateField("inspection_date", e.target.value)}
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Inspection Type</label>
                <input
                  value={form.inspection_type}
                  onChange={(e) => updateField("inspection_type", e.target.value)}
                  placeholder="Inspection Type"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    updateField("status", e.target.value);
                    updateField("equipment_status", e.target.value);
                  }}
                  style={fieldStyle()}
                >
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="CONDITIONAL PASS">CONDITIONAL PASS</option>
                  <option value="REPAIR">REPAIR</option>
                </select>
              </div>

              <div>
                <label style={labelStyle()}>Company</label>
                <input
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="Company"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Result</label>
                <input
                  value={form.result}
                  onChange={(e) => updateField("result", e.target.value)}
                  placeholder="Result"
                  style={fieldStyle()}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Equipment Details
            </h2>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <div>
                <label style={labelStyle()}>Equipment Description</label>
                <input
                  value={form.equipment_description}
                  onChange={(e) =>
                    updateField("equipment_description", e.target.value)
                  }
                  placeholder="Equipment Description"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Equipment Location</label>
                <input
                  value={form.equipment_location}
                  onChange={(e) =>
                    updateField("equipment_location", e.target.value)
                  }
                  placeholder="Equipment Location"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Equipment ID</label>
                <input
                  value={form.equipment_id}
                  onChange={(e) => updateField("equipment_id", e.target.value)}
                  placeholder="Equipment ID"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Identification Number</label>
                <input
                  value={form.identification_number}
                  onChange={(e) =>
                    updateField("identification_number", e.target.value)
                  }
                  placeholder="Identification Number"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Inspection Number</label>
                <input
                  value={form.inspection_no}
                  onChange={(e) => updateField("inspection_no", e.target.value)}
                  placeholder="Inspection Number"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Lanyard Serial Number</label>
                <input
                  value={form.lanyard_serial_no}
                  onChange={(e) =>
                    updateField("lanyard_serial_no", e.target.value)
                  }
                  placeholder="Lanyard Serial Number"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Manufacturer</label>
                <input
                  value={form.manufacturer}
                  onChange={(e) => updateField("manufacturer", e.target.value)}
                  placeholder="Manufacturer"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Model</label>
                <input
                  value={form.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="Model"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Year Built</label>
                <input
                  value={form.year_built}
                  onChange={(e) => updateField("year_built", e.target.value)}
                  placeholder="Year Built"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Country of Origin</label>
                <input
                  value={form.country_of_origin}
                  onChange={(e) =>
                    updateField("country_of_origin", e.target.value)
                  }
                  placeholder="Country of Origin"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Capacity / Volume</label>
                <input
                  value={form.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  placeholder="Capacity / Volume"
                  style={fieldStyle()}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Pressure / Lifting Values
            </h2>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <div>
                <label style={labelStyle()}>MAWP</label>
                <input
                  value={form.mawp}
                  onChange={(e) => updateField("mawp", e.target.value)}
                  placeholder="MAWP"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Design Pressure</label>
                <input
                  value={form.design_pressure}
                  onChange={(e) =>
                    updateField("design_pressure", e.target.value)
                  }
                  placeholder="Design Pressure"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Test Pressure</label>
                <input
                  value={form.test_pressure}
                  onChange={(e) => updateField("test_pressure", e.target.value)}
                  placeholder="Test Pressure"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Safe Working Load</label>
                <input
                  value={form.swl}
                  onChange={(e) => updateField("swl", e.target.value)}
                  placeholder="Safe Working Load"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Proof Load</label>
                <input
                  value={form.proof_load}
                  onChange={(e) => updateField("proof_load", e.target.value)}
                  placeholder="Proof Load"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Lifting Height</label>
                <input
                  value={form.lifting_height}
                  onChange={(e) => updateField("lifting_height", e.target.value)}
                  placeholder="Lifting Height"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Sling Length</label>
                <input
                  value={form.sling_length}
                  onChange={(e) => updateField("sling_length", e.target.value)}
                  placeholder="Sling Length"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Chain Size</label>
                <input
                  value={form.chain_size}
                  onChange={(e) => updateField("chain_size", e.target.value)}
                  placeholder="Chain Size"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Rope Diameter</label>
                <input
                  value={form.rope_diameter}
                  onChange={(e) => updateField("rope_diameter", e.target.value)}
                  placeholder="Rope Diameter"
                  style={fieldStyle()}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Certificate Details
            </h2>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              <div>
                <label style={labelStyle()}>Legal Framework</label>
                <input
                  value={form.legal_framework}
                  onChange={(e) =>
                    updateField("legal_framework", e.target.value)
                  }
                  placeholder="Legal Framework"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Inspector Name</label>
                <input
                  value={form.inspector_name}
                  onChange={(e) => updateField("inspector_name", e.target.value)}
                  placeholder="Inspector Name"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Inspector ID</label>
                <input
                  value={form.inspector_id}
                  onChange={(e) => updateField("inspector_id", e.target.value)}
                  placeholder="Inspector ID"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Logo URL</label>
                <input
                  value={form.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="Logo URL"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Signature URL</label>
                <input
                  value={form.signature_url}
                  onChange={(e) => updateField("signature_url", e.target.value)}
                  placeholder="Signature URL"
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Issued At</label>
                <input
                  type="date"
                  value={form.issued_at}
                  onChange={(e) => updateField("issued_at", e.target.value)}
                  style={fieldStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Valid To</label>
                <input
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => updateField("valid_to", e.target.value)}
                  style={fieldStyle()}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/inspections")}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "transparent",
                color: "#cbd5e1",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "none",
                background: saving
                  ? "#475569"
                  : "linear-gradient(135deg,#2563eb,#0ea5e9)",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {saving ? "Saving..." : "Save Inspection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
