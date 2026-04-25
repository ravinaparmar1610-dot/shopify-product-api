//model.js

// Requiring module
import mongoose from "mongoose";

// Course Modal Schema
const productSchema = new mongoose.Schema({
  shopify_id: Number,
  title: String,
  SKU: String,
  description: String,
  price: String,
  inventory: String,
  image_url: String,
   status: {
    type: String,
    default: "pending"
  }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
