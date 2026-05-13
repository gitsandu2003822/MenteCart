import express from "express";
import {
  getCart,
  addToCart,
  removeCartItem
} from "../controllers/cartController";

import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", verifyToken, getCart);
router.post("/add", verifyToken, addToCart);
router.delete("/:itemId", verifyToken, removeCartItem);

export default router;