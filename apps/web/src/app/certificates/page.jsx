"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const STATUS_COLOR = {
  PASS:        { bg: "rgba(16,185,129,0.12)",  color: "#86efac", border: "rgba(16,185,129,0.35)" },
  FAIL:        { bg: "rgba(244,63,94,0.1)",    color: "#fda4af", border: "rgba(244,63,94,0.35)" },
  CONDITIONAL: { bg: "rgba(251,191,36,0.12)",  color: "#fde68a", border: "rgba(251,191,36,0.35)" },
  // ✅ FIX: map "active"/"issued" to PASS display since manually created certs default to these
  ACTIVE:      { bg: "rgba(16,185,129,0.12)",  color: "#86efac", border: "rgba(16,185,129,0.35)" },
  ISSUED:      { bg: "rgba(16,185,129,0.12)",  color: "#86efac", border: "rgba(16,185,129,0.35)" },
};

function normalizeStatus(val) {
  if (!val) return "PASS";
  const up = val.toUpperCase();
  if (up === "ACTIVE" || up === "ISSUED") return "PASS";
  return up;
}

function Badge({ rawStatus }) {
  const key  = normalizeStatus(rawStatus);
  const s    = STATUS_COLOR[key] || { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.3)" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {key}
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

// ── Confirm Delete Modal ──────────────────────────────────────────
function DeleteModal({ cert, onCancel, onConfirm, deleting }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid rgba(244,63,94,0.4)",
        borderRadius: 16, padding: 28, maxWidth: 420, width: "90%",
      }}>
        <h3 style={{ color: "#fda4af", margin: "0 0 12px 0", fontSize: 17 }}>⚠️ Delete Certificate</h3>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px 0" }}>
          This will permanently delete:
        </p>
        <ul style={{ color: "#e2e8f0", fontSize: 13, margin: "0 0 16px 0", paddingLeft: 18 }}>
          <li>Certificate <strong style={{ color: "#7c5cfc" }}>{cert.certificate_number}</strong></li>
          <li>Equipment record <strong style={{ color: "#4fc3f7" }}>
            {cert.equipment_description || cert.assets?.asset_type || "—"}
          </strong> ({cert.assets?.asset_tag})</li>
        </ul>
        <p style={{ color: "#fda4af", fontSize: 12, marginBottom: 20 }}>
          This cannot be undone. The client record will be kept.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={deleting}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontSize: 13, opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting…" : "Delete Both"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const router = useRouter();
  const [certs,    setCerts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [toDelete, setToDelete] = useState(null);   // cert object pending delete
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id, certificate_number, certificate_type,
          company, equipment_description, equipment_location,
          equipment_id, equipment_status, issued_at, valid_to,
          status, inspector_name,
          assets (
            id, asset_tag, asset_type, serial_number,
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

  // ✅ Delete certificate + its equipment asset
  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // 1. Delete certificate first (FK references asset)
      const { error: certErr } = await supabase
        .from("certificates")
        .delete()
        .eq("id", toDelete.id);
      if (certErr) throw certErr;

      // 2. Delete the asset if it exists
      if (toDelete.assets?.id) {
        const { error: assetErr } = await supabase
          .from("assets")
          .delete()
          .eq("id", toDelete.assets.id);
        if (assetErr) throw assetErr;
      }

      setCerts((prev) => prev.filter((c) => c.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setError("Delete failed: " + err.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

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

  const total    = certs.length;
  const passed   = certs.filter((c) => ["PASS","ACTIVE","ISSUED"].includes((c.equipment_status||"").toUpperCase())).length;
  const expiring = certs.filter((c) => isExpired(c.valid_to)).length;
  const drafts   = certs.filter((c) => c.status === "draft").length;

  return (
    <AppLayout title="Certificates">
      <div style={{ maxWidth: 1200 }}>

        {toDelete && (
          <DeleteModal
            cert={toDelete}
            onCancel={() => setToDelete(null)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 28 }}>Certificates</h1>
            <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
              Manage all inspection and test certificates.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/certificates/import")}
              style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              📥 Bulk Import
            </button>
            <button onClick={() => router.push("/certificates/create")}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              + New Certificate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total",   value: total,    color: "#4fc3f7" },
            { label: "Passed",  value: passed,   color: "#86efac" },
            { label: "Expired", value: expiring, color: "#fda4af" },
            { label: "Drafts",  value: drafts,   color: "#fde68a" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, equipment, certificate no, asset tag…"
            style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(102,126,234,0.25)", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {error && (
          <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#f472b6", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center", fontSize: 14 }}>
            Loading certificates…
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ color: "#64748b", padding: "40px 0", textAlign: "center", fontSize: 14 }}>
            {search ? "No certificates match your search." : "No certificates yet. Create your first one!"}
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr 110px 110px 100px 160px",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10, fontWeight: 800, color: "#64748b",
              textTransform: "uppercase", letterSpacing: "0.1em", gap: 8,
            }}>
              <div>Cert No.</div>
              <div>Company / Equipment</div>
              <div>Type</div>
              <div>Issue Date</div>
              <div>Expiry</div>
              <div>Result</div>
              <div>Actions</div>
            </div>

            {filtered.map((c) => {
              const expired = isExpired(c.valid_to);
              const company = c.company || c.assets?.clients?.company_name || "—";
              const equip   = c.equipment_description || c.assets?.asset_type || "—";
              const certNo  = c.certificate_number || c.equipment_id || c.assets?.asset_tag || c.id?.slice(0,8).toUpperCase();

              return (
                <div key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 1fr 110px 110px 100px 160px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    alignItems: "center", gap: 8, cursor: "pointer",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => router.push(`/certificates/${c.id}`)}
                >
                  <div style={{ color: "#7c5cfc", fontWeight: 700, fontSize: 12, wordBreak: "break-all" }}>
                    {certNo}
                  </div>

                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{company}</div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{equip}</div>
                    {c.equipment_location && (
                      <div style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>📍 {c.equipment_location}</div>
                    )}
                  </div>

                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{c.certificate_type || "—"}</div>

                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{formatDate(c.issued_at)}</div>

                  <div style={{ color: expired ? "#fda4af" : "#94a3b8", fontSize: 12, fontWeight: expired ? 700 : 400 }}>
                    {formatDate(c.valid_to)}
                    {expired && <div style={{ fontSize: 9, color: "#fda4af", fontWeight: 700 }}>EXPIRED</div>}
                  </div>

                  {/* ✅ Fixed: normalizes "active"/"issued" → PASS */}
                  <div><Badge rawStatus={c.equipment_status || c.status} /></div>

                  {/* ✅ Actions: View + Print + Delete */}
                  <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => router.push(`/certificates/${c.id}`)}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      View
                    </button>
                    <button onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                      🖨
                    </button>
                    <button onClick={() => setToDelete(c)}
                      style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.08)", color: "#fda4af", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ color: "#475569", fontSize: 12, marginTop: 12, textAlign: "right" }}>
            Showing {filtered.length} of {total} certificate{total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
