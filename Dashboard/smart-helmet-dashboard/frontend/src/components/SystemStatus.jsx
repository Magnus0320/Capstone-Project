export default function SystemStatus({ connected, timestamp }) {
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">System Status</h3>
      <p className="text-sm">
        ESP32: <span className={connected ? "text-safe" : "text-danger"}>{connected ? "Connected" : "Disconnected"}</span>
      </p>
      <p className="text-sm text-textSoft mt-1">Last update: {new Date(timestamp).toLocaleString()}</p>
    </div>
  );
}
