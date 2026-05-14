import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true }, // "booking", "cart", "slot"
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true }, // "created", "updated", "cancelled", "failed", "completed"
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String } // "user", "admin", "system"
    },
    changes: { type: mongoose.Schema.Types.Mixed }, // what changed
    reason: { type: String }, // why it changed
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
