#!/usr/bin/env bash
set -e

ROOT="smart-helmet-dashboard"

echo "Creating project structure..."
mkdir -p "$ROOT"/backend
mkdir -p "$ROOT"/frontend/src/{components,pages,hooks,utils}

cat > "$ROOT/backend/package.json" <<'EOF'
{
  "name": "smart-helmet-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2"
  }
}
EOF

cat > "$ROOT/backend/server.js" <<'EOF'
import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let latestData = {
  timestamp: new Date().toISOString(),
  esp32Connected: true,
  minerId: "MINER-001",
  location: { lat: 23.2599, lng: 77.4126 },
  sensors: {
    oxygen: 20.8,
    co2: 850,
    co: 8,
    ch4: 0.2,
    h2s: 1.4,
    heartRate: 82,
    temperature: 29.1,
    humidity: 54,
    obstacleDistance: 146
  },
  audio: { mic: true, speaker: true }
};

const alertHistory = [];

function evaluateAlerts(data) {
  const alerts = [];
  const s = data.sensors;

  if (s.oxygen < 19.5) alerts.push({ level: "danger", message: "Low oxygen level" });
  else if (s.oxygen < 20.0) alerts.push({ level: "warning", message: "Oxygen trending low" });

  if (s.co2 > 2000) alerts.push({ level: "danger", message: "High CO2 level" });
  else if (s.co2 > 1500) alerts.push({ level: "warning", message: "CO2 elevated" });

  if (s.co > 35) alerts.push({ level: "danger", message: "CO level critical" });
  else if (s.co > 20) alerts.push({ level: "warning", message: "CO level high" });

  if (s.ch4 > 1.0) alerts.push({ level: "danger", message: "Methane detected" });
  else if (s.ch4 > 0.5) alerts.push({ level: "warning", message: "Methane rising" });

  return alerts;
}

app.get("/api/data", (req, res) => {
  const alerts = evaluateAlerts(latestData);
  res.json({
    ...latestData,
    alerts,
    alertHistory: alertHistory.slice(-100).reverse()
  });
});

app.post("/api/data", (req, res) => {
  const incoming = req.body;
  latestData = {
    ...latestData,
    ...incoming,
    timestamp: new Date().toISOString()
  };

  const alerts = evaluateAlerts(latestData);
  alerts.forEach((a) => {
    alertHistory.push({
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...a
    });
  });

  res.status(200).json({ ok: true, latestData, alerts });
});

app.listen(PORT, () => {
  console.log("Backend running on http://localhost:4000");
});
EOF

# -----------------------------
# Frontend root files
# -----------------------------
cat > "$ROOT/frontend/package.json" <<'EOF'
{
  "name": "smart-helmet-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "chart.js": "^4.4.3",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.9",
    "vite": "^5.4.0"
  }
}
EOF

cat > "$ROOT/frontend/index.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smart Helmet Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > "$ROOT/frontend/postcss.config.js" <<'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
EOF

cat > "$ROOT/frontend/tailwind.config.js" <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1220",
        panel: "#111a2d",
        panelSoft: "#17233b",
        safe: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
        textMain: "#e5ecff",
        textSoft: "#9fb1d1"
      }
    }
  },
  plugins: []
};
EOF

# -----------------------------
# Frontend src files
# -----------------------------
cat > "$ROOT/frontend/src/main.jsx" <<'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

cat > "$ROOT/frontend/src/App.jsx" <<'EOF'
import Dashboard from "./pages/Dashboard";

export default function App() {
  return <Dashboard />;
}
EOF

cat > "$ROOT/frontend/src/index.css" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-bg text-textMain;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}
EOF

cat > "$ROOT/frontend/src/utils/thresholds.js" <<'EOF'
export const THRESHOLDS = {
  oxygen: { warning: 20.0, danger: 19.5, lowIsBad: true },
  co2: { warning: 1500, danger: 2000, lowIsBad: false },
  co: { warning: 20, danger: 35, lowIsBad: false },
  ch4: { warning: 0.5, danger: 1.0, lowIsBad: false },
  heartRate: { warningLow: 55, warningHigh: 110, dangerLow: 45, dangerHigh: 130 }
};
EOF

cat > "$ROOT/frontend/src/utils/status.js" <<'EOF'
import { THRESHOLDS } from "./thresholds";

export function getSensorLevel(key, value) {
  const t = THRESHOLDS[key];
  if (!t) return "safe";

  if (key === "heartRate") {
    if (value < t.dangerLow || value > t.dangerHigh) return "danger";
    if (value < t.warningLow || value > t.warningHigh) return "warning";
    return "safe";
  }

  if (t.lowIsBad) {
    if (value < t.danger) return "danger";
    if (value < t.warning) return "warning";
    return "safe";
  }

  if (value > t.danger) return "danger";
  if (value > t.warning) return "warning";
  return "safe";
}

export function getOverallStatus(data) {
  const checks = [
    getSensorLevel("oxygen", data.sensors.oxygen),
    getSensorLevel("co2", data.sensors.co2),
    getSensorLevel("co", data.sensors.co),
    getSensorLevel("ch4", data.sensors.ch4),
    getSensorLevel("heartRate", data.sensors.heartRate)
  ];
  if (checks.includes("danger")) return "DANGER";
  if (checks.includes("warning")) return "WARNING";
  return "SAFE";
}
EOF

cat > "$ROOT/frontend/src/hooks/useRealtimeData.js" <<'EOF'
import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:4000/api/data";
const MAX_POINTS = 20;

function jitter(value, spread, min = 0) {
  const next = value + (Math.random() * 2 - 1) * spread;
  return Math.max(min, Number(next.toFixed(2)));
}

export default function useRealtimeData() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState({
    labels: [],
    oxygen: [],
    co2: [],
    co: []
  });

  useEffect(() => {
    let timer;

    async function pull() {
      try {
        const res = await fetch(API);
        const json = await res.json();
        setData(json);

        setHistory((prev) => {
          const label = new Date(json.timestamp).toLocaleTimeString();
          const labels = [...prev.labels, label].slice(-MAX_POINTS);
          return {
            labels,
            oxygen: [...prev.oxygen, json.sensors.oxygen].slice(-MAX_POINTS),
            co2: [...prev.co2, json.sensors.co2].slice(-MAX_POINTS),
            co: [...prev.co, json.sensors.co].slice(-MAX_POINTS)
          };
        });
      } catch (e) {
        console.error("Fetch failed", e);
      }
    }

    pull();
    timer = setInterval(pull, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const simulator = setInterval(async () => {
      if (!data) return;
      const payload = {
        sensors: {
          oxygen: jitter(data.sensors.oxygen, 0.2, 18),
          co2: jitter(data.sensors.co2, 80, 350),
          co: jitter(data.sensors.co, 2, 0),
          ch4: jitter(data.sensors.ch4, 0.08, 0),
          h2s: jitter(data.sensors.h2s, 0.2, 0),
          heartRate: jitter(data.sensors.heartRate, 4, 40),
          temperature: jitter(data.sensors.temperature, 0.4, 15),
          humidity: jitter(data.sensors.humidity, 1.2, 20),
          obstacleDistance: jitter(data.sensors.obstacleDistance, 10, 0)
        },
        location: {
          lat: jitter(data.location.lat, 0.0005),
          lng: jitter(data.location.lng, 0.0005)
        },
        audio: {
          mic: Math.random() > 0.03,
          speaker: Math.random() > 0.05
        }
      };

      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }, 2500);

    return () => clearInterval(simulator);
  }, [data]);

  return useMemo(() => ({ data, history }), [data, history]);
}
EOF

cat > "$ROOT/frontend/src/components/Sidebar.jsx" <<'EOF'
const items = ["Overview", "Sensors", "Alerts", "GPS", "Health", "System"];

export default function Sidebar() {
  return (
    <aside className="w-full md:w-64 bg-panel border-r border-slate-800 p-4">
      <h1 className="text-xl font-bold tracking-wide">Smart Helmet</h1>
      <p className="text-textSoft text-sm mt-1">Admin Dashboard</p>
      <nav className="mt-6 space-y-2">
        {items.map((item) => (
          <button
            key={item}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-panelSoft text-textSoft hover:text-textMain transition"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}
EOF

cat > "$ROOT/frontend/src/components/Topbar.jsx" <<'EOF'
export default function Topbar({ status, minerId }) {
  const map = {
    SAFE: "bg-safe/20 text-safe border-safe/40",
    WARNING: "bg-warn/20 text-warn border-warn/40",
    DANGER: "bg-danger/20 text-danger border-danger/40"
  };

  return (
    <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-semibold">Miner Safety Overview</h2>
        <p className="text-textSoft text-sm">{minerId}</p>
      </div>
      <span className={`px-4 py-2 rounded-full border text-sm font-semibold ${map[status]}`}>
        {status}
      </span>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/SensorCard.jsx" <<'EOF'
const colorBy = {
  safe: "border-safe/40",
  warning: "border-warn/40",
  danger: "border-danger/40"
};

export default function SensorCard({ title, value, unit, level }) {
  return (
    <div className={`bg-panel p-4 rounded-xl border ${colorBy[level] || "border-slate-800"} min-h-[108px]`}>
      <p className="text-textSoft text-sm">{title}</p>
      <p className="text-2xl font-semibold mt-2">
        {value} <span className="text-base text-textSoft">{unit}</span>
      </p>
      <p className="text-xs mt-2 uppercase tracking-wide text-textSoft">{level}</p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/GaugeCard.jsx" <<'EOF'
export default function GaugeCard({ label, value, min, max, unit }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="bg-panel p-4 rounded-xl border border-slate-800">
      <p className="text-textSoft text-sm mb-3">{label}</p>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-lime-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xl font-semibold">
        {value} {unit}
      </p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/ChartsPanel.jsx" <<'EOF'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip);

function chartData(labels, data, label, color) {
  return {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        tension: 0.3
      }
    ]
  };
}

const options = {
  responsive: true,
  plugins: {
    legend: { labels: { color: "#e5ecff" } }
  },
  scales: {
    x: { ticks: { color: "#9fb1d1" }, grid: { color: "#1f2b44" } },
    y: { ticks: { color: "#9fb1d1" }, grid: { color: "#1f2b44" } }
  }
};

export default function ChartsPanel({ history }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">CO2 (ppm)</h3>
        <Line data={chartData(history.labels, history.co2, "CO2", "#ef4444")} options={options} />
      </div>
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">Oxygen (%)</h3>
        <Line data={chartData(history.labels, history.oxygen, "O2", "#22c55e")} options={options} />
      </div>
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">CO (ppm)</h3>
        <Line data={chartData(history.labels, history.co, "CO", "#f59e0b")} options={options} />
      </div>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/AlertsPanel.jsx" <<'EOF'
export default function AlertsPanel({ alerts, history }) {
  const classBy = {
    warning: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger"
  };

  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-3">Alerts</h3>
      <div className="space-y-2">
        {alerts?.length ? (
          alerts.map((a, idx) => (
            <div key={idx} className={`p-2 rounded border ${classBy[a.level] || "border-slate-700 text-textMain"}`}>
              {a.message}
            </div>
          ))
        ) : (
          <p className="text-textSoft text-sm">No active alerts</p>
        )}
      </div>

      <h4 className="mt-5 mb-2 text-sm text-textSoft">Alert History</h4>
      <div className="max-h-44 overflow-auto space-y-2">
        {history?.length ? (
          history.map((h) => (
            <div key={h.id} className="text-xs text-textSoft border-b border-slate-800 pb-1">
              <span className="uppercase mr-2">{h.level}</span>
              {h.message} - {new Date(h.timestamp).toLocaleTimeString()}
            </div>
          ))
        ) : (
          <p className="text-xs text-textSoft">No history yet.</p>
        )}
      </div>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/MapView.jsx" <<'EOF'
export default function MapView({ location }) {
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-3">GPS Tracking</h3>
      <div className="h-44 rounded-lg bg-panelSoft grid place-items-center text-textSoft text-sm">
        Map Placeholder (Leaflet/Google Maps can be integrated)
      </div>
      <p className="mt-3 text-sm">
        Lat: <span className="text-textSoft">{location?.lat?.toFixed(6)}</span> | Lng:{" "}
        <span className="text-textSoft">{location?.lng?.toFixed(6)}</span>
      </p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/SystemStatus.jsx" <<'EOF'
export default function SystemStatus({ connected, timestamp }) {
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">System Status</h3>
      <p className="text-sm">
        ESP32: <span className={connected ? "text-safe" : "text-danger"}>{connected ? "Connected" : "Disconnected"}</span>
      </p>
      <p className="text-sm text-textSoft mt-1">Last update: {new Date(timestamp).toLocaleString()}</p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/AudioStatus.jsx" <<'EOF'
export default function AudioStatus({ audio }) {
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">Audio / Communication</h3>
      <p className="text-sm text-textSoft">Microphone: {audio?.mic ? "Online" : "Offline"}</p>
      <p className="text-sm text-textSoft">Speaker: {audio?.speaker ? "Online" : "Offline"}</p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/components/HealthPanel.jsx" <<'EOF'
export default function HealthPanel({ heartRate }) {
  const abnormal = heartRate < 55 || heartRate > 110;
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">Health Monitoring</h3>
      <p className="text-3xl font-semibold">{heartRate} BPM</p>
      <p className={`mt-2 text-sm ${abnormal ? "text-danger" : "text-safe"}`}>
        {abnormal ? "Abnormal" : "Normal"}
      </p>
    </div>
  );
}
EOF

cat > "$ROOT/frontend/src/pages/Dashboard.jsx" <<'EOF'
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import SensorCard from "../components/SensorCard";
import GaugeCard from "../components/GaugeCard";
import ChartsPanel from "../components/ChartsPanel";
import AlertsPanel from "../components/AlertsPanel";
import MapView from "../components/MapView";
import SystemStatus from "../components/SystemStatus";
import AudioStatus from "../components/AudioStatus";
import HealthPanel from "../components/HealthPanel";
import useRealtimeData from "../hooks/useRealtimeData";
import { getOverallStatus, getSensorLevel } from "../utils/status";

export default function Dashboard() {
  const { data, history } = useRealtimeData();

  if (!data) {
    return <div className="min-h-screen bg-bg text-textMain grid place-items-center">Loading dashboard...</div>;
  }

  const s = data.sensors;
  const status = getOverallStatus(data);

  const cards = [
    { title: "Oxygen", value: s.oxygen, unit: "%", key: "oxygen" },
    { title: "CO2", value: s.co2, unit: "ppm", key: "co2" },
    { title: "CO", value: s.co, unit: "ppm", key: "co" },
    { title: "Methane (CH4)", value: s.ch4, unit: "", key: "ch4" },
    { title: "H2S", value: s.h2s, unit: "ppm", key: "h2s" },
    { title: "Temperature", value: s.temperature, unit: "°C", key: "temperature" },
    { title: "Humidity", value: s.humidity, unit: "%", key: "humidity" },
    { title: "Obstacle", value: s.obstacleDistance, unit: "cm", key: "obstacleDistance" }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        <Topbar status={status} minerId={data.minerId} />

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <SensorCard
              key={c.title}
              title={c.title}
              value={c.value}
              unit={c.unit}
              level={getSensorLevel(c.key, c.value)}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <GaugeCard label="Oxygen Gauge" value={s.oxygen} min={16} max={22} unit="%" />
          <GaugeCard label="Heart Rate Gauge" value={s.heartRate} min={40} max={140} unit="BPM" />
          <HealthPanel heartRate={s.heartRate} />
        </section>

        <ChartsPanel history={history} />

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <AlertsPanel alerts={data.alerts} history={data.alertHistory} />
          <MapView location={data.location} />
          <div className="space-y-4">
            <AudioStatus audio={data.audio} />
            <SystemStatus connected={data.esp32Connected} timestamp={data.timestamp} />
          </div>
        </section>
      </main>
    </div>
  );
}
EOF

echo "Done."
echo "Next steps:"
echo "1) cd $ROOT/backend && npm install && npm run dev"
echo "2) cd ../frontend && npm install && npm run dev"