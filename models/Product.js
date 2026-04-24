//model.js

// Requiring module
import mongoose from "mongoose";

// Course Modal Schema
const productSchema = new mongoose.Schema({
    _id: Number,
    title: String,
    vendor: String,
    product_type: String
});

const Product = mongoose.model("Product", productSchema);

export default Product;