import Service from "../models/Service";
import Booking from "../models/Booking";

export const getServicesService = async (
  page: number = 1,
  limit: number = 10,
  category: string | undefined = undefined,
  search: string | undefined = undefined
) => {
  const query: any = {};

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const services = await Service.find(query)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Service.countDocuments(query);

  return {
    data: services,
    total,
    page,
    limit,
    hasMore: page * limit < total
  };
};

export const getServiceByIdService = async (id: string) => {
  const service = await Service.findById(id);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }
  return service;
};

export const createServiceService = async (serviceData: any) => {
  const service = await Service.create(serviceData);
  return service;
};

export const getAvailabilityService = async (serviceId: string, date: string) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }

  // Define default time slots (should align with client UI)
  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM'
  ];

  const results: any[] = [];

  for (const slot of timeSlots) {
    const existingBookings = await Booking.find({
      "items.serviceId": serviceId,
      "items.date": date,
      "items.timeSlot": slot,
      status: { $ne: "cancelled" }
    });

    let bookedCount = 0;
    existingBookings.forEach((b) => {
      b.items.forEach((i: any) => {
        if (
          i.serviceId.toString() === serviceId.toString() &&
          i.date === date &&
          i.timeSlot === slot
        ) {
          bookedCount += i.quantity || 0;
        }
      });
    });

    const remaining = (service.capacityPerSlot || 1) - bookedCount;

    results.push({ slot, remaining: Math.max(0, remaining), available: remaining > 0 });
  }

  return { serviceId, date, capacityPerSlot: service.capacityPerSlot, slots: results };
};
