import Cart from "../models/Cart";
import Booking from "../models/Booking";
import Service from "../models/Service";

const getStatusPayload = (status: string) => ({
  status,
  changedAt: new Date()
});

export const checkoutCartService = async (userId: string, paymentMethod: string = "cash") => {
  const cart = await Cart.findOne({ userId });

  if (!cart || cart.items.length === 0) {
    throw { statusCode: 400, message: "Cart is empty" };
  }

  const isImmediateConfirmation = paymentMethod === "cash" || paymentMethod === "pay_on_arrival";
  const bookingStatus = isImmediateConfirmation ? "confirmed" : "pending";
  const paymentStatus = isImmediateConfirmation ? "unpaid" : "pending";

  const maxBookingsPerDay = Number(process.env.MAX_BOOKINGS_PER_DAY || 3);

  // STEP 1: Check capacity for each item (atomic check)
  for (const item of cart.items) {
    const service = await Service.findById(item.serviceId);

    if (!service) {
      throw { statusCode: 404, message: "Service not found" };
    }

    // Count existing bookings for same slot
    const existingBookings = await Booking.find({
      "items.serviceId": item.serviceId,
      "items.date": item.date,
      "items.timeSlot": item.timeSlot,
      status: { $ne: "cancelled" }
    });


    const sameDayBookings = await Booking.find({
      userId,
      "items.date": item.date,
      status: { $ne: "cancelled" }
    });

    if (sameDayBookings.length >= maxBookingsPerDay) {
      throw {
        statusCode: 409,
        message: "Daily booking limit reached",
        errorCode: "DAILY_BOOKING_LIMIT"
      };
    }
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
      throw {
        statusCode: 409,
        message: "Slot full for service",
        errorCode: "CAPACITY_EXCEEDED",
        serviceId: item.serviceId
      };
    }
  }

  // STEP 2: Create booking
  const booking = await Booking.create({
    userId,
    items: cart.items,
    status: bookingStatus,
    paymentMethod: paymentMethod as "cash" | "pay_on_arrival" | "card",
    paymentStatus,
    statusHistory: [getStatusPayload(bookingStatus)]
  });

  // STEP 3: Clear cart
  cart.items.splice(0, cart.items.length);
  await cart.save();

  return booking;
};

export const getUserBookingsService = async (userId: string) => {
  const bookings = await Booking.find({ userId }).populate("items.serviceId");
  return bookings;
};

export const getBookingByIdService = async (userId: string, bookingId: string) => {
  const booking = await Booking.findById(bookingId).populate("items.serviceId");

  if (!booking) {
    throw { statusCode: 404, message: "Booking not found" };
  }

  if (booking.userId.toString() !== userId) {
    throw { statusCode: 403, message: "Unauthorized" };
  }

  return booking;
};

export const cancelBookingService = async (userId: string, bookingId: string) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw { statusCode: 404, message: "Booking not found" };
  }

  if (booking.userId.toString() !== userId) {
    throw { statusCode: 403, message: "Unauthorized" };
  }

  if (booking.status === "cancelled") {
    throw { statusCode: 400, message: "Booking already cancelled" };
  }

  if (booking.status === "completed") {
    throw { statusCode: 400, message: "Cannot cancel completed booking" };
  }

  booking.status = "cancelled";
  (booking as any).statusHistory = [
    ...(((booking as any).statusHistory as any[]) || []),
    getStatusPayload("cancelled")
  ];
  await booking.save();

  return booking;
};
