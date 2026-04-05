export default function GaugeCard({ label, value, min, max, unit }) {
  const hasValue = Number.isFinite(value);
  const pct = hasValue
    ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    : 0;

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
        {hasValue ? `${value} ${unit}` : "Unknown"}
      </p>
    </div>
  );
}
