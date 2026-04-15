// src/app/admin/backfill-ncr/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// One-off admin page to auto-raise NCR + CAPA for all existing non-pass certs.
// Visit /admin/backfill-ncr and click Run Backfill.
// Safe to run multiple times — idempotent (skips certs that already have NCRs).
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { autoRaiseNcrForAllExisting } from "@/lib/autoNcr";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
};

export default function BackfillNcrPage() {
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [progress,  setProgress]  = useState({ current: 0, total: 0, certNo: "" });
  const [report,    setReport]    = useState(null);
  const [logs,      setLogs]      = useState([]);

  function addLog(msg, type = "info") {
    setLogs(p => [...p, { msg, type, ts: new Date().toLocaleTimeString() }]);
  }

  async function handleRun() {
    setRunning(true); setDone(false); setReport(null); setLogs([]);
    addLog("Starting NCR/CAPA backfill for all non-pass certificates…", "info");

    try {
      const result = await autoRaiseNcrForAllExisting((current, total, cert) => {
        setProgress({ current, total, certNo: cert.certificate_number || cert.id });
        addLog(`[${current}/${total}] Processing ${cert.certificate_number} — ${cert.result} — ${cert.client_name || ""}`, "info");
      });

      setReport(result);
      addLog(`✅ Backfill complete. Created: ${result.created} | Skipped: ${result.skipped} | Failed: ${result.failed}`, "success");
      if (result.errors?.length) {
        result.errors.forEach(e => addLog(`⚠ ${e}`, "error"));
      }
    } catch (e) {
      addLog(`❌ Fatal error: ${e?.message || "Unknown"}`, "error");
    } finally {
      setRunning(false); setDone(true);
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <AppLayout title="Backfill NCRs">
      <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>

          {/* HEADER */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "18px 20px", backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent, marginBottom: 7 }}>Admin Utility</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Backfill NCR + CAPA</h1>
                <p style={{ margin: "6px 0 0", color: T.textDim, fontSize: 13 }}>
                  Auto-raises NCR + CAPA for all non-pass certificates that don't have one yet. Safe to run multiple times.
                </p>
              </div>
              <Link href="/ncr" style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                ← Back to NCRs
              </Link>
            </div>
          </div>

          {/* INFO BOX */}
          <div style={{ background: T.accentDim, border: `1px solid ${T.accentBrd}`, borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.accent, marginBottom: 8 }}>What this does</div>
            <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.8 }}>
              • Scans all certificates with result: <strong>FAIL, REPAIR_REQUIRED, OUT_OF_SERVICE, CONDITIONAL</strong><br/>
              • Skips any certificate that already has an NCR linked<br/>
              • Creates NCR with full defect/remarks content from the certificate<br/>
              • Creates linked CAPA with immediate action based on result + equipment type<br/>
              • Auto-detects the correct asset using serial + client + equipment type matching<br/>
              • Runs with 120ms delay between records to avoid rate limits
            </div>
          </div>

          {/* RUN BUTTON */}
          {!running && !done && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleRun}
                style={{ padding: "14px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#22d3ee,#60a5fa)", color: "#001018", fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                🚀 Run Backfill
              </button>
            </div>
          )}

          {/* PROGRESS */}
          {running && (
            <div style={{ background: T.panel, border: `1px solid ${T.accentBrd}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${T.accentBrd}`, borderTopColor: T.accent, animation: "spin .7s linear infinite", flexShrink: 0 }}/>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>
                  Processing {progress.current} / {progress.total}
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 99, background: T.card, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${T.accent},#60a5fa)`, width: `${pct}%`, transition: "width .3s" }}/>
              </div>
              <div style={{ fontSize: 11, color: T.textDim, fontFamily: "'IBM Plex Mono',monospace" }}>
                {progress.certNo}
              </div>
            </div>
          )}

          {/* REPORT */}
          {done && report && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Created",  value: report.created,  color: T.green,  bg: T.greenDim,  brd: T.greenBrd },
                { label: "Skipped",  value: report.skipped,  color: T.accent, bg: T.accentDim, brd: T.accentBrd },
                { label: "Failed",   value: report.failed,   color: T.red,    bg: T.redDim,    brd: T.redBrd },
              ].map(({ label, value, color, bg, brd }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* RE-RUN BUTTON */}
          {done && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleRun}
                style={{ padding: "12px 22px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#22d3ee,#60a5fa)", color: "#001018", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                🔄 Run Again
              </button>
              <Link href="/ncr" style={{ padding: "12px 22px", borderRadius: 11, border: `1px solid ${T.greenBrd}`, background: T.greenDim, color: T.green, fontWeight: 900, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                View NCRs →
              </Link>
            </div>
          )}

          {/* LIVE LOG */}
          {logs.length > 0 && (
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.textMid, marginBottom: 10 }}>Live Log</div>
              <div style={{ maxHeight: 400, overflowY: "auto", display: "grid", gap: 3 }}>
                {logs.map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>
                    <span style={{ color: T.textDim, flexShrink: 0 }}>{l.ts}</span>
                    <span style={{ color: l.type === "success" ? T.green : l.type === "error" ? T.red : T.textMid }}>
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  );
}
