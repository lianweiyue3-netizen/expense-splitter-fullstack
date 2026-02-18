type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export function isRateLimited(
  key: string,
  limit = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  if (current.count > limit) {
    return true;
  }

  buckets.set(key, current);
  return false;
}
