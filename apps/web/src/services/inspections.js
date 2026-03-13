"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { getInspections, getInspectionStats } from "@/services/inspections";
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

const resultColor = {
  pass: C.green,
  fail: C.pink,
  conditional: C.yellow,
};

const resultLabel = {
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

function InspectionsPageInner() {
  const [clientId, setClientId] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pass: 0,
    fail: 0,
    conditional: 0,
    withCertificate: 0,
    withoutCertificate: 0,
  });
  const [client, setClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setClientId(params.get("client"));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [inspRes, statsRes, clientRes] = await Promise.all([
          getInspections(clientId),
          getInspectionStats(clientId),
          clientId ? getClientById(clientId) : Promise.resolve({ data: null }),
        ]);

        if (ignore) return;

        if (inspRes?.error) {
          throw new Error(inspRes.error.message || "Failed to load inspections.");
        }

        setInspections(inspRes?.data || []);
        setStats(
          statsRes || {
            total: 0,
            pass: 0,
            fail: 0,
            conditional: 0,
            withCertificate: 0,
            withoutCertificate: 0,
          }
        );
        setClient(clientRes?.data || null);
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load inspections.");
          setInspections([]);
          setStats({
            total: 0,
            pass: 0,
            fail: 0,
            conditional: 0,
            withCertificate: 0,
            withoutCertificate: 0,
          });
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
    return inspections.filter((i) => {
      const normalizedFilter = filter === "All" ? "all" : filter.toLowerCase();
      const matchFilter = normalizedFilter === "all" || i.result === normalizedFilter;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (i.inspection_number || "").toLowerCase().includes(q) ||
        (i.assets?.asset_tag || "").toLowerCase().includes(q) ||
        (i.assets?.asset_name || "").toLowerCase().includes(q) ||
        (i.assets?.clients?.company_name || "").toLowerCase().includes(q) ||
        (i.notes || "").toLowerCase().includes(q) ||
        (i.certificate_number || "").toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [inspections, filter, search]);

  const title = client ? `Inspections — ${client.company_name}` : "Inspections";

  return (
    <AppLayout title={title}>
      {client && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 }}>
          <a href="/clients" style={{ color: "#64748b", textDecoration: "none" }}>Clients</a>
          <span style={{ color: "#64748b" }}>→</span>
          <a href={`/clients/${clientId}`} style={{ color: "#64748b", textDecoration: "none" }}>
            {client.company_name}
          </a>
          <span style={{ color: "#64748b" }}>→</span>
          <span style={{ color: "#e2e8f0" }}>Inspections</span>
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
          {client ? `All inspections for ${client.company_name}` : "All equipment inspections"}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
            href={clientId ? `/inspections/create?client=${clientId}` : "/inspections/create"}
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
            + New Inspection
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total", value: loading ? "…" : stats.total, color: C.blue },
          { label: "Pass", value: loading ? "…" : stats.pass, color: C.green },
          { label: "Conditional", value: loading ? "…" : stats.conditional, color: C.yellow },
          { label: "Fail", value: loading ? "…" : stats.fail, color: C.pink },
          { label: "Certified", value: loading ? "…" : stats.withCertificate, color: C.green },
          { label: "No Certificate", value: loading ? "…" : stats.withoutCertificate, color: C.yellow },
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
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
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
          placeholder="Search by ID, equipment, client, notes or certificate…"
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
          {["All", "Pass", "Conditional", "Fail"].map((f) => (
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: "18px 20px",
                height: 150,
              }}
            />
          ))}
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
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            {search || filter !== "All" ? "No inspections match your search" : "No inspections recorded yet"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {client ? `No inspections found for ${client.company_name}` : "Start by creating a new inspection"}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map((insp) => {
            const rc = resultColor[insp.result] || C.blue;
            const rrgb = rgbaMap[rc] || "79,195,247";

            return (
              <a key={insp.id} href={`/inspections/${insp.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                    border: `1px solid rgba(${rrgb},0.2)`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg,${rc},transparent)`,
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                        {insp.inspection_number || insp.id?.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {formatDate(insp.inspection_date)}
                      </div>
                    </div>

                    {insp.result && (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: `rgba(${rrgb},0.15)`,
                          color: rc,
                          border: `1px solid rgba(${rrgb},0.3)`,
                          textTransform: "capitalize",
                        }}
                      >
                        {resultLabel[insp.result] || insp.result}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 4 }}>
                    ⚙️ Equipment: <strong>{insp.assets?.asset_tag || "—"}</strong>
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    🏢 {insp.assets?.clients?.company_name || "—"}
                  </div>

                  {insp.has_certificate ? (
                    <div style={{ fontSize: 11, color: C.green, marginTop: 8 }}>
                      📄 Certificate: {insp.certificate_number || "Issued"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.yellow, marginTop: 8 }}>
                      ⏳ No certificate linked yet
                    </div>
                  )}

                  {insp.notes && (
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 8, fontStyle: "italic" }}>
                      {insp.notes.slice(0, 80)}
                      {insp.notes.length > 80 ? "…" : ""}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default function InspectionsPage() {
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
      <InspectionsPageInner />
    </Suspense>
  );
}
