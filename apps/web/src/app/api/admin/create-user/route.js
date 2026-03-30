// src/app/api/admin/create-user/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://monroy-qms.co.bw";

    const supabaseAdmin = adminClient();

    // 1. Invite user — Supabase sends email with set-password link
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: userRole },
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Auth user created but no ID returned." }, { status: 500 });
    }

    // 2. Check if user already exists in users table
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) {
      // Already exists — just update role and status
      await supabaseAdmin.from("users").update({
        full_name,
        role: userRole,
        status: "active",
        email,
      }).eq("id", userId);
    } else {
      // Insert new record — only include columns that exist
      const { error: dbErr } = await supabaseAdmin.from("users").insert({
        id: userId,
        email,
        full_name,
        role: userRole,
        status: "active",
      });

      if (dbErr) {
        // Log but don't fail — auth invite was sent successfully
        console.error("users table insert failed:", dbErr.message);
        // Return partial success — invite sent, profile may need manual fix
        return NextResponse.json({
          success: true,
          warning: `Invitation sent but profile DB insert failed: ${dbErr.message}. The user can still log in.`,
          user: { id: userId, email, full_name, role: userRole },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name, role: userRole },
      message: `Invitation sent to ${email}. They will receive an email to set their password.`,
    });

  } catch (err) {
    console.error("create-user error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
