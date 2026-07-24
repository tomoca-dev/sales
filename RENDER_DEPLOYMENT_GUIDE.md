# Render Deployment Guide for Tomoca Sales Platform

This project should be deployed to Render as **one Node Web Service**, not as a static site. The Express server serves the built React/Vite frontend, Socket.IO, and the `/api/*` routes from the same domain.

## 1. Prepare Supabase first

Open Supabase SQL Editor and run these files in this order if you have not already run them:

1. `supabase_tomoca_schema.sql`
2. `fix_supabase_profiles_500_and_imports.sql`

Then confirm these tables exist:

- `public.profiles`
- `public.tomoca_platform_entities`
- `public.sales_document_imports`

## 2. Push the project to GitHub

Push the **contents of this folder** to GitHub. Your repository root should contain:

- `package.json`
- `server.ts`
- `src/`
- `render.yaml`
- `supabase_tomoca_schema.sql`

Do not push a real `.env` file.

## 3. Create the Render Web Service

Recommended method: use the included `render.yaml` Blueprint.

1. Open Render Dashboard.
2. Click **New +**.
3. Choose **Blueprint**.
4. Connect the GitHub repository.
5. Select the branch you want to deploy.
6. Render will read `render.yaml` and create `tomoca-sales-platform`.

Alternative manual setup:

- Service type: **Web Service**
- Runtime: **Node**
- Build command:

```bash
npm ci && npm run build
```

- Start command:

```bash
npm start
```

- Health check path:

```text
/healthz
```

## 4. Add Render environment variables

Add these in Render → Web Service → Environment.

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
VITE_API_URL=
VITE_SOCKET_URL=
```

For this one-service Render deployment, keep `VITE_API_URL` and `VITE_SOCKET_URL` empty. The frontend will call the backend on the same domain.

Important: `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server-only secrets. Put them only in Render environment variables, not in frontend code.

## 5. Deploy

1. Click **Manual Deploy** → **Deploy latest commit**.
2. Watch the build logs.
3. The deployment is ready when Render shows the service as **Live**.

## 6. Test the Render deployment

Open:

```text
https://your-render-url.onrender.com/healthz
```

Expected result:

```json
{
  "ok": true,
  "service": "tomoca-sales-platform",
  "supabase": true
}
```

Then test:

```text
https://your-render-url.onrender.com/sales-dashboard
```

It should load the React page, not return 404.

In browser DevTools → Network, check `/socket.io`. It should not return 404.

## 7. Connect the custom domain

In Render:

1. Open the service.
2. Go to **Settings** → **Custom Domains**.
3. Add:

```text
sales.tomocacoffee.et
```

4. Render will show the DNS record you need.
5. Add that DNS record where `tomocacoffee.et` DNS is managed.
6. Wait for Render to verify the domain and issue SSL.

After DNS is ready, test:

```text
https://sales.tomocacoffee.et/healthz
https://sales.tomocacoffee.et/sales-dashboard
```

## 8. Common errors

### `/socket.io` returns 404

This means you deployed the frontend as a static site or the frontend is pointing to the wrong backend. On this one-service Render setup, `VITE_SOCKET_URL` should be empty.

### `/sales-dashboard` returns 404

This means React Router fallback is not being served. Deploy the Node service, not only the Vite `dist` folder.

### Supabase `profiles` returns 500

Run:

```sql
fix_supabase_profiles_500_and_imports.sql
```

Then restart the Render service.

### Import cannot process scanned PDF

Check that `GEMINI_API_KEY` is set in Render and redeploy/restart the service.

### App shows empty dashboard

This is correct when the Supabase database has no real records. The project intentionally contains no mock business data.
