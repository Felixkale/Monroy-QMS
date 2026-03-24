// apps/web/src/app/certificates/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

const C = {
  bg: "#0b1120",
  panel: "#111827",
  border: "rgba(255,255,255,0.12)",
  text: "#f8fafc",
  textSoft: "#cbd5e1",
  textDim: "#94a3b8",
  cyan: "#22d3ee",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

function normalizeId(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resultTone(value) {
  const v = String(value || "").toUpperCase().replace(/\s+/g, "_");
  if (v === "PASS") return { color: C.green, bg: "rgba(34,197,94,0.12)", label: "Pass" };
  if (v === "FAIL") return { color: C.red, bg: "rgba(239,68,68,0.12)", label: "Fail" };
  if (v === "REPAIR_REQUIRED") return { color: C.amber, bg: "rgba(245,158,11,0.12)", label: "Repair Required" };
  return { color: C.textSoft, bg: "rgba(148,163,184,0.12)", label: "Unknown" };
}

export default function CertificateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = normalizeId(params?.id);

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [bundle, setBundle] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    loadCertificate();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (searchParams.get("download") === "1") {
      window.location.replace(`/certificates/print/${id}`);
    }
  }, [searchParams, id]);

  async function loadCertificate() {
    setLoading(true);
    setError("");

    const { data, error: certError } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (certError || !data) {
      setRecord(null);
      setBundle([]);
      setError(certError?.message || "Certificate not found.");
      setLoading(false);
      return;
    }

    setRecord(data);

    if (data.folder_id) {
      const { data: linkedRows, error: linkedError } = await supabase
        .from("certificates")
        .select("*")
        .eq("folder_id", data.folder_id)
        .order("folder_position", { ascending: true })
        .order("created_at", { ascending: true });

      if (linkedError) {
        setBundle([data]);
      } else {
        setBundle(linkedRows?.length ? linkedRows : [data]);
      }
    } else {
      setBundle([data]);
    }

    setLoading(false);
  }

  const currentResult = useMemo(
    () => resultTone(record?.result || record?.equipment_status),
    [record]
  );

  return (
    <AppLayout title="Certificate View">
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.cyan,
                  marginBottom: 8,
                }}
              >
                Certificate Viewer
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                {record?.certificate_number || "Certificate"}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: currentResult.bg,
                    color: currentResult.color,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {currentResult.label}
                </span>

                {record?.folder_id ? (
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(34,211,238,0.10)",
                      color: C.cyan,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Linked Folder: {record.folder_name || "Stapled Certificates"}
                  </span>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => router.push("/certificates")}
                style={ghostBtn}
              >
                ← Back
              </button>

              <Link href={`/certificates/${id}/edit`} style={amberBtn}>
                Edit / Staple
              </Link>

              <button
                type="button"
                onClick={() => window.open(`/certificates/print/${id}`, "_blank", "noopener,noreferrer")}
                style={greenBtn}
              >
                Print {bundle.length > 1 ? "Folder" : "Certificate"}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={infoPanel}>Loading certificate…</div>
          ) : error ? (
            <div style={{ ...infoPanel, borderColor: "rgba(239,68,68,0.24)", color: "#fecaca" }}>
              {error}
            </div>
          ) : (
            <>
              <CertificateSheet
                certificate={record}
                index={0}
                total={bundle.length || 1}
              />

              {bundle.length > 1 ? (
                <div
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      marginBottom: 14,
                    }}
                  >
                    Linked certificates in this folder
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    {bundle.map((item) => {
                      const active = String(item.id) === String(id);

                      return (
                        <div
                          key={item.id}
                          style={{
                            border: `1px solid ${active ? "rgba(34,211,238,0.40)" : C.border}`,
                            background: active ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.03)",
                            borderRadius: 14,
                            padding: 14,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                              {item.certificate_number || "—"}
                            </div>
                            <div style={{ color: C.textSoft, fontSize: 13 }}>
                              {item.equipment_description || item.asset_name || "Unnamed equipment"}
                            </div>
                            <div style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>
                              Position {item.folder_position || 1}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Link href={`/certificates/${item.id}`} style={ghostLinkBtn}>
                              View
                            </Link>
                            <Link href={`/certificates/${item.id}/edit`} style={ghostLinkBtn}>
                              Edit
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const infoPanel = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 18,
  fontSize: 15,
  fontWeight: 700,
  color: "#e2e8f0",
};

const ghostBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#f8fafc",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const amberBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #f59e0b, #f97316)",
  color: "#111827",
  fontWeight: 900,
  fontSize: 13,
  textDecoration: "none",
};

const greenBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #22c55e, #14b8a6)",
  color: "#052e16",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const ghostLinkBtn = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#f8fafc",
  fontWeight: 800,
  fontSize: 12,
  textDecoration: "none",
};
