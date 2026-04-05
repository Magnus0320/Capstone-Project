export default function Topbar({ status, minerId }) {
  const map = {
    SAFE: "bg-safe/20 text-safe border-safe/40",
    WARNING: "bg-warn/20 text-warn border-warn/40",
    DANGER: "bg-danger/20 text-danger border-danger/40",
    UNKNOWN: "bg-slate-700/30 text-textSoft border-slate-600"
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
