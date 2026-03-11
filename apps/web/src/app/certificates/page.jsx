"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import {
  getCertificates,
  getCertificateStats,
  deleteCertificateById,
} from "@/services/certificate";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getBadgeColors(status) {
  const s = String(status || "").toUpperCase();

  if (s === "FAIL" || s === "EXPIRED") {
    return {
      bg: "rgba(239,68,68,0.14)",
      border: "rgba(239,68,68,0.35)",
      color: "#fca5a5",
    };
  }

  if (s === "CONDITIONAL" || s === "EXPIRING") {
    return {
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.35)",
      color: "#fcd34d",
    };
  }

  return {
    bg: "rgba(16,185,129,0.14)",
    border: "rgba(16,185,129,0.35)",
    color: "#86efac",
  };
}

function StatusBadge({ children }) {
  const style = getBadgeColors(children);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pass: 0,
    conditional: 0,
    fail: 0,
    expired: 0,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [{ data: certData, error: certError }, statData] = await Promise.all([
        getCertificates(),
        getCertificateStats(),
      ]);

      if (certError) throw certError;

      setCertificates(certData || []);
      setStats(
        statData || {
          total: 0,
          pass: 0,
          conditional: 0,
          fail: 0,
          expired: 0,
        }
      );
    } catch (err) {
      setCertificates([]);
      setError(err?.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCertificates = useMemo(() => {
    let rows = [...certificates];

    if (filter !== "all") {
      rows = rows.filter((item) => {
        const result = String(item.inspection_result || item.equipment_status || "").toUpperCase();
        const expiryState = String(item.expiry_state || "").toLowerCase();

        if (filter === "pass") return result === "PASS";
        if (filter === "conditional") return result === "CONDITIONAL";
        if (filter === "fail") return result === "FAIL";
        if (filter === "expired") return expiryState === "expired";

        return true;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      rows = rows.filter((item) => {
        return [
          item.certificate_number,
          item.company,
          item.equipment_description,
          item.equipment_id,
          item.equipment_location,
          item.inspector_name,
          item.certificate_type,
          item.asset?.asset_tag,
          item.asset?.asset_name,
          item.asset?.asset_type,
          item.asset?.serial_number,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      });
    }

    return rows;
  }, [certificates, filter, search]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this certificate?");
    if (!confirmed) return;

    const { error } = await deleteCertificateById(id);

    if (error) {
      alert(error?.message || "Failed to delete certificate.");
      return;
    }

    await loadData();
  };

  return (
    <AppLayout title="Certificates">
      <style>{`
        input::placeholder {
          color: rgba(255,255,255,0.35);
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(22px,4vw,32px)",
                fontWeight: 900,
                color: "#fff",
              }}
            >
              Certificates
            </h1>
            <div
              style={{
                marginTop: 8,
                width: 72,
                height: 4,
                borderRadius: 999,
                background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})`,
              }}
            />
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 10 }}>
              Statutory inspection certificates with QR verification and print support.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/certificates/import"
              style={{
                padding: "11px 18px",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 700,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e5e7eb",
              }}
            >
              Import
            </Link>

            <Link
              href="/certificates/create"
              style={{
                padding: "11px 18px",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 700,
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                border: "none",
                color: "#fff",
                boxShadow: "0 0 20px rgba(102,126,234,0.35)",
              }}
            >
              Create Certificate
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(244,114,182,0.1)",
            border: "1px solid rgba(244,114,182,0.3)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: C.pink,
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total", value: stats.total, key: "all" },
          { label: "Pass", value: stats.pass, key: "pass" },
          { label: "Conditional", value: stats.conditional, key: "conditional" },
          { label: "Fail", value: stats.fail, key: "fail" },
          { label: "Expired", value: stats.expired, key: "expired" },
        ].map((item) => {
          const active = filter === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                textAlign: "left",
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
                border: active
                  ? "1px solid rgba(102,126,234,0.45)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "linear-gradient(135deg,rgba(102,126,234,0.18),rgba(124,92,252,0.12))"
                  : "rgba(255,255,255,0.03)",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginBottom: 8 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{item.value}</div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by certificate number, company, equipment, tag, inspector..."
          style={{
            flex: "1 1 340px",
            minWidth: 260,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(102,126,234,0.25)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              border:
                viewMode === "grid"
                  ? "1px solid rgba(102,126,234,0.35)"
                  : "1px solid rgba(255,255,255,0.1)",
              background:
                viewMode === "grid"
                  ? "rgba(102,126,234,0.16)"
                  : "rgba(255,255,255,0.04)",
              color: "#fff",
            }}
          >
            Grid View
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              border:
                viewMode === "list"
                  ? "1px solid rgba(102,126,234,0.35)"
                  : "1px solid rgba(255,255,255,0.1)",
              background:
                viewMode === "list"
                  ? "rgba(102,126,234,0.16)"
                  : "rgba(255,255,255,0.04)",
              color: "#fff",
            }}
          >
            List View
          </button>
        </div>
      </div>

      <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, marginBottom: 16 }}>
        Showing {filteredCertificates.length} certificate item(s)
      </div>

      {loading ? (
        <div style={{ color: "#fff", padding: "40px 0" }}>Loading certificates...</div>
      ) : filteredCertificates.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 28,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          No certificates found.
        </div>
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 16,
          }}
        >
          {filteredCertificates.map((item) => {
            const inspectionStatus = item.inspection_result || item.equipment_status || "PASS";

            return (
              <div
                key={item.id}
                style={{
                  background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))",
                  border: "1px solid rgba(102,126,234,0.15)",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>
                      {item.certificate_number || "Certificate"}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 4 }}>
                      {item.certificate_type || "Certificate of Statutory Inspection"}
                    </div>
                  </div>

                  <StatusBadge>{inspectionStatus}</StatusBadge>
                </div>

                <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#e5e7eb", marginBottom: 14 }}>
                  {item.company && <div><strong>Company:</strong> {item.company}</div>}
                  {(item.equipment_description || item.asset?.asset_name) && (
                    <div><strong>Equipment:</strong> {item.equipment_description || item.asset?.asset_name}</div>
                  )}
                  {(item.equipment_id || item.asset?.asset_tag) && (
                    <div><strong>Equipment Tag:</strong> {item.equipment_id || item.asset?.asset_tag}</div>
                  )}
                  {(item.equipment_location || item.asset?.location) && (
                    <div><strong>Location:</strong> {item.equipment_location || item.asset?.location}</div>
                  )}
                  {item.inspector_name && <div><strong>Inspector:</strong> {item.inspector_name}</div>}
                  <div><strong>Issue Date:</strong> {formatDate(item.issued_at)}</div>
                  <div><strong>Expiry Date:</strong> {formatDate(item.valid_to)}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={`/certificates/${item.id}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 700,
                      background: "rgba(102,126,234,0.14)",
                      border: "1px solid rgba(102,126,234,0.28)",
                      color: "#c7d2fe",
                    }}
                  >
                    View
                  </Link>

                  <Link
                    href={`/certificates/print/${item.id}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: 700,
                      background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                      color: "#111827",
                    }}
                  >
                    Print
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 700,
                      border: "1px solid rgba(239,68,68,0.28)",
                      background: "rgba(239,68,68,0.12)",
                      color: "#fca5a5",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(102,126,234,0.15)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.9fr 1.2fr",
              gap: 12,
              padding: "14px 16px",
              fontSize: 11,
              fontWeight: 800,
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>Certificate</div>
            <div>Company</div>
            <div>Equipment</div>
            <div>Inspector</div>
            <div>Issue</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filteredCertificates.map((item, index) => {
            const inspectionStatus = item.inspection_result || item.equipment_status || "PASS";

            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr 0.9fr 1.2fr",
                  gap: 12,
                  padding: "14px 16px",
                  alignItems: "center",
                  borderBottom:
                    index === filteredCertificates.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{item.certificate_number || "-"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                    {item.certificate_type || "-"}
                  </div>
                </div>

                <div>{item.company || "-"}</div>
                <div>{item.equipment_description || item.asset?.asset_name || "-"}</div>
                <div>{item.inspector_name || "-"}</div>
                <div>{formatDate(item.issued_at)}</div>
                <div><StatusBadge>{inspectionStatus}</StatusBadge></div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={`/certificates/${item.id}`}
                    style={{ color: "#c7d2fe", textDecoration: "none", fontWeight: 700 }}
                  >
                    View
                  </Link>

                  <Link
                    href={`/certificates/print/${item.id}`}
                    style={{ color: "#67e8f9", textDecoration: "none", fontWeight: 700 }}
                  >
                    Print
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    style={{
                      border: "none",
                      background: "none",
                      color: "#fca5a5",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
