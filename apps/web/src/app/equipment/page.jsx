"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getEquipment } from "@/services/equipment";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

const boxStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: "1px solid rgba(102,126,234,0.18)",
  borderRadius: 16,
  padding: 18,
};

function getLicenseLabel(status) {
  if (status === "expiring") return "Expiring Soon";
  if (status === "expired") return "Expired";
  return "Active";
}

function getLicenseStyle(status) {
  if (status === "expired") {
    return {
      background: "rgba(244,114,182,0.14)",
      color: "#f472b6",
      border: "1px solid rgba(244,114,182,0.28)",
    };
  }

  if (status === "expiring") {
    return {
      background: "rgba(250,204,21,0.14)",
      color: "#facc15",
      border: "1px solid rgba(250,204,21,0.28)",
    };
  }

  return {
    background: "rgba(0,245,196,0.12)",
    color: "#00f5c4",
    border: "1px solid rgba(0,245,196,0.24)",
  };
}

export default function EquipmentPage() {
  const router = useRouter();

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    async function loadEquipment() {
      setLoading(true);
      setError("");

      const { data, error } = await getEquipment();

      if (error) {
        setEquipment([]);
        setError(error.message || "Failed to load equipment.");
      } else {
        setEquipment(Array.isArray(data) ? data : []);
      }

      setLoading(false);
    }

    loadEquipment();
  }, []);

  const counts = useMemo(() => {
    const rows = Array.isArray(equipment) ? equipment : [];

    return {
      all: rows.length,
      active: rows.filter((item) => (item.license_status || "valid") === "valid").length,
      expiring: rows.filter((item) => item.license_status === "expiring").length,
      expired: rows.filter((item) => item.license_status === "expired").length,
    };
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    let rows = Array.isArray(equipment) ? [...equipment] : [];

    if (filter === "active") {
      rows = rows.filter((item) => (item.license_status || "valid") === "valid");
    } else if (filter === "expiring") {
      rows = rows.filter((item) => item.license_status === "expiring");
    } else if (filter === "expired") {
      rows = rows.filter((item) => item.license_status === "expired");
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();

      rows = rows.filter((item) => {
        const values = [
          item.asset_tag,
          item.asset_name,
          item.asset_type,
          item.serial_number,
          item.manufacturer,
          item.model,
          item.location,
          item.department,
          item.clients?.company_name,
          item.clients?.company_code,
        ];

        return values
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      });
    }

    return rows;
  }, [equipment, filter, search]);

  return (
    <AppLayout title="Equipment">
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(22px,4vw,32px)",
            fontWeight: 900,
            color: "#fff",
          }}
        >
          Equipment Register
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

      <div style={{ ...boxStyle, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by tag, asset name, serial, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 280px",
              minWidth: 220,
              padding: "11px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(102,126,234,0.25)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              outline: "none",
            }}
          />

          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background: filter === "all" ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setFilter("active")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background: filter === "active" ? "linear-gradient(135deg,#00f5c4,#4fc3f7)" : "rgba(255,255,255,0.06)",
              color: filter === "active" ? "#0f172a" : "#fff",
            }}
          >
            Active ({counts.active})
          </button>

          <button
            onClick={() => setFilter("expiring")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background: filter === "expiring" ? "linear-gradient(135deg,#facc15,#fb923c)" : "rgba(255,255,255,0.06)",
              color: filter === "expiring" ? "#111827" : "#fff",
            }}
          >
            Expiring Soon ({counts.expiring})
          </button>

          <button
            onClick={() => setFilter("expired")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background: filter === "expired" ? "linear-gradient(135deg,#fb7185,#ef4444)" : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
          >
            Expired ({counts.expired})
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
            Showing {filteredEquipment.length} equipment item(s)
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontWeight: 700,
                background: viewMode === "grid" ? "rgba(102,126,234,0.18)" : "rgba(255,255,255,0.04)",
                color: "#fff",
              }}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontWeight: 700,
                background: viewMode === "list" ? "rgba(102,126,234,0.18)" : "rgba(255,255,255,0.04)",
                color: "#fff",
              }}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ ...boxStyle, color: "#fff" }}>Loading equipment...</div>
      ) : filteredEquipment.length === 0 ? (
        <div style={{ ...boxStyle, color: "#fff" }}>
          No equipment found.
        </div>
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 16,
          }}
        >
          {filteredEquipment.map((item) => {
            const status = item.license_status || "valid";
            const badgeStyle = getLicenseStyle(status);

            return (
              <div key={item.id} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                      {item.asset_name || "Unnamed Equipment"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 6 }}>
                      {item.asset_tag || "No Tag"}
                    </div>
                  </div>

                  <span
                    style={{
                      ...badgeStyle,
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      height: "fit-content",
                    }}
                  >
                    {getLicenseLabel(status)}
                  </span>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    <strong style={{ color: "#fff" }}>Type:</strong> {item.asset_type || "—"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    <strong style={{ color: "#fff" }}>Client:</strong> {item.clients?.company_name || "—"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    <strong style={{ color: "#fff" }}>Serial:</strong> {item.serial_number || "—"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                    <strong style={{ color: "#fff" }}>Location:</strong> {item.location || "—"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                  <button
                    onClick={() => router.push(`/equipment/${item.asset_tag}`)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      background: "linear-gradient(135deg,#667eea,#764ba2)",
                      color: "#fff",
                    }}
                  >
                    View Equipment
                  </button>

                  <button
                    onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ ...boxStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <th style={thStyle}>Tag</th>
                  <th style={thStyle}>Asset Name</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((item) => {
                  const status = item.license_status || "valid";
                  const badgeStyle = getLicenseStyle(status);

                  return (
                    <tr key={item.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={tdStyle}>{item.asset_tag || "—"}</td>
                      <td style={tdStyle}>{item.asset_name || "Unnamed Equipment"}</td>
                      <td style={tdStyle}>{item.asset_type || "—"}</td>
                      <td style={tdStyle}>{item.clients?.company_name || "—"}</td>
                      <td style={tdStyle}>{item.location || "—"}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            ...badgeStyle,
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {getLicenseLabel(status)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => router.push(`/equipment/${item.asset_tag}`)}
                            style={actionBtnPrimary}
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)}
                            style={actionBtnSecondary}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 12,
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 13,
  color: "#fff",
  verticalAlign: "middle",
};

const actionBtnPrimary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  background: "linear-gradient(135deg,#667eea,#764ba2)",
  color: "#fff",
};

const actionBtnSecondary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  fontWeight: 700,
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
};
