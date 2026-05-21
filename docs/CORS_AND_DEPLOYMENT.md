# CORS And Deployment

Allowed origins are controlled by `CORS_ORIGINS`, localhost development origins, and Vercel preview URLs unless `ALLOW_VERCEL_PREVIEW_ORIGINS=false`.

Credentials are supported, so wildcard origins are never used. Allowed request headers:

- `Authorization`
- `Content-Type`
- `x-school-id`
- `x-correlation-id`
- `x-idempotency-key`

Deployment smoke commands:

```bash
curl -i "$API_URL/api/version"
curl -i "$API_URL/api/health"
curl -i "$API_URL/api/ready"
curl -i -X OPTIONS "$API_URL/api/assignments" \
  -H "Origin: $WEB_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,x-school-id,content-type"
curl -i "$API_URL/api/assignments"
```

Expected unauthenticated protected response is JSON `401` with `code: AUTH_MISSING`.
