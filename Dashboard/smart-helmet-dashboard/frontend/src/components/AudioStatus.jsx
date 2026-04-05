export default function AudioStatus({ audio }) {
  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <h3 className="font-medium mb-2">Audio / Communication</h3>
      <p className="text-sm text-textSoft">Microphone: {audio?.mic ? "Online" : "Offline"}</p>
      <p className="text-sm text-textSoft">Speaker: {audio?.speaker ? "Online" : "Offline"}</p>
    </div>
  );
}
