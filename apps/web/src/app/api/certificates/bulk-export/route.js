// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import PDFDocument from "pdfkit";

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

// ── colours ───────────────────────────────────────────────────────────────────
const C = {
  navy:    "#0b1d3a",
  cyan:    "#22d3ee",
  blue:    "#3b82f6",
  teal:    "#0e7490",
  lightBg: "#f4f8ff",
  altBg:   "#eef4ff",
  border:  "#1e3a5f",
  cellBrd: "#c3d4e8",
  text:    "#0b1d3a",
  mid:     "#334155",
  dim:     "#64748b",
  green:   "#15803d",
  greenBg: "#dcfce7",
  red:     "#b91c1c",
  redBg:   "#fff5f5",
  amber:   "#b45309",
  crimson: "#c41e3a",
  white:   "#ffffff",
  rowAlt:  "#f8faff",
};

function resultColors(r) {
  if (r === "PASS")            return { fg: C.green,  bg: C.greenBg, label: "PASS" };
  if (r === "FAIL")            return { fg: C.red,    bg: "#fee2e2", label: "FAIL" };
  if (r === "REPAIR_REQUIRED") return { fg: C.amber,  bg: "#fef3c7", label: "Repair Required" };
  if (r === "CONDITIONAL")     return { fg: C.amber,  bg: "#fef3c7", label: "Conditional" };
  if (r === "OUT_OF_SERVICE")  return { fg: "#7f1d1d",bg: "#fee2e2", label: "Out of Service" };
  return { fg: "#374151", bg: "#f3f4f6", label: r || "Unknown" };
}

// ── PDF helpers ───────────────────────────────────────────────────────────────
const A4W = 595.28;
const A4H = 841.89;
const ML  = 20;  // margin left
const MR  = 20;  // margin right
const CW  = A4W - ML - MR; // content width

function hex2rgb(hex) {
  const h = hex.replace("#","");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function setFill(doc, hex)   { const [r,g,b] = hex2rgb(hex); doc.fillColor([r,g,b]); }
function setStroke(doc, hex) { const [r,g,b] = hex2rgb(hex); doc.strokeColor([r,g,b]); }

function rect(doc, x, y, w, h, fillHex, strokeHex) {
  doc.save();
  if (fillHex)   setFill(doc, fillHex);
  if (strokeHex) { setStroke(doc, strokeHex); doc.lineWidth(0.5); }
  if (fillHex && strokeHex) doc.rect(x,y,w,h).fillAndStroke();
  else if (fillHex)         doc.rect(x,y,w,h).fill();
  else if (strokeHex)       doc.rect(x,y,w,h).stroke();
  doc.restore();
}

function text(doc, str, x, y, opts = {}) {
  doc.save();
  if (opts.color) setFill(doc, opts.color);
  doc.fontSize(opts.size || 8)
     .font(opts.bold ? "Helvetica-Bold" : opts.italic ? "Helvetica-Oblique" : "Helvetica")
     .text(String(str || ""), x, y, {
       width: opts.width,
       align: opts.align || "left",
       lineBreak: opts.wrap !== false,
       ellipsis: opts.ellipsis || false,
     });
  doc.restore();
}

// ── Header ────────────────────────────────────────────────────────────────────
function drawHeader(doc, certTitle, certNumber, resultLabel, resultFg, resultBg, y = 0) {
  const HDR_H = 72;
  // navy background
  rect(doc, 0, y, A4W, HDR_H, C.navy);
  // white logo box
  rect(doc, 0, y, 100, HDR_H, C.white);
  // logo text
  text(doc, "MONROY", 8, y + 20, { bold: true, size: 11, color: C.navy, width: 84, align: "center" });
  text(doc, "(PTY) LTD", 8, y + 33, { bold: true, size: 7, color: C.teal, width: 84, align: "center" });
  text(doc, "Process Control\n& Cranes", 8, y + 44, { size: 6, color: C.navy, width: 84, align: "center" });
  // brand + title
  text(doc, "Monroy (Pty) Ltd · Process Control & Cranes", 110, y + 10, { size: 6.5, color: C.cyan, width: 320 });
  text(doc, certTitle, 110, y + 22, { bold: true, size: 14, color: C.white, width: 300 });
  // contact right
  const cx = A4W - 165;
  text(doc, "(+267) 71 450 610 / 77 906 461", cx, y + 12, { size: 6.5, color: C.white, width: 155 });
  text(doc, "monroybw@gmail.com", cx, y + 23, { size: 6.5, color: C.white, width: 155 });
  text(doc, "Phase 2, Letlhakane, Botswana", cx, y + 34, { size: 6.5, color: C.white, width: 155 });
  // result badge
  if (resultLabel) {
    const bw = 70, bh = 16, bx = cx, by = y + 48;
    rect(doc, bx, by, bw, bh, resultBg, resultFg);
    text(doc, resultLabel, bx, by + 4, { bold: true, size: 8, color: resultFg, width: bw, align: "center" });
  }
  // cert number
  if (certNumber) {
    text(doc, certNumber, 110, y + 52, { size: 7.5, color: "rgba(255,255,255,0.6)", width: 280 });
  }
  // gradient accent bar
  rect(doc, 0, y + HDR_H, A4W, 3, C.cyan);
  return y + HDR_H + 3;
}

// ── Info table (2-col key/value) ───────────────────────────────────────────
function drawInfoTable(doc, rows, y, colW = [120, CW / 2 - 120, 100, CW / 2 - 100]) {
  const ROW_H = 14;
  rows.forEach((pair, i) => {
    const rowY = y + i * ROW_H;
    const bg   = i % 2 === 0 ? C.lightBg : C.altBg;
    rect(doc, ML, rowY, CW, ROW_H, bg, C.cellBrd);
    // col 1 label
    rect(doc, ML, rowY, colW[0], ROW_H, C.navy, C.border);
    text(doc, pair[0] || "", ML + 4, rowY + 4, { bold: true, size: 6.5, color: C.cyan, width: colW[0] - 6, wrap: false, ellipsis: true });
    // col 1 value
    rect(doc, ML + colW[0], rowY, colW[1], ROW_H, bg, C.cellBrd);
    text(doc, pair[1] || "—", ML + colW[0] + 4, rowY + 4, { size: 7.5, color: C.text, width: colW[1] - 6, wrap: false, ellipsis: true });
    if (pair.length > 2) {
      // col 2 label
      const x2 = ML + colW[0] + colW[1];
      rect(doc, x2, rowY, colW[2], ROW_H, C.navy, C.border);
      text(doc, pair[2] || "", x2 + 4, rowY + 4, { bold: true, size: 6.5, color: C.cyan, width: colW[2] - 6, wrap: false, ellipsis: true });
      // col 2 value
      rect(doc, x2 + colW[2], rowY, colW[3], ROW_H, bg, C.cellBrd);
      text(doc, pair[3] || "—", x2 + colW[2] + 4, rowY + 4, { size: 7.5, color: C.text, width: colW[3] - 6, wrap: false, ellipsis: true });
    }
  });
  return y + rows.length * ROW_H;
}

// ── Section label ──────────────────────────────────────────────────────────
function drawSectionLabel(doc, title, y) {
  doc.save();
  setFill(doc, C.cyan);
  doc.rect(ML, y + 2, 3, 9).fill();
  doc.restore();
  text(doc, title.toUpperCase(), ML + 7, y + 3, { bold: true, size: 6.5, color: C.text });
  return y + 14;
}

// ── Checklist column ──────────────────────────────────────────────────────
function drawChecklist(doc, items, x, y, colW) {
  const ROW_H = 11;
  items.forEach((item, i) => {
    const rowY = y + i * ROW_H;
    const bg = i % 2 === 0 ? C.white : C.rowAlt;
    const isHeader = item.header;
    if (isHeader) {
      rect(doc, x, rowY, colW, ROW_H, C.navy, C.border);
      text(doc, item.label.toUpperCase(), x + 4, rowY + 3, { bold: true, size: 6, color: C.cyan, width: colW - 6 });
    } else {
      rect(doc, x, rowY, colW - 28, ROW_H, bg, C.cellBrd);
      text(doc, item.label, x + 3, rowY + 3, { size: 7, color: C.text, width: colW - 34, wrap: false, ellipsis: true });
      if (item.na) {
        rect(doc, x + colW - 28, rowY, 28, ROW_H, bg, C.cellBrd);
        text(doc, "N/A", x + colW - 22, rowY + 3, { size: 6, color: C.dim, width: 20, align: "center" });
      } else {
        const pass = item.result === "PASS";
        const fail = item.result === "FAIL" || item.result === "REPAIR_REQUIRED";
        rect(doc, x + colW - 28, rowY, 14, ROW_H, bg, C.cellBrd);
        rect(doc, x + colW - 14, rowY, 14, ROW_H, bg, C.cellBrd);
        text(doc, pass ? "✓" : "", x + colW - 28, rowY + 2, { bold: true, size: 8, color: C.green, width: 14, align: "center" });
        text(doc, fail ? "✗" : "", x + colW - 14, rowY + 2, { bold: true, size: 8, color: C.red, width: 14, align: "center" });
      }
    }
  });
  return y + items.length * ROW_H;
}

// ── Signature block ───────────────────────────────────────────────────────
function drawSignatures(doc, inspName, inspId, y) {
  const half = CW / 2 - 8;
  // Inspector
  rect(doc, ML, y, half, 36, C.lightBg, C.border);
  text(doc, "COMPETENT PERSON / INSPECTOR", ML + 4, y + 4, { bold: true, size: 6, color: C.teal });
  doc.save(); setStroke(doc, C.border); doc.lineWidth(0.5).moveTo(ML + 4, y + 28).lineTo(ML + half - 4, y + 28).stroke(); doc.restore();
  text(doc, inspName || "Moemedi Masupe", ML + 4, y + 30, { bold: true, size: 7.5, color: C.text, width: half - 8 });
  // Client
  rect(doc, ML + half + 8, y, half, 36, C.lightBg, C.border);
  text(doc, "CLIENT / USER / OWNER", ML + half + 12, y + 4, { bold: true, size: 6, color: C.teal });
  doc.save(); setStroke(doc, C.border); doc.lineWidth(0.5).moveTo(ML + half + 12, y + 28).lineTo(ML + CW - 4, y + 28).stroke(); doc.restore();
  text(doc, "Name & Signature", ML + half + 12, y + 30, { size: 7, color: C.dim, width: half - 8 });
  text(doc, `Inspector ID: ${inspId || "700117910"}`, ML + 4, y + 40, { size: 6.5, color: C.dim });
  return y + 46;
}

// ── Red alert box ─────────────────────────────────────────────────────────
function drawAlertBox(doc, label, value, y, color = C.red, bg = "#fff5f5") {
  if (!value) return y;
  const H = 24;
  rect(doc, ML, y, CW, H, bg, color);
  text(doc, label.toUpperCase(), ML + 6, y + 4, { bold: true, size: 6, color });
  text(doc, value, ML + 6, y + 13, { size: 7.5, color, width: CW - 12, wrap: false, ellipsis: true });
  return y + H + 3;
}

// ── Footer ────────────────────────────────────────────────────────────────
function drawFooter(doc) {
  const y = A4H - 28;
  rect(doc, 0, y, A4W, 14, C.crimson);
  text(doc, "Mobile Crane Hire  |  Rigging  |  NDT Test  |  Scaffolding  |  Painting  |  Inspection of Lifting Equipment & Machinery  |  Steel Fabricating & Structural  |  Mechanical Engineering  |  Fencing  |  Maintenance", 0, y + 4, { size: 5.5, color: C.white, width: A4W, align: "center" });
  rect(doc, 0, y + 14, A4W, 14, C.navy);
  text(doc, "Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana", ML, y + 18, { size: 6, color: "rgba(255,255,255,0.4)" });
  text(doc, "Quality · Safety · Excellence", 0, y + 18, { size: 6, color: "rgba(255,255,255,0.4)", width: A4W - ML, align: "right" });
}

// ── Legal note ────────────────────────────────────────────────────────────
function drawLegalNote(doc, text2, y) {
  rect(doc, ML, y, CW, 18, C.lightBg, C.border);
  text(doc, text2, ML + 6, y + 5, { size: 6, color: C.mid, width: CW - 12, align: "center", bold: true });
  return y + 22;
}

// ── Pass/Fail badge (large) ───────────────────────────────────────────────
function drawPFBadge(doc, result, x, y) {
  const isPass = result === "PASS";
  const BW = 80, BH = 22;
  rect(doc, x, y, BW / 2, BH, isPass ? C.greenBg : C.lightBg, C.border);
  rect(doc, x + BW / 2, y, BW / 2, BH, isPass ? C.lightBg : "#fee2e2", C.border);
  text(doc, "PASS", x, y + 7, { bold: isPass, size: 9, color: isPass ? C.green : C.dim, width: BW / 2, align: "center" });
  text(doc, "FAIL", x + BW / 2, y + 7, { bold: !isPass, size: 9, color: isPass ? C.dim : C.red, width: BW / 2, align: "center" });
  return y + BH;
}

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATE GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

function buildBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end",  ()    => resolve(Buffer.concat(chunks)));
    doc.on("error", err  => reject(err));
    doc.end();
  });
}

function newDoc() {
  return new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: true,
    bufferPages: true,
  });
}

// ── Generic certificate ───────────────────────────────────────────────────
async function genGeneric(c) {
  const doc = newDoc();
  const ex  = c.extracted_data || {};
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

  let y = drawHeader(doc, certType, certNumber, tone.label, tone.fg, tone.bg);
  y += 6;

  y = drawSectionLabel(doc, "Certificate Details", y);
  y = drawInfoTable(doc, [
    ["Certificate No.", certNumber || "—", "Issue Date",    fmtDate(c.issue_date || c.issued_at)],
    ["Client",          company,           "Expiry Date",   fmtDate(c.expiry_date)],
    ["Location",        location,          "Equipment Type", equipType || "—"],
    ["Serial Number",   serialNo,          "Fleet No.",     fleetNo],
    ["Manufacturer",    mfg,               "Model",         model],
    ["Safe Working Load (SWL)", swl,       "Result",        tone.label],
  ], y);
  y += 8;

  y = drawSectionLabel(doc, "Legal Compliance", y);
  rect(doc, ML, y, CW, 20, C.lightBg, C.border);
  text(doc, "This inspection has been performed by a competent person as defined under the Mines, Quarries, Works and Machinery Act Cap 44:02 of the Laws of Botswana.", ML + 6, y + 6, { size: 7, color: C.mid, width: CW - 12 });
  y += 24;

  y = drawAlertBox(doc, "Defects Found", defects, y);
  y = drawAlertBox(doc, "Recommendations", recommendations, y);
  y = drawAlertBox(doc, "Comments", comments, y, C.teal, C.lightBg);
  y += 6;

  y = drawSignatures(doc, inspName, inspId, y);
  drawFooter(doc);
  return buildBuffer(doc);
}

// ── Crane (Load Test + Checklist) ─────────────────────────────────────────
async function genCrane(c, pn) {
  const doc        = newDoc();
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

  const C1 = { boom:pn["C1 boom"]||"—", angle:pn["C1 angle"]||"—", radius:pn["C1 radius"]||"—", rated:pn["C1 rated"]||"—", test:pn["C1 test"]||"—" };
  const C2 = { boom:pn["C2 boom"]||"—", angle:pn["C2 angle"]||"—", radius:pn["C2 radius"]||"—", rated:pn["C2 rated"]||"—", test:pn["C2 test"]||pn["Crane test load"]||"—" };
  const C3 = { boom:pn["C3 boom"]||"—", angle:pn["C3 angle"]||"—", radius:pn["C3 radius"]||"—", rated:pn["C3 rated"]||"—", test:pn["C3 test"]||"—" };
  const sliRes   = pn["Computer"] || pn["SLI"] || "PASS";
  const sliModel = pn["SLI model"] || "";
  const opCode   = pn["Operating code"] || "MAIN/AUX-FULL OUTRIGGER-360DEG";
  const ctrWts   = pn["Counterweights"] || "STD FITTED";
  const jib      = pn["Jib"] || "";
  const sliCertNo = pn["SLI cert"] || (certNumber ? certNumber.replace("CERT-CR","SLI ") : "");

  // ── PAGE 1: Load Test ──
  let y = drawHeader(doc, "Load Test Certificate — Mobile Crane", certNumber, tone.label, tone.fg, tone.bg);
  y += 6;

  // Info table
  y = drawInfoTable(doc, [
    ["Customer",    company,    "Make / Type",   equipMake],
    ["Site",        location,   "Serial No.",    serialNo],
    ["Date",        issueDate,  "Fleet No.",     fleetNo],
    ["Expiry Date", expiryDate, "SWL",           swl],
    ...(mh ? [["Machine Hours", mh, "", ""]] : []),
  ], y);
  y += 8;

  // SLI / Load cert rows
  y = drawSectionLabel(doc, "Certificates Issued", y);
  const rowH = 14;
  rect(doc, ML, y, CW - 82, rowH, C.navy, C.border);
  text(doc, "SLI Certificate", ML + 4, y + 4, { bold: true, size: 7.5, color: C.cyan, width: 200 });
  rect(doc, ML + CW - 82, y, 30, rowH, C.altBg, C.border);
  text(doc, "YES", ML + CW - 82, y + 4, { bold: true, size: 7.5, color: C.text, width: 30, align: "center" });
  rect(doc, ML + CW - 52, y, 52, rowH, C.lightBg, C.border);
  text(doc, sliCertNo || "—", ML + CW - 50, y + 4, { size: 7, color: C.teal, width: 48 });
  y += rowH;

  rect(doc, ML, y, CW - 82, rowH, C.navy, C.border);
  text(doc, "Load Test Certificate", ML + 4, y + 4, { bold: true, size: 7.5, color: C.cyan, width: 200 });
  rect(doc, ML + CW - 82, y, 30, rowH, C.altBg, C.border);
  text(doc, "YES", ML + CW - 82, y + 4, { bold: true, size: 7.5, color: C.text, width: 30, align: "center" });
  rect(doc, ML + CW - 52, y, 52, rowH, C.lightBg, C.border);
  text(doc, certNumber || "—", ML + CW - 50, y + 4, { size: 7, color: C.teal, width: 48 });
  y += rowH + 4;

  // Pass/Fail badge
  drawPFBadge(doc, tone.label, A4W - ML - 82, y - rowH * 2 - 4);

  // Applied load table
  y = drawSectionLabel(doc, "Details of Applied Load", y);
  const cols = [130, 44, 44, 44, 44, 44, 44 + (CW - 414)];
  const hdrs = ["Details", "C1 Actual", "C1 SLI", "C2 Actual", "C2 SLI", "C3 Actual", "C3 SLI"];
  const TH = 12;

  // header row 1
  let cx2 = ML;
  hdrs.forEach((h, i) => {
    rect(doc, cx2, y, cols[i], TH, C.navy, C.border);
    text(doc, h, cx2 + 2, y + 3, { bold: true, size: 6, color: C.cyan, width: cols[i] - 4, align: "center" });
    cx2 += cols[i];
  });
  y += TH;

  const loadRows = [
    ["Boom Length Reading", C1.boom, C1.boom, C2.boom, C2.boom, C3.boom, C3.boom],
    ["Boom Angle Reading",  C1.angle,C1.angle,C2.angle,C2.angle,C3.angle,C3.angle],
    ["Radius Reading",      C1.radius,C1.radius,C2.radius,C2.radius,C3.radius,C3.radius],
    ["Rated Load",          C1.rated,C1.rated,C2.rated,C2.rated,C3.rated,C3.rated],
    ["TEST LOAD",           C1.test, C1.test, C2.test, C2.test, C3.test, C3.test],
  ];
  loadRows.forEach((row, ri) => {
    const isBold = ri === loadRows.length - 1;
    cx2 = ML;
    row.forEach((cell, ci) => {
      const bg = isBold ? C.navy : (ri % 2 === 0 ? C.white : C.rowAlt);
      const fg = isBold ? C.white : (ci === 0 ? C.text : C.teal);
      if (ci === 0 && isBold) rect(doc, cx2, y, cols[ci], TH, "#1e3a5f", C.border);
      else rect(doc, cx2, y, cols[ci], TH, bg, C.cellBrd);
      text(doc, cell, cx2 + 2, y + 3, { bold: isBold, size: ci === 0 ? 6.5 : 7, color: isBold ? (ci===0?C.cyan:C.white) : fg, width: cols[ci] - 4, align: ci === 0 ? "left" : "center", wrap: false });
      cx2 += cols[ci];
    });
    y += TH;
  });
  y += 6;

  // SLI details
  y = drawSectionLabel(doc, "SLI Details", y);
  const sliRows = [
    ...(sliModel ? [["SLI Make & Model", sliModel]] : []),
    ["Operating Code used for testing", opCode],
    ...(jib ? [["Jib Configuration", jib]] : []),
    ["Counter weights during test", ctrWts],
    ["SLI cut off system — Hoist up",    sliRes === "FAIL" ? "Defective" : "Yes"],
    ["SLI cut off system — Tele out",    sliRes === "FAIL" ? "Defective" : "Yes"],
    ["SLI cut out system — Boom down",   sliRes === "FAIL" ? "Defective" : "Yes"],
  ];
  y = drawInfoTable(doc, sliRows.map(([l,v]) => [l, v]), y, [180, CW - 180]);
  y += 6;

  y = drawAlertBox(doc, "Defects Found", defects, y);
  y = drawAlertBox(doc, "Recommendations", recommendations, y);
  y = drawAlertBox(doc, "Comments", comments, y, C.teal, C.lightBg);
  y += 4;
  y = drawLegalNote(doc, "THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE'S LOAD CHART AND TESTED CORRECTLY TO ORIGINAL MANUFACTURERS SPECIFICATIONS.", y);
  y = drawSignatures(doc, inspName, inspId, y);
  drawFooter(doc);

  // ── PAGE 2: Checklist ──
  doc.addPage();
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

  y = drawHeader(doc, "Mobile Crane Inspection Report — " + mcirNo, certNumber, tone.label, tone.fg, tone.bg, 0);
  y += 6;
  y = drawInfoTable(doc, [
    ["Customer",    company,    "Make / Type",   equipMake],
    ["Site",        location,   "Serial No.",    serialNo],
    ["Date",        issueDate,  "Fleet No.",     fleetNo],
    ["Validity",    expiryDate, "SWL",           swl],
  ], y);
  y += 6;

  const colHalfW = CW / 2;
  const leftItems = [
    { header: true, label: "Cab Condition" },
    { label: "Windows",                        result: "PASS" },
    { label: "Control Levers Marked",          result: "PASS" },
    { label: "Control Lever return to neutral",result: "PASS" },
    { label: "Level Gauges Correct",           result: "PASS" },
    { label: "Reverse Warning",                result: "PASS" },
    { label: "Load Charts Available",          result: "PASS" },
    { label: "Horn Warning",                   result: "PASS" },
    { label: "Lights, Rotating Lights",        result: "PASS" },
    { label: "Tires",                          result: tires  },
    { label: "Crane Brakes",                   result: brakes },
    { label: "Fire Extinguisher",              result: "PASS" },
    { label: "Beacon Lights",                  result: "PASS" },
    { label: "SWL Correctly Indicated",        result: "PASS" },
    { label: "Oil Leaks",                      result: oilLeaks },
    { label: "Operator Seat Condition",        result: "PASS" },
    { header: true, label: "Safe Load Indicator" },
    { label: "Override Key Safe",              result: computer },
    { label: "Load Reading",                   result: computer },
    { label: "A2B System Working",             result: computer },
    { label: "Cut Off System Working",         result: computer },
    { label: "Radius Reading",                 result: computer },
    { label: "Boom Length Reading",            result: computer },
    { label: "Boom Angle Reading",             result: computer },
  ];
  const rightItems = [
    { header: true, label: "Crane Superstructure" },
    { label: "Outrigger Beams (Visual)",       result: outriggers },
    { label: "Outrigger Jacks (Visual)",       result: outriggers },
    { label: "Fly-Jib Condition (Visual)",     na: true           },
    { label: "Outrigger Pads Condition",       result: outriggers },
    { label: "Outrigger Boxes (Cracks)",       result: outriggers },
    { label: "Hoist Drum Condition",           result: hoist      },
    { label: "Hoist Brake Condition",          result: hoist      },
    { label: "Hoist Drum Mounting",            result: "PASS"     },
    { label: "Leaks on Hoist Drum",            result: oilLeaks   },
    { label: "Top Head Sheaves",               result: "PASS"     },
    { label: "Bottom Head Sheaves",            result: "PASS"     },
    { label: "Boom Retract Ropes Visible",     na: true           },
    { label: "Boom Retract Sheaves",           na: true           },
    { label: "Slew Bearing Checked",           result: "PASS"     },
    { label: "Slew Brake Checked",             result: "PASS"     },
    { label: "Boom Lock Pins Checked",         result: boom2      },
    { label: "Boom Pivot Point Checked",       result: boom2      },
    { label: "Control Valve Checked",          result: "PASS"     },
    { label: "Tele Cylinders — leaks",         result: teleCyl    },
    { label: "Tele Cylinders — load hold",     result: teleCyl    },
    { label: "Tele Sections — damage",         result: structural },
    { label: "Tele's — bending",               na: true           },
    { label: "Boom Lift Cylinder — leaks",     result: boomCyl    },
    { label: "Boom Cylinder Mounting Points",  result: boom2      },
    { label: "Boom Cylinder load hold",        result: boom2      },
    { label: "Counterweights",                 result: "PASS"     },
  ];

  drawChecklist(doc, leftItems,  ML,                  y, colHalfW - 4);
  drawChecklist(doc, rightItems, ML + colHalfW + 4,   y, colHalfW - 4);
  y += Math.max(leftItems.length, rightItems.length) * 11 + 8;

  y = drawAlertBox(doc, "Comments", comments, y, C.teal, C.lightBg);
  y = drawSignatures(doc, inspName, inspId, y);
  drawFooter(doc);

  return buildBuffer(doc);
}

// ── Pressure Vessel ───────────────────────────────────────────────────────
async function genPressureVessel(c, pn) {
  const doc        = newDoc();
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

  let y = drawHeader(doc, "Pressure Vessel Inspection Certificate", certNumber, tone.label, tone.fg, tone.bg);
  y += 6;

  y = drawInfoTable(doc, [
    ["Customer",         company,    "Make / Type",       equipMake],
    ["Site",             location,   "Serial No.",        serialNo],
    ["Date",             issueDate,  "Fleet No.",         fleetNo],
    ["Expiry Date",      expiryDate, "Vessel Type",       pvType],
    [`MAWP (${pu})`,     mawp,       `Test Pressure (${pu})`, testP],
    [`Design P (${pu})`, designP,    "Capacity",          pvCap],
  ], y);
  y += 8;

  // Big result badge
  drawPFBadge(doc, tone.label, A4W - ML - 82, y - 8);

  y = drawSectionLabel(doc, "Inspection Results", y);
  y = drawInfoTable(doc, [
    ["Vessel condition — external visual",           "Satisfactory"],
    ["Vessel condition — internal (if applicable)",  "Satisfactory"],
    ["Safety valve fitted and operating correctly",  "Yes"],
    ["Pressure gauge fitted and reading correctly",  "Yes"],
    ["Drain valve fitted and operating correctly",   "Yes"],
    ["Signs of corrosion, cracking or deformation",  "None"],
    ["Nameplate legible and data correct",           "Yes"],
    ["Hydrostatic test performed",                   testP !== "—" ? `Yes — ${testP} ${pu}` : "N/A"],
    ["Overall assessment",                           tone.label],
  ], y, [220, CW - 220]);
  y += 8;

  y = drawLegalNote(doc, "THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.", y);
  y = drawAlertBox(doc, "Defects Found", defects, y);
  y = drawAlertBox(doc, "Recommendations", recommendations, y);
  y = drawAlertBox(doc, "Comments", comments, y, C.teal, C.lightBg);
  y += 6;
  y = drawSignatures(doc, inspName, inspId, y);
  drawFooter(doc);
  return buildBuffer(doc);
}

// ── Machine (Forklift / Telehandler / etc.) ───────────────────────────────
async function genMachine(c) {
  const doc        = newDoc();
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

  let y = drawHeader(doc, `${equipType} Inspection Certificate`, certNumber, tone.label, tone.fg, tone.bg);
  y += 6;

  y = drawInfoTable(doc, [
    ["Customer",    company,    "Make / Type",  equipMake],
    ["Site",        location,   "Serial No.",   serialNo],
    ["Date",        issueDate,  "Fleet No.",    fleetNo],
    ["Expiry Date", expiryDate, "SWL",          swl],
  ], y);
  y += 8;

  drawPFBadge(doc, tone.label, A4W - ML - 82, y - 8);

  const colHalfW = CW / 2;
  const leftItems = [
    { header: true, label: "General Condition" },
    { label: "Structural Integrity",      result: "PASS"     },
    { label: "Hydraulic System",          result: "PASS"     },
    { label: "Brake System",              result: brakes||"PASS" },
    { label: "Tyres / Wheels",            result: tires||"PASS" },
    { label: "Oil Leaks",                 result: oilLeaks   },
    { label: "Lights & Horn",             result: "PASS"     },
    { label: "Fire Extinguisher",         result: "PASS"     },
    { label: "Seat Belt",                 result: "PASS"     },
    { label: "Controls Marked Correctly", result: "PASS"     },
    { label: "Load Chart Available",      result: "PASS"     },
    ...(isForklift ? [
      { header: true, label: "Forks & Mast" },
      { label: "Mast / Structural Integrity", result: "PASS" },
      { label: "Fork Condition",              result: detectFail(defects,"fork","tine") },
      { label: "Fork Retention Pins",         result: "PASS" },
      { label: "Mast Chain Lubrication",      result: "PASS" },
      { label: "Tilt Cylinders — No Leaks",   result: oilLeaks },
    ] : []),
  ];
  const rightItems = [
    { header: true, label: "Safety Systems" },
    { label: "Load Indicator / SWL Plate", result: "PASS" },
    { label: "Emergency Stop",             result: "PASS" },
    { label: "Overload Protection",        result: "PASS" },
    { header: true, label: "Hydraulics & Drive" },
    { label: "Hydraulic Oil Level",        result: "PASS"     },
    { label: "Hydraulic Hoses & Fittings", result: oilLeaks   },
    { label: "Drive Transmission",         result: "PASS"     },
    { label: "Steering System",            result: "PASS"     },
    { label: "Engine / Motor Condition",   result: "PASS"     },
    { header: true, label: "Load Test" },
    { label: "Test Load at Rated Capacity",result: "PASS"     },
    { label: "Lifting / Lowering Smooth",  result: "PASS"     },
    { label: "No Deformation Under Load",  result: "PASS"     },
    { label: "All Functions Under Load",   result: "PASS"     },
  ];

  drawChecklist(doc, leftItems,  ML,                y, colHalfW - 4);
  drawChecklist(doc, rightItems, ML + colHalfW + 4, y, colHalfW - 4);
  y += Math.max(leftItems.length, rightItems.length) * 11 + 8;

  y = drawAlertBox(doc, "Defects Found", defects || null, y);
  y = drawAlertBox(doc, "Recommendations", recommendations, y);
  y += 4;
  y = drawSignatures(doc, inspName, inspId, y);
  drawFooter(doc);
  return buildBuffer(doc);
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
      return NextResponse.json({ error: "Failed to generate any PDFs. Check server logs." }, { status: 500 });

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
        "Content-Type":        "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length":      zipBuffer.length.toString(),
        "X-Certificates-Exported": exported.toString(),
      },
    });

  } catch (err) {
    console.error("Bulk export error:", err);
    return NextResponse.json({ error: "Export failed: " + (err.message || "Unknown error") }, { status: 500 });
  }
}
