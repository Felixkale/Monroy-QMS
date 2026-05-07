import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const requestUrl = new URL(request.url);

  const token_hash = requestUrl.searchParams.get("token_hash");
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type") || "invite";
  const next = requestUrl.searchParams.get("next") || "/reset-password";

  const redirectTo = new URL(next, requestUrl.origin);

  // IMPORTANT
  const response = NextResponse.redirect(redirectTo);

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // INVITE / OTP FLOW
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error("verifyOtp error:", error.message);

      return NextResponse.redirect(
        new URL(
          `/reset-password?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin
        )
      );
    }

    return response;
  }

  // PKCE FLOW
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("exchangeCodeForSession error:", error.message);

      return NextResponse.redirect(
        new URL(
          `/reset-password?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin
        )
      );
    }

    return response;
  }

  return NextResponse.redirect(
    new URL(
      "/reset-password?error=missing_token",
      requestUrl.origin
    )
  );
}
