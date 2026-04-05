export default function HealthPanel({ heartRate }) {
  const hasValue = Number.isFinite(heartRate);
  const abnormal = hasValue ? heartRate < 55 || heartRate > 110 : false;

  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">Health Monitoring</h3>
      <p className="text-3xl font-semibold">{hasValue ? `${heartRate} BPM` : "Unknown"}</p>
      <p className={`mt-2 text-sm ${hasValue ? (abnormal ? "text-danger" : "text-safe") : "text-textSoft"}`}>
        {hasValue ? (abnormal ? "Abnormal" : "Normal") : "No reading"}
      </p>
    </div>
  );
}
