# reminderme — Serverless Cloudflare Worker + D1 Backend (`worker/`)

Zero always-on Node server to start or manage. This Cloudflare Worker powers **full user accounts, cloud reminder sync, analytics, Privacy Policy (`/privacy`), and 1-minute lock-screen Web Push scheduling** globally on Cloudflare's Edge network with D1 SQLite storage.

---

## Quick Deploy (4 Commands)

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 execute reminder-db --remote --file=./schema.sql
```

*(If you haven't created `reminder-db` yet, run `npx wrangler d1 create reminder-db` first and paste its `database_id` into `worker/wrangler.toml`.)*

### Set Secrets Safely in Cloudflare
Generate VAPID keys once (`npx web-push generate-vapid-keys`), then store them as encrypted Worker secrets:

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put CRON_SECRET
```

### Deploy Globally to Cloudflare Edge
```bash
npx wrangler deploy
```

### Connect Custom Domain (`api.makeuperfect.in`)
1. Open Cloudflare Dashboard → **Workers & Pages** → `reminder-worker`.
2. Go to **Settings → Domains & Routes → Add Custom Domain**.
3. Enter `api.makeuperfect.in` — SSL/TLS is provisioned automatically.
4. In the **reminderme** app, go to **Profile → Cloud Sync Server** and tap **Cloudflare Edge (`api.makeuperfect.in`)** (or set `VITE_API_BASE_URL=https://api.makeuperfect.in` before building Android/iOS).

---

## Endpoints Included

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Edge health & latency check (`engine: "cloudflare-worker-d1"`) |
| `GET` | `/privacy` | Hosted Privacy Policy HTML for Google Play & App Store |
| `POST` | `/api/signup` / `/api/login` / `/api/logout` | PBKDF2-SHA256 auth + Bearer & HttpOnly session |
| `GET` / `PATCH` | `/api/me` | Active profile, synced reminders, push device count |
| `GET` / `PUT` | `/api/reminders` | Atomic D1 batch sync for all user reminders & alarms |
| `POST` | `/api/reminders/:id/done` / `snooze` | Instant completion & snooze updates |
| `POST` | `/api/events` & `GET` `/api/analytics` | Streaks, activity insights, & admin summary |
| `GET` / `POST` | `/api/push/key`, `/subscribe`, `/fcm`, `/test` | Web Push + native Android/iOS FCM registration |
| `POST` | `/api/cron/check-reminders` | Protected manual trigger for the 1-minute edge alarm scheduler |
