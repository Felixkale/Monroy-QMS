// src/app/api/certificates/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Determine certificate type from equipment type string
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

    // ── 2. Resolve asset — search by serial, asset_tag, OR name+client ────
    let assetId = body.asset_id || null;

    if (!assetId) {
      // Try serial number first (most reliable)
      if (body.serial_number) {
        const { data: bySerial } = await supabase
          .from("assets")
          .select("id")
          .ilike("serial_number", body.serial_number.trim())
          .maybeSingle();
        assetId = bySerial?.id || null;
      }

      // Try asset_tag
      if (!assetId && body.asset_tag) {
        const { data: byTag } = await supabase
          .from("assets")
          .select("id")
          .ilike("asset_tag", body.asset_tag.trim())
          .maybeSingle();
        assetId = byTag?.id || null;
      }

      // Try name + client match (avoid duplicates for same equipment)
      if (!assetId && (body.asset_name || body.equipment_description) && clientId) {
        const nameToMatch = (body.asset_name || body.equipment_description).trim();
        const { data: byName } = await supabase
          .from("assets")
          .select("id")
          .ilike("asset_name", nameToMatch)
          .eq("client_id", clientId)
          .maybeSingle();
        assetId = byName?.id || null;
      }
    }

    // ── 3. Create asset only if truly not found ────────────────────────────
    if (!assetId && (body.asset_name || body.equipment_description)) {
      const assetTag =
        body.asset_tag ||
        `IMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const { data: newAsset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          asset_tag:    assetTag,
          asset_name:   body.asset_name || body.equipment_description || "Imported Equipment",
          asset_type:   equipType || null,
          serial_number: body.serial_number || null,
          manufacturer: body.manufacturer  || null,
          model:        body.model         || null,
          year_built:   body.year_built    || null,
          location:     body.location      || null,
          client_id:    clientId           || null,
          status:       "active",
        })
        .select("id")
        .single();

      if (!assetErr && newAsset) {
        assetId = newAsset.id;
      }
    }

    // ── 4. Insert certificate ──────────────────────────────────────────────
    const certType = resolveCertType(equipType);

    const { data: cert, error: certErr } = await supabase
      .from("certificates")
      .insert({
        certificate_number:    body.certificate_number    || null,
        inspection_number:     body.inspection_number     || null,
        certificate_type:      certType,
        result:                body.result                || "UNKNOWN",
        equipment_status:      body.result                || "UNKNOWN",
        issue_date:            body.issue_date            || body.inspection_date || null,
        inspection_date:       body.inspection_date       || null,
        expiry_date:           body.expiry_date           || null,
        next_inspection_date:  body.next_inspection_due   || null,
        next_inspection_due:   body.next_inspection_due   || null,
        asset_id:              assetId                    || null,
        client_id:             clientId                   || null,
        client_name:           body.client_name           || null,
        equipment_type:        equipType                  || null,
        equipment_description: body.equipment_description || null,
        asset_name:            body.asset_name            || body.equipment_description || null,
        manufacturer:          body.manufacturer          || null,
        model:                 body.model                 || null,
        serial_number:         body.serial_number         || null,
        year_built:            body.year_built            || null,
        swl:                   body.swl                   || null,
        working_pressure:      body.working_pressure      || null,
        design_pressure:       body.design_pressure       || null,
        test_pressure:         body.test_pressure         || null,
        pressure_unit:         body.pressure_unit         || null,
        capacity_volume:       body.capacity_volume       || null,
        material:              body.material              || null,
        standard_code:         body.standard_code         || null,
        location:              body.location              || null,
        inspector_name:        body.inspector_name        || null,
        inspection_body:       body.inspection_body       || null,
        defects_found:         body.defects_found         || null,
        recommendations:       body.recommendations       || null,
        comments:              body.comments              || null,
        remarks:               body.comments              || null,
        nameplate_data:        body.nameplate_data        || null,
        raw_text_summary:      body.raw_text_summary      || null,
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

    return NextResponse.json({ id: cert.id, certificate_number: body.certificate_number, certificate_type: certType });
  } catch (err) {
    console.error("API /certificates error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
