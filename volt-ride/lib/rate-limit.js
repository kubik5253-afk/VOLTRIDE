// Простое ограничение запросов для одного процесса разработки.
// Для production с несколькими экземплярами используйте Redis/managed rate limiter.
const buckets = new Map();

export function rateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const item = buckets.get(key);
  if (!item || item.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  item.count += 1;
  if (item.count > limit) return { ok: false, retryAfter: Math.ceil((item.resetAt - now) / 1000) };
  return { ok: true };
}
