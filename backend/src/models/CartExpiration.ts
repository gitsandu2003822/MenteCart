import mongoose from "mongoose";

const cartExpirationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    cartItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart.items",
      required: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    heldAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    released: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for finding expired holds
cartExpirationSchema.index({ expiresAt: 1, released: 1 });

export default mongoose.model("CartExpiration", cartExpirationSchema);
