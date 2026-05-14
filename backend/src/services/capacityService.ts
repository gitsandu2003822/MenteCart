import SlotCapacity from "../models/SlotCapacity";
import CartExpiration from "../models/CartExpiration";
import AuditLog from "../models/AuditLog";
import Service from "../models/Service";
import Booking from "../models/Booking";

export const initSlotCapacityService = async (serviceId: string, date: string, timeSlot: string) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }

  const capacity = Number(service.capacityPerSlot) || 1;

  const existing = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (existing) {
    return existing;
  }

  const slot = await SlotCapacity.create({
    serviceId,
    date,
    timeSlot,
    totalCapacity: capacity,
    confirmedCount: 0,
    heldCount: 0,
    availableCount: capacity
  });

  return slot;
};

export const holdSlotCapacityService = async (
  userId: string,
  cartItemId: string,
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number,
  cartExpirationMinutes: number = 15
) => {
  await initSlotCapacityService(serviceId, date, timeSlot);

  const slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    throw { statusCode: 404, message: "Slot not found" };
  }

  const availableNow = slot.availableCount;
  if (availableNow < quantity) {
    throw {
      statusCode: 409,
      message: "Not enough capacity for this slot",
      errorCode: "CAPACITY_EXCEEDED",
      available: availableNow,
      requested: quantity
    };
  }

  slot.heldCount = (slot.heldCount || 0) + quantity;
  slot.availableCount = slot.totalCapacity - (slot.confirmedCount || 0) - slot.heldCount;
  await slot.save();

  const expiresAt = new Date(Date.now() + cartExpirationMinutes * 60 * 1000);

  const expiration = await CartExpiration.create({
    userId,
    cartItemId,
    serviceId,
    date,
    timeSlot,
    quantity,
    expiresAt
  });

  return { slot, expiration };
};

export const releaseSlotHoldService = async (
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number
) => {
  const slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    return null;
  }

  slot.heldCount = Math.max(0, (slot.heldCount || 0) - quantity);
  slot.availableCount = slot.totalCapacity - (slot.confirmedCount || 0) - slot.heldCount;
  await slot.save();

  return slot;
};

export const confirmSlotCapacityService = async (
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number
) => {
  const slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    await initSlotCapacityService(serviceId, date, timeSlot);
  }

  const updated = await SlotCapacity.findOneAndUpdate(
    { serviceId, date, timeSlot },
    {
      $inc: {
        confirmedCount: quantity,
        heldCount: -quantity
      }
    },
    { new: true }
  );

  if (updated) {
    updated.availableCount = updated.totalCapacity - updated.confirmedCount - updated.heldCount;
    await updated.save();
  }

  return updated;
};

export const releaseConfirmedCapacityService = async (
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number
) => {
  const slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    return null;
  }

  slot.confirmedCount = Math.max(0, (slot.confirmedCount || 0) - quantity);
  slot.availableCount = slot.totalCapacity - slot.confirmedCount - (slot.heldCount || 0);
  await slot.save();

  return slot;
};

export const sweepExpiredCartHoldsService = async () => {
  const now = new Date();
  const expired = await CartExpiration.find({
    expiresAt: { $lte: now },
    released: false
  });

  let released = 0;

  for (const hold of expired) {
    await releaseSlotHoldService(hold.serviceId.toString(), hold.date, hold.timeSlot, hold.quantity);
    hold.released = true;
    await hold.save();
    released += 1;
  }

  return { scanned: expired.length, released };
};

export const auditLogService = async (
  entityType: string,
  entityId: string,
  action: string,
  actor: { userId?: string; role?: string },
  changes?: any,
  reason?: string
) => {
  const log = await AuditLog.create({
    entityType,
    entityId,
    action,
    actor,
    changes,
    reason: reason || null
  });

  return log;
};

export const getSlotAvailabilityService = async (serviceId: string, date: string, timeSlot: string) => {
  const slot = await SlotCapacity.findOne({ serviceId, date, timeSlot });
  if (!slot) {
    const service = await Service.findById(serviceId);
    return {
      serviceId,
      date,
      timeSlot,
      totalCapacity: Number(service?.capacityPerSlot) || 1,
      confirmedCount: 0,
      heldCount: 0,
      availableCount: Number(service?.capacityPerSlot) || 1
    };
  }

  return slot;
};
