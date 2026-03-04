const express = require("express")
const router = express.Router()
const controller = require("../controllers/assetsController")

router.get("/", controller.getAssets)
router.post("/", controller.createAsset)
router.delete("/:id", controller.deleteAsset)

module.exports = router
