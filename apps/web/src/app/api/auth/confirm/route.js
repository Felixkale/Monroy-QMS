// src/app/api/auth/confirm/route.js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Get the real public domain from the forwarded host header
  // Render proxies requests so request.url shows localhost:10000
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto") || "https";
  const SITE_URL = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : "https://monroy-qms.co.bw";

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

  return NextResponse.redirect(`${SITE_URL}/reset-password?error=missing_token`);
}
