"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

const allClients = {
  "CLT-001": {
    tag:"CLT-001", name:"Acme Industrial Corp", tradingName:"Acme Corp", regNo:"2022/456789", vatNo:"4589654123",
    industry:"Manufacturing", website:"www.acmecorp.com", contractStartDate:"2022-01-15",
    status:"Active", email:"contact@acme.com", phone:"+27 11 555 0101",
    address:"14 Industrial Drive, Germiston, 1401", city:"Johannesburg", province:"Gauteng", country:"South Africa",
    primaryContact:"James Wright", primaryEmail:"jwright@acme.com", primaryPhone:"+27 11 555 0101",
    portalEnabled:true, portalEmail:"portal@acme.com",
  },
};

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
};

const labelStyle = { fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" };

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
    loadClient();
  }

  function loadClient() {
    const tag = params.id;
    const foundClient = allClients[tag];
    if (foundClient) {
      setForm(foundClient);
    }
    setLoading(false);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .update(form)
        .eq("tag", params.id);

      if (error) {
        alert("Error: " + error.message);
        return;
      }

      alert("Client updated successfully!");
      router.push(`/clients/${params.id}`);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href={`/clients/${params.id}`} style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Client</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            Edit Client
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Update client information</p>
        </div>
      </div>

      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(79,195,247,0.2)", borderRadius:18,
        padding:"28px", maxWidth:"100%",
      }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Company Information</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={form.name || ""} onChange={e=>setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Trading Name</label>
            <input style={inputStyle} value={form.tradingName || ""} onChange={e=>setForm({...form, tradingName: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Registration No</label>
            <input style={inputStyle} value={form.regNo || ""} onChange={e=>setForm({...form, regNo: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>VAT No</label>
            <input style={inputStyle} value={form.vatNo || ""} onChange={e=>setForm({...form, vatNo: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <input style={inputStyle} value={form.industry || ""} onChange={e=>setForm({...form, industry: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={form.website || ""} onChange={e=>setForm({...form, website: e.target.value})} />
          </div>
        </div>

        <h2 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:24 }}>Contact Information</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email || ""} onChange={e=>setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone || ""} onChange={e=>setForm({...form, phone: e.target.value})} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address || ""} onChange={e=>setForm({...form, address: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city || ""} onChange={e=>setForm({...form, city: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Province</label>
            <input style={inputStyle} value={form.province || ""} onChange={e=>setForm({...form, province: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <input style={inputStyle} value={form.country || ""} onChange={e=>setForm({...form, country: e.target.value})} />
          </div>
        </div>

        <h2 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:24 }}>Primary Contact</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Contact Name</label>
            <input style={inputStyle} value={form.primaryContact || ""} onChange={e=>setForm({...form, primaryContact: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.primaryEmail || ""} onChange={e=>setForm({...form, primaryEmail: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.primaryPhone || ""} onChange={e=>setForm({...form, primaryPhone: e.target.value})} />
          </div>
        </div>

        <h2 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:24 }}>Portal Access</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <div>
            <label style={labelStyle}>Portal Enabled</label>
            <select style={inputStyle} value={form.portalEnabled ? "Yes" : "No"} onChange={e=>setForm({...form, portalEnabled: e.target.value==="Yes"})}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(79,195,247,0.15)";
                e.currentTarget.style.borderColor = "rgba(79,195,247,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(124,92,252,0.25)";
              }}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Portal Email</label>
            <input style={inputStyle} value={form.portalEmail || ""} onChange={e=>setForm({...form, portalEmail: e.target.value})} />
          </div>
        </div>

        <div style={{ display:"flex", gap:12, marginTop:28 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding:"11px 24px", borderRadius:12, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
            fontWeight:700, fontSize:13, background:`linear-gradient(135deg,${C.green},${C.blue})`,
            border:"none", color:"#fff", opacity:saving?0.6:1,
          }}>{saving ? "Saving..." : "💾 Save Changes"}</button>
          <button onClick={() => router.push(`/clients/${params.id}`)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
            fontWeight:700, fontSize:13, background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
          }}>Cancel</button>
        </div>
      </div>
    </AppLayout>
  );
}
