import React from 'react';
import GaugeChart from 'react-gauge-chart';

export default function EnergyGauge({ intensity, examMode }) {
  const percent = Math.max(0, Math.min(1, intensity));

  return (
    <GaugeChart
      id="energy-intensity-gauge"
      nrOfLevels={20}
      arcsLength={[0.35, 0.35, 0.30]}
      colors={['#22c55e', '#f59e0b', '#ef4444']}
      percent={percent}
      arcPadding={0.02}
      arcWidth={0.25}
      needleColor="#64748b"
      needleBaseColor="#475569"
      textColor="transparent"
      animate={false}
      style={{ width: '100%', maxWidth: 240, margin: '0 auto' }}
    />
  );
}
