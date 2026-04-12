// src/app/api/certificates/bulk-export/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ─────────────────────────────────────────────────────────────────
function val(v) { return v && String(v).trim() !== "" ? String(v).trim() : null; }
function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw + (String(raw).includes("T") ? "" : "T00:00:00Z"));
  if (isNaN(d.getTime())) return raw;
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
function resultStyle(r) {
  if (r === "PASS")            return { color: "#15803d", bg: "#dcfce7", brd: "#86efac", label: "PASS" };
  if (r === "FAIL")            return { color: "#b91c1c", bg: "#fee2e2", brd: "#fca5a5", label: "FAIL" };
  if (r === "REPAIR_REQUIRED") return { color: "#b45309", bg: "#fef3c7", brd: "#fcd34d", label: "Repair Required" };
  if (r === "CONDITIONAL")     return { color: "#b45309", bg: "#fef3c7", brd: "#fcd34d", label: "Conditional" };
  if (r === "OUT_OF_SERVICE")  return { color: "#7f1d1d", bg: "#fee2e2", brd: "#fca5a5", label: "Out of Service" };
  return { color: "#374151", bg: "#f3f4f6", brd: "#d1d5db", label: r || "Unknown" };
}
function detectFail(defects, ...kws) {
  if (!defects) return "PASS";
  const d = defects.toLowerCase();
  return kws.some(k => d.includes(k.toLowerCase())) ? "FAIL" : "PASS";
}

// ── HTML building blocks ─────────────────────────────────────────────────────
const TD_LBL = `padding:3px 6px;border:1px solid #c3d4e8;font-weight:700;background:#0b1d3a;color:#4fc3f7;width:80px;white-space:nowrap`;
const TD_VAL = `padding:3px 6px;border:1px solid #c3d4e8;background:#f4f8ff;font-weight:600;color:#0b1d3a`;

function redBox(label, value) {
  if (!value) return "";
  return `<div style="border:1px solid #fca5a5;border-radius:4px;padding:5px 9px;background:#fff5f5;flex-shrink:0;margin-top:3px">
    <div style="font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px">${label}</div>
    <div style="font-size:8.5px;font-weight:700;color:#b91c1c;line-height:1.45">${value}</div>
  </div>`;
}
function commentBox(label, value) {
  if (!value) return "";
  return `<div style="border:1px solid #c3d4e8;border-radius:4px;padding:5px 9px;background:#f4f8ff;flex-shrink:0;margin-top:3px">
    <div style="font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px">${label}</div>
    <div style="font-size:8.5px;color:#334155;line-height:1.5">${value}</div>
  </div>`;
}
function stl(label) {
  return `<div style="font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#0b1d3a;margin:4px 0 2px;padding-left:4px;border-left:3px solid #22d3ee;flex-shrink:0">${label}</div>`;
}
function legalNote(text) {
  return `<div style="font-size:7.5px;color:#4b5563;line-height:1.5;border:1px solid #1e3a5f;border-radius:4px;padding:5px 9px;background:#f4f8ff;text-align:center;font-weight:700;flex-shrink:0;margin-top:3px">${text}</div>`;
}
function gradBar() {
  return `<div style="height:3px;background:linear-gradient(90deg,#22d3ee,#3b82f6 55%,#a78bfa);flex-shrink:0"></div>`;
}
function proHdr() {
  return `<div style="background:#0b1d3a;display:flex;align-items:center;min-height:76px;flex-shrink:0">
    <div style="background:#fff;width:108px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)">
      <div style="font-size:10px;font-weight:900;color:#0b1d3a;text-align:center;line-height:1.2">MONROY<br><span style="font-size:7px;color:#22d3ee">PTY LTD</span></div>
    </div>
    <div style="flex:1;padding:10px 10px 10px 28px">
      <div style="font-size:7.5px;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px;font-weight:800">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
      <div style="font-size:12px;font-weight:900;color:#fff">WE ARE &#9658;&#9658; YOUR SOLUTION</div>
      <div style="font-size:6.5px;color:rgba(255,255,255,0.4);margin-top:3px;line-height:1.45">Mobile Crane Hire · Rigging · NDT Test · Scaffolding · Painting · Inspection of Lifting Equipment and Machinery · Pressure Vessels &amp; Air Receiver · Steel Fabricating and Structural · Mechanical Engineering · Fencing · Maintenance</div>
    </div>
    <div style="padding:8px 12px;display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
      <div style="font-size:7.5px;color:rgba(255,255,255,0.65)">(+267) 71 450 610 / 77 906 461</div>
      <div style="font-size:7.5px;color:rgba(255,255,255,0.65)">monroybw@gmail.com</div>
      <div style="font-size:7.5px;color:rgba(255,255,255,0.65)">Phase 2, Letlhakane</div>
    </div>
  </div>`;
}
function proFooter() {
  return `
    <div style="background:#c41e3a;padding:3px 12px;flex-shrink:0">
      <p style="font-size:6.5px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600">
        <b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment &amp; Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating &amp; Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b>
      </p>
    </div>
    <div style="background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 12px;display:flex;justify-content:space-between;flex-shrink:0">
      <span style="font-size:7px;color:rgba(255,255,255,0.35);font-weight:600">Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
      <span style="font-size:7px;color:rgba(255,255,255,0.35);font-weight:600">Quality · Safety · Excellence</span>
    </div>`;
}
function proSig(inspName, inspId) {
  return `<div style="padding:5px 12px 4px;flex-shrink:0">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <div style="font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px">Competent Person / Inspector</div>
        <div style="border-bottom:1px solid #1e3a5f;min-height:34px;margin-bottom:2px"></div>
        <div style="font-size:8.5px;font-weight:700;color:#0b1d3a">${inspName || "Moemedi Masupe"}</div>
        <div style="font-size:7.5px;color:#64748b">Inspector ID: ${inspId || "700117910"}</div>
      </div>
      <div>
        <div style="font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px">Client / User / Owner</div>
        <div style="border-bottom:1px solid #1e3a5f;min-height:34px;margin-bottom:2px"></div>
        <div style="font-size:7.5px;color:#64748b">Name &amp; Signature</div>
      </div>
    </div>
  </div>`;
}
function proCT(company, location, issueDate, equipMake, serialNo, fleetNo, swl, machineHours) {
  return `<table style="width:100%;border-collapse:collapse;font-size:8.5px;border:1px solid #1e3a5f;flex-shrink:0"><tbody>
    <tr><td style="${TD_LBL}">Customer</td><td style="${TD_VAL}">${company||"—"}</td><td style="${TD_LBL}">Make / Type</td><td style="${TD_VAL}">${equipMake||"—"}</td></tr>
    <tr><td style="${TD_LBL}">Site location</td><td style="${TD_VAL}">${location||"—"}</td><td style="${TD_LBL}">Serial number</td><td style="${TD_VAL}">${serialNo||"—"}</td></tr>
    <tr><td style="${TD_LBL}">Date</td><td style="${TD_VAL}">${issueDate||"—"}</td><td style="${TD_LBL}">Fleet number</td><td style="${TD_VAL}">${fleetNo||"—"}</td></tr>
    <tr><td style="${TD_LBL}"></td><td style="${TD_VAL}"></td><td style="${TD_LBL}">Capacity / SWL</td><td style="${TD_VAL}">${swl||"—"}</td></tr>
    ${machineHours?`<tr><td style="${TD_LBL}"></td><td style="${TD_VAL}"></td><td style="${TD_LBL}">Machine Hours</td><td style="${TD_VAL}">${machineHours}</td></tr>`:""}
  </tbody></table>`;
}
function pfBadge(result) {
  const isPass = result === "PASS";
  return `<div style="border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;display:flex;align-items:center;padding:5px 12px;gap:14px;background:#f4f8ff">
    <span style="color:${isPass?"#15803d":"#9ca3af"};font-size:10px;font-weight:${isPass?900:700};${isPass?"background:#dcfce7;padding:3px 11px;border-radius:3px;border:1px solid #86efac":""}">Pass</span>
    <span style="color:${!isPass?"#b91c1c":"#9ca3af"};font-size:10px;font-weight:${!isPass?900:700};${!isPass?"background:#fee2e2;padding:3px 11px;border-radius:3px;border:1px solid #fca5a5":""}">Fail</span>
  </div>`;
}
function ci(label, result = "PASS", na = false) {
  const pass = result === "PASS";
  const fail = result === "FAIL" || result === "REPAIR_REQUIRED";
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 8px;border-bottom:1px solid #e8f0fb;font-size:7.5px">
    <span style="color:#0b1d3a;font-weight:500;flex:1">${label}</span>
    <div style="display:flex;gap:4px;flex-shrink:0">
      ${na
        ? `<span style="color:#9ca3af;font-size:7px;width:14px;text-align:center">N/A</span>`
        : `<span style="color:#15803d;font-weight:900;font-size:8.5px;width:14px;text-align:center">${pass?"✓":""}</span><span style="color:#b91c1c;font-weight:900;font-size:8.5px;width:14px;text-align:center">${fail?"✗":""}</span>`
      }
    </div>
  </div>`;
}
function csec(title) {
  return `<div style="background:#0b1d3a;color:#4fc3f7;font-size:7px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-bottom:1px solid #22d3ee">${title}</div>`;
}

// ── Page shell ────────────────────────────────────────────────────────────────
function wrapPage(inner) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#e5e7eb;font-family:'IBM Plex Sans',sans-serif;padding:20px;display:flex;flex-direction:column;align-items:center;gap:20px}
  @page{size:A4;margin:0}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{background:#fff!important;padding:0!important;gap:0!important}
    .page{box-shadow:none!important;page-break-after:always;break-after:page;margin:0!important}
  }
</style>
</head><body>
${inner}
<p style="font-size:11px;color:#6b7280;margin-top:8px;text-align:center">To save as PDF: Press <strong>Ctrl+P</strong> → Destination: <strong>Save as PDF</strong> → Paper: <strong>A4</strong> → Margins: <strong>None</strong> → Enable <strong>Background graphics</strong></p>
</body></html>`;
}

function certPage(content) {
  return `<div class="page" style="background:#fff;width:210mm;min-height:297mm;max-height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.18)">
    ${content}
  </div>`;
}

// ── Certificate generators ────────────────────────────────────────────────────

function genCrane(c, pn) {
  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = formatDate(c.issue_date || c.issued_at);
  const expiryDate = formatDate(c.expiry_date);
  const equipMake  = val(c.manufacturer || c.model || c.equipment_type);
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const mh         = val(c.machine_hours || pn["Machine hours"] || pn["Machine Hours"]);
  const defects    = val(c.defects_found);
  const recommendations = val(c.recommendations);
  const comments   = val(c.comments || c.remarks);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const tone       = resultStyle(pickResult(c));

  const C1 = { boom:pn["C1 boom"]||"", angle:pn["C1 angle"]||"", radius:pn["C1 radius"]||"", rated:pn["C1 rated"]||"", test:pn["C1 test"]||"" };
  const C2 = { boom:pn["C2 boom"]||"", angle:pn["C2 angle"]||"", radius:pn["C2 radius"]||"", rated:pn["C2 rated"]||"", test:pn["C2 test"]||pn["Crane test load"]||"" };
  const C3 = { boom:pn["C3 boom"]||"", angle:pn["C3 angle"]||"", radius:pn["C3 radius"]||"", rated:pn["C3 rated"]||"", test:pn["C3 test"]||"" };
  const sliRes    = pn["Computer"] || pn["SLI"] || "PASS";
  const sliModel  = pn["SLI model"] || "";
  const opCode    = pn["Operating code"] || "MAIN/AUX-FULL OUTRIGGER-360DEG";
  const hookReev  = pn["Hook reeving"] || "";
  const ctrWts    = pn["Counterweights"] || "STD FITTED";
  const jib       = pn["Jib"] || "";
  const sliCertNo = pn["SLI cert"] || certNumber?.replace("CERT-CR","SLI ") || "";
  const retractBm = pn["Retract boom"] || C1.boom;

  const structural = pn["Structural"] || "PASS";
  const boom       = pn["Boom"] || "PASS";
  const outriggers = pn["Outriggers"] || "PASS";
  const computer   = pn["Computer"] || "PASS";
  const oilLeaks   = detectFail(defects || "", "oil leak", "leak");
  const tires      = detectFail(defects || "", "tire", "tyre");
  const brakes     = detectFail(defects || "", "brake");
  const hoist      = detectFail(defects || "", "hoist");
  const teleCyl    = detectFail(defects || "", "tele cylinder", "cylinder");
  const boomCyl    = detectFail(defects || "", "boom cylinder", "lift cylinder");
  const mcirNo     = "MCIR " + (c.inspection_number || c.certificate_number?.replace("CERT-CR","") || "");

  const TD  = `padding:2.5px 4px;border:1px solid #c3d4e8;text-align:center;font-weight:600;font-size:8px;background:#fff`;
  const TDL = `padding:2.5px 4px;border:1px solid #c3d4e8;background:#eef4ff;font-weight:700;color:#0b1d3a;text-align:left`;
  const TDK = `padding:2.5px 4px;border:1px solid #1e3a5f;text-align:center;font-weight:900;background:#0b1d3a;color:#fff`;

  const p1 = certPage(`
    ${proHdr()}${gradBar()}
    <div style="flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0">
      ${proCT(company,location,issueDate,equipMake,serialNo,fleetNo,swl,mh)}
      <div style="display:grid;grid-template-columns:1fr auto;gap:6px;flex-shrink:0">
        <div>
          <div style="display:flex;align-items:center;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;margin-bottom:2px">
            <div style="background:#0b1d3a;color:#4fc3f7;font-size:9.5px;font-weight:800;padding:5px 10px;flex:1">SLI Certificate</div>
            <div style="background:#eef4ff;color:#0b1d3a;font-size:9.5px;font-weight:800;padding:5px 10px;width:42px;text-align:center">YES</div>
            ${sliCertNo?`<div style="background:#f4f8ff;color:#0e7490;font-size:8.5px;font-weight:700;padding:5px 10px;font-family:monospace;flex:1">${sliCertNo}</div>`:""}
          </div>
          <div style="display:flex;align-items:center;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;margin-bottom:2px">
            <div style="background:#0b1d3a;color:#4fc3f7;font-size:9.5px;font-weight:800;padding:5px 10px;flex:1">Load Test Certificate</div>
            <div style="background:#eef4ff;color:#0b1d3a;font-size:9.5px;font-weight:800;padding:5px 10px;width:42px;text-align:center">YES</div>
            ${certNumber?`<div style="background:#f4f8ff;color:#0e7490;font-size:8.5px;font-weight:700;padding:5px 10px;font-family:monospace;flex:1">${certNumber}</div>`:""}
          </div>
          ${expiryDate?`<div style="font-size:9px;font-weight:800;color:#0b1d3a;margin-top:3px;border:1px solid #1e3a5f;padding:2px 7px;display:inline-block;border-radius:3px">expire date: ${expiryDate}</div>`:""}
        </div>
        ${pfBadge(tone.label)}
      </div>
      ${stl("Details of Applied Load")}
      <table style="width:100%;border-collapse:collapse;font-size:7.5px;border:1px solid #1e3a5f;flex-shrink:0">
        <thead>
          <tr style="background:#0b1d3a;color:#4fc3f7">
            <th rowspan="2" style="text-align:left;width:130px;padding:3px 4px;border:1px solid #1e3a5f;font-size:7px">Details of applied Load</th>
            <th colspan="2" style="padding:3px 4px;border:1px solid #1e3a5f;text-align:center;font-size:7px">1 — Main (Short Boom)</th>
            <th colspan="2" style="padding:3px 4px;border:1px solid #1e3a5f;text-align:center;font-size:7px">2 — Main (Test Config)</th>
            <th colspan="2" style="padding:3px 4px;border:1px solid #1e3a5f;text-align:center;font-size:7px">3 — Aux / Max Boom</th>
          </tr>
          <tr style="background:#0b1d3a;color:#4fc3f7">
            ${["Actual","SLI","Actual","SLI","Actual","SLI"].map(h=>`<th style="padding:3px 4px;border:1px solid #1e3a5f;text-align:center;font-size:7px">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${[
            ["Boom Length Reading", C1.boom, C2.boom, C3.boom],
            ["Boom Angle Reading",  C1.angle, C2.angle, C3.angle],
            ["Radius Reading",      C1.radius, C2.radius, C3.radius],
            ["Rated Load",         C1.rated, C2.rated, C3.rated],
          ].map(([l,a,b,c2])=>`<tr>
            <td style="${TDL}">${l}</td>
            <td style="${TD}">${a}</td><td style="${TD}">${a}</td>
            <td style="${TD}">${b}</td><td style="${TD}">${b}</td>
            <td style="${TD}">${c2}</td><td style="${TD}">${c2}</td>
          </tr>`).join("")}
          <tr>
            <td style="${TDL.replace("#eef4ff","#1e3a5f").replace("color:#0b1d3a","color:#4fc3f7")};font-weight:900">Test Load</td>
            <td style="${TDK}">${C1.test}</td><td style="${TDK}">${C1.test}</td>
            <td style="${TDK}">${C2.test}</td><td style="${TDK}">${C2.test}</td>
            <td style="${TDK}">${C3.test}</td><td style="${TDK}">${C3.test}</td>
          </tr>
        </tbody>
      </table>
      ${stl("SLI Details")}
      <table style="width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0"><tbody>
        ${sliModel?`<tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a;width:60%">SLI Make &amp; Model</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${sliModel}</td></tr>`:""}
        ${retractBm?`<tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">Retract Boom vs Actual Indicated</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${retractBm}</td></tr>`:""}
        <tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">Operating Code used for testing</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${opCode}</td></tr>
        ${hookReev?`<tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">Hook block Reeving</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${hookReev}</td></tr>`:""}
        ${jib?`<tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">Jib Configuration</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${jib}</td></tr>`:""}
        <tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">Counter weights during test</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${ctrWts}</td></tr>
        <tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">SLI cut off — Hoist up</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
        <tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">SLI cut off — Tele out</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
        <tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a">SLI cut out — Boom down</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${sliRes==="FAIL"?"Defective":"Yes"}</td></tr>
      </tbody></table>
      ${redBox("Defects Found", defects)}
      ${redBox("Recommendations", recommendations)}
      ${commentBox("Comments", comments)}
      ${legalNote("THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE'S LOAD CHART AND TESTED CORRECTLY TO ORIGINAL MANUFACTURERS SPECIFICATIONS.")}
    </div>
    ${proSig(inspName, inspId)}
    ${proFooter()}
  `);

  const p2 = certPage(`
    ${proHdr()}${gradBar()}
    <div style="flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0">
      ${proCT(company,location,issueDate,equipMake,serialNo,fleetNo,swl,mh)}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;border:1px solid #1e3a5f;border-radius:4px;padding:7px 10px;background:#f4f8ff;flex-shrink:0">
        <div>
          ${expiryDate?`<div style="font-size:9px;font-weight:800;color:#0b1d3a;margin-bottom:2px">Validity: ${expiryDate}</div>`:""}
          <div style="font-size:11px;font-weight:900;color:#0b1d3a">${mcirNo}</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px">The mobile crane was inspected with regards to the MQWMR Act CAP 44:02 Under Regulations 2</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;font-size:8px;font-weight:700;color:#0b1d3a">
          <div>Annually: ✓</div><div>Bi-annually:</div><div>Quarterly:</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex:1;min-height:0">
        <div style="border-right:1px solid #1e3a5f;overflow:hidden">
          ${csec("Cab Condition")}
          ${["Windows","Control Levers Marked","Control Lever return to neutral","Level Gauges Correct","Reverse Warning","Load Charts Available","Horn Warning","Lights, Rotating Lights"].map(l=>ci(l,"PASS")).join("")}
          ${ci("Tires",tires)}${ci("Crane Brakes",brakes)}${ci("Fire Extinguisher","PASS")}${ci("Beacon Lights","PASS")}
          ${ci("SWL Correctly Indicated","PASS")}${ci("Oil Leaks",oilLeaks)}${ci("Operator Seat Condition","PASS")}
          ${csec("Safe Load Indicator")}
          ${ci("Override Key Safe",computer)}${ci("Load Reading",computer)}${ci("A2B System Working",computer)}
          ${ci("Cut Off System Working",computer)}${ci("Radius Reading",computer)}${ci("Boom Length Reading",computer)}${ci("Boom Angle Reading",computer)}
        </div>
        <div style="overflow:hidden">
          ${csec("Crane Superstructure")}
          ${ci("Outrigger Beams (Visual)",outriggers)}${ci("Outrigger Jacks (Visual)",outriggers)}
          ${ci("Fly-Jib Condition (Visual)",undefined,true)}${ci("Outrigger Pads Condition",outriggers)}
          ${ci("Outrigger Boxes (Cracks)",outriggers)}${ci("Hoist Drum Condition",hoist)}
          ${ci("Hoist Brake Condition",hoist)}${ci("Hoist Drum Mounting","PASS")}
          ${ci("Leaks on Hoist Drum",oilLeaks)}${ci("Top Head Sheaves","PASS")}
          ${ci("Bottom Head Sheaves","PASS")}${ci("Boom Retract Ropes Visible",undefined,true)}
          ${ci("Boom Retract Sheaves",undefined,true)}${ci("Slew Bearing Checked","PASS")}
          ${ci("Slew Brake Checked","PASS")}${ci("Boom Lock Pins Checked",boom)}
          ${ci("Boom Pivot Point Checked",boom)}${ci("Control Valve Checked","PASS")}
          ${ci("Tele Cylinders — leaks",teleCyl)}${ci("Tele Cylinders — holding under load",teleCyl)}
          ${ci("Tele Sections — damage",structural)}${ci("Tele's — bending",undefined,true)}
          ${ci("Boom Lift Cylinder — leaks",boomCyl)}${ci("Boom Cylinder Mounting Points",boom)}
          ${ci("Boom Cylinder holding under load",boom)}${ci("Counterweights","PASS")}
        </div>
      </div>
      ${commentBox("Comments", comments)}
    </div>
    ${proSig(inspName, inspId)}
    ${proFooter()}
  `);

  return wrapPage(p1 + "\n" + p2);
}

function genPressureVessel(c, pn) {
  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = formatDate(c.issue_date || c.issued_at);
  const expiryDate = formatDate(c.expiry_date);
  const equipMake  = val(c.manufacturer || c.model || c.equipment_type) || "Pressure Vessel";
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const mawp       = val(c.mawp || c.working_pressure || pn["MAWP"]);
  const testP      = val(c.test_pressure || pn["Test pressure"]);
  const designP    = val(c.design_pressure);
  const pvType     = val(c.equipment_description) || "Pressure Vessel";
  const pvCap      = val(c.capacity_volume);
  const defects    = val(c.defects_found);
  const recommendations = val(c.recommendations);
  const comments   = val(c.comments || c.remarks);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const pu         = val(c.pressure_unit || pn.pressure_unit) || "bar";
  const tone       = resultStyle(pickResult(c));
  const TDE = `padding:3px 7px;border:1px solid #c3d4e8;background:#fff`;

  return wrapPage(certPage(`
    ${proHdr()}${gradBar()}
    <div style="flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0">
      ${proCT(company,location,issueDate,equipMake,serialNo,fleetNo,swl)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;flex-shrink:0">
        <div style="border:1px solid #1e3a5f;border-radius:4px;padding:7px 10px;background:#f4f8ff">
          <div style="font-size:12px;font-weight:900;color:#0b1d3a">Pressure Vessel Inspection</div>
          <div style="font-size:10px;font-weight:700;color:#0e7490;margin-top:2px">${certNumber}</div>
          ${expiryDate?`<div style="display:inline-block;border:1px solid #1e3a5f;border-radius:3px;padding:2px 7px;margin-top:4px;font-size:8px;font-weight:700;color:#0b1d3a;background:#fff">Expiry: ${expiryDate}</div>`:""}
        </div>
        <div style="border:2px solid #1e3a5f;border-radius:6px;padding:7px 10px;display:flex;align-items:center;justify-content:space-between;background:#f4f8ff">
          <div><div style="font-size:10px;font-weight:800;color:#0b1d3a">Compliance Certificate</div><div style="font-size:8px;color:#64748b">to be issued</div></div>
          <div style="font-size:26px;color:${tone.label==="PASS"?"#15803d":"#b91c1c"};font-weight:900">${tone.label==="PASS"?"✓":"✗"}</div>
        </div>
      </div>
      ${stl("Pressure Vessel Details")}
      <table style="width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0"><thead>
        <tr style="background:#0b1d3a;color:#4fc3f7">
          ${["Vessel Type",`Serial Number`,`Capacity`,`MAWP (${pu})`,`Test Pressure (${pu})`,`Design Pressure (${pu})`].map(h=>`<th style="padding:3px 7px;text-align:left;border:1px solid #1e3a5f">${h}</th>`).join("")}
        </tr>
      </thead><tbody>
        <tr><td style="${TDE}">${pvType}</td><td style="${TDE};font-family:monospace">${serialNo||"—"}</td><td style="${TDE}">${pvCap||"—"}</td><td style="${TDE};font-weight:700">${mawp||"—"}</td><td style="${TDE};font-weight:700">${testP||"—"}</td><td style="${TDE}">${designP||"—"}</td></tr>
      </tbody></table>
      ${stl("Inspection Results")}
      <table style="width:100%;border-collapse:collapse;font-size:8px;border:1px solid #1e3a5f;flex-shrink:0"><tbody>
        ${[
          ["Vessel condition — external visual","Satisfactory"],
          ["Vessel condition — internal (if applicable)","Satisfactory"],
          ["Safety valve fitted and operating correctly","Yes"],
          ["Pressure gauge fitted and reading correctly","Yes"],
          ["Drain valve fitted and operating correctly","Yes"],
          ["Signs of corrosion, cracking or deformation","None"],
          ["Nameplate legible and data correct","Yes"],
          ["Hydrostatic test performed", testP?`Yes — ${testP} ${pu}`:"N/A"],
          ["Overall assessment",`<span style="font-weight:800;color:${tone.label==="PASS"?"#15803d":"#b91c1c"}">${tone.label}</span>`],
        ].map(([l,v])=>`<tr><td style="padding:3px 7px;border:1px solid #c3d4e8;font-weight:700;background:#eef4ff;color:#0b1d3a;width:60%">${l}</td><td style="padding:3px 7px;border:1px solid #c3d4e8;background:#fff;font-weight:600">${v}</td></tr>`).join("")}
      </tbody></table>
      ${legalNote("THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.")}
      ${redBox("Defects Found", defects)}
      ${redBox("Recommendations", recommendations)}
      ${commentBox("Comments", comments)}
    </div>
    ${proSig(inspName, inspId)}
    ${proFooter()}
  `));
}

function genMachine(c) {
  const certNumber = val(c.certificate_number);
  const company    = val(c.client_name || c.company) || "—";
  const location   = val(c.location) || "—";
  const issueDate  = formatDate(c.issue_date || c.issued_at);
  const expiryDate = formatDate(c.expiry_date);
  const equipType  = val(c.equipment_type) || "Machine";
  const equipMake  = val(c.manufacturer || c.model) || equipType;
  const serialNo   = val(c.serial_number);
  const fleetNo    = val(c.fleet_number);
  const swl        = val(c.swl);
  const defects    = val(c.defects_found) || "";
  const recommendations = val(c.recommendations);
  const inspName   = val(c.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id) || "700117910";
  const tone       = resultStyle(pickResult(c));
  const oilLeaks   = detectFail(defects, "leak", "oil");
  const tires      = detectFail(defects, "tire", "tyre");
  const brakes     = detectFail(defects, "brake");
  const isForklift = /forklift|fork.lift/i.test(equipType);

  return wrapPage(certPage(`
    ${proHdr()}${gradBar()}
    <div style="flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0">
      ${proCT(company,location,issueDate,equipMake,serialNo,fleetNo,swl)}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;border:1px solid #1e3a5f;border-radius:4px;padding:7px 10px;background:#f4f8ff;flex-shrink:0">
        <div>
          ${expiryDate?`<div style="font-size:9px;font-weight:800;color:#0b1d3a;margin-bottom:2px">Validity: ${expiryDate}</div>`:""}
          <div style="font-size:11px;font-weight:900;color:#0b1d3a">${equipType} Inspection — ${certNumber}</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px">Inspected in accordance with MQWMR Act CAP 44:02</div>
        </div>
        ${pfBadge(tone.label)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;flex:1;min-height:0">
        <div style="border-right:1px solid #1e3a5f;overflow:hidden">
          ${csec("General &amp; Cab Condition")}
          ${ci("Structural Integrity","PASS")}${ci("Hydraulic System","PASS")}
          ${ci("Brake System",brakes||"PASS")}${ci("Tyres / Wheels",tires||"PASS")}
          ${ci("Oil Leaks",oilLeaks)}${ci("Lights &amp; Horn","PASS")}
          ${ci("Fire Extinguisher","PASS")}${ci("Seat Belt","PASS")}
          ${ci("Controls Marked Correctly","PASS")}${ci("Load Chart Available","PASS")}
          ${isForklift?`${csec("Forks &amp; Mast")}${ci("Mast / Structural Integrity","PASS")}${ci("Fork Condition",detectFail(defects,"fork","tine"))}${ci("Fork Retention Pins","PASS")}${ci("Mast Chain Lubrication","PASS")}${ci("Tilt Cylinders — No Leaks",oilLeaks)}`:""}
        </div>
        <div style="overflow:hidden">
          ${csec("Safety Systems")}
          ${ci("Load Indicator / SWL Plate","PASS")}${ci("Emergency Stop","PASS")}${ci("Overload Protection","PASS")}
          ${csec("Hydraulics &amp; Drive")}
          ${ci("Hydraulic Oil Level","PASS")}${ci("Hydraulic Hoses &amp; Fittings",oilLeaks)}
          ${ci("Drive Transmission","PASS")}${ci("Steering System","PASS")}${ci("Engine / Motor Condition","PASS")}
          ${csec("Load Test")}
          ${ci("Test Load Applied at Rated Capacity","PASS")}${ci("Lifting / Lowering Smooth","PASS")}
          ${ci("No Deformation Under Load","PASS")}${ci("All Functions Operate Under Load","PASS")}
        </div>
      </div>
      ${redBox("Defects Found", defects)}
      ${redBox("Recommendations", recommendations)}
    </div>
    ${proSig(inspName, inspId)}
    ${proFooter()}
  `));
}

function genGeneric(c) {
  const ex         = c.extracted_data || {};
  const certNumber = val(c.certificate_number);
  const equipType  = val(c.equipment_type || c.asset_type || ex.equipment_type);
  const rawType    = String(equipType || "").toLowerCase();
  const isLifting  = /lift|hoist|crane|sling|chain|shackle|hook|rope|rigging|winch|pulley|block/i.test(rawType);
  const isPressure = /pressure|vessel|boiler|autoclave|receiver|compressor|tank|cylinder/i.test(rawType);
  const certType   = val(c.certificate_type || ex.certificate_type) || (isLifting ? "Load Test Certificate" : isPressure ? "Pressure Test Certificate" : "Certificate of Inspection");
  const issueDate  = formatDate(c.issue_date || c.issued_at || ex.issue_date);
  const expiryDate = formatDate(c.expiry_date || c.valid_to || ex.expiry_date);
  const company    = val(c.company || c.client_name || ex.client_name) || "Monroy (Pty) Ltd";
  const location   = val(c.equipment_location || c.location || ex.equipment_location);
  const equipDesc  = val(c.equipment_description || c.asset_name || ex.equipment_description);
  const serialNo   = val(c.serial_number || ex.serial_number);
  const fleetNo    = val(c.fleet_number || ex.fleet_number);
  const mfg        = val(c.manufacturer || ex.manufacturer);
  const model      = val(c.model || ex.model);
  const swl        = val(c.swl || ex.swl || c.safe_working_load);
  const mawp       = val(c.mawp || ex.mawp || c.working_pressure);
  const capacity   = val(c.capacity || ex.capacity || c.capacity_volume);
  const testP      = val(c.test_pressure || ex.test_pressure);
  const inspName   = val(c.inspector_name || ex.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id || ex.inspector_id) || "700117910";
  const defects    = val(c.defects_found || ex.defects_found);
  const recommendations = val(c.recommendations || ex.recommendations);
  const comments   = val(c.comments || ex.comments || c.remarks || ex.remarks);
  const pu         = val(c.pressure_unit || ex.pressure_unit) || "bar";
  const tone       = resultStyle(pickResult(c));

  function field(label, value, opts = {}) {
    if (!value) return "";
    return `<div style="padding:3px 10px;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;background:${opts.alt?"#eef4ff":"#f4f8ff"};${opts.full?"grid-column:1/-1;":""}">
      <div style="font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:1px">${label}</div>
      <div style="font-size:10px;font-weight:600;color:#0b1d3a;line-height:1.25;${opts.mono?"font-family:monospace;font-size:9px;color:#0e7490;":""}">${value}</div>
    </div>`;
  }

  function sec(title, rows) {
    const inner = rows.filter(Boolean).join("");
    if (!inner) return "";
    return `<div style="border:1px solid #1e3a5f;border-radius:5px;overflow:hidden;flex-shrink:0">
      <div style="background:#0b1d3a;border-bottom:1px solid #22d3ee;padding:3px 10px;font-size:7.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7">${title}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${inner}</div>
    </div>`;
  }

  return wrapPage(certPage(`
    <div style="background:#0b1d3a;display:flex;align-items:stretch;min-height:90px;flex-shrink:0">
      <div style="background:#fff;width:110px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:8px">
        <div style="font-size:10px;font-weight:900;color:#0b1d3a;text-align:center">MONROY<br><span style="font-size:7px;color:#22d3ee">PTY LTD</span></div>
      </div>
      <div style="flex:1;padding:12px 12px 12px 32px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:7.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:3px">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
        <div style="font-size:17px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.1;margin-bottom:3px">${certType}</div>
        <div style="font-size:8.5px;color:rgba(255,255,255,0.50)">${company} · ${location||"Botswana"}${fleetNo?` · ${fleetNo}`:""}</div>
      </div>
      <div style="padding:12px 16px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px;flex-shrink:0">
        <span style="font-size:10px;font-weight:900;padding:4px 12px;border-radius:99px;letter-spacing:.10em;text-transform:uppercase;background:${tone.bg};color:${tone.color};border:1px solid ${tone.brd}">${tone.label}</span>
        ${certNumber?`<div style="font-family:monospace;font-size:9px;font-weight:600;color:rgba(255,255,255,0.50)">${certNumber}</div>`:""}
      </div>
    </div>
    ${gradBar()}
    <div style="flex:1;padding:5px 16px 0;display:flex;flex-direction:column;gap:4px;overflow:hidden;min-height:0">
      ${sec("Certificate Details",[field("Certificate Number",certNumber,{mono:true}),field("Issue Date",issueDate),field("Expiry / Next Inspection",expiryDate)])}
      ${sec("Client &amp; Location",[field("Client / Company",company),field("Location",location),field("Certificate Type",certType)])}
      ${sec("Equipment",[field("Description",equipDesc,{full:true}),field("Type",equipType),field("Serial Number",serialNo,{mono:true}),field("Manufacturer",mfg),field("Model",model)])}
      ${sec("Technical Data",[swl?field("Safe Working Load",swl):"",mawp?field("Working Pressure",`${mawp} ${pu}`):"",capacity?field("Capacity",capacity):"",testP?field("Test Pressure",`${testP} ${pu}`):""]) }
      ${sec("Legal Compliance",[`<div style="padding:4px 10px;grid-column:1/-1;background:#f4f8ff"><div style="font-size:8px;color:#4b5563;line-height:1.4">This inspection has been performed by a <strong>competent person</strong> as defined under the <strong>Mines, Quarries, Works and Machinery Act Cap 44:02</strong> of the Laws of Botswana.</div></div>`])}
      ${redBox("Defects Found",defects)}${redBox("Recommendations",recommendations)}${commentBox("Comments",comments)}
    </div>
    ${proSig(inspName, inspId)}
    <div style="background:#c41e3a;padding:3px 16px;flex-shrink:0"><p style="font-size:7px;color:#fff;margin:0;line-height:1.4;text-align:center;font-weight:600">Mobile Crane Hire | Rigging | NDT Test | Scaffolding | Painting | Inspection of Lifting Equipment &amp; Machinery | Steel Fabricating &amp; Structural | Mechanical Engineering | Fencing | Maintenance</p></div>
    <div style="background:#0b1d3a;border-top:2px solid #22d3ee;padding:3px 16px;display:flex;justify-content:space-between;flex-shrink:0">
      <span style="font-size:7px;color:rgba(255,255,255,0.35);font-weight:600">Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
      <span style="font-size:7px;color:rgba(255,255,255,0.35);font-weight:600">Quality · Safety · Excellence</span>
    </div>
  `));
}

// ── Route handler ─────────────────────────────────────────────────────────────
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
      return NextResponse.json(
        { error: "No certificates match the selected filters." },
        { status: 404 }
      );

    const zip = new JSZip();

    for (const cert of certs) {
      try {
        const rawType = String(cert.equipment_type || "").toLowerCase();
        const pn = parseNotes(val(cert.notes || "") || "");

        let html;
        if (/mobile.crane|^crane/i.test(rawType) && !/hook|sling|cherry|telehandler|forklift/i.test(rawType)) {
          html = genCrane(cert, pn);
        } else if (/pressure.vessel|air.receiver|boiler/i.test(rawType)) {
          html = genPressureVessel(cert, pn);
        } else if (/forklift|fork.lift|telehandler|cherry.picker|tlb|frontloader/i.test(rawType)) {
          html = genMachine(cert);
        } else {
          html = genGeneric(cert);
        }

        const clientFolder = (cert.client_name || "Unknown")
          .replace(/[^a-zA-Z0-9_\- ]/g, "_").trim();

        const safeDate = (cert.inspection_date || cert.issue_date || "NoDate")
          .replace(/-/g, "");

        const safeCertNum = (cert.certificate_number || cert.id)
          .toString().replace(/[^a-zA-Z0-9_-]/g, "_");

        zip.file(`${clientFolder}/${safeDate}_${safeCertNum}.html`, html);
      } catch (e) {
        console.error(`Skipped cert ${cert.certificate_number || cert.id}:`, e.message);
      }
    }

    zip.file("HOW_TO_SAVE_AS_PDF.txt",
      `MONROY QMS — CERTIFICATE EXPORT\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Total certificates: ${certs.length}\n\n` +
      `TO SAVE EACH CERTIFICATE AS PDF:\n` +
      `  1. Open the .html file in Google Chrome or Microsoft Edge\n` +
      `  2. Press Ctrl+P  (Mac: Cmd+P)\n` +
      `  3. Destination  →  Save as PDF\n` +
      `  4. Paper size   →  A4\n` +
      `  5. Margins      →  None\n` +
      `  6. Tick "Background graphics"\n` +
      `  7. Click Save\n\n` +
      `The certificate will be pixel-perfect — same as the on-screen view.\n`
    );

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
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": zipBuffer.length.toString(),
        "X-Certificates-Exported": certs.length.toString(),
      },
    });

  } catch (err) {
    console.error("Bulk export error:", err);
    return NextResponse.json(
      { error: "Export failed: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
