import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config.js";
import router from "./routes.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from 'redis';

dotenv.config();
const app = express();
const server = createServer(app);

// Fix CORS configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Add API prefix to all routes
app.use("/api", router);

// Enhanced CORS config
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Connect to Redis
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', err => console.error('Redis Client Error', err));
await redisClient.connect();

// WebSocket setup remains the same
io.on("connection", (socket) => {
  console.log("🟢 Client connected");
  socket.on("disconnect", () => console.log("🔴 Client disconnected"));
});

export const emitEvaluationUpdate = (data) => {
  io.emit("newEvaluation", data);
};

// Start server on port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));