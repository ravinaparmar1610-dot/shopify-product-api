
import express from "express";
import cors from "cors";
import productRouter from "./routes/productRouter.js";
import "dotenv/config";
import { connectDB } from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3001" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await connectDB();

// Routes
app.use("/api/", productRouter );

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
