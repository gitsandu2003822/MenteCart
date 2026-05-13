import { Request, Response } from "express";
import {
  getCartService,
  addToCartService,
  removeCartItemService,
  updateCartItemService
} from "../services/cartService";
import { sendApiError } from "../utils/sendApiError";

// GET CART
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cart = await getCartService(userId);
    res.json(cart);
  } catch (error: any) {
    sendApiError(res, error, "Error fetching cart");
  }
};

// ADD ITEM TO CART
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { serviceId, date, timeSlot, quantity } = req.body;

    const cart = await addToCartService(userId, serviceId, date, timeSlot, quantity || 1);
    res.json(cart);
  } catch (error: any) {
    sendApiError(res, error, "Error adding to cart");
  }
};

// REMOVE ITEM
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const itemId = String(req.params.itemId);

    const cart = await removeCartItemService(userId, itemId);
    res.json(cart);
  } catch (error: any) {
    sendApiError(res, error, "Error removing item");
  }
};

// UPDATE CART ITEM
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const itemId = String(req.params.itemId);
    const { date, timeSlot, quantity } = req.body;

    const cart = await updateCartItemService(userId, itemId, { date, timeSlot, quantity });
    res.json(cart);
  } catch (error: any) {
    sendApiError(res, error, "Error updating item");
  }
};