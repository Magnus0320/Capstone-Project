import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip);

function chartData(labels, data, label, color) {
  return {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color,
        tension: 0.3
      }
    ]
  };
}

const options = {
  responsive: true,
  plugins: {
    legend: { labels: { color: "#e5ecff" } }
  },
  scales: {
    x: { ticks: { color: "#9fb1d1" }, grid: { color: "#1f2b44" } },
    y: { ticks: { color: "#9fb1d1" }, grid: { color: "#1f2b44" } }
  }
};

export default function ChartsPanel({ history }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">CO2 (ppm)</h3>
        <Line data={chartData(history.labels, history.co2, "CO2", "#ef4444")} options={options} />
      </div>
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">Oxygen (%)</h3>
        <Line data={chartData(history.labels, history.oxygen, "O2", "#22c55e")} options={options} />
      </div>
      <div className="bg-panel rounded-xl p-4 border border-slate-800">
        <h3 className="mb-3 font-medium">CO (ppm)</h3>
        <Line data={chartData(history.labels, history.co, "CO", "#f59e0b")} options={options} />
      </div>
    </div>
  );
}
