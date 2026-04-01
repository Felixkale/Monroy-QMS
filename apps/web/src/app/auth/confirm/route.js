import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getSafeNext(next) {
  if (!next || typeof next !== "string") return "/reset-password";
  if (!next.startsWith("/")) return "/reset-password";
  if (next.startsWith("//")) return "/reset-password";
  return next;
}

function createSupabaseServer(cookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient(url, key, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/reset-password?error=missing_token", origin));
  }

  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServer(cookieStore);

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/reset-password?error=invalid_or_expired_link", origin)
      );
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch {
    return NextResponse.redirect(new URL("/reset-password?error=server_error", origin));
  }
}
