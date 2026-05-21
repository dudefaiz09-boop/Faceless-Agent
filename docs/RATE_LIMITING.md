# Rate Limiting

The API has a general `/api` limiter and stricter upload/import limiters for fees and performance uploads. `OPTIONS` requests are skipped so CORS preflight never requires auth or consumes quota.

Rate limit responses use:

```json
{
  "status": "error",
  "code": "RATE_LIMITED",
  "message": "Too many requests from this IP, please try again later.",
  "details": { "retryAfter": "seconds" },
  "correlationId": "..."
}
```

Future production hardening should move counters to a shared store such as Redis/Upstash so limits are consistent across serverless instances.
