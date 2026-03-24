async function loadCertificates() {
  setLoading(true);

  const { data, error } = await supabase
    .from("certificates")
    .select(`
      id,
      certificate_number,
      result,
      issue_date,
      issued_at,
      expiry_date,
      valid_to,
      created_at,
      inspection_number,
      asset_tag,
      asset_name,
      equipment_description,
      equipment_type,
      asset_type,
      client_name,
      status,
      extracted_data
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load certificates:", error);
    setCertificates([]);
    setLoading(false);
    return;
  }

  const cleaned = (data || []).map((row) => {
    const extracted = row.extracted_data || {};

    const resolvedIssueDate =
      row.issue_date ||
      row.issued_at ||
      extracted.issue_date ||
      null;

    const resolvedExpiryDate =
      row.expiry_date ||
      row.valid_to ||
      extracted.expiry_date ||
      null;

    return {
      ...row,
      issue_date: resolvedIssueDate,
      expiry_date: resolvedExpiryDate,
      result: normalizeResult(row.result || extracted.result),
      expiry_bucket: getExpiryBucket(resolvedExpiryDate),
      company_display: normalizeText(row.client_name || extracted.client_name, "UNASSIGNED CLIENT"),
      equipment_type_display: normalizeText(
        row.equipment_type || row.asset_type || extracted.equipment_type,
        "UNCATEGORIZED EQUIPMENT"
      ),
      equipment_description_display: normalizeText(
        row.equipment_description ||
          row.asset_name ||
          row.asset_tag ||
          extracted.equipment_description,
        "UNNAMED EQUIPMENT"
      ),
    };
  });

  setCertificates(cleaned);
  setLoading(false);
}
