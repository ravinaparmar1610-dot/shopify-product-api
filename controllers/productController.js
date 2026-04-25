import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import FormData from "form-data";
import Product from "../models/Product.js";

export async function getProducts(req, res) {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function createProduct(req, res) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function createProductsBulk(req, res) {
  try {
    const products = req.body.products;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: "Products array is required." });
    }

    const result = await Product.insertMany(products, { ordered: false });

    return res.status(200).json({
      success: result.length,
      failed: 0,
    });
  } catch (err) {
    if (err.name === "BulkWriteError") {
      const failedIndexes = err.writeErrors.map((e) => e.index);

      const failed = err.writeErrors.map((e) => ({
        index: e.index,
        data: products[e.index],
        error: {
          code: e.code,
          message: e.errmsg,
        },
      }));

      // const failedDocs = failedIndexes.map((i) => products[i]);

      const successCount = err.result?.nInserted || 0;

      res.json({
        message: "Partial success",
        success: successCount,
        failed: failedDocs.length,
        failed,
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}
