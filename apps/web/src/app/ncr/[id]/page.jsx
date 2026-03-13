"use client";

import { useEffect, useState } from "react";
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

const severityColor = {
  critical: C.pink,
  major: C.yellow,
  minor: C.blue,
};

const statusColor = {
  open: C.pink,
  closed: C.green,
  in_progress: C.yellow,
};

const statusLabel = {
  open: "Open",
  closed: "Closed",
  in_progress: "In Progress",
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

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [ncr, setNCR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadNCR() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("ncrs")
          .select(`
            id,
            ncr_number,
            severity,
            status,
            description,
            details,
            due_date,
            created_at,
            assets (
              id,
              asset_tag,
              asset_name,
              asset_type,
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
          setNCR(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load NCR.");
          setNCR(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (params?.id) {
      loadNCR();
    }
    return () => {
      ignore = true;
    };
  }, [params?.id]);

  if (loading) {
    return (
      <AppLayout title="NCR Details">
        <div style={{ padding: "40px 0", color: "#64748b", textAlign: "center" }}>Loading NCR…</div>
      </AppLayout>
    );
  }

  if (error || !ncr) {
    return (
      <AppLayout title="NCR Not Found">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h2 style={{ color: "#fff", marginBottom: 10 }}>NCR Not Found</h2>
          <p style={{ color: "#64748b", marginBottom: 20 }}>
            {error || "The requested NCR could not be found."}
          </p>
          <button
            onClick={() => router.push("/ncr")}
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
            Back to NCRs
          </button>
        </div>
      </AppLayout>
    );
  }

  const sevKey = (ncr.severity || "").toLowerCase();
  const statusKey = (ncr.status || "").toLowerCase();
  const sevColor = severityColor[sevKey] || C.blue;
  const statColor = statusColor[statusKey] || C.blue;

  return (
    <AppLayout title={ncr.ncr_number || "NCR Details"}>
      <div style={{ maxWidth: 1000 }}>
        <div style={{ marginBottom: 28 }}>
          <a
            href="/ncr"
            style={{
              color: "#64748b",
              fontSize: 13,
              textDecoration: "none",
              marginBottom: 10,
              display: "block",
            }}
          >
            ← Back to NCRs
          </a>

          <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, margin: "0 0 8px", color: "#fff" }}>
            {ncr.ncr_number || ncr.id}
          </h1>

          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            {ncr.assets?.asset_tag || "—"} · {ncr.assets?.clients?.company_name || "—"}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            { label: "Severity", value: ncr.severity || "—", color: sevColor },
            { label: "Status", value: statusLabel[statusKey] || ncr.status || "—", color: statColor },
            { label: "Created", value: formatDate(ncr.created_at), color: C.blue },
            { label: "Due Date", value: formatDate(ncr.due_date), color: C.yellow },
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
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Equipment</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.8 }}>
            <div>
              <strong style={{ color: "#fff" }}>Asset Tag:</strong> {ncr.assets?.asset_tag || "—"}
            </div>
            <div>
              <strong style={{ color: "#fff" }}>Asset Name:</strong> {ncr.assets?.asset_name || "—"}
            </div>
            <div>
              <strong style={{ color: "#fff" }}>Asset Type:</strong> {ncr.assets?.asset_type || "—"}
            </div>
            <div>
              <strong style={{ color: "#fff" }}>Client:</strong> {ncr.assets?.clients?.company_name || "—"}
            </div>
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
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Description</h2>
          <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {ncr.description || "No description provided."}
          </p>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 16,
            padding: "20px",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Details</h2>
          <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {ncr.details || "No additional details recorded."}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
