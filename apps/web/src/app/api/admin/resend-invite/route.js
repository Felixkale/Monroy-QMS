import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://monroy-qms.co.bw";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set in environment variables.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const admin = adminClient();

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to resend invitation." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${email}.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
