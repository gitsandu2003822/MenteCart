import express from "express";
import { signup, login, me, googleLogin } from "../controllers/authController";
import { verifyToken } from "../middleware/authMiddleware";
import { validateBody } from "../middleware/validateRequest";
import { loginSchema, signupSchema } from "../validators/authValidators";

const router = express.Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.post("/google", googleLogin);
router.get("/me", verifyToken, me);

export default router;