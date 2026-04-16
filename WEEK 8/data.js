// ============================================================
// DATA MODULE  (v2 — Enhanced)
// ============================================================
// Sensor-Based Vehicle Count Dataset with:
//   • Data Cleaning  — zero/outlier imputation before model training
//   • Time-of-Day weight — adjusts expected demand per hour
//   • Day-of-Week weight — weekday vs. weekend scaling
//   • Extended history fields for feature-aware prediction
// ============================================================

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];

const ZONE_CAPACITY = {
  'Zone A': 120,
  'Zone B': 90,
  'Zone C': 150,
  'Zone D': 60,
  'Zone E': 100,
};

// Typical daily traffic pattern (multiplier per hour 0-23)
const TRAFFIC_PATTERN = [
  0.05, 0.03, 0.02, 0.02, 0.03, 0.08,   // 0-5   (night)
  0.15, 0.35, 0.65, 0.80, 0.85, 0.75,   // 6-11  (morning rush)
  0.70, 0.72, 0.78, 0.82, 0.88, 0.90,   // 12-17 (afternoon peak)
  0.75, 0.55, 0.40, 0.25, 0.15, 0.08,   // 18-23 (evening wind-down)
];

// Max lux for each zone at full capacity
const MAX_LUX = {
  'Zone A': 300,
  'Zone B': 250,
  'Zone C': 350,
  'Zone D': 200,
  'Zone E': 280,
};

// ============================================================
// Feature Engineering Helpers
// ============================================================

/**
 * Time-of-Day weight: returns a 0–1 softness multiplier for lighting.
 * Higher during daytime (less lighting boost needed from artificial light),
 * lower at night (more artificial lighting required).
 * Ranges: night → 0.55 minimum, rush hour → 1.0 peak.
 */
function timeOfDayWeight(hour) {
  // Uses the traffic pattern as a proxy for natural demand;
  // we map it to a [0.55, 1.0] range so we never cut lights entirely.
  const raw = TRAFFIC_PATTERN[hour];
  return 0.55 + 0.45 * raw;
}

/**
 * Day-of-Week weight: weekdays (Mon–Fri) → 1.0, weekends → 0.72.
 * @param {number} dayIndex – 0=Sunday, 1=Monday … 6=Saturday
 */
function dayOfWeekWeight(dayIndex) {
  return (dayIndex === 0 || dayIndex === 6) ? 0.72 : 1.0;
}

// ============================================================
// Data Cleaning
// ============================================================

/**
 * Clean an array of { vehicleCount, … } records.
 * Handles:
 *   1. Zero readings  — sensor glitch (replace with rolling 3-point average)
 *   2. Extreme outliers — count > mean + 2.5σ (cap at that threshold)
 *
 * @param {Array<{vehicleCount: number, [key: string]: any}>} data
 * @returns {Array} cleaned copy — original array is NOT mutated
 */
function cleanSensorData(data) {
  const counts = data.map(d => d.vehicleCount);

  // --- Compute mean & std dev ---
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const std  = Math.sqrt(counts.reduce((s, v) => s + (v - mean) ** 2, 0) / counts.length);
  const upperCap = mean + 2.5 * std;

  // --- Rolling 3-point average (used to fill zeros) ---
  function rollingAvg(arr, i) {
    const neighbors = [];
    for (let k = Math.max(0, i - 2); k <= Math.min(arr.length - 1, i + 2); k++) {
      if (k !== i && arr[k] > 0) neighbors.push(arr[k]);
    }
    return neighbors.length ? Math.round(neighbors.reduce((a, b) => a + b, 0) / neighbors.length) : Math.round(mean);
  }

  let cleaned = 0;
  const result = data.map((d, i) => {
    let count = d.vehicleCount;
    let flag = false;

    // Fix zero (glitch detection)
    if (count === 0) {
      count = rollingAvg(counts, i);
      flag = true;
      cleaned++;
    }

    // Cap extreme outliers (but do NOT mark them as anomalies — anomaly detection is dynamic)
    if (count > upperCap) {
      count = Math.round(upperCap);
      flag = true;
      cleaned++;
    }

    return { ...d, vehicleCount: count, _cleaned: flag };
  });

  if (cleaned > 0) {
    console.info(`[DataCleaner] Fixed ${cleaned} sensor readings (zeros/outliers).`);
  }
  return result;
}

// ============================================================
// Dataset Generators
// ============================================================

/**
 * Generate a full 24-hour historical dataset for a given zone.
 * Applies time-of-day and day-of-week feature weights to lux values.
 * Returns: { hour, dayOfWeek, vehicleCount, lightLevel, todWeight, dowWeight }
 *
 * Note: 'isAnomaly' is NOT set here — anomaly detection is now done
 * dynamically in app.js using a rolling 3σ threshold.
 */
function generateZoneHistory(zone, dayOfWeek = 1) {
  const cap    = ZONE_CAPACITY[zone];
  const maxLux = MAX_LUX[zone];
  const dow    = dayOfWeekWeight(dayOfWeek);
  const data   = [];

  for (let h = 0; h < 24; h++) {
    const tod  = timeOfDayWeight(h);
    const base = Math.round(cap * TRAFFIC_PATTERN[h] * dow);
    const noise = Math.round((Math.random() - 0.5) * cap * 0.08);
    const count = Math.max(0, Math.min(cap, base + noise));

    // Feature-weighted lux: base polynomial relationship scaled by time & day weights
    const occ      = count / cap;
    const idealLux = Math.round(maxLux * tod * dow * (0.15 + 0.85 * occ));

    data.push({
      hour:        h,
      dayOfWeek:   dayOfWeek,
      vehicleCount: count,
      lightLevel:  idealLux,
      todWeight:   tod,
      dowWeight:   dow,
    });
  }

  return data;
}

/**
 * Generate current "live" sensor reading for all zones.
 * Sets vehicleCount and capacity; anomaly detection is handled externally.
 */
function generateLiveReading() {
  const now  = new Date();
  const hour = now.getHours();
  const dow  = now.getDay();
  const readings = {};

  ZONES.forEach(zone => {
    const cap  = ZONE_CAPACITY[zone];
    const dowW = dayOfWeekWeight(dow);
    const base = Math.round(cap * TRAFFIC_PATTERN[hour] * dowW);
    const noise = Math.round((Math.random() - 0.5) * cap * 0.12);
    const count = Math.max(0, Math.min(cap + 10, base + noise));

    readings[zone] = {
      vehicleCount: count,
      capacity:     cap,
      todWeight:    timeOfDayWeight(hour),
      dowWeight:    dowW,
    };
  });

  return readings;
}

/**
 * Generate a week's worth of hourly data (for model training or export).
 * Includes day-of-week dimension.
 */
function generateWeeklyDataset() {
  const rows = [];
  for (let d = 0; d < 7; d++) {
    ZONES.forEach(zone => {
      const history = generateZoneHistory(zone, d);
      history.forEach(h => {
        rows.push({
          day:          d,
          hour:         h.hour,
          zone,
          vehicleCount: h.vehicleCount,
          lightLevel:   h.lightLevel,
          todWeight:    h.todWeight,
          dowWeight:    h.dowWeight,
        });
      });
    });
  }
  return rows;
}