import Cart from "../models/Cart";
import Service from "../models/Service";

export const getCartService = async (userId: string) => {
  const cart = await Cart.findOne({ userId }).populate("items.serviceId");
  return cart || { userId, items: [] };
};

export const addToCartService = async (
  userId: string,
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number = 1
) => {
  // Verify service exists
  const service = await Service.findById(serviceId);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ serviceId, date, timeSlot, quantity }]
    });
  } else {
    // Check for duplicate slot
    const exists = cart.items.find(
      (item: any) =>
        item.serviceId.toString() === serviceId &&
        item.date === date &&
        item.timeSlot === timeSlot
    );

    if (exists) {
      throw { statusCode: 409, message: "Slot already in cart" };
    }

    cart.items.push({ serviceId, date, timeSlot, quantity });
    await cart.save();
  }

  return await cart.populate("items.serviceId");
};

export const removeCartItemService = async (userId: string, itemId: string) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw { statusCode: 404, message: "Cart not found" };
  }

  cart.items = cart.items.filter(
    (item: any) => item._id.toString() !== itemId
  ) as any;

  await cart.save();
  return await cart.populate("items.serviceId");
};

export const updateCartItemService = async (
  userId: string,
  itemId: string,
  updates: { date?: string; timeSlot?: string; quantity?: number }
) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw { statusCode: 404, message: "Cart not found" };
  }

  const item = cart.items.find((i: any) => i._id.toString() === itemId);
  if (!item) {
    throw { statusCode: 404, message: "Item not found in cart" };
  }

  const nextDate = updates.date ?? item.date;
  const nextTimeSlot = updates.timeSlot ?? item.timeSlot;

  const duplicate = cart.items.find(
    (cartItem: any) =>
      cartItem._id.toString() !== itemId &&
      cartItem.serviceId.toString() === item.serviceId.toString() &&
      cartItem.date === nextDate &&
      cartItem.timeSlot === nextTimeSlot
  );

  if (duplicate) {
    throw { statusCode: 409, message: "Slot already exists in cart" };
  }

  if (updates.date) item.date = updates.date;
  if (updates.timeSlot) item.timeSlot = updates.timeSlot;
  if (updates.quantity) item.quantity = updates.quantity;

  await cart.save();
  return await cart.populate("items.serviceId");
};
