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

const cardStyle = {
  background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
  border: "1px solid rgba(102,126,234,0.2)",
  borderRadius: 16,
  padding: 20,
};

export default function EquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadEquipment() {
      setLoading(true);
      setError("");

      const { data, error } = await getEquipment();

      if (error) {
        setError(error.message || "Failed to load equipment.");
        setEquipment([]);
      } else {
        setEquipment(data || []);
      }

      setLoading(false);
    }

    loadEquipment();
  }, []);

  const filteredEquipment = useMemo(() => {
    let rows = [...equipment];

    if (filter === "active") {
      rows = rows.filter((item) => item.license_status === "valid");
    }

    if (filter === "expiring") {
      rows = rows.filter((item) => item.license_status === "expiring");
    }

    if (filter === "expired") {
      rows = rows.filter((item) => item.license_status === "expired");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((item) =>
        [
          item.asset_tag,
          item.asset_name,
          item.asset_type,
          item.serial_number,
          item.manufacturer,
          item.model,
          item.location,
          item.clients?.company_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    return rows;
  }, [equipment, filter, search]);

  const counts = useMemo(() => {
    return {
      all: equipment.length,
      active: equipment.filter((i) => i.license_status === "valid").length,
      expiring: equipment.filter((i) => i.license_status === "expiring").length,
      expired: equipment.filter((i) => i.license_status === "expired").length,
    };
  }, [equipment]);

  return (
    <AppLayout title="Equipment">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(22px,4vw,32px)", fontWeight: 900 }}>
          Equipment Register
        </h1>
        <div style={{ marginTop: 8, width: 72, height: 4, borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by tag, asset name, serial, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 280px",
              padding: "11px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(102,126,234,0.25)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
            }}
          />

          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: filter === "all" ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setFilter("active")}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: filter === "active" ? "linear-gradient(135deg,#00f5c4,#4fc3f7)" : "rgba(255,255,255,0.06)",
              color: filter === "active" ? "#111827" : "#fff",
            }}
          >
            Active ({counts.active})
          </button>

          <button
            onClick={() => setFilter("expiring")}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: filter === "expiring" ? "linear-gradient(135deg,#facc15,#fb7185)" : "rgba(255,255,255,0.06)",
              color: filter === "expiring" ? "#111827" : "#fff",
            }}
          >
            Expiring Soon ({counts.expiring})
          </button>

          <button
            onClick={() => setFilter("expired")}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: filter === "expired" ? "linear-gradient(135deg,#fb7185,#ef4444)" : "rgba(255,255,255,0.06)",
              color: "#fff",
            }}
          >
            Expired ({counts.expired})
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ color: "#fff", padding: 20 }}>Loading equipment...</div>
      )}

      {error && (
        <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: C.pink, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredEquipment.length === 0 ? (
            <div style={cardStyle}>
              <div style={{ color: "#fff", fontWeight: 700 }}>No equipment found.</div>
            </div>
          ) : (
            filteredEquipment.map((item) => (
              <div key={item.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
                      {item.asset_name || "Unnamed Equipment"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 6, fontSize: 13 }}>
                      {item.asset_tag} • {item.asset_type} • {item.clients?.company_name || "No Client"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", marginTop: 6, fontSize: 13 }}>
                      Serial: {item.serial_number || "—"} | Location: {item.location || "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background:
                          item.license_status === "expired"
                            ? "rgba(239,68,68,0.15)"
                            : item.license_status === "expiring"
                            ? "rgba(250,204,21,0.18)"
                            : "rgba(0,245,196,0.12)",
                        color:
                          item.license_status === "expired"
                            ? "#f87171"
                            : item.license_status === "expiring"
                            ? "#facc15"
                            : "#00f5c4",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {item.license_status || "valid"}
                    </span>

                    <button
                      onClick={() => router.push(`/equipment/${item.asset_tag}`)}
                      style={{
                        padding: "10px 16px",
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AppLayout>
  );
}
