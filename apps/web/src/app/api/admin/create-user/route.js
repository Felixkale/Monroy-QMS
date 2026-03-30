// src/app/api/admin/create-user/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Service role client — bypasses RLS, needed to create auth users
function adminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set in environment variables.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, full_name, role } = body || {};

    if (!email || !full_name) {
      return NextResponse.json({ error: "email and full_name are required." }, { status: 400 });
    }

    const validRoles = ["admin", "inspector", "viewer"];
    const userRole = validRoles.includes(role) ? role : "inspector";

    const supabaseAdmin = adminClient();

    // 1. Invite user by email — Supabase sends them a magic link to set their own password
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: userRole },
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://monroy-qms.co.bw"}/reset-password`,
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 2. Insert into users table (for role/profile tracking)
    const { error: dbErr } = await supabaseAdmin.from("users").upsert({
      id: userId,
      email,
      full_name,
      role: userRole,
      status: "active",
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (dbErr) {
      console.error("users table insert failed:", dbErr.message);
      // Don't fail — auth user was created, profile can be fixed
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name, role: userRole },
      message: `User created. Confirmation email sent to ${email}.`,
    });

  } catch (err) {
    console.error("create-user error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
