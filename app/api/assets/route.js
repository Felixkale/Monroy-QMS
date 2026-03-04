import { dbSelect, dbInsert } from "../../../lib/db";

export async function GET() {
  try {
    const rows = await dbSelect("assets", "*");
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = {
      client_id: body.client_id,
      site_id: body.site_id,
      asset_tag: body.asset_tag,
      asset_name: body.asset_name
    };
    const row = await dbInsert("assets", payload);
    return Response.json(row);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
