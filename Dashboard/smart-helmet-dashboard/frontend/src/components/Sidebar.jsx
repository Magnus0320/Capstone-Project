const items = [
  { label: "Overview", id: "overview" },
  { label: "Rescue", id: "rescue" }
];

export default function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="w-full md:w-64 bg-panel border-r border-slate-800 p-4">
      <h1 className="text-xl font-bold tracking-wide">Smart Helmet</h1>
      <p className="text-textSoft text-sm mt-1">Admin Dashboard</p>

      <nav className="mt-6 space-y-2">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={[
                "w-full text-left px-3 py-2 rounded-lg transition",
                isActive
                  ? "bg-panelSoft text-textMain border border-slate-700"
                  : "text-textSoft hover:bg-panelSoft hover:text-textMain"
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
