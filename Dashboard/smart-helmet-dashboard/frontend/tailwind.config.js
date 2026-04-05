/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1220",
        panel: "#111a2d",
        panelSoft: "#17233b",
        safe: "#22c55e",
        warn: "#f59e0b",
        danger: "#ef4444",
        textMain: "#e5ecff",
        textSoft: "#9fb1d1"
      }
    }
  },
  plugins: []
};
