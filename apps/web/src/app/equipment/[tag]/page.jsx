"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196", [C.blue]:"79,195,247",
  [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36",
};
const licenseColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

export default function EquipmentDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const tag      = params?.tag;

  const [equipment, setEquipment] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [user,      setUser]      = useState(null);
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [tab,       setTab]       = useState("overview");
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setIsAdmin(data.user.email?.includes("admin") ?? false);
    }
    checkAuth();
  }, [router]);

  // ── Load equipment from Supabase ──────────────────────────────────────────
  const loadEquipment = useCallback(async () => {
    if (!tag) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          nameplate_data (*),
          equipment_photos (*),
          equipment_documents (*),
          audit_trail (*)
        `)
        .eq("tag", tag)
        .single();

      if (error) throw error;
      if (!data)  throw new Error("Equipment not found");

      setEquipment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    if (user) loadEquipment();
  }, [user, loadEquipment]);

  // ── Photo upload ──────────────────────────────────────────────────────────
  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const ext      = file.name.split(".").pop();
        const fileName = `${equipment.tag}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from("equipment-photos")
          .upload(fileName, file, { upsert: false });
        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage
          .from("equipment-photos")
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from("equipment_photos")
          .insert({
            equipment_tag: equipment.tag,
            file_name:     file.name,
            storage_path:  fileName,
            public_url:    urlData.publicUrl,
            uploaded_by:   user.email,
          });
        if (dbError) throw dbError;
      }

      // Log to audit trail
      await supabase.from("audit_trail").insert({
        equipment_tag: equipment.tag,
        action:        "Photos Uploaded",
        details:       `${files.length} photo(s) added`,
        performed_by:  user.email,
      });

      await loadEquipment();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Delete equipment ──────────────────────────────────────────────────────
  async function deleteEquipment() {
    if (!isAdmin) return;
    if (!confirm(`Permanently delete ${equipment.tag}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      // Delete storage photos first
      const photos = equipment.equipment_photos || [];
      if (photos.length) {
        const paths = photos.map(p => p.storage_path).filter(Boolean);
        if (paths.length) {
          await supabase.storage.from("equipment-photos").remove(paths);
        }
      }

      // Delete DB record (cascade deletes related rows if FK + ON DELETE CASCADE set)
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("tag", equipment.tag);
      if (error) throw error;

      router.push("/equipment");
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardStyle = (accentColor) => ({
    background: "rgba(255,255,255,0.02)",
    border: `1px solid rgba(${rgbaMap[accentColor] || "102,126,234"},0.2)`,
    borderRadius: 16,
    padding: 20,
  });

  const tabs = [
    { id:"overview",  label:"Overview",      icon:"📊" },
    { id:"nameplate", label:"Nameplate Data", icon:"📋" },
    { id:"photos",    label:"Photos",         icon:"📷" },
    { id:"documents", label:"Documents",      icon:"📁" },
    { id:"audit",     label:"Audit Trail",    icon:"📜" },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Equipment Detail">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚙️</div>
            <div style={{ color:"#64748b", fontSize:14 }}>Loading equipment…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error / Not Found state ───────────────────────────────────────────────
  if (error || !equipment) {
    return (
      <AppLayout title="Equipment Not Found">
        <div style={{ textAlign:"center", padding:"80px 0" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
          <h2 style={{ color:"#fff", margin:"0 0 8px" }}>Equipment Not Found</h2>
          <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
            {error || `No equipment with tag "${tag}" exists in the register.`}
          </p>
          <button
            onClick={() => router.push("/equipment")}
            style={{
              padding:"10px 24px", background:"linear-gradient(135deg,#667eea,#764ba2)",
              color:"#fff", border:"none", borderRadius:8,
              cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:14,
            }}
          >← Back to Equipment</button>
        </div>
      </AppLayout>
    );
  }

  const lColor = licenseColor[equipment.license] || C.green;
  const lRgba  = rgbaMap[lColor];
  const photos    = equipment.equipment_photos   || [];
  const documents = equipment.equipment_documents|| [];
  const auditTrail= equipment.audit_trail        || [];
  const nameplate = equipment.nameplate_data?.[0] || {};

  return (
    <AppLayout title={equipment.tag}>
      <style>{`
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(102,126,234,0.25); border-radius: 10px; }
      `}</style>

      {/* ── Header row ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:24 }}>
        <div>
          <button
            onClick={() => router.push("/equipment")}
            style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:10, display:"block" }}
          >← Back to Equipment</button>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>
            {equipment.serial} · {equipment.type} · {equipment.client}
          </p>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <a
            href={`/qr-codes?tag=${equipment.tag}`}
            style={{ padding:"9px 16px", borderRadius:10, textDecoration:"none", background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green, fontWeight:700, fontSize:12 }}
          >🏷️ QR Code</a>

          <button
            onClick={() => router.push(`/equipment/${equipment.tag}/edit`)}
            style={{ padding:"9px 16px", borderRadius:10, background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)", color:C.purple, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
          >✏️ Edit</button>

          {isAdmin && (
            <button
              onClick={deleteEquipment}
              disabled={deleting}
              style={{ padding:"9px 16px", borderRadius:10, background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", color:C.pink, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit", opacity: deleting ? 0.6 : 1 }}
            >{deleting ? "Deleting…" : "🗑️ Delete"}</button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Type",      value:equipment.type,    color:C.blue },
          { label:"Status",    value:equipment.status,  color:equipment.status === "Active" ? C.green : C.pink },
          { label:"License",   value:equipment.license, color:lColor },
          { label:"Year Built",value:equipment.year_built, color:C.yellow },
        ].map(s => (
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", borderBottom:"1px solid rgba(102,126,234,0.1)" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap", background:"transparent",
              border:"none", borderBottom: tab === t.id ? `2px solid ${C.purple}` : "2px solid transparent",
              color: tab === t.id ? C.purple : "#64748b", transition:"all .2s",
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          <div style={cardStyle(C.blue)}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:4, height:18, borderRadius:2, background:C.blue }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>Equipment Details</span>
            </div>
            {[
              { label:"Manufacturer",   value:equipment.manufacturer },
              { label:"Model",          value:equipment.model },
              { label:"Location",       value:equipment.location },
              { label:"Department",     value:equipment.department },
              { label:"Client",         value:equipment.client },
              { label:"Installation Date", value:equipment.installation_date },
              { label:"License Expiry", value:equipment.license_expiry ?? equipment.licenseExpiry },
            ].map(f => f.value ? (
              <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{f.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
              </div>
            ) : null)}
          </div>

          <div style={cardStyle(lColor)}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:4, height:18, borderRadius:2, background:lColor }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>License Status</span>
            </div>
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🔐</div>
              <span style={{
                padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:700,
                background:`rgba(${lRgba},0.12)`, color:lColor,
                border:`1px solid rgba(${lRgba},0.3)`,
              }}>{equipment.license}</span>
              <p style={{ color:"#64748b", fontSize:12, marginTop:12 }}>
                Expires: {equipment.license_expiry ?? equipment.licenseExpiry ?? "—"}
              </p>
              {equipment.license === "Expiring" && (
                <div style={{ marginTop:12, padding:"8px 14px", borderRadius:8, background:`rgba(${lRgba},0.08)`, border:`1px solid rgba(${lRgba},0.2)`, fontSize:11, color:lColor }}>
                  ⚠️ License expiring soon — schedule renewal
                </div>
              )}
              {equipment.license === "Expired" && (
                <div style={{ marginTop:12, padding:"8px 14px", borderRadius:8, background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.2)", fontSize:11, color:C.pink }}>
                  ❌ License expired — equipment must not be operated
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NAMEPLATE ── */}
      {tab === "nameplate" && (
        <div style={cardStyle(C.blue)}>
          {Object.keys(nameplate).filter(k => !["id","equipment_tag","created_at"].includes(k) && nameplate[k]).length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px", color:"#64748b" }}>No nameplate data recorded yet</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>
              {Object.entries(nameplate)
                .filter(([k]) => !["id","equipment_tag","created_at"].includes(k))
                .filter(([, v]) => v !== null && v !== "")
                .map(([key, value]) => (
                  <div key={key} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"14px" }}>
                    <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4, fontWeight:600 }}>
                      {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{String(value)}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHOTOS ── */}
      {tab === "photos" && (
        <div>
          {uploadError && (
            <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:8, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", fontSize:12 }}>
              ❌ Upload failed: {uploadError}
            </div>
          )}

          <label style={{
            display:"block", padding:"28px", borderRadius:12, marginBottom:16,
            border:"2px dashed rgba(0,245,196,0.3)", background:"rgba(0,245,196,0.03)",
            textAlign:"center", cursor: uploading ? "wait" : "pointer", transition:"all 0.25s",
          }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = "rgba(0,245,196,0.6)"; }}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,245,196,0.3)"}
          >
            <div style={{ fontSize:28, marginBottom:8 }}>📷</div>
            <div style={{ color:"#94a3b8", fontSize:13, fontWeight:600 }}>
              {uploading ? "Uploading…" : "Click to upload photos"}
            </div>
            <div style={{ color:"#64748b", fontSize:11, marginTop:4 }}>JPG, PNG, WEBP accepted</div>
            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} disabled={uploading}/>
          </label>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {photos.length > 0 ? photos.map((photo, idx) => (
              <div key={idx} style={{
                aspectRatio:"1", borderRadius:12,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
                overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <img
                  src={photo.public_url || photo.url}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  alt={photo.file_name || photo.name}
                />
              </div>
            )) : (
              <div style={{ color:"#64748b", gridColumn:"1/-1", textAlign:"center", padding:"30px 0" }}>
                No photos uploaded yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === "documents" && (
        <div style={{ ...cardStyle(C.purple), padding:0, overflow:"hidden" }}>
          {documents.length > 0 ? documents.map((doc, i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 20px",
              borderBottom: i < documents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap", gap:10,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:"rgba(79,195,247,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📄</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{doc.file_name || doc.name}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>
                    {doc.file_type || doc.type} · {doc.file_size || doc.size} · {doc.uploaded_at || doc.date}
                  </div>
                </div>
              </div>
              <a
                href={doc.public_url || doc.download_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:12, background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green, textDecoration:"none" }}
              >⬇ Download</a>
            </div>
          )) : (
            <div style={{ padding:"40px", textAlign:"center", color:"#64748b" }}>
              No documents uploaded yet
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT TRAIL ── */}
      {tab === "audit" && (
        <div style={{ ...cardStyle(C.purple), padding:0, overflow:"hidden" }}>
          {auditTrail.length > 0 ? auditTrail
            .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
            .map((entry, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:14, padding:"14px 20px",
              borderBottom: i < auditTrail.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}`, flexShrink:0, marginTop:5 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{entry.action}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{entry.details}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, color:"#64748b" }}>{entry.performed_by || entry.user}</div>
                <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>
                  {new Date(entry.created_at || entry.date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding:"40px", textAlign:"center", color:"#64748b" }}>
              No audit trail available
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
