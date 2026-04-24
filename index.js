import 'dotenv/config';
import express from "express";
import axios from "axios";
import { shopifyApi  } from "@shopify/shopify-api";
import { nodeAdapterInitialized } from "@shopify/shopify-api/adapters/node";

import { fetchProductsAxios } from "./fetchProducts.js";

if (!nodeAdapterInitialized) {
  throw new Error("Failed to initialize Node.js adapter");
}

const app = express();

const session = {
  shop: process.env.SHOPIFY_STORE,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
};

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ["read_products", "write_products"],
  hostName: process.env.HOST_NAME,
  apiVersion: "2026-01",
});

app.get("/products", async (req, res) => {
  try {
    const data = await fetchProductsAxios();
    res.json(data);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
