"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import AppLayout from "../../components/AppLayout";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  yellow: "#fbbf24",
  red: "#ef4444",
  slate: "#94a3b8",
};

export default function CertificatesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      router.push("/login");
      return;
    }

    setUser(data.user);
    await loadCertificates();
  }

  async function loadCertificates() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCertificates(data || []);
    } catch (err) {
      console.error("Error loading certificates:", err.message);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }

  function normalizeInspectionStatus(cert) {
    const raw =
      cert?.inspection_status ||
      cert?.equipmentStatus ||
      cert?.equipment_status ||
      cert?.testStatus ||
      cert?.test_status ||
      cert?.status ||
      "";

    const v = String(raw).toLowerCase();

    if (v.includes("fail")) return "fail";
    if (v.includes("conditional")) return "conditional";
    if (v.includes("pass")) return "pass";
    return "unknown";
  }

  function getStatusMeta(cert) {
    const st = normalizeInspectionStatus(cert);

    if (st === "pass") {
      return { label: "PASS", color: C.green, bg: "rgba(0,245,196,0.10)", border: "rgba(0,245,196,0.25)" };
    }
    if (st === "fail") {
      return { label: "FAIL", color: C.red, bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)" };
    }
    if (st === "conditional") {
      return { label: "CONDITIONAL", color: C.yellow, bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)" };
    }

    return { label: "UNKNOWN", color: "#cbd5e1", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)" };
  }

  function getExpiryMeta(cert) {
    const expiry =
      cert?.expiry ||
      cert?.expiryDate ||
      cert?.valid_to ||
      cert?.expiry_date ||
      null;

    if (!expiry) {
      return { label: "No expiry", color: "#94a3b8" };
    }

    const expiryDate = new Date(expiry);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / 86400000);

    if (daysLeft < 0) return { label: "Expired", color: C.red };
    if (daysLeft <= 30) return { label: "Expiring", color: C.yellow };
    return { label: "Valid", color: "#22c55e" };
  }

  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const certificateNumber =
        cert?.certificate_number ||
        cert?.certNo ||
        cert?.certificateNumber ||
        "";

      const certificateType =
        cert?.certificate_type ||
        cert?.type ||
        cert?.certificateType ||
        "";

      const company =
        cert?.company ||
        cert?.client ||
        "";

      const equipmentType =
        cert?.equipment_type ||
        cert?.equipmentType ||
        "";

      const equipmentTag =
        cert?.equipment_tag_no ||
        cert?.equipmentTag ||
        cert?.identification_number ||
        cert?.identificationNumber ||
        "";

      const q = search.toLowerCase().trim();

      const matchesSearch =
        !q ||
        String(certificateNumber).toLowerCase().includes(q) ||
        String(certificateType).toLowerCase().includes(q) ||
        String(company).toLowerCase().includes(q) ||
        String(equipmentType).toLowerCase().includes(q) ||
        String(equipmentTag).toLowerCase().includes(q);

      const currentStatus = normalizeInspectionStatus(cert);
      const matchesStatus =
        statusFilter === "all" ? true : currentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [certificates, search, statusFilter]);

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

  function openCertificate(cert) {
    if (!cert?.id) {
      alert("This certificate record has no database id.");
      return;
    }
    router.push(`/certificates/${cert.id}`);
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={{ padding: 40, color: "#fff" }}>Loading certificates...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: "clamp(22px,4vw,32px)",
            fontWeight: 900,
            margin: 0,
            background: `linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Certificates
        </h1>
        <p style={{ color: "#64748b", marginTop: 8, fontSize: 13 }}>
          View, search, and manage all issued certificates.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificate number, client, equipment..."
            style={{
              minWidth: 260,
              flex: 1,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(124,92,252,0.25)",
              borderRadius: 10,
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(124,92,252,0.25)",
              borderRadius: 10,
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              cursor: "pointer",
              minWidth: 150,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="conditional">Conditional</option>
            <option value="fail">Fail</option>
          </select>
        </div>

        <button
          onClick={() => router.push("/certificates/create")}
          style={{
            padding: "11px 18px",
            borderRadius: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: 13,
            background: `linear-gradient(135deg,${C.purple},${C.blue})`,
            border: "none",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          + Create Certificate
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Total" value={certificates.length} color="#fff" />
        <StatCard
          label="Pass"
          value={certificates.filter((c) => normalizeInspectionStatus(c) === "pass").length}
          color={C.green}
        />
        <StatCard
          label="Conditional"
          value={certificates.filter((c) => normalizeInspectionStatus(c) === "conditional").length}
          color={C.yellow}
        />
        <StatCard
          label="Fail"
          value={certificates.filter((c) => normalizeInspectionStatus(c) === "fail").length}
          color={C.red}
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(124,92,252,0.18)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {filteredCertificates.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: "#94a3b8" }}>
            No certificates found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <Th>Certificate No</Th>
                  <Th>Type</Th>
                  <Th>Client</Th>
                  <Th>Equipment</Th>
                  <Th>Tag No</Th>
                  <Th>Inspection</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert, i) => {
                  const status = getStatusMeta(cert);
                  const expiry = getExpiryMeta(cert);

                  const certNo =
                    cert?.certificate_number ||
                    cert?.certNo ||
                    cert?.certificateNumber ||
                    "—";

                  const type =
                    cert?.certificate_type ||
                    cert?.type ||
                    cert?.certificateType ||
                    "—";

                  const client =
                    cert?.company ||
                    cert?.client ||
                    "—";

                  const equipmentType =
                    cert?.equipment_type ||
                    cert?.equipmentType ||
                    cert?.equipment_description ||
                    cert?.equipmentDescription ||
                    "—";

                  const tagNo =
                    cert?.equipment_tag_no ||
                    cert?.equipmentTag ||
                    cert?.identification_number ||
                    cert?.identificationNumber ||
                    "—";

                  const inspectionDate =
                    cert?.inspection_date ||
                    cert?.inspectionDate ||
                    cert?.issued_at ||
                    cert?.issued ||
                    "—";

                  const expiryDate =
                    cert?.expiry ||
                    cert?.expiryDate ||
                    cert?.valid_to ||
                    cert?.expiry_date ||
                    "—";

                  return (
                    <tr
                      key={cert.id || i}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}
                    >
                      <Td strong>{certNo}</Td>
                      <Td>{type}</Td>
                      <Td>{client}</Td>
                      <Td>{equipmentType}</Td>
                      <Td>{tagNo}</Td>
                      <Td>{formatDate(inspectionDate)}</Td>
                      <Td>
                        <span style={{ color: expiry.color, fontWeight: 700 }}>
                          {formatDate(expiryDate)}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            color: status.color,
                            background: status.bg,
                            border: `1px solid ${status.border}`,
                            minWidth: 92,
                          }}
                        >
                          {status.label}
                        </span>
                      </Td>
                      <Td>
                        <button
                          onClick={() => openCertificate(cert)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: 700,
                            fontSize: 12,
                            background: "rgba(79,195,247,0.12)",
                            border: "1px solid rgba(79,195,247,0.25)",
                            color: C.blue,
                          }}
                        >
                          Open
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "14px 14px",
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, strong }) {
  return (
    <td
      style={{
        padding: "14px 14px",
        color: strong ? "#fff" : "#cbd5e1",
        fontSize: 13,
        fontWeight: strong ? 800 : 500,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}
