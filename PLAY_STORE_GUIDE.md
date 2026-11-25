# reminderme — Google Play Store Release Guide

This project is pre-configured with **Capacitor Android** (`in.makeuperfect.reminderme`) and OS-level closed-app / lock-screen alarm scheduling so you can compile and publish a real Android App Bundle (`.aab`) directly to the Google Play Console.

## 1. How Closed-App & Lock-Screen Delivery Works

When the app is closed and the phone is locked, **reminderme** never tries to keep the WebView or foreground process alive:
1. **Android OS `AlarmManager` (Offline-Safe Primary)**: Every created or edited reminder is registered via `@capacitor/local-notifications` with `allowWhileIdle: true` on two high-priority channels (`reminderme_alarms` with MAX importance and lock-screen actions `Snooze 5 min` / `Dismiss`, and `reminderme_reminders` with HIGH importance).
2. **Reboot Persistence**: `RECEIVE_BOOT_COMPLETED` ensures scheduled alarms are restored automatically after a device reboot.
3. **Server-Side Push Infrastructure (Cloud Backup & Multi-Device)**: `server.js` runs an independent background scheduler dispatching high-urgency pushes to subscribed devices (Web Push + FCM token hook at `POST /api/push/fcm`).

## 2. Serverless Edge Backend (Cloudflare Worker + D1 — Recommended)

Instead of manually starting `node server.js`, deploy the edge backend in `/worker/` so accounts, sync, `/privacy`, and 1-minute push cron run globally on Cloudflare's free tier:

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 execute reminder-db --remote --file=./schema.sql
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put CRON_SECRET
npx wrangler deploy
```

Attach custom domain `api.makeuperfect.in` in Cloudflare Dashboard → **Workers & Pages → reminder-worker → Domains & Routes**.

## 3. Build the Android Project Locally

Prerequisites: Node.js 18+, Android Studio (with Android SDK 35 & JDK 17).

```bash
npm install
VITE_API_BASE_URL=https://api.makeuperfect.in npm run build
npx cap add android   # only needed if android/ folder is not yet created
npx cap sync android
npx cap open android
```

## 3. Required AndroidManifest Permissions (Pre-Configured)

Verify `android/app/src/main/AndroidManifest.xml` includes:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## 4. Enable Remote FCM Push (Optional alongside OS AlarmManager)

1. Create a Firebase project and register Android app `in.makeuperfect.reminderme`.
2. Download `google-services.json` and place it in `android/app/google-services.json`.
3. Set your deployed HTTPS backend URL in **Profile → Cloud Sync Server URL** (or set `VITE_API_BASE_URL` before running `npm run build`).

## 5. Generate Signed `.aab` for Google Play Console

In Android Studio:
1. Choose **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. Create a new Upload Keystore (`.jks`) and keep a secure backup.
3. Select the **release** build variant to generate `android/app/release/app-release.aab`.
4. Alternatively via CLI:
   ```bash
   npm run android:aab
   ```

## 6. Play Console Declarations Checklist

- **Privacy Policy URL**: `https://<your-deployed-domain>/privacy` (already served by `server.js`).
- **Exact Alarm Declaration**: Select *Alarm clock / Calendar & Reminder app* as core functionality.
- **Data Safety**:
  - Guest mode stores all data locally on device.
  - Optional account mode collects Email & Name for sync and authentication; passwords are salted and hashed with `scrypt`; data is encrypted in transit (HTTPS) and never shared with third parties.
- **Store Listing Assets**: App icon (`512x512` in `/public/icons/icon-512.png`), Feature Graphic (`1024x500`), and at least 2 phone screenshots (`1080x1920`).
