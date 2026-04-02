"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const T = {
  bg: "#070e18",
  surface: "rgba(13,22,38,0.80)",
  panel: "rgba(10,18,32,0.92)",
  card: "rgba(255,255,255,0.025)",
  border: "rgba(148,163,184,0.12)",
  text: "#f0f6ff",
  textMid: "rgba(240,246,255,0.72)",
  textDim: "rgba(240,246,255,0.40)",
  accent: "#22d3ee",
  accentDim: "rgba(34,211,238,0.10)",
  accentBrd: "rgba(34,211,238,0.25)",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.10)",
  greenBrd: "rgba(52,211,153,0.25)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.10)",
  purpleBrd: "rgba(167,139,250,0.25)",
  amber: "#fbbf24",
  amberDim: "rgba(251,191,36,0.10)",
  amberBrd: "rgba(251,191,36,0.25)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.10)",
  redBrd: "rgba(248,113,113,0.25)",
};

const CARDS = [
  {
    title: "User Management",
    desc: "Invite users, update roles, activate or deactivate accounts.",
    href: "/admin/users",
    icon: "👥",
    color: T.accent,
    bg: T.accentDim,
    brd: T.accentBrd,
  },
  {
    title: "Clients",
    desc: "Review and manage company records registered in the system.",
    href: "/clients",
    icon: "🏢",
    color: T.green,
    bg: T.greenDim,
    brd: T.greenBrd,
  },
  {
    title: "Equipment",
    desc: "Open the equipment register and manage tagged assets.",
    href: "/equipment",
    icon: "🛠️",
    color: T.purple,
    bg: T.purpleDim,
    brd: T.purpleBrd,
  },
  {
    title: "Certificates",
    desc: "View, import, edit and print certificates.",
    href: "/certificates",
    icon: "📄",
    color: T.amber,
    bg: T.amberDim,
    brd: T.amberBrd,
  },
  {
    title: "Inspections",
    desc: "Create inspections and continue active inspection workflows.",
    href: "/inspections",
    icon: "✅",
    color: T.green,
    bg: T.greenDim,
    brd: T.greenBrd,
  },
  {
    title: "Dashboard",
    desc: "Return to the main operational dashboard.",
    href: "/dashboard",
    icon: "📊",
    color: T.text,
    bg: T.card,
    brd: T.border,
  },
];

export default function AdminPage() {
  const router = useRouter();

  return (
    <AppLayout title="Admin Dashboard">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        .admin-card{
          transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease;
        }
        .admin-card:hover{
          transform:translateY(-2px);
          box-shadow:0 18px 40px rgba(0,0,0,0.22);
        }
        @media (max-width: 768px){
          .admin-grid{
            grid-template-columns:1fr !important;
          }
        }
      `}</style>

      <div
        style={{
          fontFamily: "'IBM Plex Sans',sans-serif",
          color: T.text,
          padding: 20,
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "18px 20px",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: T.accent,
                  marginBottom: 4,
                }}
              >
                Admin
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Control Panel
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  color: T.textDim,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Open the section you want to manage.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.card,
                color: T.textMid,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans',sans-serif",
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        <div
          className="admin-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 14,
          }}
        >
          {CARDS.map((card) => (
            <button
              key={card.href}
              type="button"
              className="admin-card"
              onClick={() => router.push(card.href)}
              style={{
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${card.brd}`,
                background: T.panel,
                padding: 18,
                cursor: "pointer",
                width: "100%",
                color: T.text,
                fontFamily: "'IBM Plex Sans',sans-serif",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: card.bg,
                  border: `1px solid ${card.brd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  marginBottom: 14,
                }}
              >
                {card.icon}
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: card.color,
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {card.title}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: T.textMid,
                  lineHeight: 1.8,
                  minHeight: 48,
                }}
              >
                {card.desc}
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  fontWeight: 800,
                  color: T.textDim,
                  letterSpacing: "0.04em",
                }}
              >
                Open →
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
