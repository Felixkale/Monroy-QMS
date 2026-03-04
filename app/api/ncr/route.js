import { supabaseServer } from "../../../lib/supabaseServer";

function makeNcrNumber() {
  const yyyy = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `NCR-${yyyy}-${rand}`;
}

export async function GET() {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.from("ncrs").select("*").order("created_at", { ascending: false });
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

    const payload = {
      client_id: body.client_id,
      site_id: body.site_id,
      asset_id: body.asset_id,
      title: body.title,
      description: body.description,
      severity: body.severity,
      status: "open",
      ncr_number: makeNcrNumber()
    };

    const { data, error } = await sb.from("ncrs").insert(payload).select("*").single();
    if (error) throw new Error(error.message);

    return Response.json(data);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
