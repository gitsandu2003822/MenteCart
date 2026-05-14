import Cart from "../models/Cart";
import Booking from "../models/Booking";
import Service from "../models/Service";

const getStatusPayload = (status: string) => ({
  status,
  changedAt: new Date()
});

const appendStatusHistory = (booking: any, status: string) => {
  booking.statusHistory = [
    ...((booking.statusHistory as any[]) || []),
    getStatusPayload(status)
  ];
};

const parseItemDateTime = (date: string, timeSlot: string): Date | null => {
  if (!date || !timeSlot) return null;

  const parts = timeSlot.trim().split(" ");
  if (parts.length < 2) return null;

  const timePart = parts[0]!;
  const meridiemRaw = parts[1]!;
  const timeSplit = timePart.split(":");
  if (timeSplit.length !== 2) return null;

  const hourRaw = Number(timeSplit[0]);
  const minute = Number(timeSplit[1]);
  const meridiem = meridiemRaw.toUpperCase();

  if (Number.isNaN(hourRaw) || Number.isNaN(minute)) return null;

  let hour = hourRaw;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const dateTime = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dateTime.getTime())) return null;
  dateTime.setHours(hour, minute, 0, 0);
  return dateTime;
};

const getBookingScheduleBoundary = (booking: any): Date | null => {
  const itemDateTimes = (((booking as any).items as any[]) || [])
    .map((item) => parseItemDateTime(String(item.date || ""), String(item.timeSlot || "")))
    .filter((value): value is Date => value !== null);

  if (itemDateTimes.length === 0) {
    return null;
  }

  return itemDateTimes.reduce((max, current) =>
    current.getTime() > max.getTime() ? current : max
  );
};

const refreshBookingLifecycle = (booking: any) => {
  if (!booking || booking.status === "cancelled" || booking.status === "failed" || booking.status === "completed") {
    return booking;
  }

  const boundary = getBookingScheduleBoundary(booking);
  if (!boundary) {
    return booking;
  }

  const now = Date.now();

  if (booking.status === "pending") {
    if (now >= boundary.getTime()) {
      booking.status = "failed";
      booking.paymentStatus = "failed";
      appendStatusHistory(booking, "failed");
    }
    return booking;
  }

  if (booking.status === "confirmed" && now >= boundary.getTime()) {
    booking.status = "completed";
    appendStatusHistory(booking, "completed");
  }

  return booking;
};

export const sweepBookingLifecycleService = async () => {
  const bookings = await Booking.find({
    status: { $in: ["pending", "confirmed"] }
  });

  let changed = 0;

  for (const booking of bookings) {
    const previousStatus = booking.status;
    refreshBookingLifecycle(booking);

    if (booking.status !== previousStatus) {
      changed += 1;
      await booking.save();
    }
  }

  return { scanned: bookings.length, changed };
};

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
  await sweepBookingLifecycleService();
  const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).populate("items.serviceId");
  return bookings;
};

export const getAllBookingsService = async (page: number = 1, limit: number = 20) => {
  await sweepBookingLifecycleService();
  const bookings = await Booking.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("items.serviceId")
    .populate("userId", "email role");

  const total = await Booking.countDocuments({});

  return {
    data: bookings,
    total,
    page,
    limit,
    hasMore: page * limit < total
  };
};

export const getBookingByIdService = async (userId: string, bookingId: string) => {
  await sweepBookingLifecycleService();
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
  await sweepBookingLifecycleService();
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

  const cutoffHours = Number(process.env.BOOKING_CANCEL_CUTOFF_HOURS || 24);
  const cutoffMs = cutoffHours * 60 * 60 * 1000;

  const itemDateTimes = (((booking as any).items as any[]) || [])
    .map((item) => parseItemDateTime(String(item.date || ""), String(item.timeSlot || "")))
    .filter((value): value is Date => value !== null);

  if (itemDateTimes.length > 0) {
    const earliest = itemDateTimes.reduce((min, current) =>
      current.getTime() < min.getTime() ? current : min
    );

    const now = Date.now();
    if (now >= earliest.getTime() - cutoffMs) {
      throw {
        statusCode: 409,
        message: `Cancellation window closed (${cutoffHours}h cutoff)`
      };
    }
  }

  booking.status = "cancelled";
  appendStatusHistory(booking, "cancelled");
  await booking.save();

  return booking;
};

export const confirmBookingPaymentService = async (userId: string, bookingId: string) => {
  await sweepBookingLifecycleService();
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw { statusCode: 404, message: "Booking not found" };
  }

  if (booking.userId.toString() !== userId) {
    throw { statusCode: 403, message: "Unauthorized" };
  }

  if (booking.status === "cancelled") {
    throw { statusCode: 400, message: "Cannot pay a cancelled booking" };
  }

  if (booking.status === "completed") {
    throw { statusCode: 400, message: "Cannot pay a completed booking" };
  }

  if (booking.status === "failed") {
    throw { statusCode: 400, message: "Cannot pay a failed booking" };
  }

  refreshBookingLifecycle(booking);
  if ((booking as any).status === "failed") {
    await booking.save();
    throw { statusCode: 409, message: "Booking has expired and was marked failed" };
  }

  if ((booking as any).paymentStatus === "paid") {
    return booking;
  }

  if (booking.paymentMethod !== "card") {
    throw { statusCode: 400, message: "Payment simulation is only for card bookings" };
  }

  booking.paymentStatus = "paid";
  if (booking.status === "pending") {
    booking.status = "confirmed";
    appendStatusHistory(booking, "confirmed");
  }

  await booking.save();
  return booking;
};

export const completeBookingService = async (bookingId: string) => {
  await sweepBookingLifecycleService();
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw { statusCode: 404, message: "Booking not found" };
  }

  if (booking.status === "cancelled") {
    throw { statusCode: 400, message: "Cannot complete a cancelled booking" };
  }

  if (booking.status === "failed") {
    throw { statusCode: 400, message: "Cannot complete a failed booking" };
  }

  if (booking.status === "completed") {
    return booking;
  }

  if (booking.status !== "confirmed") {
    throw { statusCode: 400, message: "Only confirmed bookings can be completed" };
  }

  booking.status = "completed";
  appendStatusHistory(booking, "completed");
  await booking.save();
  return booking;
};

export const failBookingService = async (bookingId: string) => {
  await sweepBookingLifecycleService();
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw { statusCode: 404, message: "Booking not found" };
  }

  if (booking.status === "cancelled") {
    throw { statusCode: 400, message: "Cannot fail a cancelled booking" };
  }

  if (booking.status === "completed") {
    throw { statusCode: 400, message: "Cannot fail a completed booking" };
  }

  booking.status = "failed";
  booking.paymentStatus = "failed";
  appendStatusHistory(booking, "failed");
  await booking.save();
  return booking;
};
