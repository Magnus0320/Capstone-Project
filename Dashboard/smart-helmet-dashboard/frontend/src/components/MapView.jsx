import { useMemo } from "react";

function toFinite(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default function MapView({ location }) {
  const lat = toFinite(location?.lat);
  const lng = toFinite(location?.lng);
  const hasCoords = lat !== null && lng !== null;

  const mapEmbedUrl = useMemo(() => {
    if (!hasCoords) return null;

    const latDelta = 0.003;
    const lngDelta = 0.003;
    const left = lng - lngDelta;
    const right = lng + lngDelta;
    const top = lat + latDelta;
    const bottom = lat - latDelta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [hasCoords, lat, lng]);

  return (
    <div className="bg-panel rounded-xl p-4 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">GPS Tracking</h3>
        {hasCoords ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-textSoft hover:text-textMain"
          >
            Open full map
          </a>
        ) : null}
      </div>

      {hasCoords && mapEmbedUrl ? (
        <iframe
          title="Miner current location"
          src={mapEmbedUrl}
          className="w-full h-[260px] rounded-lg border border-slate-700"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="h-[220px] rounded-lg border border-slate-700 bg-panelSoft grid place-items-center text-sm text-textSoft">
          Location unavailable. Waiting for GPS coordinates.
        </div>
      )}

      <p className="mt-3 text-sm">
        Lat: <span className="text-textSoft">{lat !== null ? lat.toFixed(6) : "Unknown"}</span> | Lng:{" "}
        <span className="text-textSoft">{lng !== null ? lng.toFixed(6) : "Unknown"}</span>
      </p>
    </div>
  );
}
