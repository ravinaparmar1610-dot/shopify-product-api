import axios from "axios";
import 'dotenv/config';

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function fetchProductsAxios() {
  try {
    const response = await axios.get(
      `https://${SHOP}/admin/api/2026-04/products.json`,
      {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json"
        },
      }
    );

    return response.data.products;
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}
