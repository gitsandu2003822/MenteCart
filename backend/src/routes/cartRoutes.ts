import express from "express";
import {
  getCart,
  addToCart,
  removeCartItem,
  updateCartItem
} from "../controllers/cartController";

import { verifyToken } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { addToCartSchema, updateCartItemSchema } from "../validators/cartValidators";

const router = express.Router();

router.get("/", verifyToken, getCart);
router.post("/add", verifyToken, validateBody(addToCartSchema), addToCart);
router.patch("/:itemId", verifyToken, validateBody(updateCartItemSchema), updateCartItem);
router.delete("/:itemId", verifyToken, removeCartItem);

export default router;