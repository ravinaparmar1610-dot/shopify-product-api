import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { graphqlClient } from "../config/shopify.js";
import Product from "../models/Product.js";
import BulkOperation from "../models/BulkOperation.js";

const ACTIVE_BULK_STATUSES = ["CREATED", "RUNNING", "CANCELING"];
const FAILED_BULK_STATUSES = ["FAILED", "CANCELED", "EXPIRED"];

function getProductStatusFromBulkStatus(status) {
  if (status === "COMPLETED") return "completed";
  if (FAILED_BULK_STATUSES.includes(status)) return "failed";
  return "processing";
}

export async function syncInsertedProducts(products) {
  try {
    if (!products.length) return;


    // =========================================================
    // 🔹 STEP 1: Create JSONL (ONLY valid ProductInput fields)
    // =========================================================
    const jsonl = products
      .map((p) =>
        JSON.stringify({
          input: {
            title: p.title,
            status: "ACTIVE", // ✅ required for storefront visibility
          },
          _id: String(p._id), // ✅ mapping back to MongoDB
        }),
      )
      .join("\n");

    fs.writeFileSync("products.jsonl", jsonl);

    // =========================================================
    // 🔹 STEP 2: Get staged upload URL
    // =========================================================
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

    const target = uploadRes.data.stagedUploadsCreate.stagedTargets[0];


    // =========================================================
    // 🔹 STEP 3: Upload file to Shopify storage
    // =========================================================
    const form = new FormData();

    target.parameters.forEach((p) => {
      form.append(p.name, p.value);
    });

    const keyParam = target.parameters.find((p) => p.name === "key");
    const stagedPath = keyParam.value;

    form.append("file", fs.createReadStream("./products.jsonl"));

    await axios.post(target.url, form, {
      headers: form.getHeaders(),
    });


    // =========================================================
    // 🔹 STEP 4: Run bulk mutation
    // =========================================================
    const bulkRes = await graphqlClient.request(`
      mutation {
        bulkOperationRunMutation(
          mutation: """
            mutation productCreate($input: ProductInput!) {
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

    const bulkPayload = bulkRes.data.bulkOperationRunMutation;


    if (bulkPayload.userErrors.length) {
      throw new Error(bulkPayload.userErrors.map((e) => e.message).join(", "));
    }

    // =========================================================
    // 🔹 STEP 5: Save bulk operation in DB
    // =========================================================
    await BulkOperation.create({
      bulkId: bulkPayload.bulkOperation.id,
      status: bulkPayload.bulkOperation.status,
      productIds: products.map((p) => p._id),
    });

    // =========================================================
    // 🔹 STEP 6: Update product status → processing
    // =========================================================
    await Product.updateMany({ _id: { $in: products.map((p) => p._id) } }, { status: "processing" });


    return bulkPayload.bulkOperation;
  } catch (err) {
    console.error("❌ Shopify error:", err.message);

    await Product.updateMany({ _id: { $in: products.map((p) => p._id) } }, { status: "failed" });

    throw err;
  }
}

export async function processLatestBulk() {
  try {
    // 1. Get latest bulk job (CREATED or RUNNING)
    const bulkJob = await BulkOperation.findOne({
      status: { $in: ["CREATED", "RUNNING"] },
    }).sort({ createdAt: -1 });

    if (!bulkJob) {
      console.log(" No pending bulk operation found");
      return;
    }


    // 2. Get Shopify status
    const response = await graphqlClient.request(`
      {
        node(id: "${bulkJob.bulkId}") {
          ... on BulkOperation {
            id
            status
            errorCode
            url
          }
        }
      }
    `);

    const op = response.data.node;

    if (!op) {
      throw new Error("Bulk operation not found on Shopify");
    }

    // console.log(" Shopify status:", op.status);

    // 3. If still running → update and exit
    if (op.status === "CREATED" || op.status === "RUNNING") {
      await BulkOperation.updateOne({ _id: bulkJob._id }, { status: op.status });

      return {
        status: op.status,
        message: "processing",
      };
    }

    // 4. If failed
    if (op.status === "FAILED") {
      await BulkOperation.updateOne(
        { _id: bulkJob._id },
        {
          status: "FAILED",
          errorCode: op.errorCode,
        },
      );

      await Product.updateMany({ _id: { $in: bulkJob.productIds } }, { status: "failed" });

      return {
        status: "FAILED",
        error: op.errorCode,
      };
    }

    // 5. If completed → process result file
    if (op.status === "COMPLETED") {
      console.log("op.url:", op.url);
      const result = await axios.get(op.url);

      const lines = result.data.split("\n").filter(Boolean);

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const parsed = JSON.parse(lines[i]);
        const mongoId = bulkJob.productIds[i]; // fallback

        const productData = parsed?.data?.productCreate;

        if (productData?.product?.id) {
          successCount++;

          await Product.updateOne(
            { _id: mongoId },
            {
              status: "synced",
              shopify_id: productData.product.id,
            },
          );
        } else if (productData?.userErrors?.length) {
          failedCount++;

          await Product.updateOne(
            { _id: mongoId },
            {
              status: "failed",
              error: productData.userErrors,
            },
          );
        }
      }

      // update bulk job
      await BulkOperation.updateOne(
        { _id: bulkJob._id },
        {
          status: "COMPLETED",
          successCount,
          failedCount,
        },
      );

      console.log(" Bulk processed");

      return {
        status: "COMPLETED",
        successCount,
        failedCount,
      };
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
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

export async function getBulkOperationStatus(bulkId) {
  const res = await graphqlClient.request(
    `
      query BulkOperationStatus($id: ID!) {
        node(id: $id) {
          ... on BulkOperation {
            id
            status
            errorCode
            createdAt
            completedAt
            url
          }
        }
      }
    `,
    {
      variables: {
        id: bulkId,
      },
    },
  );

  return res.data.node;
}

export async function refreshBulkOperationStatuses() {
  const bulkOperations = await BulkOperation.find({
    status: { $in: ACTIVE_BULK_STATUSES },
  });

  // console.log("bulkOperations:", bulkOperations);

  const updatedOperations = [];

  for (const operation of bulkOperations) {
    const shopifyOperation = await getBulkOperationStatus(operation.bulkId);
    // console.log("shopifyOperation", shopifyOperation);
    if (!shopifyOperation) {
      continue;
    }

    const nextProductStatus = getProductStatusFromBulkStatus(shopifyOperation.status);

    operation.status = shopifyOperation.status;
    operation.errorCode = shopifyOperation.errorCode;
    operation.completedAt = shopifyOperation.completedAt || undefined;
    await operation.save();

    await Product.updateMany(
      {
        $or: [{ _id: { $in: operation.productIds } }, { bulkId: operation.bulkId }],
      },
      { status: nextProductStatus },
    );

    updatedOperations.push({
      bulkId: operation.bulkId,
      status: operation.status,
      productStatus: nextProductStatus,
    });
  }

  return updatedOperations;
}
