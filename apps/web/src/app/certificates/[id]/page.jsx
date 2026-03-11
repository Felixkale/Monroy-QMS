"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

function fieldRow(label, value) {
  if (value === null || value === undefined) return null;
  if (String(value).trim() === "") return null;
  if (String(value).trim().toUpperCase() === "N/A") return null;

  return { label, value };
}

export default function CertificateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [asset, setAsset] = useState(null);
  const [nameplate, setNameplate] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);

        const { data: cert, error: certError } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", id)
          .single();

        if (certError) throw certError;
        setCertificate(cert);

        if (cert?.asset_id) {
          const [{ data: assetData }, { data: nameplateData }] = await Promise.all([
            supabase
              .from("assets")
              .select(`
                *,
                clients (
                  company_name
                )
              `)
              .eq("id", cert.asset_id)
              .single(),
            supabase
              .from("asset_nameplate")
              .select("*")
              .eq("asset_id", cert.asset_id)
              .maybeSingle(),
          ]);

          setAsset(assetData || null);
          setNameplate(nameplateData || null);
        }
      } catch (err) {
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Certificate">
        <div style={{ color: "#fff", padding: 40 }}>Loading certificate...</div>
      </AppLayout>
    );
  }

  if (!certificate) {
    return (
      <AppLayout title="Certificate">
        <div style={{ color: "#fff", padding: 40 }}>
          <div style={{ marginBottom: 16 }}>Certificate not found.</div>
          <button
            onClick={() => router.push("/certificates")}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}
          >
            Back to Certificates
          </button>
        </div>
      </AppLayout>
    );
  }

  const equipmentType = asset?.asset_type || certificate?.equipment_description || "";
  const isPressure = ["Pressure Vessel", "Boiler", "Air Receiver", "Air Compressor", "Oil Separator"].includes(asset?.asset_type);
  const isLifting = [
    "Trestle Jack","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Chain Block","Bow Shackle",
    "Mobile Crane","Trolley Jack","Step Ladders","Tifor","Crawl Beam","Beam Crawl","Beam Clamp",
    "Webbing Sling","Nylon Sling","Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp","Overhead Crane"
  ].includes(asset?.asset_type);

  const equipmentFields = [
    fieldRow("Equipment Tag No", asset?.asset_tag || certificate?.equipment_id),
    fieldRow("Equipment Type", equipmentType),
    fieldRow("Location", asset?.location || certificate?.equipment_location),
    fieldRow("Manufacturer", asset?.manufacturer),
    fieldRow("Model", asset?.model),
    fieldRow("Serial Number", asset?.serial_number),
    fieldRow("Year Built", asset?.year_built),
  ].filter(Boolean);

  const nameplateFields = [
    fieldRow("Design Code", nameplate?.design_code || asset?.design_standard),
    isPressure ? fieldRow("Design Pressure", asset?.design_pressure ? `${asset.design_pressure} kPa` : null) : null,
    isPressure ? fieldRow("Authorized Pressure", certificate?.mawp || (asset?.working_pressure ? `${asset.working_pressure} kPa` : null)) : null,
    isPressure ? fieldRow("Test Pressure", asset?.test_pressure ? `${asset.test_pressure} kPa` : null) : null,
    isPressure ? fieldRow("Design Temperature", asset?.design_temperature) : null,
    isPressure ? fieldRow("Capacity / Volume", asset?.capacity_volume) : null,
    isPressure ? fieldRow("Material", nameplate?.material || asset?.shell_material) : null,
    isPressure ? fieldRow("Fluid Type", asset?.fluid_type) : null,
    isLifting ? fieldRow("Safe Working Load", certificate?.swl || (asset?.safe_working_load ? `${asset.safe_working_load} Tons` : null)) : null,
    isLifting ? fieldRow("Proof Load", asset?.proof_load ? `${asset.proof_load} Tons` : null) : null,
    isLifting ? fieldRow("Lift Height", asset?.lifting_height) : null,
    isLifting ? fieldRow("Sling Length", asset?.sling_length) : null,
    isLifting ? fieldRow("Chain Size", asset?.chain_size) : null,
    isLifting ? fieldRow("Wire Rope Diameter", asset?.rope_diameter) : null,
  ].filter(Boolean);

  return (
    <AppLayout title="Certificate Details">
      <div style={{ maxWidth: 1200, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <button
              onClick={() => router.push("/certificates")}
              style={{ marginBottom: 12, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
            >
              ← Back to Certificates
            </button>
            <h1 style={{ margin: 0 }}>{certificate.certificate_number || "Certificate"}</h1>
            <div style={{ color: "rgba(255,255,255,0.65)", marginTop: 8 }}>
              {certificate.certificate_type || "Certificate of Statutory Inspection"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/certificates/print/${certificate.id}`}
              style={{ padding: "11px 20px", borderRadius: 8, background: "linear-gradient(135deg,#00f5c4,#4fc3f7)", color: "#111827", textDecoration: "none", fontWeight: 700 }}
            >
              Print Certificate
            </Link>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(102,126,234,0.2)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 24 }}>
            <div><strong>Client / Company:</strong><br />{certificate.company || asset?.clients?.company_name || "-"}</div>
            <div><strong>Issue Date:</strong><br />{certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : "-"}</div>
            <div><strong>Expiry Date:</strong><br />{certificate.valid_to || "-"}</div>
            <div><strong>Inspector Name:</strong><br />{certificate.inspector_name || "-"}</div>
            <div><strong>Inspector ID:</strong><br />{certificate.inspector_id || "-"}</div>
            <div><strong>Legal Compliance:</strong><br />{certificate.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02"}</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3>Equipment Identification</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {equipmentFields.map((item) => (
                <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>{item.label}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3>Nameplate Data</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {nameplateFields.map((item) => (
                <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>{item.label}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Inspection Record</h3>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16 }}>
              <div><strong>Inspection Date:</strong> {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : "-"}</div>
              <div style={{ marginTop: 8 }}><strong>Inspection Result:</strong> {certificate.equipment_status || "PASS"}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
