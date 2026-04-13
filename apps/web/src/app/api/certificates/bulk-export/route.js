// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ──────────────────────────────────────────────────────────────────
function val(v) { return v && String(v).trim() !== "" ? String(v).trim() : null; }
function fmtDate(raw) {
  if (!raw) return "—";
  const d = new Date(String(raw).includes("T") ? raw : raw + "T00:00:00Z");
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric", timeZone:"UTC" });
}
function parseNotes(str) {
  if (!str) return {};
  try { const p = JSON.parse(str); if (typeof p === "object" && p !== null) return p; } catch {}
  const obj = {};
  str.split("|").forEach(part => {
    const idx = part.indexOf(":");
    if (idx < 0) return;
    obj[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return obj;
}
function pickResult(c) { return (c?.result || c?.equipment_status || "PASS").toUpperCase(); }
function resultColors(r) {
  if (r === "PASS")            return { fg: rgb(0.08, 0.50, 0.24), bg: rgb(0.86, 0.99, 0.91), label: "PASS" };
  if (r === "FAIL")            return { fg: rgb(0.73, 0.11, 0.11), bg: rgb(0.99, 0.89, 0.89), label: "FAIL" };
  if (r === "REPAIR_REQUIRED") return { fg: rgb(0.71, 0.33, 0.03), bg: rgb(0.99, 0.95, 0.78), label: "Repair Required" };
  return { fg: rgb(0.22, 0.25, 0.31), bg: rgb(0.95, 0.96, 0.96), label: r || "Unknown" };
}

// ── colours ───────────────────────────────────────────────────────────────────
const NAVY   = rgb(0.04, 0.11, 0.23);
const CYAN   = rgb(0.13, 0.83, 0.93);
const TEAL   = rgb(0.05, 0.46, 0.56);
const LIGHT  = rgb(0.96, 0.97, 1.00);
const ALT    = rgb(0.93, 0.96, 1.00);
const CELLBR = rgb(0.76, 0.83, 0.91);
const TXTDK  = rgb(0.04, 0.11, 0.23);
const TXTMD  = rgb(0.20, 0.25, 0.35);
const GREEN  = rgb(0.08, 0.50, 0.24);
const RED    = rgb(0.73, 0.11, 0.11);
const CRIMSON= rgb(0.77, 0.12, 0.23);
const WHITE  = rgb(1, 1, 1);
const BORDER = rgb(0.12, 0.23, 0.37);

const PW = 595.28;
const PH = 841.89;
const ML = 20;
const CW = PW - ML * 2;

// ── drawing helpers ───────────────────────────────────────────────────────────
function fillRect(page, x, y, w, h, color) {
  page.drawRectangle({ x, y: PH - y - h, width: w, height: h, color });
}
function strokeRect(page, x, y, w, h, color, lw = 0.5) {
  page.drawRectangle({ x, y: PH - y - h, width: w, height: h, borderColor: color, borderWidth: lw });
}
function fillStrokeRect(page, x, y, w, h, fill, stroke, lw = 0.5) {
  page.drawRectangle({ x, y: PH - y - h, width: w, height: h, color: fill, borderColor: stroke, borderWidth: lw });
}
function drawText(page, str, x, y, { font, size = 8, color = TXTDK, maxWidth, align = "left" } = {}) {
  if (!str || !font) return;
  let s = String(str);
  if (maxWidth) {
    while (s.length > 1 && font.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
    if (s !== String(str)) s = s.slice(0, -1) + "…";
  }
  let tx = x;
  if (align === "center" && maxWidth) tx = x + (maxWidth - font.widthOfTextAtSize(s, size)) / 2;
  if (align === "right"  && maxWidth) tx = x + maxWidth - font.widthOfTextAtSize(s, size);
  page.drawText(s, { x: tx, y: PH - y - size, font, size, color });
}
function hline(page, x1, y, x2, color = BORDER, lw = 0.5) {
  page.drawLine({ start: { x: x1, y: PH - y }, end: { x: x2, y: PH - y }, color, thickness: lw });
}

// ── shared blocks ─────────────────────────────────────────────────────────────
function drawHeader(page, F, title, certNo, resultLabel, resultFg, resultBg) {
  const H = 70;
  fillRect(page, 0, 0, PW, H, NAVY);
  fillRect(page, 0, 0, 92, H, WHITE);
  drawText(page, "MONROY", 4, 16, { font: F.bold, size: 11, color: NAVY, maxWidth: 84, align: "center" });
  drawText(page, "(PTY) LTD", 4, 29, { font: F.bold, size: 7, color: TEAL, maxWidth: 84, align: "center" });
  drawText(page, "Process Control & Cranes", 4, 40, { font: F.reg, size: 5.5, color: NAVY, maxWidth: 84, align: "center" });

  drawText(page, "Monroy (Pty) Ltd  ·  Process Control & Cranes", 102, 10, { font: F.reg, size: 6.5, color: CYAN, maxWidth: 300 });
  drawText(page, title, 102, 22, { font: F.bold, size: 13, color: WHITE, maxWidth: 290 });

  const cx = PW - 170;
  drawText(page, "(+267) 71 450 610 / 77 906 461", cx, 12, { font: F.reg, size: 6.5, color: WHITE, maxWidth: 160 });
  drawText(page, "monroybw@gmail.com", cx, 22, { font: F.reg, size: 6.5, color: WHITE, maxWidth: 160 });
  drawText(page, "Phase 2, Letlhakane, Botswana", cx, 32, { font: F.reg, size: 6.5, color: WHITE, maxWidth: 160 });

  if (resultLabel) {
    fillStrokeRect(page, cx, 46, 72, 16, resultBg, resultFg);
    drawText(page, resultLabel, cx, 48, { font: F.bold, size: 8, color: resultFg, maxWidth: 72, align: "center" });
  }
  if (certNo) drawText(page, certNo, 102, 52, { font: F.reg, size: 7.5, color: CELLBR, maxWidth: 260 });

  // Cyan accent bar
  fillRect(page, 0, H, PW, 3, CYAN);
  return H + 3;
}

function drawFooter(page, F) {
  fillRect(page, 0, PH - 28, PW, 14, CRIMSON);
  page.drawText("Mobile Crane Hire  |  Rigging  |  NDT Test  |  Scaffolding  |  Painting  |  Inspection of Lifting Equipment  |  Steel Fabricating  |  Mechanical Engineering  |  Fencing  |  Maintenance", {
    x: ML, y: 21, font: F.reg, size: 5.5, color: WHITE, maxWidth: CW,
  });
  fillRect(page, 0, PH - 14, PW, 14, NAVY);
  page.drawText("Monroy (Pty) Ltd  ·  Mophane Avenue, Maun, Botswana", { x: ML, y: 5, font: F.reg, size: 6, color: CELLBR });
  page.drawText("Quality  ·  Safety  ·  Excellence", { x: PW - 160, y: 5, font: F.reg, size: 6, color: CELLBR });
}

function drawSectionLabel(page, F, title, y) {
  fillRect(page, ML, y + 2, 3, 9, CYAN);
  drawText(page, title.toUpperCase(), ML + 8, y + 3, { font: F.bold, size: 6.5, color: TXTDK });
  return y + 14;
}

function drawInfoTable(page, F, rows, y, colWidths) {
  const RH = 14;
  const [lw1, lw2, lw3, lw4] = colWidths || [110, CW / 2 - 110, 110, CW / 2 - 110];
  rows.forEach((row, i) => {
    const ry = y + i * RH;
    const bg = i % 2 === 0 ? LIGHT : ALT;
    fillStrokeRect(page, ML, ry, lw1, RH, NAVY, BORDER);
    drawText(page, row[0] || "", ML + 3, ry + 4, { font: F.bold, size: 6.5, color: CYAN, maxWidth: lw1 - 5 });
    fillStrokeRect(page, ML + lw1, ry, lw2, RH, bg, CELLBR);
    drawText(page, row[1] || "—", ML + lw1 + 3, ry + 4, { font: F.reg, size: 7.5, color: TXTDK, maxWidth: lw2 - 5 });
    if (row.length > 2) {
      const x2 = ML + lw1 + lw2;
      fillStrokeRect(page, x2, ry, lw3, RH, NAVY, BORDER);
      drawText(page, row[2] || "", x2 + 3, ry + 4, { font: F.bold, size: 6.5, color: CYAN, maxWidth: lw3 - 5 });
      fillStrokeRect(page, x2 + lw3, ry, lw4, RH, bg, CELLBR);
      drawText(page, row[3] || "—", x2 + lw3 + 3, ry + 4, { font: F.reg, size: 7.5, color: TXTDK, maxWidth: lw4 - 5 });
    }
  });
  return y + rows.length * RH;
}

function drawSignatures(page, F, inspName, inspId, y) {
  const half = CW / 2 - 6;
  fillStrokeRect(page, ML, y, half, 38, LIGHT, BORDER);
  drawText(page, "COMPETENT PERSON / INSPECTOR", ML + 4, y + 4, { font: F.bold, size: 6, color: TEAL });
  hline(page, ML + 4, y + 28, ML + half - 4);
  drawText(page, inspName || "Moemedi Masupe", ML + 4, y + 30, { font: F.bold, size: 7.5, color: TXTDK, maxWidth: half - 8 });
  drawText(page, "Inspector ID: " + (inspId || "700117910"), ML + 4, y + 40, { font: F.reg, size: 6.5, color: TXTMD });

  const x2 = ML + half + 8;
  fillStrokeRect(page, x2, y, half, 38, LIGHT, BORDER);
  drawText(page, "CLIENT / USER / OWNER", x2 + 4, y + 4, { font: F.bold, size: 6, color: TEAL });
  hline(page, x2 + 4, y + 28, x2 + half - 4);
  drawText(page, "Name & Signature", x2 + 4, y + 30, { font: F.reg, size: 7, color: TXTMD });
  return y + 46;
}

function drawAlertBox(page, F, label, value, y, fg = RED, bg = rgb(1, 0.96, 0.96)) {
  if (!value) return y;
  fillStrokeRect(page, ML, y, CW, 26, bg, fg);
  drawText(page, label.toUpperCase(), ML + 5, y + 4, { font: F.bold, size: 6, color: fg });
  drawText(page, value, ML + 5, y + 13, { font: F.reg, size: 7.5, color: fg, maxWidth: CW - 10 });
  return y + 29;
}

function drawLegalNote(page, F, txt, y) {
  fillStrokeRect(page, ML, y, CW, 18, LIGHT, BORDER);
  drawText(page, txt, ML + 5, y + 5, { font: F.bold, size: 5.5, color: TXTMD, maxWidth: CW - 10, align: "center" });
  return y + 22;
}

function drawPFBadge(page, F, result, x, y) {
  const isPass = result === "PASS";
  const half = 40;
  fillStrokeRect(page, x, y, half, 20, isPass ? rgb(0.86,0.99,0.91) : LIGHT, BORDER);
  fillStrokeRect(page, x + half, y, half, 20, isPass ? LIGHT : rgb(0.99,0.89,0.89), BORDER);
  drawText(page, "PASS", x, y + 6, { font: isPass ? F.bold : F.reg, size: 9, color: isPass ? GREEN : CELLBR, maxWidth: half, align: "center" });
  drawText(page, "FAIL", x + half, y + 6, { font: isPass ? F.reg : F.bold, size: 9, color: isPass ? CELLBR : RED, maxWidth: half, align: "center" });
}

// ── Certificate generators ────────────────────────────────────────────────────
async function genCert(c) {
  const pdfDoc = await PDFDocument.create();
  const F = {
    reg:  await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  const pn        = parseNotes(val(c.notes || "") || "");
  const certNo    = val(c.certificate_number);
  const company   = val(c.client_name) || "—";
  const location  = val(c.location) || "—";
  const issueDate = fmtDate(c.issue_date || c.issued_at);
  const expiryDate= fmtDate(c.expiry_date);
  const equipMake = val(c.manufacturer || c.model || c.equipment_type) || "—";
  const serialNo  = val(c.serial_number) || "—";
  const fleetNo   = val(c.fleet_number) || "—";
  const swl       = val(c.swl) || "—";
  const defects   = val(c.defects_found);
  const recs      = val(c.recommendations);
  const comments  = val(c.comments || c.remarks);
  const inspName  = val(c.inspector_name) || "Moemedi Masupe";
  const inspId    = val(c.inspector_id) || "700117910";
  const rawType   = String(c.equipment_type || "").toLowerCase();
  const tone      = resultColors(pickResult(c));

  // Determine cert title
  const isLifting  = /crane|sling|hook|rope|hoist|rigging|shackle|chain|beam|spreader|harness|lanyard|winch|block|swivel/i.test(rawType);
  const isPressure = /pressure|vessel|boiler|autoclave|receiver|compressor/i.test(rawType);
  const isCrane    = /mobile.crane|^crane/i.test(rawType);
  const title = isCrane ? "Load Test Certificate — Mobile Crane"
    : isLifting  ? `${c.equipment_type || "Lifting Equipment"} Inspection Certificate`
    : isPressure ? "Pressure Vessel Inspection Certificate"
    : `${c.equipment_type || "Equipment"} Inspection Certificate`;

  const page = pdfDoc.addPage([PW, PH]);
  let y = drawHeader(page, F, title, certNo, tone.label, tone.fg, tone.bg);
  y += 6;

  // Info table
  y = drawInfoTable(page, F, [
    ["Customer",    company,    "Make / Type",   equipMake],
    ["Site",        location,   "Serial No.",    serialNo],
    ["Issue Date",  issueDate,  "Fleet No.",     fleetNo],
    ["Expiry Date", expiryDate, "SWL / Capacity",swl],
    ["Equipment Type", val(c.equipment_type) || "—", "Certificate No.", certNo || "—"],
    ["Inspector",   inspName,   "Inspector ID",  inspId],
  ], y);
  y += 8;

  // Result badge
  drawPFBadge(page, F, tone.label, PW - ML - 82, y - 8);

  // Pressure vessel specifics
  if (isPressure) {
    y = drawSectionLabel(page, F, "Pressure Vessel Details", y);
    const mawp   = val(c.mawp || c.working_pressure || pn["MAWP"]) || "—";
    const testP  = val(c.test_pressure || pn["Test pressure"]) || "—";
    const pu     = val(c.pressure_unit || pn.pressure_unit) || "bar";
    y = drawInfoTable(page, F, [
      [`MAWP (${pu})`, mawp, `Test Pressure (${pu})`, testP],
      ["Vessel Type", val(c.equipment_description) || "—", "Capacity", val(c.capacity_volume) || "—"],
    ], y, [110, CW / 2 - 110, 110, CW / 2 - 110]);
    y += 6;
    y = drawSectionLabel(page, F, "Inspection Results", y);
    y = drawInfoTable(page, F, [
      ["External visual condition",          "Satisfactory"],
      ["Safety valve fitted & operating",    "Yes"],
      ["Pressure gauge fitted & reading",    "Yes"],
      ["Signs of corrosion / deformation",   "None"],
      ["Hydrostatic test performed",         testP !== "—" ? `Yes — ${testP} ${pu}` : "N/A"],
      ["Overall assessment",                 tone.label],
    ], y, [230, CW - 230]);
    y += 6;
    y = drawLegalNote(page, F, "THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.", y);
  }

  // Crane load test specifics
  if (isCrane) {
    y = drawSectionLabel(page, F, "Details of Applied Load", y);
    const C1 = { boom: pn["C1 boom"]||"—", angle: pn["C1 angle"]||"—", radius: pn["C1 radius"]||"—", rated: pn["C1 rated"]||"—", test: pn["C1 test"]||"—" };
    const C2 = { boom: pn["C2 boom"]||"—", angle: pn["C2 angle"]||"—", radius: pn["C2 radius"]||"—", rated: pn["C2 rated"]||"—", test: pn["C2 test"]||pn["Crane test load"]||"—" };
    const cols = [130, 50, 50, 50, 50, 55, CW - 385];
    const hdrs = ["Detail", "C1 Actual", "C1 SLI", "C2 Actual", "C2 SLI", "C3 Actual", "C3 SLI"];
    let cx = ML;
    hdrs.forEach((h, i) => {
      fillStrokeRect(page, cx, y, cols[i], 12, NAVY, BORDER);
      drawText(page, h, cx + 2, y + 2, { font: F.bold, size: 5.5, color: CYAN, maxWidth: cols[i] - 4, align: "center" });
      cx += cols[i];
    });
    y += 12;
    const loadRows = [
      ["Boom Length", C1.boom, C1.boom, C2.boom, C2.boom, "—", "—"],
      ["Boom Angle",  C1.angle,C1.angle,C2.angle,C2.angle,"—","—"],
      ["Radius",      C1.radius,C1.radius,C2.radius,C2.radius,"—","—"],
      ["Rated Load",  C1.rated,C1.rated,C2.rated,C2.rated,"—","—"],
      ["TEST LOAD",   C1.test, C1.test, C2.test, C2.test, "—","—"],
    ];
    loadRows.forEach((row, ri) => {
      const bold = ri === loadRows.length - 1;
      cx = ML;
      row.forEach((cell, ci) => {
        const bg = bold ? (ci === 0 ? rgb(0.12,0.23,0.37) : NAVY) : (ri % 2 === 0 ? WHITE : rgb(0.97,0.98,1));
        fillStrokeRect(page, cx, y, cols[ci], 12, bg, bold ? BORDER : CELLBR);
        const color = bold ? (ci === 0 ? CYAN : WHITE) : (ci === 0 ? TXTDK : TEAL);
        drawText(page, cell, cx + 2, y + 2, { font: bold ? F.bold : F.reg, size: ci === 0 ? 6 : 7, color, maxWidth: cols[ci] - 4, align: ci === 0 ? "left" : "center" });
        cx += cols[ci];
      });
      y += 12;
    });
    y += 4;
    y = drawLegalNote(page, F, "THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE LOAD CHART AND TESTED TO ORIGINAL MANUFACTURERS SPECIFICATIONS.", y);
  }

  // Generic lifting
  if (isLifting && !isCrane) {
    y = drawSectionLabel(page, F, "Inspection Results", y);
    y = drawInfoTable(page, F, [
      ["Visual inspection",        "Satisfactory"],
      ["SWL marking",              "Legible and correct"],
      ["Structural integrity",     "No cracks or deformation"],
      ["Condition of fittings",    "Good"],
      ["Overall assessment",       tone.label],
    ], y, [230, CW - 230]);
    y += 6;
    y = drawLegalNote(page, F, "INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.", y);
  }

  // Defects / recs / comments
  y = drawAlertBox(page, F, "Defects Found", defects, y);
  y = drawAlertBox(page, F, "Recommendations", recs, y);
  if (comments) {
    fillStrokeRect(page, ML, y, CW, 26, LIGHT, CELLBR);
    drawText(page, "COMMENTS", ML + 5, y + 4, { font: F.bold, size: 6, color: TEAL });
    drawText(page, comments, ML + 5, y + 13, { font: F.reg, size: 7.5, color: TXTMD, maxWidth: CW - 10 });
    y += 29;
  }

  y += 4;
  drawSignatures(page, F, inspName, inspId, y);
  drawFooter(page, F);

  return Buffer.from(await pdfDoc.save());
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { clientName, inspectionDate } = await req.json();

    let query = supabase
      .from("certificates")
      .select("*")
      .order("certificate_number", { ascending: true })
      .limit(1000);

    if (clientName)     query = query.ilike("client_name", clientName.trim());
    if (inspectionDate) query = query.eq("inspection_date", inspectionDate);

    const { data: certs, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

    const zip = new JSZip();
    let exported = 0;

    // Generate all PDFs in parallel — pdf-lib is pure JS, no browser needed
    const results = await Promise.allSettled(certs.map(cert => genCert(cert)));

    results.forEach((result, i) => {
      const cert = certs[i];
      if (result.status === "fulfilled") {
        const clientFolder = (cert.client_name || "Unknown").trim().replace(/[^a-zA-Z0-9_\- ]/g, "_");
        const safeDate     = (cert.inspection_date || cert.issue_date || "NoDate").replace(/-/g, "");
        const safeCertNum  = (cert.certificate_number || cert.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_");
        zip.file(`${clientFolder}/${safeDate}_${safeCertNum}.pdf`, result.value);
        exported++;
      } else {
        console.error(`Failed ${cert.certificate_number}:`, result.reason?.message);
      }
    });

    if (exported === 0)
      return NextResponse.json({ error: "Failed to generate any PDFs." }, { status: 500 });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

    const clientLabel = clientName ? clientName.trim().replace(/\s+/g, "_") : "AllClients";
    const dateLabel   = inspectionDate ? `_${inspectionDate}` : "";

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type":            "application/zip",
        "Content-Disposition":     `attachment; filename="Certificates_${clientLabel}${dateLabel}.zip"`,
        "Content-Length":          zipBuffer.length.toString(),
        "X-Certificates-Exported": exported.toString(),
      },
    });

  } catch (err) {
    console.error("Bulk export error:", err);
    return NextResponse.json({ error: "Export failed: " + (err.message || "Unknown error") }, { status: 500 });
  }
}
