import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        statusCode: 400,
        message: "Validation failed",
        errorCode: "VALIDATION_ERROR",
        details: result.error.flatten()
      });
    }

    req.body = result.data;
    next();
  };
};
