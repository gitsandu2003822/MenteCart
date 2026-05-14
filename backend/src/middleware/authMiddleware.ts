import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendApiError } from "../utils/sendApiError";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;
    const token = headerToken || req.header("x-access-token") || (req.body as any)?.token || req.query.token;

    if (!token) {
      return sendApiError(res, { statusCode: 401, message: "No token provided", errorCode: "TOKEN_MISSING" }, "No token provided");
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return sendApiError(res, { statusCode: 500, message: "JWT secret not configured", errorCode: "JWT_SECRET_MISSING" }, "JWT secret not configured");
    }

    const decoded = jwt.verify(token, secret);

    (req as any).user = decoded;

    next();
  } catch (error) {
    return sendApiError(res, { statusCode: 401, message: "Invalid token", errorCode: "TOKEN_INVALID" }, "Invalid token");
  }
};

export const checkAdminRole = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return sendApiError(res, { statusCode: 401, message: "No user in request", errorCode: "USER_NOT_FOUND" }, "No user in request");
    }

    if (user.role !== "admin") {
      return sendApiError(res, { statusCode: 403, message: "Admin role required", errorCode: "FORBIDDEN" }, "Admin role required");
    }

    next();
  } catch (error) {
    return sendApiError(res, { statusCode: 500, message: "Error checking admin role", errorCode: "SERVER_ERROR" }, "Error checking admin role");
  }
};