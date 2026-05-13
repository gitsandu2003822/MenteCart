import { Response } from "express";

type ApiErrorLike = {
  statusCode?: number;
  message?: string;
  errorCode?: string;
};

export const sendApiError = (res: Response, error: unknown, fallbackMessage: string) => {
  const apiError = error as ApiErrorLike;
  const statusCode = apiError.statusCode ?? 500;

  return res.status(statusCode).json({
    statusCode,
    message: apiError.message ?? fallbackMessage,
    ...(apiError.errorCode ? { errorCode: apiError.errorCode } : {})
  });
};
