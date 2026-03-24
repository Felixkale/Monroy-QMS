"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";
import {
  buildDocumentGroup,
  buildEquipmentDescription,
  detectEquipmentType,
  expiryBucketFromDate,
  normalizeText,
} from "@/lib/equipmentDetection";

const C = {
  green: "#00f5c4",
  blue: "#4fc3f7",
  purple: "#7c5cfc",
  pink: "#f472b6",
  yellow: "#fbbf24",
  bg: "#0f172a",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  text: "#e2e8f0",
  muted: "rgba(226,232,240,0.65)",
  inputBg: "rgba(255,255,255,0.04)",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.inputBg,
  color: C.text,
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: 6,
};

const sectionStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 20,
  marginBottom: 18,
};

const buttonBase = {
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

function isoDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(start, days) {
  const d = new Date(start || new Date());
  d.setDate(d.getDate() + days);
  return isoDateOnly(d);
}

function normalizeCertificateResult(value) {
  const v = String(value || "").trim().toUpperCase();

  if (["PASS", "FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "UNKNOWN"].includes(v)) {
    return v;
  }

  if (v === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  if (v === "OUT OF SERVICE") return "OUT_OF_SERVICE";

  return "PASS";
}

function normalizeCertificateStatus(value) {
  const v = String(value || "").trim().toLowerCase();

  if (["active", "issued", "draft", "expired", "inactive", "void"].includes(v)) {
    return v;
  }

  if (v === "archived") return "inactive";
  if (v === "revoked") return "void";

  return "active";
}

async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, company_code")
    .order("company_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getClientByName(companyName) {
  const clean = normalizeText(companyName);
  if (!clean) return null;

  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, company_code")
    .ilike("company_name", clean)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createClient(companyName) {
  const clean = normalizeText(companyName);

  const { data, error } = await supabase
    .from("clients")
    .insert([{ company_name: clean, status: "active" }])
    .select("id, company_name, company_code")
    .single();

  if (error) throw error;
  return data;
}

async function uploadToCertificatesBucket(file, folder) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("certificates")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("certificates").getPublicUrl(path);
  return data.publicUrl;
}

async function generateCertificateNumber(serialNumber, assetId) {
  const base = normalizeText(serialNumber)
    ? normalizeText(serialNumber).replace(/[\s\-\/]+/g, "").toUpperCase()
    : `ASSET${assetId}`;

  const prefix = `CERT-${base}-`;

  const { data, error } = await supabase
    .from("certificates")
    .select("certificate_number")
    .like("certificate_number", `${prefix}%`)
    .order("certificate_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  let next = 1;
  if (data?.certificate_number) {
    const parts = data.certificate_number.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(2, "0")}`;
}

export default function CreateCertificatePage() {
  const [loadingClients, setLoadingClients] = useState(true);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nameplateFile, setNameplateFile] = useState(null);
  const [nameplatePreview, setNameplatePreview] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    client_name: "",
    site_id: "",
    site_name: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    year_built: "",
    equipment_id: "",
    identification_number: "",
    capacity: "",
    swl: "",
    mawp: "",
    design_pressure: "",
    test_pressure: "",
    country_of_origin: "",
    equipment_type: "",
    equipment_description: "",
    asset_name: "",
    asset_tag: "",
    certificate_type: "Load Test Certificate",
    equipment_status: "PASS",
    document_status: "active",
    inspection_date: isoDateOnly(new Date()),
    issue_date: isoDateOnly(new Date()),
    expiry_date: addDays(new Date(), 365),
    inspector_name: "",
    inspector_id: "",
    remarks: "",
    pdf_url: "",
    nameplate_image_url: "",
    ocr_raw_text: "",
    detected_from_nameplate: false,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoadingClients(true);
        const rows = await getClients();
        if (mounted) setClients(rows);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load clients.");
      } finally {
        if (mounted) setLoadingClients(false);
      }
    }

    load();

    return () => {
      mounted = false;
      if (nameplatePreview) {
        URL.revokeObjectURL(nameplatePreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expiryBucket = useMemo(() => {
    return expiryBucketFromDate(form.expiry_date);
  }, [form.expiry_date]);

  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (
        [
          "manufacturer",
          "model",
          "capacity",
          "serial_number",
          "identification_number",
          "equipment_id",
          "equipment_type",
        ].includes(name)
      ) {
        next.equipment_description = buildEquipmentDescription({
          manufacturer: name === "manufacturer" ? value : next.manufacturer,
          equipment_type: name === "equipment_type" ? value : next.equipment_type,
          model: name === "model" ? value : next.model,
          capacity: name === "capacity" ? value : next.capacity,
          serial_number: name === "serial_number" ? value : next.serial_number,
          identification_number:
            name === "identification_number" ? value : next.identification_number,
          equipment_id: name === "equipment_id" ? value : next.equipment_id,
        });

        next.asset_name = next.equipment_description;
      }

      return next;
    });
  }

  function handleClientChange(e) {
    const value = e.target.value;
    const selected = clients.find((c) => String(c.id) === String(value));

    setForm((prev) => ({
      ...prev,
      client_id: selected?.id || "",
      client_name: selected?.company_name || prev.client_name,
    }));
  }

  function handleNameplateSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (nameplatePreview) URL.revokeObjectURL(nameplatePreview);

    setNameplateFile(file);
    setNameplatePreview(URL.createObjectURL(file));
    setSuccess("");
    setError("");
  }

  async function handleScanNameplate() {
    if (!nameplateFile) {
      setError("Choose or capture a nameplate image first.");
      return;
    }

    try {
      setScanLoading(true);
      setError("");
      setSuccess("");

      const body = new FormData();
      body.append("file", nameplateFile);

      const res = await fetch("/api/nameplate/scan", {
        method: "POST",
        body,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to scan nameplate.");
      }

      const parsed = json.parsed || {};
      const detection = detectEquipmentType({
        raw_text: json.ocr?.raw_text || parsed.raw_text || "",
        manufacturer: parsed.manufacturer,
        model: parsed.model,
        serial_number: parsed.serial_number,
        capacity: parsed.capacity,
        swl: parsed.swl,
        mawp: parsed.mawp,
      });

      setForm((prev) => {
        const equipment_type = parsed.equipment_type || detection.type || prev.equipment_type;
        const certificate_type =
          parsed.document_category || detection.category || prev.certificate_type;

        const equipment_description = buildEquipmentDescription({
          manufacturer: parsed.manufacturer || prev.manufacturer,
          equipment_type,
          model: parsed.model || prev.model,
          capacity: parsed.capacity || prev.capacity,
          serial_number: parsed.serial_number || prev.serial_number,
          identification_number: parsed.equipment_id || prev.identification_number,
          equipment_id: parsed.equipment_id || prev.equipment_id,
        });

        return {
          ...prev,
          manufacturer: parsed.manufacturer || prev.manufacturer,
          model: parsed.model || prev.model,
          serial_number: parsed.serial_number || prev.serial_number,
          year_built: parsed.year_built || prev.year_built,
          capacity: parsed.capacity || prev.capacity,
          swl: parsed.swl || prev.swl,
          mawp: parsed.mawp || prev.mawp,
          design_pressure: parsed.design_pressure || prev.design_pressure,
          test_pressure: parsed.test_pressure || prev.test_pressure,
          country_of_origin: parsed.country_of_origin || prev.country_of_origin,
          equipment_id: parsed.equipment_id || prev.equipment_id,
          identification_number: parsed.equipment_id || prev.identification_number,
          equipment_type,
          certificate_type,
          equipment_description,
          asset_name: equipment_description,
          ocr_raw_text: json.ocr?.raw_text || parsed.raw_text || "",
          detected_from_nameplate: true,
        };
      });

      setSuccess("Nameplate scanned successfully with Gemini.");
    } catch (err) {
      setError(err.message || "Scan failed.");
    } finally {
      setScanLoading(false);
    }
  }

  async function resolveClient() {
    if (form.client_id) {
      const selected = clients.find((c) => c.id === form.client_id);

      return {
        id: form.client_id,
        company_name: selected?.company_name || form.client_name,
      };
    }

    if (!normalizeText(form.client_name)) {
      throw new Error("Enter client name or choose a client.");
    }

    const existing = await getClientByName(form.client_name);
    if (existing) return existing;

    const created = await createClient(form.client_name);
    setClients((prev) =>
      [...prev, created].sort((a, b) => a.company_name.localeCompare(b.company_name))
    );
    return created;
  }

  async function createOrUpdateAsset(client, nameplateImageUrl) {
    const lookupSerial = normalizeText(
      form.serial_number || form.identification_number || form.equipment_id
    );

    if (lookupSerial) {
      const { data: existing, error } = await supabase
        .from("assets")
        .select("id, asset_tag")
        .eq("client_id", client.id)
        .eq("serial_number", lookupSerial)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        const updatePayload = {
          client_id: client.id,
          asset_name: form.asset_name || form.equipment_description,
          asset_tag: form.asset_tag || existing.asset_tag || null,
          equipment_type: form.equipment_type || null,
          equipment_description: form.equipment_description || null,
          asset_type: form.equipment_type || null,
          manufacturer: form.manufacturer || null,
          model: form.model || null,
          serial_number: form.serial_number || lookupSerial,
          year_built: form.year_built || null,
          swl: form.swl || null,
          capacity_volume: form.capacity || null,
          working_pressure: form.mawp || null,
          design_pressure: form.design_pressure || null,
          test_pressure: form.test_pressure || null,
          identification_number: form.identification_number || null,
          equipment_id: form.equipment_id || null,
          country_of_origin: form.country_of_origin || null,
          location: form.site_name || null,
          next_inspection_due: form.expiry_date || null,
          inspection_date: form.inspection_date || null,
          comments: form.remarks || null,
          nameplate_image_url: nameplateImageUrl || null,
          nameplate_data: {
            manufacturer: form.manufacturer,
            model: form.model,
            serial_number: form.serial_number,
            year_built: form.year_built,
            capacity: form.capacity,
            swl: form.swl,
            mawp: form.mawp,
            design_pressure: form.design_pressure,
            test_pressure: form.test_pressure,
            country_of_origin: form.country_of_origin,
            ocr_raw_text: form.ocr_raw_text,
          },
        };

        const { error: updateError } = await supabase
          .from("assets")
          .update(updatePayload)
          .eq("id", existing.id);

        if (updateError) throw updateError;

        return {
          id: existing.id,
          asset_tag: updatePayload.asset_tag || existing.asset_tag || null,
          asset_name: updatePayload.asset_name,
        };
      }
    }

    const payload = {
      client_id: client.id,
      asset_name: form.asset_name || form.equipment_description,
      asset_tag: form.asset_tag || null,
      equipment_type: form.equipment_type,
      equipment_description: form.equipment_description,
      asset_type: form.equipment_type,
      manufacturer: form.manufacturer,
      model: form.model,
      serial_number: form.serial_number || lookupSerial || null,
      year_built: form.year_built,
      swl: form.swl,
      capacity: form.capacity,
      capacity_volume: form.capacity,
      working_pressure: form.mawp,
      design_pressure: form.design_pressure,
      test_pressure: form.test_pressure,
      identification_number: form.identification_number,
      equipment_id: form.equipment_id,
      country_of_origin: form.country_of_origin,
      location: form.site_name || null,
      next_inspection_due: form.expiry_date || null,
      inspection_date: form.inspection_date || null,
      comments: form.remarks || null,
      nameplate_image_url: nameplateImageUrl || null,
      nameplate_data: {
        manufacturer: form.manufacturer,
        model: form.model,
        serial_number: form.serial_number,
        year_built: form.year_built,
        capacity: form.capacity,
        swl: form.swl,
        mawp: form.mawp,
        design_pressure: form.design_pressure,
        test_pressure: form.test_pressure,
        country_of_origin: form.country_of_origin,
        ocr_raw_text: form.ocr_raw_text,
      },
    };

    const { data, error } = await registerEquipment(payload);
    if (error) throw error;

    return data;
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const client = await resolveClient();

      let nameplateImageUrl = form.nameplate_image_url;
      if (nameplateFile && !nameplateImageUrl) {
        nameplateImageUrl = await uploadToCertificatesBucket(nameplateFile, "nameplates");
      }

      const asset = await createOrUpdateAsset(client, nameplateImageUrl);

      const certificate_number = await generateCertificateNumber(
        form.serial_number || form.identification_number || form.equipment_id,
        asset.id
      );

      const detected = detectEquipmentType({
        raw_text: form.ocr_raw_text,
        manufacturer: form.manufacturer,
        model: form.model,
        serial_number: form.serial_number,
        capacity: form.capacity,
        swl: form.swl,
        mawp: form.mawp,
      });

      const equipment_type = normalizeText(form.equipment_type) || detected.type;
      const equipment_description =
        normalizeText(form.equipment_description) ||
        buildEquipmentDescription({
          manufacturer: form.manufacturer,
          equipment_type,
          model: form.model,
          capacity: form.capacity,
          serial_number: form.serial_number,
          identification_number: form.identification_number,
          equipment_id: form.equipment_id,
        });

      const canonicalResult = normalizeCertificateResult(form.equipment_status);
      const canonicalStatus = normalizeCertificateStatus(form.document_status);
      const assetTag = asset?.asset_tag || form.asset_tag || null;
      const issueDate = form.issue_date || null;
      const expiryDate = form.expiry_date || null;
      const inspectionDate = form.inspection_date || null;
      const comments = normalizeText(form.remarks) || null;

      const payload = {
        certificate_number,

        client_id: client.id,
        client_name: client.company_name,
        company: client.company_name,
        company_name: client.company_name,

        asset_id: asset.id,
        asset_tag: assetTag,
        asset_name: asset?.asset_name || form.asset_name || equipment_description,
        asset_type: equipment_type,
        equipment_type,
        equipment_description,

        site_id: form.site_id || null,
        location: form.site_name || null,

        certificate_type: form.certificate_type,
        document_category: form.certificate_type,

        result: canonicalResult,
        equipment_status: canonicalResult,

        status: canonicalStatus,
        document_status: canonicalStatus,

        inspection_date: inspectionDate,
        issue_date: issueDate,
        expiry_date: expiryDate,
        last_inspection_date: inspectionDate,
        next_inspection_date: expiryDate,
        issued_at: issueDate ? new Date(issueDate).toISOString() : null,
        valid_to: expiryDate,

        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        year_built: form.year_built || null,

        equipment_id: form.equipment_id || null,
        identification_number: form.identification_number || null,
        inspection_number: form.identification_number || null,

        capacity: form.capacity || null,
        capacity_volume: form.capacity || null,
        swl: form.swl || null,
        mawp: form.mawp || null,
        working_pressure: form.mawp || null,
        design_pressure: form.design_pressure || null,
        test_pressure: form.test_pressure || null,
        country_of_origin: form.country_of_origin || null,

        inspector_name: form.inspector_name || null,
        inspector_id: form.inspector_id || null,
        inspection_body: "Monroy (Pty) Ltd",

        comments,
        remarks: comments,

        nameplate_image_url: nameplateImageUrl || null,
        pdf_url: form.pdf_url || null,
        logo_url: "/logo.png",

        detected_from_nameplate: !!form.detected_from_nameplate,
        ocr_raw_text: form.ocr_raw_text || null,
        version_no: 1,

        document_group: buildDocumentGroup({
          clientName: client.company_name,
          equipmentType: equipment_type,
          equipmentDescription: equipment_description,
        }),
      };

      const { error: insertError } = await supabase
        .from("certificates")
        .insert([payload]);

      if (insertError) throw insertError;

      setForm((prev) => ({
        ...prev,
        client_id: client.id,
        client_name: client.company_name,
        nameplate_image_url: nameplateImageUrl || "",
        equipment_type,
        equipment_description,
        asset_name: equipment_description,
        asset_tag: assetTag || prev.asset_tag,
        document_status: canonicalStatus,
        equipment_status: canonicalResult,
      }));

      setSuccess(`Certificate saved successfully. Expiry bucket: ${expiryBucket}.`);
    } catch (err) {
      setError(err.message || "Failed to save certificate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>
              Create Certificate
            </h1>
            <p style={{ margin: "8px 0 0", color: C.muted }}>
              Scan the equipment nameplate with Gemini, capture the data automatically,
              assign the client, detect equipment type, and save the certificate in the
              current register model.
            </p>
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(244,114,182,0.12)",
                border: `1px solid rgba(244,114,182,0.35)`,
                color: "#fbcfe8",
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(0,245,196,0.10)",
                border: `1px solid rgba(0,245,196,0.35)`,
                color: "#a7f3d0",
                whiteSpace: "pre-wrap",
              }}
            >
              {success}
            </div>
          ) : null}

          <div style={sectionStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ ...labelStyle, marginBottom: 4 }}>Nameplate Scan</div>
                <div style={{ color: C.muted, fontSize: 14 }}>
                  Upload or capture a nameplate image. Gemini will extract the visible fields.
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanNameplate}
                disabled={scanLoading || !nameplateFile}
                style={{
                  ...buttonBase,
                  background: scanLoading || !nameplateFile ? "#334155" : C.blue,
                  color: "#08111f",
                  minWidth: 180,
                }}
              >
                {scanLoading ? "Scanning..." : "Scan Nameplate"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: nameplatePreview ? "1fr 320px" : "1fr",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div>
                <label style={labelStyle}>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNameplateSelect}
                  style={inputStyle}
                />
                <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                  Use your camera or upload a clear plate photo.
                </div>
              </div>

              {nameplatePreview ? (
                <div
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <img
                    src={nameplatePreview}
                    alt="Nameplate preview"
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>Client</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Choose Existing Client</label>
                <select
                  value={form.client_id}
                  onChange={handleClientChange}
                  style={inputStyle}
                  disabled={loadingClients}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Client Name</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setField("client_name", e.target.value)}
                  style={inputStyle}
                  placeholder="Enter client/company name"
                />
              </div>

              <div>
                <label style={labelStyle}>Site / Location</label>
                <input
                  type="text"
                  value={form.site_name}
                  onChange={(e) => setField("site_name", e.target.value)}
                  style={inputStyle}
                  placeholder="Mine / plant / section"
                />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>Equipment Identification</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <Field
                label="Manufacturer"
                value={form.manufacturer}
                onChange={(v) => setField("manufacturer", v)}
              />
              <Field
                label="Model"
                value={form.model}
                onChange={(v) => setField("model", v)}
              />
              <Field
                label="Serial Number"
                value={form.serial_number}
                onChange={(v) => setField("serial_number", v)}
              />
              <Field
                label="Year Built"
                value={form.year_built}
                onChange={(v) => setField("year_built", v)}
              />

              <Field
                label="Equipment ID"
                value={form.equipment_id}
                onChange={(v) => setField("equipment_id", v)}
              />
              <Field
                label="Identification Number"
                value={form.identification_number}
                onChange={(v) => setField("identification_number", v)}
              />
              <Field
                label="Country of Origin"
                value={form.country_of_origin}
                onChange={(v) => setField("country_of_origin", v)}
              />
              <Field
                label="Asset Tag"
                value={form.asset_tag}
                onChange={(v) => setField("asset_tag", v)}
              />

              <SelectField
                label="Equipment Type"
                value={form.equipment_type}
                onChange={(v) => setField("equipment_type", v)}
                options={[
                  "",
                  "PRESSURE_VESSEL",
                  "AIR_RECEIVER",
                  "LIFTING_EQUIPMENT",
                  "BOTTLE_JACK",
                  "CHAIN_BLOCK",
                  "FORKLIFT_ATTACHMENT",
                  "SLING",
                  "SHACKLE",
                  "CRANE_ACCESSORY",
                ]}
              />

              <Field
                label="Equipment Description"
                value={form.equipment_description}
                onChange={(v) => setField("equipment_description", v)}
              />
              <Field
                label="Asset Name"
                value={form.asset_name}
                onChange={(v) => setField("asset_name", v)}
              />
              <Field
                label="PDF URL"
                value={form.pdf_url}
                onChange={(v) => setField("pdf_url", v)}
                placeholder="Optional file URL"
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>Technical Data</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <Field
                label="Capacity / Volume"
                value={form.capacity}
                onChange={(v) => setField("capacity", v)}
              />
              <Field
                label="SWL"
                value={form.swl}
                onChange={(v) => setField("swl", v)}
              />
              <Field
                label="MAWP / Working Pressure"
                value={form.mawp}
                onChange={(v) => setField("mawp", v)}
              />
              <Field
                label="Design Pressure"
                value={form.design_pressure}
                onChange={(v) => setField("design_pressure", v)}
              />
              <Field
                label="Test Pressure"
                value={form.test_pressure}
                onChange={(v) => setField("test_pressure", v)}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>Certificate Details</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <SelectField
                label="Certificate Type"
                value={form.certificate_type}
                onChange={(v) => setField("certificate_type", v)}
                options={[
                  "Load Test Certificate",
                  "Pressure Test Certificate",
                  "Certificate of Compliance",
                ]}
              />

              <SelectField
                label="Result"
                value={form.equipment_status}
                onChange={(v) => setField("equipment_status", v)}
                options={[
                  "PASS",
                  "FAIL",
                  "REPAIR_REQUIRED",
                  "OUT_OF_SERVICE",
                  "UNKNOWN",
                ]}
              />

              <SelectField
                label="Status"
                value={form.document_status}
                onChange={(v) => setField("document_status", v)}
                options={["active", "issued", "draft", "expired", "inactive", "void"]}
              />

              <Field label="Expiry Bucket" value={expiryBucket} readOnly />
              <Field
                label="Inspection Date"
                type="date"
                value={form.inspection_date}
                onChange={(v) => setField("inspection_date", v)}
              />
              <Field
                label="Issue Date"
                type="date"
                value={form.issue_date}
                onChange={(v) => setField("issue_date", v)}
              />
              <Field
                label="Expiry Date"
                type="date"
                value={form.expiry_date}
                onChange={(v) => setField("expiry_date", v)}
              />
              <Field
                label="Detected From Nameplate"
                value={form.detected_from_nameplate ? "Yes" : "No"}
                readOnly
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{ ...labelStyle, marginBottom: 16 }}>Inspector & Comments</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <Field
                label="Inspector Name"
                value={form.inspector_name}
                onChange={(v) => setField("inspector_name", v)}
              />
              <Field
                label="Inspector ID"
                value={form.inspector_id}
                onChange={(v) => setField("inspector_id", v)}
              />
              <Field
                label="Stored Nameplate Image URL"
                value={form.nameplate_image_url}
                onChange={(v) => setField("nameplate_image_url", v)}
                placeholder="Auto after upload"
              />
            </div>

            <div>
              <label style={labelStyle}>Comments / Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                placeholder="Comments, findings, recommendations..."
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>OCR / Extracted Raw Text</label>
              <textarea
                value={form.ocr_raw_text}
                onChange={(e) => setField("ocr_raw_text", e.target.value)}
                rows={7}
                style={{ ...inputStyle, resize: "vertical", minHeight: 180 }}
                placeholder="Raw text captured from Gemini scan"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              paddingBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...buttonBase,
                background: saving ? "#334155" : "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                color: "#08111f",
                minWidth: 200,
              }}
            >
              {saving ? "Saving..." : "Save Certificate"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false,
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={inputStyle}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "Select"}
          </option>
        ))}
      </select>
    </div>
  );
}
