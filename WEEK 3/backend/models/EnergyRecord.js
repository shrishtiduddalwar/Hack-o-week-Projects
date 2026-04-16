const mongoose = require("mongoose");

const energyRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    actual_kwh: {
      type: Number,
      required: true,
      min: 0,
    },
    predicted_kwh: {
      type: Number,
      required: true,
      min: 0,
    },
    lower_ci: {
      type: Number,
      default: null,
    },
    upper_ci: {
      type: Number,
      default: null,
    },
    intensity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    exam_mode: {
      type: Boolean,
      default: false,
    },
    exam_multiplier: {
      type: Number,
      default: 1.0,
    },
    is_forecast: {
      type: Boolean,
      default: false,
    },
    day_of_week: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EnergyRecord", energyRecordSchema);
