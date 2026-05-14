import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import { sweepBookingLifecycleService } from "./services/bookingService";
import { sweepExpiredCartHoldsService } from "./services/capacityService";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const sweepIntervalMs = Number(process.env.BOOKING_SWEEP_INTERVAL_MS || 60000);
    setInterval(() => {
      sweepBookingLifecycleService().catch((error) => {
        console.error("Booking lifecycle sweep failed:", error);
      });

      // Also sweep expired cart holds (new feature for slot reservation system)
      sweepExpiredCartHoldsService().catch((error) => {
        console.error("Cart hold expiration sweep failed:", error);
      });
    }, sweepIntervalMs);
  })
  .catch((err) => {
    console.log("DB Error:", err);
  });