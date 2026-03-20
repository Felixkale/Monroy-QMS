function renderDynamicRows(extractedData) {
  if (!extractedData || typeof extractedData !== "object") return [];

  const ignoredKeys = new Set([
    "manufacturer",
    "model",
    "serial_number",
    "identification_number",
    "year_built",
    "country_of_origin",
    "capacity",
    "capacity_volume",
    "pressure",
    "working_pressure",
    "design_pressure",
    "test_pressure",
    "safe_working_load",
    "proof_load",
    "lifting_height",
    "sling_length",
    "chain_size",
    "rope_diameter",
    "equipment_type",
    "plate_text",
    "other_visible_data",
  ]);

  const rows = [];

  Object.entries(extractedData).forEach(([key, value]) => {
    if (ignoredKeys.has(key)) return;
    if (value === undefined || value === null || String(value).trim() === "") return;

    rows.push({
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    });
  });

  if (
    extractedData.other_visible_data &&
    typeof extractedData.other_visible_data === "object"
  ) {
    Object.entries(extractedData.other_visible_data).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).trim() === "") return;

      rows.push({
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: typeof value === "object" ? JSON.stringify(value) : String(value),
      });
    });
  }

  return rows;
}
