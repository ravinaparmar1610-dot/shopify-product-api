import "dotenv/config";
import { shopifyApi } from "@shopify/shopify-api";
import { nodeAdapterInitialized } from "@shopify/shopify-api/adapters/node";

if (!nodeAdapterInitialized) {
  throw new Error("Failed to initialize Node.js adapter");
}

const session = {
  shop: process.env.SHOPIFY_STORE,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
};

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ["read_products", "write_products"],
  hostName: process.env.HOST_NAME,
  apiVersion: process.env.SHOPIFY_API_VERSION,
});

export const graphqlClient = new shopify.clients.Graphql({ session });
