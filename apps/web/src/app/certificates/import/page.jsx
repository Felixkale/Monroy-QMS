"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";
import {
  sanitizeParsed,
  validateParsed,
  extractCertificateData,
  mapParsedToEquipment,
  mapParsedToCertificate,
  normalizeText,
} from "@/lib/certificateParser";

const MAX_FILES = 20;
const MAX_FILE_MB = 10;

const STATUS_STYLE = {
  pending: {
    bg: "rgba(148,163,184,0.1)",
    color: "#94a3b8",
    border: "rgba(148,163,184,0.3)",
  },
  extracting: {
    bg: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.3)",
  },
  extracted: {
    bg: "rgba(99,102,241,0.1)",
    color: "#818cf8",
    border: "rgba(99,102,241,0.3)",
  },
  registering: {
    bg: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.3)",
  },
  done: {
    bg: "rgba(16,185,129,0.1)",
    color: "#86efac",
    border: "rgba(16,185,129,0.3)",
  },
  error: {
    bg: "rgba(244,114,182,0.1)",
    color: "#f472b6",
    border: "rgba(244,114,182,0.3)",
  },
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(124,92,252,0.3)",
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

const sectionHead = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7c5cfc",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(124,92,252,0.2)",
  paddingBottom: 8,
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

function StatusBadge({ status, message }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  const labels = {
    pending: "Pending",
    extracting: "Extracting…",
    extracted: "Extracted",
    registering: "Registering…",
    done: "Done ✓",
    error: "Error",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
      title={message || ""}
    >
      {labels[status] || status}
    </span>
  );
}

async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";

  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lineMap = new Map();

    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], str: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineText = lineMap
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (lineText) text += lineText + "\n";
    }

    text += "\n";
  }

  return text;
}

async function uploadSignature(file) {
  const ext = file.name.split(".").pop();
  const path = `signatures/shared-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("certificates")
    .upload(path, file, { upsert: true });

  if (error) throw new Error("Signature upload failed: " + error.message);

  const { data } = supabase.storage.from("certificates").getPublicUrl(path);
  return data.publicUrl;
}

async function getOrCreateClient(companyName) {
  const cleanName = normalizeText(companyName);
  if (!cleanName) throw new Error("Company name missing");

  const { data: existing } = await supabase
    .from("clients")
    .select("id,company_name,company_code")
    .ilike("company_name", cleanName)
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("clients")
    .insert([{ company_name: cleanName, status: "active" }])
    .select("id,company_name,company_code")
    .single();

  if (error) throw error;
  return created;
}

async function getOrCreateEquipment(clientId, parsed) {
  const lookupSerial =
    parsed.serial_number || parsed.identification_number || parsed.equipment_id;

  if (lookupSerial) {
    const { data: existing } = await supabase
      .from("assets")
      .select("id,asset_tag,asset_name,serial_number")
      .eq("client_id", clientId)
      .eq("serial_number", lookupSerial)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const assetUpdate = mapParsedToEquipment(parsed, clientId);
      await supabase.from("assets").update(assetUpdate).eq("id", existing.id);
      return existing;
    }
  }

  const payload = mapParsedToEquipment(parsed, clientId);
  const { data: created, error } = await registerEquipment(payload);

  if (error) throw error;
  return created;
}

async function generateCertNumber(serialNumber, assetId) {
  const base = serialNumber
    ? serialNumber.replace(/[\s\-\/]+/g, "").toUpperCase()
    : `ASSET${assetId}`;

  const prefix = `CERT-${base}-`;

  const { data: existing } = await supabase
    .from("certificates")
    .select("certificate_number")
    .like("certificate_number", `${prefix}%`)
    .order("certificate_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextSeq = 1;

  if (existing?.certificate_number) {
    const parts = existing.certificate_number.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last)) nextSeq = last + 1;
  }

  return `${prefix}${String(nextSeq).padStart(2, "0")}`;
}

async function registerCertificate(assetId, clientName, parsed) {
  const issuedAtIso = parsed.issued_at
    ? new Date(parsed.issued_at).toISOString()
    : null;

  if (issuedAtIso) {
    const { data: existing } = await supabase
      .from("certificates")
      .select("id")
      .eq("asset_id", assetId)
      .eq("issued_at", issuedAtIso)
      .limit(1)
      .maybeSingle();

    if (existing) return existing;
  }

  const certNumber = await generateCertNumber(
    parsed.serial_number || parsed.identification_number || parsed.equipment_id,
    assetId
  );

  const payload = {
    ...mapParsedToCertificate(parsed, assetId, clientName),
    certificate_number: certNumber,
    signature_url: parsed.signature_url || null,
    logo_url: "/logo.png",
    pdf_url: parsed.pdf_url || null,
  };

  const { data, error } = await supabase
    .from("certificates")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export default function BulkImportPage() {
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  const [inspectorName, setInspectorName] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  function handleSignatureSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSignatureFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => setSignaturePreview(ev.target.result);
    reader.readAsDataURL(file);

    setSignatureUrl("");
  }

  function handleFileSelect(e) {
    const all = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    const selected = all.slice(0, MAX_FILES);

    if (all.length > MAX_FILES) {
      setGlobalError(`Max ${MAX_FILES} files. Only first ${MAX_FILES} loaded.`);
    } else {
      setGlobalError("");
    }

    const tooBig = selected.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) {
      setGlobalError(`${tooBig.length} file(s) exceed ${MAX_FILE_MB}MB and were skipped.`);
    }

    const valid = selected.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);

    setFiles(
      valid.map((file) => ({
        file,
        status: "pending",
        parsed: null,
        error: "",
      }))
    );

    setGlobalSuccess("");
  }

  function updateFile(index, patch) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleExtractAll() {
    if (!files.length) return;

    setRunning(true);
    setGlobalError("");
    setGlobalSuccess("");

    for (let i = 0; i < files.length; i += 1) {
      updateFile(i, { status: "extracting", error: "" });

      try {
        const text = await extractTextFromPdf(files[i].file);
        const raw = extractCertificateData(text);
        const parsed = sanitizeParsed(raw);
        const errs = validateParsed(parsed);

        if (errs.length) throw new Error(errs.join("; "));

        updateFile(i, { status: "extracted", parsed });
      } catch (err) {
        updateFile(i, {
          status: "error",
          error: err.message || "Extraction failed",
        });
      }
    }

    setRunning(false);
  }

  async function handleRegisterAll() {
    setRunning(true);
    setGlobalError("");
    setGlobalSuccess("");

    let successCount = 0;

    let resolvedSigUrl = signatureUrl;
    if (signatureFile && !resolvedSigUrl) {
      try {
        resolvedSigUrl = await uploadSignature(signatureFile);
        setSignatureUrl(resolvedSigUrl);
      } catch (err) {
        setGlobalError("Signature upload failed: " + err.message);
        setRunning(false);
        return;
      }
    }

    for (let i = 0; i < files.length; i += 1) {
      if (files[i].status !== "extracted") continue;

      updateFile(i, { status: "registering" });

      try {
        const parsed = {
          ...files[i].parsed,
          inspector_name: inspectorName.trim() || files[i].parsed.inspector_name,
          inspector_id: inspectorId.trim() || files[i].parsed.inspector_id,
          signature_url: resolvedSigUrl || null,
        };

        const client = await getOrCreateClient(parsed.company);
        const equipment = await getOrCreateEquipment(client.id, parsed);
        await registerCertificate(equipment.id, client.company_name, parsed);

        updateFile(i, { status: "done", parsed });
        successCount += 1;
      } catch (err) {
        updateFile(i, {
          status: "error",
          error: err.message || "Registration failed",
        });
      }
    }

    setRunning(false);

    if (successCount > 0) {
      setGlobalSuccess(
        `${successCount} certificate${successCount > 1 ? "s" : ""} registered successfully and synced to equipment register!`
      );
    }
  }

  const anyExtracted = files.some((f) => f.status === "extracted");
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <AppLayout title="Bulk Import Certificates">
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ color: "#fff", marginBottom: 6 }}>Bulk Import Certificates</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>
          Upload multiple certificate PDFs at once (max {MAX_FILES} files, {MAX_FILE_MB}MB
          each). Inspector details and signature entered here are applied to all
          certificates. Imported certificate data also updates the equipment register
          automatically.
        </p>

        {globalError && (
          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#f472b6",
              fontSize: 13,
            }}
          >
            ⚠️ {globalError}
          </div>
        )}

        {globalSuccess && (
          <div
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#86efac",
              fontSize: 13,
            }}
          >
            ✅ {globalSuccess}
          </div>
        )}

        <div
          style={{
            background: "rgba(124,92,252,0.06)",
            border: "1px solid rgba(124,92,252,0.25)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div style={sectionHead}>✍️ Inspector & Signature applied to all certificates</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Inspector Name</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. Moemedi Masupe"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Inspector ID No.</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="e.g. 700117910"
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Signature Image</label>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "rgba(124,92,252,0.12)",
                  border: "1px solid rgba(124,92,252,0.35)",
                  color: "#c4b5fd",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                📁 Choose Signature
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleSignatureSelect}
                />
              </label>

              {signaturePreview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src={signaturePreview}
                    alt="Signature preview"
                    style={{
                      height: 48,
                      maxWidth: 180,
                      objectFit: "contain",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      border: "1px solid rgba(124,92,252,0.3)",
                      padding: 4,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 11, color: "#86efac", fontWeight: 700 }}>
                      ✓ Signature ready
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>
                      Will upload on Register All
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSignatureFile(null);
                      setSignaturePreview("");
                      setSignatureUrl("");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(244,114,182,0.3)",
                      background: "rgba(244,114,182,0.08)",
                      color: "#f472b6",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "#475569" }}>
                  No signature selected, certificates will have no signature image
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <label style={labelStyle}>Select Certificate PDFs (max {MAX_FILES} files)</label>

          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            disabled={running}
            style={{ color: "#e2e8f0", marginBottom: 16, display: "block" }}
          />

          {files.length > 0 && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16 }}>
              {files.length} file{files.length > 1 ? "s" : ""} selected
              {doneCount > 0 ? ` · ${doneCount} done` : ""}
              {errorCount > 0 ? ` · ${errorCount} failed` : ""}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExtractAll}
              disabled={running || !files.length}
              style={{
                padding: "11px 24px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                color: "#fff",
                fontWeight: 700,
                cursor: running || !files.length ? "not-allowed" : "pointer",
                opacity: running || !files.length ? 0.6 : 1,
              }}
            >
              {running && !anyExtracted ? "Extracting…" : "1. Extract All"}
            </button>

            <button
              type="button"
              onClick={handleRegisterAll}
              disabled={running || !anyExtracted}
              style={{
                padding: "11px 24px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                color: "#111827",
                fontWeight: 700,
                cursor: running || !anyExtracted ? "not-allowed" : "pointer",
                opacity: running || !anyExtracted ? 0.6 : 1,
              }}
            >
              {running && anyExtracted ? "Registering…" : "2. Register All"}
            </button>
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {files.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 4,
                        wordBreak: "break-word",
                      }}
                    >
                      📄 {item.file.name}
                    </div>

                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {(item.file.size / 1024).toFixed(1)} KB
                    </div>

                    {item.error && (
                      <div style={{ color: "#f472b6", fontSize: 11, marginTop: 6 }}>
                        ⚠️ {item.error}
                      </div>
                    )}
                  </div>

                  <StatusBadge status={item.status} message={item.error} />
                </div>

                {item.parsed && (item.status === "extracted" || item.status === "done") && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                      gap: 8,
                    }}
                  >
                    {[
                      ["Client", item.parsed.company],
                      ["Asset Type", item.parsed.asset_type],
                      ["Location", item.parsed.location],
                      ["Equipment Location", item.parsed.equipment_location],
                      ["Serial Number", item.parsed.serial_number],
                      ["Equipment ID", item.parsed.equipment_id],
                      ["Identification Number", item.parsed.identification_number],
                      ["Inspection No", item.parsed.inspection_no],
                      ["Lanyard Serial No", item.parsed.lanyard_serial_no],
                      ["Manufacturer", item.parsed.manufacturer],
                      ["Model", item.parsed.model],
                      ["Year Built", item.parsed.year_built],
                      ["Capacity", item.parsed.capacity],
                      ["Country of Origin", item.parsed.country_of_origin],
                      ["SWL", item.parsed.swl],
                      ["Working Pressure", item.parsed.mawp],
                      ["Design Pressure", item.parsed.design_pressure],
                      ["Test Pressure", item.parsed.test_pressure],
                      ["Certificate Type", item.parsed.certificate_type],
                      ["Equipment Status", item.parsed.equipment_status],
                      ["Inspector", inspectorName.trim() || item.parsed.inspector_name],
                      ["Inspector ID", inspectorId.trim() || item.parsed.inspector_id],
                      ["Inspection Date", item.parsed.last_inspection_date],
                      ["Expiry Date", item.parsed.next_inspection_date],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "rgba(255,255,255,0.4)",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: 2,
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: label === "Equipment Status" ? 700 : 500,
                              color:
                                label === "Equipment Status"
                                  ? value === "PASS"
                                    ? "#86efac"
                                    : value === "FAIL"
                                      ? "#f472b6"
                                      : "#fbbf24"
                                  : "#e2e8f0",
                            }}
                          >
                            {value}
                          </div>
                        </div>
                      ))}

                    {signaturePreview && (
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 2,
                          }}
                        >
                          Signature
                        </div>
                        <img
                          src={signaturePreview}
                          alt="sig"
                          style={{
                            height: 28,
                            maxWidth: 100,
                            objectFit: "contain",
                            background: "rgba(255,255,255,0.04)",
                            borderRadius: 4,
                            border: "1px solid rgba(0,245,196,0.2)",
                            padding: 2,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
