import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import FormData from "form-data";
import Product from "../models/Product.js";
import { graphqlClient } from "../config/shopify.js";
import { syncInsertedProducts } from "../services/shopifyService.js";

// Insert products to DB. (Entry-point)
export const uploadProductsCSV = async (req, res) => {
  try {
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          title: data.title,
          SKU: data.SKU,
          price: Number(data.price),
          description: data.description,
          // shopify_id: data.title,
          inventory: data.inventory,
          image_url: data.image_URL,
          status: "pending",
        });
      })
      .on("end", async () => {
        try {
          const inserted = await Product.insertMany(results, {
            ordered: false,
          });

          res.json({
            message: "Upload successful",
            insertedCount: inserted.length
          });

          // Optional: delete file
          fs.unlinkSync(req.file.path);
        } catch (err) {
          res.status(500).json({
            message: "Partial failure",
            error: err.message,
          });
        }
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
