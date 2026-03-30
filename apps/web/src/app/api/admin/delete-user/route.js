// src/app/api/admin/delete-user/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function DELETE(request) {
  try {
    const { userId } = await request.json().catch(() => ({}));
    if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

    const admin = adminClient();

    // 1. Delete from users table first
    await admin.from("users").delete().eq("id", userId);

    // 2. Delete from Supabase Auth (hard delete)
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, message: "User permanently deleted." });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
