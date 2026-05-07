// src/app/auth/confirm/route.js

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

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
        getAll()                { return cookieStore.getAll(); },
        setAll(cookiesToSet)    {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // ── Flow 1: token_hash (email template uses this) ──
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type, // "invite" | "recovery" | "email"
    });

    if (error) {
      console.error("[auth/confirm] verifyOtp error:", error.message);
      return NextResponse.redirect(
        `${origin}/reset-password?error=invalid_or_expired_link&error_description=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // ── Flow 2: code (PKCE flow, newer Supabase versions) ──
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(
        `${origin}/reset-password?error=invalid_or_expired_link&error_description=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // ── No token at all ──
  return NextResponse.redirect(
    `${origin}/reset-password?error=missing_token&error_description=No+token+found+in+link`
  );
}
