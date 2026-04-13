// src/app/api/certificates/generate-pdf/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Cache images per cold start
let _logoBytes = null;
let _sigBytes  = null;
async function getLogoBytes() {
  if (_logoBytes) return _logoBytes;
  try {
    const res = await fetch(`${APP_URL}/logo.png`);
    if (res.ok) _logoBytes = new Uint8Array(await res.arrayBuffer());
  } catch {}
  return _logoBytes;
}
async function getSigBytes() {
  if (_sigBytes) return _sigBytes;
  try {
    for (const path of ["/Signature.png", "/Signature.jpg", "/Signature.jpeg", "/Signature"]) {
      const res = await fetch(`${APP_URL}${path}`);
      if (res.ok) { _sigBytes = new Uint8Array(await res.arrayBuffer()); break; }
    }
  } catch {}
  return _sigBytes;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function v(x) { return x && String(x).trim() !== "" ? String(x).trim() : null; }
function fmtDate(raw) {
  if (!raw) return "—";
  const d = new Date(String(raw).includes("T") ? raw : raw + "T00:00:00Z");
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric", timeZone:"UTC" });
}
function pickResult(c) { return (v(c?.result) || "PASS").toUpperCase(); }
function resultColors(r) {
  if (r === "PASS")            return { fg:rgb(0.08,0.50,0.24), bg:rgb(0.86,0.99,0.91), label:"PASS" };
  if (r === "FAIL")            return { fg:rgb(0.73,0.11,0.11), bg:rgb(0.99,0.89,0.89), label:"FAIL" };
  if (r === "REPAIR_REQUIRED") return { fg:rgb(0.71,0.33,0.03), bg:rgb(0.99,0.95,0.78), label:"Repair Required" };
  if (r === "CONDITIONAL")     return { fg:rgb(0.71,0.33,0.03), bg:rgb(0.99,0.95,0.78), label:"Conditional" };
  return { fg:rgb(0.22,0.25,0.31), bg:rgb(0.95,0.96,0.96), label:r || "Unknown" };
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

// ── colours ───────────────────────────────────────────────────────────────────
const NAVY   = rgb(0.04,0.11,0.23);
const CYAN   = rgb(0.13,0.83,0.93);
const TEAL   = rgb(0.05,0.46,0.56);
const LIGHT  = rgb(0.96,0.97,1.00);
const ALT    = rgb(0.93,0.96,1.00);
const CELLBR = rgb(0.76,0.83,0.91);
const TXTDK  = rgb(0.04,0.11,0.23);
const TXTMD  = rgb(0.20,0.25,0.35);
const GREEN  = rgb(0.08,0.50,0.24);
const RED    = rgb(0.73,0.11,0.11);
const CRIMSON= rgb(0.77,0.12,0.23);
const WHITE  = rgb(1,1,1);
const BORDER = rgb(0.12,0.23,0.37);

const PW = 595.28, PH = 841.89, ML = 20, CW = PW - ML * 2;

// ── draw helpers ──────────────────────────────────────────────────────────────
const fr  = (page,x,y,w,h,color)         => page.drawRectangle({x,y:PH-y-h,width:w,height:h,color});
const fsr = (page,x,y,w,h,fill,stroke,lw=0.5) => page.drawRectangle({x,y:PH-y-h,width:w,height:h,color:fill,borderColor:stroke,borderWidth:lw});
function dt(page,str,x,y,{font,size=8,color=TXTDK,maxWidth,align="left"}={}) {
  if (!str||!font) return;
  let s=String(str);
  if (maxWidth) { while(s.length>1&&font.widthOfTextAtSize(s,size)>maxWidth)s=s.slice(0,-1); if(s!==String(str))s=s.slice(0,-1)+"…"; }
  let tx=x;
  if (align==="center"&&maxWidth) tx=x+(maxWidth-font.widthOfTextAtSize(s,size))/2;
  if (align==="right"&&maxWidth)  tx=x+maxWidth-font.widthOfTextAtSize(s,size);
  page.drawText(s,{x:tx,y:PH-y-size,font,size,color});
}
const hl = (page,x1,y,x2,color=BORDER,lw=0.5) => page.drawLine({start:{x:x1,y:PH-y},end:{x:x2,y:PH-y},color,thickness:lw});

function drawHeader(page,F,imgLogo,title,certNo,tone) {
  const H=70;
  fr(page,0,0,PW,H,NAVY);
  fr(page,0,0,92,H,WHITE);
  if (imgLogo) {
    const {width:lw,height:lh}=imgLogo.scale(1);
    const sc=Math.min(80/lw,56/lh);
    page.drawImage(imgLogo,{x:(92-lw*sc)/2,y:PH-H+(H-lh*sc)/2,width:lw*sc,height:lh*sc});
  } else {
    dt(page,"MONROY",4,16,{font:F.bold,size:11,color:NAVY,maxWidth:84,align:"center"});
    dt(page,"(PTY) LTD",4,29,{font:F.bold,size:7,color:TEAL,maxWidth:84,align:"center"});
    dt(page,"Process Control & Cranes",4,40,{font:F.reg,size:5.5,color:NAVY,maxWidth:84,align:"center"});
  }
  dt(page,"Monroy (Pty) Ltd  ·  Process Control & Cranes",102,10,{font:F.reg,size:6.5,color:CYAN,maxWidth:300});
  dt(page,title,102,22,{font:F.bold,size:13,color:WHITE,maxWidth:290});
  const cx=PW-170;
  dt(page,"(+267) 71 450 610 / 77 906 461",cx,12,{font:F.reg,size:6.5,color:WHITE,maxWidth:160});
  dt(page,"monroybw@gmail.com",cx,22,{font:F.reg,size:6.5,color:WHITE,maxWidth:160});
  dt(page,"Phase 2, Letlhakane, Botswana",cx,32,{font:F.reg,size:6.5,color:WHITE,maxWidth:160});
  fsr(page,cx,46,72,16,tone.bg,tone.fg);
  dt(page,tone.label,cx,48,{font:F.bold,size:8,color:tone.fg,maxWidth:72,align:"center"});
  if (certNo) dt(page,certNo,102,52,{font:F.reg,size:7.5,color:CELLBR,maxWidth:260});
  fr(page,0,H,PW,3,CYAN);
  return H+3;
}

function drawFooter(page,F) {
  fr(page,0,PH-28,PW,14,CRIMSON);
  page.drawText("Mobile Crane Hire  |  Rigging  |  NDT Test  |  Scaffolding  |  Painting  |  Inspection of Lifting Equipment  |  Steel Fabricating  |  Mechanical Engineering  |  Fencing  |  Maintenance",{x:ML,y:21,font:F.reg,size:5.5,color:WHITE,maxWidth:CW});
  fr(page,0,PH-14,PW,14,NAVY);
  page.drawText("Monroy (Pty) Ltd  ·  Mophane Avenue, Maun, Botswana",{x:ML,y:5,font:F.reg,size:6,color:CELLBR});
  page.drawText("Quality  ·  Safety  ·  Excellence",{x:PW-160,y:5,font:F.reg,size:6,color:CELLBR});
}

function drawInfoTable(page,F,rows,y,colWidths) {
  const RH=14;
  const [lw1,lw2,lw3,lw4]=colWidths||[110,CW/2-110,110,CW/2-110];
  rows.forEach((row,i)=>{
    const ry=y+i*RH, bg=i%2===0?LIGHT:ALT;
    fsr(page,ML,ry,lw1,RH,NAVY,BORDER);
    dt(page,row[0]||"",ML+3,ry+4,{font:F.bold,size:6.5,color:CYAN,maxWidth:lw1-5});
    fsr(page,ML+lw1,ry,lw2,RH,bg,CELLBR);
    dt(page,row[1]||"—",ML+lw1+3,ry+4,{font:F.reg,size:7.5,color:TXTDK,maxWidth:lw2-5});
    if (row.length>2) {
      const x2=ML+lw1+lw2;
      fsr(page,x2,ry,lw3,RH,NAVY,BORDER);
      dt(page,row[2]||"",x2+3,ry+4,{font:F.bold,size:6.5,color:CYAN,maxWidth:lw3-5});
      fsr(page,x2+lw3,ry,lw4,RH,bg,CELLBR);
      dt(page,row[3]||"—",x2+lw3+3,ry+4,{font:F.reg,size:7.5,color:TXTDK,maxWidth:lw4-5});
    }
  });
  return y+rows.length*RH;
}

function drawSection(page,F,title,y) {
  fr(page,ML,y+2,3,9,CYAN);
  dt(page,title.toUpperCase(),ML+8,y+3,{font:F.bold,size:6.5,color:TXTDK});
  return y+14;
}

function drawSignatures(page,F,imgSig,inspName,inspId,y) {
  const half=CW/2-6;
  fsr(page,ML,y,half,38,LIGHT,BORDER);
  dt(page,"COMPETENT PERSON / INSPECTOR",ML+4,y+4,{font:F.bold,size:6,color:TEAL});
  if (imgSig) {
    const {width:sw,height:sh}=imgSig.scale(1);
    const sc=Math.min((half-10)/sw,28/sh);
    page.drawImage(imgSig,{x:ML+5,y:PH-y-32,width:sw*sc,height:sh*sc});
  } else {
    hl(page,ML+4,y+28,ML+half-4);
  }
  dt(page,inspName||"Moemedi Masupe",ML+4,y+30,{font:F.bold,size:7.5,color:TXTDK,maxWidth:half-8});
  dt(page,"Inspector ID: "+(inspId||"700117910"),ML+4,y+40,{font:F.reg,size:6.5,color:TXTMD});
  const x2=ML+half+8;
  fsr(page,x2,y,half,38,LIGHT,BORDER);
  dt(page,"CLIENT / USER / OWNER",x2+4,y+4,{font:F.bold,size:6,color:TEAL});
  hl(page,x2+4,y+28,x2+half-4);
  dt(page,"Name & Signature",x2+4,y+30,{font:F.reg,size:7,color:TXTMD});
  return y+46;
}

function drawAlertBox(page,F,label,value,y,fg=RED,bg=rgb(1,0.96,0.96)) {
  if (!value) return y;
  fsr(page,ML,y,CW,26,bg,fg);
  dt(page,label.toUpperCase(),ML+5,y+4,{font:F.bold,size:6,color:fg});
  dt(page,value,ML+5,y+13,{font:F.reg,size:7.5,color:fg,maxWidth:CW-10});
  return y+29;
}

function drawLegal(page,F,txt,y) {
  fsr(page,ML,y,CW,18,LIGHT,BORDER);
  dt(page,txt,ML+5,y+5,{font:F.bold,size:5.5,color:TXTMD,maxWidth:CW-10,align:"center"});
  return y+22;
}

function drawPFBadge(page,F,result,x,y) {
  const isPass=result==="PASS", half=40;
  fsr(page,x,y,half,20,isPass?rgb(0.86,0.99,0.91):LIGHT,BORDER);
  fsr(page,x+half,y,half,20,isPass?LIGHT:rgb(0.99,0.89,0.89),BORDER);
  dt(page,"PASS",x,y+6,{font:isPass?F.bold:F.reg,size:9,color:isPass?GREEN:CELLBR,maxWidth:half,align:"center"});
  dt(page,"FAIL",x+half,y+6,{font:isPass?F.reg:F.bold,size:9,color:isPass?CELLBR:RED,maxWidth:half,align:"center"});
}

// ── Main PDF generator ────────────────────────────────────────────────────────
async function generatePDF(cert, logoBytes, sigBytes) {
  const pdfDoc = await PDFDocument.create();
  const F = {
    reg:  await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let imgLogo=null, imgSig=null;
  if (logoBytes) { try { imgLogo=await pdfDoc.embedPng(logoBytes); } catch { try { imgLogo=await pdfDoc.embedJpg(logoBytes); } catch {} } }
  if (sigBytes)  { try { imgSig =await pdfDoc.embedPng(sigBytes);  } catch { try { imgSig =await pdfDoc.embedJpg(sigBytes);  } catch {} } }

  const pn         = parseNotes(v(cert.notes)||"");
  const certNo     = v(cert.certificate_number);
  const company    = v(cert.client_name)||"—";
  const location   = v(cert.location)||"—";
  const issueDate  = fmtDate(cert.issue_date||cert.issued_at);
  const expiryDate = fmtDate(cert.expiry_date);
  const equipMake  = v(cert.manufacturer)||v(cert.model)||v(cert.equipment_type)||"—";
  const serialNo   = v(cert.serial_number)||"—";
  const fleetNo    = v(cert.fleet_number)||"—";
  const swl        = v(cert.swl)||"—";
  const defects    = v(cert.defects_found);
  const recs       = v(cert.recommendations);
  const comments   = v(cert.comments||cert.remarks);
  const inspName   = v(cert.inspector_name)||"Moemedi Masupe";
  const inspId     = v(cert.inspector_id)||"700117910";
  const rawType    = String(cert.equipment_type||"").toLowerCase();
  const tone       = resultColors(pickResult(cert));

  const isCrane    = /mobile.crane|^crane/i.test(rawType);
  const isLifting  = /crane|sling|hook|rope|hoist|rigging|shackle|chain|beam|spreader|harness|lanyard|winch|block|swivel|fork|telehandler|cherry|scissor/i.test(rawType);
  const isPressure = /pressure|vessel|boiler|autoclave|receiver|compressor/i.test(rawType);
  const isHorse    = /horse|trailer|prime.mover/i.test(rawType);

  const title = isCrane    ? "Load Test Certificate — Mobile Crane"
    : isPressure ? "Pressure Vessel Inspection Certificate"
    : isHorse    ? "Vehicle Registration Certificate"
    : isLifting  ? `${cert.equipment_type||"Lifting Equipment"} Inspection Certificate`
    : `${cert.equipment_type||"Equipment"} Inspection Certificate`;

  const page = pdfDoc.addPage([PW,PH]);
  let y = drawHeader(page,F,imgLogo,title,certNo,tone);
  y += 6;

  y = drawInfoTable(page,F,[
    ["Customer",      company,    "Make / Type",    equipMake],
    ["Site",          location,   "Serial No.",     serialNo],
    ["Issue Date",    issueDate,  "Fleet No.",      fleetNo],
    ["Expiry Date",   expiryDate, "SWL / Capacity", swl],
    ["Equipment Type",v(cert.equipment_type)||"—","Certificate No.",certNo||"—"],
    ["Inspector",     inspName,   "Inspector ID",   inspId],
  ],y);
  y += 8;
  drawPFBadge(page,F,tone.label,PW-ML-82,y-8);

  // Pressure vessel section
  if (isPressure) {
    const mawp  = v(cert.mawp||cert.working_pressure||pn["MAWP"])||"—";
    const testP = v(cert.test_pressure||pn["Test pressure"])||"—";
    const pu    = v(cert.pressure_unit||pn.pressure_unit)||"bar";
    y = drawSection(page,F,"Pressure Vessel Details",y);
    y = drawInfoTable(page,F,[
      [`MAWP (${pu})`,mawp,`Test Pressure (${pu})`,testP],
      ["Vessel Type",v(cert.equipment_description)||"—","Capacity",v(cert.capacity_volume)||"—"],
    ],y,[110,CW/2-110,110,CW/2-110]);
    y += 6;
    y = drawSection(page,F,"Inspection Results",y);
    y = drawInfoTable(page,F,[
      ["External visual condition","Satisfactory"],
      ["Safety valve fitted & operating","Yes"],
      ["Pressure gauge fitted & reading","Yes"],
      ["Signs of corrosion / deformation","None"],
      ["Hydrostatic test performed",testP!=="—"?`Yes — ${testP} ${pu}`:"N/A"],
      ["Overall assessment",tone.label],
    ],y,[230,CW-230]);
    y += 6;
    y = drawLegal(page,F,"THIS PRESSURE VESSEL HAS BEEN INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.",y);
  }

  // Crane load test section
  if (isCrane) {
    y = drawSection(page,F,"Details of Applied Load",y);
    const C1={boom:pn["C1 boom"]||"—",angle:pn["C1 angle"]||"—",radius:pn["C1 radius"]||"—",rated:pn["C1 rated"]||"—",test:pn["C1 test"]||"—"};
    const C2={boom:pn["C2 boom"]||"—",angle:pn["C2 angle"]||"—",radius:pn["C2 radius"]||"—",rated:pn["C2 rated"]||"—",test:pn["C2 test"]||pn["Crane test load"]||"—"};
    const C3={boom:pn["C3 boom"]||"—",angle:pn["C3 angle"]||"—",radius:pn["C3 radius"]||"—",rated:pn["C3 rated"]||"—",test:pn["C3 test"]||"—"};
    const cols=[130,50,50,50,50,55,CW-385];
    const hdrs=["Detail","C1 Actual","C1 SLI","C2 Actual","C2 SLI","C3 Actual","C3 SLI"];
    let cx=ML;
    hdrs.forEach((h,i)=>{ fsr(page,cx,y,cols[i],12,NAVY,BORDER); dt(page,h,cx+2,y+2,{font:F.bold,size:5.5,color:CYAN,maxWidth:cols[i]-4,align:"center"}); cx+=cols[i]; });
    y+=12;
    [["Boom Length",C1.boom,C1.boom,C2.boom,C2.boom,C3.boom,C3.boom],["Boom Angle",C1.angle,C1.angle,C2.angle,C2.angle,C3.angle,C3.angle],["Radius",C1.radius,C1.radius,C2.radius,C2.radius,C3.radius,C3.radius],["Rated Load",C1.rated,C1.rated,C2.rated,C2.rated,C3.rated,C3.rated],["TEST LOAD",C1.test,C1.test,C2.test,C2.test,C3.test,C3.test]].forEach((row,ri)=>{
      const bold=ri===4; cx=ML;
      row.forEach((cell,ci)=>{
        const bg=bold?(ci===0?rgb(0.12,0.23,0.37):NAVY):(ri%2===0?WHITE:rgb(0.97,0.98,1));
        fsr(page,cx,y,cols[ci],12,bg,bold?BORDER:CELLBR);
        dt(page,cell,cx+2,y+2,{font:bold?F.bold:F.reg,size:ci===0?6:7,color:bold?(ci===0?CYAN:WHITE):(ci===0?TXTDK:TEAL),maxWidth:cols[ci]-4,align:ci===0?"left":"center"});
        cx+=cols[ci];
      });
      y+=12;
    });
    y+=4;
    y=drawLegal(page,F,"THE SAFE LOAD INDICATOR HAS BEEN COMPARED TO THE CRANE LOAD CHART AND TESTED TO ORIGINAL MANUFACTURERS SPECIFICATIONS.",y);
  }

  // Generic lifting
  if (isLifting && !isCrane) {
    y = drawSection(page,F,"Inspection Results",y);
    y = drawInfoTable(page,F,[
      ["Visual inspection","Satisfactory"],
      ["SWL marking","Legible and correct"],
      ["Structural integrity","No cracks or deformation"],
      ["Condition of fittings","Good"],
      ["Overall assessment",tone.label],
    ],y,[230,CW-230]);
    y+=6;
    y=drawLegal(page,F,"INSPECTED IN ACCORDANCE WITH THE MINES, QUARRIES, WORKS AND MACHINERY ACT CAP 44:02 OF THE LAWS OF BOTSWANA.",y);
  }

  y = drawAlertBox(page,F,"Defects Found",defects,y);
  y = drawAlertBox(page,F,"Recommendations",recs,y);
  if (comments) {
    fsr(page,ML,y,CW,26,LIGHT,CELLBR);
    dt(page,"COMMENTS",ML+5,y+4,{font:F.bold,size:6,color:TEAL});
    dt(page,comments,ML+5,y+13,{font:F.reg,size:7.5,color:TXTMD,maxWidth:CW-10});
    y+=29;
  }

  y+=4;
  drawSignatures(page,F,imgSig,inspName,inspId,y);
  drawFooter(page,F);

  return Buffer.from(await pdfDoc.save());
}

// ── Upload to Supabase Storage ────────────────────────────────────────────────
async function uploadPDF(certId, certNumber, pdfBuffer) {
  const safeCertNum = (certNumber||certId).toString().replace(/[^a-zA-Z0-9_-]/g,"_");
  const storagePath = `generated/${safeCertNum}.pdf`;

  const { data, error } = await supabaseAdmin.storage
    .from("certificates")
    .upload(storagePath, pdfBuffer, { contentType:"application/pdf", upsert:true });

  if (error) throw new Error("Storage upload failed: " + error.message);

  const { data: urlData } = supabaseAdmin.storage
    .from("certificates")
    .getPublicUrl(data.path);

  return urlData?.publicUrl || null;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "No IDs provided." }, { status: 400 });

    // Fetch certs
    const { data: certs, error: fetchErr } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .in("id", ids);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!certs?.length) return NextResponse.json({ error: "No certificates found." }, { status: 404 });

    // Fetch logo + sig once
    const [logoBytes, sigBytes] = await Promise.all([getLogoBytes(), getSigBytes()]);

    // Generate + upload all in parallel
    const results = await Promise.allSettled(
      certs.map(async cert => {
        const pdfBuffer = await generatePDF(cert, logoBytes, sigBytes);
        const pdfUrl    = await uploadPDF(cert.id, cert.certificate_number, pdfBuffer);

        if (pdfUrl) {
          await supabaseAdmin
            .from("certificates")
            .update({ pdf_url: pdfUrl })
            .eq("id", cert.id);
        }
        return { id: cert.id, pdfUrl };
      })
    );

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed    = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({ ok: true, succeeded, failed });

  } catch (err) {
    console.error("generate-pdf error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error." }, { status: 500 });
  }
}
