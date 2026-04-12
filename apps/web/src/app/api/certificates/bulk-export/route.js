// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  PageSizes,
} from "pdf-lib";

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
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
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
function detectFail(defects, ...kws) {
  if (!defects) return "PASS";
  const d = defects.toLowerCase();
  return kws.some(k => d.includes(k.toLowerCase())) ? "FAIL" : "PASS";
}
function hexRgb(hex) {
  const h = hex.replace("#", "");
  return rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
}
function resultColors(r) {
  if (r === "PASS")            return { fg: hexRgb("#15803d"), bg: hexRgb("#dcfce7"), label: "PASS" };
  if (r === "FAIL")            return { fg: hexRgb("#b91c1c"), bg: hexRgb("#fee2e2"), label: "FAIL" };
  if (r === "REPAIR_REQUIRED") return { fg: hexRgb("#b45309"), bg: hexRgb("#fef3c7"), label: "Repair Required" };
  if (r === "CONDITIONAL")     return { fg: hexRgb("#b45309"), bg: hexRgb("#fef3c7"), label: "Conditional" };
  return { fg: hexRgb("#374151"), bg: hexRgb("#f3f4f6"), label: r || "Unknown" };
}

// ── colour constants ──────────────────────────────────────────────────────────
const COL = {
  navy:    hexRgb("#0b1d3a"),
  cyan:    hexRgb("#22d3ee"),
  teal:    hexRgb("#0e7490"),
  light:   hexRgb("#f4f8ff"),
  alt:     hexRgb("#eef4ff"),
  border:  hexRgb("#1e3a5f"),
  cellBrd: hexRgb("#c3d4e8"),
  text:    hexRgb("#0b1d3a"),
  mid:     hexRgb("#334155"),
  dim:     hexRgb("#64748b"),
  green:   hexRgb("#15803d"),
  greenBg: hexRgb("#dcfce7"),
  red:     hexRgb("#b91c1c"),
  redBg:   hexRgb("#fff5f5"),
  crimson: hexRgb("#c41e3a"),
  white:   hexRgb("#ffffff"),
  rowAlt:  hexRgb("#f8faff"),
  amber:   hexRgb("#b45309"),
};

// ── PDF drawing primitives ────────────────────────────────────────────────────
const PW = PageSizes.A4[0]; // 595.28
const PH = PageSizes.A4[1]; // 841.89
const ML = 20;
const MR = 20;
const CW = PW - ML - MR;

function drawRect(page, x, y, w, h, { fill, stroke, lineWidth = 0.5 } = {}) {
  if (fill)   page.drawRectangle({ x, y: PH - y - h, width: w, height: h, color: fill, borderColor: stroke, borderWidth: stroke ? lineWidth : 0 });
  else if (stroke) page.drawRectangle({ x, y: PH - y - h, width: w, height: h, borderColor: stroke, borderWidth: lineWidth });
}

function drawText(page, str, x, y, { font, size = 8, color = COL.text, maxWidth, align = "left" } = {}) {
  if (!str || !font) return;
  const s = String(str);
  // truncate to fit maxWidth
  let display = s;
  if (maxWidth) {
    while (display.length > 1 && font.widthOfTextAtSize(display, size) > maxWidth) {
      display = display.slice(0, -1);
    }
    if (display !== s) display = display.slice(0, -1) + "…";
  }
  let tx = x;
  if (align === "center" && maxWidth) {
    const tw = font.widthOfTextAtSize(display, size);
    tx = x + (maxWidth - tw) / 2;
  } else if (align === "right" && maxWidth) {
    const tw = font.widthOfTextAtSize(display, size);
    tx = x + maxWidth - tw;
  }
  page.drawText(display, { x: tx, y: PH - y - size, font, size, color });
}

function drawLine(page, x1, y1, x2, y2, color = COL.border, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: PH - y1 }, end: { x: x2, y: PH - y2 }, color, thickness });
}

// ── Shared drawing blocks ─────────────────────────────────────────────────────

function drawHeader(page, fonts, title, certNumber, resultLabel, resultFg, resultBg) {
  const H = 72;
  const { bold, regular } = fonts;

  // Navy background
  drawRect(page, 0, 0, PW, H, { fill: COL.navy });
  // White logo box
  drawRect(page, 0, 0, 95, H, { fill: COL.white });
  drawText(page, "MONROY", 5, 18, { font: bold, size: 11, color: COL.navy, maxWidth: 85, align: "center" });
  drawText(page, "(PTY) LTD", 5, 32, { font: bold, size: 7, color: COL.teal, maxWidth: 85, align: "center" });
  drawText(page, "PROCESS CONTROL", 5, 42, { font: regular, size: 5.5, color: COL.navy, maxWidth: 85, align: "center" });
  drawText(page, "& CRANES", 5, 50, { font: regular, size: 5.5, color: COL.navy, maxWidth: 85, align: "center" });

  // Title area
  drawText(page, "Monroy (Pty) Ltd  ·  Process Control & Cranes", 105, 10, { font: regular, size: 6.5, color: COL.cyan, maxWidth: 310 });
  drawText(page, title, 105, 22, { font: bold, size: 13, color: COL.white, maxWidth: 295 });

  // Contact right
  const cx = PW - 175;
  drawText(page, "(+267) 71 450 610 / 77 906 461", cx, 12, { font: regular, size: 6.5, color: COL.white, maxWidth: 165 });
  drawText(page, "monroybw@gmail.com", cx, 22, { font: regular, size: 6.5, color: COL.white, maxWidth: 165 });
  drawText(page, "Phase 2, Letlhakane, Botswana", cx, 32, { font: regular, size: 6.5, color: COL.white, maxWidth: 165 });

  // Result badge
  if (resultLabel) {
    const bw = 75, bh = 16, bx = cx, by = 48;
    drawRect(page, bx, by, bw, bh, { fill: resultBg, stroke: resultFg });
    drawText(page, resultLabel, bx, by + 4, { font: bold, size: 8, color: resultFg, maxWidth: bw, align: "center" });
  }

  if (certNumber) {
    drawText(page, certNumber, 105, 52, { font: regular, size: 7.5, color: COL.dim, maxWidth: 260 });
  }

  // Gradient accent bar (simulated with cyan)
  drawRect(page, 0, H, PW, 3, { fill: COL.cyan });

  return H + 3; // return next Y
}

function drawSectionLabel(page, fonts, title, y) {
  drawRect(page, ML, y + 2, 3, 9, { fill: COL.cyan });
  drawText(page, title.toUpperCase(), ML + 8, y + 3, { font: fonts.bold, size: 6.5, color: COL.text });
  return y + 14;
}

function drawInfoTable(page, fonts, rows, y, colWidths) {
  const RH = 14;
  const [lw1, lw2, lw3, lw4] = colWidths || [110, CW / 2 - 110, 110, CW / 2 - 110];
  rows.forEach((row, i) => {
    const ry = y + i * RH;
    const bg = i % 2 === 0 ? COL.light : COL.alt;
    // left label
    drawRect(page, ML, ry, lw1, RH, { fill: COL.navy, stroke: COL.border });
    drawText(page, row[0] || "", ML + 3, ry + 4, { font: fonts.bold, size: 6.5, color: COL.cyan, maxWidth: lw1 - 5 });
    // left value
    drawRect(page, ML + lw1, ry, lw2, RH, { fill: bg, stroke: COL.cellBrd });
    drawText(page, row[1] || "—", ML + lw1 + 3, ry + 4, { font: fonts.regular, size: 7.5, color: COL.text, maxWidth: lw2 - 5 });
    if (row.length > 2) {
      const x2 = ML + lw1 + lw2;
      // right label
      drawRect(page, x2, ry, lw3, RH, { fill: COL.navy, stroke: COL.border });
      drawText(page, row[2] || "", x2 + 3, ry + 4, { font: fonts.bold, size: 6.5, color: COL.cyan, maxWidth: lw3 - 5 });
      // right value
      drawRect(page, x2 + lw3, ry, lw4, RH, { fill: bg, stroke: COL.cellBrd });
      drawText(page, row[3] || "—", x2 + lw3 + 3, ry + 4, { font: fonts.regular, size: 7.5, color: COL.text, maxWidth: lw4 - 5 });
    }
  });
  return y + rows.length * RH;
}

function drawChecklist(page, fonts, items, x, y, colW) {
  const RH = 11;
  items.forEach((item, i) => {
    const ry = y + i * RH;
    if (item.header) {
      drawRect(page, x, ry, colW, RH, { fill: COL.navy, stroke: COL.border });
      drawText(page, item.label.toUpperCase(), x + 4, ry + 3, { font: fonts.bold, size: 6, color: COL.cyan, maxWidth: colW - 6 });
    } else {
      const bg = i % 2 === 0 ? COL.white : COL.rowAlt;
      drawRect(page, x, ry, colW - 28, RH, { fill: bg, stroke: COL.cellBrd });
      drawText(page, item.label, x + 3, ry + 3, { font: fonts.regular, size: 7, color: COL.text, maxWidth: colW - 34 });
      if (item.na) {
        drawRect(page, x + colW - 28, ry, 28, RH, { fill: bg, stroke: COL.cellBrd });
        drawText(page, "N/A", x + colW - 26, ry + 3, { font: fonts.regular, size: 6, color: COL.dim, maxWidth: 24, align: "center" });
      } else {
        const pass = item.result === "PASS";
        const fail = item.result === "FAIL" || item.result === "REPAIR_REQUIRED";
        drawRect(page, x + colW - 28, ry, 14, RH, { fill: bg, stroke: COL.cellBrd });
        drawRect(page, x + colW - 14, ry, 14, RH, { fill: bg, stroke: COL.cellBrd });
        if (pass) drawText(page, "P", x + colW - 28, ry + 2, { font: fonts.bold, size: 8, color: COL.green, maxWidth: 14, align: "center" });
        if (fail) drawText(page, "F", x + colW - 14, ry + 2, { font: fonts.bold, size: 8, color: COL.red, maxWidth: 14, align: "center" });
      }
    }
  });
  return y + items.length * RH;
}

function drawPFBadge(page, fonts, result, x, y) {
  const isPass = result === "PASS";
  const BW = 80, BH = 22, half = BW / 2;
  drawRect(page, x, y, half, BH, { fill: isPass ? COL.greenBg : COL.light, stroke: COL.border });
  drawRect(page, x + half, y, half, BH, { fill: isPass ? COL.light : hexRgb("#fee2e2"), stroke: COL.border });
  drawText(page, "PASS", x, y + 7, { font: isPass ? fonts.bold : fonts.regular, size: 9, color: isPass ? COL.green : COL.dim, maxWidth: half, align: "center" });
  drawText(page, "FAIL", x + half, y + 7, { font: isPass ? fonts.regular : fonts.bold, size: 9, color: isPass ? COL.dim : COL.red, maxWidth: half, align: "center" });
}

function drawAlertBox(page, fonts, label, value, y, fgCol = COL.red, bgCol = COL.redBg) {
  if (!value) return y;
  const H = 26;
  drawRect(page, ML, y, CW, H, { fill: bgCol, stroke: fgCol });
  drawText(page, label.toUpperCase(), ML + 5, y + 4, { font: fonts.bold, size: 6, color: fgCol });
  drawText(page, value, ML + 5, y + 13, { font: fonts.regular, size: 7.5, color: fgCol, maxWidth: CW - 10 });
  return y + H + 3;
}

function drawLegalNote(page, fonts, noteText, y) {
  drawRect(page, ML, y, CW, 18, { fill: COL.light, stroke: COL.border });
  drawText(page, noteText, ML + 5, y + 5, { font: fonts.bold, size: 5.5, color: COL.mid, maxWidth: CW - 10, align: "center" });
  return y + 22;
}

function drawSignatures(page, fonts, inspName, inspId, y) {
  const half = CW / 2 - 6;
  drawRect(page, ML, y, half, 38, { fill: COL.light, stroke: COL.border });
  drawText(page, "COMPETENT PERSON / INSPECTOR", ML + 4, y + 4, { font: fonts.bold, size: 6, color: COL.teal });
  drawLine(page, ML + 4, y + 28, ML + half - 4, y + 28);
  drawText(page, inspName || "Moemedi Masupe", ML + 4, y + 30, { font: fonts.bold, size: 7.5, color: COL.text, maxWidth: half - 8 });
  drawText(page, "Inspector ID: " + (inspId || "700117910"), ML + 4, y + 40, { font: fonts.regular, size: 6.5, color: COL.dim });

  const x2 = ML + half + 8;
  drawRect(page, x2, y, half, 38, { fill: COL.light, stroke: COL.border });
  drawText(page, "CLIENT / USER / OWNER", x2 + 4, y + 4, { font: fonts.bold, size: 6, color: COL.teal });
  drawLine(page, x2 + 4, y + 28, x2 + half - 4, y + 28);
  drawText(page, "Name & Signature", x2 + 4, y + 30, { font: fonts.regular, size: 7, color: COL.dim });

  return y + 46;
}

function drawFooter(page, fonts) {
  const fy = PH - 28;
  drawRect(page, 0, fy - PH + PH, PW, 14, { fill: COL.crimson });
  page.drawRectangle({ x: 0, y: 28, width: PW, height: 14, color: COL.crimson });
  page.drawText("Mobile Crane Hire  |  Rigging  |  NDT Test  |  Scaffolding  |  Painting  |  Inspection of Lifting Equipment  |  Steel Fabricating  |  Mechanical Engineering  |  Fencing  |  Maintenance", {
    x: ML, y: 35, font: fonts.regular, size: 5.5, color: COL.white, maxWidth: CW,
  });
  page.drawRectangle({ x: 0, y: 0, width: PW, height: 14, color: COL.navy });
  page.drawText("Monroy (Pty) Ltd  ·  Mophane Avenue, Maun, Botswana", { x: ML, y: 5, font: fonts.regular, size: 6, color: hexRgb("#94a3b8") });
  page.drawText("Quality  ·  Safety  ·  Excellence", { x: PW - 160, y: 5, font: fonts.regular, size: 6, color: hexRgb("#94a3b8") });
}

// ── Font loader (called once per PDF) ────────────────────────────────────────
async function loadFonts(pdfDoc) {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { regular, bold };
}

function newPage(pdfDoc) {
  return pdfDoc.addPage(PageSizes.A4);
}

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATE GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

async function genGeneric(c) {
  const pdfDoc = await PDFDocument.create();
  const fonts  = await loadFonts(pdfDoc);
  const page   = newPage(pdfDoc);
  const ex     = c.extracted_data || {};

  const certNumber = val(c.certificate_number);
  const equipType  = val(c.equipment_type || c.asset_type || ex.equipment_type) || "";
  const rawType    = equipType.toLowerCase();
  const isLifting  = /lift|hoist|crane|sling|chain|hook|rope|rigging|winch|block/i.test(rawType);
  const isPressure = /pressure|vessel|boiler|autoclave|receiver|compressor|tank/i.test(rawType);
  const certType   = val(c.certificate_type) || (isLifting ? "Load Test Certificate" : isPressure ? "Pressure Test Certificate" : "Certificate of Inspection");
  const company    = val(c.client_name || c.company || ex.client_name) || "—";
  const location   = val(c.location || ex.equipment_location) || "—";
  const serialNo   = val(c.serial_number || ex.serial_number) || "—";
  const fleetNo    = val(c.fleet_number || ex.fleet_number) || "—";
  const mfg        = val(c.manufacturer || ex.manufacturer) || "—";
  const model      = val(c.model || ex.model) || "—";
  const swl        = val(c.swl || ex.swl) || "—";
  const defects    = val(c.defects_found || ex.defects_found);
  const recommendations = val(c.recommendations || ex.recommendations);
  const comments   = val(c.comments || c.remarks || ex.comments);
  const inspName   = val(c.inspector_name || ex.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id || ex.inspector_id) || "700117910";
  const tone       = resultColors(pickResult(c));

  let y = drawHeader(page, fonts, certType, certNumber, tone.label, tone.fg, tone.bg);
  y += 8;
  y = drawSectionLabel(page, fonts, "Certificate Details", y);
  y = drawInfoTable(page, fonts, [
    ["Certificate No.", certNumber || "—", "Issue Date",     fmtDate(c.issue_date || c.issued_at)],
    ["Client",          company,           "Expiry Date",    fmtDate(c.expiry_date)],
    ["Location",        location,          "Equipment Type", equipType || "—"],
    ["Serial Number",   serialNo,          "Fleet No.",      fleetNo],
    ["Manufacturer",    mfg,               "Model",          model],
    ["Safe Working Load (SWL)", swl,       "Result",         tone.label],
  ], y);
  y += 10;
  y = drawSectionLabel(page, fonts, "Legal Compliance", y);
  drawRect(page, ML, y, CW, 20, { fill: COL.light, stroke: COL.border });
  drawText(page, "This inspection has been performed by a competent person as defined under the Mines, Quarries, Works and Machinery Act Cap 44:02 of the Laws of Botswana.", ML + 5, y + 5, { font: fonts.regular, size: 7, color: COL.mid, maxWidth: CW - 10 });
  y += 26;
  y = drawAlertBox(page, fonts, "Defects Found", defects, y);
  y = drawAlertBox(page, fonts, "Recommendations", recommendations, y);
  y = drawAlertBox(page, fonts, "Comments", comments, y, COL.teal, COL.light);
  y += 8;
  drawSignatures(page, fonts, inspName, inspId, y);
  drawFooter(page, fonts);

  return Buffer.from(await pdfDoc.save());
}

async function genCrane(c, pn) {
  const pdfDoc = await PDFDocument.create();
  const fonts  = await loadFonts(pdfDoc);

  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = fmtDate(c.issue_date || c.issued_at);
  const expiryDate = fmtDate(c.expiry_date);
  const equipMake  = val(c.manufacturer || c.model || c.equipment_type) || "—";
  const serialNo   = val(c.serial_number) || "—";
  const fleetNo    = val(c.fleet_number) || "—";
  const swl        = val(c.swl) || "—";
  const mh         = val(c.machine_hours || pn["Machine hours"] || pn["Machine Hours"]);
  const defects    = val(c.defects_found);
  const recommendations = val(c.recommendations);
  const comments   = val(c.comments || c.remarks);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const tone       = resultColors(pickResult(c));

  const C1 = { boom:pn["C1 boom"]||"—",angle:pn["C1 angle"]||"—",radius:pn["C1 radius"]||"—",rated:pn["C1 rated"]||"—",test:pn["C1 test"]||"—" };
  const C2 = { boom:pn["C2 boom"]||"—",angle:pn["C2 angle"]||"—",radius:pn["C2 radius"]||"—",rated:pn["C2 rated"]||"—",test:pn["C2 test"]||pn["Crane test load"]||"—" };
  const C3 = { boom:pn["C3 boom"]||"—",angle:pn["C3 angle"]||"—",radius:pn["C3 radius"]||"—",rated:pn["C3 rated"]||"—",test:pn["C3 test"]||"—" };
  const sliRes    = pn["Computer"] || pn["SLI"] || "PASS";
  const opCode    = pn["Operating code"] || "MAIN/AUX-FULL OUTRIGGER-360DEG";
  const ctrWts    = pn["Counterweights"] || "STD FITTED";
  const jib       = pn["Jib"] || "";
  const sliModel  = pn["SLI model"] || "";
  const sliCertNo = pn["SLI cert"] || (certNumber ? certNumber.replace("CERT-CR","SLI ") : "");

  // ── PAGE 1: Load Test ──
  const p1 = newPage(pdfDoc);
  let y = drawHeader(p1, fonts, "Load Test Certificate — Mobile Crane", certNumber, tone.label, tone.fg, tone.bg);
  y += 6;
  y = drawInfoTable(p1, fonts, [
    ["Customer",    company,    "Make / Type",  equipMake],
    ["Site",        location,   "Serial No.",   serialNo],
    ["Date",        issueDate,  "Fleet No.",    fleetNo],
    ["Expiry Date", expiryDate, "SWL",          swl],
    ...(mh ? [["Machine Hours", mh, "", ""]] : []),
  ], y);
  y += 6;

  // Certificate rows
  const RH = 14;
  drawRect(p1, ML, y, CW - 82, RH, { fill: COL.navy, stroke: COL.border });
  drawText(p1, "SLI Certificate", ML + 4, y + 4, { font: fonts.bold, size: 7.5, color: COL.cyan, maxWidth: 180 });
  drawRect(p1, ML + CW - 82, y, 30, RH, { fill: COL.alt, stroke: COL.border });
  drawText(p1, "YES", ML + CW - 82, y + 4, { font: fonts.bold, size: 7.5, color: COL.text, maxWidth: 30, align: "center" });
  drawRect(p1, ML + CW - 52, y, 52, RH, { fill: COL.light, stroke: COL.cellBrd });
  drawText(p1, sliCertNo || "—", ML + CW - 50, y + 4, { font: fonts.regular, size: 7, color: COL.teal, maxWidth: 48 });
  y += RH;

  drawRect(p1, ML, y, CW - 82, RH, { fill: COL.navy, stroke: COL.border });
  drawText(p1, "Load Test Certificate", ML + 4, y + 4, { font: fonts.bold, size: 7.5, color: COL.cyan, maxWidth: 180 });
  drawRect(p1, ML + CW - 82, y, 30, RH, { fill: COL.alt, stroke: COL.border });
  drawText(p1, "YES", ML + CW - 82, y + 4, { font: fonts.bold, size: 7.5, color: COL.text, maxWidth: 30, align: "center" });
  drawRect(p1, ML + CW - 52, y, 52, RH, { fill: COL.light, stroke: COL.cellBrd });
  drawText(p1, certNumber || "—", ML + CW - 50, y + 4, { font: fonts.regular, size: 7, color: COL.teal, maxWidth: 48 });
  y += RH + 4;

  drawPFBadge(p1, fonts, tone.label, PW - ML - 82, y - RH * 2 - 4);

  // Applied load table
  y = drawSectionLabel(p1, fonts, "Details of Applied Load", y);
  const cols = [128, 43, 43, 43, 43, 43, CW - 343];
  const hdrs = ["Details", "C1 Actual", "C1 SLI", "C2 Actual", "C2 SLI", "C3 Actual", "C3 SLI"];
  const TH = 13;

  let cx = ML;
  hdrs.forEach((h, i) => {
    drawRect(p1, cx, y, cols[i], TH, { fill: COL.navy, stroke: COL.border });
    drawText(p1, h, cx + 2, y + 3, { font: fonts.bold, size: 6, color: COL.cyan, maxWidth: cols[i] - 4, align: "center" });
    cx += cols[i];
  });
  y += TH;

  const loadRows = [
    ["Boom Length Reading", C1.boom,  C1.boom,  C2.boom,  C2.boom,  C3.boom,  C3.boom],
    ["Boom Angle Reading",  C1.angle, C1.angle, C2.angle, C2.angle, C3.angle, C3.angle],
    ["Radius Reading",      C1.radius,C1.radius,C2.radius,C2.radius,C3.radius,C3.radius],
    ["Rated Load",          C1.rated, C1.rated, C2.rated, C2.rated, C3.rated, C3.rated],
    ["TEST LOAD",           C1.test,  C1.test,  C2.test,  C2.test,  C3.test,  C3.test],
  ];
  loadRows.forEach((row, ri) => {
    const isBold = ri === loadRows.length - 1;
    cx = ML;
    row.forEach((cell, ci) => {
      const bg = isBold ? (ci === 0 ? hexRgb("#1e3a5f") : COL.navy) : (ri % 2 === 0 ? COL.white : COL.rowAlt);
      drawRect(p1, cx, y, cols[ci], TH, { fill: bg, stroke: isBold ? COL.border : COL.cellBrd });
      const color = isBold ? (ci === 0 ? COL.cyan : COL.white) : (ci === 0 ? COL.text : COL.teal);
      drawText(p1, cell, cx + 2, y + 3, { font: isBold ? fonts.bold : fonts.regular, size: ci === 0 ? 6.5 : 7, color, maxWidth: cols[ci] - 4, align: ci === 0 ? "left" : "center" });
      cx += cols[ci];
    });
    y += TH;
  });
  y += 6;

  y = drawSectionLabel(p1, fonts, "SLI Details", y);
  const sliRows = [
    ...(sliModel ? [["SLI Make & Model", sliModel]] : []),
    ["Operating Code for testing", opCode],
    ...(jib ? [["Jib Configuration", jib]] : []),
    ["Counter weights during test", ctrWts],
    ["SLI cut off — Hoist up",   sliRes === "FAIL" ? "Defective" : "Yes"],
    ["SLI cut off — Tele out",   sliRes === "FAIL" ? "Defective" : "Yes"],
    ["SLI cut out — Boom down",  sliRes === "FAIL" ? "Defective" : "Yes"],
  ];
  y = drawInfoTable(p1, fonts, sliRows.map(([l, v]) => [l, v]), y, [200, CW - 200]);
  y += 6;
  y = drawAlertBox(p1, fonts, "Defects Found", defects, y);
  y = drawAlertBox(p1, fonts, "Recommendations", recommendations, y);
  y = drawAlertBox(p1, fonts, "Comments", comments, y, COL.teal, COL.light);
  y += 4;
  y = drawLegalNote(p1, fonts, "THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE LOAD CHART AND TESTED CORRECTLY TO ORIGINAL MANUFACTURERS SPECIFICATIONS.", y);
  drawSignatures(p1, fonts, inspName, inspId, y);
  drawFooter(p1, fonts);

  // ── PAGE 2: Checklist ──
  const p2 = newPage(pdfDoc);
  const structural = pn["Structural"] || "PASS";
  const boom2      = pn["Boom"] || "PASS";
  const outriggers = pn["Outriggers"] || "PASS";
  const computer   = pn["Computer"] || "PASS";
  const oilLeaks   = detectFail(defects || "", "oil leak", "leak");
  const tires      = detectFail(defects || "", "tire", "tyre");
  const brakes     = detectFail(defects || "", "brake");
  const hoist      = detectFail(defects || "", "hoist");
  const teleCyl    = detectFail(defects || "", "tele cylinder", "cylinder");
  const boomCyl    = detectFail(defects || "", "boom cylinder", "lift cylinder");
  const mcirNo     = "MCIR " + (c.inspection_number || (certNumber || "").replace("CERT-CR","") || "");

  let y2 = drawHeader(p2, fonts, "Crane Inspection Checklist — " + mcirNo, certNumber, tone.label, tone.fg, tone.bg);
  y2 += 6;
  y2 = drawInfoTable(p2, fonts, [
    ["Customer",    company,    "Make / Type",  equipMake],
    ["Site",        location,   "Serial No.",   serialNo],
    ["Date",        issueDate,  "Fleet No.",    fleetNo],
    ["Validity",    expiryDate, "SWL",          swl],
  ], y2);
  y2 += 6;

  const halfW = CW / 2 - 4;
  const leftItems = [
    { header: true, label: "Cab Condition" },
    { label: "Windows",                         result: "PASS"   },
    { label: "Control Levers Marked",           result: "PASS"   },
    { label: "Control Lever return to neutral", result: "PASS"   },
    { label: "Level Gauges Correct",            result: "PASS"   },
    { label: "Reverse Warning",                 result: "PASS"   },
    { label: "Load Charts Available",           result: "PASS"   },
    { label: "Horn Warning",                    result: "PASS"   },
    { label: "Lights, Rotating Lights",         result: "PASS"   },
    { label: "Tires",                           result: tires    },
    { label: "Crane Brakes",                    result: brakes   },
    { label: "Fire Extinguisher",               result: "PASS"   },
    { label: "Beacon Lights",                   result: "PASS"   },
    { label: "SWL Correctly Indicated",         result: "PASS"   },
    { label: "Oil Leaks",                       result: oilLeaks },
    { label: "Operator Seat Condition",         result: "PASS"   },
    { header: true, label: "Safe Load Indicator" },
    { label: "Override Key Safe",               result: computer },
    { label: "Load Reading",                    result: computer },
    { label: "A2B System Working",              result: computer },
    { label: "Cut Off System Working",          result: computer },
    { label: "Radius Reading",                  result: computer },
    { label: "Boom Length Reading",             result: computer },
    { label: "Boom Angle Reading",              result: computer },
  ];
  const rightItems = [
    { header: true, label: "Crane Superstructure" },
    { label: "Outrigger Beams (Visual)",        result: outriggers },
    { label: "Outrigger Jacks (Visual)",        result: outriggers },
    { label: "Fly-Jib Condition (Visual)",      na: true           },
    { label: "Outrigger Pads Condition",        result: outriggers },
    { label: "Outrigger Boxes (Cracks)",        result: outriggers },
    { label: "Hoist Drum Condition",            result: hoist      },
    { label: "Hoist Brake Condition",           result: hoist      },
    { label: "Hoist Drum Mounting",             result: "PASS"     },
    { label: "Leaks on Hoist Drum",             result: oilLeaks   },
    { label: "Top Head Sheaves",                result: "PASS"     },
    { label: "Bottom Head Sheaves",             result: "PASS"     },
    { label: "Boom Retract Ropes Visible",      na: true           },
    { label: "Boom Retract Sheaves",            na: true           },
    { label: "Slew Bearing Checked",            result: "PASS"     },
    { label: "Slew Brake Checked",              result: "PASS"     },
    { label: "Boom Lock Pins Checked",          result: boom2      },
    { label: "Boom Pivot Point Checked",        result: boom2      },
    { label: "Control Valve Checked",           result: "PASS"     },
    { label: "Tele Cylinders — leaks",          result: teleCyl    },
    { label: "Tele Cylinders — load hold",      result: teleCyl    },
    { label: "Tele Sections — damage",          result: structural },
    { label: "Tele's — bending",                na: true           },
    { label: "Boom Lift Cylinder — leaks",      result: boomCyl    },
    { label: "Boom Cylinder Mounting Points",   result: boom2      },
    { label: "Boom Cylinder load hold",         result: boom2      },
    { label: "Counterweights",                  result: "PASS"     },
  ];

  drawChecklist(p2, fonts, leftItems,  ML,                y2, halfW);
  drawChecklist(p2, fonts, rightItems, ML + halfW + 8,    y2, halfW);
  y2 += Math.max(leftItems.length, rightItems.length) * 11 + 8;
  y2 = drawAlertBox(p2, fonts, "Comments", comments, y2, COL.teal, COL.light);
  drawSignatures(p2, fonts, inspName, inspId, y2);
  drawFooter(p2, fonts);

  return Buffer.from(await pdfDoc.save());
}

async function genPressureVessel(c, pn) {
  const pdfDoc = await PDFDocument.create();
  const fonts  = await loadFonts(pdfDoc);
  const page   = newPage(pdfDoc);

  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = fmtDate(c.issue_date || c.issued_at);
  const expiryDate = fmtDate(c.expiry_date);
  const equipMake  = val(c.manufacturer || c.model || c.equipment_type) || "Pressure Vessel";
  const serialNo   = val(c.serial_number) || "—";
  const fleetNo    = val(c.fleet_number) || "—";
  const mawp       = val(c.mawp || c.working_pressure || pn["MAWP"]) || "—";
  const testP      = val(c.test_pressure || pn["Test pressure"]) || "—";
  const designP    = val(c.design_pressure) || "—";
  const pvType     = val(c.equipment_description) || "Pressure Vessel";
  const pvCap      = val(c.capacity_volume) || "—";
  const defects    = val(c.defects_found);
  const recommendations = val(c.recommendations);
  const comments   = val(c.comments || c.remarks);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const pu         = val(c.pressure_unit || pn.pressure_unit) || "bar";
  const tone       = resultColors(pickResult(c));

  let y = drawHeader(page, fonts, "Pressure Vessel Inspection Certificate", certNumber, tone.label, tone.fg, tone.bg);
  y += 6;
  y = drawInfoTable(page, fonts, [
    ["Customer",           company,    "Make / Type",         equipMake],
    ["Site",               location,   "Serial No.",          serialNo],
    ["Date",               issueDate,  "Fleet No.",           fleetNo],
    ["Expiry Date",        expiryDate, "Vessel Type",         pvType],
    [`MAWP (${pu})`,       mawp,       `Test Pressure (${pu})`, testP],
    [`Design P. (${pu})`,  designP,    "Capacity",            pvCap],
  ], y);
  y += 6;
  drawPFBadge(page, fonts, tone.label, PW - ML - 82, y - 6);
  y = drawSectionLabel(page, fonts, "Inspection Results", y);
  y = drawInfoTable(page, fonts, [
    ["Vessel condition — external visual",          "Satisfactory"],
    ["Vessel condition — internal (if applicable)", "Satisfactory"],
    ["Safety valve fitted and operating correctly", "Yes"],
    ["Pressure gauge fitted and reading correctly", "Yes"],
    ["Drain valve fitted and operating correctly",  "Yes"],
    ["Signs of corrosion, cracking or deformation", "None"],
    ["Nameplate legible and data correct",          "Yes"],
    ["Hydrostatic test performed",                  testP !== "—" ? `Yes — ${testP} ${pu}` : "N/A"],
    ["Overall assessment",                          tone.label],
  ], y, [230, CW - 230]);
  y += 8;
  y = drawLegalNote(page, fonts, "THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.", y);
  y = drawAlertBox(page, fonts, "Defects Found", defects, y);
  y = drawAlertBox(page, fonts, "Recommendations", recommendations, y);
  y = drawAlertBox(page, fonts, "Comments", comments, y, COL.teal, COL.light);
  y += 6;
  drawSignatures(page, fonts, inspName, inspId, y);
  drawFooter(page, fonts);

  return Buffer.from(await pdfDoc.save());
}

async function genMachine(c) {
  const pdfDoc = await PDFDocument.create();
  const fonts  = await loadFonts(pdfDoc);
  const page   = newPage(pdfDoc);

  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = fmtDate(c.issue_date || c.issued_at);
  const expiryDate = fmtDate(c.expiry_date);
  const equipType  = val(c.equipment_type) || "Machine";
  const equipMake  = val(c.manufacturer || c.model) || equipType;
  const serialNo   = val(c.serial_number) || "—";
  const fleetNo    = val(c.fleet_number) || "—";
  const swl        = val(c.swl) || "—";
  const defects    = val(c.defects_found) || "";
  const recommendations = val(c.recommendations);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const tone       = resultColors(pickResult(c));
  const oilLeaks   = detectFail(defects, "leak", "oil");
  const tires      = detectFail(defects, "tire", "tyre");
  const brakes     = detectFail(defects, "brake");
  const isForklift = /forklift|fork.lift/i.test(equipType);

  let y = drawHeader(page, fonts, `${equipType} Inspection Certificate`, certNumber, tone.label, tone.fg, tone.bg);
  y += 6;
  y = drawInfoTable(page, fonts, [
    ["Customer",    company,    "Make / Type",  equipMake],
    ["Site",        location,   "Serial No.",   serialNo],
    ["Date",        issueDate,  "Fleet No.",    fleetNo],
    ["Expiry Date", expiryDate, "SWL",          swl],
  ], y);
  y += 6;
  drawPFBadge(page, fonts, tone.label, PW - ML - 82, y - 6);

  const halfW = CW / 2 - 4;
  const leftItems = [
    { header: true, label: "General Condition" },
    { label: "Structural Integrity",       result: "PASS"       },
    { label: "Hydraulic System",           result: "PASS"       },
    { label: "Brake System",               result: brakes||"PASS" },
    { label: "Tyres / Wheels",             result: tires||"PASS" },
    { label: "Oil Leaks",                  result: oilLeaks     },
    { label: "Lights & Horn",              result: "PASS"       },
    { label: "Fire Extinguisher",          result: "PASS"       },
    { label: "Seat Belt",                  result: "PASS"       },
    { label: "Controls Marked Correctly",  result: "PASS"       },
    { label: "Load Chart Available",       result: "PASS"       },
    ...(isForklift ? [
      { header: true, label: "Forks & Mast" },
      { label: "Mast / Structural Integrity",  result: "PASS"   },
      { label: "Fork Condition",               result: detectFail(defects,"fork","tine") },
      { label: "Fork Retention Pins",          result: "PASS"   },
      { label: "Mast Chain Lubrication",       result: "PASS"   },
      { label: "Tilt Cylinders — No Leaks",    result: oilLeaks },
    ] : []),
  ];
  const rightItems = [
    { header: true, label: "Safety Systems" },
    { label: "Load Indicator / SWL Plate",  result: "PASS"    },
    { label: "Emergency Stop",              result: "PASS"    },
    { label: "Overload Protection",         result: "PASS"    },
    { header: true, label: "Hydraulics & Drive" },
    { label: "Hydraulic Oil Level",         result: "PASS"    },
    { label: "Hydraulic Hoses & Fittings",  result: oilLeaks  },
    { label: "Drive Transmission",          result: "PASS"    },
    { label: "Steering System",             result: "PASS"    },
    { label: "Engine / Motor Condition",    result: "PASS"    },
    { header: true, label: "Load Test" },
    { label: "Test Load at Rated Capacity", result: "PASS"    },
    { label: "Lifting / Lowering Smooth",   result: "PASS"    },
    { label: "No Deformation Under Load",   result: "PASS"    },
    { label: "All Functions Under Load",    result: "PASS"    },
  ];

  drawChecklist(page, fonts, leftItems,  ML,              y, halfW);
  drawChecklist(page, fonts, rightItems, ML + halfW + 8,  y, halfW);
  y += Math.max(leftItems.length, rightItems.length) * 11 + 8;
  y = drawAlertBox(page, fonts, "Defects Found", defects || null, y);
  y = drawAlertBox(page, fonts, "Recommendations", recommendations, y);
  y += 4;
  drawSignatures(page, fonts, inspName, inspId, y);
  drawFooter(page, fonts);

  return Buffer.from(await pdfDoc.save());
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const { clientName, inspectionDate } = await req.json();

    let query = supabase
      .from("certificates")
      .select("*")
      .order("certificate_number", { ascending: true })
      .limit(500);

    if (clientName)     query = query.eq("client_name", clientName);
    if (inspectionDate) query = query.eq("inspection_date", inspectionDate);

    const { data: certs, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    if (!certs || certs.length === 0)
      return NextResponse.json({ error: "No certificates match the selected filters." }, { status: 404 });

    const zip = new JSZip();
    let exported = 0;

    for (const cert of certs) {
      try {
        const rawType = String(cert.equipment_type || "").toLowerCase();
        const pn      = parseNotes(val(cert.notes || "") || "");

        let pdfBuffer;
        if (/mobile.crane|^crane/i.test(rawType) && !/hook|sling|cherry|telehandler|forklift/i.test(rawType)) {
          pdfBuffer = await genCrane(cert, pn);
        } else if (/pressure.vessel|air.receiver|boiler/i.test(rawType)) {
          pdfBuffer = await genPressureVessel(cert, pn);
        } else if (/forklift|fork.lift|telehandler|cherry.picker|tlb|frontloader/i.test(rawType)) {
          pdfBuffer = await genMachine(cert);
        } else {
          pdfBuffer = await genGeneric(cert);
        }

        const clientFolder = (cert.client_name || "Unknown")
          .replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();
        const safeDate = (cert.inspection_date || cert.issue_date || "NoDate").replace(/-/g, "");
        const safeCertNum = (cert.certificate_number || cert.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_");

        zip.file(`${clientFolder}/${safeDate}_${safeCertNum}.pdf`, pdfBuffer);
        exported++;
      } catch (e) {
        console.error(`Skipped cert ${cert.certificate_number || cert.id}:`, e.message);
      }
    }

    if (exported === 0)
      return NextResponse.json({ error: "Failed to generate any PDFs. Check server logs." }, { status: 500 });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const clientLabel = clientName ? clientName.replace(/\s+/g, "_") : "AllClients";
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
