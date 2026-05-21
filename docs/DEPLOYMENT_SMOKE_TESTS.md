# Deployment Smoke Tests

Run after every deploy:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm turbo build --filter @educonnect/shared
pnpm turbo build --filter @educonnect/shared-api
pnpm turbo build --filter @educonnect/shared-education
pnpm turbo build --filter @educonnect/functions
pnpm turbo build --filter @educonnect/web
```

Runtime checks:

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

Expected:

- `/api/version`, `/api/health` return `200`.
- `/api/ready` returns `200` only when required envs are present.
- OPTIONS returns `204`.
- unauthenticated assignments returns JSON `401 AUTH_MISSING`.
