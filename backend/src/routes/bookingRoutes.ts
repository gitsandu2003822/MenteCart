import express from "express";
import { checkoutCart, getBookings, getAllBookings, getBookingById, cancelBooking, payBooking, completeBooking, failBooking } from "../controllers/bookingController";
import { verifyToken, checkAdminRole } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { checkoutBookingSchema } from "../validators/bookingValidators";

const router = express.Router();

router.post("/checkout", verifyToken, validateBody(checkoutBookingSchema), checkoutCart);
router.get("/", verifyToken, getBookings);
router.get("/admin", verifyToken, checkAdminRole, getAllBookings);
router.get("/:id", verifyToken, getBookingById);
router.post("/:id/cancel", verifyToken, cancelBooking);
router.post("/:id/pay", verifyToken, payBooking);
router.post("/:id/complete", verifyToken, checkAdminRole, completeBooking);
router.post("/:id/fail", verifyToken, checkAdminRole, failBooking);

export default router;