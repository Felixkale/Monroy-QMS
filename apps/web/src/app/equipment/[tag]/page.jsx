"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
  getEquipmentByTag,
  getCertificatesByAssetId,
  getNcrsByAssetId,
  getReportsByAssetId,
  getInspectionsByAssetId,
  getDocumentsByAssetId,
} from "@/services/equipment";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  red: "#fb7185",
  yellow: "#facc15",
};

const cardStyle = {
  background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
  border: "1px solid rgba(102,126,234,0.18)",
  borderRadius: 16,
  padding: 20,
};

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#667eea",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(102,126,234,0.2)",
  paddingBottom: 8,
  marginBottom: 16,
  marginTop: 8,
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  return value;
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("expired") || s.includes("inactive")) {
    return {
      label: status || "expired",
      style: {
        background: "rgba(251,113,133,0.12)",
        color: C.red,
        border: "1px solid rgba(251,113,133,0.25)",
      },
    };
  }

  if (s.includes("expiring") || s.includes("pending") || s.includes("open")) {
    return {
      label: status || "pending",
      style: {
        background: "rgba(250,204,21,0.12)",
        color: C.yellow,
        border: "1px solid rgba(250,204,21,0.25)",
      },
    };
  }

  return {
    label: status || "valid",
    style: {
      background: "rgba(0,245,196,0.12)",
      color: C.green,
      border: "1px solid rgba(0,245,196,0.25)",
    },
  };
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {formatValue(value)}
      </div>
    </div>
  );
}

function TabButton({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: active
          ? "1px solid rgba(124,92,252,0.6)"
          : "1px solid rgba(255,255,255,0.1)",
        background: active
          ? "linear-gradient(135deg,#667eea,#764ba2)"
          : "rgba(255,255,255,0.04)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {label} {typeof count === "number" ? `(${count})` : ""}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ ...cardStyle, color: "rgba(255,255,255,0.6)" }}>
      {text}
    </div>
  );
}

export default function EquipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [equipment, setEquipment] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [reports, setReports] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (tag) {
      fetchAll();
    }
  }, [tag]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError("");

      const equipmentRes = await getEquipmentByTag(tag);

      if (equipmentRes.error) {
        throw equipmentRes.error;
      }

      if (!equipmentRes.data) {
        setEquipment(null);
        return;
      }

      setEquipment(equipmentRes.data);

      const assetId = equipmentRes.data.id;

      const [
        certificatesRes,
        ncrRes,
        reportsRes,
        inspectionsRes,
        documentsRes,
      ] = await Promise.all([
        getCertificatesByAssetId(assetId),
        getNcrsByAssetId(assetId),
        getReportsByAssetId(assetId),
        getInspectionsByAssetId(assetId),
        getDocumentsByAssetId(assetId),
      ]);

      setCertificates(certificatesRes.data || []);
      setNcrs(ncrRes.data || []);
      setReports(reportsRes.data || []);
      setInspections(inspectionsRes.data || []);
      setDocuments(documentsRes.data || []);
    } catch (err) {
      console.error("Failed to load equipment details:", err);
      setError(err?.message || "Failed to load equipment details.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    return {
      certificates: certificates.length,
      ncrs: ncrs.length,
      reports: reports.length,
      inspections: inspections.length,
      documents: documents.length,
    };
  }, [certificates, ncrs, reports, inspections, documents]);

  if (loading) {
    return (
      <AppLayout title="Equipment Details">
        <div style={{ color: "#fff", padding: "32px 0" }}>Loading equipment details...</div>
      </AppLayout>
    );
  }

  if (!equipment) {
    return (
      <AppLayout title="Equipment Details">
        <div style={cardStyle}>
          <div style={{ color: "#fff", fontSize: 15 }}>{error || "Equipment not found."}</div>
          <button
            onClick={() => router.push("/equipment")}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "#fff",
            }}
          >
            Back to Equipment
          </button>
        </div>
      </AppLayout>
    );
  }

  const mainBadge = statusBadge(
    equipment.license_status || equipment.certificate_status || equipment.inspection_status || "valid"
  );

  return (
    <AppLayout title={equipment.asset_name || "Equipment"}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.push("/equipment")}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            marginBottom: 14,
            fontFamily: "inherit",
          }}
        >
          ← Back to Equipment
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(22px,4vw,32px)",
            fontWeight: 900,
            color: "#fff",
          }}
        >
          {equipment.asset_name || "Equipment"}
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

        <div style={{ marginTop: 14, color: "rgba(255,255,255,0.75)", fontSize: 15 }}>
          {(equipment.asset_tag || "No Tag")} • {(equipment.asset_type || "No Type")} •{" "}
          {(equipment.manufacturer || "Unknown Manufacturer")}
        </div>

        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
          Serial: {formatValue(equipment.serial_number)} | Location: {formatValue(equipment.location)}
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

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <span
          style={{
            ...mainBadge.style,
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {mainBadge.label}
        </span>

        <button
          onClick={() => router.push(`/equipment/${equipment.asset_tag}/edit`)}
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
          Edit Equipment
        </button>

        {certificates.length > 0 && (
          <button
            onClick={() => router.push(`/certificates/${certificates[0].id}`)}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
              color: "#111827",
            }}
          >
            View Certificate
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          marginBottom: 24,
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Certificates</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.certificates}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>NCRs</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.ncrs}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Reports</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.reports}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Inspections</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.inspections}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Documents</div>
          <div style={{ color: "#fff", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{stats.documents}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Next Inspection</div>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginTop: 8 }}>
            {formatValue(equipment.next_inspection_date)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <TabButton active={activeTab === "overview"} label="Overview" onClick={() => setActiveTab("overview")} />
        <TabButton active={activeTab === "certificates"} label="Certificates" count={certificates.length} onClick={() => setActiveTab("certificates")} />
        <TabButton active={activeTab === "ncrs"} label="NCRs" count={ncrs.length} onClick={() => setActiveTab("ncrs")} />
        <TabButton active={activeTab === "reports"} label="Reports" count={reports.length} onClick={() => setActiveTab("reports")} />
        <TabButton active={activeTab === "inspections"} label="Inspection History" count={inspections.length} onClick={() => setActiveTab("inspections")} />
        <TabButton active={activeTab === "documents"} label="Documents" count={documents.length} onClick={() => setActiveTab("documents")} />
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={sectionTitleStyle}>Equipment Overview</div>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            }}
          >
            <InfoCard label="Asset Name" value={equipment.asset_name} />
            <InfoCard label="Asset Tag" value={equipment.asset_tag} />
            <InfoCard label="Equipment Type" value={equipment.asset_type} />
            <InfoCard label="Serial Number" value={equipment.serial_number} />
            <InfoCard label="Manufacturer" value={equipment.manufacturer} />
            <InfoCard label="Model" value={equipment.model} />
            <InfoCard label="Client" value={equipment.clients?.company_name} />
            <InfoCard label="Client Code" value={equipment.clients?.company_code} />
            <InfoCard label="Location" value={equipment.location} />
            <InfoCard label="Department" value={equipment.department} />
            <InfoCard label="Year Built" value={equipment.year_built} />
            <InfoCard label="Certificate Type" value={equipment.cert_type} />
            <InfoCard label="Design Standard" value={equipment.design_standard} />
            <InfoCard label="Inspection Frequency" value={equipment.inspection_freq} />
            <InfoCard label="Shell / Body Material" value={equipment.shell_material} />
            <InfoCard label="Fluid Type" value={equipment.fluid_type} />
            <InfoCard label="Design Pressure" value={equipment.design_pressure ? `${equipment.design_pressure} kPa` : null} />
            <InfoCard label="Working Pressure" value={equipment.working_pressure ? `${equipment.working_pressure} kPa` : null} />
            <InfoCard label="Test Pressure" value={equipment.test_pressure ? `${equipment.test_pressure} kPa` : null} />
            <InfoCard label="Design Temperature" value={equipment.design_temperature} />
            <InfoCard label="Capacity / Volume" value={equipment.capacity_volume} />
            <InfoCard label="SWL" value={equipment.safe_working_load ? `${equipment.safe_working_load} Tons` : null} />
            <InfoCard label="Proof Load" value={equipment.proof_load ? `${equipment.proof_load} Tons` : null} />
            <InfoCard label="Lift Height" value={equipment.lifting_height} />
            <InfoCard label="Sling Length" value={equipment.sling_length} />
            <InfoCard label="Chain Size" value={equipment.chain_size} />
            <InfoCard label="Rope Diameter" value={equipment.rope_diameter} />
            <InfoCard label="Condition" value={equipment.condition} />
            <InfoCard label="Status" value={equipment.status} />
            <InfoCard label="License Status" value={equipment.license_status} />
            <InfoCard label="License Expiry" value={equipment.license_expiry} />
            <InfoCard label="Last Inspection Date" value={equipment.last_inspection_date} />
            <InfoCard label="Next Inspection Date" value={equipment.next_inspection_date} />
            <InfoCard label="Notes" value={equipment.notes} />
          </div>
        </div>
      )}

      {activeTab === "certificates" && (
        <div>
          <div style={sectionTitleStyle}>Certificates</div>
          {certificates.length === 0 ? (
            <EmptyState text="No certificates found for this equipment." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {certificates.map((item) => {
                const badge = statusBadge(item.status || "valid");

                return (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                          {item.certificate_no || item.certificate_number || "Certificate"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
                          Issue Date: {item.issue_date || "N/A"} | Expiry Date: {item.expiry_date || "N/A"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
                          Inspector: {item.inspector_name || "N/A"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            ...badge.style,
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {badge.label}
                        </span>

                        <button
                          onClick={() => router.push(`/certificates/${item.id}`)}
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
                          View Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "ncrs" && (
        <div>
          <div style={sectionTitleStyle}>NCRs</div>
          {ncrs.length === 0 ? (
            <EmptyState text="No NCRs found for this equipment." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {ncrs.map((item) => {
                const badge = statusBadge(item.status || "pending");

                return (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                          {item.ncr_no || item.ncr_number || "NCR"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
                          Date: {item.created_at?.slice(0, 10) || "N/A"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
                          Description: {item.description || "N/A"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...badge.style,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          height: "fit-content",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div>
          <div style={sectionTitleStyle}>Reports</div>
          {reports.length === 0 ? (
            <EmptyState text="No reports found for this equipment." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {reports.map((item) => {
                const badge = statusBadge(item.status || "active");

                return (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                          {item.report_no || item.report_number || "Report"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
                          Date: {item.created_at?.slice(0, 10) || "N/A"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
                          Report Type: {item.report_type || "N/A"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...badge.style,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          height: "fit-content",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "inspections" && (
        <div>
          <div style={sectionTitleStyle}>Inspection History</div>
          {inspections.length === 0 ? (
            <EmptyState text="No inspection history found for this equipment." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {inspections.map((item) => {
                const badge = statusBadge(item.status || "completed");

                return (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                          {item.inspection_type || "Inspection"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
                          Date: {item.inspection_date || "N/A"}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
                          Remarks: {item.remarks || "N/A"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...badge.style,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                          height: "fit-content",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div>
          <div style={sectionTitleStyle}>Documents</div>
          {documents.length === 0 ? (
            <EmptyState text="No documents uploaded for this equipment." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {documents.map((item) => (
                <div key={item.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>
                        {item.title || item.file_name || "Document"}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
                        Type: {item.document_type || "N/A"}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
                        Uploaded: {item.created_at?.slice(0, 10) || "N/A"}
                      </div>
                    </div>

                    <div>
                      {item.file_url ? (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "10px 14px",
                            borderRadius: 8,
                            textDecoration: "none",
                            fontWeight: 700,
                            background: "linear-gradient(135deg,#667eea,#764ba2)",
                            color: "#fff",
                          }}
                        >
                          Open Document
                        </a>
                      ) : (
                        <button
                          disabled
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(255,255,255,0.4)",
                            fontWeight: 700,
                            cursor: "not-allowed",
                          }}
                        >
                          No File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
