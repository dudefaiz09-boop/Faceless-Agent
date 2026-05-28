import urllib.request, json, sys, time

BASE = "http://localhost:8080"

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode()
        return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, json.loads(body) if body else {"error": str(e)}

# Register or login
status, data = api("POST", "/api/v1/auth/register", {"email": "e2e@test.com", "password": "Test1234!", "display_name": "E2E"})
if status != 201:
    status, data = api("POST", "/api/v1/auth/login", {"email": "e2e@test.com", "password": "Test1234!"})

if status not in (200, 201):
    print(f"AUTH FAILED: {status} {data}")
    sys.exit(1)
print(f"AUTH: {status}")
token = data["access_token"]

# Create niche
status, data = api("POST", "/api/v1/niches/", {"name": "Gaming", "description": "Gaming content strategy"}, token=token)
print(f"CREATE NICHE: {status}")
if status == 201:
    print(f"  id: {data['id']}")
    print(f"  pipeline_status: {data['pipeline_status']}")
else:
    print(f"  ERROR: {data}")
    sys.exit(1)

# Wait for agent to process
time.sleep(5)

# Agent status
status, data = api("GET", "/api/v1/agent/status", token=token)
print(f"AGENT STATUS: {status}")
if status == 200:
    print(f"  running: {data['is_running']}")
    print(f"  total_logs: {data['total_actions']}")
    for log in data.get('recent_logs', [])[:5]:
        print(f"  [{log['status']}] {log['action']}: {log.get('message','')[:100]}")

# List niches to see pipeline status
status, data = api("GET", "/api/v1/niches/", token=token)
print(f"LIST NICHES: {status}, {len(data)} items")
for n in data:
    print(f"  {n['name']}: pipeline={n['pipeline_status']}")

# Trends
status, data = api("GET", "/api/v1/trends/", token=token)
print(f"TRENDS: {status}, {len(data)} items")

print("\n=== DONE ===")
