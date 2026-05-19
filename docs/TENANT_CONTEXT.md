# Tenant Context

The selected tenant is stored in:

`educonnect_selected_tenant_id`

The legacy key `educonnect_school_id` is still read for migration, but only known demo tenant IDs are migrated.

Demo tenant IDs:

- `tenant-a`
- `tenant-b`
- `tenant-c`

Normal users use their profile/app metadata tenant. Super admins use the selected tenant and default to `tenant-a` when available. The frontend sends the active tenant on every protected API request as `x-school-id`.

Backend behavior:

- Missing tenant on protected routes returns `400 Tenant Context Required`.
- Cross-tenant override by a normal user returns `403 Tenant Access Denied`.
- Super admins can switch only to tenants listed in `managedTenantIds`.
- Public `/api`, `/api/health`, and `/api/ready` do not require tenant context.
