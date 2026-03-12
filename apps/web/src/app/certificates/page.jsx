"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const STATUS_COLOR = {
  PASS:        { bg: "rgba(16,185,129,0.12)",  color: "#86efac", border: "rgba(16,185,129,0.35)" },
  FAIL:        { bg: "rgba(244,63,94,0.1)",    color: "#fda4af", border: "rgba(244,63,94,0.35)" },
  CONDITIONAL: { bg: "rgba(251,191,36,0.12)",  color: "#fde68a", border: "rgba(251,191,36,0.35)" },
};

const RECORD_COLOR = {
  issued:   { color: "#86efac", bg: "rgba(16,185,129,0.1)"  },
  draft:    { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  expired:  { color: "#fda4af", bg: "rgba(244,63,94,0.1)"   },
  rejected: { color: "#f472b6", bg: "rgba(244,114,182,0.1)" },
};

function Badge({ label, map }) {
  const s = map[label?.toLowerCase()] || map[label?.toUpperCase()] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border || s.bg}`,
    }}>
      {label || "—"}
    </span>
  );
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(val) {
  if (!val) return false;
  return new Date(val) < new Date();
}

export default function CertificatesPage() {
  const router = useRouter();
  const [certs, setCerts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("certificates")
          .select(`
            id,
            certificate_number,
            certificate_type,
            company,
            equipment_description,
            equipment_location,
            equipment_id,
            equipment_status,
            issued_at,
            valid_to,
            status,
            inspector_name,
            assets (
              asset_tag,
              asset_type,
              serial_number,
              clients ( company_name )
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCerts(data || []);
      } catch (err) {
        setError(err.message || "Failed to load certificates.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = certs.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.certificate_number || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.equipment_description || "").toLowerCase().includes(q) ||
      (c.equipment_id || "").toLowerCase().includes(q) ||
      (c.assets?.asset_tag || "").toLowerCase().includes(q) ||
      (c.assets?.clients?.company_name || "").toLowerCase().includes(q) ||
      (c.certificate_type || "").toLowerCase().includes(q)
    );
  });

  // Stats
  const total    = certs.length;
  const passed   = certs.filter((c) => c.equipment_status === "PASS").length;
  const expiring = certs.filter((c) => isExpired(c.valid_to)).length;
  const drafts   = certs.filter((c) => c.status === "draft").length;

  return (
    <AppLayout title="Certificates">
      <div style={{ maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 28 }}>Certificates</h1>
            <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
              Manage all inspection and test certificates.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/certificates/import")}
              style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
            >
              📥 Bulk Import
            </button>
            <button
              onClick={() => router.push("/certificates/create")}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
            >
              + New Certificate
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total",    value: total,    color: "#4fc3f7" },
            { label: "Passed",   value: passed,   color: "#86efac" },
            { label: "Expired",  value: expiring, color: "#fda4af" },
            { label: "Drafts",   value: drafts,   color: "#fde68a" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, equipment, certificate no, asset tag…"
            style={{
              width: "100%", padding: "11px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(102,126,234,0.25)",
              color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#f472b6", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center", fontSize: 14 }}>
            Loading certificates…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ color: "#64748b", padding: "40px 0", textAlign: "center", fontSize: 14 }}>
            {search ? "No certificates match your search." : "No certificates yet. Create your first one!"}
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>

            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr 110px 110px 110px 120px",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, fontWeight: 800, color: "#64748b",
              textTransform: "uppercase", letterSpacing: "0.1em",
              gap: 8,
            }}>
              <div>Cert No.</div>
              <div>Company / Equipment</div>
              <div>Type</div>
              <div>Issue Date</div>
              <div>Expiry</div>
              <div>Result</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            {filtered.map((c) => {
              const expired = isExpired(c.valid_to);
              const company = c.company || c.assets?.clients?.company_name || "—";
              const equip   = c.equipment_description || c.assets?.asset_type || "—";
              const certNo  = c.certificate_number || c.equipment_id || c.assets?.asset_tag || c.id?.slice(0, 8).toUpperCase();

              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 1fr 110px 110px 110px 120px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    alignItems: "center",
                    gap: 8,
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => router.push(`/certificates/${c.id}`)}
                >
                  {/* Cert No */}
                  <div style={{ color: "#7c5cfc", fontWeight: 700, fontSize: 12, wordBreak: "break-all" }}>
                    {certNo}
                  </div>

                  {/* Company / Equipment */}
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{company}</div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{equip}</div>
                    {c.equipment_location && (
                      <div style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>📍 {c.equipment_location}</div>
                    )}
                  </div>

                  {/* Type */}
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {c.certificate_type || "—"}
                  </div>

                  {/* Issue Date */}
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    {formatDate(c.issued_at)}
                  </div>

                  {/* Expiry */}
                  <div style={{ color: expired ? "#fda4af" : "#94a3b8", fontSize: 12, fontWeight: expired ? 700 : 400 }}>
                    {formatDate(c.valid_to)}
                    {expired && <div style={{ fontSize: 9, color: "#fda4af", fontWeight: 700 }}>EXPIRED</div>}
                  </div>

                  {/* Result badge */}
                  <div>
                    <Badge label={c.equipment_status || "—"} map={STATUS_COLOR} />
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/certificates/${c.id}`)}
                      title="View"
                      style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                      title="Print"
                      style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                    >
                      🖨
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ color: "#475569", fontSize: 12, marginTop: 12, textAlign: "right" }}>
            Showing {filtered.length} of {total} certificate{total !== 1 ? "s" : ""}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
