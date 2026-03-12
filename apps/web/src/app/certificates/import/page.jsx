"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeDate(value) {
  if (!value) return null;

  // ✅ Strip spaces around slashes e.g. "12 /04 /2026" → "12/04/2026"
  let text = String(value).trim().replace(/\s*\/\s*/g, "/").replace(/\s*\-\s*/g, "-");

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const match1 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match1) {
    const [, dd, mm, yyyy] = match1;
    return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }

  return null;
}

function firstMatch(text, patterns = []) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeText(match[1]);
  }
  return "";
}

function detectEquipmentType(text) {
  const checks = [
    "Pressure Vessel",
    "Boiler",
    "Air Receiver",
    "Air Compressor",
    "Oil Separator",
    "Trestle Jack",
    "Trestle Stand",
    "Lever Hoist",
    "Bottle Jack",
    "Safety Harness",
    "Jack Stand",
    "Chain Block",
    "Bow Shackle",
    "Mobile Crane",
    "Overhead Crane",
    "Trolley Jack",
    "Step Ladders",
    "Tifor",
    "Crawl Beam",
    "Beam Crawl",
    "Beam Clamp",
    "Webbing Sling",
    "Nylon Sling",
    "Wire Sling",
    "Wire Rope",
    "Fall Arrest",
    "Man Cage",
    "Shutter Clamp",
    "Drum Clamp",
    "Scissor Lift",
    "Personnel Basket",
    "Load Cell",
  ];

  const lower = text.toLowerCase();
  return checks.find((item) => lower.includes(item.toLowerCase())) || "";
}

function extractCertificateData(text) {
  const certificateType = firstMatch(text, [
    /certificate type\s*[:\-]\s*(.+)/i,
    /(load test certificate)/i,
    /(pressure test certificate)/i,
    /(certificate of statutory inspection)/i,
    /(inspection certificate)/i,
  ]);

  // ✅ FIXED: colon is now optional ([:\-]?) and captures company name
  // even when PDF has no colon/dash separator e.g. "COMPANY KALCON EQUIPMENT..."
  const company = firstMatch(text, [
    /client\s*\/?\s*company\s*[:\-]\s*(.+)/i,
    /company\s*[:\-]?\s*(.+?)\s+(?:EQUIPMENT|DESCRIPTION|CLIENT|LOCATION|IDENTIFICATION|STATUS)/i,
    /company\s*[:\-]\s*(.+)/i,
    /client\s*[:\-]\s*(.+)/i,
  ]);

  // ✅ FIXED: captures "EQUIPMENT DESCRIPTION TRESTLE STAND" even with no colon
  const equipmentDescription = firstMatch(text, [
    /equipment\s+description\s*[:\-]\s*(.+)/i,
    /equipment\s+description\s+([A-Z][A-Za-z\s]+?)(?:\s{2,}|\s+EQUIPMENT|\s+LOCATION|\s+IDENTIFICATION|\s+STATUS|\s+COMPANY|\s+CLIENT|\s+SWL|\s+PASS|\s+FAIL|$)/i,
    /equipment\s+type\s*[:\-]\s*(.+)/i,
    /equipment\s+type\s+([A-Z][A-Za-z\s]+?)(?:\s{2,}|\s+EQUIPMENT|\s+LOCATION|\s+IDENTIFICATION|\s+STATUS|$)/i,
    /equipment\s+category\s*[:\-]\s*(.+)/i,
    /description\s*[:\-]\s*(.+)/i,
  ]) || detectEquipmentType(text);

  // ✅ FIXED: captures "EQUIPMENT LOCATION KHOEMACAU MINE" without colon
  const equipmentLocation = firstMatch(text, [
    /equipment\s+location\s*[:\-]\s*(.+)/i,
    /equipment\s+location\s+(.+?)\s{2,}/i,
    /equipment\s+location\s+(.+?)\s+(?:IDENTIFICATION|INSPECTION|STATUS|SWL|PASS|FAIL|DATE|EXPIRY|COMPANY|CLIENT)/i,
    /location\s*[:\-]\s*(.+)/i,
  ]);

  const equipmentId = firstMatch(text, [
    /identification number\s*[:\-]?\s*(.+?)\s+(?:INSPECTION|STATUS|PASS|FAIL|EXPIRY|ISSUE)/i,
    /identification number\s*[:\-]\s*(.+)/i,
    /equipment id\s*[:\-]\s*(.+)/i,
    /equipment tag no\.?\s*[:\-]\s*(.+)/i,
    /equipment tag\s*[:\-]\s*(.+)/i,
    /asset tag\s*[:\-]\s*(.+)/i,
  ]);

  const inspectionNo = firstMatch(text, [
    /inspection no\s*[:\-]?\s*(.+?)\s+(?:SWL|STATUS|PASS|FAIL|EXPIRY|ISSUE|EQUIPMENT)/i,
    /inspection no\.?\s*[:\-]\s*(.+)/i,
  ]);

  const manufacturer = firstMatch(text, [
    /manufacturer\s*[:\-]\s*(.+)/i,
  ]);

  const model = firstMatch(text, [
    /model\s*[:\-]\s*(.+)/i,
    /model no\.?\s*[:\-]\s*(.+)/i,
  ]);

  const serialNumber = firstMatch(text, [
    /serial\s+number\s*[:\-]\s*(.+)/i,
    /serial\s+no\.?\s*[:\-]\s*(.+)/i,
    /identification\s+number\s*[:\-]?\s*(.+?)\s+(?:INSPECTION|STATUS|PASS|FAIL|EXPIRY|ISSUE|EQUIPMENT|SWL|$)/i,
    /id\s+number\s*[:\-]\s*(.+)/i,
  ]);

  const yearBuilt = firstMatch(text, [
    /year built\s*[:\-]\s*(.+)/i,
    /year of manufacture\s*[:\-]\s*(.+)/i,
  ]);

  // ✅ FIXED: SWL captured even without colon e.g. "SWL 25 TON"
  const swl = firstMatch(text, [
    /safe working load\s*[:\-]\s*(.+)/i,
    /\bSWL\s*[:\-]\s*(.+)/i,
    /\bSWL\s+(\d+[\s\w]+?)(?:\s+(?:EQUIPMENT|STATUS|PASS|FAIL|EXPIRY|ISSUE|DATE)|$)/i,
  ]);

  const mawp = firstMatch(text, [
    /\bMAWP\s*[:\-]\s*(.+)/i,
    /authorized pressure\s*[:\-]\s*(.+)/i,
    /working pressure\s*[:\-]\s*(.+)/i,
  ]);

  const designPressure = firstMatch(text, [
    /design pressure\s*[:\-]\s*(.+)/i,
  ]);

  const testPressure = firstMatch(text, [
    /test pressure\s*[:\-]\s*(.+)/i,
  ]);

  const designTemperature = firstMatch(text, [
    /design temperature\s*[:\-]\s*(.+)/i,
  ]);

  const capacityVolume = firstMatch(text, [
    /capacity\s*\/?\s*volume\s*[:\-]\s*(.+)/i,
    /capacity\s*[:\-]\s*(.+)/i,
    /volume\s*[:\-]\s*(.+)/i,
  ]);

  const shellMaterial = firstMatch(text, [
    /material\s*[:\-]\s*(.+)/i,
    /shell material\s*[:\-]\s*(.+)/i,
  ]);

  const fluidType = firstMatch(text, [
    /fluid type\s*[:\-]\s*(.+)/i,
    /contents\s*[:\-]\s*(.+)/i,
  ]);

  const proofLoad = firstMatch(text, [
    /proof load\s*[:\-]\s*(.+)/i,
  ]);

  const liftingHeight = firstMatch(text, [
    /lift height\s*[:\-]\s*(.+)/i,
  ]);

  const slingLength = firstMatch(text, [
    /sling length\s*[:\-]\s*(.+)/i,
  ]);

  const chainSize = firstMatch(text, [
    /chain size\s*[:\-]\s*(.+)/i,
  ]);

  const ropeDiameter = firstMatch(text, [
    /wire rope diameter\s*[:\-]\s*(.+)/i,
    /rope diameter\s*[:\-]\s*(.+)/i,
  ]);

  // ✅ FIXED: captures dates in format "12 /01/2026" or "12/01/2026"
  const issueDate = normalizeDate(firstMatch(text, [
    /issue date\s*[:\-]\s*(.+)/i,
    /date issued\s*[:\-]\s*(.+)/i,
    /pass date\s*[:\-]?\s*(.+?)\s+(?:EXPIRY|INSPECTOR|VALID|$)/i,
  ]));

  const expiryDate = normalizeDate(firstMatch(text, [
    /expiry date\s*[:\-]?\s*(.+?)\s+(?:INSPECTOR|VALID|PASS|ISSUE|$)/i,
    /expiry date\s*[:\-]\s*(.+)/i,
    /valid to\s*[:\-]\s*(.+)/i,
  ]));

  // ✅ FIXED: captures "Inspector's Name: Moemedi Masupe"
  const inspectorName = firstMatch(text, [
    /inspector'?s?\s*name\s*[:\-]\s*(.+)/i,
    /inspector name\s*[:\-]\s*(.+)/i,
    /inspector\s*[:\-]\s*(.+)/i,
  ]);

  // ✅ FIXED: captures "INSPECTOR ID NO: 700117910"
  const inspectorId = firstMatch(text, [
    /inspector\s*id\s*no\.?\s*[:\-]\s*(.+?)\s+(?:Inspector|Signature|OUR|PARTNERS|$)/i,
    /inspector id\s*[:\-]\s*(.+)/i,
  ]);

  const legalFramework = firstMatch(text, [
    /legal compliance\s*[:\-]\s*(.+)/i,
    /legal framework\s*[:\-]\s*(.+)/i,
    /design code\s*[:\-]\s*(.+)/i,
  ]) || "Mines, Quarries, Works and Machinery Act Cap 44:02";

  // ✅ FIXED: captures STATUS PASS even without colon
  const equipmentStatus = firstMatch(text, [
    /inspection result\s*[:\-]\s*(.+)/i,
    /status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
    /equipment status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
  ]) || "PASS";

  const assetType = equipmentDescription || detectEquipmentType(text);
  const isPressure = [
    "Pressure Vessel",
    "Boiler",
    "Air Receiver",
    "Air Compressor",
    "Oil Separator",
  ].includes(assetType);

  const certType = certificateType || (isPressure ? "Pressure Test Certificate" : "Load Test Certificate");

  return {
    company,
    asset_type: assetType,
    certificate_type: certType,
    equipment_description: assetType,
    location: equipmentLocation,
    equipment_location: equipmentLocation,
    equipment_id: equipmentId || inspectionNo,
    manufacturer,
    model,
    serial_number: serialNumber,
    year_built: yearBuilt,
    safe_working_load: swl,
    swl,
    working_pressure: mawp,
    mawp,
    design_pressure: designPressure,
    test_pressure: testPressure,
    design_temperature: designTemperature,
    capacity_volume: capacityVolume,
    shell_material: shellMaterial,
    fluid_type: fluidType,
    proof_load: proofLoad,
    lifting_height: liftingHeight,
    sling_length: slingLength,
    chain_size: chainSize,
    rope_diameter: ropeDiameter,
    issued_at: issueDate || new Date().toISOString().slice(0, 10),
    valid_to: expiryDate,
    inspector_name: inspectorName,
    inspector_id: inspectorId,
    legal_framework: legalFramework,
    equipment_status: equipmentStatus.toUpperCase(),
  };
}

// ✅ FIXED: CDN version updated to match pdfjs-dist 4.10.38
async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `\n${pageText}`;
  }

  return text;
}

async function extractTextFromFile(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }
  return await file.text();
}

async function getOrCreateClient(companyName) {
  const cleanName = normalizeText(companyName);
  if (!cleanName) {
    throw new Error("Client / company name not found in certificate.");
  }

  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id, company_name, company_code")
    .ilike("company_name", cleanName)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("clients")
    .insert([{ company_name: cleanName, status: "active" }])
    .select("id, company_name, company_code")
    .single();

  if (createError) throw createError;
  return created;
}

async function getExistingEquipment(clientId, serialNumber, equipmentId) {
  let query = supabase
    .from("assets")
    .select("id, asset_tag, asset_name")
    .eq("client_id", clientId);

  if (serialNumber) {
    query = query.eq("serial_number", serialNumber);
  } else if (equipmentId) {
    query = query.eq("asset_tag", equipmentId);
  } else {
    return null;
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

export default function ImportCertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleExtract() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setPreview(null);

      if (!supabase) throw new Error("Supabase not configured.");
      if (!file) throw new Error("Choose a certificate file first.");

      const extractedText = await extractTextFromFile(file);
      setRawText(extractedText);

      const parsed = extractCertificateData(extractedText);

      if (!parsed.company) throw new Error("Client / company name was not found.");

      // Final fallback: scan raw text directly for equipment type
      if (!parsed.asset_type) {
        const fallback = detectEquipmentType(extractedText);
        if (fallback) parsed.asset_type = fallback;
      }
      if (!parsed.asset_type) throw new Error("Equipment type was not found.");

      // ✅ No longer required — asset_tag is auto-generated by the database
      // serial_number is stored if found, but not mandatory

      setPreview(parsed);
    } catch (err) {
      setError(err?.message || "Failed to extract certificate data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterAll() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!preview) throw new Error("Extract certificate data first.");

      const client = await getOrCreateClient(preview.company);

      const existingEquipment = await getExistingEquipment(
        client.id,
        preview.serial_number,
        preview.equipment_id
      );

      let equipment = existingEquipment;

      if (!equipment) {
        const equipmentPayload = {
          client_id: client.id,
          asset_type: preview.asset_type,
          serial_number: preview.serial_number || preview.equipment_id,
          manufacturer: preview.manufacturer || "Unknown",
          model: preview.model,
          year_built: preview.year_built,
          location: preview.location,
          cert_type: preview.certificate_type,
          design_standard: preview.legal_framework,
          shell_material: preview.shell_material,
          fluid_type: preview.fluid_type,
          design_pressure: preview.design_pressure,
          working_pressure: preview.working_pressure,
          test_pressure: preview.test_pressure,
          design_temperature: preview.design_temperature,
          capacity_volume: preview.capacity_volume,
          safe_working_load: preview.safe_working_load,
          proof_load: preview.proof_load,
          lifting_height: preview.lifting_height,
          sling_length: preview.sling_length,
          chain_size: preview.chain_size,
          rope_diameter: preview.rope_diameter,
          next_inspection_date: preview.valid_to,
          last_inspection_date: preview.issued_at,
          license_status: "valid",
          inspector_name: preview.inspector_name,
          notes: "Imported from certificate",
        };

        const { data: createdEquipment, error: equipmentError } = await registerEquipment(equipmentPayload);
        if (equipmentError) throw equipmentError;
        equipment = createdEquipment;
      }

      const { data: existingCert } = await supabase
        .from("certificates")
        .select("id")
        .eq("asset_id", equipment.id)
        .eq("issued_at", new Date(preview.issued_at).toISOString())
        .limit(1)
        .maybeSingle();

      if (!existingCert) {
        const certificatePayload = {
          asset_id: equipment.id,
          certificate_type: preview.certificate_type || "Certificate of Statutory Inspection",
          company: client.company_name,
          equipment_description: preview.equipment_description || preview.asset_type,
          equipment_location: preview.equipment_location || preview.location || null,
          equipment_id: equipment.asset_tag || preview.equipment_id || null,
          swl: preview.swl || null,
          mawp: preview.mawp || null,
          equipment_status: preview.equipment_status || "PASS",
          issued_at: new Date(preview.issued_at).toISOString(),
          valid_to: preview.valid_to || null,
          status: "issued",
          legal_framework: preview.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02",
          inspector_name: preview.inspector_name || null,
          inspector_id: preview.inspector_id || null,
          logo_url: "/logo.png",
        };

        const { error: certError } = await supabase
          .from("certificates")
          .insert([certificatePayload]);

        if (certError) throw certError;
      }

      setSuccess("Certificate imported. Client, equipment and certificate registered successfully.");

      setTimeout(() => {
        router.push(`/equipment/${equipment.asset_tag}`);
      }, 1200);
    } catch (err) {
      setError(err?.message || "Failed to register client, equipment and certificate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Import Certificate">
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ color: "#fff", marginBottom: 16 }}>Import Certificate</h1>

        {error && (
          <div style={{
            background: "rgba(244,114,182,0.1)",
            border: "1px solid rgba(244,114,182,0.3)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#f472b6",
            fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.35)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#86efac",
            fontSize: 13,
          }}>
            {success}
          </div>
        )}

        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Certificate File</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ ...inputStyle, padding: "10px", height: "auto" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExtract}
              disabled={loading}
              style={{
                padding: "11px 24px",
                borderRadius: 8,
                cursor: loading ? "wait" : "pointer",
                fontWeight: 700,
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                border: "none",
                color: "#fff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Extracting..." : "Extract Important Information"}
            </button>

            <button
              type="button"
              onClick={handleRegisterAll}
              disabled={loading || !preview}
              style={{
                padding: "11px 24px",
                borderRadius: 8,
                cursor: loading || !preview ? "not-allowed" : "pointer",
                fontWeight: 700,
                background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                border: "none",
                color: "#111827",
                opacity: loading || !preview ? 0.7 : 1,
              }}
            >
              Register Client, Equipment and Certificate
            </button>
          </div>
        </div>

        {preview && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}>
            <h2 style={{ color: "#fff", marginTop: 0 }}>Extracted Information</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
            }}>
              <div><label style={labelStyle}>Client</label><div style={{ color: "#fff" }}>{preview.company || "-"}</div></div>
              <div><label style={labelStyle}>Equipment Type</label><div style={{ color: "#fff" }}>{preview.asset_type || "-"}</div></div>
              <div><label style={labelStyle}>Equipment Tag</label><div style={{ color: "#fff" }}>{preview.equipment_id || "-"}</div></div>
              <div><label style={labelStyle}>Serial Number</label><div style={{ color: "#fff" }}>{preview.serial_number || "-"}</div></div>
              <div><label style={labelStyle}>Manufacturer</label><div style={{ color: "#fff" }}>{preview.manufacturer || "-"}</div></div>
              <div><label style={labelStyle}>Model</label><div style={{ color: "#fff" }}>{preview.model || "-"}</div></div>
              <div><label style={labelStyle}>Location</label><div style={{ color: "#fff" }}>{preview.location || "-"}</div></div>
              <div><label style={labelStyle}>SWL</label><div style={{ color: "#fff" }}>{preview.swl || "-"}</div></div>
              <div><label style={labelStyle}>MAWP</label><div style={{ color: "#fff" }}>{preview.mawp || "-"}</div></div>
              <div><label style={labelStyle}>Issue Date</label><div style={{ color: "#fff" }}>{preview.issued_at || "-"}</div></div>
              <div><label style={labelStyle}>Expiry Date</label><div style={{ color: "#fff" }}>{preview.valid_to || "-"}</div></div>
              <div><label style={labelStyle}>Inspector Name</label><div style={{ color: "#fff" }}>{preview.inspector_name || "-"}</div></div>
            </div>
          </div>
        )}

        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 20,
        }}>
          <label style={labelStyle}>Extracted Raw Text</label>
          <textarea
            value={rawText}
            readOnly
            style={{ ...inputStyle, minHeight: 260, resize: "vertical" }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
