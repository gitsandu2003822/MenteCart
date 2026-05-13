import express from "express";
import { checkoutCart, getBookings, getBookingById, cancelBooking } from "../controllers/bookingController";
import { verifyToken } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { checkoutBookingSchema } from "../validators/bookingValidators";

const router = express.Router();

router.post("/checkout", verifyToken, validateBody(checkoutBookingSchema), checkoutCart);
router.get("/", verifyToken, getBookings);
router.get("/:id", verifyToken, getBookingById);
router.post("/:id/cancel", verifyToken, cancelBooking);

export default router;