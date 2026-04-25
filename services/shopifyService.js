import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { graphqlClient } from "../config/shopify.js";
import Product from "../models/Product.js";

export async function syncInsertedProducts(products) {
  // console.log("syncInsertedProducts:" , products);
  try {
    if (!products.length) return;

    // 🔹 Convert to JSONL
    const jsonl = products
      .map((p) =>
        JSON.stringify({
          input: {
            title: p.title,
            bodyHtml: p.description,
            variants: [
              {
                price: String(p.price),
                sku: p.SKU
              },
            ],
            images: p.image_url ? [{ src: p.image_url }] : [],
          },
        }),
      )
      .join("\n");

    fs.writeFileSync("products.jsonl", jsonl);

    // console.log("===> jsonl:", jsonl);

    // 🔹 Step 1: Get upload URL
    const uploadRes = await graphqlClient.request(`
      mutation {
        stagedUploadsCreate(input: [{
          resource: BULK_MUTATION_VARIABLES,
          filename: "products.jsonl",
          mimeType: "text/jsonl",
          httpMethod: POST
        }]) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `);
    // console.log("UPLOAD RESPONSE:", JSON.stringify(uploadRes, null, 2));

    const target = uploadRes.data.stagedUploadsCreate.stagedTargets[0];
    console.log("****************************step 2****************************");
    // 🔹 Step 2: Upload file
    const form = new FormData();
    target.parameters.forEach((p) => form.append(p.name, p.value));
    const keyParam = target.parameters.find(p => p.name === "key");
    const stagedPath = keyParam.value;
    form.append("file", fs.createReadStream("./products.jsonl"));

    console.log("stagedPath:", stagedPath);

    await axios.post(target.url, form, {
      headers: form.getHeaders(),
    }),
  
    console.log("****************************step 3****************************");
    // 🔹 Step 3: Run bulk mutation
    const bulkRes = await graphqlClient.request(`
        mutation {
          bulkOperationRunMutation(
            mutation: """
              mutation call($input: ProductInput!) {
                productCreate(input: $input) {
                  product { id }
                  userErrors {
                    field
                    message
                  }
                }
              }
            """,
            stagedUploadPath: "${stagedPath}"
          ) {
            bulkOperation {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `);
    // console.log("BULK RESPONSE:", JSON.stringify(bulkRes, null, 2));

    // 🔹 Update DB status → processing
    await Product.updateMany({ _id: { $in: products.map((p) => p._id) } }, { status: "processing" });
    console.log("****************************step 4****************************");
    console.log("🚀 Shopify bulk sync started", bulkRes.data.bulkOperationRunMutation.bulkOperation);

    return bulkRes.data.bulkOperationRunMutation.bulkOperation;
  } catch (err) {
    console.error("❌ Shopify error:", err.message);

    await Product.updateMany({ _id: { $in: products.map((p) => p._id) } }, { status: "failed" });

    throw err;
  }
}

export async function checkBulkStatus() {
  const res = await graphqlClient.request(`
     {
        bulkOperations(first: 5) {
          edges {
            node {
              id
              status
              errorCode
              createdAt
              completedAt
            }
          }
        }
      }
  `);

  return res.data.currentBulkOperation;
}
