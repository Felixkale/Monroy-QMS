"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
};

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
    if (tag) fetchAll();
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

      if (certificatesRes.error) console.error(certificatesRes.error);
      if (ncrRes.error) console.error(ncrRes.error);
      if (reportsRes.error) console.error(reportsRes.error);
      if (inspectionsRes.error) console.error(inspectionsRes.error);
      if (documentsRes.error) console.error(documentsRes.error);

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

  function badge(status) {
    const s = String(status || "").toLowerCase();

    if (s.includes("expired") || s.includes("closed overdue") || s.includes("inactive")) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
          {status || "expired"}
        </span>
      );
    }

    if (s.includes("expiring") || s.includes("pending") || s.includes("open")) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
          {status}
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        {status || "valid"}
      </span>
    );
  }

  function InfoCard({ label, value }) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
        <p className="mt-2 text-sm md:text-base font-semibold text-white break-words">
          {value || "N/A"}
        </p>
      </div>
    );
  }

  function TabButton({ id, label, count }) {
    const active = activeTab === id;

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
          active
            ? "bg-[#7c5cfc] border-[#7c5cfc] text-white"
            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
        }`}
      >
        {label} {typeof count === "number" ? `(${count})` : ""}
      </button>
    );
  }

  function EmptyState({ text }) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-white/60">
        {text}
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Equipment Details">
        <div className="min-h-screen bg-[#060b16] text-white px-4 md:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-white/70">
              Loading equipment details...
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!equipment) {
    return (
      <AppLayout title="Equipment Details">
        <div className="min-h-screen bg-[#060b16] text-white px-4 md:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-8">
              <p className="text-white/80">
                {error || "Equipment not found."}
              </p>
              <button
                onClick={() => router.push("/equipment")}
                className="mt-4 px-4 py-2 rounded-xl bg-[#7c5cfc] text-white font-semibold"
              >
                Back to Equipment
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={equipment.asset_name || "Equipment"}>
      <div className="min-h-screen bg-[#060b16] text-white px-4 md:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/equipment")}
                className="mb-4 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
              >
                ← Back to Equipment
              </button>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {equipment.asset_name || "Equipment"}
              </h1>

              <div
                className="mt-3 h-1.5 w-20 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${C.green}, ${C.purple})`,
                }}
              />

              <p className="mt-4 text-white/70 text-sm md:text-base">
                {(equipment.asset_tag || "No Tag")} •{" "}
                {(equipment.asset_type || "No Type")} •{" "}
                {(equipment.manufacturer || "Unknown Manufacturer")}
              </p>

              <p className="mt-1 text-white/60 text-sm md:text-base">
                Serial: {equipment.serial_number || "N/A"} | Location:{" "}
                {equipment.location || "N/A"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {badge(
                equipment.license_status ||
                  equipment.certificate_status ||
                  equipment.inspection_status ||
                  "valid"
              )}

              <Link
                href={`/equipment/${equipment.asset_tag}/edit`}
                className="px-4 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef2] text-white text-sm font-semibold"
              >
                Edit Equipment
              </Link>

              {certificates.length > 0 && (
                <Link
                  href={`/certificates/${certificates[0].id}`}
                  className="px-4 py-2 rounded-xl bg-[#00f5c4] hover:opacity-90 text-[#111827] text-sm font-semibold"
                >
                  View Certificate
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              ⚠️ {error}
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">Certificates</p>
              <p className="mt-2 text-2xl font-black">{stats.certificates}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">NCRs</p>
              <p className="mt-2 text-2xl font-black">{stats.ncrs}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">Reports</p>
              <p className="mt-2 text-2xl font-black">{stats.reports}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">Inspections</p>
              <p className="mt-2 text-2xl font-black">{stats.inspections}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">Documents</p>
              <p className="mt-2 text-2xl font-black">{stats.documents}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
              <p className="text-sm text-white/50">Next Inspection</p>
              <p className="mt-2 text-sm font-bold break-words">
                {equipment.next_inspection_date || "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <TabButton id="overview" label="Overview" />
            <TabButton id="certificates" label="Certificates" count={certificates.length} />
            <TabButton id="ncrs" label="NCRs" count={ncrs.length} />
            <TabButton id="reports" label="Reports" count={reports.length} />
            <TabButton id="inspections" label="Inspection History" count={inspections.length} />
            <TabButton id="documents" label="Documents" count={documents.length} />
          </div>

          <div className="mt-6">
            {activeTab === "overview" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                <InfoCard label="Shell / Body Material" value={equipment.shell_material} />
                <InfoCard label="Design Standard" value={equipment.design_standard} />
                <InfoCard label="Inspection Frequency" value={equipment.inspection_freq} />
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
            )}

            {activeTab === "certificates" && (
              <div className="space-y-4">
                {certificates.length === 0 ? (
                  <EmptyState text="No certificates found for this equipment." />
                ) : (
                  certificates.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1220] p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {item.certificate_no || item.certificate_number || "Certificate"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            Issue Date: {item.issued_at ? String(item.issued_at).slice(0, 10) : "N/A"} | Expiry Date:{" "}
                            {item.valid_to || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Inspector: {item.inspector_name || "N/A"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {badge(item.status || "valid")}
                          <Link
                            href={`/certificates/${item.id}`}
                            className="px-4 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef2] text-white text-sm font-semibold"
                          >
                            View Certificate
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "ncrs" && (
              <div className="space-y-4">
                {ncrs.length === 0 ? (
                  <EmptyState text="No NCRs found for this equipment." />
                ) : (
                  ncrs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1220] p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {item.ncr_no || item.ncr_number || "NCR"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            Date: {item.created_at?.slice(0, 10) || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Description: {item.description || "N/A"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {badge(item.status || "pending")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <EmptyState text="No reports found for this equipment." />
                ) : (
                  reports.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1220] p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {item.report_no || item.report_number || "Report"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            Date: {item.created_at?.slice(0, 10) || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Report Type: {item.report_type || "N/A"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {badge(item.status || "active")}
                          {item.id && (
                            <Link
                              href={`/reports/${item.id}`}
                              className="px-4 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef2] text-white text-sm font-semibold"
                            >
                              View Report
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "inspections" && (
              <div className="space-y-4">
                {inspections.length === 0 ? (
                  <EmptyState text="No inspection history found for this equipment." />
                ) : (
                  inspections.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1220] p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {item.inspection_type || "Inspection"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            Date: {item.inspection_date || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Inspector: {item.inspector_name || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Remarks: {item.remarks || "N/A"}
                          </p>
                        </div>

                        <div>{badge(item.status || "completed")}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <EmptyState text="No documents uploaded for this equipment." />
                ) : (
                  documents.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1220] p-5"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {item.title || item.file_name || "Document"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            Type: {item.document_type || "N/A"}
                          </p>
                          <p className="mt-1 text-sm text-white/60">
                            Uploaded: {item.created_at?.slice(0, 10) || "N/A"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.file_url ? (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-xl bg-[#7c5cfc] hover:bg-[#6d4ef2] text-white text-sm font-semibold"
                            >
                              Open Document
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-semibold cursor-not-allowed"
                            >
                              No File
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
