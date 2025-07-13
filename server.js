const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const authRoutes = require("./routes/auth");
const chatPasswordRoutes = require("./routes/chatPasswords");

const app = express();
const server = http.createServer(app); // Use HTTP server for socket.io
const io = new Server(server, {
  cors: { origin: "*" }
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)

  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat-password", chatPasswordRoutes);

// ✅ Serve Frontend
app.use("/", express.static(path.join(__dirname, "YahooLogin")));
app.use("/messenger", express.static(path.join(__dirname, "YahooMessenger")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "YahooLogin", "index.html"));
});

// ✅ Socket.IO: Real-time chat logic
const users = new Map(); // username => Set of socket ids
 // socket.id => username

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

socket.on("register", (username) => {
    if (!users.has(username)) {
      users.set(username, new Set());
    }
    users.get(username).add(socket.id);
    socket.username = username; // Save it for disconnect
    console.log(`✅ ${username} registered on socket ${socket.id}`);
  });
socket.on("send-message", ({ to, message, filename, isImage }) => {
  const sender = socket.username;
  if (!sender) return;

  if (users.has(to)) {
    for (let targetSocketId of users.get(to)) {
      io.to(targetSocketId).emit("receive-message", {
        from: sender,
        message,
        filename,
        isImage
      });
    }
  }
});


 socket.on("disconnect", () => {
    const username = socket.username;
    if (username && users.has(username)) {
      users.get(username).delete(socket.id);
      if (users.get(username).size === 0) {
        users.delete(username);
      }
      console.log(`🔴 ${username} disconnected from socket ${socket.id}`);
    }
  });
});

// ✅ Start Server (now using HTTP server)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

