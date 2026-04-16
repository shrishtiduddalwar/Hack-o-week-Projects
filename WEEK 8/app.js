// ============================================================
// APP.JS  (v2 — Enhanced)
// ============================================================
// Wires up the dashboard with:
//   • Cross-Validation auto degree selection
//   • Dynamic 3-sigma anomaly detection (rolling buffer per zone)
//   • Confidence interval bands on regression chart
//   • Potential Energy Savings metric
//   • Time-of-day feature weights shown in data table
// ============================================================

// ---- Global State ----
let regressionModel = null;
let liveChart       = null;
let regressionChart = null;
let trendChart      = null;
let anomalyLog      = [];
let liveInterval    = null;
let currentZone     = 'Zone A';
let tickCount       = 0;
let cvInProgress    = false;

// Rolling count buffer for dynamic anomaly detection (per zone)
const READING_BUFFER = {};
ZONES.forEach(z => (READING_BUFFER[z] = []));
const BUFFER_SIZE = 30;   // 30 ticks ≈ 60 seconds of history

// ---- DOM Refs ----
const dom = {};
function cacheDom() {
  dom.zoneSelect      = document.getElementById('zone-select');
  dom.liveCanvas      = document.getElementById('live-chart');
  dom.regCanvas       = document.getElementById('regression-chart');
  dom.trendCanvas     = document.getElementById('trend-chart');
  dom.alertContainer  = document.getElementById('alert-container');
  dom.statVehicles    = document.getElementById('stat-vehicles');
  dom.statLux         = document.getElementById('stat-lux');
  dom.statOccupancy   = document.getElementById('stat-occupancy');
  dom.statAnomalies   = document.getElementById('stat-anomalies');
  dom.statSavings     = document.getElementById('stat-savings');
  dom.statTodWeight   = document.getElementById('stat-tod-weight');
  dom.regressionEq    = document.getElementById('regression-eq');
  dom.regressionR2    = document.getElementById('regression-r2');
  dom.regressionCI    = document.getElementById('regression-ci');
  dom.regressionCV    = document.getElementById('regression-cv');
  dom.dataCleanBadge  = document.getElementById('data-clean-badge');
  dom.degreeSlider    = document.getElementById('degree-slider');
  dom.degreeValue     = document.getElementById('degree-value');
  dom.autoDegreeBtn   = document.getElementById('auto-degree-btn');
  dom.simulateBtn     = document.getElementById('simulate-btn');
  dom.resetBtn        = document.getElementById('reset-btn');
  dom.dataTable       = document.getElementById('data-table-body');
  dom.clock           = document.getElementById('clock');
  dom.zoneCards       = document.getElementById('zone-cards');
  dom.alertBadge      = document.getElementById('alert-badge');
  dom.anomalyTimeline = document.getElementById('anomaly-timeline');
}

// ---- Helpers ----
function formatTime(d) {
  return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatHour(h) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr} ${ampm}`;
}

// ---- Clock ----
function tickClock() {
  if (dom.clock) dom.clock.textContent = formatTime(new Date());
}

// ---- Dynamic Anomaly Detection (3-sigma rolling threshold) ----
function updateBuffer(zone, count) {
  const buf = READING_BUFFER[zone];
  buf.push(count);
  if (buf.length > BUFFER_SIZE) buf.shift();
}

function isAnomalyDynamic(zone, count) {
  const buf = READING_BUFFER[zone];
  if (buf.length < 5) return false;   // not enough history yet
  const mean = buf.reduce((a, b) => a + b, 0) / buf.length;
  const std  = Math.sqrt(buf.reduce((s, v) => s + (v - mean) ** 2, 0) / buf.length);
  return count > mean + 3 * std;
}

// ---- Energy Savings ----
function computeEnergySavings(zone, predictedLux) {
  const maxLux = MAX_LUX[zone];
  if (!maxLux || maxLux <= 0) return 0;
  return Math.max(0, ((1 - predictedLux / maxLux) * 100)).toFixed(1);
}

// ---- Train Regression Model ----
function trainModel(degree, rawHistory) {
  const history = rawHistory || generateZoneHistory(currentZone, new Date().getDay());
  const cleaned = cleanSensorData(history);
  const cap     = ZONE_CAPACITY[currentZone];

  const xs = cleaned.map(d => d.vehicleCount / cap);      // occupancy 0-1
  const ys = cleaned.map(d => d.lightLevel);               // lux

  // Count cleaned points
  const cleanedCount = cleaned.filter(d => d._cleaned).length;
  if (dom.dataCleanBadge) {
    dom.dataCleanBadge.textContent = cleanedCount > 0
      ? `🧹 Cleaned ${cleanedCount} point${cleanedCount > 1 ? 's' : ''}`
      : '✅ Clean data';
    dom.dataCleanBadge.className = cleanedCount > 0 ? 'data-clean-badge warn' : 'data-clean-badge ok';
  }

  regressionModel = new PolynomialRegression(degree);
  regressionModel.fit(xs, ys);

  const r2 = regressionModel.r2(xs, ys);
  const ci = (1.96 * regressionModel._residualStd).toFixed(1);

  dom.regressionEq.textContent  = regressionModel.equationString();
  dom.regressionR2.textContent  = r2.toFixed(4);
  if (dom.regressionCI) dom.regressionCI.textContent = `±${ci} lux (95% CI)`;

  renderRegressionChart(xs, ys);
  renderDataTable(cleaned);
}

// ---- Auto Degree Selection via Cross-Validation ----
function autoSelectDegree() {
  if (cvInProgress) return;
  cvInProgress = true;
  dom.autoDegreeBtn.textContent = '⏳ Running CV…';
  dom.autoDegreeBtn.disabled = true;

  // Slight delay so UI updates before heavy computation
  setTimeout(() => {
    try {
      const history = generateZoneHistory(currentZone, new Date().getDay());
      const cleaned = cleanSensorData(history);
      const cap     = ZONE_CAPACITY[currentZone];
      const xs      = cleaned.map(d => d.vehicleCount / cap);
      const ys      = cleaned.map(d => d.lightLevel);

      const { bestDegree, scores } = PolynomialRegression.crossValidate(xs, ys, 6, 5);

      dom.degreeSlider.value      = bestDegree;
      dom.degreeValue.textContent = bestDegree;
      if (dom.regressionCV) {
        const scoreStr = scores.map(s => `d${s.degree}:${s.mse === Infinity ? '∞' : s.mse.toFixed(0)}`).join(' | ');
        dom.regressionCV.textContent = `CV selected degree ${bestDegree} (${scoreStr})`;
      }

      trainModel(bestDegree);
    } catch (e) {
      console.error('CV failed:', e);
    } finally {
      dom.autoDegreeBtn.textContent = '⚡ Auto-CV';
      dom.autoDegreeBtn.disabled    = false;
      cvInProgress = false;
    }
  }, 50);
}

// ---- Charts ----

// 1. Live bar chart — vehicle counts + predicted lux per zone
function initLiveChart() {
  const ctx = dom.liveCanvas.getContext('2d');
  liveChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ZONES,
      datasets: [
        {
          label: 'Vehicle Count',
          data: ZONES.map(() => 0),
          backgroundColor: ZONES.map((_, i) => `hsla(${200 + i * 32}, 85%, 60%, 0.75)`),
          borderColor:     ZONES.map((_, i) => `hsla(${200 + i * 32}, 85%, 45%, 1)`),
          borderWidth: 2, borderRadius: 8,
        },
        {
          label: 'Predicted Light (lux)',
          data: ZONES.map(() => 0),
          backgroundColor: 'hsla(45, 100%, 60%, 0.55)',
          borderColor:     'hsla(45, 100%, 45%, 1)',
          borderWidth: 2, borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#c9d1d9', font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: 'rgba(13,17,23,0.92)', titleColor: '#58a6ff',
          bodyColor: '#c9d1d9', borderColor: '#30363d', borderWidth: 1, cornerRadius: 8,
        },
      },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' }, beginAtZero: true },
      },
      animation: { duration: 600, easing: 'easeInOutCubic' },
    },
  });
}

// 2. Regression scatter + fitted curve + confidence interval band
function renderRegressionChart(xs, ys) {
  if (regressionChart) regressionChart.destroy();
  const ctx = dom.regCanvas.getContext('2d');

  const curveXs = [];
  for (let x = 0; x <= 1.15; x += 0.01) curveXs.push(+x.toFixed(2));

  // Compute CI data
  const ciData = curveXs.map(x => regressionModel.predictWithCI(x, 1.96));
  const curveYs  = ciData.map(c => c.pred);
  const upperYs  = ciData.map(c => c.upper);
  const lowerYs  = ciData.map(c => c.lower);

  regressionChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        // CI upper bound (invisible line, fills down to lower)
        {
          label: '95% CI Band',
          data: curveXs.map((x, i) => ({ x, y: upperYs[i] })),
          type: 'line',
          borderColor: 'transparent',
          backgroundColor: 'hsla(330, 90%, 65%, 0.15)',
          pointRadius: 0,
          fill: '+1',        // fill between this and the next dataset
          tension: 0.4,
          order: 3,
        },
        // CI lower bound
        {
          label: '_ci_lower',
          data: curveXs.map((x, i) => ({ x, y: lowerYs[i] })),
          type: 'line',
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          order: 4,
        },
        // Predicted curve
        {
          label: `Poly Degree ${regressionModel.degree}`,
          data: curveXs.map((x, i) => ({ x, y: curveYs[i] })),
          type: 'line',
          borderColor: 'hsla(330, 100%, 60%, 1)',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          order: 2,
        },
        // Observed scatter points
        {
          label: 'Observed',
          data: xs.map((x, i) => ({ x, y: ys[i] })),
          backgroundColor: 'hsla(210, 100%, 65%, 0.7)',
          borderColor:     'hsla(210, 100%, 50%, 1)',
          pointRadius: 6,
          pointHoverRadius: 9,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#c9d1d9',
            font: { family: 'Inter' },
            filter: item => item.text !== '_ci_lower',   // hide the dummy label
          },
        },
        tooltip: {
          backgroundColor: 'rgba(13,17,23,0.92)', titleColor: '#58a6ff',
          bodyColor: '#c9d1d9', borderColor: '#30363d', borderWidth: 1, cornerRadius: 8,
          filter: item => item.datasetIndex >= 2,       // only show curve & scatter tooltips
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Occupancy (0–1)', color: '#8b949e' },
          ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' }, min: 0, max: 1.2,
        },
        y: {
          title: { display: true, text: 'Light Level (lux)', color: '#8b949e' },
          ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' }, beginAtZero: true,
        },
      },
    },
  });
}

// 3. Trend line chart — last 25 ticks of selected zone
const trendData = { labels: [], vehicles: [], lux: [] };
function initTrendChart() {
  const ctx = dom.trendCanvas.getContext('2d');
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.labels,
      datasets: [
        {
          label: 'Vehicles',
          data: trendData.vehicles,
          borderColor: 'hsla(170, 80%, 55%, 1)',
          backgroundColor: 'hsla(170, 80%, 55%, 0.15)',
          fill: true, tension: 0.45, pointRadius: 3,
          pointBackgroundColor: 'hsla(170, 80%, 55%, 1)',
        },
        {
          label: 'Predicted Lux',
          data: trendData.lux,
          borderColor: 'hsla(45, 100%, 55%, 1)',
          backgroundColor: 'hsla(45, 100%, 55%, 0.10)',
          fill: true, tension: 0.45, pointRadius: 3,
          pointBackgroundColor: 'hsla(45, 100%, 55%, 1)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#c9d1d9', font: { family: 'Inter' } } },
        tooltip: {
          backgroundColor: 'rgba(13,17,23,0.92)', titleColor: '#58a6ff',
          bodyColor: '#c9d1d9', borderColor: '#30363d', borderWidth: 1, cornerRadius: 8,
        },
      },
      scales: {
        x: { ticks: { color: '#8b949e', maxTicksLimit: 10 }, grid: { color: 'rgba(48,54,61,0.4)' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' }, beginAtZero: true },
      },
      animation: { duration: 400 },
    },
  });
}

// ---- Zone Cards ----
function renderZoneCards(readings) {
  dom.zoneCards.innerHTML = '';
  ZONES.forEach(zone => {
    const r   = readings[zone];
    const occ = ((r.vehicleCount / r.capacity) * 100).toFixed(1);
    const isAnom = r.isAnomaly;
    const cls    = isAnom ? 'zone-card anomaly-glow' : 'zone-card';
    const selected = zone === currentZone ? ' selected' : '';

    dom.zoneCards.innerHTML += `
      <div class="${cls}${selected}" data-zone="${zone}" onclick="switchZone('${zone}')">
        <div class="zone-card-header">
          <span class="zone-name">${zone}</span>
          ${isAnom ? '<span class="anomaly-badge">⚠ ANOMALY</span>' : ''}
        </div>
        <div class="zone-stat-grid">
          <div><span class="zone-stat-value">${r.vehicleCount}</span><span class="zone-stat-label">Vehicles</span></div>
          <div><span class="zone-stat-value">${occ}%</span><span class="zone-stat-label">Occupancy</span></div>
          <div><span class="zone-stat-value">${r.capacity}</span><span class="zone-stat-label">Capacity</span></div>
        </div>
        <div class="occ-bar"><div class="occ-fill" style="width:${Math.min(100, occ)}%; background:${occ > 90 ? '#f85149' : occ > 70 ? '#d29922' : '#3fb950'}"></div></div>
      </div>`;
  });
}

// ---- Anomaly Alerts ----
function fireAlert(zone, reading) {
  anomalyLog.unshift({ zone, time: new Date(), count: reading.vehicleCount, capacity: reading.capacity });
  if (anomalyLog.length > 50) anomalyLog.pop();

  dom.alertBadge.textContent    = anomalyLog.length;
  dom.alertBadge.style.display  = 'inline-flex';

  const toast = document.createElement('div');
  toast.className = 'alert-toast';
  toast.innerHTML = `
    <div class="alert-icon">⚠️</div>
    <div class="alert-body">
      <strong>${zone} — Anomaly Detected</strong>
      <span>${reading.vehicleCount} vehicles (cap ${reading.capacity}) · Dynamic 3σ threshold exceeded · ${formatTime(new Date())}</span>
    </div>
    <button class="alert-close" onclick="this.parentElement.remove()">✕</button>`;
  dom.alertContainer.prepend(toast);
  setTimeout(() => toast.classList.add('show'), 30);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 6000);

  renderAnomalyTimeline();
}

function renderAnomalyTimeline() {
  dom.anomalyTimeline.innerHTML = anomalyLog.slice(0, 15).map(a => `
    <div class="timeline-item">
      <span class="tl-dot"></span>
      <span class="tl-zone">${a.zone}</span>
      <span class="tl-detail">${a.count}/${a.capacity} vehicles</span>
      <span class="tl-time">${formatTime(a.time)}</span>
    </div>`).join('');
}

// ---- Data Table ----
function renderDataTable(history) {
  dom.dataTable.innerHTML = history.map(d => {
    const occ       = (d.vehicleCount / ZONE_CAPACITY[currentZone] * 100).toFixed(1);
    const predicted = regressionModel ? Math.round(regressionModel.predict(d.vehicleCount / ZONE_CAPACITY[currentZone])) : '—';
    const todW      = (d.todWeight || timeOfDayWeight(d.hour)).toFixed(2);
    const cleanFlag = d._cleaned ? '<span class="badge-cleaned" title="Cleaned by preprocessor">🧹</span>' : '';
    return `<tr>
      <td>${formatHour(d.hour)}</td>
      <td>${d.vehicleCount}${cleanFlag}</td>
      <td>${occ}%</td>
      <td>${d.lightLevel}</td>
      <td>${predicted}</td>
      <td><span class="tod-pill">${todW}</span></td>
    </tr>`;
  }).join('');
}

// ---- Live Update Loop ----
function liveUpdate() {
  tickCount++;
  const readings = generateLiveReading();

  // Update rolling buffers + apply dynamic anomaly detection
  ZONES.forEach(zone => {
    updateBuffer(zone, readings[zone].vehicleCount);
    readings[zone].isAnomaly = isAnomalyDynamic(zone, readings[zone].vehicleCount);
  });

  const r = readings[currentZone];
  const occ = ((r.vehicleCount / r.capacity) * 100).toFixed(1);
  const predictedLux = regressionModel
    ? Math.max(0, Math.round(regressionModel.predict(r.vehicleCount / r.capacity) * r.todWeight))
    : 0;
  const savings = computeEnergySavings(currentZone, predictedLux);

  // Stats
  dom.statVehicles.textContent  = r.vehicleCount;
  dom.statLux.textContent       = predictedLux + ' lux';
  dom.statOccupancy.textContent = occ + '%';
  dom.statAnomalies.textContent = anomalyLog.length;
  if (dom.statSavings)   dom.statSavings.textContent   = savings + '%';
  if (dom.statTodWeight) dom.statTodWeight.textContent  = r.todWeight.toFixed(2);

  // Live bar chart
  liveChart.data.datasets[0].data = ZONES.map(z => readings[z].vehicleCount);
  liveChart.data.datasets[1].data = ZONES.map(z => {
    if (!regressionModel) return 0;
    return Math.max(0, Math.round(regressionModel.predict(readings[z].vehicleCount / ZONE_CAPACITY[z]) * readings[z].todWeight));
  });
  liveChart.data.datasets[0].backgroundColor = ZONES.map((z, i) =>
    readings[z].isAnomaly ? 'hsla(0, 85%, 55%, 0.8)' : `hsla(${200 + i * 32}, 85%, 60%, 0.75)`
  );
  liveChart.update();

  // Trend
  trendData.labels.push(formatTime(new Date()));
  trendData.vehicles.push(r.vehicleCount);
  trendData.lux.push(predictedLux);
  if (trendData.labels.length > 25) {
    trendData.labels.shift(); trendData.vehicles.shift(); trendData.lux.shift();
  }
  trendChart.update();

  // Zone cards
  renderZoneCards(readings);

  // Anomaly alerts
  ZONES.forEach(z => {
    if (readings[z].isAnomaly) fireAlert(z, readings[z]);
  });
}

// ---- Zone Switch ----
function switchZone(zone) {
  currentZone   = zone;
  dom.zoneSelect.value = zone;
  const label   = document.getElementById('table-zone-label');
  if (label) label.textContent = zone;
  trendData.labels.length = 0; trendData.vehicles.length = 0; trendData.lux.length = 0;
  trainModel(parseInt(dom.degreeSlider.value));
}

// ---- Init ----
function init() {
  cacheDom();
  tickClock();
  setInterval(tickClock, 1000);

  // Zone select
  dom.zoneSelect.addEventListener('change', e => switchZone(e.target.value));

  // Degree slider
  dom.degreeSlider.addEventListener('input', e => {
    dom.degreeValue.textContent = e.target.value;
    trainModel(parseInt(e.target.value));
  });

  // Auto-CV button
  if (dom.autoDegreeBtn) {
    dom.autoDegreeBtn.addEventListener('click', autoSelectDegree);
  }

  // Simulate / Reset
  dom.simulateBtn.addEventListener('click', () => {
    if (liveInterval) return;
    liveInterval = setInterval(liveUpdate, 2000);
    dom.simulateBtn.classList.add('active');
    dom.simulateBtn.innerHTML = '<span class="pulse-dot"></span> Streaming';
  });

  dom.resetBtn.addEventListener('click', () => {
    clearInterval(liveInterval);
    liveInterval = null;
    anomalyLog   = [];
    ZONES.forEach(z => (READING_BUFFER[z] = []));
    trendData.labels.length = 0; trendData.vehicles.length = 0; trendData.lux.length = 0;
    trendChart.update();
    dom.alertBadge.style.display = 'none';
    dom.anomalyTimeline.innerHTML = '';
    dom.simulateBtn.classList.remove('active');
    dom.simulateBtn.innerHTML = '▶ Start Live Feed';
    liveUpdate();
  });

  // Charts
  initLiveChart();
  initTrendChart();

  // First model train
  trainModel(parseInt(dom.degreeSlider.value));

  // Kick off live feed
  liveUpdate();
  liveInterval = setInterval(liveUpdate, 2000);
  dom.simulateBtn.classList.add('active');
  dom.simulateBtn.innerHTML = '<span class="pulse-dot"></span> Streaming';
}

document.addEventListener('DOMContentLoaded', init);