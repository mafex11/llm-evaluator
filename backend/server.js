import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config.js";
import router from "./routes.js";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/", router);

// WebSocket
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
});

export const emitEvaluationUpdate = (data) => {
  io.emit("newEvaluation", data);
};

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));