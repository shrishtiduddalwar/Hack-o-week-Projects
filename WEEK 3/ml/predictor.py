#!/usr/bin/env python3
"""
Library Exam-Phase Energy Predictor
====================================
Uses Holt-Winters Exponential Smoothing (statsmodels) to forecast
library energy consumption for the final week of the semester.

Usage:
    python predictor.py                  # Normal mode
    python predictor.py --exam-mode      # High-sensitivity exam mode

Output:
    Prints JSON forecast to stdout and writes to ml/forecast.json
"""

import argparse
import json
import sys
import warnings
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
CSV_PATH = DATA_DIR / "library_energy.csv"
SCHEDULE_PATH = DATA_DIR / "exam_schedule.json"
OUTPUT_PATH = Path(__file__).parent / "forecast.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_data(csv_path: Path) -> pd.Series:
    """Load and return a daily kWh time series."""
    df = pd.read_csv(csv_path, parse_dates=["date"])
    df = df.sort_values("date").set_index("date")
    series = df["actual_kwh"].asfreq("D")
    # Fill any gaps with interpolation
    series = series.interpolate(method="time")
    return series


def load_schedule(schedule_path: Path) -> dict:
    """Load the exam schedule JSON."""
    with open(schedule_path, "r") as f:
        return json.load(f)


def get_exam_multiplier(date: datetime, schedule: dict, exam_mode: bool) -> float:
    """Return the intensity multiplier for a given date."""
    date_str = date.strftime("%Y-%m-%d")
    for period in schedule["exam_periods"] + [schedule["forecast_target"]]:
        start = period["start_date"]
        end = period["end_date"]
        if start <= date_str <= end:
            mult = period["intensity_multiplier"]
            # In exam mode, amplify sensitivity by an extra 15%
            return mult * 1.15 if exam_mode else mult
    return 1.0


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def fit_model(series: pd.Series, exam_mode: bool) -> ExponentialSmoothing:
    """
    Fit a Holt-Winters Exponential Smoothing model.

    - trend='add'          : additive trend (energy consumption rises over semester)
    - seasonal='add'       : additive seasonality (weekly cycle Sat/Sun dip)
    - seasonal_periods=7   : weekly period
    - In exam_mode: use a higher smoothing_level (alpha) for sharper response
    """
    model = ExponentialSmoothing(
        series,
        trend="add",
        seasonal="add",
        seasonal_periods=7,
        initialization_method="estimated",
    )
    # Control smoothing level alpha via optimizer bounds in exam mode
    fit_kwargs = {}
    if exam_mode:
        # Force alpha towards higher sensitivity (0.6–0.9 range)
        fit_kwargs["smoothing_level"] = 0.75
        fit_kwargs["optimized"] = False
    else:
        fit_kwargs["optimized"] = True

    fitted = model.fit(**fit_kwargs)
    return fitted


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

def generate_forecast(
    fitted,
    schedule: dict,
    exam_mode: bool,
    horizon: int = 7,
) -> list[dict]:
    """
    Generate a 7-day forecast starting the day after the last training date.
    Apply exam-phase multipliers and build confidence intervals.
    """
    raw_forecast = fitted.forecast(steps=horizon)
    last_date = fitted.model.endog_dates[-1]
    max_cap = schedule["max_capacity_kwh"]

    # Residual std for ± confidence band (95% CI ≈ ±1.96σ)
    residuals = fitted.resid
    sigma = float(np.std(residuals))
    ci_factor = 1.96

    results = []
    for i, (date, pred) in enumerate(zip(raw_forecast.index, raw_forecast.values)):
        multiplier = get_exam_multiplier(date.to_pydatetime(), schedule, exam_mode)
        adjusted = float(pred) * multiplier
        adjusted = max(0, min(adjusted, max_cap))

        lower = max(0, adjusted - ci_factor * sigma)
        upper = min(max_cap, adjusted + ci_factor * sigma)
        intensity = adjusted / max_cap  # 0.0–1.0

        results.append({
            "date": date.strftime("%Y-%m-%d"),
            "day_of_week": date.strftime("%A"),
            "predicted_kwh": round(adjusted, 2),
            "lower_ci": round(lower, 2),
            "upper_ci": round(upper, 2),
            "intensity": round(intensity, 4),
            "exam_multiplier": multiplier,
            "exam_mode": exam_mode,
        })

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Library Exam-Phase Energy Predictor (Holt-Winters)"
    )
    parser.add_argument(
        "--exam-mode",
        action="store_true",
        default=False,
        help="Enable high-sensitivity exam-phase forecasting (raises alpha)",
    )
    parser.add_argument(
        "--horizon",
        type=int,
        default=7,
        help="Number of days to forecast (default: 7)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(OUTPUT_PATH),
        help="Path to write forecast JSON output",
    )
    args = parser.parse_args()

    print(f"{'='*60}", file=sys.stderr)
    print(f"  Library Energy Predictor", file=sys.stderr)
    print(f"  Mode     : {'EXAM (High Sensitivity)' if args.exam_mode else 'NORMAL'}", file=sys.stderr)
    print(f"  Horizon  : {args.horizon} days", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)

    # 1. Load data
    print("  [1/4] Loading historical energy data...", file=sys.stderr)
    series = load_data(CSV_PATH)
    print(f"        {len(series)} daily records loaded ({series.index[0].date()} → {series.index[-1].date()})", file=sys.stderr)

    # 2. Load exam schedule
    print("  [2/4] Loading exam schedule...", file=sys.stderr)
    schedule = load_schedule(SCHEDULE_PATH)
    print(f"        {len(schedule['exam_periods'])} exam period(s) found", file=sys.stderr)

    # 3. Fit model
    print("  [3/4] Fitting Holt-Winters Exponential Smoothing...", file=sys.stderr)
    fitted = fit_model(series, args.exam_mode)
    aic = fitted.aic
    print(f"        AIC = {aic:.2f} | alpha = {fitted.params.get('smoothing_level', 'auto'):.4f}", file=sys.stderr)

    # 4. Forecast
    print(f"  [4/4] Generating {args.horizon}-day forecast...", file=sys.stderr)
    forecast = generate_forecast(fitted, schedule, args.exam_mode, args.horizon)

    # Build summary payload
    payload = {
        "model": "Holt-Winters Exponential Smoothing",
        "exam_mode": args.exam_mode,
        "aic": round(aic, 2),
        "generated_at": datetime.now().isoformat(),
        "horizon_days": args.horizon,
        "max_capacity_kwh": schedule["max_capacity_kwh"],
        "forecast": forecast,
    }

    # Write to file
    out_path = Path(args.output)
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"\n  ✓ Forecast written to: {out_path}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    # Print JSON to stdout for piping / API consumption
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
