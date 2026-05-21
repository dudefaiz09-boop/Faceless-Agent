# Route Protection Table

| Route                  | Public | Auth required | Tenant required |
| ---------------------- | ------ | ------------- | --------------- |
| `GET /api`             | Yes    | No            | No              |
| `GET /api/health`      | Yes    | No            | No              |
| `GET /api/version`     | Yes    | No            | No              |
| `GET /api/ready`       | Yes    | No            | No              |
| `OPTIONS *`            | Yes    | No            | No              |
| `/api/announcements/*` | No     | Yes           | Yes             |
| `/api/attendance/*`    | No     | Yes           | Yes             |
| `/api/assignments/*`   | No     | Yes           | Yes             |
| `/api/chat/*`          | No     | Yes           | Yes             |
| `/api/fees/*`          | No     | Yes           | Yes             |
| `/api/library/*`       | No     | Yes           | Yes             |
| `/api/notifications/*` | No     | Yes           | Yes             |
| `/api/performance/*`   | No     | Yes           | Yes             |
| `/api/roles/*`         | No     | Yes           | Yes             |
| `/api/students/*`      | No     | Yes           | Yes             |
| `/api/teachers/*`      | No     | Yes           | Yes             |
| `/api/users/*`         | No     | Yes           | Yes             |
