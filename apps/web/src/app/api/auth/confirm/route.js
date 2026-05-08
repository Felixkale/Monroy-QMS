// src/app/api/auth/confirm/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// ✅ Use the public domain, not request.url origin
// Render runs internally on localhost:10000 so request.url gives wrong origin
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || process.env.NEXT_PUBLIC_APP_URL
  || "https://monroy-qms.co.bw";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const code       = searchParams.get("code");
  const type       = searchParams.get("type") || "invite";
  const next       = searchParams.get("next") || "/reset-password";

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()             { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // ── Flow 1: token_hash (what your email template sends) ──
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (error) {
      console.error("[auth/confirm] verifyOtp error:", error.message);
      return NextResponse.redirect(
        `${SITE_URL}/reset-password?error=invalid_or_expired_link&error_description=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${SITE_URL}${next}`);
  }

  // ── Flow 2: code (PKCE fallback) ──
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(
        `${SITE_URL}/reset-password?error=invalid_or_expired_link&error_description=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${SITE_URL}${next}`);
  }

  // ── No token ──
  return NextResponse.redirect(`${SITE_URL}/reset-password?error=missing_token`);
}
