// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { clientName, dateFrom, dateTo } = await req.json();

    // Build query using only columns that actually exist
    let query = supabase
      .from("certificates")
      .select(
        "id, certificate_number, client_name, " +
        "equipment_type, equipment_description, " +
        "inspection_date, issue_date, expiry_date, " +
        "pdf_url, status"
      )
      .order("issue_date", { ascending: false, nullsFirst: false })
      .limit(2000);

    if (clientName) query = query.eq("client_name", clientName);

    // Filter dates at DB level — issue_date is a proper date column
    if (dateFrom) query = query.gte("issue_date", dateFrom);
    if (dateTo)   query = query.lte("issue_date", dateTo);

    const { data: certs, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

    // Build ZIP — one folder per client
    const zip = new JSZip();
    let filesAdded = 0;

    for (const cert of certs) {
      if (!cert.pdf_url) continue;

      try {
        let fileBuffer;

        if (cert.pdf_url.startsWith("http")) {
          const res = await fetch(cert.pdf_url);
          if (!res.ok) continue;
          fileBuffer = await res.arrayBuffer();
        } else {
          const { data, error: dlError } = await supabase.storage
            .from("certificates")
            .download(cert.pdf_url);
          if (dlError || !data) continue;
          fileBuffer = await data.arrayBuffer();
        }

        const clientFolder = (cert.client_name || "Unknown")
          .replace(/[^a-zA-Z0-9_\- ]/g, "_")
          .trim();

        const safeDate = cert.issue_date
          ? cert.issue_date.replace(/-/g, "")
          : cert.inspection_date
          ? cert.inspection_date.replace(/-/g, "")
          : "NoDate";

        const safeCertNum = (cert.certificate_number || cert.id)
          .replace(/[^a-zA-Z0-9_-]/g, "_");

        const filename = `${clientFolder}/${safeDate}_${safeCertNum}.pdf`;
        zip.file(filename, fileBuffer);
        filesAdded++;
      } catch {
        // skip individual failures silently
      }
    }

    if (filesAdded === 0)
      return NextResponse.json(
        { error: "Certificates found but none have a PDF file attached." },
        { status: 404 }
      );

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const clientLabel = clientName
      ? clientName.replace(/\s+/g, "_")
      : "AllClients";

    const dateLabel =
      dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` :
      dateFrom           ? `_from_${dateFrom}` :
      dateTo             ? `_to_${dateTo}` : "";

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
