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
const Message = require("./models/message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat-password", chatPasswordRoutes);

// ✅ Static Frontend
app.use("/", express.static(path.join(__dirname, "YahooLogin")));
app.use("/messenger", express.static(path.join(__dirname, "YahooMessenger")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "YahooLogin", "index.html"));
});

// ✅ Socket.IO Real-time Chat Logic
const users = new Map(); // username => Set of socket IDs

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("register", (username) => {
    if (!users.has(username)) {
      users.set(username, new Set());
    }
    users.get(username).add(socket.id);
    socket.username = username;
    console.log(`✅ ${username} registered on socket ${socket.id}`);
  });

  socket.on("send-message", async ({ to, message, filename, isImage }) => {
    const sender = socket.username;
    if (!sender) return;

    // ✅ Save message to MongoDB
    const newMessage = new Message({
      sender,
      receiver: to,
      message
    });
    await newMessage.save();

    // ✅ Emit to recipient(s)
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

// ✅ API to Get Chat History Between Two Users
app.get("/api/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("❌ Failed to fetch messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
