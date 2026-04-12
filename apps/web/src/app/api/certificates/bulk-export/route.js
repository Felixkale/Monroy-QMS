// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { clientName, inspectionDate } = await req.json();

    let query = supabase
      .from("certificates")
      .select("id, certificate_number, client_name, inspection_date, issue_date, equipment_type")
      .order("certificate_number", { ascending: true })
      .limit(500);

    if (clientName)     query = query.eq("client_name", clientName);
    if (inspectionDate) query = query.eq("inspection_date", inspectionDate);

    const { data: certs, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

    return NextResponse.json({ certs });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to fetch certificates." }, { status: 500 });
  }
}
