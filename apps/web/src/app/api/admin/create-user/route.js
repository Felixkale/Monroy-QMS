// src/app/api/admin/create-user/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set in Render environment variables.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "public" },
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, full_name, role } = body || {};

    if (!email || !full_name) {
      return NextResponse.json({ error: "Email and full name are required." }, { status: 400 });
    }

    const validRoles = ["admin", "inspector", "viewer"];
    const userRole   = validRoles.includes(role) ? role : "inspector";
    const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL || "https://monroy-qms.co.bw";

    const admin = adminClient();

    // ── Step 1: Send invite email via Supabase Auth ────────────────────────
    const { data: authData, error: authErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: userRole },
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (authErr) {
      // Handle already invited
      if (authErr.message?.includes("already been invited") || authErr.message?.includes("already registered")) {
        return NextResponse.json({ error: `${email} is already registered or has a pending invite.` }, { status: 409 });
      }
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Invite sent but could not get user ID." }, { status: 500 });
    }

    // ── Step 2: Upsert into users table using service role (bypasses RLS) ──
    const { error: dbErr } = await admin
      .from("users")
      .upsert(
        { id: userId, email, full_name, role: userRole, status: "active", created_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    if (dbErr) {
      console.error("DB upsert error:", dbErr.message);
      // Invite was sent — partial success
      return NextResponse.json({
        success: true,
        warning: `Invitation sent to ${email} but profile could not be saved (${dbErr.message}). Ask the user to log in — the trigger will create their profile automatically.`,
        user: { id: userId, email, full_name, role: userRole },
      });
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name, role: userRole },
      message: `Invitation sent to ${email}. They will receive an email to set their password.`,
    });

  } catch (err) {
    console.error("create-user error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected server error." }, { status: 500 });
  }
}
