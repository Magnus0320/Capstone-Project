import { useState } from "react";
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

export default function Dashboard({ onOpenRescue }) {
  const { data, history, loading, error, stale } = useRealtimeData();
  const [activeSection, setActiveSection] = useState("overview");

  if (loading && !data) {
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
    { title: "Temperature", value: s.temperature, unit: "C", key: "temperature" },
    { title: "Humidity", value: s.humidity, unit: "%", key: "humidity" },
    { title: "Obstacle", value: s.obstacleDistance, unit: "cm", key: "obstacleDistance" }
  ];

  function handleSidebarNavigate(id) {
    if (id === "rescue") {
      onOpenRescue?.();
      return;
    }

    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      <Sidebar activeSection={activeSection} onNavigate={handleSidebarNavigate} />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        <section id="overview" className="space-y-4">
          <Topbar status={status} minerId={data.minerId} />

          {error ? (
            <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
              Live data fetch issue: {error}. Showing last known values.
            </div>
          ) : null}

          {stale ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              Data stream appears stale. Check ESP32 network and backend service.
            </div>
          ) : null}
        </section>

        <section id="sensors" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <SensorCard
              key={c.title}
              title={c.title}
              value={c.value}
              unit={c.unit}
              offline={!data.esp32Connected}
              level={data.esp32Connected ? getSensorLevel(c.key, c.value) : "unknown"}
            />
          ))}
        </section>

        <section id="health" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <GaugeCard label="Oxygen Gauge" value={s.oxygen} min={16} max={22} unit="%" />
          <GaugeCard label="Heart Rate Gauge" value={s.heartRate} min={40} max={140} unit="BPM" />
          <HealthPanel heartRate={s.heartRate} />
        </section>

        <ChartsPanel history={history} />

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div id="alerts">
            <AlertsPanel alerts={data.alerts} history={data.alertHistory} />
          </div>

          <div id="gps">
            <MapView location={data.location} />
          </div>

          <div id="system" className="space-y-4">
            <AudioStatus audio={data.audio} />
            <SystemStatus connected={data.esp32Connected} timestamp={data.timestamp} />
          </div>
        </section>
      </main>
    </div>
  );
}
