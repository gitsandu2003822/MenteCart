import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true }, // in minutes
    category: { type: String, required: true },
    image: { type: String },
    capacityPerSlot: { type: Number, required: true, default: 1 }
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);