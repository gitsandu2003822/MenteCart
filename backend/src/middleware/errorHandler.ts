import { NextFunction, Request, Response } from "express";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: "ROUTE_NOT_FOUND"
  });
};

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = error?.statusCode ?? 500;

  res.status(statusCode).json({
    statusCode,
    message: error?.message ?? "Internal server error",
    ...(error?.errorCode ? { errorCode: error.errorCode } : {})
  });
};
