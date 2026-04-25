import mongoose from "mongoose";

const bulkOperationSchema = new mongoose.Schema(
  {
    bulkId: {
      type: String,
      required: true,
      unique: true,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    status: {
      type: String,
      default: "CREATED",
    },
    errorCode: String,
    completedAt: Date,
  },
  { timestamps: true, collection: "bulkOperations" },
);

const BulkOperation = mongoose.model("BulkOperation", bulkOperationSchema);

export default BulkOperation;
