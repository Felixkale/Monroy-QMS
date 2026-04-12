import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function resolveIssueDate(r) {
  return r.issue_date || r.issued_at || r.extracted_data?.issue_date || null;
}

export async function POST(req) {
  try {
    const { clientName, dateFrom, dateTo } = await req.json();

    let query = supabase
      .from("certificates")
      .select(`
        id, certificate_number,
        issue_date, issued_at, extracted_data,
        expiry_date, valid_to,
        file_url, status,
        client_name, company,
        equipment_type, equipment_description,
        clients(company_name),
        assets(clients(company_name))
      `)
      .order("issue_date", { ascending: false })
      .limit(2000);

    if (clientName) query = query.eq("client_name", clientName);

    const { data: rows, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "No certificates found." }, { status: 404 });

    // Apply date filter server-side (same logic as page)
    let certs = rows;
    if (dateFrom) {
      const from = new Date(dateFrom);
      certs = certs.filter(r => {
        const d = resolveIssueDate(r);
        return d && new Date(d) >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      certs = certs.filter(r => {
        const d = resolveIssueDate(r);
        return d && new Date(d) <= to;
      });
    }

    if (certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

    const zip = new JSZip();

    for (const cert of certs) {
      if (!cert.file_url) continue;
      try {
        let fileBuffer;
        if (cert.file_url.startsWith("http")) {
          const res = await fetch(cert.file_url);
          if (!res.ok) continue;
          fileBuffer = await res.arrayBuffer();
        } else {
          const { data, error: dlError } = await supabase.storage
            .from("certificates")
            .download(cert.file_url);
          if (dlError || !data) continue;
          fileBuffer = await data.arrayBuffer();
        }

        const resolvedClient = (
          cert.client_name || cert.company ||
          cert.clients?.company_name ||
          cert.assets?.clients?.company_name || "Unknown"
        ).replace(/[^a-zA-Z0-9_-]/g, "_");

        const issueDate = resolveIssueDate(cert);
        const safeDate = issueDate ? issueDate.slice(0, 10).replace(/-/g, "") : "NoDate";
        const safeCertNum = (cert.certificate_number || cert.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `${resolvedClient}/${safeDate}_${safeCertNum}.pdf`;

        zip.file(filename, fileBuffer);
      } catch {
        // skip individual failures silently
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const clientLabel = clientName
      ? clientName.replace(/\s+/g, "_")
      : "AllClients";
    const dateLabel = dateFrom && dateTo
      ? `_${dateFrom}_to_${dateTo}`
      : dateFrom
      ? `_from_${dateFrom}`
      : dateTo
      ? `_to_${dateTo}`
      : "";
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
