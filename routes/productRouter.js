import express from "express";
import { fetchShopifyProducts } from "../services/productService.js";
import { getProducts } from "../controllers/productController.js";

const router = express.Router();

router.get("/products", getProducts);

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
