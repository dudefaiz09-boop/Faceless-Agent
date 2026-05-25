import type { Request, Response, NextFunction } from 'express';

type CachedResponse = {
  statusCode: number;
  body: unknown;
  expiresAt: number;
};

const cache = new Map<string, CachedResponse>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (value.expiresAt <= now) cache.delete(key);
  }
}, IDEMPOTENCY_TTL_MS);

function cacheKey(req: Request, key: string) {
  return [
    req.tenantId || 'no-tenant',
    req.user?.uid || 'anonymous',
    req.method,
    req.path,
    key,
  ].join(':');
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();

  const key = String(req.headers['x-idempotency-key'] || '').trim();
  if (!key) return next();

  const scopedKey = cacheKey(req, key);
  const cached = cache.get(scopedKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('x-idempotency-cache', 'HIT');
    return res.status(cached.statusCode).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(scopedKey, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }
    return originalJson(body);
  };

  return next();
}
