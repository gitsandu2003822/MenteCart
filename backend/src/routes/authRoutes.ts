import express from "express";
import { signup, login, me } from "../controllers/authController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyToken, me);

export default router;