# contextly-waitlist

A Cloudflare Worker + D1 database that collects waitlist emails for contextly.live
while the backend is offline. Free tier only.

| Endpoint | Auth | What it does |
|---|---|---|
| `POST /join` `{"email","source"}` | none | Stores a lowercased email (repeat signups are ignored). Honeypot field `website`. Global cap of 60/min and 1000/hour. |
| `GET /export` | `Authorization: Bearer <ADMIN_KEY>` | CSV of all signups (`?format=json` for JSON). |
| `GET /health` | none | `{"ok":true}` |

The website posts to it through its own `/api/waitlist` route
(`frontend/app/api/waitlist/route.ts`), not directly from the browser.

## Read the list

```bash
# CSV (the key is in .admin-key, which is gitignored)
curl -H "Authorization: Bearer $(cat .admin-key)" https://contextly-waitlist.priyanshi.workers.dev/export > waitlist.csv

# or straight from D1
wrangler d1 execute contextly-waitlist --remote --command "SELECT email, source, datetime(created_at/1000,'unixepoch') AS joined FROM waitlist ORDER BY id DESC"
```

## Deploy / rotate

```bash
wrangler deploy                        # code
wrangler secret put ADMIN_KEY          # rotate the export key
wrangler d1 execute contextly-waitlist --remote --file=schema.sql   # schema (idempotent)
```

Resources: Worker `contextly-waitlist`, D1 `contextly-waitlist`
(`f225643a-089e-4181-a1ff-53d96c703748`), account `Pranav88096@gmail.com`.
