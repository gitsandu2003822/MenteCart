import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "MenteCart API Running 🚀" });
});

export default app;