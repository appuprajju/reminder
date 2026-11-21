# Glassy Daily — 3D glass reminders with real phone notifications

## What's inside
- **Login / sign-up**: each person's reminders are saved to their own account and sync across devices.
- **Real phone notifications (Web Push)**: reminders arrive on the lock screen even when the app is closed, with **Mark done** and **Snooze 10 min** buttons.
- **App icon**: a glossy bell icon for the Home Screen, app drawer and browser tab. You can install it like a normal app.
- **Usage analytics**: the 📊 Usage button shows how each feature is used. The first account created (or any email in `ADMIN_EMAILS`) also sees **All users**.
- **Enable alerts fix**: the old "Alerts not allowed" message is gone. The app now explains exactly why alerts can't turn on and how to fix it.

## Why "Alerts not allowed" happened
Phones and browsers only allow notifications when **all** of these are true:
1. The app is opened from a secure **https://** web address. A file opened on the phone, or a preview window, is refused automatically.
2. On **iPhone/iPad**, the app is added to the **Home Screen** (iOS 16.4 or newer) and opened from there.
3. You tap **Allow** when asked. If you tapped Block before, it has to be switched back on in settings, and the app now shows those steps.

## Put it online (about 5 minutes, free https)
Any Node host works. Two easy options:

**Render.com**
1. Put this folder in a GitHub repo.
2. On render.com, choose **New → Blueprint** and pick the repo. It reads `render.yaml`, which includes a small disk so accounts are kept.
3. Open the https://…onrender.com address on your phone.

**Railway / Fly.io / a VPS**
- Run `npm install` then `npm start` (port from `PORT`, default 3000).
- Keep the `data/` folder (or `DATA_DIR`) on persistent storage. It holds the accounts and the push keys.
- Put it behind https. Push will not work on plain http, except on `localhost` on a computer.

**Try on your computer first:** `npm install && npm start`, then open http://localhost:3000.

## Turn on notifications on your phone
- **Android (Chrome):** open the https link, tap **⬇️ Install app** (optional), then tap **🔔 Enable alerts** and choose **Allow**.
- **iPhone (Safari):** open the https link, tap **Share → Add to Home Screen**, open the app from the Home Screen, tap **🔔 Enable alerts**, then choose **Allow**.
- Tap **Test notification** to receive a real push right away.

## Settings (optional environment variables)
| Name | What it does |
|---|---|
| `PORT` | Web port (default 3000) |
| `DATA_DIR` | Where accounts, reminders and analytics are stored (default `./data`) |
| `ADMIN_EMAILS` | Comma-separated emails that can see all-user analytics (default: the first account) |
| `VAPID_SUBJECT` | Contact email for push services, e.g. `mailto:you@example.com` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Fixed push keys (otherwise they are created once and saved in `DATA_DIR`) |

## Checks
- `sh scripts/verify-server.sh`: accounts, sync, analytics and the push scheduler (35 checks)
- `sh scripts/verify-client.sh`: app page wiring (20 checks)
- `sh scripts/verify-icons.sh`: icons and manifest (20 checks)
