import { THRESHOLDS } from "./thresholds";

export function getSensorLevel(key, value) {
  const t = THRESHOLDS[key];
  if (!t) return "safe";

  if (value === null || value === undefined || Number.isNaN(value)) return "unknown";

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
  if (checks.includes("unknown")) return "UNKNOWN";
  return "SAFE";
}
