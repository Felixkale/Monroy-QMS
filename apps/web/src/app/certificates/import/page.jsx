"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

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

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function safeParseJson(text) {
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    throw new Error("Paste a JSON array before importing.");
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error("Invalid JSON format. Paste a valid JSON array.");
  }
}

export default function ImportCertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleImport = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!supabase) {
        throw new Error("Supabase not configured.");
      }

      const parsed = safeParseJson(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of certificates.");
      }

      if (parsed.length === 0) {
        throw new Error("JSON array is empty.");
      }

      const payload = parsed.map((item) => ({
        asset_id: normalizeText(item.asset_id),
        certificate_type: normalizeText(
          item.certificate_type,
          "Certificate of Statutory Inspection"
        ),
        company: normalizeText(item.company),
        equipment_description: normalizeText(item.equipment_description),
        equipment_location: normalizeText(item.equipment_location),
        equipment_id: normalizeText(item.equipment_id),
        swl: normalizeText(item.swl),
        mawp: normalizeText(item.mawp),
        equipment_status: normalizeText(item.equipment_status, "PASS"),
        issued_at: item.issued_at
          ? new Date(item.issued_at).toISOString()
          : new Date().toISOString(),
        valid_to: normalizeDate(item.valid_to),
        status: normalizeText(item.status, "issued"),
        legal_framework: normalizeText(
          item.legal_framework,
          "Mines, Quarries, Works and Machinery Act Cap 44:02"
        ),
        inspector_name: normalizeText(item.inspector_name),
        inspector_id: normalizeText(item.inspector_id),
        signature_url: normalizeText(item.signature_url),
        logo_url: normalizeText(item.logo_url, "/logo.png"),
        pdf_url: normalizeText(item.pdf_url),
      }));

      const missingInspector = payload.find((item) => !item.inspector_name);
      if (missingInspector) {
        throw new Error("Every certificate must have inspector_name.");
      }

      const { error: insertError } = await supabase
        .from("certificates")
        .insert(payload);

      if (insertError) throw insertError;

      setSuccess(`Imported ${payload.length} certificate(s) successfully.`);
      setJsonText("");

      setTimeout(() => {
        router.push("/certificates");
      }, 1000);
    } catch (err) {
      setError(err?.message || "Failed to import certificates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Import Certificates">
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ color: "#fff", marginBottom: 16 }}>Import Certificates</h1>

        {error && (
          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#f472b6",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#86efac",
              fontSize: 13,
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Paste JSON Array</label>
          <textarea
            style={{ ...inputStyle, minHeight: 400, resize: "vertical" }}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`[
  {
    "asset_id": "your-asset-id",
    "certificate_type": "Load Test Certificate",
    "company": "Monroy",
    "equipment_description": "Chain Block",
    "equipment_location": "Workshop",
    "equipment_id": "CERT-01",
    "swl": "5 Tons",
    "mawp": null,
    "equipment_status": "PASS",
    "issued_at": "2026-03-11",
    "valid_to": "2027-03-11",
    "status": "issued",
    "legal_framework": "Mines, Quarries, Works and Machinery Act Cap 44:02",
    "inspector_name": "M. Masupe",
    "inspector_id": "INS-001",
    "signature_url": "",
    "logo_url": "/logo.png",
    "pdf_url": ""
  }
]`}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push("/certificates")}
            style={{
              padding: "11px 24px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            style={{
              padding: "11px 28px",
              borderRadius: 8,
              cursor: loading ? "wait" : "pointer",
              fontWeight: 700,
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              border: "none",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Importing..." : "Import Certificates"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
