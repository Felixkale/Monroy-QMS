const pool = require("../database/db")

exports.getInspections = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inspections ORDER BY inspected_at DESC")
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.createInspection = async (req, res) => {
  const {
    client_id,
    site_id,
    asset_id,
    inspection_type,
    inspector_id,
    result,
    summary
  } = req.body

  try {
    const resultDB = await pool.query(
      `INSERT INTO inspections
      (client_id, site_id, asset_id, inspection_type, inspector_id, result, summary)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [client_id, site_id, asset_id, inspection_type, inspector_id, result, summary]
    )

    res.json(resultDB.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
