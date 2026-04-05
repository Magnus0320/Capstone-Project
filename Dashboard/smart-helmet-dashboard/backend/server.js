import express from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const MAX_ALERT_HISTORY = 1000;
const HEARTBEAT_TIMEOUT_MS = 3000;

let lastEsp32SeenAt = Date.now();

let latestData = {
  timestamp: new Date().toISOString(),
  esp32Connected: true,
  minerId: "MINER-001",
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
  audio: { mic: true, speaker: true }
};

const alertHistory = [];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function isEsp32Connected() {
  return Date.now() - lastEsp32SeenAt < HEARTBEAT_TIMEOUT_MS;
}

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

function validateIncomingPayload(incoming) {
  if (!isPlainObject(incoming)) return "Request body must be a JSON object.";

  if (incoming.minerId !== undefined && typeof incoming.minerId !== "string") {
    return "minerId must be a string.";
  }

  if (incoming.sensors !== undefined) {
    if (!isPlainObject(incoming.sensors)) return "sensors must be an object.";
    for (const [key, value] of Object.entries(incoming.sensors)) {
      if (toFiniteNumber(value) === null) {
        return "Invalid numeric value for sensors." + key;
      }
    }
  }

  if (incoming.location !== undefined) {
    if (!isPlainObject(incoming.location)) return "location must be an object.";
    if (
      incoming.location.lat !== undefined &&
      incoming.location.lat !== null &&
      toFiniteNumber(incoming.location.lat) === null
    ) {
      return "location.lat must be a finite number.";
    }
    if (
      incoming.location.lng !== undefined &&
      incoming.location.lng !== null &&
      toFiniteNumber(incoming.location.lng) === null
    ) {
      return "location.lng must be a finite number.";
    }
  }

  if (incoming.audio !== undefined) {
    if (!isPlainObject(incoming.audio)) return "audio must be an object.";
    if (incoming.audio.mic !== undefined && toBoolean(incoming.audio.mic) === null) {
      return "audio.mic must be boolean.";
    }
    if (incoming.audio.speaker !== undefined && toBoolean(incoming.audio.speaker) === null) {
      return "audio.speaker must be boolean.";
    }
  }

  return null;
}

function normalizeSensors(sensors) {
  const normalized = Object.fromEntries(SENSOR_KEYS.map((k) => [k, null]));

  if (!isPlainObject(sensors)) return normalized;

  for (const key of SENSOR_KEYS) {
    const parsed = toFiniteNumber(sensors[key]);
    normalized[key] = parsed;
  }

  return normalized;
}

function mergeLocation(incomingLocation, currentLocation) {
  if (!isPlainObject(incomingLocation)) {
    return { lat: null, lng: null };
  }

  const lat =
    incomingLocation.lat === null
      ? null
      : incomingLocation.lat === undefined
      ? null
      : toFiniteNumber(incomingLocation.lat);
  const lng =
    incomingLocation.lng === null
      ? null
      : incomingLocation.lng === undefined
      ? null
      : toFiniteNumber(incomingLocation.lng);

  return {
    lat,
    lng
  };
}

function mergeAudio(incomingAudio, currentAudio) {
  if (!isPlainObject(incomingAudio)) return currentAudio;

  const mic = toBoolean(incomingAudio.mic);
  const speaker = toBoolean(incomingAudio.speaker);

  return {
    mic: mic !== null ? mic : currentAudio.mic,
    speaker: speaker !== null ? speaker : currentAudio.speaker
  };
}

const SENSOR_KEYS = [
  "oxygen",
  "co2",
  "co",
  "ch4",
  "h2s",
  "heartRate",
  "temperature",
  "humidity",
  "obstacleDistance"
];

app.get("/api/data", (req, res) => {
  const connected = isEsp32Connected();

  const sensors = connected
    ? latestData.sensors
    : Object.fromEntries(SENSOR_KEYS.map((k) => [k, null]));

  const location = connected ? latestData.location : { lat: null, lng: null };
  const alerts = connected ? evaluateAlerts(latestData) : [];

  res.json({
    ...latestData,
    esp32Connected: connected,
    sensors,
    location,
    alerts,
    alertHistory: alertHistory.slice(-100).reverse()
  });
});

app.post("/api/data", (req, res) => {
  const incoming = req.body ?? {};
  const validationError = validateIncomingPayload(incoming);

  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  lastEsp32SeenAt = Date.now();

  latestData = {
    ...latestData,
    minerId:
      typeof incoming.minerId === "string" && incoming.minerId.trim()
        ? incoming.minerId.trim()
        : latestData.minerId,
    sensors: normalizeSensors(incoming.sensors),
    location: mergeLocation(incoming.location, latestData.location),
    audio: mergeAudio(incoming.audio, latestData.audio),
    timestamp: new Date().toISOString()
  };

  const alerts = evaluateAlerts(latestData);
  alerts.forEach((a) => {
    alertHistory.push({
      id: Date.now().toString() + "-" + Math.random().toString(16).slice(2),
      timestamp: new Date().toISOString(),
      ...a
    });
  });

  if (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.splice(0, alertHistory.length - MAX_ALERT_HISTORY);
  }

  return res.status(200).json({
    ok: true,
    latestData: { ...latestData, esp32Connected: isEsp32Connected() },
    alerts
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:4000");
});
