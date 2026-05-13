import { Request, Response } from "express";
import Service from "../models/Service";

// CREATE SERVICE (for testing/admin)
export const createService = async (req: Request, res: Response) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: "Error creating service", error });
  }
};

// GET ALL SERVICES (with simple pagination)
export const getServices = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const services = await Service.find()
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Service.countDocuments();

    res.json({
      data: services,
      total,
      hasMore: page * limit < total
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching services", error });
  }
};

// GET SINGLE SERVICE
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Error fetching service", error });
  }
};