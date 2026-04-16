require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const energyRoutes = require("./routes/energy");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/libraryenergy";

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/energy-status", energyRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ---------------------------------------------------------------------------
// Database + Server Start
// ---------------------------------------------------------------------------
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    console.warn(`⚠️  MongoDB connection failed: ${err.message}`);
    console.warn("   Server will start without DB – forecast from JSON file.");
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Library Energy Backend running at http://localhost:${PORT}`);
    console.log(`   Health : http://localhost:${PORT}/api/health`);
    console.log(`   Status : http://localhost:${PORT}/api/energy-status`);
    console.log(`   Refresh: POST http://localhost:${PORT}/api/energy-status/refresh`);
    console.log(`   Seed   : POST http://localhost:${PORT}/api/energy-status/seed\n`);
  });
}

startServer();
