// src/app/page.jsx
// ─── Monroy QMS Public Landing Page ───
// Route: / (root)
// Login  → /login        (src/app/login/page.jsx)
// After login → /dashboard (src/app/dashboard/page.jsx)

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

/* ── T color tokens (same as rest of app) ── */
const T = {
  bg:       "#070e18",
  bg2:      "#0b1622",
  bg3:      "#0f1e2e",
  accent:   "#22d3ee",
  accent2:  "#0891b2",
  green:    "#34d399",
  amber:    "#fbbf24",
  red:      "#f87171",
  purple:   "#a78bfa",
  blue:     "#60a5fa",
  text:     "#e2e8f0",
  muted:    "#64748b",
  border:   "rgba(34,211,238,0.10)",
  border2:  "rgba(34,211,238,0.22)",
};

/* ── All 9 real Monroy services ── */
const SERVICES = [
  { icon:"🏗️", name:"Mobile Crane Hire",                           desc:"Certified mobile crane hire for lifting operations on mine sites and construction projects. Operated by trained riggers with full safety compliance documentation.",            tag:"Heavy Lift",   tc:"cyan"   },
  { icon:"⛓️", name:"Rigging",                                      desc:"Professional rigging services including wire sling management, load calculations, and rigging gear inspection — every lift planned and executed to standard.",                    tag:"Rigging",      tc:"amber"  },
  { icon:"🔬", name:"NDT Testing",                                   desc:"Non-Destructive Testing to detect surface and sub-surface defects on structural steel, pressure vessels, and mechanical components — without damage to the asset.",             tag:"NDT",          tc:"purple" },
  { icon:"🦺", name:"Scaffolding",                                   desc:"Engineered scaffolding solutions for maintenance, construction, and industrial shutdowns. Erected, inspected, and dismantled by competent scaffold teams.",                       tag:"Access",       tc:"blue"   },
  { icon:"🖌️", name:"Painting",                                      desc:"Industrial surface preparation and protective coating — corrosion control, structural steel painting, and equipment finishing to specification.",                                 tag:"Coating",      tc:"red"    },
  { icon:"✅", name:"Inspection of Lifting Equipment & Machinery",   desc:"Accredited inspection of forklifts, telehandlers, cranes, cherry pickers, TLBs, and front loaders — digital certificates generated per inspection.",                           tag:"Compliance",   tc:"green"  },
  { icon:"🔩", name:"Pressure Vessels & Air Receivers",              desc:"Statutory inspection and certification of pressure vessels and air receivers — ensuring legal compliance and operational safety on your site.",                                   tag:"Statutory",    tc:"teal"   },
  { icon:"🏭", name:"Steel Fabricating & Structural",                desc:"Structural steel fabrication, installation, and lifting equipment steel inspection — from design through to certified structural integrity reports.",                             tag:"Structural",   tc:"sky"    },
  { icon:"🔧", name:"Mechanical Engineering, Fencing & Maintenance", desc:"Mechanical engineering solutions, perimeter security fencing, and planned or reactive maintenance for industrial and mining facilities.",                                        tag:"Engineering",  tc:"rose"   },
];

const FEATURES = [
  { t:"Equipment-Specific Inspection Wizards",    d:"Tailored step flows for every machine class — full inspection or vehicle-only paths per equipment type." },
  { t:"Wire Sling & Rigging Checks",              d:"Dedicated steps for wire sling condition, lanyard serial numbers, rated load, and rigging gear verification." },
  { t:"A4 Print-Ready Certificates",              d:"One-click A4 certificate generation — dynamically built per equipment type with inspector signature." },
  { t:"AI Certificate Parser",                    d:"Upload legacy PDF certificates or nameplate images. AI extracts and imports all data instantly — no manual entry." },
  { t:"Client-Scoped Data Access",                d:"Every client sees only their own equipment, inspections, certificates, and NCRs — full data isolation." },
  { t:"Android Mid-Range Optimised",              d:"Built for the devices your inspectors carry on site — fast, touch-friendly, 44px+ tap targets throughout." },
];

const STEPS = [
  { n:"01", t:"Register Client & Equipment",     d:"Onboard a client and register their fleet — cranes, forklifts, pressure vessels — with full asset details in minutes." },
  { n:"02", t:"Run a Structured Inspection",      d:"Walk through equipment-specific wizard steps — visual checks, rigging, wire slings, load ratings, safety devices, and PV compliance." },
  { n:"03", t:"Generate Certificates Instantly",  d:"Monroy builds the correct certificate layout per equipment type. Sign, print A4, and issue — all in one step." },
  { n:"04", t:"Track NCRs & Stay Compliant",      d:"Monitor expiry dates, manage NCRs, and maintain a full digital audit trail for every asset and client on your books." },
];

const BARS = [
  { label:"Forklift Fleet",       pct:94,  color:"#22d3ee" },
  { label:"Crane Inspections",    pct:88,  color:"#34d399" },
  { label:"Pressure Vessels",     pct:76,  color:"#fbbf24" },
  { label:"Cherry Pickers",       pct:100, color:"#22d3ee" },
  { label:"TLB / Front Loader",   pct:63,  color:"#f87171" },
  { label:"Scaffolding Assets",   pct:97,  color:"#34d399" },
];

const TICKER_ITEMS = [
  "Mobile Crane Hire","Rigging","NDT Testing","Scaffolding","Painting",
  "Lifting Equipment Inspection","Pressure Vessels & Air Receivers",
  "Steel Fabrication & Structural","Mechanical Engineering","Fencing","Maintenance",
];

/* colour maps */
const IC = {
  cyan:"rgba(34,211,238,0.09)  border-[rgba(34,211,238,0.18)]",
  amber:"rgba(251,191,36,0.09)",
  purple:"rgba(167,139,250,0.09)",
  blue:"rgba(96,165,250,0.09)",
  red:"rgba(248,113,113,0.09)",
  green:"rgba(52,211,153,0.09)",
  teal:"rgba(45,212,191,0.09)",
  sky:"rgba(56,189,248,0.09)",
  rose:"rgba(251,113,133,0.09)",
};
const TC_COLOR = {
  cyan:T.accent, amber:T.amber, purple:T.purple,
  blue:T.blue, red:T.red, green:T.green,
  teal:"#2dd4bf", sky:"#38bdf8", rose:"#fb7185",
};
const IC_BG = {
  cyan:`rgba(34,211,238,0.09)`, amber:`rgba(251,191,36,0.09)`,
  purple:`rgba(167,139,250,0.09)`, blue:`rgba(96,165,250,0.09)`,
  red:`rgba(248,113,113,0.09)`, green:`rgba(52,211,153,0.09)`,
  teal:`rgba(45,212,191,0.09)`, sky:`rgba(56,189,248,0.09)`,
  rose:`rgba(251,113,133,0.09)`,
};
const IC_BRD = {
  cyan:`rgba(34,211,238,0.18)`, amber:`rgba(251,191,36,0.18)`,
  purple:`rgba(167,139,250,0.18)`, blue:`rgba(96,165,250,0.18)`,
  red:`rgba(248,113,113,0.18)`, green:`rgba(52,211,153,0.18)`,
  teal:`rgba(45,212,191,0.18)`, sky:`rgba(56,189,248,0.18)`,
  rose:`rgba(251,113,133,0.18)`,
};
const TC_BG = {
  cyan:`rgba(34,211,238,0.08)`, amber:`rgba(251,191,36,0.08)`,
  purple:`rgba(167,139,250,0.08)`, blue:`rgba(96,165,250,0.08)`,
  red:`rgba(248,113,113,0.08)`, green:`rgba(52,211,153,0.08)`,
  teal:`rgba(45,212,191,0.08)`, sky:`rgba(56,189,248,0.08)`,
  rose:`rgba(251,113,133,0.08)`,
};

export default function LandingPage() {
  const canvasRef = useRef(null);
  const drawerRef = useRef(null);
  const hamRef    = useRef(null);

  /* ── Constellation particle canvas ── */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let stars = [], raf, W, H;

    const resize = () => {
      W = c.width  = window.innerWidth;
      H = c.height = window.innerHeight;
    };
    const init = () => {
      stars = Array.from({ length: 180 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random(),
        s: Math.random() * 0.004 + 0.001,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.a += s.s;
        if (s.a > 1 || s.a < 0) s.s = -s.s;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,238,${s.a * 0.55})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    resize(); init(); draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => { cancelAnimationFrame(raf); };
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.10 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Mobile nav toggle ── */
  const toggleDrawer = () => {
    hamRef.current?.classList.toggle("open");
    drawerRef.current?.classList.toggle("open");
  };
  const closeDrawer = () => {
    hamRef.current?.classList.remove("open");
    drawerRef.current?.classList.remove("open");
  };

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; color: ${T.text}; font-family: 'IBM Plex Sans', 'DM Sans', sans-serif; font-weight: 300; line-height: 1.7; overflow-x: hidden; }

        /* Particles */
        #lp-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

        /* Nav */
        .lp-nav { position:fixed; top:0; left:0; right:0; z-index:200; height:68px; display:flex; align-items:center; justify-content:space-between; padding:0 2.5rem; background:rgba(7,14,24,0.90); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); border-bottom:1px solid ${T.border}; }
        .lp-nav-links { display:flex; align-items:center; gap:2.25rem; list-style:none; }
        .lp-nav-links a { color:${T.muted}; text-decoration:none; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; font-weight:400; transition:color .2s; white-space:nowrap; }
        .lp-nav-links a:hover { color:${T.accent}; }

        /* Buttons */
        .btn-login { padding:9px 26px; background:transparent; border:1px solid ${T.accent}; color:${T.accent}; border-radius:6px; font-size:12px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; text-decoration:none; display:inline-flex; align-items:center; min-height:44px; white-space:nowrap; flex-shrink:0; transition:background .2s,color .2s,transform .15s; -webkit-tap-highlight-color:transparent; }
        .btn-login:hover { background:${T.accent}; color:#070e18; transform:translateY(-1px); }
        .btn-primary { padding:14px 38px; background:${T.accent}; color:#070e18; border:none; border-radius:6px; font-size:13px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; text-decoration:none; display:inline-flex; align-items:center; min-height:48px; transition:opacity .2s,transform .15s; -webkit-tap-highlight-color:transparent; cursor:pointer; }
        .btn-primary:hover { opacity:.85; transform:translateY(-2px); }
        .btn-outline { padding:14px 38px; background:transparent; color:${T.text}; border:1px solid rgba(226,232,240,0.2); border-radius:6px; font-size:13px; font-weight:400; letter-spacing:1.5px; text-transform:uppercase; text-decoration:none; display:inline-flex; align-items:center; min-height:48px; transition:border-color .2s,color .2s; -webkit-tap-highlight-color:transparent; }
        .btn-outline:hover { border-color:${T.accent}; color:${T.accent}; }

        /* Hamburger */
        .lp-ham { display:none; flex-direction:column; justify-content:center; align-items:center; gap:5px; background:none; border:none; cursor:pointer; padding:8px; min-width:44px; min-height:44px; -webkit-tap-highlight-color:transparent; }
        .lp-ham span { display:block; width:22px; height:1.5px; background:${T.text}; border-radius:2px; transition:transform .25s,opacity .2s; }
        .lp-ham.open span:nth-child(1) { transform:translateY(6.5px) rotate(45deg); }
        .lp-ham.open span:nth-child(2) { opacity:0; }
        .lp-ham.open span:nth-child(3) { transform:translateY(-6.5px) rotate(-45deg); }

        /* Drawer */
        .lp-drawer { display:none; position:fixed; top:68px; left:0; right:0; z-index:199; background:rgba(7,14,24,0.97); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); border-bottom:1px solid ${T.border2}; padding:1.25rem 1.5rem 2rem; flex-direction:column; }
        .lp-drawer.open { display:flex; }
        .lp-drawer li { list-style:none; }
        .lp-drawer li a { display:block; padding:14px 0; border-bottom:1px solid ${T.border}; color:${T.muted}; text-decoration:none; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; -webkit-tap-highlight-color:transparent; transition:color .2s; }
        .lp-drawer li a:hover { color:${T.accent}; }
        .lp-drawer-cta { display:block; margin-top:1.5rem; text-align:center; padding:14px; border:1px solid ${T.accent}; color:${T.accent}; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; -webkit-tap-highlight-color:transparent; transition:background .2s,color .2s; }
        .lp-drawer-cta:active { background:${T.accent}; color:#070e18; }

        /* Hero */
        .lp-hero { position:relative; z-index:1; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:130px 2rem 90px; text-align:center; }
        .lp-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 18px; background:rgba(34,211,238,0.07); border:1px solid ${T.border2}; border-radius:100px; font-size:10px; letter-spacing:2.5px; color:${T.accent}; text-transform:uppercase; margin-bottom:2rem; animation:lp-fadeup .9s ease both; font-family:'IBM Plex Mono',monospace; }
        .badge-dot { width:6px; height:6px; border-radius:50%; background:${T.accent}; animation:lp-blink 2s ease infinite; }
        .lp-h1 { font-size:clamp(56px,10vw,120px); line-height:.90; letter-spacing:5px; color:#fff; margin-bottom:1.5rem; animation:lp-fadeup .9s .1s ease both; font-weight:900; }
        .lp-h1 em { color:${T.accent}; font-style:normal; }
        .lp-sub { font-size:clamp(14px,2vw,17px); color:${T.muted}; max-width:640px; margin:0 auto 2.5rem; font-weight:300; animation:lp-fadeup .9s .2s ease both; }
        .lp-actions { display:flex; align-items:center; justify-content:center; gap:1rem; flex-wrap:wrap; animation:lp-fadeup .9s .3s ease both; }

        /* Ticker */
        .lp-ticker { margin-top:4rem; overflow:hidden; border-top:1px solid ${T.border}; border-bottom:1px solid ${T.border}; padding:14px 0; animation:lp-fadeup .9s .4s ease both; }
        .lp-ticker-track { display:flex; gap:2.5rem; animation:lp-scroll 35s linear infinite; white-space:nowrap; width:max-content; }
        .lp-ticker-track:hover { animation-play-state:paused; }
        .lp-ticker-item { display:inline-flex; align-items:center; gap:8px; font-size:10px; letter-spacing:1.5px; color:${T.muted}; text-transform:uppercase; flex-shrink:0; font-family:'IBM Plex Mono',monospace; }
        .lp-ticker-item span { color:${T.accent}; font-size:8px; }

        /* Section shared */
        .lp-section { position:relative; z-index:1; }
        .lp-container { max-width:1180px; margin:0 auto; padding:0 2rem; }
        .lp-sec-label { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:${T.accent}; margin-bottom:.75rem; font-family:'IBM Plex Mono',monospace; }
        .lp-sec-title { font-size:clamp(38px,5.5vw,62px); letter-spacing:3px; color:#fff; line-height:1; margin-bottom:1rem; font-weight:900; }
        .lp-sec-body { font-size:15px; color:${T.muted}; max-width:540px; font-weight:300; line-height:1.75; }
        .lp-rule { width:48px; height:2px; background:${T.accent}; margin:1.25rem 0; }

        /* Services */
        .lp-svc-intro { display:grid; grid-template-columns:1fr 1fr; gap:4rem; align-items:end; margin-bottom:4rem; }
        .lp-svc-intro-r { font-size:14px; color:${T.muted}; line-height:1.8; border-left:2px solid ${T.border2}; padding-left:2rem; }
        .lp-svc-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:${T.border}; border:1px solid ${T.border}; border-radius:12px; overflow:hidden; }
        .lp-svc-card { background:${T.bg2}; padding:2.25rem 2rem; transition:background .25s; -webkit-tap-highlight-color:transparent; }
        .lp-svc-card:hover { background:${T.bg3}; }
        .lp-svc-icon { width:46px; height:46px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:1.25rem; }
        .lp-svc-name { font-size:19px; letter-spacing:2px; color:#fff; margin-bottom:.6rem; font-weight:700; }
        .lp-svc-desc { font-size:13px; color:${T.muted}; line-height:1.65; font-weight:300; }
        .lp-svc-tag { display:inline-block; margin-top:1rem; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; padding:3px 10px; border-radius:4px; font-family:'IBM Plex Mono',monospace; }

        /* How it works */
        .lp-how-layout { display:grid; grid-template-columns:1fr 1fr; gap:6rem; align-items:center; }
        .lp-step { display:flex; gap:1.5rem; padding:1.75rem 0; border-bottom:1px solid ${T.border}; }
        .lp-step:last-child { border-bottom:none; padding-bottom:0; }
        .lp-step:first-child { padding-top:0; }
        .lp-step-n { font-size:38px; color:rgba(34,211,238,0.14); line-height:1; flex-shrink:0; width:44px; text-align:right; font-weight:900; }
        .lp-step-t { font-size:18px; letter-spacing:1px; color:#fff; margin-bottom:.4rem; font-weight:700; }
        .lp-step-d { font-size:13px; color:${T.muted}; font-weight:300; line-height:1.65; }

        /* Dashboard mockup */
        .lp-dash { background:${T.bg2}; border:1px solid ${T.border}; border-radius:14px; overflow:hidden; }
        .lp-dash-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid ${T.border}; background:${T.bg3}; }
        .lp-dash-dots { display:flex; gap:6px; }
        .lp-dash-dots i { width:7px; height:7px; border-radius:50%; display:block; }
        .lp-dash-title { font-size:9px; letter-spacing:2px; color:${T.accent}; text-transform:uppercase; font-family:'IBM Plex Mono',monospace; }
        .lp-dash-body { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
        .lp-brow { display:flex; flex-direction:column; gap:5px; }
        .lp-blbl { display:flex; justify-content:space-between; font-size:11px; color:${T.muted}; }
        .lp-blbl b { font-weight:600; }
        .lp-btrack { height:5px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; }
        .lp-bfill { height:100%; border-radius:3px; animation:lp-grow 1.8s ease both; }
        .lp-dash-mets { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:${T.border}; border-top:1px solid ${T.border}; }
        .lp-dash-met { background:${T.bg2}; padding:.9rem .5rem; text-align:center; }
        .lp-dash-met-v { font-size:26px; line-height:1; margin-bottom:3px; font-weight:900; }
        .lp-dash-met-l { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:${T.muted}; }

        /* Features */
        .lp-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        .lp-feat-card { background:${T.bg3}; border:1px solid ${T.border}; border-radius:10px; padding:1.75rem; transition:border-color .2s,transform .2s; }
        .lp-feat-card:hover { border-color:${T.border2}; transform:translateY(-2px); }
        .lp-feat-chk { width:26px; height:26px; border-radius:50%; background:rgba(52,211,153,0.10); border:1px solid rgba(52,211,153,0.25); display:flex; align-items:center; justify-content:center; font-size:12px; color:${T.green}; margin-bottom:1rem; }
        .lp-feat-t { font-size:14px; font-weight:600; color:#fff; margin-bottom:.5rem; }
        .lp-feat-d { font-size:13px; color:${T.muted}; font-weight:300; line-height:1.6; }

        /* CTA */
        .lp-cta-h2 { font-size:clamp(48px,7vw,88px); letter-spacing:5px; color:#fff; line-height:.93; margin-bottom:1.5rem; font-weight:900; }
        .lp-cta-h2 em { color:${T.accent}; font-style:normal; }
        .lp-cta-btns { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }

        /* Footer */
        .lp-footer { position:relative; z-index:1; border-top:1px solid ${T.border}; padding:2.5rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
        .lp-footer-links { display:flex; gap:1.5rem; list-style:none; flex-wrap:wrap; }
        .lp-footer-links a { font-size:12px; color:${T.muted}; text-decoration:none; transition:color .2s; }
        .lp-footer-links a:hover { color:${T.accent}; }

        /* Reveal */
        .reveal { opacity:0; transform:translateY(26px); transition:opacity .75s ease,transform .75s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        .d1 { transition-delay:.1s; } .d2 { transition-delay:.2s; } .d3 { transition-delay:.3s; }

        /* Keyframes */
        @keyframes lp-fadeup { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes lp-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes lp-grow { from{width:0!important} }

        /* Responsive */
        @media (max-width:1024px) {
          .lp-svc-grid { grid-template-columns:repeat(2,1fr); }
          .lp-feat-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:768px) {
          .lp-nav { padding:0 1.25rem; }
          .lp-nav-links { display:none; }
          .btn-login.desk { display:none; }
          .lp-ham { display:flex; }
          .lp-hero { padding:100px 1.25rem 70px; }
          .lp-svc-intro { grid-template-columns:1fr; gap:2rem; }
          .lp-svc-intro-r { border-left:none; padding-left:0; border-top:1px solid ${T.border2}; padding-top:1.5rem; }
          .lp-svc-grid { grid-template-columns:1fr; }
          .lp-how-layout { grid-template-columns:1fr; gap:3.5rem; }
          .lp-feat-grid { grid-template-columns:1fr; }
          .lp-dash-mets { grid-template-columns:repeat(2,1fr); }
          .lp-footer { flex-direction:column; align-items:flex-start; }
          .lp-cta-btns { flex-direction:column; align-items:center; }
          .lp-cta-btns a { width:100%; justify-content:center; max-width:320px; }
        }
        @media (max-width:480px) {
          .lp-actions { flex-direction:column; width:100%; }
          .btn-primary,.btn-outline { width:100%; justify-content:center; }
        }
      `}</style>

      {/* Particle canvas */}
      <canvas id="lp-canvas" ref={canvasRef} />

      {/* ══ NAV ══ */}
      <nav className="lp-nav">
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <Image
            src="/logo.png"
            alt="Monroy QMS"
            width={120}
            height={42}
            style={{ height:42, width:"auto", objectFit:"contain" }}
            onError={e => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
          {/* Fallback */}
          <div style={{ display:"none", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, fontSize:19, color:"#070e18", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, flexShrink:0 }}>M</div>
            <div style={{ lineHeight:1.1 }}>
              <b style={{ display:"block", fontSize:19, letterSpacing:3, color:"#fff", fontWeight:700 }}>MONROY</b>
              <small style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:T.accent, fontWeight:500 }}>Quality Management System</small>
            </div>
          </div>
        </Link>

        <ul className="lp-nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>

        <Link href="/login" className="btn-login desk">Login</Link>

        <button ref={hamRef} className="lp-ham" aria-label="Menu" onClick={toggleDrawer}>
          <span/><span/><span/>
        </button>
      </nav>

      {/* Mobile drawer */}
      <ul ref={drawerRef} className="lp-drawer">
        <li><a href="#services" onClick={closeDrawer}>Services</a></li>
        <li><a href="#how"      onClick={closeDrawer}>How It Works</a></li>
        <li><a href="#features" onClick={closeDrawer}>Features</a></li>
        <li><a href="#contact"  onClick={closeDrawer}>Contact</a></li>
        <Link href="/login" className="lp-drawer-cta" onClick={closeDrawer}>
          Login to Monroy QMS →
        </Link>
      </ul>

      {/* ══ HERO ══ */}
      <section className="lp-hero">
        <div style={{ maxWidth:960 }}>
          <div className="lp-badge">
            <div className="badge-dot"/>
            Southern Africa's Industrial QMS Platform
          </div>

          <h1 className="lp-h1">QUALITY<br/>THAT <em>HOLDS</em></h1>

          <p className="lp-sub">
            Monroy QMS delivers end-to-end inspection management, compliance certification, and NCR tracking for mining, industrial, and construction operations across Botswana and Southern Africa.
          </p>

          <div className="lp-actions">
            <a href="#services" className="btn-primary">Explore Services</a>
            <Link href="/login" className="btn-outline">Client Login →</Link>
          </div>

          <div className="lp-ticker">
            <div className="lp-ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="lp-ticker-item">
                  <span>●</span> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section className="lp-section" id="services" style={{ padding:"110px 0", background:T.bg2, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div className="lp-container">
          <div className="lp-svc-intro">
            <div className="reveal">
              <p className="lp-sec-label">// What We Do</p>
              <h2 className="lp-sec-title">Our Services</h2>
              <div className="lp-rule"/>
            </div>
            <p className="lp-svc-intro-r reveal d1">
              From mobile crane hire and NDT testing to scaffolding and mechanical engineering — Monroy delivers accredited inspection and specialist services that keep your operations safe, compliant, and digitally managed.
            </p>
          </div>

          <div className="lp-svc-grid">
            {SERVICES.map((s, i) => (
              <div key={s.name} className={`lp-svc-card reveal ${i%3===1?"d1":i%3===2?"d2":""}`}>
                <div className="lp-svc-icon" style={{ background:IC_BG[s.tc], border:`1px solid ${IC_BRD[s.tc]}` }}>
                  {s.icon}
                </div>
                <div className="lp-svc-name">{s.name}</div>
                <p className="lp-svc-desc">{s.desc}</p>
                <span className="lp-svc-tag" style={{ color:TC_COLOR[s.tc], background:TC_BG[s.tc] }}>
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="lp-section" id="how" style={{ padding:"110px 0" }}>
        <div className="lp-container">
          <div className="lp-how-layout">
            <div>
              <div className="reveal">
                <p className="lp-sec-label">// The Process</p>
                <h2 className="lp-sec-title">How It Works</h2>
                <div className="lp-rule"/>
              </div>
              <div>
                {STEPS.map(s => (
                  <div key={s.n} className="lp-step reveal">
                    <div className="lp-step-n">{s.n}</div>
                    <div>
                      <div className="lp-step-t">{s.t}</div>
                      <p className="lp-step-d">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live dashboard mockup */}
            <div className="lp-dash reveal">
              <div className="lp-dash-topbar">
                <div className="lp-dash-dots">
                  <i style={{ background:T.red }}/>
                  <i style={{ background:T.amber }}/>
                  <i style={{ background:T.green }}/>
                </div>
                <span className="lp-dash-title">// Monroy QMS — Live</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted }}>v2.0</span>
              </div>
              <div className="lp-dash-body">
                {BARS.map(b => (
                  <div key={b.label} className="lp-brow">
                    <div className="lp-blbl">
                      <span>{b.label}</span>
                      <b style={{ color:b.color }}>{b.pct}%</b>
                    </div>
                    <div className="lp-btrack">
                      <div className="lp-bfill" style={{ width:`${b.pct}%`, background:b.color }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lp-dash-mets">
                {[
                  { v:"248", l:"Certs Issued", c:T.green  },
                  { v:"5",   l:"Open NCRs",    c:T.amber  },
                  { v:"98%", l:"Compliant",    c:T.accent },
                  { v:"47",  l:"Assets",       c:T.purple },
                ].map(m => (
                  <div key={m.l} className="lp-dash-met">
                    <div className="lp-dash-met-v" style={{ color:m.c }}>{m.v}</div>
                    <div className="lp-dash-met-l">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="lp-section" id="features" style={{ padding:"110px 0", background:T.bg2, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div className="lp-container">
          <div className="reveal" style={{ textAlign:"center", marginBottom:"4rem" }}>
            <p className="lp-sec-label">// Platform Capabilities</p>
            <h2 className="lp-sec-title">Built Different</h2>
            <div className="lp-rule" style={{ margin:"1.25rem auto" }}/>
            <p className="lp-sec-body" style={{ margin:"0 auto", textAlign:"center" }}>
              Monroy QMS is engineered for the realities of African mine sites — mobile-first, AI-powered, and built to keep inspection teams fast and audit-ready.
            </p>
          </div>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.t} className={`lp-feat-card reveal ${i%3===1?"d1":i%3===2?"d2":""}`}>
                <div className="lp-feat-chk">✓</div>
                <div className="lp-feat-t">{f.t}</div>
                <p className="lp-feat-d">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="lp-section" id="contact" style={{ padding:"130px 0", textAlign:"center" }}>
        <div className="lp-container">
          <div className="reveal" style={{ maxWidth:720, margin:"0 auto" }}>
            <h2 className="lp-cta-h2">READY TO<br/><em>GET STARTED?</em></h2>
            <p style={{ fontSize:15, color:T.muted, marginBottom:"2.5rem", fontWeight:300 }}>
              Join mining and industrial inspection teams across Botswana using Monroy QMS to stay compliant, audit-ready, and ahead.
            </p>
            <div className="lp-cta-btns">
              <Link href="/login"                     className="btn-primary">Access Your Account</Link>
              <a href="mailto:info@monroyqms.co.bw"   className="btn-outline">Contact Us</a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp-footer">
        <div>
          <Image src="/logo.png" alt="Monroy QMS" width={100} height={34}
            style={{ height:34, width:"auto", objectFit:"contain", opacity:.75 }}
            onError={e => { e.currentTarget.style.display="none"; }}
          />
        </div>
        <p style={{ fontSize:12, color:T.muted }}>© {new Date().getFullYear()} Monroy (Pty) Ltd · Botswana</p>
        <ul className="lp-footer-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><Link href="/login" style={{ fontSize:12, color:T.muted, textDecoration:"none" }}>Login</Link></li>
        </ul>
      </footer>
    </>
  );
}
