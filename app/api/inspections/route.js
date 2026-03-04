import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET() {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.from("inspections").select("*").order("inspected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Response.json(data);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sb = supabaseServer();
    const body = await req.json();

    const insPayload = {
      client_id: body.client_id,
      site_id: body.site_id,
      asset_id: body.asset_id,
      inspection_type: body.inspection_type,
      inspector_id: body.inspector_id,
      overall_result: body.overall_result,
      summary: body.summary,
      status: "submitted"
    };

    const { data: inspection, error: insErr } = await sb
      .from("inspections")
      .insert(insPayload)
      .select("*")
      .single();

    if (insErr) throw new Error(insErr.message);

    const measurements = Array.isArray(body.measurements) ? body.measurements : [];
    if (measurements.length > 0) {
      const payload = measurements.map((m) => ({
        inspection_id: inspection.id,
        measurement_type: m.measurement_type,
        point_code: m.point_code,
        value: m.value,
        unit: m.unit || "mm"
      }));

      const { error: mErr } = await sb.from("inspection_measurements").insert(payload);
      if (mErr) throw new Error(mErr.message);
    }

    return Response.json({ inspection_id: inspection.id });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
