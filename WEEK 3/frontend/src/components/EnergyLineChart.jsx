import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: '#64748b', marginBottom: 2 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{Number(p.value).toFixed(1)} kWh</span>
        </div>
      ))}
    </div>
  );
};

export default function EnergyLineChart({ data, examMode, loading }) {
  if (loading) {
    return (
      <div style={{ height: 300, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Loading chart…</span>
      </div>
    );
  }

  if (!data?.length) return (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
      No forecast data
    </div>
  );

  const chartData = data.map(d => ({
    name: d.day_of_week?.slice(0, 3) ?? d.date,
    actual:    d.actual_kwh,
    predicted: d.predicted_kwh,
    ciHigh:    d.upper_ci,
    ciLow:     d.lower_ci,
  }));

  const predictedColor = examMode ? '#b45309' : '#1d4ed8';
  const bandFill       = examMode ? 'rgba(217,119,6,0.08)' : 'rgba(29,78,216,0.07)';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* CI band */}
        <Area type="monotone" dataKey="ciHigh" stroke="none" fill={bandFill} legendType="none" dot={false} activeDot={false} name="Upper CI" />
        <Area type="monotone" dataKey="ciLow"  stroke="none" fill="#ffffff"  legendType="none" dot={false} activeDot={false} name="Lower CI" />

        {/* CI band border lines */}
        <Line type="monotone" dataKey="ciHigh" stroke={predictedColor} strokeWidth={1} strokeOpacity={0.25} dot={false} legendType="none" name="CI High" />
        <Line type="monotone" dataKey="ciLow"  stroke={predictedColor} strokeWidth={1} strokeOpacity={0.25} dot={false} legendType="none" name="CI Low" />

        {/* Actual */}
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />

        {/* Predicted */}
        <Line
          type="monotone"
          dataKey="predicted"
          name="Predicted"
          stroke={predictedColor}
          strokeWidth={2}
          dot={{ r: 3.5, fill: predictedColor, strokeWidth: 0 }}
          activeDot={{ r: 5.5, fill: predictedColor, strokeWidth: 1.5, stroke: '#fff' }}
        />

        {/* 300 kWh warning */}
        <ReferenceLine
          y={300}
          stroke="#ef4444"
          strokeDasharray="4 3"
          strokeOpacity={0.5}
          label={{ value: '300 kWh', position: 'right', fill: '#ef4444', fontSize: 10 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
