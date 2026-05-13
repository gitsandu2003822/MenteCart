import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import cartRoutes from "./routes/cartRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/auth", authRoutes);
app.use("/services", serviceRoutes);
app.use("/cart", cartRoutes);
app.use("/bookings", bookingRoutes);


app.get("/", (req, res) => {
  res.json({ message: "MenteCart API Running 🚀" });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;