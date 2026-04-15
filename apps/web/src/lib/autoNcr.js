// src/lib/autoNcr.js
// ─────────────────────────────────────────────────────────────────────────────
// Auto-generates NCR + CAPA whenever a certificate has a non-PASS result.
// Call autoRaiseNcr(certificate) anywhere — it is idempotent (won't duplicate).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabaseClient";

const INSPECTOR = "Moemedi Masupe";

// Results that trigger auto NCR creation
const NON_PASS_RESULTS = ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"];

function normalizeResult(v) {
  return String(v || "").toUpperCase().replace(/\s+/g, "_");
}

function isNonPass(result) {
  return NON_PASS_RESULTS.includes(normalizeResult(result));
}

function severityFromResult(result) {
  const r = normalizeResult(result);
  if (r === "OUT_OF_SERVICE") return "critical";
  if (r === "FAIL")           return "major";
  if (r === "REPAIR_REQUIRED")return "major";
  return "minor";
}

function priorityFromResult(result) {
  const r = normalizeResult(result);
  if (r === "OUT_OF_SERVICE") return "critical";
  if (r === "FAIL")           return "high";
  if (r === "REPAIR_REQUIRED")return "medium";
  return "low";
}

function dueDateFromSeverity(severity) {
  const d = new Date();
  const days = severity === "critical" ? 7 : severity === "major" ? 14 : 30;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function resultLabel(v) {
  const x = normalizeResult(v);
  if (x === "FAIL")            return "Fail";
  if (x === "REPAIR_REQUIRED") return "Repair Required";
  if (x === "OUT_OF_SERVICE")  return "Out of Service";
  if (x === "CONDITIONAL")     return "Conditional";
  return x;
}

function generateNcrNumber(certNumber) {
  const n   = new Date();
  const pad = v => String(v).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  const base = certNumber
    ? certNumber.replace(/^CERT-/, "").replace(/[^A-Z0-9]/gi, "")
    : `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}`;
  return `NCR-${base}-${rand}`;
}

function generateCapaNumber(ncrNumber) {
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `CAPA-${ncrNumber.replace(/^NCR-/, "")}-${rand}`;
}

/**
 * Try to resolve an asset_id from a certificate.
 * Checks:
 *   1. cert.asset_id if already set
 *   2. assets table by serial_number
 *   3. assets table by asset_tag (matches fleet_number or registration_number)
 *   4. assets table by asset_name ILIKE equipment_description
 */
async function resolveAssetId(cert) {
  if (cert.asset_id) return cert.asset_id;

  const tries = [];

  if (cert.serial_number) {
    tries.push(
      supabase.from("assets").select("id")
        .eq("serial_number", cert.serial_number).limit(1)
    );
  }
  if (cert.fleet_number) {
    tries.push(
      supabase.from("assets").select("id")
        .eq("asset_tag", cert.fleet_number).limit(1)
    );
  }
  if (cert.registration_number) {
    tries.push(
      supabase.from("assets").select("id")
        .eq("asset_tag", cert.registration_number).limit(1)
    );
  }
  if (cert.equipment_description || cert.asset_name) {
    tries.push(
      supabase.from("assets").select("id")
        .ilike("asset_name", `%${cert.equipment_description || cert.asset_name}%`)
        .limit(1)
    );
  }

  for (const q of tries) {
    const { data } = await q;
    if (data?.[0]?.id) return data[0].id;
  }

  return null;
}

/**
 * Main entry point.
 *
 * @param {object} certificate  — full certificate row from Supabase
 * @param {object} [options]
 * @param {boolean} [options.createCapa=true]   — also auto-create a CAPA
 * @param {boolean} [options.force=false]        — create even if NCR already exists
 * @returns {{ ncr: object|null, capa: object|null, skipped: boolean, error: string|null }}
 */
export async function autoRaiseNcr(certificate, { createCapa = true, force = false } = {}) {
  if (!certificate) return { ncr: null, capa: null, skipped: true, error: null };

  const result = normalizeResult(certificate.result);

  // Only act on non-pass results
  if (!isNonPass(result)) {
    return { ncr: null, capa: null, skipped: true, error: null };
  }

  // ── Idempotency check — don't create duplicate NCRs for the same cert ──
  if (!force) {
    const { data: existing } = await supabase
      .from("ncrs")
      .select("id, capa:capas(id)")
      .eq("certificate_id", certificate.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const capaId = existing.capa?.id || null;
      return {
        ncr:     { id: existing.id },
        capa:    capaId ? { id: capaId } : null,
        skipped: true,
        error:   null,
      };
    }
  }

  const severity  = severityFromResult(result);
  const priority  = priorityFromResult(result);
  const dueDate   = dueDateFromSeverity(severity);
  const ncrNumber = generateNcrNumber(certificate.certificate_number);
  const assetId   = await resolveAssetId(certificate);

  const clientName  = certificate.client_name || certificate.company || "—";
  const equipDesc   = certificate.equipment_description || certificate.asset_name || certificate.asset_tag || "equipment";
  const certNo      = certificate.certificate_number || certificate.id;
  const equipType   = certificate.equipment_type || certificate.asset_type || "";
  const defects     = certificate.defects_found || "";
  const inspDate    = certificate.inspection_date || certificate.issue_date || "";
  const expiryDate  = certificate.expiry_date || "";
  const serialNo    = certificate.serial_number || "";
  const fleetNo     = certificate.fleet_number || "";

  const description = [
    `${resultLabel(result)} result detected on certificate ${certNo}.`,
    equipDesc !== "equipment" ? `Equipment: ${equipDesc}${equipType ? ` (${equipType})` : ""}.` : "",
    defects ? `Defects noted: ${defects.slice(0, 200)}${defects.length > 200 ? "…" : ""}` : "",
  ].filter(Boolean).join(" ");

  const details = [
    "═══ AUTO-GENERATED NCR ═══",
    `NCR raised automatically from certificate result.`,
    "",
    `Certificate No.:   ${certNo}`,
    `Client:            ${clientName}`,
    `Equipment:         ${equipDesc}`,
    equipType  ? `Type:              ${equipType}`   : "",
    serialNo   ? `Serial No.:        ${serialNo}`    : "",
    fleetNo    ? `Fleet No.:         ${fleetNo}`     : "",
    `Result:            ${resultLabel(result)}`,
    inspDate   ? `Inspection Date:   ${inspDate}`    : "",
    expiryDate ? `Expiry Date:       ${expiryDate}`  : "",
    defects    ? `\nDefects Found:\n${defects}`       : "",
    "",
    "═══ ACTIONS REQUIRED ═══",
    severity === "critical" ? "⚠ CRITICAL — Equipment must be taken out of service immediately." : "",
    severity === "major"    ? "⚠ MAJOR — Equipment must be repaired before next use." : "",
    `Inspector: ${INSPECTOR}`,
  ].filter(s => s !== undefined).join("\n").trim();

  // ── Create NCR ────────────────────────────────────────────────────────────
  const ncrPayload = {
    ncr_number:     ncrNumber,
    title:          `${resultLabel(result)} — ${equipDesc.slice(0, 80)}`,
    severity,
    status:         "open",
    description,
    details,
    due_date:       dueDate,
    raised_by:      INSPECTOR,
    certificate_id: certificate.id,
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

  // ── Create CAPA ───────────────────────────────────────────────────────────
  const capaNumber = generateCapaNumber(ncrNumber);

  const capaPayload = {
    capa_number:          capaNumber,
    title:                `CAPA — ${ncrData.ncr_number} — ${equipDesc.slice(0, 60)}`,
    type:                 "corrective",
    priority,
    stage:                "identification",
    status:               "open",
    raised_by:            INSPECTOR,
    target_date:          dueDate,
    problem_description:  description,
    immediate_action:     severity === "critical"
      ? "Equipment removed from service pending inspection."
      : "Repair required before next use. Monitor until resolved.",
    ncr_id:               ncrData.id,
    ...(assetId ? { asset_id: assetId } : {}),
  };

  const { data: capaData, error: capaErr } = await supabase
    .from("capas")
    .insert(capaPayload)
    .select("id, capa_number")
    .single();

  if (capaErr) {
    console.warn("[autoRaiseNcr] CAPA insert failed:", capaErr.message);
    // NCR was still created — don't fail entirely
    return { ncr: ncrData, capa: null, skipped: false, error: capaErr.message };
  }

  return { ncr: ncrData, capa: capaData, skipped: false, error: null };
}

/**
 * Batch version — pass an array of certificates.
 * Returns array of results in the same order.
 */
export async function autoRaiseNcrBatch(certificates, options = {}) {
  const results = [];
  for (const cert of certificates) {
    const r = await autoRaiseNcr(cert, options);
    results.push({ certificate_id: cert.id, ...r });
  }
  return results;
}
