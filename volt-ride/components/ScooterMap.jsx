"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

const colors = { child: "#ffb454", adult: "#b8f75a", professional: "#9b83ff" };

export default function ScooterMap({ scooters, onSelect }) {
  return (
    <MapContainer center={[55.751244, 37.618423]} zoom={13} className="scooter-map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {scooters.map((s) => (
        <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={10}
          pathOptions={{ color: "#182019", fillColor: colors[s.type] || colors.adult, fillOpacity: 1, weight: 3 }}>
          <Popup>
            <div className="map-popup">
              <strong>{s.name}</strong>
              <p>{s.maxSpeed} км/ч · {(s.priceCents / 100).toFixed(2)} ₽/мин</p>
              <button className="btn btn-dark btn-sm" onClick={() => onSelect(s)}>Подробнее</button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
