import { z } from "zod";

export const checkoutBookingSchema = z.object({
  paymentMethod: z.enum(["cash", "pay_on_arrival", "card"]).default("cash")
});
