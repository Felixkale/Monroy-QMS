"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

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

const licenseColor = {
  valid: C.green,
  expiring: C.yellow,
  expired: C.pink,
};

const PRESSURE_EQUIPMENT_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function prettyLabel(text) {
  return String(text)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tag = params?.tag;

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tab, setTab] = useState("overview");
  const [deleting, setDeleting] = useState(false);

  const [certificates, setCertificates] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);

  useEffect(() => {
    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);

      const email = data.user.email || "";
      setIsAdmin(email.includes("admin"));
    }

    checkAuth();
  }, [router]);

  const loadEquipment = useCallback(async () => {
    if (!tag) return;

    setLoading(true);
    setError(null);

    try {
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .select(`
          *,
          clients (
            id,
            company_name,
            company_code,
            contact_person,
            contact_email,
            contact_phone
          ),
          asset_nameplate (
            *
          )
        `)
        .eq("asset_tag", tag)
        .single();

      if (assetError) throw assetError;
      if (!asset) throw new Error("Equipment not found");

      const assetId = asset.id;

      const [
        certRes,
        inspRes,
        docsRes,
        auditRes,
      ] = await Promise.all([
        supabase
          .from("certificates")
          .select("*")
          .eq("asset_id", assetId)
          .order("created_at", { ascending: false }),

        supabase
          .from("inspections")
          .select("*")
          .eq("asset_id", assetId)
          .order("inspection_date", { ascending: false }),

        supabase
          .from("inspection_files")
          .select("*")
          .in(
            "inspection_id",
            (
              await supabase
                .from("inspections")
                .select("id")
                .eq("asset_id", assetId)
            ).data?.map((x) => x.id) || ["00000000-0000-0000-0000-000000000000"]
          ),

        supabase
          .from("audit_log")
          .select("*")
          .eq("entity_id", assetId)
          .order("created_at", { ascending: false }),
      ]);

      setEquipment(asset);
      setCertificates(certRes.data || []);
      setInspections(inspRes.data || []);
      setDocuments(docsRes.data || []);
      setAuditTrail(auditRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    if (user) {
      loadEquipment();
    }
  }, [user, loadEquipment]);

  async function deleteEquipment() {
    if (!isAdmin || !equipment) return;

    const ok = window.confirm(
      `Permanently delete ${equipment.asset_tag}? This cannot be undone.`
    );
    if (!ok) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", equipment.id);

      if (error) throw error;

      router.push("/equipment");
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  }

  const cardStyle = (accentColor) => ({
    background: "rgba(255,255,255,0.02)",
    border: `1px solid rgba(${rgbaMap[accentColor] || "102,126,234"},0.2)`,
    borderRadius: 16,
    padding: 20,
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "nameplate", label: "Nameplate Data", icon: "📋" },
    { id: "certificates", label: "Certificates", icon: "📜" },
    { id: "inspections", label: "Inspections", icon: "🔍" },
    { id: "documents", label: "Documents", icon: "📁" },
    { id: "audit", label: "Audit Trail", icon: "🧾" },
  ];

  if (loading) {
    return (
      <AppLayout title="Equipment Detail">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            <div style={{ color: "#64748b", fontSize: 14 }}>Loading equipment…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !equipment) {
    return (
      <AppLayout title="Equipment Not Found">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ color: "#fff", margin: "0 0 8px" }}>Equipment Not Found</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
            {error || `No equipment with tag "${tag}" exists in the register.`}
          </p>
          <button
            onClick={() => router.push("/equipment")}
            style={{
              padding: "10px 24px",
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ← Back to Equipment
          </button>
        </div>
      </AppLayout>
    );
  }

  const client = equipment.clients || null;
  const nameplate = equipment.asset_nameplate?.[0] || {};
  const lColor = licenseColor[equipment.license_status] || C.green;
  const lRgba = rgbaMap[lColor];
  const isPressureEquipment = PRESSURE_EQUIPMENT_TYPES.includes(equipment.asset_type);

  return (
    <AppLayout title={equipment.asset_tag}>
      <style>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(102,126,234,0.25); border-radius: 10px; }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <button
            onClick={() => router.push("/equipment")}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
              marginBottom: 10,
              display: "block",
            }}
          >
            ← Back to Equipment
          </button>

          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            {equipment.serial_number || "—"} · {equipment.asset_type || "—"} · {client?.company_name || "—"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={`/qr-codes?tag=${equipment.asset_tag}`}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              textDecoration: "none",
              background: "rgba(0,245,196,0.1)",
              border: "1px solid rgba(0,245,196,0.3)",
              color: C.green,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            🏷️ QR Code
          </a>

          <button
            onClick={() => router.push(`/equipment/${equipment.asset_tag}/edit`)}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              background: "rgba(124,92,252,0.15)",
              border: "1px solid rgba(124,92,252,0.3)",
              color: C.purple,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✏️ Edit
          </button>

          {isAdmin && (
            <button
              onClick={deleteEquipment}
              disabled={deleting}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                background: "rgba(244,114,182,0.1)",
                border: "1px solid rgba(244,114,182,0.3)",
                color: C.pink,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "Deleting…" : "🗑️ Delete"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {[
          { label: "Type", value: equipment.asset_type, color: C.blue },
          { label: "Status", value: equipment.status, color: equipment.status === "active" ? C.green : C.pink },
          { label: "License", value: equipment.license_status || "valid", color: lColor },
          { label: "Year Built", value: equipment.year_built, color: C.yellow },
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
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>
              {s.value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          overflowX: "auto",
          borderBottom: "1px solid rgba(102,126,234,0.1)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 16px",
              borderRadius: "10px 10px 0 0",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              whiteSpace: "nowrap",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${C.purple}` : "2px solid transparent",
              color: tab === t.id ? C.purple : "#64748b",
              transition: "all .2s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
          <div style={cardStyle(C.blue)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: C.blue }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Equipment Details</span>
            </div>

            {[
              { label: "Asset Tag", value: equipment.asset_tag },
              { label: "Serial Number", value: equipment.serial_number },
              { label: "Manufacturer", value: equipment.manufacturer },
              { label: "Model", value: equipment.model },
              { label: "Location", value: equipment.location },
              { label: "Department", value: equipment.department },
              { label: "Client", value: client?.company_name },
              { label: "Client Code", value: client?.company_code },
              { label: "Contact Person", value: client?.contact_person },
              { label: "Contact Email", value: client?.contact_email },
              { label: "Contact Phone", value: client?.contact_phone },
              { label: "Installation Date", value: formatDate(equipment.installation_date) },
              { label: "Last Inspection", value: formatDate(equipment.last_inspection_date) },
              { label: "Next Inspection", value: formatDate(equipment.next_inspection_date) },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#64748b" }}>{f.label}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, textAlign: "right" }}>
                  {f.value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div style={cardStyle(lColor)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: lColor }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>License Status</span>
            </div>

            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🔐</div>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: `rgba(${lRgba},0.12)`,
                  color: lColor,
                  border: `1px solid rgba(${lRgba},0.3)`,
                  textTransform: "capitalize",
                }}
              >
                {equipment.license_status || "valid"}
              </span>

              <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
                Expiry: {formatDate(equipment.license_expiry)}
              </p>

              {equipment.license_status === "expiring" && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: `rgba(${lRgba},0.08)`,
                    border: `1px solid rgba(${lRgba},0.2)`,
                    fontSize: 11,
                    color: lColor,
                  }}
                >
                  ⚠️ License expiring soon — schedule renewal
                </div>
              )}

              {equipment.license_status === "expired" && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(244,114,182,0.08)",
                    border: "1px solid rgba(244,114,182,0.2)",
                    fontSize: 11,
                    color: C.pink,
                  }}
                >
                  ❌ License expired — equipment must not be operated
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle(C.green)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: C.green }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Technical Data</span>
            </div>

            {[
              { label: "Design Standard", value: equipment.design_standard },
              { label: "Certificate Type", value: equipment.cert_type },
              { label: "Inspection Frequency", value: equipment.inspection_freq },
              { label: "Shell Material", value: equipment.shell_material },
              { label: "Fluid Type", value: equipment.fluid_type },
              { label: "Design Pressure", value: equipment.design_pressure },
              { label: "Working Pressure", value: equipment.working_pressure },
              { label: "Test Pressure", value: equipment.test_pressure },
              { label: "Design Temperature", value: equipment.design_temperature },
              { label: "Capacity Volume", value: equipment.capacity_volume },
              { label: "Safe Working Load", value: equipment.safe_working_load },
              { label: "National Reg. No", value: equipment.national_reg_no },
              { label: "Notified Body", value: equipment.notified_body },
            ].map((f) =>
              f.value !== null && f.value !== undefined && f.value !== "" ? (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#64748b" }}>{f.label}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600, textAlign: "right" }}>
                    {String(f.value)}
                  </span>
                </div>
              ) : null
            )}

            {equipment.notes && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Notes</div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    padding: 12,
                    color: "#e2e8f0",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {equipment.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "nameplate" && (
        <div style={cardStyle(C.blue)}>
          {Object.keys(nameplate).filter((k) => !["id", "asset_id", "created_at", "updated_at"].includes(k) && nameplate[k] !== null && nameplate[k] !== "").length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              No nameplate data recorded yet
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {Object.entries(nameplate)
                .filter(([k]) => !["id", "asset_id", "created_at", "updated_at"].includes(k))
                .filter(([, v]) => v !== null && v !== "")
                .map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      {prettyLabel(key)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                      {String(value)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === "certificates" && (
        <div style={{ ...cardStyle(C.green), padding: 0, overflow: "hidden" }}>
          {certificates.length > 0 ? (
            certificates.map((cert, i) => (
              <div
                key={cert.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: i < certificates.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                    {cert.certificate_number || "Certificate"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {cert.certificate_type || "—"} · Status: {cert.status || "—"} · Issued: {formatDate(cert.issued_at)}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Valid to: {formatDate(cert.valid_to)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No certificates found
            </div>
          )}
        </div>
      )}

      {tab === "inspections" && (
        <div style={{ ...cardStyle(C.yellow), padding: 0, overflow: "hidden" }}>
          {inspections.length > 0 ? (
            inspections.map((inspection, i) => (
              <div
                key={inspection.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: i < inspections.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                    {inspection.inspection_number || "Inspection"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Result: {inspection.result || "—"} · Status: {inspection.status || "—"}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
                  <div>{formatDate(inspection.inspection_date)}</div>
                  <div style={{ marginTop: 2 }}>Next: {formatDate(inspection.next_inspection_date)}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No inspections recorded yet
            </div>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div style={{ ...cardStyle(C.purple), padding: 0, overflow: "hidden" }}>
          {documents.length > 0 ? (
            documents.map((doc, i) => (
              <div
                key={doc.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: i < documents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "rgba(79,195,247,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    📄
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                      {doc.file_name || "Document"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {doc.file_type || "—"} · {doc.file_size || "—"}
                    </div>
                  </div>
                </div>

                {doc.file_url ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: 12,
                      background: "rgba(0,245,196,0.1)",
                      border: "1px solid rgba(0,245,196,0.3)",
                      color: C.green,
                      textDecoration: "none",
                    }}
                  >
                    ⬇ Download
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: "#64748b" }}>No file URL</span>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No documents uploaded yet
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div style={{ ...cardStyle(C.purple), padding: 0, overflow: "hidden" }}>
          {auditTrail.length > 0 ? (
            auditTrail.map((entry, i) => (
              <div
                key={entry.id || i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: i < auditTrail.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.green,
                    boxShadow: `0 0 6px ${C.green}`,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                    {entry.action || "Activity"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {entry.entity_type || "asset"}
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {formatDate(entry.created_at)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              No audit trail available
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
