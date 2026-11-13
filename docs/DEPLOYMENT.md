# Deploying ZEGA to Vercel

ZEGA runs on **Vercel** (Next.js app and REST API) with **Neon** (PostgreSQL) and optionally
**Vercel Blob** (photo uploads) and **Resend** (email). Everything below works on free plans.

The deployment uses the Vercel CLI straight from this folder, so no Git hosting is required.
`.env.local`, `node_modules` and build output are not uploaded (they are git-ignored).

## 1. Install the Vercel CLI and sign in

```bash
npm install -g vercel
vercel login
```

## 2. Create the Vercel project

From the `zega` folder:

```bash
vercel link
```

Answer: set up a **new** project, name it `zega`, keep the detected settings (Next.js).
`vercel.json` already sets the region (`iad1`, next to Neon's `us-east-2`), runs database
migrations before each build, and schedules the daily maintenance cron.

## 3. Add environment variables

In the Vercel dashboard: **Project → Settings → Environment Variables**. Add each one for
**Production** and **Preview**.

| Name | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | The **pooled** Neon URL (host contains `-pooler`), same as in `.env.local` | Yes |
| `DATABASE_URL_UNPOOLED` | The **direct** Neon URL (no `-pooler`), same as in `.env.local` | Yes |
| `BETTER_AUTH_SECRET` | A new secret: `openssl rand -base64 32` | Yes |
| `CRON_SECRET` | A new secret: `openssl rand -hex 24` | Yes |
| `RESEND_API_KEY` | From resend.com (API Keys) | Optional: email |
| `EMAIL_FROM` | `ZEGA <onboarding@resend.dev>` (or an address on your verified domain) | Optional |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://zega-ms.vercel.app` (canonical links, Open Graph images, auth origin) | Recommended |

Notes:
- Use a **different** `BETTER_AUTH_SECRET` from local development.
- Without `RESEND_API_KEY`, emails are only logged. Resend's test sender `onboarding@resend.dev`
  delivers only to the email address of your Resend account until you verify a domain.

## 4. Enable photo uploads (Vercel Blob)

Dashboard: **Project → Storage → Create Database → Blob → Create**, then **Connect** it to the
`zega` project (all environments). This adds `BLOB_READ_WRITE_TOKEN` automatically. Without it,
reporting still works but photo uploads return an error on Vercel.

## 5. Deploy

```bash
vercel --prod
```

The build runs `npm run db:migrate` (already-applied migrations are skipped) and then
`next build`. The CLI prints the production URL, e.g. `https://zega-xxxx.vercel.app`.

## 6. Verify

1. `https://<your-domain>/api/health` returns `{"status":"ok","database":{"ok":true,...}}`.
   This proves the deployed app is connected to the database.
2. Open the site, choose **Log in → Admin** (demo password `Zega@2026!`).
3. `https://<your-domain>/api/docs` shows the API reference.
4. Admin → **Audit trail → Verify integrity** reports the chain as intact.

## Updating

Run `vercel --prod` again after changes. To reset the demo data (destructive, deletes all
data in the Neon database): `npm run db:reset -- --yes && npm run db:migrate && npm run db:seed`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build fails at `db:migrate` | `DATABASE_URL_UNPOOLED` missing or wrong in Vercel env vars |
| Login fails with "invalid origin" | Set `NEXT_PUBLIC_APP_URL` to your exact production URL and redeploy |
| Photo upload error on Vercel | Connect a Blob store (step 4) and redeploy |
| `/api/health` returns 503 | Check the Neon URLs; make sure the Neon project is not suspended |
