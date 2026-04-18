// src/lib/autoNcr.js
// ─────────────────────────────────────────────────────────────────────────────
// Auto-generates NCR + CAPA whenever a certificate has a non-PASS result.
//
// Uses service role client so system operations bypass RLS entirely.
// The browser anon client is only used for idempotency read checks.
//
// Exports:
//   autoRaiseNcr(cert, options)            — single cert, idempotent
//   triggerAutoNcr(cert)                   — lightweight wrapper for wizard saves
//   autoRaiseNcrForAllExisting(onProgress) — batch backfill for existing certs
//   autoRaiseNcrBatch(certs, options)      — legacy batch alias (kept for compat)
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

const INSPECTOR = "Moemedi Masupe";
const NON_PASS_RESULTS = ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"];

// ── Service role client — bypasses RLS for system writes ──────────────────────
// Falls back to anon client if service role key is not set (dev environments)
function getAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && svcKey) {
    return createClient(url, svcKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Fallback: use browser client (works if RLS policies are correctly set)
  console.warn("[autoNcr] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon client. RLS may block writes.");
  return supabase;
}

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
  const n    = new Date();
  const pad  = v => String(v).padStart(2, "0");
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

  let jsonNotes = [];
  if (cert.notes && typeof cert.notes === "string" && cert.notes.startsWith("{")) {
    try {
      const parsed = JSON.parse(cert.notes);
      const jsonFields = [
        parsed.defects, parsed.remarks, parsed.comments,
        parsed.findings, parsed.defects_found, parsed.observation,
      ].filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 2);
      jsonNotes = jsonFields;
    } catch (_) {}
  }

  const all         = [...rawFields, ...jsonNotes];
  const defectText  = nz(cert.defects_found || cert.findings || cert.observation, "");
  const remarkText  = nz(cert.recommendations || cert.remarks || cert.comments, "");
  const allFindings = all.length ? all.join("\n\n") : "";

  return { defectText, remarkText, allFindings };
}

// ── CAPA immediate action builder ─────────────────────────────────────────────
function buildImmediateAction(result, defectText, equipType) {
  const r     = normalizeResult(result);
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
      lines.push("\nLifting equipment — re-inspection by competent person required before return to service.");
    } else if (et.includes("pressure") || et.includes("vessel") || et.includes("receiver")) {
      lines.push("\nPressure vessel — ensure safe pressure venting before any maintenance work.");
    } else if (et.includes("harness") || et.includes("safety")) {
      lines.push("\nHeight safety equipment — must be replaced, not repaired, if structural damage is found.");
    } else if (et.includes("truck") || et.includes("vehicle") || et.includes("bowser") || et.includes("bus")) {
      lines.push("\nVehicle — park and lock out. Do not operate until roadworthy certificate is obtained.");
    }
  }

  return lines.join("\n").trim() || "Inspect, repair, and re-certify before returning to service.";
}

// ── Smart asset resolver ──────────────────────────────────────────────────────
// Tries multiple identifiers in priority order to find the linked asset.
// Uses admin client so it can read assets regardless of RLS.
async function resolveAssetId(cert, adminClient) {
  if (cert.asset_id) return cert.asset_id;

  const db  = adminClient;
  const sel = "id";

  // Resolve client_id from client_name
  let clientId = null;
  const clientName = nz(cert.client_name || cert.company);
  if (clientName) {
    const { data: cl } = await db
      .from("clients")
      .select("id")
      .eq("company_name", clientName)
      .maybeSingle();
    clientId = cl?.id || null;
  }

  // 1. serial + client + equipment_type
  if (nz(cert.serial_number) && clientId && nz(cert.equipment_type)) {
    const { data } = await db.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .eq("client_id",     clientId)
      .eq("asset_type",    cert.equipment_type)
      .limit(1);
    if (data?.[0]?.id) return data[0].id;
  }

  // 2. serial + client
  if (nz(cert.serial_number) && clientId) {
    const { data } = await db.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .eq("client_id",     clientId)
      .limit(2);
    if (data?.length === 1) return data[0].id;
  }

  // 3. serial only (unambiguous single match)
  if (nz(cert.serial_number)) {
    const { data } = await db.from("assets").select(sel)
      .eq("serial_number", cert.serial_number)
      .limit(2);
    if (data?.length === 1) return data[0].id;
  }

  // 4. fleet_number — try fleet_number column first, then asset_tag
  if (nz(cert.fleet_number)) {
    const { data: byFleet } = await db.from("assets").select(sel)
      .eq("fleet_number", cert.fleet_number).limit(2);
    if (byFleet?.length === 1) return byFleet[0].id;

    // Fleet number stored as asset_tag fallback
    const { data: byTag } = await db.from("assets").select(sel)
      .eq("asset_tag", cert.fleet_number).limit(1);
    if (byTag?.[0]?.id) return byTag[0].id;
  }

  // 5. registration_number — try registration_number column first, then asset_tag
  if (nz(cert.registration_number)) {
    const { data: byReg } = await db.from("assets").select(sel)
      .eq("registration_number", cert.registration_number).limit(2);
    if (byReg?.length === 1) return byReg[0].id;

    const { data: byTag } = await db.from("assets").select(sel)
      .eq("asset_tag", cert.registration_number).limit(1);
    if (byTag?.[0]?.id) return byTag[0].id;
  }

  // 6. asset_tag direct
  if (nz(cert.asset_tag)) {
    const { data } = await db.from("assets").select(sel)
      .eq("asset_tag", cert.asset_tag).limit(1);
    if (data?.[0]?.id) return data[0].id;
  }

  // 7. fuzzy equipment_description / asset_name
  const fuzzyTerms = [cert.equipment_description, cert.asset_name].filter(Boolean);
  for (const term of fuzzyTerms) {
    if (term.length < 4) continue;
    const { data } = await db.from("assets").select(sel)
      .ilike("asset_name", `%${term}%`).limit(2);
    if (data?.length === 1) return data[0].id;
    if (data?.length > 1 && clientId) {
      // Multiple — try to narrow by client
      const { data: narrow } = await db.from("assets").select(sel)
        .ilike("asset_name", `%${term}%`)
        .eq("client_id", clientId).limit(1);
      if (narrow?.[0]?.id) return narrow[0].id;
    }
  }

  return null;
}

// ── Main entry point ──────────────────────────────────────────────────────────
/**
 * Auto-raises NCR + CAPA for a single certificate.
 * Idempotent — safe to call on every certificate save.
 *
 * @param {object}  certificate
 * @param {object}  [options]
 * @param {boolean} [options.createCapa=true]
 * @param {boolean} [options.force=false]
 * @returns {{ ncr, capa, skipped, error }}
 */
export async function autoRaiseNcr(certificate, { createCapa = true, force = false } = {}) {
  if (!certificate) return { ncr: null, capa: null, skipped: true, error: null };

  const result = normalizeResult(certificate.result);
  if (!isNonPass(result)) return { ncr: null, capa: null, skipped: true, error: null };

  // Use admin client for all writes — bypasses RLS
  const adminClient = getAdminClient();

  // Idempotency check — use anon client (read-only, RLS allows select)
  if (!force && certificate.id) {
    const { data: existing } = await supabase
      .from("ncrs")
      .select("id, ncr_number")
      .eq("certificate_id", certificate.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Also fetch linked CAPA
      const { data: capa } = await supabase
        .from("capas")
        .select("id, capa_number")
        .eq("ncr_id", existing.id)
        .limit(1)
        .maybeSingle();

      return {
        ncr:     { id: existing.id, ncr_number: existing.ncr_number },
        capa:    capa ? { id: capa.id, capa_number: capa.capa_number } : null,
        skipped: true,
        error:   null,
      };
    }
  }

  const severity  = severityFromResult(result);
  const priority  = priorityFromResult(result);
  const dueDate   = dueDateFromSeverity(severity);
  const ncrNumber = generateNcrNumber(certificate.certificate_number);

  // Resolve asset — pass admin client so it can read regardless of RLS
  const assetId = await resolveAssetId(certificate, adminClient);

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

  const description = [
    `${resultLabel(result)} detected on certificate ${certNo} for ${equipDesc}${equipType ? ` (${equipType})` : ""}.`,
    clientName !== "—" ? `Client: ${clientName}.` : "",
    defectText ? `Defects: ${defectText.slice(0, 180)}${defectText.length > 180 ? "…" : ""}` : "",
  ].filter(Boolean).join(" ");

  const details = [
    "══════════════════════════════",
    "  AUTO-GENERATED NCR",
    "══════════════════════════════",
    "",
    `Certificate No.:    ${certNo}`,
    `Client:             ${clientName}`,
    `Equipment:          ${equipDesc}`,
    equipType  ? `Type:               ${equipType}`  : null,
    serialNo   ? `Serial No.:         ${serialNo}`   : null,
    fleetNo    ? `Fleet No.:          ${fleetNo}`    : null,
    regNo      ? `Reg. No.:           ${regNo}`      : null,
    `Result:             ${resultLabel(result)}`,
    inspDate   ? `Inspection Date:    ${inspDate}`   : null,
    expiryDate ? `Expiry Date:        ${expiryDate}` : null,
    "",
    allFindings ? `FINDINGS & DEFECTS:\n${allFindings}` : "No specific defects recorded.",
    remarkText  ? `\nRECOMMENDATIONS:\n${remarkText}` : null,
    "",
    "══════════════════════════════",
    "  ACTIONS REQUIRED",
    "══════════════════════════════",
    severity === "critical" ? "⚠ CRITICAL — Equipment must be taken OUT OF SERVICE immediately." : null,
    severity === "major"    ? "⚠ MAJOR — Equipment must be repaired before next use."            : null,
    severity === "minor"    ? "ℹ MINOR — Monitor equipment. Schedule maintenance."               : null,
    "",
    `Inspector: ${INSPECTOR}`,
    `Auto-raised: ${new Date().toISOString()}`,
  ].filter(s => s !== null).join("\n").trim();

  // ── Build NCR payload ─────────────────────────────────────────────────────
  // Only include asset_id and certificate_id if they exist — avoids not-null
  // constraint errors when those columns don't exist in the schema
  const ncrPayload = {
    ncr_number:  ncrNumber,
    title:       `${resultLabel(result)} — ${equipDesc.slice(0, 80)}`,
    severity,
    status:      "open",
    description,
    details,
    due_date:    dueDate,
    raised_by:   INSPECTOR,
  };

  // Conditionally add FK columns only if the values exist
  if (certificate.id)  ncrPayload.certificate_id = certificate.id;
  if (assetId)         ncrPayload.asset_id        = assetId;

  const { data: ncrData, error: ncrErr } = await adminClient
    .from("ncrs")
    .insert(ncrPayload)
    .select("id, ncr_number")
    .single();

  if (ncrErr) {
    console.error("[autoRaiseNcr] NCR insert failed:", ncrErr.message);
    return { ncr: null, capa: null, skipped: false, error: ncrErr.message };
  }

  if (!createCapa) return { ncr: ncrData, capa: null, skipped: false, error: null };

  // ── Build CAPA payload ────────────────────────────────────────────────────
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
  };

  if (assetId) capaPayload.asset_id = assetId;

  const { data: capaData, error: capaErr } = await adminClient
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

// ── Lightweight trigger for wizard / edit saves ───────────────────────────────
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

// ── Batch backfill ────────────────────────────────────────────────────────────
export async function autoRaiseNcrForAllExisting(onProgress) {
  const report = { created: 0, skipped: 0, failed: 0, errors: [] };

  const { data: certs, error: fetchErr } = await supabase
    .from("certificates")
    .select("*")
    .in("result", ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"])
    .order("created_at", { ascending: true });

  if (fetchErr) {
    report.errors.push(`Failed to fetch certificates: ${fetchErr.message}`);
    return report;
  }

  if (!certs?.length) return report;

  const certIds = certs.map(c => c.id);
  const { data: existingNcrs } = await supabase
    .from("ncrs")
    .select("certificate_id")
    .in("certificate_id", certIds);

  const alreadyHasNcr = new Set((existingNcrs || []).map(n => n.certificate_id));
  const toProcess     = certs.filter(c => !alreadyHasNcr.has(c.id));

  console.log(`[autoRaiseNcrForAllExisting] ${toProcess.length} to process…`);

  for (let i = 0; i < toProcess.length; i++) {
    const cert = toProcess[i];
    if (onProgress) onProgress(i + 1, toProcess.length, cert);
    try {
      const result = await autoRaiseNcr(cert, { createCapa: true, force: false });
      if (result.error && !result.ncr) {
        report.failed++;
        report.errors.push(`${cert.certificate_number}: ${result.error}`);
      } else if (result.skipped) {
        report.skipped++;
      } else {
        report.created++;
      }
    } catch (e) {
      report.failed++;
      report.errors.push(`${cert.certificate_number}: ${e?.message || "Unknown error"}`);
    }
    if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 120));
  }

  return report;
}

// ── Legacy alias ──────────────────────────────────────────────────────────────
export async function autoRaiseNcrBatch(certificates, options = {}) {
  const results = [];
  for (const cert of (certificates || [])) {
    const r = await autoRaiseNcr(cert, options);
    results.push({ certificate_id: cert.id, ...r });
  }
  return results;
}
