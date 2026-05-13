import express from "express";
import {
  createService,
  getServices,
  getServiceById
} from "../controllers/serviceController";

const router = express.Router();

router.post("/", createService);
router.get("/", getServices);
router.get("/:id", getServiceById);

export default router;