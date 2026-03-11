"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

const sectionHeadStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#667eea",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(102,126,234,0.2)",
  paddingBottom: 8,
  marginBottom: 16,
  marginTop: 8,
};

function SelectField({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        background: "#111827",
        color: "#e5e7eb",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

function formatDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function detectEquipmentType(assetType = "") {
  const type = String(assetType).toLowerCase();
  const pressureTypes = [
    "pressure vessel",
    "boiler",
    "air receiver",
    "air compressor",
    "oil separator",
  ];
  return pressureTypes.includes(type) ? "pv" : "lift";
}

function defaultCertificateType(assetType = "") {
  return detectEquipmentType(assetType) === "pv"
    ? "Pressure Test Certificate"
    : "Load Test Certificate";
}

function withUnit(value, unit) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text.toLowerCase().includes(unit.toLowerCase())) return text;
  return `${text} ${unit}`;
}

export default function EditCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    asset_id: "",
    certificate_type: "",
    company: "",
    equipment_description: "",
    equipment_location: "",
    equipment_id: "",
    swl: "",
    mawp: "",
    equipment_status: "PASS",
    issued_at: "",
    valid_to: "",
    status: "issued",
    legal_framework: "",
    inspector_name: "",
    inspector_id: "",
    signature_url: "",
    logo_url: "",
    pdf_url: "",
  });

  useEffect(() => {
    async function loadAssets() {
      try {
        setAssetsLoading(true);

        const { data, error } = await supabase
          .from("assets")
          .select(`
            id,
            asset_name,
            asset_tag,
            asset_type,
            location,
            safe_working_load,
            working_pressure,
            next_inspection_date,
            design_standard,
            clients (
              company_name
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        setError(err?.message || "Failed to load equipment.");
      } finally {
        setAssetsLoading(false);
      }
    }

    loadAssets();
  }, []);

  useEffect(() => {
    async function loadCertificate() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("certificates")
          .select(`
            id,
            asset_id,
            certificate_type,
            company,
            equipment_description,
            equipment_location,
            equipment_id,
            swl,
            mawp,
            equipment_status,
            issued_at,
            valid_to,
            status,
            legal_framework,
            inspector_name,
            inspector_id,
            signature_url,
            logo_url,
            pdf_url
          `)
          .eq("id", id)
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Certificate not found.");
        }

        setForm({
          asset_id: data.asset_id || "",
          certificate_type: data.certificate_type || "",
          company: data.company || "",
          equipment_description: data.equipment_description || "",
          equipment_location: data.equipment_location || "",
          equipment_id: data.equipment_id || "",
          swl: data.swl || "",
          mawp: data.mawp || "",
          equipment_status: data.equipment_status || "PASS",
          issued_at: formatDateInput(data.issued_at),
          valid_to: formatDateInput(data.valid_to),
          status: data.status || "issued",
          legal_framework: data.legal_framework || "",
          inspector_name: data.inspector_name || "",
          inspector_id: data.inspector_id || "",
          signature_url: data.signature_url || "",
          logo_url: data.logo_url || "/logo.png",
          pdf_url: data.pdf_url || "",
        });
      } catch (err) {
        setError(err?.message || "Certificate not found.");
      } finally {
        setLoading(false);
      }
    }

    loadCertificate();
  }, [id]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === form.asset_id) || null,
    [assets, form.asset_id]
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUseEquipmentData() {
    if (!selectedAsset) return;

    const companyName = selectedAsset.clients?.company_name || "";
    const type = detectEquipmentType(selectedAsset.asset_type);

    setForm((prev) => ({
      ...prev,
      certificate_type:
        prev.certificate_type || defaultCertificateType(selectedAsset.asset_type),
      company: companyName,
      equipment_description: selectedAsset.asset_type || selectedAsset.asset_name || "",
      equipment_location: selectedAsset.location || "",
      equipment_id: selectedAsset.asset_tag || "",
      swl:
        type === "lift"
          ? withUnit(selectedAsset.safe_working_load, "Tons") || prev.swl
          : prev.swl,
      mawp:
        type === "pv"
          ? withUnit(selectedAsset.working_pressure, "kPa") || prev.mawp
          : prev.mawp,
      valid_to: prev.valid_to || formatDateInput(selectedAsset.next_inspection_date),
      legal_framework: prev.legal_framework || selectedAsset.design_standard || "",
    }));
  }

  async function handleSignatureUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingSignature(true);
      setError("");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${id}-${Date.now()}.${ext}`;
      const filePath = `certificate-signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        signature_url: data.publicUrl,
      }));
    } catch (err) {
      setError(err?.message || "Failed to upload signature.");
    } finally {
      setUploadingSignature(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        asset_id: form.asset_id,
        certificate_type: form.certificate_type,
        company: form.company,
        equipment_description: form.equipment_description,
        equipment_location: form.equipment_location,
        equipment_id: form.equipment_id,
        swl: withUnit(form.swl, "Tons"),
        mawp: withUnit(form.mawp, "kPa"),
        equipment_status: form.equipment_status,
        issued_at: new Date(form.issued_at).toISOString(),
        valid_to: form.valid_to,
        status: form.status,
        legal_framework: form.legal_framework,
        inspector_name: form.inspector_name,
        inspector_id: form.inspector_id,
        signature_url: form.signature_url,
        logo_url: form.logo_url,
        pdf_url: form.pdf_url,
      };

      const { error } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      router.push(`/certificates/${id}`);
    } catch (err) {
      setError(err?.message || "Failed to update certificate.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Certificate">
        <div style={{ color: "#fff", padding: 24 }}>Loading certificate...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Certificate">

      <div style={{maxWidth:960,margin:"0 auto"}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>

          <h1 style={{color:"#fff"}}>Certificate</h1>

          <button
            onClick={()=>{
              const url=`/certificates/print/${id}`;
              window.open(
                url,
                "print_certificate",
                "width=950,height=1200,scrollbars=yes,resizable=yes"
              );
            }}
            style={{
              padding:"11px 20px",
              borderRadius:8,
              background:"linear-gradient(135deg,#00f5c4,#4fc3f7)",
              color:"#111827",
              border:"none",
              fontWeight:700,
              cursor:"pointer"
            }}
          >
            Print Certificate
          </button>

        </div>

        {error && (
          <div style={{color:"#f87171",marginBottom:20}}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div style={sectionHeadStyle}>Certificate Data</div>

          <label style={labelStyle}>Inspector Name</label>
          <input
            style={inputStyle}
            name="inspector_name"
            value={form.inspector_name}
            onChange={handleChange}
          />

          <label style={labelStyle}>Upload Signature</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            style={inputStyle}
          />

          {form.signature_url && (
            <img
              src={form.signature_url}
              style={{height:90,marginTop:10}}
            />
          )}

          <div style={{marginTop:30}}>

            <button
              type="submit"
              style={{
                padding:"10px 18px",
                borderRadius:8,
                border:"none",
                background:"#2563eb",
                color:"#fff",
                fontWeight:700
              }}
            >
              Save
            </button>

          </div>

        </form>

      </div>

    </AppLayout>
  );
}
