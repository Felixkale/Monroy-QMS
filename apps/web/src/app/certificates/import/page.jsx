"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";

const MAX_FILES   = 20;
const MAX_FILE_MB = 10;

function sanitizeText(val, maxLen = 200) {
  if (!val) return val;
  return String(val)
    .replace(/<[^>]*>/g, "")
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, "")
    .slice(0, maxLen)
    .trim();
}

function validateParsed(parsed) {
  const errors = [];
  if (!parsed.company || parsed.company.length < 2)
    errors.push("Company name too short or missing");
  if (!parsed.asset_type || parsed.asset_type.length < 2)
    errors.push("Equipment type missing");
  if (parsed.last_inspection_date && isNaN(new Date(parsed.last_inspection_date)))
    errors.push("Invalid inspection date");
  if (parsed.next_inspection_date && isNaN(new Date(parsed.next_inspection_date)))
    errors.push("Invalid expiry date");
  if (parsed.last_inspection_date && parsed.next_inspection_date) {
    if (new Date(parsed.next_inspection_date) <= new Date(parsed.last_inspection_date))
      errors.push("Expiry date must be after inspection date");
  }
  return errors;
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function normalizeDate(value) {
  if (!value) return null;
  let text = String(value).trim().replace(/\s*\/\s*/g, "/").replace(/\s*\-\s*/g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m1 = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,"0")}-${m1[1].padStart(2,"0")}`;
  const m2 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`;
  return null;
}

// ── FIX 1: Only strip at newline — NOT at double spaces.
// This preserves multi-word values like "SAFETY HARNESS" and "ZTG - H - 020".
function firstMatch(text, patterns = []) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const raw = m[1]
        .replace(/\n.*/s, "")   // stop at next line
        .trim();
      return normalizeText(raw);
    }
  }
  return "";
}

function detectEquipmentType(text) {
  const checks = [
    "Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator",
    "Trestle Jack","Trestle Stand","Lever Hoist","Bottle Jack","Safety Harness",
    "Jack Stand","Chain Block","Bow Shackle","Mobile Crane","Overhead Crane",
    "Trolley Jack","Step Ladders","Tifor","Crawl Beam","Beam Crawl","Beam Clamp",
    "Webbing Sling","Nylon Sling","Wire Sling","Wire Rope","Fall Arrest","Man Cage",
    "Shutter Clamp","Drum Clamp","Scissor Lift","Axile Jack","Personnel Basket",
    "Load Cell","Trestle",
  ];
  const lower = text.toLowerCase();
  return checks.find((i) => lower.includes(i.toLowerCase())) || "";
}

function extractCertificateData(text) {
  // ── Company ───────────────────────────────────────────────────────────────
  const company = firstMatch(text, [
    /^COMPANY\s+(.+)/im,
    /client\s*\/?\s*company\s*[:\-]\s*(.+)/i,
    /company\s*[:\-]\s*(.+)/i,
    /client\s*[:\-]\s*(.+)/i,
  ]);

  // ── Equipment Description — capture full line after label ─────────────────
  const equipmentDescription = firstMatch(text, [
    /^EQUIPMENT\s+DESCRIPTION\s+(.+)/im,
    /equipment\s+description\s*[:\-]\s*(.+)/i,
    /equipment\s+type\s*[:\-]\s*(.+)/i,
    /description\s*[:\-]\s*(.+)/i,
  ]) || detectEquipmentType(text);

  // ── Location — capture full line ──────────────────────────────────────────
  const equipmentLocation = firstMatch(text, [
    /^EQUIPMENT\s+LOCATION\s+(.+)/im,
    /equipment\s+location\s*[:\-]\s*(.+)/i,
    /location\s*[:\-]\s*(.+)/i,
  ]);

  // ── Identification Number — capture full line (handles "ZTG - H - 020") ───
  const identificationNumber = firstMatch(text, [
    /^IDENTIFICATION\s+NUMBER\s+(.+)/im,
    /identification\s+number\s*[:\-]\s*(.+)/i,
    /identification\s+no\.?\s*[:\-]\s*(.+)/i,
  ]);

  // ── FIX 2: Lanyard Serial No — new field ─────────────────────────────────
  const lanyardSerialNo = firstMatch(text, [
    /^LANYARD\s+SERIAL\s+NO\.?\s+(.+)/im,
    /lanyard\s+serial\s+no\.?\s*[:\-]\s*(.+)/i,
    /lanyard\s+serial\s*[:\-]\s*(.+)/i,
    /lanyard\s+no\.?\s*[:\-]\s*(.+)/i,
  ]);

  // ── Inspection No ─────────────────────────────────────────────────────────
  const inspectionNo = firstMatch(text, [
    /^INSPECTION\s+NO\.?\s+(.+)/im,
    /inspection\s+no\.?\s*[:\-]\s*(.+)/i,
  ]);

  // ── Serial Number ─────────────────────────────────────────────────────────
  const serialNumber = firstMatch(text, [
    /serial\s+number\s*[:\-]\s*(.+)/i,
    /serial\s+no\.?\s*[:\-]\s*(.+)/i,
    /s\/n\s*[:\-]\s*(.+)/i,
  ]) || lanyardSerialNo || identificationNumber;

  const manufacturer = firstMatch(text, [/manufacturer\s*[:\-]\s*(.+)/i]);
  const model        = firstMatch(text, [/model\s*[:\-]\s*(.+)/i, /model\s+no\.?\s*[:\-]\s*(.+)/i]);
  const yearBuilt    = firstMatch(text, [/year\s+built\s*[:\-]\s*(.+)/i, /year\s+of\s+manufacture\s*[:\-]\s*(.+)/i]);

  const swl = firstMatch(text, [
    /^SWL\s+(.+)/im,
    /safe\s+working\s+load\s*[:\-]\s*(.+)/i,
    /\bSWL\s*[:\-]\s*(.+)/i,
  ]);

  const mawp = firstMatch(text, [
    /\bMAWP\s*[:\-]\s*(.+)/i,
    /working\s+pressure\s*[:\-]\s*(.+)/i,
  ]);

  const issueDate = normalizeDate(firstMatch(text, [
    /^DATE\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/im,
    /\bDATE\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /issue\s+date\s*[:\-]\s*(.+)/i,
    /date\s+issued\s*[:\-]\s*(.+)/i,
    /date\s+of\s+inspection\s*[:\-]\s*(.+)/i,
    /inspection\s+date\s*[:\-]\s*(.+)/i,
  ]));

  const expiryDate = normalizeDate(firstMatch(text, [
    /^EXPIRY\s+DATE\s+(.+)/im,
    /expiry\s+date\s*[:\-]\s*(.+)/i,
    /valid\s+to\s*[:\-]\s*(.+)/i,
    /next\s+inspection\s+date\s*[:\-]\s*(.+)/i,
  ]));

  const inspectorName = firstMatch(text, [
    /inspector'?s?\s*name\s*[:\-]\s*(.+)/i,
    /inspector\s+name\s*[:\-]\s*(.+)/i,
  ]);

  const inspectorId = firstMatch(text, [
    /inspector\s*id\s*no\.?\s*[:\-]\s*(.+)/i,
    /inspector\s+id\s*[:\-]\s*(.+)/i,
  ]);

  const certificateType = firstMatch(text, [
    /(load\s+test\s+certificate)/i,
    /(pressure\s+test\s+certificate)/i,
    /(certificate\s+of\s+statutory\s+inspection)/i,
    /(inspection\s+certificate)/i,
  ]);

  const equipmentStatus = (firstMatch(text, [
    /equipment\s+status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
    /status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
  ]) || "PASS").toUpperCase();

  const assetType  = equipmentDescription || detectEquipmentType(text);
  const isPressure = ["Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator"].includes(assetType);
  const certType   = certificateType || (isPressure ? "Pressure Test Certificate" : "Load Test Certificate");

  return {
    company,
    asset_type:            assetType,
    certificate_type:      certType,
    equipment_description: assetType,
    location:              equipmentLocation,
    equipment_location:    equipmentLocation,
    equipment_id:          inspectionNo || identificationNumber,
    identification_number: identificationNumber,   // ← preserved separately
    lanyard_serial_no:     lanyardSerialNo,         // ← new field
    manufacturer,
    model,
    serial_number:         serialNumber,
    year_built:            yearBuilt,
    safe_working_load:     swl,
    swl,
    working_pressure:      mawp,
    mawp,
    issued_at:             issueDate || new Date().toISOString().slice(0, 10),
    last_inspection_date:  issueDate || null,
    valid_to:              expiryDate,
    next_inspection_date:  expiryDate || null,
    inspector_name:        inspectorName,
    inspector_id:          inspectorId,
    legal_framework:       "Mines, Quarries, Works and Machinery Act Cap 44:02",
    equipment_status:      equipmentStatus,
  };
}

function sanitizeParsed(raw) {
  return {
    ...raw,
    company:               sanitizeText(raw.company, 100),
    asset_type:            sanitizeText(raw.asset_type, 100),
    location:              sanitizeText(raw.location, 200),
    equipment_location:    sanitizeText(raw.equipment_location, 200),
    serial_number:         sanitizeText(raw.serial_number, 80),
    equipment_id:          sanitizeText(raw.equipment_id, 80),
    identification_number: sanitizeText(raw.identification_number, 80),
    lanyard_serial_no:     sanitizeText(raw.lanyard_serial_no, 80),
    manufacturer:          sanitizeText(raw.manufacturer, 100),
    model:                 sanitizeText(raw.model, 100),
    inspector_name:        sanitizeText(raw.inspector_name, 100),
    inspector_id:          sanitizeText(raw.inspector_id, 80),
    safe_working_load:     sanitizeText(raw.safe_working_load, 50),
    working_pressure:      sanitizeText(raw.working_pressure, 50),
  };
}

// ── FIX 3: Reconstruct lines by Y-position so table cells stay separate ──────
// PDF.js returns each text fragment with a transform [a,b,c,d,x,y].
// Grouping by rounded Y gives us proper rows, fixing multi-word truncation.
async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group items by rounded Y coordinate (same visual row)
    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], str: item.str });
    }

    // PDF Y-axis is bottom-up, so sort descending to get top→bottom reading order
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
      const lineText  = lineItems.map((i) => i.str).join(" ").trim();
      if (lineText) text += lineText + "\n";
    }

    text += "\n"; // page break
  }

  return text;
}

async function getOrCreateClient(companyName) {
  const cleanName = normalizeText(companyName);
  if (!cleanName) throw new Error("Company name missing");
  const { data: existing } = await supabase
    .from("clients").select("id,company_name,company_code")
    .ilike("company_name", cleanName).limit(1).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from("clients").insert([{ company_name: cleanName, status: "active" }])
    .select("id,company_name,company_code").single();
  if (error) throw error;
  return created;
}

async function getOrCreateEquipment(clientId, parsed) {
  if (parsed.serial_number || parsed.equipment_id) {
    let query = supabase.from("assets").select("id,asset_tag,asset_name").eq("client_id", clientId);
    if (parsed.serial_number) query = query.eq("serial_number", parsed.serial_number);
    else query = query.eq("asset_tag", parsed.equipment_id);
    const { data } = await query.limit(1).maybeSingle();
    if (data) {
      await supabase.from("assets").update({
        serial_number:        parsed.serial_number        || undefined,
        last_inspection_date: parsed.last_inspection_date || undefined,
        next_inspection_date: parsed.next_inspection_date || undefined,
        safe_working_load:    parsed.safe_working_load    || undefined,
        working_pressure:     parsed.working_pressure     || undefined,
        inspector_name:       parsed.inspector_name       || undefined,
      }).eq("id", data.id);
      return data;
    }
  }
  const { data: created, error } = await registerEquipment({
    client_id:            clientId,
    asset_type:           parsed.asset_type,
    serial_number:        parsed.serial_number || parsed.equipment_id || null,
    manufacturer:         parsed.manufacturer  || "Unknown",
    model:                parsed.model         || null,
    year_built:           parsed.year_built    || null,
    location:             parsed.location      || null,
    cert_type:            parsed.certificate_type,
    safe_working_load:    parsed.safe_working_load  || null,
    working_pressure:     parsed.working_pressure   || null,
    last_inspection_date: parsed.last_inspection_date || null,
    next_inspection_date: parsed.next_inspection_date || null,
    license_status:       "valid",
    inspector_name:       parsed.inspector_name || null,
    notes:                "Imported from certificate",
  });
  if (error) throw error;
  return created;
}

async function generateCertNumber(serialNumber, assetId) {
  const base   = serialNumber
    ? serialNumber.replace(/[\s\-\/]+/g, "").toUpperCase()
    : `ASSET${assetId}`;
  const prefix = `CERT-${base}-`;
  const { data: existing } = await supabase
    .from("certificates")
    .select("certificate_number")
    .like("certificate_number", `${prefix}%`)
    .order("certificate_number", { ascending: false })
    .limit(1).maybeSingle();
  let nextSeq = 1;
  if (existing?.certificate_number) {
    const parts = existing.certificate_number.split("-");
    const last  = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(last)) nextSeq = last + 1;
  }
  return `${prefix}${String(nextSeq).padStart(2, "0")}`;
}

async function registerCertificate(equipmentId, clientName, parsed) {
  const { data: existing } = await supabase
    .from("certificates").select("id")
    .eq("asset_id", equipmentId)
    .eq("issued_at", new Date(parsed.issued_at).toISOString())
    .limit(1).maybeSingle();
  if (existing) return;

  const certNumber = await generateCertNumber(parsed.serial_number, equipmentId);
  const { error } = await supabase.from("certificates").insert([{
    asset_id:              equipmentId,
    certificate_number:    certNumber,
    certificate_type:      parsed.certificate_type || "Certificate of Statutory Inspection",
    company:               clientName,
    equipment_description: parsed.equipment_description || parsed.asset_type,
    equipment_location:    parsed.equipment_location    || parsed.location || null,
    // FIX: store identification_number and lanyard_serial_no separately
    equipment_id:          parsed.identification_number || parsed.serial_number || parsed.equipment_id || null,
    lanyard_serial_no:     parsed.lanyard_serial_no     || null,   // ← new column (run migration below)
    swl:                   parsed.swl                   || null,
    mawp:                  parsed.mawp                  || null,
    equipment_status:      parsed.equipment_status      || "PASS",
    issued_at:             new Date(parsed.issued_at).toISOString(),
    valid_to:              parsed.valid_to              || null,
    status:                "issued",
    legal_framework:       parsed.legal_framework,
    inspector_name:        parsed.inspector_name        || null,
    inspector_id:          parsed.inspector_id          || null,
    logo_url:              "/logo.png",
  }]);
  if (error) throw error;
}

// ── Status badge ──────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:     { bg:"rgba(148,163,184,0.1)", color:"#94a3b8", border:"rgba(148,163,184,0.3)" },
  extracting:  { bg:"rgba(251,191,36,0.1)",  color:"#fbbf24", border:"rgba(251,191,36,0.3)" },
  extracted:   { bg:"rgba(99,102,241,0.1)",  color:"#818cf8", border:"rgba(99,102,241,0.3)" },
  registering: { bg:"rgba(251,191,36,0.1)",  color:"#fbbf24", border:"rgba(251,191,36,0.3)" },
  done:        { bg:"rgba(16,185,129,0.1)",  color:"#86efac", border:"rgba(16,185,129,0.3)" },
  error:       { bg:"rgba(244,114,182,0.1)", color:"#f472b6", border:"rgba(244,114,182,0.3)" },
};

function StatusBadge({ status, message }) {
  const s      = STATUS_STYLE[status] || STATUS_STYLE.pending;
  const labels = { pending:"Pending", extracting:"Extracting…", extracted:"Extracted",
    registering:"Registering…", done:"Done ✓", error:"Error" };
  return (
    <span style={{
      display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11,
      fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }} title={message || ""}>
      {labels[status] || status}
    </span>
  );
}

export default function BulkImportPage() {
  const router = useRouter();
  const [files,         setFiles]         = useState([]);
  const [running,       setRunning]       = useState(false);
  const [globalError,   setGlobalError]   = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  function handleFileSelect(e) {
    const all      = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const selected = all.slice(0, MAX_FILES);
    if (all.length > MAX_FILES)
      setGlobalError(`Max ${MAX_FILES} files per import. Only the first ${MAX_FILES} were loaded.`);
    else setGlobalError("");

    const tooBig = selected.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length)
      setGlobalError(`${tooBig.length} file(s) exceed ${MAX_FILE_MB}MB and were skipped.`);

    const valid = selected.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    setFiles(valid.map((file) => ({ file, status:"pending", parsed:null, error:"" })));
    setGlobalSuccess("");
  }

  function updateFile(index, patch) {
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, ...patch } : f));
  }

  async function handleExtractAll() {
    if (!files.length) return;
    setRunning(true);
    setGlobalError("");
    setGlobalSuccess("");

    for (let i = 0; i < files.length; i++) {
      updateFile(i, { status:"extracting", error:"" });
      try {
        const text   = await extractTextFromPdf(files[i].file);
        const raw    = extractCertificateData(text);
        const parsed = sanitizeParsed(raw);
        const validationErrors = validateParsed(parsed);
        if (validationErrors.length) throw new Error(validationErrors.join("; "));
        updateFile(i, { status:"extracted", parsed });
      } catch (err) {
        updateFile(i, { status:"error", error: err.message });
      }
    }
    setRunning(false);
  }

  async function handleRegisterAll() {
    setRunning(true);
    setGlobalError("");
    setGlobalSuccess("");
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "extracted") continue;
      updateFile(i, { status:"registering" });
      try {
        const { parsed } = files[i];
        const client    = await getOrCreateClient(parsed.company);
        const equipment = await getOrCreateEquipment(client.id, parsed);
        await registerCertificate(equipment.id, client.company_name, parsed);
        updateFile(i, { status:"done" });
        successCount++;
      } catch (err) {
        updateFile(i, { status:"error", error: err.message });
      }
    }

    setRunning(false);
    if (successCount > 0)
      setGlobalSuccess(`${successCount} certificate${successCount > 1 ? "s" : ""} registered successfully!`);
  }

  const anyExtracted = files.some((f) => f.status === "extracted");
  const doneCount    = files.filter((f) => f.status === "done").length;
  const errorCount   = files.filter((f) => f.status === "error").length;

  const labelStyle = {
    fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)",
    textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block",
  };

  return (
    <AppLayout title="Bulk Import Certificates">
      <div style={{ maxWidth:1000 }}>
        <h1 style={{ color:"#fff", marginBottom:6 }}>Bulk Import Certificates</h1>
        <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13, marginBottom:28 }}>
          Upload multiple certificate PDFs at once (max {MAX_FILES} files, {MAX_FILE_MB}MB each).
        </p>

        {globalError && (
          <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:"#f472b6", fontSize:13 }}>
            ⚠️ {globalError}
          </div>
        )}
        {globalSuccess && (
          <div style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.35)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:"#86efac", fontSize:13 }}>
            ✅ {globalSuccess}
          </div>
        )}

        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:20 }}>
          <label style={labelStyle}>Select Certificate PDFs (max {MAX_FILES} files)</label>
          <input type="file" accept=".pdf" multiple onChange={handleFileSelect} disabled={running}
            style={{ color:"#e2e8f0", marginBottom:16, display:"block" }}
          />

          {files.length > 0 && (
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginBottom:16 }}>
              {files.length} file{files.length > 1 ? "s" : ""} selected
              {doneCount  > 0 ? ` · ${doneCount} done`   : ""}
              {errorCount > 0 ? ` · ${errorCount} failed` : ""}
            </p>
          )}

          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button type="button" onClick={handleExtractAll} disabled={running || !files.length}
              style={{ padding:"11px 24px", borderRadius:8, border:"none",
                background:"linear-gradient(135deg,#667eea,#764ba2)", color:"#fff", fontWeight:700,
                cursor: running || !files.length ? "not-allowed" : "pointer",
                opacity: running || !files.length ? 0.6 : 1 }}>
              {running && !anyExtracted ? "Extracting…" : "1. Extract All"}
            </button>
            <button type="button" onClick={handleRegisterAll} disabled={running || !anyExtracted}
              style={{ padding:"11px 24px", borderRadius:8, border:"none",
                background:"linear-gradient(135deg,#00f5c4,#4fc3f7)", color:"#111827", fontWeight:700,
                cursor: running || !anyExtracted ? "not-allowed" : "pointer",
                opacity: running || !anyExtracted ? 0.6 : 1 }}>
              {running && anyExtracted ? "Registering…" : "2. Register All"}
            </button>
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {files.map((item, i) => (
              <div key={i} style={{
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:12, padding:16,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:"#fff", fontWeight:600, fontSize:13, marginBottom:4, wordBreak:"break-word" }}>
                      📄 {item.file.name}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>
                      {(item.file.size / 1024).toFixed(1)} KB
                    </div>
                    {item.error && (
                      <div style={{ color:"#f472b6", fontSize:11, marginTop:6 }}>⚠️ {item.error}</div>
                    )}
                  </div>
                  <StatusBadge status={item.status} message={item.error} />
                </div>

                {item.parsed && (item.status === "extracted" || item.status === "done") && (
                  <div style={{
                    marginTop:12, padding:12,
                    background:"rgba(255,255,255,0.03)", borderRadius:8,
                    display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8,
                  }}>
                    {[
                      // FIX: show Identification No. and Lanyard Serial No. as separate rows
                      ["Client",              item.parsed.company],
                      ["Equipment",           item.parsed.asset_type],
                      ["Identification No.",  item.parsed.identification_number],
                      ["Lanyard Serial No.",  item.parsed.lanyard_serial_no],
                      ["Inspection No.",      item.parsed.equipment_id],
                      ["Location",            item.parsed.location],
                      ["SWL",                 item.parsed.swl],
                      ["Inspector",           item.parsed.inspector_name],
                      ["Last Inspection",     item.parsed.last_inspection_date],
                      ["Next Inspection",     item.parsed.next_inspection_date],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:500 }}>{value}</div>
                      </div>
                    ))}
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
