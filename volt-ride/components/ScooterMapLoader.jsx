"use client";

import dynamic from "next/dynamic";

const ScooterMap = dynamic(() => import("./ScooterMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Загружаем карту…</div>
});

export default function ScooterMapLoader(props) {
  return <ScooterMap {...props} />;
}
