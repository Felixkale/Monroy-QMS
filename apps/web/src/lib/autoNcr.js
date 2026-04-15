// src/lib/autoNcr.js
// ─────────────────────────────────────────────────────────────────────────────
// Auto-generates NCR + CAPA whenever a certificate has a non-PASS result.
//
// Key improvements:
//   - resolveAssetId uses serial + client + equipment_type (triple match, zero collisions)
//   - Parses defects_found, recommendations, comments, notes for rich NCR/CAPA content
//   - autoRaiseNcr() is idempotent — safe to call on every certificate save
//   - autoRaiseNcrForAllExisting() backfills NCRs for all non-pass certs in DB
//   - Triggered from certificate wizard save AND certificate edit save
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";

const INSPECTOR = "Moemedi Masupe";

const NON_PASS_RESULTS = ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"];

// ── Utility helpers ───────────────────────────────────────────────────────────

function nz(v, fb = "") {
  if (v === null || v === undefined) return fb;
  return String(v).trim() || fb;
}

function normalizeResult(v) {
  return nz(v).toUpperCase().replace(/\s+/g, "_");
}

function isNonPass(result) {
  return NON_PASS_RESULTS.includes(normalizeResult(result));
}

function resultLabel(v) {
  const x = normalizeResult(v);
  if (x === "FAIL")            return "Fail";
  if (x === "REPAIR_REQUIRED") return "Repair Required";
  if (x === "OUT_OF_SERVICE")  return "Out of Service";
  if (x === "CONDITIONAL")     return "Conditional";
  return x || "Unknown";
}

function severityFromResult(result) {
  const r = normalizeResult(result);
  if (r === "OUT_OF_SERVICE")  return "critical";
  if (r === "FAIL")            return "major";
  if (r === "REPAIR_REQUIRED") return "major";
  if (r === "CONDITIONAL")     return "minor";
  return "minor";
}

function priorityFromResult(result) {
  const r = normalizeResult(result);
  if (r === "OUT_OF_SERVICE")  return "critical";
  if (r === "FAIL")            return "high";
  if (r === "REPAIR_REQUIRED") return "medium";
  return "low";
}

function dueDateFromSeverity(severity) {
  const d = new Date();
  const days = severity === "critical" ? 7 : severity === "major" ? 14 : 30;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateNcrNumber(certNumber) {
  const n   = new Date();
  const pad = v => String(v).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  const base = certNumber
    ? certNumber.replace(/^CERT-/, "").replace(/[^A-Z0-9]/gi, "").slice(0, 12)
    : `${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}`;
  return `NCR-${base}-${rand}`;
}

function generateCapaNumber(ncrNumber) {
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `CAPA-${ncrNumber.replace(/^NCR-/, "")}-${rand}`;
}

// ── Defect / remarks parser ───────────────────────────────────────────────────
// Pulls meaningful text from all possible comment/defect fields on a certificate.
// Returns { defectText, remarkText, allFindings } for use in NCR/CAPA content.
function parseFindings(cert) {
  const rawFields = [
    cert.defects_found,
    cert.recommendations,
    cert.comments,
    cert.remarks,
    cert.notes,
    cert.findings,
    cert.observation,
  ].filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 2);

  // Also try to parse JSON notes (used in machine/crane inspection wizards)
  let jsonNotes = [];
  if (cert.notes && typeof cert.notes === "string" && cert.notes.startsWith("{")) {
    try {
      const parsed = JSON.parse(cert.notes);
      // Flatten any defect/remark fields from JSON notes
      const jsonFields = [
        parsed.defects, parsed.remarks, parsed.comments,
        parsed.findings, parsed.defects_found, parsed.observation,
      ].filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 2);
      jsonNotes = jsonFields;
    } catch (_) {}
  }

  const all = [...rawFields, ...jsonNotes];
  const defectText  = nz(cert.defects_found || cert.findings || cert.observation, "");
  const remarkText  = nz(cert.recommendations || cert.remarks || cert.comments, "");
  const allFindings = all.length ? all.join("\n\n") : "";

  return { defectText, remarkText, allFindings };
}

// ── Recommended CAPA action generator ─────────────────────────────────────────
// Builds a sensible immediate_action string from defect text + result.
function buildImmediateAction(result, defectText, equipType) {
  const r = normalizeResult(result);
  const lines = [];

  if (r === "OUT_OF_SERVICE") {
    lines.push("⚠ Equipment immediately removed from service pending full inspection and repair.");
  } else if (r === "FAIL") {
    lines.push("Equipment taken offline. Repair required before next use.");
  } else if (r === "REPAIR_REQUIRED") {
    lines.push("Schedule repair. Equipment not to be used until rectification is complete.");
  } else if (r === "CONDITIONAL") {
    lines.push("Equipment may operate under restricted conditions only. Monitor closely.");
  }

  if (defectText) {
    lines.push(`\nDefects to address:\n${defectText.slice(0, 400)}${defectText.length > 400 ? "…" : ""}`);
  }

  if (equipType) {
    const et = equipType.toLowerCase();
    if (et.includes("crane") || et.includes("hoist") || et.includes("sling")) {
      lines.push("\nLifting equipment — re-inspection required by competent person before return to service.");
    } else if (et.includes("pressure") || et.includes("vessel") || et.includes("receiver")) {
      lines.push("\nPressure vessel — ensure safe pressure venting before maintenance.");
    } else if (et.includes("harness") || et.includes("safety")) {
      lines.push("\nHeight safety equipment — must be replaced, not repaired, if structural damage found.");
    } else if (et.includes("truck") || et.includes("vehicle") || et.includes("bowser") || et.includes("bus")) {
      lines.push("\nVehicle — park and lock out. Do not operate until roadworthy certificate obtained.");
    }
  }

  return lines.join("\n").trim() || "Inspect, repair, and re-certify before returning to service.";
}

// ── Smart asset resolver ───────────────────────────────────────────────────────
// Priority 1: serial + client_id + equipment_type  (zero collisions)
// Priority 2: serial + client_id                   (if type label differs)
// Priority 3: serial only (only if single result)
// Priority 4: fleet/registration number as asset_tag
// Priority 5: fuzzy equipment_description match
async function resolveAssetId(cert) {
  // Already linked
  if (cert.asset_id) return cert.asset_id;

  const sel = "id";

  // Resolve client_id from client_name
  let clientId = null;
  const clientName = nz(cert.client_name || cert.company);
  if (clientName) {
    const { data: cl } = await supabase
      .from("clients")
      .select("id")
      .eq("company_name", clientName)
      .maybeSingle();
    clientId = cl?.id || null;
  }

  // ── Priority 1: serial + client + equipment_type ──────────────────────────
  if (nz(cert.serial_number) && clientId && nz(cert.equipment_type)) {
    const { data } = await supabase.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .eq("client_id",     clientId)
      .eq("asset_type",    cert.equipment_type)
      .limit(1);
    if (data?.[0]?.id) return data[0].id;
  }

  // ── Priority 2: serial + client ───────────────────────────────────────────
  if (nz(cert.serial_number) && clientId) {
    const { data } = await supabase.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .eq("client_id",     clientId)
      .limit(2);
    if (data?.length === 1) return data[0].id; // only if unambiguous
  }

  // ── Priority 3: serial only (unambiguous single match) ────────────────────
  if (nz(cert.serial_number)) {
    const { data } = await supabase.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .limit(2);
    if (data?.length === 1) return data[0].id;
  }

  // ── Priority 4: fleet_number or registration_number as asset_tag ──────────
  for (const tag of [cert.fleet_number, cert.registration_number].filter(Boolean)) {
    const { data } = await supabase.from("assets").select(sel)
      .eq("asset_tag", tag).limit(1);
    if (data?.[0]?.id) return data[0].id;
  }

  // ── Priority 5: fuzzy equipment_description / asset_name ──────────────────
  const fuzzyTerms = [cert.equipment_description, cert.asset_name].filter(Boolean);
  for (const term of fuzzyTerms) {
    if (term.length < 4) continue;
    const { data } = await supabase.from("assets").select(sel)
      .ilike("asset_name", `%${term}%`).limit(2);
    if (data?.length === 1) return data[0].id;
  }

  return null;
}

// ── Main entry point ──────────────────────────────────────────────────────────
/**
 * Auto-raises NCR + CAPA for a single certificate.
 * Safe to call on every certificate save — idempotent by certificate_id.
 *
 * @param {object}  certificate          Full certificate row from Supabase
 * @param {object}  [options]
 * @param {boolean} [options.createCapa=true]  Also auto-create CAPA
 * @param {boolean} [options.force=false]       Re-raise even if NCR exists
 * @returns {{ ncr, capa, skipped, error }}
 */
export async function autoRaiseNcr(certificate, { createCapa = true, force = false } = {}) {
  if (!certificate) return { ncr: null, capa: null, skipped: true, error: null };

  const result = normalizeResult(certificate.result);

  if (!isNonPass(result)) {
    return { ncr: null, capa: null, skipped: true, error: null };
  }

  // ── Idempotency: skip if NCR already exists for this certificate ──────────
  if (!force && certificate.id) {
    const { data: existing } = await supabase
      .from("ncrs")
      .select("id, ncr_number, capas(id, capa_number)")
      .eq("certificate_id", certificate.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const capa = existing.capas?.[0] || null;
      return {
        ncr:     { id: existing.id, ncr_number: existing.ncr_number },
        capa:    capa ? { id: capa.id, capa_number: capa.capa_number } : null,
        skipped: true,
        error:   null,
      };
    }
  }

  // ── Gather all cert fields ────────────────────────────────────────────────
  const severity   = severityFromResult(result);
  const priority   = priorityFromResult(result);
  const dueDate    = dueDateFromSeverity(severity);
  const ncrNumber  = generateNcrNumber(certificate.certificate_number);
  const assetId    = await resolveAssetId(certificate);

  const clientName = nz(certificate.client_name || certificate.company, "—");
  const equipDesc  = nz(certificate.equipment_description || certificate.asset_name || certificate.asset_tag, "equipment");
  const equipType  = nz(certificate.equipment_type || certificate.asset_type);
  const certNo     = nz(certificate.certificate_number || certificate.id, "—");
  const serialNo   = nz(certificate.serial_number);
  const fleetNo    = nz(certificate.fleet_number);
  const regNo      = nz(certificate.registration_number);
  const inspDate   = nz(certificate.inspection_date || certificate.issue_date);
  const expiryDate = nz(certificate.expiry_date);

  const { defectText, remarkText, allFindings } = parseFindings(certificate);

  // ── Build NCR description (short — 1-3 sentences) ────────────────────────
  const description = [
    `${resultLabel(result)} detected on certificate ${certNo} for ${equipDesc}${equipType ? ` (${equipType})` : ""}.`,
    clientName !== "—" ? `Client: ${clientName}.` : "",
    defectText ? `Defects: ${defectText.slice(0, 180)}${defectText.length > 180 ? "…" : ""}` : "",
  ].filter(Boolean).join(" ");

  // ── Build NCR details (full structured report) ────────────────────────────
  const details = [
    "══════════════════════════════",
    "  AUTO-GENERATED NCR",
    "══════════════════════════════",
    "",
    `Certificate No.:    ${certNo}`,
    `Client:             ${clientName}`,
    `Equipment:          ${equipDesc}`,
    equipType  ? `Type:               ${equipType}`   : null,
    serialNo   ? `Serial No.:         ${serialNo}`    : null,
    fleetNo    ? `Fleet No.:          ${fleetNo}`     : null,
    regNo      ? `Reg. No.:           ${regNo}`       : null,
    `Result:             ${resultLabel(result)}`,
    inspDate   ? `Inspection Date:    ${inspDate}`    : null,
    expiryDate ? `Expiry Date:        ${expiryDate}`  : null,
    "",
    allFindings ? `FINDINGS & DEFECTS:\n${allFindings}` : "No specific defects recorded.",
    remarkText  ? `\nRECOMMENDATIONS:\n${remarkText}` : null,
    "",
    "══════════════════════════════",
    "  ACTIONS REQUIRED",
    "══════════════════════════════",
    severity === "critical" ? "⚠ CRITICAL — Equipment must be taken OUT OF SERVICE immediately." : null,
    severity === "major"    ? "⚠ MAJOR — Equipment must be repaired before next use." : null,
    severity === "minor"    ? "ℹ MINOR — Monitor equipment. Schedule maintenance." : null,
    "",
    `Inspector: ${INSPECTOR}`,
    `Auto-raised: ${new Date().toISOString()}`,
  ].filter(s => s !== null).join("\n").trim();

  // ── Insert NCR ────────────────────────────────────────────────────────────
  const ncrPayload = {
    ncr_number:     ncrNumber,
    title:          `${resultLabel(result)} — ${equipDesc.slice(0, 80)}`,
    severity,
    status:         "open",
    description,
    details,
    due_date:       dueDate,
    raised_by:      INSPECTOR,
    certificate_id: certificate.id || null,
    ...(assetId ? { asset_id: assetId } : {}),
  };

  const { data: ncrData, error: ncrErr } = await supabase
    .from("ncrs")
    .insert(ncrPayload)
    .select("id, ncr_number")
    .single();

  if (ncrErr) {
    console.error("[autoRaiseNcr] NCR insert failed:", ncrErr.message);
    return { ncr: null, capa: null, skipped: false, error: ncrErr.message };
  }

  if (!createCapa) {
    return { ncr: ncrData, capa: null, skipped: false, error: null };
  }

  // ── Insert CAPA ───────────────────────────────────────────────────────────
  const capaNumber      = generateCapaNumber(ncrNumber);
  const immediateAction = buildImmediateAction(result, defectText, equipType);

  const capaPayload = {
    capa_number:         capaNumber,
    title:               `CAPA — ${ncrData.ncr_number} — ${equipDesc.slice(0, 60)}`,
    type:                "corrective",
    priority,
    stage:               "identification",
    status:              "open",
    raised_by:           INSPECTOR,
    target_date:         dueDate,
    problem_description: description,
    immediate_action:    immediateAction,
    root_cause:          defectText
      ? `Root cause to be determined. Initial findings: ${defectText.slice(0, 300)}`
      : "Root cause investigation required.",
    corrective_action:   remarkText
      ? remarkText.slice(0, 500)
      : "Corrective action to be defined after root cause analysis.",
    ncr_id:              ncrData.id,
    ...(assetId ? { asset_id: assetId } : {}),
  };

  const { data: capaData, error: capaErr } = await supabase
    .from("capas")
    .insert(capaPayload)
    .select("id, capa_number")
    .single();

  if (capaErr) {
    console.warn("[autoRaiseNcr] CAPA insert failed:", capaErr.message);
    return { ncr: ncrData, capa: null, skipped: false, error: capaErr.message };
  }

  return { ncr: ncrData, capa: capaData, skipped: false, error: null };
}

// ── Batch backfill — run once to raise NCRs for ALL existing non-pass certs ──
/**
 * Scans the entire certificates table for non-pass results that have no NCR yet,
 * and auto-raises NCR + CAPA for each one.
 *
 * Usage: call from a one-off admin page, API route, or browser console.
 *   import { autoRaiseNcrForAllExisting } from "@/lib/autoNcr";
 *   const report = await autoRaiseNcrForAllExisting();
 *   console.log(report);
 *
 * @param {function} [onProgress]  Optional callback(current, total, cert) for UI progress
 * @returns {{ created, skipped, failed, errors }}
 */
export async function autoRaiseNcrForAllExisting(onProgress) {
  const report = { created: 0, skipped: 0, failed: 0, errors: [] };

  // Load all non-pass certs that don't already have an NCR
  const { data: certs, error: fetchErr } = await supabase
    .from("certificates")
    .select("*")
    .in("result", ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"])
    .order("created_at", { ascending: true });

  if (fetchErr) {
    report.errors.push(`Failed to fetch certificates: ${fetchErr.message}`);
    return report;
  }

  if (!certs?.length) {
    console.log("[autoRaiseNcrForAllExisting] No non-pass certificates found.");
    return report;
  }

  // Filter to only those without an existing NCR
  const certIds = certs.map(c => c.id);
  const { data: existingNcrs } = await supabase
    .from("ncrs")
    .select("certificate_id")
    .in("certificate_id", certIds);

  const alreadyHasNcr = new Set((existingNcrs || []).map(n => n.certificate_id));
  const toProcess = certs.filter(c => !alreadyHasNcr.has(c.id));

  console.log(`[autoRaiseNcrForAllExisting] ${certs.length} non-pass certs found. ${alreadyHasNcr.size} already have NCRs. Processing ${toProcess.length}…`);

  for (let i = 0; i < toProcess.length; i++) {
    const cert = toProcess[i];
    if (onProgress) onProgress(i + 1, toProcess.length, cert);

    try {
      const result = await autoRaiseNcr(cert, { createCapa: true, force: false });

      if (result.error && !result.ncr) {
        report.failed++;
        report.errors.push(`${cert.certificate_number}: ${result.error}`);
        console.error(`[autoRaiseNcrForAllExisting] FAILED ${cert.certificate_number}:`, result.error);
      } else if (result.skipped) {
        report.skipped++;
      } else {
        report.created++;
        console.log(`[autoRaiseNcrForAllExisting] ✅ Created NCR ${result.ncr?.ncr_number} + CAPA ${result.capa?.capa_number} for ${cert.certificate_number}`);
      }
    } catch (e) {
      report.failed++;
      report.errors.push(`${cert.certificate_number}: ${e?.message || "Unknown error"}`);
    }

    // Small delay to avoid hammering Supabase rate limits
    if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 120));
  }

  console.log("[autoRaiseNcrForAllExisting] Done.", report);
  return report;
}

/**
 * Single-cert version — convenience wrapper for calling from certificate save handlers.
 * Use this in your wizard onSubmit and CertificateEditPage handleSave.
 *
 * Example usage in wizard:
 *   import { triggerAutoNcr } from "@/lib/autoNcr";
 *   await triggerAutoNcr(savedCertificate);
 */
export async function triggerAutoNcr(certificate) {
  if (!certificate) return;
  const result = normalizeResult(certificate.result || "");
  if (!isNonPass(result)) return;

  try {
    const { ncr, capa, skipped, error } = await autoRaiseNcr(certificate, { createCapa: true });
    if (!skipped && ncr) {
      console.log(`[triggerAutoNcr] ✅ NCR ${ncr.ncr_number}${capa ? ` + CAPA ${capa.capa_number}` : ""} raised for ${certificate.certificate_number}`);
    } else if (skipped) {
      console.log(`[triggerAutoNcr] ⏭ Skipped — NCR already exists for ${certificate.certificate_number}`);
    } else if (error) {
      console.warn(`[triggerAutoNcr] ⚠ ${error}`);
    }
  } catch (e) {
    console.warn("[triggerAutoNcr] Error:", e?.message);
  }
}
