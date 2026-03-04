const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Monroy QMS API running")
})

const assetRoutes = require("./routes/assets")
const inspectionRoutes = require("./routes/inspections")
const ncrRoutes = require("./routes/ncr")

app.use("/assets", assetRoutes)
app.use("/inspections", inspectionRoutes)
app.use("/ncr", ncrRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
