import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api/data";
const MAX_POINTS = 20;
const POLL_MS = 2000;
const FETCH_TIMEOUT_MS = 5000;
const STALE_AFTER_MS = 10000;

const DEFAULT_DATA = {
  timestamp: new Date().toISOString(),
  esp32Connected: false,
  minerId: "UNKNOWN",
  location: { lat: null, lng: null },
  sensors: {
    oxygen: null,
    co2: null,
    co: null,
    ch4: null,
    h2s: null,
    heartRate: null,
    temperature: null,
    humidity: null,
    obstacleDistance: null
  },
  audio: { mic: null, speaker: null },
  alerts: [],
  alertHistory: []
};

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBooleanOrNull(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function sanitizeSensors(input) {
  const base = { ...DEFAULT_DATA.sensors };
  if (!input || typeof input !== "object" || Array.isArray(input)) return base;

  for (const [key, value] of Object.entries(input)) {
    const parsed = toFiniteNumber(value);
    if (parsed !== null) base[key] = parsed;
  }
  return base;
}

function sanitizePayload(input) {
  const safe = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  const lat = toFiniteNumber(safe.location?.lat);
  const lng = toFiniteNumber(safe.location?.lng);

  return {
    ...DEFAULT_DATA,
    ...safe,
    minerId:
      typeof safe.minerId === "string" && safe.minerId.trim() ? safe.minerId.trim() : DEFAULT_DATA.minerId,
    timestamp:
      typeof safe.timestamp === "string" && safe.timestamp ? safe.timestamp : new Date().toISOString(),
    sensors: sanitizeSensors(safe.sensors),
    location: {
      lat,
      lng
    },
    audio: {
      mic: toBooleanOrNull(safe.audio?.mic),
      speaker: toBooleanOrNull(safe.audio?.speaker)
    },
    alerts: Array.isArray(safe.alerts) ? safe.alerts : [],
    alertHistory: Array.isArray(safe.alertHistory) ? safe.alertHistory : []
  };
}

export default function useRealtimeData() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [history, setHistory] = useState({
    labels: [],
    oxygen: [],
    co2: [],
    co: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);

  const lastSuccessAtRef = useRef(0);

  useEffect(() => {
    let timer;
    let isMounted = true;

    async function pull() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(API, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!res.ok) {
          throw new Error("API responded with " + res.status);
        }

        const json = await res.json();
        let safe = sanitizePayload(json);

        if (!safe.esp32Connected) {
          safe = {
            ...safe,
            sensors: { ...DEFAULT_DATA.sensors },
            location: { lat: null, lng: null },
            alerts: []
          };
        }

        if (!isMounted) return;

        setData(safe);
        setHistory((prev) => {
          const label = new Date(safe.timestamp).toLocaleTimeString();
          return {
            labels: [...prev.labels, label].slice(-MAX_POINTS),
            oxygen: [...prev.oxygen, safe.sensors.oxygen].slice(-MAX_POINTS),
            co2: [...prev.co2, safe.sensors.co2].slice(-MAX_POINTS),
            co: [...prev.co, safe.sensors.co].slice(-MAX_POINTS)
          };
        });

        lastSuccessAtRef.current = Date.now();
        setLoading(false);
        setError("");
        setStale(false);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Unknown fetch error";
        setLoading(false);
        setError(message);

        setData((prev) => ({
          ...(prev || DEFAULT_DATA),
          esp32Connected: false,
          sensors: { ...DEFAULT_DATA.sensors },
          location: { lat: null, lng: null },
          alerts: []
        }));

        if (
          lastSuccessAtRef.current > 0 &&
          Date.now() - lastSuccessAtRef.current > STALE_AFTER_MS
        ) {
          setStale(true);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    pull();
    timer = setInterval(pull, POLL_MS);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return useMemo(
    () => ({ data, history, loading, error, stale }),
    [data, history, loading, error, stale]
  );
}
