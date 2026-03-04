const pool = require("../database/db")

exports.getAssets = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM assets ORDER BY created_at DESC")
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.createAsset = async (req, res) => {
  const {
    client_id,
    site_id,
    asset_tag,
    asset_name,
    manufacturer,
    model,
    serial_number,
    year_of_make
  } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO assets 
      (client_id, site_id, asset_tag, asset_name, manufacturer, model, serial_number, year_of_make)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [client_id, site_id, asset_tag, asset_name, manufacturer, model, serial_number, year_of_make]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.deleteAsset = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query("DELETE FROM assets WHERE id=$1", [id])
    res.json({ message: "Asset deleted" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
