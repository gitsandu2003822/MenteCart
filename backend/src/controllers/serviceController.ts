import { Request, Response } from "express";
import { getServicesService, getServiceByIdService, createServiceService } from "../services/serviceService";
import { sendApiError } from "../utils/sendApiError";

import { getAvailabilityService } from "../services/serviceService";

// CREATE SERVICE (for testing/admin)
export const createService = async (req: Request, res: Response) => {
  try {
    const service = await createServiceService(req.body);
    res.status(201).json(service);
  } catch (error: any) {
    sendApiError(res, error, "Error creating service");
  }
};

// GET ALL SERVICES (with pagination, filtering, search)
export const getServices = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await getServicesService(page, limit, category, search);
    res.json(result);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching services");
  }
};

// GET SINGLE SERVICE
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const serviceId = String(req.params.id);
    const service = await getServiceByIdService(serviceId);
    res.json(service);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching service");
  }
};

// GET AVAILABILITY FOR SERVICE ON A GIVEN DATE
export const getAvailability = async (req: Request, res: Response) => {
  try {
    const serviceId = String(req.params.id);
    const date = String(req.query.date || "");
    if (!date) {
      return sendApiError(res, { statusCode: 400, message: "date query param required" }, "Missing date");
    }

    const result = await getAvailabilityService(serviceId, date);
    res.json(result);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching availability");
  }
};