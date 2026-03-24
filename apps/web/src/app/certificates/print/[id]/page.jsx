// apps/web/src/app/certificates/print/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";

function normalizeId(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function PrintCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = normalizeId(params?.id);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    loadPrintRows();
  }, [id]);

  async function loadPrintRows() {
    setLoading(true);
    setError("");

    const { data: cert, error: certError } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (certError || !cert) {
      setRows([]);
      setError(certError?.message || "Certificate not found.");
      setLoading(false);
      return;
    }

    if (cert.folder_id) {
      const { data: folderRows, error: folderError } = await supabase
        .from("certificates")
        .select("*")
        .eq("folder_id", cert.folder_id)
        .order("folder_position", { ascending: true })
        .order("created_at", { ascending: true });

      if (folderError) {
        setRows([cert]);
      } else {
        setRows(folderRows?.length ? folderRows : [cert]);
      }
    } else {
      setRows([cert]);
    }

    setLoading(false);
  }

  return (
    <div style={{ background: "#e5e7eb", minHeight: "100vh" }}>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          .print-toolbar {
            display: none !important;
          }

          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <div
        className="print-toolbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: 16,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#22d3ee", marginBottom: 6 }}>
            Print Mode
          </div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {rows.length > 1 ? "Linked Certificate Folder" : "Single Certificate"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => router.push(`/certificates/${id}`)}
            style={ghostBtn}
          >
            Back to Certificate
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={printBtn}
          >
            Print Now
          </button>
        </div>
      </div>

      {loading ? (
        <div style={infoBox}>Loading print pages…</div>
      ) : error ? (
        <div style={{ ...infoBox, color: "#991b1b", background: "#fee2e2" }}>{error}</div>
      ) : (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
          {rows.map((row, index) => (
            <div
              key={row.id}
              style={{
                marginBottom: 20,
                breakAfter: index === rows.length - 1 ? "auto" : "page",
                pageBreakAfter: index === rows.length - 1 ? "auto" : "always",
              }}
            >
              <CertificateSheet
                certificate={row}
                index={index}
                total={rows.length}
                printMode
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ghostBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#f8fafc",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const printBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #22c55e, #14b8a6)",
  color: "#052e16",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const infoBox = {
  maxWidth: 960,
  margin: "24px auto",
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 16,
  padding: 18,
  fontWeight: 700,
};
