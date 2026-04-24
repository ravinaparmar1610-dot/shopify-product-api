const axios = require("axios");
require("dotenv").config();
const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
//const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function fetchProducts() {
  try {
    const response = await axios.get(
      `https://${SHOP}/admin/api/2025-01/products.json`,
      {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json"
        },
      }
    );

    console.log(response.data.products);
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

fetchProducts();