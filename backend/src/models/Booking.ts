import mongoose from "mongoose";

const bookingItemSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  quantity: { type: Number, default: 1 }
});

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [bookingItemSchema],
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "failed"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "pay_on_arrival", "card"],
      default: "cash"
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed"],
      default: "unpaid"
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, required: true, default: Date.now }
      }
    ]
    }
  ,
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);