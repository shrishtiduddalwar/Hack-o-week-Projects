import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';

const API_BASE = '/api/energy-status';

const MOCK_DATA = {
  exam_mode: false,
  current: {
    predicted_kwh: 312.4,
    actual_kwh: 287.8,
    intensity: 0.781,
    delta_percent: 8.55,
  },
  forecast: [
    { date: '2025-12-01', day_of_week: 'Monday',    predicted_kwh: 310.2, actual_kwh: 287.8, lower_ci: 276.4, upper_ci: 344.0, intensity: 0.776, exam_multiplier: 1.65 },
    { date: '2025-12-02', day_of_week: 'Tuesday',   predicted_kwh: 318.7, actual_kwh: 295.1, lower_ci: 284.9, upper_ci: 352.5, intensity: 0.797, exam_multiplier: 1.65 },
    { date: '2025-12-03', day_of_week: 'Wednesday', predicted_kwh: 325.4, actual_kwh: 301.6, lower_ci: 291.6, upper_ci: 359.2, intensity: 0.814, exam_multiplier: 1.65 },
    { date: '2025-12-04', day_of_week: 'Thursday',  predicted_kwh: 331.9, actual_kwh: 308.4, lower_ci: 298.1, upper_ci: 365.7, intensity: 0.830, exam_multiplier: 1.65 },
    { date: '2025-12-05', day_of_week: 'Friday',    predicted_kwh: 338.6, actual_kwh: 315.2, lower_ci: 304.8, upper_ci: 372.4, intensity: 0.847, exam_multiplier: 1.65 },
    { date: '2025-12-06', day_of_week: 'Saturday',  predicted_kwh: 198.4, actual_kwh: 182.1, lower_ci: 164.6, upper_ci: 232.2, intensity: 0.496, exam_multiplier: 1.65 },
    { date: '2025-12-07', day_of_week: 'Sunday',    predicted_kwh: 185.3, actual_kwh: 171.9, lower_ci: 151.5, upper_ci: 219.1, intensity: 0.463, exam_multiplier: 1.65 },
  ],
};

export default function App() {
  const [data, setData] = useState(null);
  const [examMode, setExamMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const fetchStatus = useCallback(async (isExam) => {
    try {
      const res = await axios.get(`${API_BASE}?exam_mode=${isExam}`, { timeout: 5000 });
      setData(res.data);
      setUsingMock(false);
    } catch {
      const mockWithMode = {
        ...MOCK_DATA,
        exam_mode: isExam,
        current: {
          ...MOCK_DATA.current,
          predicted_kwh: isExam ? +(MOCK_DATA.current.predicted_kwh * 1.15).toFixed(1) : MOCK_DATA.current.predicted_kwh,
          intensity: isExam ? Math.min(1, +(MOCK_DATA.current.intensity * 1.15).toFixed(4)) : MOCK_DATA.current.intensity,
        },
        forecast: MOCK_DATA.forecast.map(d => ({
          ...d,
          predicted_kwh: isExam ? +(d.predicted_kwh * 1.15).toFixed(1) : d.predicted_kwh,
          intensity: isExam ? Math.min(1, +(d.intensity * 1.15).toFixed(4)) : d.intensity,
        })),
      };
      setData(mockWithMode);
      setUsingMock(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStatus(false).finally(() => setLoading(false));
  }, []);

  const handleToggleExamMode = async () => {
    const newMode = !examMode;
    setExamMode(newMode);
    setRefreshing(true);
    try {
      await axios.post(`${API_BASE}/refresh`, { exam_mode: newMode }, { timeout: 15000 });
    } catch { /* silent */ }
    await fetchStatus(newMode);
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Dashboard
        data={data}
        loading={loading}
        refreshing={refreshing}
        examMode={examMode}
        usingMock={usingMock}
        onToggleExamMode={handleToggleExamMode}
      />
    </div>
  );
}
