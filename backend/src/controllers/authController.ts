import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import User from "../models/User";
import { getFirebaseAdmin } from "../config/firebase";
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

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw { statusCode: 400, message: "Firebase token is required" };
    }

    const firebaseAdmin = getFirebaseAdmin();
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    const email = decoded.email;

    if (!email) {
      throw { statusCode: 401, message: "Invalid token" };
    }

    let user = await User.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash(decoded.uid, 10);
      user = await User.create({
        email,
        password: hashedPassword,
        role: "user",
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      user: { _id: user._id, email: user.email, role: user.role },
      token: jwtToken,
    });
  } catch (error: any) {
    sendApiError(res, error, "Invalid Google token");
  }
};