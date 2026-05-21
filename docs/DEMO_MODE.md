# Demo Mode

Demo mode is explicit:

```env
VITE_DEMO_MODE=true
```

When disabled, frontend tenant resolution does not default to `tenant-a`, demo class lists are not used, and stale local tenant values are ignored unless they match profile/managed tenant IDs. Demo tenant IDs may appear in sample CSVs only when demo mode is enabled.
