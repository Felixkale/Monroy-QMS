// src/app/api/certificates/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Robust date normalizer ──────────────────────────────────────────────────
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-" || s.toLowerCase() === "null") return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/").map(Number);
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  if (/^\d{1,2}\/\d{4}$/.test(s)) {
    const [m, y] = s.split("/").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  }

  if (/^\d{1,2}\/\d{2}$/.test(s)) {
    const [m, y] = s.split("/").map(Number);
    const fullYear = 2000 + y;
    const lastDay = new Date(fullYear, m, 0).getDate();
    return `${fullYear}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
  }

  if (/^\d{4}$/.test(s)) return `${s}-01-01`;

  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const monthMatch = s.toLowerCase().match(/([a-z]+)\s*,?\s*(\d{4})/);
  if (monthMatch) {
    const mIdx = monthNames.indexOf(monthMatch[1]);
    if (mIdx >= 0) {
      const y = parseInt(monthMatch[2]);
      const lastDay = new Date(y, mIdx + 1, 0).getDate();
      return `${y}-${String(mIdx+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
    }
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);

  return null;
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function resolveCertType(equipType) {
  if (!equipType) return "Certificate of Inspection";
  const t = equipType.toLowerCase();
  const isLifting  = /lift|hoist|crane|sling|chain|shackle|hook|swivel|beam|spreader|harness|lanyard|rope|rigging|winch|pulley|block|tackle|eyebolt|ring|clamp|grab|magnet|vacuum|below.the.hook|btl|wll|swl/i.test(t);
  const isPressure = /pressure|vessel|boiler|autoclave|receiver|accumulator|compressor|hydraulic|tank|cylinder|drum|pipeline|heat.exchanger|separator|filter.vessel/i.test(t);
  if (isLifting)  return "Load Test Certificate";
  if (isPressure) return "Pressure Test Certificate";
  return "Certificate of Inspection";
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const equipType = body.equipment_type || body.asset_type || null;

    // ── 1. Resolve client ──────────────────────────────────────────────────
    let clientId = body.client_id || null;
    if (!clientId && body.client_name) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .ilike("company_name", body.client_name.trim())
        .maybeSingle();
      clientId = existingClient?.id || null;
    }

    // ── 2. Resolve asset (equipment_id in certificates table) ─────────────
    let equipmentId = body.equipment_id || null;

    if (!equipmentId) {
      if (body.serial_number) {
        const { data: bySerial } = await supabase
          .from("assets")
          .select("id")
          .ilike("serial_number", body.serial_number.trim())
          .maybeSingle();
        equipmentId = bySerial?.id || null;
      }

      if (!equipmentId && body.asset_tag) {
        const { data: byTag } = await supabase
          .from("assets")
          .select("id")
          .ilike("asset_tag", body.asset_tag.trim())
          .maybeSingle();
        equipmentId = byTag?.id || null;
      }

      if (!equipmentId && (body.asset_name || body.equipment_description) && clientId) {
        const nameToMatch = (body.asset_name || body.equipment_description).trim();
        const { data: byName } = await supabase
          .from("assets")
          .select("id")
          .ilike("asset_name", nameToMatch)
          .eq("client_id", clientId)
          .maybeSingle();
        equipmentId = byName?.id || null;
      }
    }

    // ── 3. Create asset only if truly not found ────────────────────────────
    if (!equipmentId && (body.asset_name || body.equipment_description)) {
      const assetTag =
        body.asset_tag ||
        `IMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const { data: newAsset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          asset_tag:     assetTag,
          asset_name:    body.asset_name || body.equipment_description || "Imported Equipment",
          asset_type:    equipType || null,
          serial_number: body.serial_number || null,
          manufacturer:  body.manufacturer  || null,
          model:         body.model         || null,
          year_built:    body.year_built    || null,
          location:      body.location      || null,
          client_id:     clientId           || null,
          status:        "active",
        })
        .select("id")
        .single();

      if (!assetErr && newAsset) {
        equipmentId = newAsset.id;
      }
    }

    // ── 4. Insert certificate ──────────────────────────────────────────────
    // Only columns that actually exist in the certificates table.
    // REMOVED: equipment_status, asset_id, remarks, next_inspection_date
    const certType = resolveCertType(equipType);

    const { data: cert, error: certErr } = await supabase
      .from("certificates")
      .insert({
        certificate_number:    body.certificate_number    || null,
        inspection_number:     body.inspection_number     || null,
        certificate_type:      certType,
        result:                body.result                || "UNKNOWN",
        // Dates
        issue_date:            normalizeDate(body.issue_date || body.inspection_date) || null,
        inspection_date:       normalizeDate(body.inspection_date) || null,
        expiry_date:           normalizeDate(body.expiry_date) || null,
        next_inspection_due:   normalizeDate(body.next_inspection_due) || null,
        // FKs — use the correct column names from the schema
        equipment_id:          equipmentId                || null,
        client_id:             clientId                   || null,
        // Descriptive fields
        client_name:           body.client_name           || null,
        equipment_type:        equipType                  || null,
        equipment_description: body.equipment_description || null,
        asset_name:            body.asset_name            || body.equipment_description || null,
        asset_type:            body.asset_type            || null,
        manufacturer:          body.manufacturer          || null,
        model:                 body.model                 || null,
        serial_number:         body.serial_number         || null,
        fleet_number:          body.fleet_number          || null,
        registration_number:   body.registration_number   || null,
        year_built:            body.year_built            || null,
        country_of_origin:     body.country_of_origin     || null,
        asset_tag:             body.asset_tag             || null,
        lanyard_serial_no:     body.lanyard_serial_no     || null,
        swl:                   body.swl                   || null,
        working_pressure:      body.working_pressure      || null,
        design_pressure:       body.design_pressure       || null,
        test_pressure:         body.test_pressure         || null,
        pressure_unit:         body.pressure_unit         || null,
        capacity_volume:       body.capacity_volume       || null,
        material:              body.material              || null,
        standard_code:         body.standard_code         || null,
        location:              body.location              || null,
        site_name:             body.site_name             || null,
        inspector_name:        body.inspector_name        || null,
        inspector_id:          body.inspector_id          || null,
        inspection_body:       body.inspection_body       || null,
        defects_found:         body.defects_found         || null,
        recommendations:       body.recommendations       || null,
        comments:              body.comments              || null,
        // comments maps to both `comments` and `notes` — no `remarks` column exists
        notes:                 body.notes || body.comments || null,
        nameplate_data:        body.nameplate_data        || null,
        raw_text_summary:      body.raw_text_summary      || null,
        ai_confidence:         body.ai_confidence         || null,
        status:                "active",
      })
      .select("id")
      .single();

    if (certErr) {
      console.error("Certificate insert error:", certErr);
      return NextResponse.json(
        { error: certErr.message || "Failed to save certificate." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: cert.id,
      certificate_number: body.certificate_number,
      certificate_type: certType,
    });
  } catch (err) {
    console.error("API /certificates error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
