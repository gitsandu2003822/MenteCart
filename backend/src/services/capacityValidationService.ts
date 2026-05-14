import Cart from "../models/Cart";
import Booking from "../models/Booking";
import Service from "../models/Service";
import SlotCapacity from "../models/SlotCapacity";

export const checkCapacityWithHoldsService = async (
  serviceId: string,
  date: string,
  timeSlot: string,
  requestedQuantity: number
) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }

  const capacity = Number(service.capacityPerSlot) || 1;

  // Get or create slot capacity record
  let slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    slot = await SlotCapacity.create({
      serviceId,
      date,
      timeSlot,
      totalCapacity: capacity,
      confirmedCount: 0,
      heldCount: 0,
      availableCount: capacity
    });
  }

  // Recalculate availability based on current bookings and holds
  const confirmedBookings = await Booking.find({
    "items.serviceId": serviceId,
    "items.date": date,
    "items.timeSlot": timeSlot,
    status: { $nin: ["cancelled", "failed"] }
  });

  let confirmedCount = 0;
  confirmedBookings.forEach((b) => {
    b.items.forEach((i: any) => {
      if (
        i.serviceId.toString() === serviceId &&
        i.date === date &&
        i.timeSlot === timeSlot
      ) {
        confirmedCount += i.quantity;
      }
    });
  });

  // Get current holds that haven't expired
  const now = new Date();
  const activeHolds = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  const currentHeld = activeHolds?.heldCount || 0;

  const totalUsed = confirmedCount + currentHeld;
  const available = capacity - totalUsed;

  if (available < requestedQuantity) {
    throw {
      statusCode: 409,
      message: "Slot full for service",
      errorCode: "CAPACITY_EXCEEDED",
      available,
      requested: requestedQuantity
    };
  }

  return { capacity, confirmedCount, heldCount: currentHeld, availableCount: available };
};

export const validateCheckoutCapacityService = async (
  userId: string,
  cartItems: any[]
) => {
  const maxBookingsPerDay = Number(process.env.MAX_BOOKINGS_PER_DAY || 3);

  for (const item of cartItems) {
    const service = await Service.findById(item.serviceId);
    if (!service) {
      throw { statusCode: 404, message: "Service not found" };
    }

    // Check daily booking limit
    const sameDayBookings = await Booking.find({
      userId,
      "items.date": item.date,
      status: { $nin: ["cancelled", "failed"] }
    });

    if (sameDayBookings.length >= maxBookingsPerDay) {
      throw {
        statusCode: 409,
        message: "Daily booking limit reached",
        errorCode: "DAILY_BOOKING_LIMIT"
      };
    }

    // Check slot capacity with holds included
    await checkCapacityWithHoldsService(
      item.serviceId.toString(),
      item.date,
      item.timeSlot,
      item.quantity
    );
  }
};
