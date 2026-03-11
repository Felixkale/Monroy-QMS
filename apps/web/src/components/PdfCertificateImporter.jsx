"use client";

import { useState } from "react";
import { extractPdfCertificateFields } from "@/lib/pdf/extractPdfText";

const FIELD_LABELS = {
  certificate_number: "Certificate Number",
  client_name: "Client Name",
  asset_name: "Asset Name",
  asset_type: "Asset Type",
  manufacturer: "Manufacturer",
  model: "Model",
  serial_number: "Serial Number",
  year_built: "Year Built",
  working_pressure_kpa: "Working Pressure (kPa)",
  test_pressure_kpa: "Test Pressure (kPa)",
  swl_tons: "SWL (tons)",
  wll_tons: "WLL (tons)",
  proof_load_tons: "Proof Load (tons)",
  lift_height_m: "Lift Height (m)",
  sling_length_m: "Sling Length (m)",
  installation_date: "Installation Date",
  location: "Location",
  inspection_date: "Inspection Date",
  inspector_name: "Inspector Name",
};

export default function PdfCertificateImporter({ onImport }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (file.type !== "application/pdf") {
        throw new Error("Please upload a PDF file.");
      }

      const extracted = await extractPdfCertificateFields(file);
      setResult(extracted);

      if (typeof onImport === "function") {
        onImport(extracted);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to read PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Import Certificate PDF</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={styles.input}
      />

      {loading && <p style={styles.info}>Reading PDF and extracting fields...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <div style={styles.resultBox}>
          <h3 style={styles.subtitle}>Extracted Fields</h3>

          <div style={styles.grid}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} style={styles.item}>
                <div style={styles.label}>{label}</div>
                <div style={styles.value}>{result[key] ?? "-"}</div>
              </div>
            ))}
          </div>

          <details style={styles.details}>
            <summary style={styles.summary}>Show Raw Extracted Text</summary>
            <pre style={styles.pre}>{result.raw_text}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#111827",
    color: "#fff",
    borderRadius: 16,
    padding: 20,
    border: "1px solid #1f2937",
  },
  title: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 18,
  },
  input: {
    marginBottom: 16,
  },
  info: {
    color: "#93c5fd",
  },
  error: {
    color: "#fca5a5",
    fontWeight: 600,
  },
  resultBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    background: "#0b1220",
    border: "1px solid #243041",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  item: {
    background: "#111827",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #1f2937",
  },
  label: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: 600,
    wordBreak: "break-word",
  },
  details: {
    marginTop: 18,
  },
  summary: {
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: 10,
  },
  pre: {
    whiteSpace: "pre-wrap",
    background: "#030712",
    color: "#d1d5db",
    padding: 12,
    borderRadius: 10,
    maxHeight: 320,
    overflow: "auto",
    fontSize: 12,
    lineHeight: 1.5,
  },
};
