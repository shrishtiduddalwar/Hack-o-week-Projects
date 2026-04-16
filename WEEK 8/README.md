<div align="center">

# 🅿️ ParkLux — Intelligent Parking Lot Lighting Forecast

**Sensor-based vehicle counting · Polynomial Regression · Real-time anomaly detection**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> _Turn raw vehicle sensor data into actionable lighting decisions — saving energy, preventing over-illumination, and flagging anomalies in real time._

</div>

---

## 📸 Overview

ParkLux is a **zero-dependency, browser-based dashboard** that simulates an IoT parking lot monitoring system. It ingests per-zone vehicle counts from sensors (IR, ultrasonic, or MQTT sources), fits a **polynomial regression model**, and predicts the optimal lighting level (lux) for each zone — every 2 seconds, live.

Built entirely in vanilla HTML + CSS + JavaScript with [Chart.js](https://www.chartjs.org/). No build step. No server. Just open `index.html`.

---

## ✨ Features

### 🔬 Machine Learning Core

| Feature                      | Details                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| **Polynomial Regression**    | OLS fit with Gauss-Jordan elimination, degrees 1–6              |
| **⚡ Auto Cross-Validation** | 5-fold CV across all degrees → selects lowest MSE automatically |
| **95% Confidence Intervals** | Prediction bands on the regression chart using residual σ       |
| **R² Score**                 | Reported live alongside the fitted equation                     |

### 🧠 Feature Engineering

| Feature                       | Details                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Time-of-Day Weight**        | Scales expected lux by hour (0.55 at midnight → 1.0 at afternoon peak)               |
| **Day-of-Week Weight**        | 1.0 on weekdays, 0.72 on weekends — lighting adjusts automatically                   |
| **Feature-Weighted Training** | Both weights baked into the regression training data for a more representative model |

### 🛡 Data Quality

| Feature             | Details                                                            |
| ------------------- | ------------------------------------------------------------------ |
| **Zero Imputation** | Detects sensor glitch zeros, replaces with rolling 3-point average |
| **Outlier Capping** | Caps extreme counts at `mean + 2.5σ` before training               |
| **Clean Badge**     | Visual indicator showing how many points were corrected            |

### 🚨 Anomaly Detection

| Feature                         | Details                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| **Dynamic 3σ Threshold**        | Rolling 30-reading buffer per zone; alert fires only when `count > μ + 3σ`  |
| **No False Positives at Night** | Threshold adapts to current traffic baseline — no random spitting of alerts |
| **Toast Notifications**         | Slide-in alerts with zone, vehicle count, and timestamp                     |
| **Anomaly Timeline**            | Scrollable log of last 15 events with zone, count, and time                 |

### 💡 Energy Analytics

| Feature                      | Details                                                  |
| ---------------------------- | -------------------------------------------------------- |
| **Potential Energy Savings** | `(1 − predictedLux / maxLux) × 100%` — live per zone     |
| **Time-of-Day Stat Card**    | Shows the current hour's demand multiplier at a glance   |
| **Lighting Optimization**    | Predicted lux is scaled by ToD weight for finer accuracy |

### 📊 Dashboard UI

- **Live Bar Chart** — vehicle counts + predicted lux for all 5 zones, refreshed every 2 s
- **Regression Scatter** — observed data + fitted curve + ±95% CI band
- **Trend Line** — last 25 ticks of vehicles + predicted lux for the selected zone
- **24-Hour Data Table** — per-hour sensor data with ToD weight column and clean indicators
- **Zone Cards** — quick-glance occupancy bars with anomaly glow
- **6 Stat Cards** — Vehicles · Predicted Lux · Occupancy · Anomalies · Energy Savings · ToD Weight

---

## 🚀 Getting Started

### Zero setup required

```bash
# Clone or download
git clone https://github.com/your-username/parklux.git
cd parklux

# Just open in any modern browser
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

> No `npm install`. No build step. No backend. It runs entirely in-browser.

---

## 🗂 Project Structure

```
week8/
├── index.html       # Dashboard layout & HTML structure
├── style.css        # Premium dark theme, glassmorphism, animations
├── data.js          # Dataset generator, data cleaning, feature weights
├── regression.js    # Polynomial regression engine with CV & CI
└── app.js           # Chart.js wiring, live feed loop, anomaly detection
```

---

## 🧮 How It Works

```
IoT Sensors (IR / Ultrasonic / MQTT)
        │
        ▼
  Vehicle Count  →  cleanSensorData()  →  Cleaned Counts
        │                                       │
        ▼                                       ▼
  timeOfDayWeight()                   PolynomialRegression.fit()
  dayOfWeekWeight()                           │
        │                             crossValidate() → Best Degree
        ▼                                     │
  Feature-Weighted                    predictWithCI() → CI Bands
  Lux Target (Y)                              │
        │                                     ▼
        └──────────────────────→   Predicted Lux + Confidence Interval
                                              │
                                             ▼
                            isAnomalyDynamic()  →  3σ Threshold Alert
                                              │
                                             ▼
                                  Energy Savings = 1 - lux/maxLux
```

---

## 🔧 Configuration

All tuneable constants are at the top of `data.js`:

```js
// Change zone capacities
const ZONE_CAPACITY = {
  'Zone A': 120,   // parking slots
  'Zone B': 90,
  'Zone C': 150,
  'Zone D': 60,
  'Zone E': 100,
};

// Set maximum lux per zone at 100% occupancy
const MAX_LUX = {
  'Zone A': 300,   // lux
  'Zone B': 250,
  ...
};

// Adjust the hourly demand curve (0.0–1.0 multipliers)
const TRAFFIC_PATTERN = [
  0.05, 0.03, ...   // 0h–5h (night)
  0.88, 0.90, ...   // 16h–17h (peak)
];
```

And in `app.js`:

```js
const BUFFER_SIZE = 30; // rolling window size for 3σ anomaly detection (ticks)
```

---

## 🌐 Real-World Data Sources

Want to swap out the simulated data for real sensor feeds?

| Source                 | URL                                                                    | Description                                |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| 🇦🇺 City of Melbourne   | [data.melbourne.vic.gov.au](https://data.melbourne.vic.gov.au/)        | 5,000+ IoT parking bays, live occupancy    |
| 🇬🇧 Birmingham (UCI ML) | [UCI Repo](https://archive.ics.uci.edu/ml/datasets/Parking+Birmingham) | Hourly occupancy from multiple car parks   |
| 🇺🇸 LA Open Data        | [data.lacity.org](https://data.lacity.org/)                            | Parking meter & lot occupancy, LA city     |
| 🛠️ DIY Sensors         | HC-SR04 / IR break-beam → MQTT → InfluxDB                              | Roll your own with Arduino or Raspberry Pi |

To plug in real data, replace `generateZoneHistory()` and `generateLiveReading()` in `data.js` with your API/MQTT source.

---

## 📐 Regression Module API

`regression.js` exposes a clean API you can reuse in any JS project:

```js
// Fit a degree-3 polynomial
const model = new PolynomialRegression(3);
model.fit(xs, ys);

// Predict
model.predict(0.75); // → lux at 75% occupancy
model.predictMany([0.2, 0.5, 0.9]);

// Confidence interval (95%)
model.predictWithCI(0.75, 1.96); // → { pred, lower, upper }

// Model quality
model.r2(xs, ys); // → 0.9812
model.equationString(); // → "45.3 + 120.1·x + -30.4·x^2 + ..."

// Auto-select degree via 5-fold CV
const { bestDegree, scores } = PolynomialRegression.crossValidate(xs, ys, 6, 5);
```

---



---

<div align="center">
  <sub>Built with ❤️ for HackoWeek · Sensor Analytics · Polynomial ML · Energy Efficiency</sub>
</div>
