import React from 'react';
import EnergyGauge from './EnergyGauge';
import EnergyLineChart from './EnergyLineChart';
import ExamModeToggle from './ExamModeToggle';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, note, noteColor }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-800">{value ?? '—'}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {note && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: noteColor ?? '#64748b' }}>{note}</p>
      )}
    </div>
  );
}

// ── Intensity badge ───────────────────────────────────────────────────────────
function intensityMeta(v) {
  if (v < 0.4)  return { label: 'Low',      cls: 'badge-green', bar: '#22c55e' };
  if (v < 0.65) return { label: 'Moderate', cls: 'badge-blue',  bar: '#3b82f6' };
  if (v < 0.85) return { label: 'High',     cls: 'badge-amber', bar: '#f59e0b' };
  return         { label: 'Critical',       cls: 'badge-red',   bar: '#ef4444' };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ data, loading, refreshing, examMode, usingMock, onToggleExamMode }) {
  const current  = data?.current  ?? {};
  const forecast = data?.forecast ?? [];
  const intensity = current.intensity ?? 0;
  const meta = intensityMeta(intensity);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-slate-800">Library Energy Monitor</span>
            {usingMock && (
              <span className="badge badge-gray">Demo data</span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Holt-Winters Exponential Smoothing · Finals Week Forecast · {examMode ? 'Exam Mode' : 'Normal Mode'}
          </p>
        </div>
        <ExamModeToggle
          examMode={examMode}
          refreshing={refreshing}
          onToggle={onToggleExamMode}
        />
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Predicted Load"
          value={loading ? null : current.predicted_kwh?.toFixed(1)}
          unit="kWh"
          note={examMode ? 'Exam sensitivity active' : 'Normal model'}
          noteColor={examMode ? '#92400e' : '#1d4ed8'}
        />
        <KpiCard
          label="Actual Load"
          value={loading ? null : current.actual_kwh?.toFixed(1)}
          unit="kWh"
          note="Last recorded reading"
        />
        <KpiCard
          label="Forecast Delta"
          value={loading ? null : `${current.delta_percent >= 0 ? '+' : ''}${current.delta_percent?.toFixed(1)}`}
          unit="%"
          note={current.delta_percent > 0 ? 'Predicted exceeds actual' : 'Actual exceeds predicted'}
          noteColor={current.delta_percent > 0 ? '#b45309' : '#15803d'}
        />
        <KpiCard
          label="Capacity Used"
          value={loading ? null : `${(intensity * 100).toFixed(1)}`}
          unit="%"
          note={meta.label + ' load'}
          noteColor={meta.bar}
        />
      </div>

      {/* ── Body: Gauge + Chart ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Gauge panel */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Energy Intensity</h2>
            <span className={`badge ${meta.cls}`}>{meta.label}</span>
          </div>

          <EnergyGauge
            intensity={loading ? 0 : intensity}
            examMode={examMode}
          />

          <div className="text-center -mt-2">
            <p className="text-2xl font-bold text-slate-800">
              {loading ? '—' : `${(intensity * 100).toFixed(1)}%`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">of 400 kWh capacity</p>
          </div>

          {/* Model info table */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Algorithm</span>
              <span className="font-medium">Holt-Winters ES</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Alpha (α)</span>
              <span className="font-medium">{examMode ? '0.75 (fixed)' : 'auto-optimised'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Exam multiplier</span>
              <span className="font-medium">×{forecast[0]?.exam_multiplier?.toFixed(2) ?? '1.65'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="text-slate-400">Seasonality</span>
              <span className="font-medium">Weekly (7-day)</span>
            </div>
          </div>
        </div>

        {/* Line chart panel */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">7-Day Forecast Trend</h2>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 border-t-2" style={{ borderColor: examMode ? '#b45309' : '#1d4ed8' }} />
                Predicted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-3 rounded" style={{ background: examMode ? '#fef3c7' : '#dbeafe' }} />
                95% CI
              </span>
            </div>
          </div>
          <EnergyLineChart data={forecast} examMode={examMode} loading={loading} />
        </div>
      </div>

      {/* ── Forecast Breakdown Table ──────────────────────────────────── */}
      <div className="card overflow-x-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Forecast Breakdown</h2>
        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading forecast data…</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Day</th>
                <th className="text-right">Predicted (kWh)</th>
                <th className="text-right">Actual (kWh)</th>
                <th className="text-right">Intensity</th>
                <th className="text-right">95% CI</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((row, i) => {
                const m = intensityMeta(row.intensity);
                return (
                  <tr key={i}>
                    <td className="font-mono text-xs text-slate-500">{row.date}</td>
                    <td className="font-medium text-slate-700">{row.day_of_week}</td>
                    <td className="text-right font-semibold text-slate-800">
                      {row.predicted_kwh?.toFixed(1)}
                    </td>
                    <td className="text-right text-slate-600">
                      {row.actual_kwh?.toFixed(1)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="intensity-bar-track">
                          <div
                            className="intensity-bar-fill"
                            style={{ width: `${(row.intensity * 100).toFixed(0)}%`, background: m.bar }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-10 text-right">
                          {(row.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right font-mono text-xs text-slate-400">
                      {row.lower_ci?.toFixed(0)}–{row.upper_ci?.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 mt-6">
        Library Energy Predictor · Node.js + MongoDB + Python (statsmodels) + React
      </p>
    </div>
  );
}
