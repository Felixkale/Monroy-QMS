// src/app/page.jsx
// ─────────────────────────────────────────────────────────────
//  Monroy QMS — Public Landing Page
//  Server Component: fetches live stats with service role key
//  (bypasses RLS so anon users see real counts)
//  Route: /   PUBLIC — no auth required
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import LandingClient from "@/components/LandingClient";

async function getLandingStats() {
  try {
    // Service role key bypasses RLS — safe here because we only
    // return aggregate counts, zero PII or private data.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY  // server-only env var, never exposed to browser
    );

    const [clientsRes, assetsRes, certsRes, ncrsRes] = await Promise.all([
      supabase.from("clients").select("status"),
      supabase.from("assets").select("status"),
      supabase.from("certificates").select("status, valid_to"),
      supabase.from("ncrs").select("status"),
    ]);

    const clients = clientsRes.data  || [];
    const assets  = assetsRes.data   || [];
    const certs   = certsRes.data    || [];
    const ncrs    = ncrsRes.data     || [];

    const today = new Date(); today.setHours(0,0,0,0);
    const in30  = new Date(today); in30.setDate(today.getDate() + 30);

    return {
      clients:       clients.length,
      activeClients: clients.filter(c => c.status === "active").length,
      equipment:     assets.length,
      activeEquip:   assets.filter(a => a.status === "active").length,
      certificates:  certs.length,
      expiringSoon:  certs.filter(c => {
        if (!c.valid_to) return false;
        const d = new Date(c.valid_to); d.setHours(0,0,0,0);
        return d >= today && d <= in30;
      }).length,
      openNcrs: ncrs.filter(n => n.status === "open").length,
    };
  } catch (e) {
    console.error("Landing stats error:", e);
    return {
      clients:0, activeClients:0, equipment:0, activeEquip:0,
      certificates:0, expiringSoon:0, openNcrs:0,
    };
  }
}

export default async function LandingPage() {
  const stats = await getLandingStats();
  return <LandingClient stats={stats} />;
}
