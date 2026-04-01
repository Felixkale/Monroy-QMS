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
    const full_name = String(body?.full_name || "").trim();
    const role = String(body?.role || "").trim();

    if (!email || !full_name) {
      return NextResponse.json(
        { error: "Email and full name are required." },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "inspector", "viewer"];
    const userRole = validRoles.includes(role) ? role : "inspector";

    const admin = adminClient();

    const { data: authData, error: authErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: userRole },
      redirectTo: `${SITE_URL}/reset-password`,
    });

    if (authErr) {
      if (authErr.message?.toLowerCase().includes("already")) {
        return NextResponse.json(
          {
            error: `${email} already has an account or pending invite. Use "Resend Email" instead.`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Auth error: ${authErr.message}` },
        { status: 400 }
      );
    }

    const userId = authData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Invite sent but no user ID returned from Supabase." },
        { status: 500 }
      );
    }

    const { error: dbErr } = await admin.rpc("upsert_user_profile", {
      p_id: userId,
      p_email: email,
      p_full_name: full_name,
      p_role: userRole,
      p_status: "active",
    });

    if (dbErr) {
      const { error: directErr } = await admin
        .from("users")
        .upsert(
          {
            id: userId,
            email,
            full_name,
            role: userRole,
            status: "active",
          },
          { onConflict: "id", ignoreDuplicates: false }
        );

      if (directErr) {
        console.error("users upsert failed:", directErr.message);

        return NextResponse.json({
          success: true,
          warning: `Invitation sent but profile pre-registration failed: ${directErr.message}. The user's profile will be created automatically when they confirm their email.`,
          user: { id: userId, email, full_name, role: userRole },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name, role: userRole },
      message: `Invitation sent to ${email}.`,
    });
  } catch (err) {
    console.error("create-user error:", err);

    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
