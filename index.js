require("dotenv").config();
const express = require("express");
const { shopifyApi, LATEST_API_VERSION } = require("@shopify/shopify-api");
const { nodeAdapterInitialized } = require("@shopify/shopify-api/adapters/node");

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
  apiVersion: "2025-01",
});

app.get("/products", async (req, res) => {
  try {
    const queryString = `{
      products (first: 3) {
        edges {
          node {
            id
            title
          }
        }
      }
    }`;

    const client = new shopify.clients.Graphql({ session });
    const products = await client.request(queryString);

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
