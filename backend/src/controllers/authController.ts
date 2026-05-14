import { Request, Response } from "express";
import { signupService, loginService } from "../services/authService";
import { sendApiError } from "../utils/sendApiError";

// SIGNUP
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    const result = await signupService(email, password, role);
    res.status(201).json(result);
  } catch (error: any) {
    sendApiError(res, error, "Server error");
  }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    res.status(200).json(result);
  } catch (error: any) {
    sendApiError(res, error, "Server error");
  }
};

export const me = (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
};