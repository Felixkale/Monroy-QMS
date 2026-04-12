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
    const { clientName, inspectionDate } = await req.json();

    let query = supabase
      .from("certificates")
      .select(
        "id, certificate_number, client_name, " +
        "equipment_type, equipment_description, " +
        "inspection_date, issue_date, expiry_date, " +
        "pdf_url, status"
      )
      .order("certificate_number", { ascending: true })
      .limit(2000);

    if (clientName)     query = query.eq("client_name", clientName);
    // Exact match — only this specific inspection date
    if (inspectionDate) query = query.eq("inspection_date", inspectionDate);

    const { data: certs, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

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

        const safeDate = cert.inspection_date
          ? cert.inspection_date.replace(/-/g, "")
          : cert.issue_date
          ? cert.issue_date.replace(/-/g, "")
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

    const dateLabel = inspectionDate ? `_${inspectionDate}` : "";
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
