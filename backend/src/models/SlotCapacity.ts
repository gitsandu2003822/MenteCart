import mongoose from "mongoose";

const slotCapacitySchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    timeSlot: { type: String, required: true }, // e.g. "10:00 AM"
    totalCapacity: { type: Number, required: true }, // from service.capacityPerSlot
    confirmedCount: { type: Number, default: 0 }, // bookings that are confirmed/completed
    heldCount: { type: Number, default: 0 }, // items in active carts
    availableCount: { type: Number, required: true } // totalCapacity - confirmedCount - heldCount
  },
  { timestamps: true }
);

// Compound index for fast slot lookup
slotCapacitySchema.index({ serviceId: 1, date: 1, timeSlot: 1 }, { unique: true });

export default mongoose.model("SlotCapacity", slotCapacitySchema);
