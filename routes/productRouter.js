import express from "express";
import multer from "multer";
import { fetchShopifyProducts } from "../services/productService.js";
import { createProductsBulk, getProducts } from "../controllers/productController.js";
import {  uploadProductsCSV } from "../controllers/bulkProductUploadController.js";
import { checkBulkStatus } from "../services/shopifyService.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// API routes
router.get("/products", getProducts);
router.post("/products/bulk", createProductsBulk);
router.post("/products/upload", upload.single("file"), uploadProductsCSV);

router.post("/products/bulk-upload-status", checkBulkStatus);

// Shopify routes
router.get("/shopify-products", async (req, res) => {
  try {
    const data = await fetchShopifyProducts();
    res.json(data);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
