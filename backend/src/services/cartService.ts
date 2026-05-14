import Cart from "../models/Cart";
import Service from "../models/Service";

const normalizeQuantity = (quantity: number | undefined) => {
  const parsed = Number(quantity ?? 1);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw { statusCode: 400, message: "Invalid quantity" };
  }
  return Math.floor(parsed);
};

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
  const nextQuantity = normalizeQuantity(quantity);

  if (!date || !timeSlot) {
    throw { statusCode: 400, message: "date and timeSlot are required" };
  }

  if (nextQuantity <= 0) {
    throw { statusCode: 400, message: "Quantity must be greater than zero" };
  }

  // Verify service exists
  const service = await Service.findById(serviceId);
  if (!service) {
    throw { statusCode: 404, message: "Service not found" };
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ serviceId, date, timeSlot, quantity: nextQuantity }]
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
      exists.quantity = (exists.quantity || 0) + nextQuantity;
    } else {
      cart.items.push({ serviceId, date, timeSlot, quantity: nextQuantity });
    }

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

  const nextQuantity = updates.quantity === undefined ? undefined : normalizeQuantity(updates.quantity);
  if (nextQuantity !== undefined && nextQuantity <= 0) {
    cart.items = cart.items.filter((cartItem: any) => cartItem._id.toString() !== itemId) as any;
    await cart.save();
    return await cart.populate("items.serviceId");
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
    duplicate.quantity = (duplicate.quantity || 0) + (nextQuantity ?? item.quantity ?? 1);
    cart.items = cart.items.filter((cartItem: any) => cartItem._id.toString() !== itemId) as any;

    await cart.save();
    return await cart.populate("items.serviceId");
  }

  if (updates.date) item.date = updates.date;
  if (updates.timeSlot) item.timeSlot = updates.timeSlot;
  if (nextQuantity !== undefined) item.quantity = nextQuantity;

  await cart.save();
  return await cart.populate("items.serviceId");
};
