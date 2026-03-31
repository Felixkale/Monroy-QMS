// src/app/clients/[id]/edit/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const IS = { width:"100%", padding:"11px 14px", background:"rgba(18,30,50,0.70)", border:`1px solid rgba(148,163,184,0.12)`, borderRadius:10, color:"#f0f6ff", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color .2s" };
const LS = { fontSize:10, fontWeight:700, color:"rgba(240,246,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" };
const SS = { fontSize:11, fontWeight:800, color:T.accent, textTransform:"uppercase", letterSpacing:"0.12em", borderBottom:`1px solid ${T.accentBrd}`, paddingBottom:8, marginBottom:16, marginTop:4 };

const INDUSTRIES = [
  "Manufacturing","Mining","Oil & Gas","Construction","Energy & Utilities",
  "Food & Beverage","Chemical","Pharmaceutical","Agriculture","Transport & Logistics","Other",
];
const COUNTRIES = ["Botswana","South Africa","Zimbabwe","Zambia","Namibia","Mozambique","Other"];
const BOTSWANA_LOCATIONS = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Serowe","Molepolole","Kanye","Mahalapye","Palapye",
  "Mochudi","Ramotswa","Mogoditshane","Tlokweng","Letlhakane","Bobonong","Tutume",
  "Morupule Colliery","Sua Pan (Botash)","Damtshaa Mine","Letlhakane Mine",
  "Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)","Morupule Power Station",
  "Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];

function CityPicker({ value, onChange }) {
  const isManual = value && !BOTSWANA_LOCATIONS.includes(value);
  const [manual, setManual] = useState(isManual);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <select style={{ ...IS, cursor:"pointer" }}
        value={manual ? "__manual__" : (value || "")}
        onChange={e => { if(e.target.value==="__manual__"){setManual(true);onChange("");}else{setManual(false);onChange(e.target.value);} }}>
        <option value="">— Select city / town —</option>
        {BOTSWANA_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        <option value="__manual__">✏ Type manually…</option>
      </select>
      {manual && <input style={{ ...IS, borderColor:"rgba(34,211,238,0.35)" }} type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder="Enter city / town name" autoFocus/>}
    </div>
  );
}

function DeleteModal({ clientName, onConfirm, onCancel, deleting }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"linear-gradient(160deg,#0d1626,#070e18)", border:`1px solid ${T.redBrd}`, borderRadius:20, width:"100%", maxWidth:420, padding:"28px 24px" }}>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🗑️</div>
          <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:900, color:T.text }}>Delete Client</h2>
          <p style={{ margin:0, fontSize:13, color:T.textDim, lineHeight:1.7 }}>
            Permanently delete <strong style={{ color:T.text }}>{clientName}</strong>?<br/>
            This action <strong style={{ color:T.red }}>cannot be undone</strong>.
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button type="button" onClick={onCancel} disabled={deleting} style={{ flex:1, padding:"11px", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:T.card, border:`1px solid ${T.border}`, color:T.textMid }}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={deleting} style={{ flex:1, padding:"11px", borderRadius:10, cursor:deleting?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:"linear-gradient(135deg,#f87171,#ef4444)", border:"none", color:"#fff", opacity:deleting?0.7:1 }}>
            {deleting ? "Deleting…" : "🗑️ Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAdmin,     setIsAdmin]     = useState(false);

  const [form, setForm] = useState({
    company_name:"", company_code:"", industry:"",
    contact_person:"", contact_email:"", contact_phone:"",
    address:"", city:"", country:"Botswana", status:"active",
  });

  useEffect(() => {
    async function init() {
      // Check role from users table — not by email string matching
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("users").select("role").eq("id", authData.user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
      await loadClient();
    }
    init();
  }, [params.id]);

  async function loadClient() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,company_name,company_code,industry,contact_person,contact_email,contact_phone,address,city,country,status")
      .eq("id", params.id)
      .single();
    if (!error && data) {
      setForm({
        company_name:   data.company_name   || "",
        company_code:   data.company_code   || "",
        industry:       data.industry       || "",
        contact_person: data.contact_person || "",
        contact_email:  data.contact_email  || "",
        contact_phone:  data.contact_phone  || "",
        address:        data.address        || "",
        city:           data.city           || "",
        country:        data.country        || "Botswana",
        status:         data.status         || "active",
      });
    }
    setLoading(false);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  async function handleSave() {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    const { error } = await supabase.from("clients").update({
      company_name:   form.company_name.trim(),
      company_code:   form.company_code.trim(),
      industry:       form.industry?.trim() || null,
      contact_person: form.contact_person?.trim() || null,
      contact_email:  form.contact_email?.trim() || null,
      contact_phone:  form.contact_phone?.trim() || null,
      address:        form.address?.trim() || null,
      city:           form.city?.trim() || null,
      country:        form.country?.trim() || "Botswana",
      status:         form.status,
    }).eq("id", params.id);
    if (error) { setSaveError(error.message); }
    else { setSaveSuccess(true); setTimeout(() => router.push(`/clients/${params.id}`), 1200); }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", params.id);
    if (error) { alert("Delete failed: " + error.message); setDeleting(false); setShowDelete(false); }
    else router.push("/clients");
  }

  if (loading) return (
    <AppLayout title="Edit Client">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
        <div style={{ textAlign:"center", color:T.textDim }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:14 }}>Loading client…</div>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Edit Client">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder{color:rgba(240,246,255,0.25)}
        select option{background:#0a1420;color:#f0f6ff}
        input:focus,select:focus{border-color:${T.accent}!important;outline:none}
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14, marginBottom:20 }}>
        <div>
          <button type="button" onClick={()=>router.push(`/clients/${params.id}`)} style={{ background:"none", border:"none", color:T.textDim, fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:6, display:"block" }}>← Back to Client</button>
          <p style={{ color:T.textDim, margin:0, fontSize:12 }}>Update client details · Changes saved immediately</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={()=>setShowDelete(true)} style={{ padding:"8px 16px", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:12, background:T.redDim, border:`1px solid ${T.redBrd}`, color:T.red }}>
            🗑️ Delete Client
          </button>
        )}
      </div>

      {saveSuccess && <div style={{ marginBottom:16, padding:"11px 14px", borderRadius:10, background:T.greenDim, border:`1px solid ${T.greenBrd}`, color:T.green, fontSize:13, fontWeight:700 }}>✓ Client updated successfully! Redirecting…</div>}
      {saveError  && <div style={{ marginBottom:16, padding:"11px 14px", borderRadius:10, background:T.redDim,   border:`1px solid ${T.redBrd}`,   color:T.red,   fontSize:13 }}>⚠ {saveError}</div>}

      <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:16, padding:26 }}>

        <div style={SS}>🏢 Company Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:24 }}>
          <div><label style={LS}>Company Name *</label><input style={IS} value={form.company_name} onChange={e=>set("company_name",e.target.value)} placeholder="Company name"/></div>
          <div><label style={LS}>Company Code</label><input style={IS} value={form.company_code} onChange={e=>set("company_code",e.target.value)} placeholder="e.g. GMC-001"/></div>
          <div>
            <label style={LS}>Industry</label>
            <select style={{ ...IS, cursor:"pointer" }} value={form.industry} onChange={e=>set("industry",e.target.value)}>
              <option value="">— Select industry —</option>
              {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={LS}>Status</label>
            <select style={{ ...IS, cursor:"pointer" }} value={form.status} onChange={e=>set("status",e.target.value)}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={SS}>📞 Contact Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:24 }}>
          <div><label style={LS}>Contact Person</label><input style={IS} value={form.contact_person} onChange={e=>set("contact_person",e.target.value)} placeholder="Full name"/></div>
          <div><label style={LS}>Contact Email</label><input style={IS} type="email" value={form.contact_email} onChange={e=>set("contact_email",e.target.value)} placeholder="email@company.com"/></div>
          <div><label style={LS}>Contact Phone</label><input style={IS} type="tel" value={form.contact_phone} onChange={e=>set("contact_phone",e.target.value)} placeholder="+267 71 000 000"/></div>
        </div>

        <div style={SS}>📍 Address</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:14, marginBottom:24 }}>
          <div style={{ gridColumn:"1 / -1" }}><label style={LS}>Street Address</label><input style={IS} value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Plot / Street"/></div>
          <div><label style={LS}>City / Town</label><CityPicker value={form.city} onChange={v=>set("city",v)}/></div>
          <div>
            <label style={LS}>Country</label>
            <select style={{ ...IS, cursor:"pointer" }} value={form.country} onChange={e=>set("country",e.target.value)}>
              {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", paddingTop:18, borderTop:`1px solid ${T.border}` }}>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding:"11px 28px", borderRadius:10, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:900, fontSize:13, background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#0891b2)", border:"none", color:saving?"rgba(240,246,255,0.4)":"#052e16", opacity:saving?0.7:1 }}>
            {saving ? "⏳ Saving…" : "💾 Save Changes"}
          </button>
          <button type="button" onClick={()=>router.push(`/clients/${params.id}`)}
            style={{ padding:"11px 22px", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13, background:T.card, border:`1px solid ${T.border}`, color:T.textMid }}>
            Cancel
          </button>
        </div>
      </div>

      {showDelete && <DeleteModal clientName={form.company_name} onConfirm={handleDelete} onCancel={()=>setShowDelete(false)} deleting={deleting}/>}
    </AppLayout>
  );
}
