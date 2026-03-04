const pool = require("../database/db")

exports.getNCR = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ncrs ORDER BY created_at DESC")
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.createNCR = async (req, res) => {
  const {
    client_id,
    site_id,
    asset_id,
    title,
    description,
    severity
  } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO ncrs
      (client_id, site_id, asset_id, title, description, severity)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [client_id, site_id, asset_id, title, description, severity]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
