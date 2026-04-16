<<<<<<< HEAD
# 📚 Library Exam-Phase Energy Predictor

A full-stack application that forecasts library energy consumption during exam periods using **Holt-Winters Exponential Smoothing**.

---

## Project Structure

```
week3/
├── ml/                        # Python ML forecasting script
│   ├── predictor.py           # Holt-Winters model (statsmodels)
│   ├── requirements.txt
│   └── data/
│       ├── library_energy.csv # Historical daily kWh data (90 days)
│       └── exam_schedule.json # Exam period definitions & multipliers
│
├── backend/                   # Node.js / Express API
│   ├── server.js              # Express app + MongoDB connection
│   ├── models/EnergyRecord.js # Mongoose schema
│   ├── routes/energy.js       # /api/energy-status endpoints
│   ├── package.json
│   └── .env.example
│
└── frontend/                  # React + Vite dashboard
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Dashboard.jsx      # Main layout & KPI cards
    │   │   ├── EnergyGauge.jsx    # react-gauge-chart wrapper
    │   │   ├── EnergyLineChart.jsx # recharts forecast chart
    │   │   └── ExamModeToggle.jsx # Exam mode button
    │   └── index.css
    └── package.json
```

---

## Tech Stack

| Layer    | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| ML Model | Python · statsmodels · Holt-Winters Exponential Smoothing     |
| Backend  | Node.js · Express 4 · MongoDB · Mongoose                      |
| Frontend | React 18 · Vite · Tailwind CSS · recharts · react-gauge-chart |

---

## Features

- **Holt-Winters Exponential Smoothing** with weekly seasonality (period = 7)
- **Exam-Mode toggle** — boosts the smoothing coefficient (α = 0.75) and applies an intensity multiplier (×1.65) for the finals week forecast
- **95% Confidence Interval** band on the forecast chart
- **Gauge chart** showing real-time energy intensity (0–100% of 400 kWh capacity)
- **Forecast table** with per-day predicted vs actual kWh and intensity bars
- **Mock data fallback** — frontend works standalone without a running backend

---

## Setup & Running

### 1 · Python ML Script

```bash
cd ml
pip install -r requirements.txt

# Normal mode forecast
python predictor.py

# Exam-mode (higher sensitivity, α = 0.75)
python predictor.py --exam-mode
```

Output is printed as JSON and saved to `ml/forecast.json`.

### 2 · Backend

```bash
cd backend
cp .env.example .env          # edit MONGO_URI if needed
npm install
node server.js                 # runs on http://localhost:5000
```

**API Endpoints**

| Method | Path                         | Description                               |
| ------ | ---------------------------- | ----------------------------------------- |
| GET    | `/api/energy-status`         | Predicted vs actual load + 7-day forecast |
| POST   | `/api/energy-status/refresh` | Re-run ML script, reseed DB               |
| POST   | `/api/energy-status/seed`    | Seed historical CSV into MongoDB          |
| GET    | `/api/health`                | Server + DB health check                  |

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev                    # runs on http://localhost:5173
```

> The frontend proxies `/api/*` to `localhost:5000`. If the backend is offline, demo data is shown automatically.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/libraryenergy
PORT=5000
```
=======
# Hack-O-Week
Hack-o-Week Projects by Team Members: Himangi Chatterjee, Dhruv Joshi, and Parth Chaudhari.
>>>>>>> f769b944e9b56044dc67b92a64919ec8a9350044
