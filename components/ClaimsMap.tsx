"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { ClaimSummary } from "@/lib/client/api";
import type { Country, DisasterEvent } from "@/lib/types";
import { LANE_STYLE, pct } from "./ui";

export default function ClaimsMap({
  claims,
  event,
  country,
  highlight,
}: {
  claims: ClaimSummary[];
  event: DisasterEvent;
  country: Country;
  highlight: Set<string>;
}) {
  const zone = event.zones.find((z) => z.country === country)!;
  const shown = claims.filter((c) => c.country === country);
  return (
    <MapContainer key={country} center={zone.center} zoom={country === "PH" ? 10 : 9} className="h-full w-full rounded-xl" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {event.status !== "idle" && (
        <Circle center={zone.center} radius={zone.radiusKm * 1000} pathOptions={{ color: "#6366f1", weight: 1, fillOpacity: 0.06 }} />
      )}
      {shown.map((c) => {
        const color = c.lane ? LANE_STYLE[c.lane].hex : "#0ea5e9";
        const on = highlight.has(c.id);
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={on ? 11 : c.hero ? 8 : 6}
            pathOptions={{ color: on ? "#0f172a" : "#fff", weight: on ? 3 : 1.5, fillColor: color, fillOpacity: 0.9 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-mono">{c.id}</div>
                <div className="font-medium">{c.farmerName}</div>
                <div>
                  {c.lane ?? "verifying"} · {pct(c.confidence)} · loss {c.lossPct ?? "–"}%
                </div>
                <Link href={`/claim/${c.id}`}>Open claim →</Link>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
