const express = require("express")
const router = express.Router()
const pool = require("../database/db")

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM assets")
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
