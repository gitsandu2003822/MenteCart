import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const signupService = async (email: string, password: string, role: "admin" | "user" = "user") => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { statusCode: 409, message: "Email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashedPassword, role });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  return { user: { _id: user._id, email: user.email, role: user.role }, token };
};

export const loginService = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw { statusCode: 401, message: "Invalid credentials" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { statusCode: 401, message: "Invalid credentials" };
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  return { user: { _id: user._id, email: user.email, role: user.role }, token };
};
