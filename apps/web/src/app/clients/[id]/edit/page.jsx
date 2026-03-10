"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClientById, updateClient } from "@/lib/clientService";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };

const INDUSTRIES = [
  "Manufacturing","Mining","Oil & Gas","Construction","Energy & Utilities",
  "Food & Beverage","Chemical","Pharmaceutical","Agriculture","Transport & Logistics","Other",
];
const COUNTRIES = ["Botswana","South Africa","Zimbabwe","Zambia","Namibia","Mozambique","Other"];

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(102,126,234,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
  boxSizing:"border-box", transition:"border-color .2s",
};
const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};
const sectionStyle = {
  fontSize:11, fontWeight:800, color:"#667eea",
  textTransform:"uppercase", letterSpacing:"0.12em",
  borderBottom:"1px solid rgba(102,126,234,0.2)",
  paddingBottom:8, marginBottom:16, marginTop:4,
};

const focus = (e) => (e.target.style.borderColor = "#667eea");
const blur  = (e) => (e.target.style.borderColor = "rgba(102,126,234,0.25)");

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({ clientName, onConfirm, onCancel, deleting }) {
  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:20,
    }}>
      <div style={{
        background:"linear-gradient(160deg,#1a1f2e,#0f1419)",
        border:"1px solid rgba(244,114,182,0.35)",
        borderRadius:20, width:"100%", maxWidth:440,
        padding:"32px 28px",
        boxShadow:"0 0 60px rgba(244,114,182,0.15)",
      }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
          <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:900, color:"#fff" }}>Delete Client</h2>
          <p style={{ margin:0, fontSize:13, color:"#64748b", lineHeight:1.6 }}>
            Are you sure you want to permanently delete <strong style={{ color:"#e2e8f0" }}>{clientName}</strong>?
            <br/>This action <strong style={{ color:C.pink }}>cannot be undone</strong>.
          </p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex:1, padding:"11px", borderRadius:10, cursor:"pointer",
              fontFamily:"inherit", fontWeight:700, fontSize:13,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex:1, padding:"11px", borderRadius:10,
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily:"inherit", fontWeight:700, fontSize:13,
              background:"linear-gradient(135deg,#f472b6,#ef4444)",
              border:"none", color:"#fff", opacity: deleting ? 0.7 : 1,
            }}
          >{deleting ? "Deleting…" : "🗑️ Yes, Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();

  const [loading,       setLoading]      = useState(true);
  const [saving,        setSaving]       = useState(false);
  const [deleting,      setDeleting]     = useState(false);
  const [showDelete,    setShowDelete]   = useState(false);
  const [saveError,     setSaveError]    = useState(null);
  const [saveSuccess,   setSaveSuccess]  = useState(false);
  const [isAdmin,       setIsAdmin]      = useState(false);

  const [form, setForm] = useState({
    company_name:"", company_code:"", industry:"", contact_person:"",
    contact_email:"", contact_phone:"", address:"", city:"",
    country:"Botswana", status:"active",
  });

  // ── Auth + load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.replace("/login"); return; }
      setIsAdmin(data.user.email?.includes("admin") ?? false);
      await loadClient();
    }
    init();
  }, [params.id]);

  async function loadClient() {
    setLoading(true);
    const { data, error } = await getClientById(params.id);
    if (error || !data) {
      setLoading(false);
      return;
    }
    // Map Supabase columns directly into form — no field mismatch
    setForm({
      company_name:    data.company_name    || "",
      company_code:    data.company_code    || "",
      industry:        data.industry        || "",
      contact_person:  data.contact_person  || "",
      contact_email:   data.contact_email   || "",
      contact_phone:   data.contact_phone   || "",
      address:         data.address         || "",
      city:            data.city            || "",
      country:         data.country         || "Botswana",
      status:          data.status          || "active",
    });
    setLoading(false);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const { error } = await updateClient(params.id, form);
    if (error) {
      setSaveError(typeof error === "string" ? error : error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => router.push(`/clients/${params.id}`), 1200);
    }
    setSaving(false);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("clients").delete().eq("id", params.id);
      if (error) throw error;
      router.push("/clients");
    } catch (err) {
      alert("Delete failed: " + err.message);
      setDeleting(false);
      setShowDelete(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Edit Client">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🏢</div>
            <div style={{ color:"#64748b", fontSize:14 }}>Loading client…</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Client">
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(102,126,234,0.25); border-radius: 10px; }
        select option { background: #1a1f2e; color: #e2e8f0; }
        input::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:10, display:"block" }}
          >← Back to Client</button>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>
            Update client details · Changes are saved to the database
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowDelete(true)}
            style={{
              padding:"9px 18px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              fontWeight:700, fontSize:12,
              background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", color:C.pink,
            }}
          >🗑️ Delete Client</button>
        )}
      </div>

      {/* ── Success / Error banners ── */}
      {saveSuccess && (
        <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:10, background:"rgba(0,245,196,0.08)", border:"1px solid rgba(0,245,196,0.25)", color:C.green, fontSize:13, fontWeight:600 }}>
          ✅ Client updated successfully! Redirecting…
        </div>
      )}
      {saveError && (
        <div style={{ marginBottom:20, padding:"12px 16px", borderRadius:10, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)", color:"#f87171", fontSize:13 }}>
          ❌ {saveError}
        </div>
      )}

      {/* ── Form card ── */}
      <div style={{
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(102,126,234,0.18)",
        borderRadius:18, padding:"28px",
      }}>

        {/* 1. Company Information */}
        <div style={sectionStyle}>🏢 Company Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
          <div>
            <label style={labelStyle}>Company Name *</label>
            <input style={inputStyle} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. Acme Industrial Corp" onFocus={focus} onBlur={blur} required />
          </div>
          <div>
            <label style={labelStyle}>Company Code</label>
            <input style={inputStyle} value={form.company_code} onChange={e => set("company_code", e.target.value)} placeholder="e.g. CLT-001" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <select style={{ ...inputStyle, cursor:"pointer" }} value={form.industry} onChange={e => set("industry", e.target.value)}>
              <option value="">— Select industry —</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, cursor:"pointer" }} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* 2. Contact Information */}
        <div style={sectionStyle}>📞 Contact Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input style={inputStyle} value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="Full name" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Contact Email</label>
            <input style={inputStyle} type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="email@company.com" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Contact Phone</label>
            <input style={inputStyle} type="tel" value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+267 71 000 000" onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {/* 3. Address */}
        <div style={sectionStyle}>📍 Address</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={labelStyle}>Street Address</label>
            <input style={inputStyle} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Plot / Street" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>City / Town</label>
            <input style={inputStyle} value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Gaborone" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <select style={{ ...inputStyle, cursor:"pointer" }} value={form.country} onChange={e => set("country", e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{
          display:"flex", gap:12, flexWrap:"wrap",
          paddingTop:20, borderTop:"1px solid rgba(102,126,234,0.12)",
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding:"11px 28px", borderRadius:10,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily:"inherit", fontWeight:700, fontSize:13,
              background:"linear-gradient(135deg,#667eea,#764ba2)",
              border:"none", color:"#fff",
              boxShadow:"0 0 20px rgba(102,126,234,0.35)",
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? "⏳ Saving…" : "💾 Save Changes"}</button>

          <button
            onClick={() => router.push(`/clients/${params.id}`)}
            style={{
              padding:"11px 24px", borderRadius:10, cursor:"pointer",
              fontFamily:"inherit", fontWeight:700, fontSize:13,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}
          >Cancel</button>
        </div>
      </div>

      {/* ── Delete Modal ── */}
      {showDelete && (
        <DeleteModal
          clientName={form.company_name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </AppLayout>
  );
}
