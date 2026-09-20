// app.ts

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes";
import kitRoutes from "./routes/kitRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();


const allowedOrigins = [
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);




app.use(express.json({ limit: "1mb" }));

app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "AI Interview Prep Kit API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/kits", kitRoutes);

app.use(errorHandler);

export default app;