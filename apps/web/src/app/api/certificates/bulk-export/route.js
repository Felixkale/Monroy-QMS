import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { clientId, dateFrom, dateTo } = await req.json();

    // Build query
    let query = supabase
      .from("certificates")
      .select(
        `
        id,
        certificate_number,
        inspection_date,
        expiry_date,
        status,
        file_url,
        client_id,
        clients ( name ),
        equipment_type,
        serial_number
      `
      )
      .order("inspection_date", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);
    if (dateFrom) query = query.gte("inspection_date", dateFrom);
    if (dateTo) query = query.lte("inspection_date", dateTo);

    const { data: certs, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates found for the selected filters." }, { status: 404 });

    // Download all PDFs from Supabase storage and zip them
    const { PassThrough } = await import("stream");
    const passThrough = new PassThrough();

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(passThrough);

    for (const cert of certs) {
      if (!cert.file_url) continue;

      // Support both full URLs and storage paths
      let fileBuffer;
      try {
        if (cert.file_url.startsWith("http")) {
          const res = await fetch(cert.file_url);
          if (!res.ok) continue;
          const arrayBuffer = await res.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        } else {
          const { data, error: dlError } = await supabase.storage
            .from("certificates")
            .download(cert.file_url);
          if (dlError || !data) continue;
          const ab = await data.arrayBuffer();
          fileBuffer = Buffer.from(ab);
        }

        const clientName = cert.clients?.name || "Unknown_Client";
        const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeDate = cert.inspection_date
          ? cert.inspection_date.replace(/-/g, "")
          : "NoDate";
        const safeCertNum = (cert.certificate_number || cert.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `${safeClient}/${safeDate}_${safeCertNum}.pdf`;

        archive.append(fileBuffer, { name: filename });
      } catch {
        // skip failed downloads silently
      }
    }

    await archive.finalize();

    // Collect stream into buffer
    const chunks = [];
    for await (const chunk of passThrough) {
      chunks.push(chunk);
    }
    const zipBuffer = Buffer.concat(chunks);

    const clientLabel = certs[0]?.clients?.name
      ? certs[0].clients.name.replace(/\s+/g, "_")
      : "AllClients";
    const dateLabel = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : "";
    const zipName = `Certificates_${clientLabel}${dateLabel}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Bulk export error:", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
