import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: new Error("Supabase not configured") };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function slugify(value, fallback = "equipment") {
  const text = normalizeText(value, fallback) || fallback;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildAssetName(data = {}) {
  const explicitName = normalizeText(data.asset_name);
  if (explicitName) return explicitName;

  const description = normalizeText(data.equipment_description);
  if (description) return description;

  const assetType = normalizeText(data.asset_type || data.equipment_type, "Equipment");
  const model = normalizeText(data.model);
  const serial = normalizeText(data.serial_number);

  if (model) return `${assetType} - ${model}`;
  if (serial) return `${assetType} - ${serial}`;
  return assetType;
}

function buildAssetTag(data = {}) {
  const explicitTag = normalizeText(data.asset_tag);
  if (explicitTag) return explicitTag;

  const type = slugify(data.asset_type || data.equipment_type || "eq", "eq").toUpperCase();
  const serial = normalizeText(data.serial_number);
  if (serial) {
    return `${type}-${serial.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`.slice(0, 60);
  }

  const model = normalizeText(data.model);
  if (model) {
    return `${type}-${model.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`.slice(0, 60);
  }

  return `${type}-${Date.now()}`;
}

function normalizeEquipmentPayload(equipmentData = {}) {
  const assetType = normalizeText(
    equipmentData.asset_type || equipmentData.equipment_type,
    ""
  );

  return {
    client_id: normalizeText(equipmentData.client_id),
    site_id: normalizeText(equipmentData.site_id),
    asset_tag: buildAssetTag(equipmentData),
    asset_name: buildAssetName(equipmentData),
    asset_type: assetType,
    equipment_type: assetType,
    equipment_description: normalizeText(
      equipmentData.equipment_description || equipmentData.asset_name
    ),
    serial_number: normalizeText(equipmentData.serial_number),
    manufacturer: normalizeText(equipmentData.manufacturer),
    model: normalizeText(equipmentData.model),
    year_built: normalizeText(equipmentData.year_built),
    country_of_origin: normalizeText(equipmentData.country_of_origin),
    capacity_volume: normalizeText(equipmentData.capacity_volume),
    swl: normalizeText(equipmentData.swl),
    proof_load: normalizeText(equipmentData.proof_load),
    lift_height: normalizeText(equipmentData.lift_height),
    sling_length: normalizeText(equipmentData.sling_length),
    working_pressure: normalizeText(equipmentData.working_pressure),
    design_pressure: normalizeText(equipmentData.design_pressure),
    test_pressure: normalizeText(equipmentData.test_pressure),
    pressure_unit: normalizeText(equipmentData.pressure_unit),
    temperature_range: normalizeText(equipmentData.temperature_range),
    material: normalizeText(equipmentData.material),
    standard_code: normalizeText(equipmentData.standard_code),
    location: normalizeText(equipmentData.location),
    status: normalizeText(equipmentData.status, "active"),
    inspection_date: normalizeText(
      equipmentData.inspection_date || equipmentData.last_inspection_date
    ),
    next_inspection_due: normalizeText(
      equipmentData.next_inspection_due || equipmentData.next_inspection_date
    ),
    certificate_number: normalizeText(equipmentData.certificate_number),
    inspection_number: normalizeText(equipmentData.inspection_number),
    identification_number: normalizeText(equipmentData.identification_number),
    equipment_id: normalizeText(equipmentData.equipment_id),
    lanyard_serial_no: normalizeText(equipmentData.lanyard_serial_no),
    comments: normalizeText(equipmentData.comments),
  };
}

function parseDateValue(value) {
  const text = normalizeText(value);
  if (!text) return null;

  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computeLicenseStatus(expiryValue) {
  const expiryDate = parseDateValue(expiryValue);
  if (!expiryDate) return "valid";

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

function pickFirst(...values) {
  for (const value of values) {
    const cleaned = normalizeText(value);
    if (cleaned) return cleaned;
  }
  return null;
}

async function loadClientsById(rows = []) {
  const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))];
  if (!clientIds.length) return new Map();

  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, company_code")
    .in("id", clientIds);

  if (error || !Array.isArray(data)) return new Map();

  return new Map(data.map((item) => [item.id, item]));
}

async function loadLatestCertificatesByAssetTag(rows = []) {
  const tags = [...new Set(rows.map((row) => row.asset_tag).filter(Boolean))];
  if (!tags.length) return new Map();

  const { data, error } = await supabase
    .from("certificates")
    .select(`
      id,
      asset_tag,
      certificate_number,
      result,
      status,
      issue_date,
      issued_at,
      expiry_date,
      valid_to,
      created_at,
      inspection_date,
      next_inspection_due
    `)
    .in("asset_tag", tags)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) return new Map();

  const latestByTag = new Map();

  for (const row of data) {
    if (!row.asset_tag) continue;

    const existing = latestByTag.get(row.asset_tag);
    const rowRank = new Date(
      row.issue_date ||
        row.issued_at ||
        row.expiry_date ||
        row.valid_to ||
        row.created_at ||
        0
    ).getTime();

    if (!existing) {
      latestByTag.set(row.asset_tag, row);
      continue;
    }

    const existingRank = new Date(
      existing.issue_date ||
        existing.issued_at ||
        existing.expiry_date ||
        existing.valid_to ||
        existing.created_at ||
        0
    ).getTime();

    if (rowRank >= existingRank) {
      latestByTag.set(row.asset_tag, row);
    }
  }

  return latestByTag;
}

function enrichRows(rows = [], clientMap = new Map(), latestCertificateMap = new Map()) {
  return rows.map((row) => {
    const latestCertificate = row.asset_tag
      ? latestCertificateMap.get(row.asset_tag) || null
      : null;

    const effectiveIssueDate = pickFirst(
      row.inspection_date,
      row.last_inspection_date,
      latestCertificate?.inspection_date,
      latestCertificate?.issue_date,
      latestCertificate?.issued_at
    );

    const effectiveExpiryDate = pickFirst(
      row.next_inspection_due,
      row.next_inspection_date,
      latestCertificate?.next_inspection_due,
      latestCertificate?.expiry_date,
      latestCertificate?.valid_to
    );

    return {
      ...row,
      clients: row.client_id ? clientMap.get(row.client_id) || null : null,
      latest_certificate: latestCertificate,
      effective_issue_date: effectiveIssueDate,
      effective_expiry_date: effectiveExpiryDate,
      license_status: computeLicenseStatus(effectiveExpiryDate),
    };
  });
}

export async function listEquipment() {
  try {
    if (!supabase) return notConfigured([]);

    const { data, error } = await supabase
      .from("assets")
      .select(`
        id,
        client_id,
        site_id,
        asset_tag,
        asset_name,
        asset_type,
        equipment_type,
        equipment_description,
        serial_number,
        manufacturer,
        model,
        year_built,
        country_of_origin,
        capacity_volume,
        swl,
        proof_load,
        lift_height,
        sling_length,
        working_pressure,
        design_pressure,
        test_pressure,
        pressure_unit,
        temperature_range,
        material,
        standard_code,
        location,
        status,
        inspection_date,
        next_inspection_due,
        certificate_number,
        inspection_number,
        identification_number,
        equipment_id,
        lanyard_serial_no,
        comments,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message || "Failed to load equipment.") };
    }

    const rows = Array.isArray(data) ? data : [];
    const clientMap = await loadClientsById(rows);
    const latestCertificateMap = await loadLatestCertificatesByAssetTag(rows);
    const enriched = enrichRows(rows, clientMap, latestCertificateMap);

    return { data: enriched, error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error("Failed to load equipment."),
    };
  }
}

export async function getEquipment(tag) {
  try {
    if (!supabase) return notConfigured(null);

    const cleanTag = normalizeText(tag);
    if (!cleanTag) {
      return { data: null, error: new Error("Equipment tag is required.") };
    }

    const { data, error } = await supabase
      .from("assets")
      .select(`
        id,
        client_id,
        site_id,
        asset_tag,
        asset_name,
        asset_type,
        equipment_type,
        equipment_description,
        serial_number,
        manufacturer,
        model,
        year_built,
        country_of_origin,
        capacity_volume,
        swl,
        proof_load,
        lift_height,
        sling_length,
        working_pressure,
        design_pressure,
        test_pressure,
        pressure_unit,
        temperature_range,
        material,
        standard_code,
        location,
        status,
        inspection_date,
        next_inspection_due,
        certificate_number,
        inspection_number,
        identification_number,
        equipment_id,
        lanyard_serial_no,
        comments,
        created_at
      `)
      .eq("asset_tag", cleanTag)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message || "Failed to load equipment.") };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const clientMap = await loadClientsById([data]);
    const latestCertificateMap = await loadLatestCertificatesByAssetTag([data]);
    const [enriched] = enrichRows([data], clientMap, latestCertificateMap);

    return { data: enriched || null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Failed to load equipment."),
    };
  }
}

export async function getEquipmentById(id) {
  try {
    if (!supabase) return notConfigured(null);

    const cleanId = normalizeText(id);
    if (!cleanId) {
      return { data: null, error: new Error("Equipment id is required.") };
    }

    const { data, error } = await supabase
      .from("assets")
      .select(`
        id,
        client_id,
        site_id,
        asset_tag,
        asset_name,
        asset_type,
        equipment_type,
        equipment_description,
        serial_number,
        manufacturer,
        model,
        year_built,
        country_of_origin,
        capacity_volume,
        swl,
        proof_load,
        lift_height,
        sling_length,
        working_pressure,
        design_pressure,
        test_pressure,
        pressure_unit,
        temperature_range,
        material,
        standard_code,
        location,
        status,
        inspection_date,
        next_inspection_due,
        certificate_number,
        inspection_number,
        identification_number,
        equipment_id,
        lanyard_serial_no,
        comments,
        created_at
      `)
      .eq("id", cleanId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message || "Failed to load equipment.") };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const clientMap = await loadClientsById([data]);
    const latestCertificateMap = await loadLatestCertificatesByAssetTag([data]);
    const [enriched] = enrichRows([data], clientMap, latestCertificateMap);

    return { data: enriched || null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Failed to load equipment."),
    };
  }
}

export async function registerEquipment(equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (!payload.asset_name) {
    return { data: null, error: new Error("Asset name is required.") };
  }

  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select()
    .single();

  return {
    data: data || null,
    error: error ? new Error(error.message || "Failed to register equipment.") : null,
  };
}

export async function updateEquipment(tag, equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const cleanTag = normalizeText(tag);
  if (!cleanTag) {
    return { data: null, error: new Error("Equipment tag is required.") };
  }

  const payload = normalizeEquipmentPayload(equipmentData);

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("asset_tag", cleanTag)
    .select()
    .single();

  return {
    data: data || null,
    error: error ? new Error(error.message || "Failed to update equipment.") : null,
  };
}

export async function deleteEquipment(tag) {
  if (!supabase) return notConfigured(null);

  const cleanTag = normalizeText(tag);
  if (!cleanTag) {
    return { data: null, error: new Error("Equipment tag is required.") };
  }

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("asset_tag", cleanTag);

  return {
    data: !error,
    error: error ? new Error(error.message || "Failed to delete equipment.") : null,
  };
}

export async function findOrCreateEquipment(equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (payload.asset_tag) {
    const existing = await getEquipment(payload.asset_tag);
    if (existing.data) return existing;
  }

  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select()
    .single();

  return {
    data: data || null,
    error: error ? new Error(error.message || "Failed to create equipment.") : null,
  };
}
