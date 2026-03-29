// src/app/api/certificates/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Try to find existing client by name
    let clientId = null;
    if (body.client_name) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .ilike("company_name", body.client_name.trim())
        .maybeSingle();
      clientId = existingClient?.id || null;
    }

    // Try to find existing asset by serial number or description
    let assetId = null;
    if (body.serial_number || body.asset_tag) {
      const { data: existingAsset } = await supabase
        .from("assets")
        .select("id")
        .or(
          [
            body.serial_number ? `serial_number.ilike.${body.serial_number}` : null,
            body.asset_tag ? `asset_tag.ilike.${body.asset_tag}` : null,
          ]
            .filter(Boolean)
            .join(",")
        )
        .maybeSingle();
      assetId = existingAsset?.id || null;
    }

    // If no asset found, create one
    if (!assetId && (body.asset_name || body.equipment_description)) {
      const assetTag =
        body.asset_tag ||
        `IMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      const { data: newAsset, error: assetErr } = await supabase
        .from("assets")
        .insert({
          asset_tag: assetTag,
          asset_name: body.asset_name || body.equipment_description || "Imported Equipment",
          asset_type: body.asset_type || body.equipment_type || null,
          serial_number: body.serial_number || null,
          manufacturer: body.manufacturer || null,
          model: body.model || null,
          year_built: body.year_built || null,
          location: body.location || null,
          client_id: clientId || null,
          status: "active",
        })
        .select("id")
        .single();

      if (!assetErr && newAsset) {
        assetId = newAsset.id;
      }
    }

    // Insert certificate
    const { data: cert, error: certErr } = await supabase
      .from("certificates")
      .insert({
        certificate_number: body.certificate_number || null,
        inspection_number:  body.inspection_number  || null,
        result:             body.result             || "UNKNOWN",
        equipment_status:   body.result             || "UNKNOWN",
        issue_date:         body.issue_date         || body.inspection_date || null,
        inspection_date:    body.inspection_date    || null,
        expiry_date:        body.expiry_date        || null,
        next_inspection_date: body.next_inspection_due || null,
        next_inspection_due:  body.next_inspection_due || null,
        asset_id:           assetId  || null,
        client_id:          clientId || null,
        equipment_type:     body.equipment_type     || null,
        equipment_description: body.equipment_description || null,
        manufacturer:       body.manufacturer       || null,
        model:              body.model              || null,
        serial_number:      body.serial_number      || null,
        year_built:         body.year_built         || null,
        swl:                body.swl                || null,
        working_pressure:   body.working_pressure   || null,
        design_pressure:    body.design_pressure    || null,
        test_pressure:      body.test_pressure      || null,
        pressure_unit:      body.pressure_unit      || null,
        capacity_volume:    body.capacity_volume    || null,
        material:           body.material           || null,
        standard_code:      body.standard_code      || null,
        location:           body.location           || null,
        inspector_name:     body.inspector_name     || null,
        inspection_body:    body.inspection_body    || null,
        defects_found:      body.defects_found      || null,
        recommendations:    body.recommendations    || null,
        comments:           body.comments           || null,
        remarks:            body.comments           || null,
        nameplate_data:     body.nameplate_data     || null,
        raw_text_summary:   body.raw_text_summary   || null,
        status:             "active",
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

    return NextResponse.json({ id: cert.id, certificate_number: body.certificate_number });
  } catch (err) {
    console.error("API /certificates error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
