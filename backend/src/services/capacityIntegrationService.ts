import Cart from "../models/Cart";
import Booking from "../models/Booking";
import CartExpiration from "../models/CartExpiration";
import { 
  holdSlotCapacityService, 
  confirmSlotCapacityService, 
  releaseSlotHoldService,
  releaseConfirmedCapacityService,
  auditLogService
} from "./capacityService";
import { validateCheckoutCapacityService } from "./capacityValidationService";

export const addToCartWithHoldService = async (
  userId: string,
  serviceId: string,
  date: string,
  timeSlot: string,
  quantity: number = 1,
  originalAddToCartService: any
) => {
  // Call the original cart service
  const cart = await originalAddToCartService(userId, serviceId, date, timeSlot, quantity);

  // Find the newly added/updated item
  const item = cart.items.find(
    (i: any) =>
      i.serviceId._id?.toString() === serviceId ||
      i.serviceId?.toString() === serviceId
  );

  if (item) {
    try {
      // Hold the capacity for this item (this is a NEW feature, doesn't change existing logic)
      await holdSlotCapacityService(
        userId,
        item._id.toString(),
        serviceId,
        date,
        timeSlot,
        quantity,
        15 // 15 minute expiration as specified
      );
    } catch (holdError: any) {
      // If hold fails due to capacity, propagate the error
      if (holdError.statusCode === 409) {
        throw holdError;
      }
      // Otherwise, log but don't fail - capacity check happens at checkout anyway
      console.warn("Failed to hold capacity:", holdError.message);
    }
  }

  return cart;
};

export const checkoutCartWithCapacityService = async (
  userId: string,
  paymentMethod: string = "cash",
  originalCheckoutService: any
) => {
  // BEFORE checkout, validate capacity including held items from active carts
  const cart = await Cart.findOne({ userId });
  if (cart && cart.items.length > 0) {
    await validateCheckoutCapacityService(userId, cart.items);
  }

  // Call the original checkout service
  const booking = await originalCheckoutService(userId, paymentMethod);

  // NOW convert holds to confirmed capacity (this is NEW, doesn't change existing logic)
  for (const item of booking.items) {
    try {
      await confirmSlotCapacityService(
        item.serviceId.toString(),
        item.date,
        item.timeSlot,
        item.quantity
      );
    } catch (err) {
      console.warn("Failed to confirm slot capacity:", err);
    }
  }

  // Log the booking creation
  try {
    await auditLogService(
      "booking",
      booking._id.toString(),
      "created",
      { userId, role: "user" },
      { paymentMethod, status: booking.status },
      "Checkout completed"
    );
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }

  return booking;
};

export const cancelBookingWithReleaseService = async (
  userId: string,
  bookingId: string,
  originalCancelService: any
) => {
  // Get the booking BEFORE canceling to know what capacity to release
  const booking = await Booking.findById(bookingId);
  const originalStatus = booking?.status;

  // Call the original cancel service
  const cancelledBooking = await originalCancelService(userId, bookingId);

  // Release the confirmed capacity (NEW feature)
  if (booking && booking.status !== "cancelled") {
    for (const item of booking.items) {
      try {
        await releaseConfirmedCapacityService(
          item.serviceId.toString(),
          item.date,
          item.timeSlot,
          item.quantity
        );
      } catch (err) {
        console.warn("Failed to release slot capacity:", err);
      }
    }
  }

  // Log the cancellation
  try {
    await auditLogService(
      "booking",
      bookingId,
      "cancelled",
      { userId, role: "user" },
      { previousStatus: originalStatus },
      "User cancelled booking"
    );
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }

  return cancelledBooking;
};

export const completeBookingWithAuditService = async (
  bookingId: string,
  originalCompleteService: any,
  adminUserId?: string
) => {
  const booking = await Booking.findById(bookingId);

  // Call the original complete service
  const completedBooking = await originalCompleteService(bookingId);

  // Log the completion
  try {
    const actor: any = { role: "admin" };
    if (adminUserId) {
      actor.userId = adminUserId;
    }
    await auditLogService(
      "booking",
      bookingId,
      "completed",
      actor,
      { previousStatus: booking?.status },
      "Admin or system marked booking as completed"
    );
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }

  return completedBooking;
};

export const failBookingWithReleaseService = async (
  bookingId: string,
  originalFailService: any,
  adminUserId?: string
) => {
  const booking = await Booking.findById(bookingId);

  // Call the original fail service
  const failedBooking = await originalFailService(bookingId);

  // Release the confirmed capacity (since booking is now failed/cancelled)
  if (booking && (booking.status === "pending" || booking.status === "confirmed")) {
    for (const item of booking.items) {
      try {
        await releaseConfirmedCapacityService(
          item.serviceId.toString(),
          item.date,
          item.timeSlot,
          item.quantity
        );
      } catch (err) {
        console.warn("Failed to release slot capacity:", err);
      }
    }
  }

  // Log the failure
  try {
    const actor: any = { role: adminUserId ? "admin" : "system" };
    if (adminUserId) {
      actor.userId = adminUserId;
    }
    await auditLogService(
      "booking",
      bookingId,
      "failed",
      actor,
      { previousStatus: booking?.status },
      "Payment failed or booking expired"
    );
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }

  return failedBooking;
};

export const removeCartItemWithReleaseService = async (
  userId: string,
  itemId: string,
  originalRemoveService: any
) => {
  // Get the cart item BEFORE removing to know what to release
  const cart = await Cart.findOne({ userId });
  const item = cart?.items.find((i: any) => i._id.toString() === itemId);

  // Call the original remove service
  const updatedCart = await originalRemoveService(userId, itemId);

  // Release the hold on capacity (NEW feature)
  if (item) {
    try {
      await releaseSlotHoldService(
        item.serviceId.toString(),
        item.date,
        item.timeSlot,
        item.quantity
      );

      // Mark the expiration as released
      const expiration = await CartExpiration.findOne({
        userId,
        cartItemId: itemId,
        released: false
      });
      if (expiration) {
        expiration.released = true;
        await expiration.save();
      }
    } catch (err) {
      console.warn("Failed to release cart hold:", err);
    }
  }

  return updatedCart;
};

export const confirmPaymentWithAuditService = async (
  userId: string,
  bookingId: string,
  originalConfirmService: any
) => {
  const booking = await Booking.findById(bookingId);
  const previousStatus = booking?.status;
  const previousPaymentStatus = booking?.paymentStatus;

  // Call the original confirm service
  const confirmedBooking = await originalConfirmService(userId, bookingId);

  // Log the payment confirmation
  try {
    await auditLogService(
      "booking",
      bookingId,
      "payment_confirmed",
      { userId, role: "user" },
      {
        previousStatus,
        newStatus: confirmedBooking.status,
        previousPaymentStatus,
        newPaymentStatus: confirmedBooking.paymentStatus
      },
      "User confirmed card payment"
    );
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }

  return confirmedBooking;
};
