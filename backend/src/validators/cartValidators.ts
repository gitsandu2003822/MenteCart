import { z } from "zod";

export const addToCartSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  quantity: z.number().int().positive().default(1)
});

export const updateCartItemSchema = z
  .object({
    date: z.string().min(1).optional(),
    timeSlot: z.string().min(1).optional(),
    quantity: z.number().int().positive().optional()
  })
  .refine((value) => value.date !== undefined || value.timeSlot !== undefined || value.quantity !== undefined, {
    message: "At least one field must be provided"
  });
