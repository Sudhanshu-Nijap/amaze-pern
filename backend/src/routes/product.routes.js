const express = require("express");
const {
  searchProduct,
  getResult,
  getJobStatus,
  getBestsellers,
  getTodayDeals,
  getHotDeals,
  trackProduct,
  getTrackedProducts,
  untrackProduct,
  searchDbProducts
} = require("../controllers/product.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.get("/bestsellers", getBestsellers);
router.get("/deals", getTodayDeals);
router.get("/hot-deals", getHotDeals);

// Protected routes
router.post("/search", requireAuth, searchProduct);
router.get("/search-db", searchDbProducts);
router.get("/result", requireAuth, getResult);
router.get("/job/:jobId", requireAuth, getJobStatus);
router.post("/track", requireAuth, trackProduct);
router.get("/tracked", requireAuth, getTrackedProducts);
router.delete("/tracked/:asin", requireAuth, untrackProduct);

module.exports = router;
