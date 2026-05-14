import { Request, Response } from "express";
import {
  checkoutCartService,
  getUserBookingsService,
  getBookingByIdService,
  cancelBookingService,
  confirmBookingPaymentService
} from "../services/bookingService";
import { sendApiError } from "../utils/sendApiError";

// CHECKOUT CART → BOOKING
export const checkoutCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { paymentMethod } = req.body;
    const booking = await checkoutCartService(userId, paymentMethod);
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
    const booking = await cancelBookingService(userId, id);
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
    const booking = await confirmBookingPaymentService(userId, id);
    res.json(booking);
  } catch (error: any) {
    sendApiError(res, error, "Error processing payment");
  }
};