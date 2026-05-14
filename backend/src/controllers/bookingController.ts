import { Request, Response } from "express";
import {
  checkoutCartService,
  getUserBookingsService,
  getAllBookingsService,
  getBookingByIdService,
  cancelBookingService,
  confirmBookingPaymentService,
  completeBookingService,
  failBookingService
} from "../services/bookingService";
import {
  checkoutCartWithCapacityService,
  cancelBookingWithReleaseService,
  completeBookingWithAuditService,
  failBookingWithReleaseService,
  confirmPaymentWithAuditService
} from "../services/capacityIntegrationService";
import { sendApiError } from "../utils/sendApiError";

// CHECKOUT CART → BOOKING
export const checkoutCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { paymentMethod } = req.body;
    const booking = await checkoutCartWithCapacityService(
      userId,
      paymentMethod,
      (uid: string, pm: string) => checkoutCartService(uid, pm)
    );
    res.status(201).json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Checkout failed");
  }
};

// GET USER BOOKINGS
export const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const bookings = await getUserBookingsService(userId);
    res.json(bookings);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching bookings");
  }
};

// GET ALL BOOKINGS FOR ADMIN
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await getAllBookingsService(page, limit);
    res.json(result);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching bookings");
  }
};

// GET BOOKING BY ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const booking = await getBookingByIdService(userId, id);
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching booking");
  }
};

// CANCEL BOOKING
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const booking = await cancelBookingWithReleaseService(
      userId,
      id,
      (uid: string, bid: string) => cancelBookingService(uid, bid)
    );
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error cancelling booking");
  }
};

// SIMULATE PAYMENT SUCCESS (CARD) => pending -> confirmed
export const payBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = String(req.params.id);
    const booking = await confirmPaymentWithAuditService(
      userId,
      id,
      (uid: string, bid: string) => confirmBookingPaymentService(uid, bid)
    );
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error processing payment");
  }
};

// ADMIN: COMPLETE BOOKING
export const completeBooking = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const id = String(req.params.id);
    const booking = await completeBookingWithAuditService(
      id,
      (bid: string) => completeBookingService(bid),
      adminUserId
    );
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error completing booking");
  }
};

// ADMIN: FAIL BOOKING
export const failBooking = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const id = String(req.params.id);
    const booking = await failBookingWithReleaseService(
      id,
      (bid: string) => failBookingService(bid),
      adminUserId
    );
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error failing booking");
  }
};