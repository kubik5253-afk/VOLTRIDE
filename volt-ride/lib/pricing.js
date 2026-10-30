export function getTariffDiscount(tariffMinutes) {
  if (Number(tariffMinutes) === 30) return 0.20;
  if (Number(tariffMinutes) === 60) return 0.40;
  return 0;
}

export function getTariffPrice(pricePerMinuteCents, tariffMinutes) {
  const minutes = Number(tariffMinutes) || 0;
  const base = Number(pricePerMinuteCents) || 0;
  if (!minutes) return 0;
  return Math.round(base * minutes * (1 - getTariffDiscount(minutes)));
}

export function getRideAccruedCost({ pricePerMinuteCents, tariffMinutes, prepaidCents, elapsedMinutes }) {
  const elapsed = Math.max(1, Number(elapsedMinutes) || 0);
  const limit = Number(tariffMinutes) || 0;
  const used = Math.min(elapsed, limit || elapsed);
  const prepaid = Number(prepaidCents) || 0;
  if (limit > 0 && prepaid > 0) return Math.min(prepaid, Math.round(prepaid * used / limit));
  return used * (Number(pricePerMinuteCents) || 0);
}
