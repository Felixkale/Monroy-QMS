"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import AppLayout from "../../../../components/AppLayout";

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
const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [user, setUser]       = useState(null);
  const [form, setForm]       = useState({});

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
    loadClient();
  }

  function loadClient() {
    const found = allClients[params.id];
    if (found) setForm(found);
    setLoading(false);
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("clients").update(form).eq("tag", params.id);
      if (error) throw error;
      alert("✅ Client updated successfully!");
      router.push(`/clients/${params.id}`);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href={`/clients/${params.id}`} style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Client</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>Edit Client</h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Update client information</p>
        </div>
      </div>

      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(79,195,247,0.2)", borderRadius:18, padding:28,
      }}>
        <SectionTitle title="Company Information"/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Company Name">    <input style={inputStyle} value={form.name||""}           onChange={e=>set("name",e.target.value)}/></Field>
          <Field label="Trading Name">    <input style={inputStyle} value={form.tradingName||""}    onChange={e=>set("tradingName",e.target.value)}/></Field>
          <Field label="Registration No"> <input style={inputStyle} value={form.regNo||""}          onChange={e=>set("regNo",e.target.value)}/></Field>
          <Field label="VAT No">          <input style={inputStyle} value={form.vatNo||""}          onChange={e=>set("vatNo",e.target.value)}/></Field>
          <Field label="Industry">        <input style={inputStyle} value={form.industry||""}       onChange={e=>set("industry",e.target.value)}/></Field>
          <Field label="Website">         <input style={inputStyle} value={form.website||""}        onChange={e=>set("website",e.target.value)}/></Field>
        </div>

        <SectionTitle title="Contact Information"/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Email">   <input style={inputStyle} value={form.email||""}    onChange={e=>set("email",e.target.value)}/></Field>
          <Field label="Phone">   <input style={inputStyle} value={form.phone||""}    onChange={e=>set("phone",e.target.value)}/></Field>
          <div style={{ gridColumn:"1/-1" }}>
            <Field label="Address"><input style={inputStyle} value={form.address||""} onChange={e=>set("address",e.target.value)}/></Field>
          </div>
          <Field label="City">     <input style={inputStyle} value={form.city||""}     onChange={e=>set("city",e.target.value)}/></Field>
          <Field label="Province">  <input style={inputStyle} value={form.province||""} onChange={e=>set("province",e.target.value)}/></Field>
          <Field label="Country">   <input style={inputStyle} value={form.country||""}  onChange={e=>set("country",e.target.value)}/></Field>
        </div>

        <SectionTitle title="Primary Contact"/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
          <Field label="Contact Name"><input style={inputStyle} value={form.primaryContact||""} onChange={e=>set("primaryContact",e.target.value)}/></Field>
          <Field label="Email">       <input style={inputStyle} value={form.primaryEmail||""}   onChange={e=>set("primaryEmail",e.target.value)}/></Field>
          <Field label="Phone">       <input style={inputStyle} value={form.primaryPhone||""}   onChange={e=>set("primaryPhone",e.target.value)}/></Field>
        </div>

        <SectionTitle title="Portal Access"/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:28 }}>
          <Field label="Portal Enabled">
            <select style={{ ...inputStyle, cursor:"pointer" }} value={form.portalEnabled?"Yes":"No"} onChange={e=>set("portalEnabled",e.target.value==="Yes")}>
              <option>Yes</option>
              <option>No</option>
            </select>
          </Field>
          <Field label="Portal Email"><input style={inputStyle} value={form.portalEmail||""} onChange={e=>set("portalEmail",e.target.value)}/></Field>
        </div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding:"11px 24px", borderRadius:12, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
            fontWeight:700, fontSize:13, background:`linear-gradient(135deg,${C.green},${C.blue})`,
            border:"none", color:"#fff", opacity:saving?0.6:1,
          }}>{saving ? "Saving..." : "💾 Save Changes"}</button>
          <button onClick={()=>router.push(`/clients/${params.id}`)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
            fontWeight:700, fontSize:13, background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
          }}>Cancel</button>
        </div>
      </div>
    </AppLayout>
  );
}

function SectionTitle({ title }) {
  return <h2 style={{ fontSize:15, fontWeight:800, color:"#fff", margin:"0 0 16px" }}>{title}</h2>;
}
function Field({ label, children }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>;
}
