import Product from "../models/Product.js";

export async function getProducts(req, res) {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.log("err:", err);
    res.status(500).json({ error: "err.message" });
  }
}
