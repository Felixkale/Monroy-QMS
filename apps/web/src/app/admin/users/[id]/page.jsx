"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const ROLE_COLOR = { "Super Admin":C.purple, "Supervisor":C.blue, "Inspector":C.green, "Viewer":C.yellow };

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile,  setProfile]  = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => { if (params?.id) loadProfile(params.id); }, [params?.id]);

  async function loadProfile(id) {
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (err || !data) {
      setError("User not found.");
    } else {
      setProfile(data);
      setEditRole(data.role   || "Inspector");
      setEditStatus(data.status || "active");
    }

    // Load recent certificates they issued
    const { data: certs } = await supabase
      .from("certificates")
      .select("certificate_number, equipment_description, issued_at, equipment_status")
      .eq("inspector_name", data?.full_name || "")
      .order("issued_at", { ascending:false })
      .limit(5);

    setActivity(certs || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase
      .from("profiles")
      .update({ role: editRole, status: editStatus })
      .eq("id", profile.id);

    setSaving(false);
    if (err) {
      setError("Failed to save: " + err.message);
    } else {
      setProfile(prev => ({ ...prev, role: editRole, status: editStatus }));
      setSuccess("User updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  const color    = ROLE_COLOR[profile?.role] || C.blue;
  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout title="User Profile">
      <div style={{ maxWidth: 800 }}>

        <button onClick={() => router.push("/admin")} style={{
          marginBottom:20, padding:"9px 18px", borderRadius:8,
          border:"1px solid rgba(255,255,255,0.1)",
          background:"rgba(255,255,255,0.05)",
          color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer",
        }}>
          ← Back to Admin
        </button>

        {loading ? (
          <div style={{ color:"#64748b", padding:"40px 0" }}>Loading user…</div>
        ) : error && !profile ? (
          <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
            borderRadius:12, padding:"20px", color:C.pink }}>⚠️ {error}</div>
        ) : profile && (
          <>
            {/* Profile header */}
            <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:24 }}>
              <div style={{
                width:64, height:64, borderRadius:14, flexShrink:0,
                background:`linear-gradient(135deg,${color},${C.blue})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:900, fontSize:22, color:"#fff",
              }}>{initials}</div>
              <div>
                <h1 style={{ color:"#fff", margin:"0 0 4px", fontSize:22, fontWeight:800 }}>
                  {profile.full_name || "Unnamed User"}
                </h1>
                <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{profile.email}</p>
              </div>
            </div>

            {error   && <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:C.pink, fontSize:13 }}>⚠️ {error}</div>}
            {success && <div style={{ background:"rgba(16,185,129,0.1)",  border:"1px solid rgba(16,185,129,0.3)",  borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#86efac", fontSize:13 }}>✅ {success}</div>}

            {/* Stats row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
              {[
                { label:"Role",       value:profile.role    || "—",       color: ROLE_COLOR[profile.role] || C.blue   },
                { label:"Status",     value:profile.status  || "active",  color: profile.status === "inactive" ? C.pink : C.green },
                { label:"Department", value:profile.department || "—",    color:C.blue                                },
                { label:"Joined",     value: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB") : "—", color:C.yellow },
              ].map(s => (
                <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>

              {/* Edit role/status */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:20 }}>
                <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>Edit User</h3>

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" }}>Role</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{
                    width:"100%", padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                  }}>
                    {["Super Admin","Supervisor","Inspector","Viewer"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" }}>Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{
                    width:"100%", padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                  }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button onClick={handleSave} disabled={saving} style={{
                  width:"100%", padding:"11px", borderRadius:8, border:"none", fontFamily:"inherit",
                  background: saving ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg,${C.purple},${C.blue})`,
                  color:"#fff", fontWeight:700, fontSize:13,
                  cursor: saving ? "not-allowed" : "pointer",
                }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

              {/* User info */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:20 }}>
                <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>User Info</h3>
                {[
                  { label:"Email",      value:profile.email            },
                  { label:"Phone",      value:profile.phone            },
                  { label:"Department", value:profile.department       },
                  { label:"Last Login", value:profile.last_sign_in_at
                    ? new Date(profile.last_sign_in_at).toLocaleString("en-GB")
                    : "Never" },
                ].map(f => (
                  <div key={f.label} style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"10px 0",
                    borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                    <span style={{ color:"#64748b", flexShrink:0 }}>{f.label}</span>
                    <span style={{ color:"#e2e8f0", fontWeight:600, textAlign:"right", wordBreak:"break-all" }}>{f.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent certificates */}
            {activity.length > 0 && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)", borderRadius:16, padding:20, marginTop:16 }}>
                <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>Recent Certificates Issued</h3>
                {activity.map((cert, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0",
                    borderBottom: i < activity.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:C.green, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>
                        {cert.certificate_number} — {cert.equipment_description}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", flexShrink:0 }}>
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-GB") : "—"}
                    </div>
                    <span style={{
                      padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700,
                      background: cert.equipment_status === "PASS" ? "rgba(0,245,196,0.1)" : "rgba(244,114,182,0.1)",
                      color:      cert.equipment_status === "PASS" ? C.green : C.pink,
                    }}>{cert.equipment_status || "PASS"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
