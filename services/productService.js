import axios from "axios";
import "dotenv/config";
import { graphqlClient } from "../config/shopify.js";

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION;

export async function fetchShopifyProducts() {
  try {
    const queryString = `{
      products (first: 3) {
        edges {
          node {
            id
            title
            vendor
            createdAt
            status
            media(first: 2) {
              edges {
                node {
                  id
										}
								}
							}
          }
        }
      }
    }`;

    const response = await graphqlClient.request(queryString);
    return response.data.products;
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

export async function fetchProductsAxios() {
  try {
    const response = await axios.get(`https://${SHOP}/admin/api/${VERSION}/products.json`, {
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
      },
    });

    return response.data.products;
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}
