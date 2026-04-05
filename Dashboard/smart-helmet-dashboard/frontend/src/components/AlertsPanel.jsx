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
