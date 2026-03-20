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
  yellow: "#fbbf24",
  text: "#e2e8f0",
  muted: "rgba(226,232,240,0.65)",
  border: "rgba(255,255,255,0.10)",
  card: "rgba(255,255,255,0.04)",
  panel: "rgba(255,255,255,0.03)",
  inputBg: "#1b2330",
};

const boxStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: "1px solid rgba(102,126,234,0.18)",
  borderRadius: 16,
  padding: 18,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.inputBg,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
  minHeight: 48,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 42,
  cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `)}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "18px",
};

const optionStyle = {
  backgroundColor: "#ffffff",
  color: "#111827",
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

function sortText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    sensitivity: "base",
  });
}

function normalize(item) {
  const clientName =
    item?.clients?.company_name ||
    item?.company_name ||
    item?.client_name ||
    "Unassigned Client";

  const equipmentType = item?.asset_type || "General Equipment";
  const equipmentName = item?.asset_name || item?.asset_tag || "Unnamed Equipment";

  return {
    ...item,
    client_display: clientName,
    type_display: equipmentType,
    name_display: equipmentName,
  };
}

function sortGroupedMap(groupMap) {
  return new Map([...groupMap.entries()].sort(([a], [b]) => sortText(a, b)));
}

export default function EquipmentPage() {
  const router = useRouter();

  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [licenseFilter, setLicenseFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grouped");

  const [clientFilter, setClientFilter] = useState("ALL");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("ALL");

  useEffect(() => {
    async function loadEquipment() {
      setLoading(true);
      setError("");

      const { data, error } = await getEquipment();

      if (error) {
        setEquipment([]);
        setError(error.message || "Failed to load equipment.");
      } else {
        const rows = Array.isArray(data) ? data.map(normalize) : [];
        setEquipment(rows);
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

  const clients = useMemo(() => {
    return [...new Set(equipment.map((item) => item.client_display).filter(Boolean))].sort(sortText);
  }, [equipment]);

  const equipmentTypes = useMemo(() => {
    return [...new Set(equipment.map((item) => item.type_display).filter(Boolean))].sort(sortText);
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    let rows = Array.isArray(equipment) ? [...equipment] : [];

    if (licenseFilter === "active") {
      rows = rows.filter((item) => (item.license_status || "valid") === "valid");
    } else if (licenseFilter === "expiring") {
      rows = rows.filter((item) => item.license_status === "expiring");
    } else if (licenseFilter === "expired") {
      rows = rows.filter((item) => item.license_status === "expired");
    }

    if (clientFilter !== "ALL") {
      rows = rows.filter((item) => item.client_display === clientFilter);
    }

    if (equipmentTypeFilter !== "ALL") {
      rows = rows.filter((item) => item.type_display === equipmentTypeFilter);
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
          item.client_display,
          item.type_display,
          item.name_display,
        ];

        return values
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      });
    }

    return rows.sort((a, b) => {
      const clientCompare = sortText(a.client_display, b.client_display);
      if (clientCompare !== 0) return clientCompare;

      const typeCompare = sortText(a.type_display, b.type_display);
      if (typeCompare !== 0) return typeCompare;

      return sortText(a.name_display, b.name_display);
    });
  }, [equipment, licenseFilter, clientFilter, equipmentTypeFilter, search]);

  const groupedEquipment = useMemo(() => {
    const map = new Map();

    for (const item of filteredEquipment) {
      const client = item.client_display || "Unassigned Client";
      const type = item.type_display || "General Equipment";

      if (!map.has(client)) map.set(client, new Map());
      if (!map.get(client).has(type)) map.get(client).set(type, []);

      map.get(client).get(type).push(item);
    }

    const sortedClients = sortGroupedMap(map);

    for (const [client, typeMap] of sortedClients.entries()) {
      const sortedTypes = sortGroupedMap(typeMap);
      sortedClients.set(client, sortedTypes);

      for (const [type, items] of sortedTypes.entries()) {
        sortedTypes.set(
          type,
          [...items].sort((a, b) => {
            const nameCompare = sortText(a.name_display, b.name_display);
            if (nameCompare !== 0) return nameCompare;
            return sortText(a.asset_tag, b.asset_tag);
          })
        );
      }
    }

    return sortedClients;
  }, [filteredEquipment]);

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

        <div style={{ marginTop: 10, color: C.muted, fontSize: 14 }}>
          ISO-style grouping by company and equipment type.
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

      <div style={{ ...boxStyle, marginBottom: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            placeholder="Search by tag, asset name, serial, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={selectStyle}
          >
            <option style={optionStyle} value="ALL">
              All Companies
            </option>
            {clients.map((client) => (
              <option key={client} style={optionStyle} value={client}>
                {client}
              </option>
            ))}
          </select>

          <select
            value={equipmentTypeFilter}
            onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            style={selectStyle}
          >
            <option style={optionStyle} value="ALL">
              All Equipment Types
            </option>
            {equipmentTypes.map((type) => (
              <option key={type} style={optionStyle} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setLicenseFilter("all")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background:
                licenseFilter === "all"
                  ? "linear-gradient(135deg,#667eea,#764ba2)"
                  : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setLicenseFilter("active")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background:
                licenseFilter === "active"
                  ? "linear-gradient(135deg,#00f5c4,#4fc3f7)"
                  : "rgba(255,255,255,0.06)",
              color: licenseFilter === "active" ? "#0f172a" : "#fff",
            }}
          >
            Active ({counts.active})
          </button>

          <button
            onClick={() => setLicenseFilter("expiring")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background:
                licenseFilter === "expiring"
                  ? "linear-gradient(135deg,#facc15,#fb923c)"
                  : "rgba(255,255,255,0.06)",
              color: licenseFilter === "expiring" ? "#111827" : "#fff",
            }}
          >
            Expiring Soon ({counts.expiring})
          </button>

          <button
            onClick={() => setLicenseFilter("expired")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background:
                licenseFilter === "expired"
                  ? "linear-gradient(135deg,#fb7185,#ef4444)"
                  : "rgba(255,255,255,0.06)",
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
              onClick={() => setViewMode("grouped")}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontWeight: 700,
                background:
                  viewMode === "grouped"
                    ? "rgba(102,126,234,0.18)"
                    : "rgba(255,255,255,0.04)",
                color: "#fff",
              }}
            >
              ISO Grouped View
            </button>

            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontWeight: 700,
                background:
                  viewMode === "grid"
                    ? "rgba(102,126,234,0.18)"
                    : "rgba(255,255,255,0.04)",
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
                background:
                  viewMode === "list"
                    ? "rgba(102,126,234,0.18)"
                    : "rgba(255,255,255,0.04)",
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
        <div style={{ ...boxStyle, color: "#fff" }}>No equipment found.</div>
      ) : viewMode === "grouped" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[...groupedEquipment.entries()].map(([clientName, typeMap]) => (
            <div key={clientName} style={{ ...boxStyle, padding: 18 }}>
              <h2 style={{ color: "#fff", margin: 0, marginBottom: 14 }}>{clientName}</h2>

              {[...typeMap.entries()].map(([equipmentType, items]) => (
                <div key={equipmentType} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      color: C.blue,
                      fontWeight: 800,
                      marginBottom: 12,
                      fontSize: 17,
                      textTransform: "uppercase",
                    }}
                  >
                    {equipmentType}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                      gap: 16,
                    }}
                  >
                    {items.map((item) => {
                      const status = item.license_status || "valid";
                      const badgeStyle = getLicenseStyle(status);

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: C.panel,
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            padding: 16,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                                {item.asset_name || "Unnamed Equipment"}
                              </div>
                              <div
                                style={{
                                  color: "rgba(255,255,255,0.55)",
                                  fontSize: 12,
                                  marginTop: 6,
                                }}
                              >
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
                              <strong style={{ color: "#fff" }}>Client:</strong> {item.client_display || "—"}
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
                              style={actionBtnPrimary}
                            >
                              View Equipment
                            </button>

                            <button
                              onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)}
                              style={actionBtnSecondary}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
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
                    <strong style={{ color: "#fff" }}>Client:</strong> {item.client_display || "—"}
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
                    style={actionBtnPrimary}
                  >
                    View Equipment
                  </button>

                  <button
                    onClick={() => router.push(`/equipment/${item.asset_tag}/edit`)}
                    style={actionBtnSecondary}
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
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Tag</th>
                  <th style={thStyle}>Asset Name</th>
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
                      <td style={tdStyle}>{item.client_display || "—"}</td>
                      <td style={tdStyle}>{item.asset_type || "—"}</td>
                      <td style={tdStyle}>{item.asset_tag || "—"}</td>
                      <td style={tdStyle}>{item.asset_name || "Unnamed Equipment"}</td>
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
