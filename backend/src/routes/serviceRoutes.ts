import express from "express";
import {
  createService,
  getServices,
  getServiceById,
  getAvailability
} from "../controllers/serviceController";
import { verifyToken, checkAdminRole } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, checkAdminRole, createService);
router.get("/", getServices);
router.get("/:id", getServiceById);
router.get("/:id/availability", getAvailability);

export default router;