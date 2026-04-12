// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Your deployed app URL — set this in Render environment variables
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

export async function POST(req) {
  let browser = null;

  try {
    const { clientName, inspectionDate } = await req.json();

    // ── 1. Fetch certificates ──────────────────────────────────────────────
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

    // ── 2. Launch Puppeteer ────────────────────────────────────────────────
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });

    const zip = new JSZip();
    let exported = 0;

    // ── 3. Generate PDF per certificate ───────────────────────────────────
    for (const cert of certs) {
      try {
        const page = await browser.newPage();

        // Set A4 viewport
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        // Open the print page — same page your "Save PDF" button opens
        const printUrl = `${APP_URL}/certificates/print/${encodeURIComponent(String(cert.id))}`;

        await page.goto(printUrl, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Wait for CertificateSheet to finish rendering
        // The print page has .pt-content which contains the cert
        await page.waitForSelector(".pt-content", { timeout: 15000 }).catch(() => {});

        // Extra wait for fonts & images
        await new Promise(r => setTimeout(r, 2000));

        // Hide the toolbar (only show the certificate)
        await page.evaluate(() => {
          const toolbar = document.querySelector(".pt-toolbar");
          if (toolbar) toolbar.style.display = "none";
          // Also hide the print hint text at bottom
          document.querySelectorAll("p").forEach(p => {
            if (p.textContent.includes("Ctrl+P")) p.style.display = "none";
          });
        });

        // Generate PDF — A4, no margins, with backgrounds
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          preferCSSPageSize: true,
        });

        await page.close();

        // ── Build filename ─────────────────────────────────────────────────
        const clientFolder = (cert.client_name || "Unknown")
          .replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();

        const safeDate = (cert.inspection_date || cert.issue_date || "NoDate")
          .replace(/-/g, "");

        const safeCertNum = (cert.certificate_number || cert.id)
          .toString().replace(/[^a-zA-Z0-9_-]/g, "_");

        zip.file(`${clientFolder}/${safeDate}_${safeCertNum}.pdf`, pdfBuffer);
        exported++;

      } catch (e) {
        console.error(`Skipped cert ${cert.certificate_number || cert.id}:`, e.message);
      }
    }

    if (exported === 0)
      return NextResponse.json(
        { error: "Failed to generate any PDFs. Make sure NEXT_PUBLIC_APP_URL is set correctly in Render environment variables." },
        { status: 500 }
      );

    // ── 4. Build ZIP ───────────────────────────────────────────────────────
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const clientLabel = clientName ? clientName.replace(/\s+/g, "_") : "AllClients";
    const dateLabel   = inspectionDate ? `_${inspectionDate}` : "";
    const zipName     = `Certificates_${clientLabel}${dateLabel}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type":            "application/zip",
        "Content-Disposition":     `attachment; filename="${zipName}"`,
        "Content-Length":          zipBuffer.length.toString(),
        "X-Certificates-Exported": exported.toString(),
      },
    });

  } catch (err) {
    console.error("Bulk export error:", err);
    return NextResponse.json(
      { error: "Export failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
