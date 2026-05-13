import { Request, Response } from "express";
import Cart from "../models/Cart";
import Booking from "../models/Booking";
import Service from "../models/Service";

// CHECKOUT CART → BOOKING
export const checkoutCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // STEP 1: Check capacity for each item
    for (const item of cart.items) {
      const service = await Service.findById(item.serviceId);

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // count existing bookings for same slot
      const existingBookings = await Booking.find({
        "items.serviceId": item.serviceId,
        "items.date": item.date,
        "items.timeSlot": item.timeSlot,
        status: { $ne: "cancelled" }
      });

      let bookedCount = 0;
      existingBookings.forEach((b) => {
        b.items.forEach((i: any) => {
          if (
            i.serviceId.toString() === item.serviceId.toString() &&
            i.date === item.date &&
            i.timeSlot === item.timeSlot
          ) {
            bookedCount += i.quantity;
          }
        });
      });

      if (bookedCount + item.quantity > service.capacityPerSlot) {
        return res.status(409).json({
          message: "Slot full for service",
          serviceId: item.serviceId
        });
      }
    }

    // STEP 2: Create booking
    const booking = await Booking.create({
      userId,
      items: cart.items,
      status: "confirmed"
    });

    // STEP 3: Clear cart
    cart.items.splice(0, cart.items.length);
    await cart.save();

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Checkout failed", error });
  }
};

// GET USER BOOKINGS
export const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const bookings = await Booking.find({ userId }).populate(
      "items.serviceId"
    );

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings", error });
  }
};