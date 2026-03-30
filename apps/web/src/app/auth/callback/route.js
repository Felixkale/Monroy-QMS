// src/app/auth/callback/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name)         { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options)     { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );

  // Exchange code for session
  const { data: { user }, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionErr || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // ── WHITELIST CHECK ──────────────────────────────────────────────────────
  // Check if this email exists in the users table (admin must add them first)
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("id, role, status, full_name")
    .eq("email", user.email)
    .maybeSingle();

  if (profileErr || !profile) {
    // Email not in whitelist — sign them out and block
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=not_whitelisted&email=${encodeURIComponent(user.email)}`
    );
  }

  if (profile.status === "inactive") {
    // Account deactivated by admin
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=account_inactive`);
  }

  // ── ALLOWED — update their profile with Google info if missing ───────────
  if (!profile.full_name && user.user_metadata?.full_name) {
    await supabase.from("users").update({
      full_name: user.user_metadata.full_name,
    }).eq("id", profile.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
