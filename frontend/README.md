This is the frontend for the Orizn RAG platform (dashboard + widget).

## Development

Copy env config:

```bash
cp .env.example .env.local
```

Run the dev server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes
- `/` marketing landing
- `/auth/register`, `/auth/login`
- `/projects` dashboard
- `/projects/[projectId]` project detail
- `/widget` iframe widget UI

## Notes
- Use `frontend_flow.md` for API calls and auth headers.
