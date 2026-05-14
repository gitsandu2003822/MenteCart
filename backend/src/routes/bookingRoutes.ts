import express from "express";
import { checkoutCart, getBookings, getBookingById, cancelBooking, payBooking } from "../controllers/bookingController";
import { verifyToken } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { checkoutBookingSchema } from "../validators/bookingValidators";

const router = express.Router();

router.post("/checkout", verifyToken, validateBody(checkoutBookingSchema), checkoutCart);
router.get("/", verifyToken, getBookings);
router.get("/:id", verifyToken, getBookingById);
router.post("/:id/cancel", verifyToken, cancelBooking);
router.post("/:id/pay", verifyToken, payBooking);

export default router;