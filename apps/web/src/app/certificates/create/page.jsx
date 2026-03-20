// FILE: /apps/web/src/app/certificates/create/page.jsx

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
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: "rgba(255,255,255,0.04)",
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
    document_status: "Active",
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
    };
  }, []);

  const expiryBucket = useMemo(() => {
    return expiryBucketFromDate(form.expiry_date);
  }, [form.expiry_date]);

  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (
        ["manufacturer", "model", "capacity", "serial_number", "identification_number", "equipment_id", "equipment_type"].includes(name)
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
        const equipment_type = parsed.equipment_type || detection.type;
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
          certificate_type: parsed.document_category || detection.category || prev.certificate_type,
          equipment_description,
          asset_name: equipment_description,
          ocr_raw_text: json.ocr?.raw_text || parsed.raw_text || "",
          detected_from_nameplate: true,
        };
      });

      setSuccess("Nameplate scanned and fields captured successfully.");
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
    setClients((prev) => [...prev, created].sort((a, b) => a.company_name.localeCompare(b.company_name)));
    return created;
  }

  async function createOrUpdateAsset(client) {
    const lookupSerial = normalizeText(form.serial_number || form.identification_number || form.equipment_id);

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
          equipment_type: form.equipment_type,
          equipment_description: form.equipment_description,
          asset_type: form.equipment_type,
          manufacturer: form.manufacturer,
          model: form.model,
          serial_number: form.serial_number || lookupSerial,
          year_built: form.year_built,
          swl: form.swl,
          capacity: form.capacity,
          working_pressure: form.mawp,
          design_pressure: form.design_pressure,
          test_pressure: form.test_pressure,
          identification_number: form.identification_number,
          equipment_id: form.equipment_id,
          country_of_origin: form.country_of_origin,
          nameplate_image_url: form.nameplate_image_url || null,
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

        return existing;
      }
    }

    const payload = {
      client_id: client.id,
      asset_name: form.asset_name || form.equipment_description,
      equipment_type: form.equipment_type,
      equipment_description: form.equipment_description,
      asset_type: form.equipment_type,
      manufacturer: form.manufacturer,
      model: form.model,
      serial_number: form.serial_number || lookupSerial || null,
      year_built: form.year_built,
      swl: form.swl,
      capacity: form.capacity,
      working_pressure: form.mawp,
      design_pressure: form.design_pressure,
      test_pressure: form.test_pressure,
      identification_number: form.identification_number,
      equipment_id: form.equipment_id,
      country_of_origin: form.country_of_origin,
      nameplate_image_url: form.nameplate_image_url || null,
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

      const asset = await createOrUpdateAsset(client);
      const certificate_number = await generateCertificateNumber(
        form.serial_number || form.identification_number || form.equipment_id,
        asset.id
      );

      const equipment_type =
        normalizeText(form.equipment_type) ||
        detectEquipmentType({
          raw_text: form.ocr_raw_text,
          manufacturer: form.manufacturer,
          model: form.model,
          serial_number: form.serial_number,
          capacity: form.capacity,
          swl: form.swl,
          mawp: form.mawp,
        }).type;

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

      const payload = {
        certificate_number,
        client_id: client.id,
        asset_id: asset.id,
        site_id: form.site_id || null,
        company_name: client.company_name,
        asset_type: equipment_type,
        equipment_type,
        equipment_description,
        certificate_type: form.certificate_type,
        document_category: form.certificate_type,
        document_status: form.document_status,
        equipment_status: form.equipment_status,
        inspection_date: form.inspection_date || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        last_inspection_date: form.inspection_date || null,
        next_inspection_date: form.expiry_date || null,
        issued_at: form.issue_date ? new Date(form.issue_date).toISOString() : null,
        manufacturer: form.manufacturer,
        model: form.model,
        serial_number: form.serial_number,
        year_built: form.year_built,
        equipment_id: form.equipment_id,
        identification_number: form.identification_number,
        capacity: form.capacity,
        swl: form.swl,
        mawp: form.mawp,
        design_pressure: form.design_pressure,
        test_pressure: form.test_pressure,
        country_of_origin: form.country_of_origin,
        inspector_name: form.inspector_name,
        inspector_id: form.inspector_id,
        remarks: form.remarks,
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
      }));

      setSuccess(`Certificate saved successfully. Expiry bucket: ${expiryBucket}.`);
    } catch (err) {
      setError(err.message || "Failed to save certificate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Create Certificate">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", marginBottom: 8 }}>Create Certificate</h1>
        <p style={{ color: C.muted, marginBottom: 24 }}>
          Scan the equipment nameplate, capture the data automatically, assign the client,
          detect equipment type, and save the certificate into ISO-style grouped records.
        </p>

        {error ? (
          <div style={{ ...sectionStyle, borderColor: "rgba(244,114,182,0.35)", color: C.pink }}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={{ ...sectionStyle, borderColor: "rgba(0,245,196,0.35)", color: "#86efac" }}>
            {success}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
          <div>
            <div style={sectionStyle}>
              <h2 style={{ color: "#fff", marginTop: 0 }}>1. Client</h2>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Choose Existing Client</label>
                <select
                  value={form.client_id}
                  onChange={handleClientChange}
                  style={inputStyle}
                  disabled={loadingClients}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Or Enter Client Name</label>
                <input
                  style={inputStyle}
                  value={form.client_name}
                  onChange={(e) => setField("client_name", e.target.value)}
                  placeholder="e.g. Debswana"
                />
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ color: "#fff", marginTop: 0 }}>2. Scan Nameplate</h2>

              <label style={labelStyle}>Capture Nameplate Photo</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNameplateSelect}
                style={{ color: C.text, marginBottom: 12 }}
              />

              {nameplatePreview ? (
                <img
                  src={nameplatePreview}
                  alt="Nameplate preview"
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    background: "rgba(255,255,255,0.03)",
                    marginBottom: 12,
                  }}
                />
              ) : null}

              <button
                type="button"
                onClick={handleScanNameplate}
                disabled={!nameplateFile || scanLoading}
                style={{
                  ...buttonBase,
                  background: "linear-gradient(135deg,#7c5cfc,#4fc3f7)",
                  color: "#fff",
                  opacity: !nameplateFile || scanLoading ? 0.6 : 1,
                }}
              >
                {scanLoading ? "Scanning..." : "Scan Nameplate"}
              </button>

              {!!form.ocr_raw_text && (
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Detected OCR Text</label>
                  <textarea
                    value={form.ocr_raw_text}
                    onChange={(e) => setField("ocr_raw_text", e.target.value)}
                    style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionStyle}>
              <h2 style={{ color: "#fff", marginTop: 0 }}>3. Equipment Data</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["manufacturer", "Manufacturer"],
                  ["model", "Model"],
                  ["serial_number", "Serial Number"],
                  ["year_built", "Year Built"],
                  ["equipment_id", "Equipment ID"],
                  ["identification_number", "Identification Number"],
                  ["capacity", "Capacity"],
                  ["swl", "SWL / WLL"],
                  ["mawp", "Working Pressure"],
                  ["design_pressure", "Design Pressure"],
                  ["test_pressure", "Test Pressure"],
                  ["country_of_origin", "Country of Origin"],
                  ["equipment_type", "Equipment Type"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      style={inputStyle}
                      value={form[name]}
                      onChange={(e) => setField(name, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Equipment Description</label>
                <input
                  style={inputStyle}
                  value={form.equipment_description}
                  onChange={(e) => setField("equipment_description", e.target.value)}
                />
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={{ color: "#fff", marginTop: 0 }}>4. Certificate</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Certificate Type</label>
                  <select
                    style={inputStyle}
                    value={form.certificate_type}
                    onChange={(e) => setField("certificate_type", e.target.value)}
                  >
                    <option>Load Test Certificate</option>
                    <option>Pressure Test Certificate</option>
                    <option>Thorough Examination Certificate</option>
                    <option>Inspection Certificate</option>
                    <option>Calibration Certificate</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Result</label>
                  <select
                    style={inputStyle}
                    value={form.equipment_status}
                    onChange={(e) => setField("equipment_status", e.target.value)}
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="REPAIR REQUIRED">REPAIR REQUIRED</option>
                    <option value="OUT OF SERVICE">OUT OF SERVICE</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Document Status</label>
                  <select
                    style={inputStyle}
                    value={form.document_status}
                    onChange={(e) => setField("document_status", e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                    <option value="Superseded">Superseded</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Inspection Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.inspection_date}
                    onChange={(e) => setField("inspection_date", e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Issue Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.issue_date}
                    onChange={(e) => setField("issue_date", e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.expiry_date}
                    onChange={(e) => setField("expiry_date", e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Inspector Name</label>
                  <input
                    style={inputStyle}
                    value={form.inspector_name}
                    onChange={(e) => setField("inspector_name", e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Inspector ID</label>
                  <input
                    style={inputStyle}
                    value={form.inspector_id}
                    onChange={(e) => setField("inspector_id", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Remarks</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                  value={form.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>PDF URL (Optional)</label>
                <input
                  style={inputStyle}
                  value={form.pdf_url}
                  onChange={(e) => setField("pdf_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ color: "#fff", fontWeight: 700, marginBottom: 6 }}>ISO Grouping Preview</div>
                <div style={{ color: C.muted, fontSize: 13 }}>
                  {buildDocumentGroup({
                    clientName: form.client_name || clients.find((c) => c.id === form.client_id)?.company_name,
                    equipmentType: form.equipment_type,
                    equipmentDescription: form.equipment_description,
                  })}
                </div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
                  Expiry Bucket: <strong style={{ color: "#fff" }}>{expiryBucket}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...buttonBase,
                width: "100%",
                background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                color: "#05202e",
                fontSize: 15,
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
