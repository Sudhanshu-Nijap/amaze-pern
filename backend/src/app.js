const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const chatRoutes = require("./routes/chat.routes");
const wishlistRoutes = require("./routes/wishlist.routes");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/wishlists", wishlistRoutes);

// Basic health check route
app.get("/api/status", (req, res) => {
  res.json({ status: "OK", message: "Amaze Backend Running" });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

module.exports = app;
