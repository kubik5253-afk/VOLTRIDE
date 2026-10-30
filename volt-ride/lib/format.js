export function money(cents) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(Number(cents || 0) / 100);
}

export function publicScooter(row) {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    battery: Number(row.battery),
    maxSpeed: Number(row.max_speed),
    rangeKm: Number(row.range_km),
    priceCents: Number(row.price_per_minute_cents),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status
  };
}
