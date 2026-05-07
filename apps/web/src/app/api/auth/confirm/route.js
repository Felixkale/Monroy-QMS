// src/app/auth/confirm/route.js
// Handles the PKCE flow — Supabase newer invite emails send a ?code= param
// instead of a hash fragment. This route exchanges it for a session then
// redirects the user to /reset-password.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/reset-password";

  if (!code) {
    // No code — redirect to reset-password and let the client-side
    // hash token handler take over (legacy invite URL format)
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(
      `${origin}/reset-password?error=invalid_or_expired_link&error_description=${encodeURIComponent(error.message)}`
    );
  }

  // Session is now set in cookies — redirect to the password creation page
  return NextResponse.redirect(`${origin}${next}`);
}
