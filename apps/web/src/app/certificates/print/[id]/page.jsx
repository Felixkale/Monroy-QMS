"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { getDashboardStats } from "@/services/dashboard";

const C = {
  cyan: "#8ef7ff",
  cyan2: "#4fc3f7",
  blue: "#60a5fa",
  green: "#22c55e",
  yellow: "#fbbf24",
  orange: "#fb923c",
  purple: "#a78bfa",
  pink: "#f472b6",
  white: "#f8fafc",
  text: "rgba(248,250,252,0.92)",
  textSoft: "rgba(248,250,252,0.72)",
  textDim: "rgba(248,250,252,0.48)",
  line: "rgba(186, 230, 253, 0.18)",
  glass: "rgba(255,255,255,0.08)",
  glass2: "rgba(255,255,255,0.05)",
  bg1: "#61707c",
  bg2: "#475560",
  bg3: "#2e3944",
};

const rgbaMap = {
  [C.cyan]: "142,247,255",
  [C.cyan2]: "79,195,247",
  [C.blue]: "96,165,250",
  [C.green]: "34,197,94",
  [C.yellow]: "251,191,36",
  [C.orange]: "251,146,60",
  [C.purple]: "167,139,250",
  [C.pink]: "244,114,182",
};

function fmtNum(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "0";
  return new Intl.NumberFormat().format(Number(v));
}

function percent(value, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function StatPill({ label, value, color, sub, href }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          borderRadius: 18,
          padding: "16px 18px",
          minHeight: 110,
          border: `1px solid rgba(${rgbaMap[color]},0.28)`,
          background: `
            linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04)),
            rgba(${rgbaMap[color]},0.07)
          `,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.16),
            0 10px 30px rgba(0,0,0,0.10),
            0 0 18px rgba(${rgbaMap[color]},0.08)
          `,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 14px 34px rgba(0,0,0,0.14),
            0 0 22px rgba(${rgbaMap[color]},0.14)
          `;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = `
            inset 0 1px 0 rgba(255,255,255,0.16),
            0 10px 30px rgba(0,0,0,0.10),
            0 0 18px rgba(${rgbaMap[color]},0.08)
          `;
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textDim,
            }}
          >
            {label}
          </span>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 14px ${color}`,
              flexShrink: 0,
              marginTop: 4,
            }}
          />
        </div>

        <div
          style={{
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 900,
            color,
            marginBottom: 8,
            textShadow: `0 0 18px rgba(${rgbaMap[color]},0.20)`,
          }}
        >
          {fmtNum(value)}
        </div>

        <div style={{ fontSize: 12, color: C.textSoft }}>{sub}</div>
      </div>
    </Link>
  );
}

function GlassCard({ title, right, children, style }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 18,
        border: `1px solid ${C.line}`,
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04)),
          rgba(255,255,255,0.05)
        `,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.16),
          0 12px 36px rgba(0,0,0,0.12)
        `,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: C.white,
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function MetricBars({ stats }) {
  const items = [
    { label: "Clients", value: Number(stats?.totalClients || 0), color: C.cyan2 },
    { label: "Equipment", value: Number(stats?.totalEquipment || 0), color: C.yellow },
    { label: "Inspections", value: Number(stats?.totalInspections || 0), color: C.blue },
    { label: "Certificates", value: Number(stats?.totalCertificates || 0), color: C.green },
    { label: "NCRs", value: Number(stats?.totalNcrs || 0), color: C.orange },
  ];

  const max = Math.max(...items.map((x) => x.value), 1);

  return (
    <div>
      <div
        style={{
          position: "relative",
          height: 150,
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: 14,
          background: `
            radial-gradient(circle at 25% 15%, rgba(255,255,255,0.10), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))
          `,
          border: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        <svg
          viewBox="0 0 400 150"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.cyan2} />
              <stop offset="50%" stopColor={C.blue} />
              <stop offset="100%" stopColor={C.cyan} />
            </linearGradient>
          </defs>

          {[20, 50, 80, 110, 140].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="400"
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          <path
            d="M 8 112 C 35 86, 56 118, 80 96 S 125 62, 150 82 S 196 112, 220 70 S 270 36, 295 64 S 338 105, 392 48"
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 10px rgba(79,195,247,0.45))" }}
          />

          {[8, 80, 150, 220, 295, 392].map((x, i) => {
            const ys = [112, 96, 82, 70, 64, 48];
            return (
              <circle
                key={x}
                cx={x}
                cy={ys[i]}
                r="4"
                fill={C.white}
                style={{ filter: "drop-shadow(0 0 8px rgba(142,247,255,0.7))" }}
              />
            );
          })}
        </svg>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        {items.map((item) => {
          const h = Math.max(18, Math.round((item.value / max) * 70));
          return (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  height: 80,
                  display: "flex",
                  alignItems: "end",
                  justifyContent: "center",
                  gap: 5,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: `${Math.max(16, h * 0.72)}px`,
                    borderRadius: 10,
                    background: C.cyan2,
                    boxShadow: `0 0 12px rgba(${rgbaMap[C.cyan2]},0.28)`,
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: `${h}px`,
                    borderRadius: 10,
                    background: item.color,
                    boxShadow: `0 0 12px rgba(${rgbaMap[item.color]},0.28)`,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.white }}>{fmtNum(item.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressItem({ label, value, max, color }) {
  const p = percent(value, max);

  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 13, color: C.textSoft }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{p}%</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: `${p}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 12px rgba(${rgbaMap[color]},0.22)`,
            transition: "width .5s ease",
          }}
        />
      </div>
    </div>
  );
}

function DonutCard({ stats }) {
  const done = Number(stats?.totalCertificates || 0);
  const progress = Number(stats?.activeInspections || 0);
  const backlog = Number(stats?.openNcrs || 0);
  const total = Math.max(done + progress + backlog, 1);

  const donePct = Math.round((done / total) * 100);
  const progressPct = Math.round((progress / total) * 100);
  const backlogPct = 100 - donePct - progressPct;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "center" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `conic-gradient(${C.cyan2} 0% ${donePct}%, ${C.green} ${donePct}% ${donePct + progressPct}%, ${C.yellow} ${donePct + progressPct}% 100%)`,
          position: "relative",
          boxShadow: "0 0 28px rgba(79,195,247,0.14)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 18,
            borderRadius: "50%",
            background: "rgba(40, 50, 61, 0.88)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 900, color: C.white }}>{total}</div>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Total
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <LegendRow label="Certificates" value={donePct} color={C.cyan2} />
        <LegendRow label="Inspections" value={progressPct} color={C.green} />
        <LegendRow label="Open NCRs" value={backlogPct} color={C.yellow} />
      </div>
    </div>
  );
}

function LegendRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 10px ${color}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, color: C.textSoft }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{value}%</span>
    </div>
  );
}

function QuickAction({ href, label, color }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 14,
          border: `1px solid rgba(${rgbaMap[color]},0.22)`,
          background: `rgba(${rgbaMap[color]},0.08)`,
          color: C.text,
          transition: "all .2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(3px)";
          e.currentTarget.style.background = `rgba(${rgbaMap[color]},0.14)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(0)";
          e.currentTarget.style.background = `rgba(${rgbaMap[color]},0.08)`;
        }}
      >
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 12px ${color}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ marginLeft: "auto", color: C.textDim }}>→</span>
      </div>
    </Link>
  );
}

function ActivityRow({ label, value, color, caption }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "14px 16px",
        border: `1px solid rgba(${rgbaMap[color]},0.20)`,
        background: `rgba(${rgbaMap[color]},0.06)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>{caption}</div>
        </div>
        <div
          style={{
            fontSize: 24,
            lineHeight: 1,
            fontWeight: 900,
            color,
            textShadow: `0 0 18px rgba(${rgbaMap[color]},0.18)`,
          }}
        >
          {fmtNum(value)}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getDashboardStats();
        if (active) setStats(data);
      } catch (e) {
        if (active) setError("Failed to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const headerStats = useMemo(() => {
    return [
      {
        label: "Total Clients",
        value: stats?.totalClients || 0,
        sub: `${fmtNum(stats?.activeClients || 0)} active`,
        color: C.cyan2,
        href: "/clients",
      },
      {
        label: "Total Equipment",
        value: stats?.totalEquipment || 0,
        sub: `${fmtNum(stats?.activeEquipment || 0)} active`,
        color: C.green,
        href: "/equipment",
      },
      {
        label: "Active Inspections",
        value: stats?.activeInspections || 0,
        sub: `${fmtNum(stats?.totalInspections || 0)} total`,
        color: C.purple,
        href: "/inspections",
      },
      {
        label: "Open NCRs",
        value: stats?.openNcrs || 0,
        sub: `${fmtNum(stats?.totalNcrs || 0)} total`,
        color: C.yellow,
        href: "/ncr",
      },
      {
        label: "Certificates",
        value: stats?.totalCertificates || 0,
        sub: `${fmtNum(stats?.expiringSoon || 0)} expiring soon`,
        color: C.pink,
        href: "/certificates",
      },
    ];
  }, [stats]);

  return (
    <AppLayout title="Dashboard">
      <div style={pageWrap}>
        <style jsx>{`
          @keyframes floatGlow {
            0% { transform: translateY(0px); opacity: 0.9; }
            50% { transform: translateY(-8px); opacity: 1; }
            100% { transform: translateY(0px); opacity: 0.9; }
          }

          @keyframes pulseSoft {
            0% { box-shadow: 0 0 0 rgba(142,247,255,0.0); }
            50% { box-shadow: 0 0 26px rgba(142,247,255,0.12); }
            100% { box-shadow: 0 0 0 rgba(142,247,255,0.0); }
          }
        `}</style>

        <div style={ambient1} />
        <div style={ambient2} />
        <div style={ambient3} />

        <div style={glassBoard}>
          <div style={topRow}>
            <div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: C.white,
                  lineHeight: 1.1,
                  marginBottom: 6,
                  textShadow: "0 0 20px rgba(142,247,255,0.12)",
                }}
              >
                Dashboard Overview
              </div>
              <div style={{ color: C.textSoft, fontSize: 14 }}>
                Welcome to your workspace
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={miniChip}>
                <span style={dot(C.cyan)} />
                Live System
              </div>
              <div style={miniChip}>
                <span style={dot(C.green)} />
                QMS Active
              </div>
            </div>
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 18,
                borderRadius: 16,
                padding: "12px 14px",
                border: `1px solid rgba(${rgbaMap[C.pink]},0.26)`,
                background: `rgba(${rgbaMap[C.pink]},0.10)`,
                color: C.white,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={loadingCard} />
                ))
              : headerStats.map((item) => (
                  <StatPill
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    sub={item.sub}
                    color={item.color}
                    href={item.href}
                  />
                ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.65fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <GlassCard
              title="Performance Metrics"
              right={<div style={menuDots}>•••</div>}
              style={{ minHeight: 360 }}
            >
              {loading ? (
                <div style={loadingPanel} />
              ) : (
                <>
                  <MetricBars stats={stats} />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    <MetricStat label="Clients" value={stats?.totalClients || 0} color={C.cyan2} />
                    <MetricStat label="Equipment" value={stats?.totalEquipment || 0} color={C.green} />
                    <MetricStat label="Certificates" value={stats?.totalCertificates || 0} color={C.yellow} />
                  </div>
                </>
              )}
            </GlassCard>

            <div style={{ display: "grid", gap: 16 }}>
              <GlassCard title="System Progress" right={<div style={menuDots}>•••</div>}>
                {loading ? (
                  <div style={loadingMini} />
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    <ProgressItem
                      label="Client Activity"
                      value={stats?.activeClients || 0}
                      max={Math.max(stats?.totalClients || 0, 1)}
                      color={C.cyan2}
                    />
                    <ProgressItem
                      label="Equipment Active"
                      value={stats?.activeEquipment || 0}
                      max={Math.max(stats?.totalEquipment || 0, 1)}
                      color={C.green}
                    />
                    <ProgressItem
                      label="Inspections Running"
                      value={stats?.activeInspections || 0}
                      max={Math.max(stats?.totalInspections || 0, 1)}
                      color={C.purple}
                    />
                    <ProgressItem
                      label="Certificates Share"
                      value={stats?.totalCertificates || 0}
                      max={Math.max(
                        (stats?.totalCertificates || 0) +
                          (stats?.totalInspections || 0) +
                          (stats?.totalNcrs || 0),
                        1
                      )}
                      color={C.yellow}
                    />
                  </div>
                )}
              </GlassCard>

              <GlassCard title="Task Status" right={<div style={menuDots}>•••</div>}>
                {loading ? <div style={loadingMini} /> : <DonutCard stats={stats} />}
              </GlassCard>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 16,
            }}
          >
            <GlassCard title="Quick Actions" right={<div style={menuDots}>•••</div>}>
              <div style={{ display: "grid", gap: 10 }}>
                <QuickAction href="/clients/register" label="Register New Client" color={C.cyan2} />
                <QuickAction href="/equipment/register" label="Add Equipment" color={C.green} />
                <QuickAction href="/inspections/new" label="Start Inspection" color={C.purple} />
                <QuickAction href="/certificates" label="Create Certificate" color={C.yellow} />
                <QuickAction href="/ncr/new" label="Log NCR" color={C.pink} />
              </div>
            </GlassCard>

            <GlassCard title="Team Activity" right={<div style={menuDots}>•••</div>}>
              {loading ? (
                <div style={loadingPanelSmall} />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <ActivityRow
                    label="Clients Registered"
                    value={stats?.totalClients || 0}
                    color={C.cyan2}
                    caption={`${fmtNum(stats?.activeClients || 0)} active in the system`}
                  />
                  <ActivityRow
                    label="Equipment Registered"
                    value={stats?.totalEquipment || 0}
                    color={C.green}
                    caption={`${fmtNum(stats?.activeEquipment || 0)} active assets`}
                  />
                  <ActivityRow
                    label="Open NCRs"
                    value={stats?.openNcrs || 0}
                    color={C.yellow}
                    caption={`${fmtNum(stats?.totalNcrs || 0)} total NCR records`}
                  />
                  {(stats?.expiringSoon || 0) > 0 ? (
                    <div
                      style={{
                        marginTop: 2,
                        borderRadius: 14,
                        padding: "12px 14px",
                        border: `1px solid rgba(${rgbaMap[C.orange]},0.24)`,
                        background: `rgba(${rgbaMap[C.orange]},0.10)`,
                        color: C.white,
                        fontSize: 13,
                      }}
                    >
                      {fmtNum(stats?.expiringSoon || 0)} certificate
                      {(stats?.expiringSoon || 0) > 1 ? "s are" : " is"} expiring within 30 days.
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 2,
                        borderRadius: 14,
                        padding: "12px 14px",
                        border: `1px solid rgba(${rgbaMap[C.green]},0.20)`,
                        background: `rgba(${rgbaMap[C.green]},0.08)`,
                        color: C.white,
                        fontSize: 13,
                      }}
                    >
                      No urgent certificate expiry alert right now.
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricStat({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "14px 14px 12px",
        border: `1px solid rgba(${rgbaMap[color]},0.18)`,
        background: `rgba(${rgbaMap[color]},0.06)`,
      }}
    >
      <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color }}>{fmtNum(value)}</div>
    </div>
  );
}

const pageWrap = {
  position: "relative",
  minHeight: "calc(100vh - 88px)",
  padding: 0,
};

const ambient1 = {
  position: "absolute",
  top: -20,
  left: "3%",
  width: 280,
  height: 160,
  borderRadius: 999,
  background: "rgba(142,247,255,0.12)",
  filter: "blur(70px)",
  pointerEvents: "none",
  animation: "floatGlow 7s ease-in-out infinite",
};

const ambient2 = {
  position: "absolute",
  right: "5%",
  top: 100,
  width: 240,
  height: 150,
  borderRadius: 999,
  background: "rgba(96,165,250,0.10)",
  filter: "blur(70px)",
  pointerEvents: "none",
  animation: "floatGlow 9s ease-in-out infinite",
};

const ambient3 = {
  position: "absolute",
  left: "30%",
  bottom: 20,
  width: 240,
  height: 140,
  borderRadius: 999,
  background: "rgba(244,114,182,0.08)",
  filter: "blur(80px)",
  pointerEvents: "none",
  animation: "floatGlow 10s ease-in-out infinite",
};

const glassBoard = {
  position: "relative",
  borderRadius: 28,
  padding: 20,
  minHeight: "calc(100vh - 110px)",
  background: `
    radial-gradient(circle at 20% 0%, rgba(255,255,255,0.10), transparent 20%),
    linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)),
    linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 48%, ${C.bg3} 100%)
  `,
  border: "1px solid rgba(186, 230, 253, 0.24)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.14),
    0 22px 70px rgba(15,23,42,0.18)
  `,
  overflow: "hidden",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 18,
};

const miniChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: C.text,
  fontSize: 12,
  fontWeight: 700,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const dot = (color) => ({
  width: 9,
  height: 9,
  borderRadius: 999,
  background: color,
  boxShadow: `0 0 10px ${color}`,
});

const loadingCard = {
  minHeight: 110,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10), rgba(255,255,255,0.06))",
  animation: "pulseSoft 1.8s ease-in-out infinite",
};

const loadingPanel = {
  height: 280,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10), rgba(255,255,255,0.06))",
  animation: "pulseSoft 1.8s ease-in-out infinite",
};

const loadingPanelSmall = {
  height: 220,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10), rgba(255,255,255,0.06))",
  animation: "pulseSoft 1.8s ease-in-out infinite",
};

const loadingMini = {
  height: 140,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10), rgba(255,255,255,0.06))",
  animation: "pulseSoft 1.8s ease-in-out infinite",
};

const menuDots = {
  color: C.textDim,
  fontSize: 16,
  letterSpacing: "0.16em",
  userSelect: "none",
};
