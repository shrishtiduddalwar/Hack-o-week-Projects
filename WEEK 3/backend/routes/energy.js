const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const EnergyRecord = require("../models/EnergyRecord");

const ML_SCRIPT = path.resolve(__dirname, "../../ml/predictor.py");
const FORECAST_JSON = path.resolve(__dirname, "../../ml/forecast.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run the Python predictor and return the parsed forecast payload.
 * @param {boolean} examMode
 */
function runPredictor(examMode = false) {
  const flag = examMode ? "--exam-mode" : "";
  try {
    const output = execSync(`python "${ML_SCRIPT}" ${flag}`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return JSON.parse(output);
  } catch (err) {
    // Fall back to cached forecast.json if Python unavailable
    if (fs.existsSync(FORECAST_JSON)) {
      return JSON.parse(fs.readFileSync(FORECAST_JSON, "utf-8"));
    }
    throw new Error(`ML predictor failed: ${err.message}`);
  }
}

/**
 * Seed the DB with the latest forecast records.
 */
async function seedForecastRecords(forecastPayload) {
  const ops = forecastPayload.forecast.map((day) => ({
    updateOne: {
      filter: { date: new Date(day.date) },
      update: {
        $set: {
          date: new Date(day.date),
          predicted_kwh: day.predicted_kwh,
          lower_ci: day.lower_ci,
          upper_ci: day.upper_ci,
          intensity: day.intensity,
          exam_mode: day.exam_mode,
          exam_multiplier: day.exam_multiplier,
          day_of_week: day.day_of_week,
          is_forecast: true,
          // For forecast records, actual = predicted initially
          actual_kwh: day.predicted_kwh,
        },
      },
      upsert: true,
    },
  }));

  await EnergyRecord.bulkWrite(ops);
  return forecastPayload.forecast.length;
}

// ---------------------------------------------------------------------------
// GET /api/energy-status
// ---------------------------------------------------------------------------
/**
 * Returns:
 *  - latest actual vs predicted load
 *  - 7-day forecast array
 *  - model metadata
 */
router.get("/", async (req, res) => {
  try {
    const examMode = req.query.exam_mode === "true";

    // Attempt to get latest stored record (actual data)
    const latestActual = await EnergyRecord.findOne({ is_forecast: false })
      .sort({ date: -1 })
      .lean();

    // Get the 7-day forecast records from DB
    let forecastRecords = await EnergyRecord.find({ is_forecast: true })
      .sort({ date: 1 })
      .lean();

    // If no forecast in DB, run predictor and seed
    if (forecastRecords.length === 0) {
      const payload = runPredictor(examMode);
      await seedForecastRecords(payload);
      forecastRecords = await EnergyRecord.find({ is_forecast: true })
        .sort({ date: 1 })
        .lean();
    }

    // Build response
    const now = forecastRecords[0] || {};
    const delta = now.predicted_kwh && now.actual_kwh
      ? ((now.predicted_kwh - now.actual_kwh) / now.actual_kwh * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      exam_mode: examMode,
      current: {
        predicted_kwh: now.predicted_kwh || 0,
        actual_kwh: latestActual?.actual_kwh || now.actual_kwh || 0,
        intensity: now.intensity || 0,
        delta_percent: parseFloat(delta),
      },
      forecast: forecastRecords.map((r) => ({
        date: r.date,
        day_of_week: r.day_of_week,
        predicted_kwh: r.predicted_kwh,
        actual_kwh: r.actual_kwh,
        lower_ci: r.lower_ci,
        upper_ci: r.upper_ci,
        intensity: r.intensity,
        exam_multiplier: r.exam_multiplier,
      })),
    });
  } catch (err) {
    console.error("[GET /api/energy-status]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/energy-status/refresh
// ---------------------------------------------------------------------------
/**
 * Trigger ML re-forecast (with optional exam_mode body flag)
 * and reseed the database.
 */
router.post("/refresh", async (req, res) => {
  try {
    const examMode = req.body?.exam_mode === true;
    console.log(`[POST /refresh] Running predictor | exam_mode=${examMode}`);

    const payload = runPredictor(examMode);
    const count = await seedForecastRecords(payload);

    res.json({
      success: true,
      message: `Forecast refreshed. ${count} records seeded.`,
      model: payload.model,
      aic: payload.aic,
      exam_mode: examMode,
      generated_at: payload.generated_at,
    });
  } catch (err) {
    console.error("[POST /refresh]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/energy-status/seed
// ---------------------------------------------------------------------------
/**
 * Seed historical actual data from CSV into MongoDB.
 */
router.post("/seed", async (req, res) => {
  try {
    const csvPath = path.resolve(__dirname, "../../ml/data/library_energy.csv");
    const lines = fs.readFileSync(csvPath, "utf-8").split("\n").filter(Boolean);
    const headers = lines[0].split(",");

    const ops = lines.slice(1).map((line) => {
      const [date, actual_kwh] = line.split(",");
      return {
        updateOne: {
          filter: { date: new Date(date.trim()) },
          update: {
            $set: {
              date: new Date(date.trim()),
              actual_kwh: parseFloat(actual_kwh),
              predicted_kwh: parseFloat(actual_kwh),
              is_forecast: false,
              intensity: parseFloat(actual_kwh) / 400,
            },
          },
          upsert: true,
        },
      };
    });

    await EnergyRecord.bulkWrite(ops);

    res.json({
      success: true,
      message: `Seeded ${ops.length} historical records.`,
    });
  } catch (err) {
    console.error("[POST /seed]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
