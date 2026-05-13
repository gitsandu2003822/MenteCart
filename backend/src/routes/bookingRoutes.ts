import express from "express";
import { checkoutCart, getBookings } from "../controllers/bookingController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/checkout", verifyToken, checkoutCart);
router.get("/", verifyToken, getBookings);

export default router;