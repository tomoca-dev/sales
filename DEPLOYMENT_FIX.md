# Deployment fix for sales.tomocacoffee.et

The production console errors show two different deployment problems:

1. `/socket.io` returns `404`. The React app is live, but the Express + Socket.IO backend is not running at the same public domain.
2. `/sales-dashboard` returns `404`. The host is not configured to serve `index.html` for React Router routes.
3. The Supabase `profiles` request returns `500`. The Supabase RLS/profile schema in the database is out of sync with the app.

## 1) Run the Supabase repair SQL

Open Supabase SQL Editor and run:

```sql
fix_supabase_profiles_500_and_imports.sql
```

This repairs profile policies, creates/updates the required tables, installs the user-profile trigger, and refreshes the PostgREST schema cache.

## 2) Deploy as a Node server, not static-only

This app is not only a static Vite app. It needs `server.ts` for:

- `/api/state`
- `/api/parse-historical-sales`
- `/api/parse-receipt`
- `/api/generate-advanced-report`
- `/socket.io`

Use Render as a single Node Web Service for the cleanest deployment. The included `render.yaml` uses the official Blueprint format with `runtime: node`, `startCommand: npm start`, and `healthCheckPath: /healthz`.

Build command:

```bash
npm ci
npm run build
```

Start command:

```bash
npm start
```

Required server environment variables:

```bash
NODE_ENV=production
# Render sets PORT automatically; do not hardcode it in production.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
```

Also provide the browser variables at build time:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3) If frontend and backend are on different domains

Example:

- Frontend: `https://sales.tomocacoffee.et`
- Backend: `https://sales-api.tomocacoffee.et`

Set these at frontend build time:

```bash
VITE_API_URL=https://sales-api.tomocacoffee.et
VITE_SOCKET_URL=https://sales-api.tomocacoffee.et
```

The frontend now uses these values for API requests and Socket.IO instead of always assuming same-origin.

## 4) If you use a static host for only the frontend

Static hosting alone will not run the backend or Socket.IO. You must still deploy the backend separately and set `VITE_API_URL`.

For Netlify-style static routing, this package includes:

```text
public/_redirects
```

For Vercel-style static routing, this package includes:

```text
vercel.json
```

These only fix React Router page refreshes like `/sales-dashboard`. They do not replace the Node backend.

## 5) Quick production checks

After deployment, open these URLs:

```text
https://your-backend-domain/healthz
https://your-backend-domain/api/state
```

`/healthz` should return JSON. `/api/state` should require authentication or return an auth/configuration error, not a 404.

In browser DevTools, `/socket.io/?EIO=4...` must return `200` or `101 Switching Protocols`, not `404`.

## Render guide

See `RENDER_DEPLOYMENT_GUIDE.md` for the step-by-step Render setup.
