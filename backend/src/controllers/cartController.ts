import { Request, Response } from "express";
import Cart from "../models/Cart";

// GET CART
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const cart = await Cart.findOne({ userId }).populate("items.serviceId");

    res.json(cart || { userId, items: [] });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error });
  }
};

// ADD ITEM TO CART
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { serviceId, date, timeSlot, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ serviceId, date, timeSlot, quantity }]
      });
    } else {
      // check duplicate slot
      const exists = cart.items.find(
        (item: any) =>
          item.serviceId.toString() === serviceId &&
          item.date === date &&
          item.timeSlot === timeSlot
      );

      if (exists) {
        return res.status(409).json({ message: "Slot already in cart" });
      }

      cart.items.push({ serviceId, date, timeSlot, quantity });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error });
  }
};

// REMOVE ITEM
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item: any) => item._id.toString() !== itemId
    );

    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error removing item", error });
  }
};