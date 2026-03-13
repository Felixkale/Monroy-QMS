"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getNCRs, getNCRStats } from "@/services/ncrs";
import { getClientById } from "@/services/clients";

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

function NCRPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");

  const [ncrs, setNCRs] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, critical: 0 });
  const [client, setClient] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [ncrsRes, statsRes, clientRes] = await Promise.all([
          getNCRs(clientId),
          getNCRStats(clientId),
          clientId ? getClientById(clientId) : Promise.resolve({ data: null }),
        ]);

        if (ignore) return;

        if (ncrsRes?.error) {
          throw new Error(ncrsRes.error.message || "Failed to load NCRs.");
        }

        setNCRs(ncrsRes?.data || []);
        setStats(statsRes || { total: 0, open: 0, closed: 0, critical: 0 });
        setClient(clientRes?.data || null);
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load NCRs.");
          setNCRs([]);
          setStats({ total: 0, open: 0, closed: 0, critical: 0 });
          setClient(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [clientId]);

  const filtered = useMemo(() => {
    return ncrs.filter((n) => {
      const normalizedFilter = filter === "All" ? "all" : filter.toLowerCase().replace(" ", "_");
      const matchFilter = normalizedFilter === "all" || n.status === normalizedFilter;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (n.ncr_number || "").toLowerCase().includes(q) ||
        (n.description || "").toLowerCase().includes(q) ||
        (n.assets?.asset_tag || "").toLowerCase().includes(q) ||
        (n.assets?.asset_name || "").toLowerCase().includes(q) ||
        (n.assets?.clients?.company_name || "").toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [ncrs, filter, search]);

  const title = client ? `NCRs — ${client.company_name}` : "Non-Conformance Reports";

  return (
    <AppLayout title={title}>
      {client && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 }}>
          <a href="/clients" style={{ color: "#64748b", textDecoration: "none" }}>
            Clients
          </a>
          <span style={{ color: "#64748b" }}>→</span>
          <a href={`/clients/${clientId}`} style={{ color: "#64748b", textDecoration: "none" }}>
            {client.company_name}
          </a>
          <span style={{ color: "#64748b" }}>→</span>
          <span style={{ color: "#e2e8f0" }}>NCRs</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {client ? `All NCRs for ${client.company_name}` : "Track and manage equipment non-conformances"}
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          {clientId && (
            <a
              href={`/clients/${clientId}`}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                textDecoration: "none",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ← Back to Client
            </a>
          )}

          <a
            href={clientId ? `/ncr/new?client=${clientId}` : "/ncr/new"}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              textDecoration: "none",
              background: `linear-gradient(135deg,${C.purple},${C.blue})`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: `0 0 20px rgba(124,92,252,0.4)`,
            }}
          >
            + Create NCR
          </a>
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
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          { label: "Total NCRs", value: loading ? "…" : stats.total, color: C.blue },
          { label: "Open", value: loading ? "…" : stats.open, color: C.pink },
          { label: "Closed", value: loading ? "…" : stats.closed, color: C.green },
          { label: "Critical", value: loading ? "…" : stats.critical, color: C.yellow },
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
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by NCR number, equipment or description…"
          style={{
            flex: "1 1 220px",
            padding: "10px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(124,92,252,0.3)",
            borderRadius: 10,
            color: "#e2e8f0",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "Open", "Closed", "In Progress"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                background: filter === f ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
                border: filter === f ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
                color: filter === f ? C.purple : "#94a3b8",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(124,92,252,0.15)",
            borderRadius: 16,
            padding: "40px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          Loading NCRs…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(124,92,252,0.15)",
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            {search || filter !== "All" ? "No NCRs match your search" : "No NCRs recorded yet"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {client ? `No NCRs found for ${client.company_name}` : "Create an NCR to get started"}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {filtered.map((ncr, i) => {
            const sc = statusColor[ncr.status] || C.blue;
            const sevc = severityColor[ncr.severity] || C.blue;
            const srgb = rgbaMap[sc] || "79,195,247";
            const eRgb = rgbaMap[sevc] || "79,195,247";

            return (
              <div
                key={ncr.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  flexWrap: "wrap",
                  gap: 10,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(124,92,252,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => router.push(`/ncr/${ncr.id}`)}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>
                    {ncr.ncr_number || ncr.id?.slice(0, 8)}
                  </div>

                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    ⚙️ {ncr.assets?.asset_tag || "—"} · 🏢 {ncr.assets?.clients?.company_name || "—"}
                  </div>

                  {ncr.description && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {ncr.description.slice(0, 80)}
                      {ncr.description.length > 80 ? "…" : ""}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {ncr.severity && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        background: `rgba(${eRgb},0.15)`,
                        color: sevc,
                        border: `1px solid rgba(${eRgb},0.3)`,
                        textTransform: "capitalize",
                      }}
                    >
                      {ncr.severity}
                    </span>
                  )}

                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `rgba(${srgb},0.15)`,
                      color: sc,
                      border: `1px solid rgba(${srgb},0.3)`,
                      textTransform: "capitalize",
                    }}
                  >
                    {statusLabel[ncr.status] || ncr.status || "Unknown"}
                  </span>

                  {ncr.due_date && (
                    <span style={{ fontSize: 11, color: "#64748b", minWidth: 100, textAlign: "right" }}>
                      Due: {formatDate(ncr.due_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default function NCRPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0f1419",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
          }}
        >
          Loading…
        </div>
      }
    >
      <NCRPageInner />
    </Suspense>
  );
}
