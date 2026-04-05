import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import useRealtimeData from "../hooks/useRealtimeData";
import { getSensorLevel } from "../utils/status";

function toFinite(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatReading(value, unit = "", offline = false) {
  if (offline) return "Sensor Offline";
  const n = toFinite(value);
  if (n === null) return "Unknown";
  return unit ? String(n) + " " + unit : String(n);
}

function levelClass(level) {
  if (level === "danger") return "text-danger border-danger/40 bg-danger/10";
  if (level === "warning") return "text-warn border-warn/40 bg-warn/10";
  if (level === "unknown") return "text-textSoft border-slate-700 bg-panelSoft";
  return "text-safe border-safe/40 bg-safe/10";
}

function sensorLevel(key, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "unknown";
  return getSensorLevel(key, value);
}

function estimateRescueWindowMinutes(s) {
  if (!s) return null;

  const o2 = toFinite(s.oxygen);
  const co = toFinite(s.co);
  const co2 = toFinite(s.co2);
  const h2s = toFinite(s.h2s);
  const ch4 = toFinite(s.ch4);

  // If no gas data at all, rescue estimate is unknown
  if (o2 === null && co === null && co2 === null && h2s === null && ch4 === null) {
    return null;
  }

  let risk = 0;

  if (o2 !== null) {
    if (o2 < 18.5) risk += 6;
    else if (o2 < 19.5) risk += 4;
    else if (o2 < 20.0) risk += 2;
  }

  if (co !== null) {
    if (co >= 200) risk += 6;
    else if (co >= 100) risk += 4;
    else if (co >= 35) risk += 2;
    else if (co >= 20) risk += 1;
  }

  if (co2 !== null) {
    if (co2 >= 4000) risk += 4;
    else if (co2 >= 2000) risk += 2;
    else if (co2 >= 1500) risk += 1;
  }

  if (h2s !== null && h2s >= 10) risk += 3;
  if (ch4 !== null && ch4 >= 1.0) risk += 2;

  const minutes = 60 - risk * 6;
  return Math.max(5, Math.min(60, minutes));
}

function formatRemaining(seconds) {
  if (seconds === null) return "Unknown";
  if (seconds <= 0) return "0m 0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m) + "m " + String(s) + "s";
}

const CRITICAL_RESCUE_SECONDS = 10 * 60;
const WARNING_RESCUE_SECONDS = 20 * 60;

export default function Rescue({ onOpenOverview }) {
  const { data, loading, error, stale } = useRealtimeData();
  const [nowMs, setNowMs] = useState(Date.now());
  const [deadlineMs, setDeadlineMs] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const estimatedMinutes = useMemo(() => {
    if (!data) return null;
    return estimateRescueWindowMinutes(data.sensors);
  }, [
    data?.sensors?.oxygen,
    data?.sensors?.co,
    data?.sensors?.co2,
    data?.sensors?.h2s,
    data?.sensors?.ch4
  ]);

  useEffect(() => {
    if (estimatedMinutes === null) {
      setDeadlineMs(null);
      return;
    }

    const candidate = Date.now() + estimatedMinutes * 60 * 1000;
    setDeadlineMs((prev) => (prev === null ? candidate : Math.min(prev, candidate)));
  }, [estimatedMinutes, data?.timestamp]);

  if (loading && !data) {
    return <div className="min-h-screen bg-bg text-textMain grid place-items-center">Loading rescue view...</div>;
  }

  const s = data.sensors;
  const lat = toFinite(data.location?.lat);
  const lng = toFinite(data.location?.lng);
  const hasCoords = lat !== null && lng !== null;

  const isOffline = !data.esp32Connected;

  const remainingSec =
    isOffline || deadlineMs === null ? null : Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));

  const mapUrgency =
    isOffline || !hasCoords
      ? "unknown"
      : remainingSec !== null && remainingSec <= CRITICAL_RESCUE_SECONDS
      ? "critical"
      : remainingSec !== null && remainingSec <= WARNING_RESCUE_SECONDS
      ? "warning"
      : "normal";

  const mapPanelClass =
    mapUrgency === "critical"
      ? "border-danger/60 bg-danger/5"
      : mapUrgency === "warning"
      ? "border-warn/60 bg-warn/5"
      : mapUrgency === "unknown"
      ? "border-slate-700 bg-panelSoft/30"
      : "border-slate-800";

  const mapFrameClass =
    mapUrgency === "critical"
      ? "border-danger/60"
      : mapUrgency === "warning"
      ? "border-warn/60"
      : "border-slate-700";

  const harmful = [
    { label: "CO", key: "co", value: s.co, unit: "ppm" },
    { label: "CO2", key: "co2", value: s.co2, unit: "ppm" },
    { label: "H2S", key: "h2s", value: s.h2s, unit: "ppm" },
    { label: "CH4", key: "ch4", value: s.ch4, unit: "" }
  ];

  const vitals = [
    { label: "Heart Rate", value: s.heartRate, unit: "BPM" },
    { label: "Temperature", value: s.temperature, unit: "C" },
    { label: "Humidity", value: s.humidity, unit: "%" },
    { label: "Oxygen", value: s.oxygen, unit: "%" }
  ];

  const mapEmbedUrl = useMemo(() => {
    if (!hasCoords) return null;

    const latDelta = 0.003;
    const lngDelta = 0.003;
    const left = lng - lngDelta;
    const right = lng + lngDelta;
    const top = lat + latDelta;
    const bottom = lat - latDelta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [hasCoords, lat, lng]);

  function handleNavigate(id) {
    if (id === "overview") onOpenOverview?.();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      <Sidebar activeSection="rescue" onNavigate={handleNavigate} />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        <section className="bg-panel rounded-xl p-4 border border-slate-800">
          <h2 className="text-2xl font-semibold">Rescue Command View</h2>
          <p className="text-textSoft text-sm mt-1">Miner ID: {data.minerId}</p>
        </section>

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

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-panel rounded-xl p-4 border border-slate-800">
            <h3 className="font-medium mb-3">Exact Location</h3>
            <p className="text-sm">Latitude: <span className="text-textSoft">{lat !== null ? lat.toFixed(6) : "Unknown"}</span></p>
            <p className="text-sm mt-1">Longitude: <span className="text-textSoft">{lng !== null ? lng.toFixed(6) : "Unknown"}</span></p>
            {hasCoords ? (
              <a
                href={"https://maps.google.com/?q=" + lat + "," + lng}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 px-3 py-2 rounded-lg border border-slate-700 text-sm text-textMain hover:bg-panelSoft"
              >
                Open in Maps
              </a>
            ) : null}
          </div>

          <div className="bg-panel rounded-xl p-4 border border-slate-800">
            <h3 className="font-medium mb-3">Rescue Time Remaining</h3>
            <p className="text-3xl font-semibold">
              {formatRemaining(remainingSec)}
            </p>
            <p className="text-xs text-textSoft mt-2">
              Estimated from oxygen and harmful gas severity.
            </p>
          </div>

          <div className="bg-panel rounded-xl p-4 border border-slate-800">
            <h3 className="font-medium mb-3">Vitals Overview</h3>
            <div className="space-y-2">
              {vitals.map((v) => (
                <div key={v.label} className="flex items-center justify-between text-sm">
                  <span className="text-textSoft">{v.label}</span>
                  <span className="text-textMain">{formatReading(v.value, v.unit, isOffline)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-panel rounded-xl p-4 border border-slate-800">
          <h3 className="font-medium mb-3">Harmful Gases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {harmful.map((g) => {
              const level = isOffline ? "unknown" : sensorLevel(g.key, g.value);
              return (
                <div key={g.key} className={"rounded-lg border px-3 py-2 " + levelClass(level)}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-xs uppercase">{level}</span>
                  </div>
                  <p className="text-sm mt-1">{formatReading(g.value, g.unit, isOffline)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`bg-panel rounded-xl p-4 border ${mapPanelClass}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Miner Location Map</h3>
              {mapUrgency === "critical" ? (
                <span className="text-[10px] px-2 py-1 rounded-full border border-danger/50 text-danger bg-danger/10 animate-pulse">
                  URGENT
                </span>
              ) : mapUrgency === "warning" ? (
                <span className="text-[10px] px-2 py-1 rounded-full border border-warn/50 text-warn bg-warn/10">
                  WATCH
                </span>
              ) : mapUrgency === "unknown" ? (
                <span className="text-[10px] px-2 py-1 rounded-full border border-slate-600 text-textSoft bg-panelSoft">
                  UNKNOWN
                </span>
              ) : (
                <span className="text-[10px] px-2 py-1 rounded-full border border-safe/50 text-safe bg-safe/10">
                  NORMAL
                </span>
              )}
            </div>
            {hasCoords ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-textSoft hover:text-textMain"
              >
                Open full map
              </a>
            ) : null}
          </div>

          {hasCoords && mapEmbedUrl ? (
            <iframe
              title="Miner current location"
              src={mapEmbedUrl}
              className={`w-full h-[340px] rounded-lg border ${mapFrameClass}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className={`h-[220px] rounded-lg border ${mapFrameClass} bg-panelSoft grid place-items-center text-sm text-textSoft`}>
              Location unavailable. Waiting for GPS coordinates.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}