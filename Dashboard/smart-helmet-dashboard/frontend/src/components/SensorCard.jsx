const colorBy = {
  safe: "border-safe/40",
  warning: "border-warn/40",
  danger: "border-danger/40",
  unknown: "border-slate-700"
};

export default function SensorCard({ title, value, unit, level, offline = false }) {
  const hasValue = Number.isFinite(value);

  const displayValue = offline ? "Sensor Offline" : hasValue ? value : "Unknown";
  const displayLevel = offline ? "UNKNOWN" : String(level).toUpperCase();
  const displayLevelKey = offline ? "unknown" : level;

  return (
    <div className={`bg-panel p-4 rounded-xl border ${colorBy[displayLevelKey] || "border-slate-800"} min-h-[108px]`}>
      <p className="text-textSoft text-sm">{title}</p>
      <p className="text-2xl font-semibold mt-2">
        {displayValue} {!offline && hasValue ? <span className="text-base text-textSoft">{unit}</span> : null}
      </p>
      <p className="text-xs mt-2 uppercase tracking-wide text-textSoft">{displayLevel}</p>
    </div>
  );
}
