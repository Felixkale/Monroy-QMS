"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  yellow: "#fbbf24",
};

const rgbaMap = {
  [C.green]: "0,245,196",
  [C.blue]: "79,195,247",
  [C.purple]: "124,92,252",
  [C.pink]: "244,114,182",
  [C.yellow]: "251,191,36",
};

const resultColorMap = {
  pass: C.green,
  fail: C.pink,
  conditional: C.yellow,
};

const resultLabelMap = {
  pass: "Pass",
  fail: "Fail",
  conditional: "Conditional",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadInspection() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("inspections")
          .select(`
            id,
            inspection_number,
            inspection_date,
            inspector_name,
            result,
            notes,
            created_at,
            assets (
              id,
              asset_tag,
              asset_name,
              asset_type,
              serial_number,
              clients (
                id,
                company_name
              )
            )
          `)
          .eq("id", params.id)
          .single();

        if (error) throw error;

        if (!ignore) {
          setInspection(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load inspection.");
          setInspection(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (params?.id) {
      loadInspection();
    }

    return () => {
      ignore = true;
    };
  }, [params?.id]);

  if (loading) {
    return (
      <AppLayout title="Inspection Details">
        <div style={{ padding: "40px 0", color: "#64748b", textAlign: "center" }}>Loading inspection...</div>
      </AppLayout>
    );
  }

  if (error || !inspection) {
    return (
      <AppLayout title="Inspection Not Found">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h2 style={{ color: "#fff", marginBottom: 10 }}>Inspection Not Found</h2>
          <p style={{ color: "#64748b", marginBottom: 20 }}>
            {error || "The requested inspection could not be found."}
          </p>
          <button
            onClick={() => router.push("/inspections")}
            style={{
              padding: "10px 20px",
              background: `linear-gradient(135deg,${C.purple},${C.blue})`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            Back to Inspections
          </button>
        </div>
      </AppLayout>
    );
  }

  const resultKey = (inspection.result || "").toLowerCase();
  const resultColor = resultColorMap[resultKey] || C.blue;
  const resultLabel = resultLabelMap[resultKey] || inspection.result || "—";

  return (
    <AppLayout title={inspection.inspection_number || "Inspection Details"}>
      <div style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: 28 }}>
          <a href="/inspections" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", marginBottom: 10, display: "block" }}>
            ← Back to Inspections
          </a>

          <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, margin: "0 0 8px", color: "#fff" }}>
            {inspection.inspection_number || inspection.id}
          </h1>

          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            Equipment {inspection.assets?.asset_tag || "—"} · {inspection.assets?.clients?.company_name || "—"}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Equipment", value: inspection.assets?.asset_tag || "—", color: C.blue },
            { label: "Inspector", value: inspection.inspector_name || "—", color: C.purple },
            { label: "Date", value: formatDate(inspection.inspection_date), color: C.green },
            { label: "Result", value: resultLabel, color: resultColor },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: `rgba(${rgbaMap[s.color]},0.07)`,
                border: `1px solid rgba(${rgbaMap[s.color]},0.25)`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Equipment Details</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.8 }}>
            <div><strong style={{ color: "#fff" }}>Asset Tag:</strong> {inspection.assets?.asset_tag || "—"}</div>
            <div><strong style={{ color: "#fff" }}>Asset Name:</strong> {inspection.assets?.asset_name || "—"}</div>
            <div><strong style={{ color: "#fff" }}>Asset Type:</strong> {inspection.assets?.asset_type || "—"}</div>
            <div><strong style={{ color: "#fff" }}>Serial Number:</strong> {inspection.assets?.serial_number || "—"}</div>
            <div><strong style={{ color: "#fff" }}>Client:</strong> {inspection.assets?.clients?.company_name || "—"}</div>
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 16,
            padding: "20px",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Notes & Observations</h2>
          <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {inspection.notes || "No notes recorded."}
          </p>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg,rgba(0,245,196,0.05),rgba(79,195,247,0.04))",
            border: "1px solid rgba(79,195,247,0.18)",
            borderRadius: 16,
            padding: "20px",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Record Info</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.8 }}>
            <div><strong style={{ color: "#fff" }}>Inspection Number:</strong> {inspection.inspection_number || "—"}</div>
            <div><strong style={{ color: "#fff" }}>Created:</strong> {formatDate(inspection.created_at)}</div>
            <div><strong style={{ color: "#fff" }}>Database ID:</strong> {inspection.id}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
