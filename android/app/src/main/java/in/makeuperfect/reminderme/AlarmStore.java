package in.makeuperfect.reminderme;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class AlarmStore {
    private static final String PREFS = "reminderme_native_alarms";
    private static final String KEY_ALARMS_JSON = "alarms_json";
    private static final String KEY_TIME_FORMAT = "time_format";
    private static final String KEY_CUSTOM_AUDIO_NAME = "custom_audio_name";
    private static final String KEY_PENDING_ACTION = "pending_action";
    private static final String KEY_PENDING_ID = "pending_id";
    private static final String KEY_PENDING_MINS = "pending_mins";
    private static final String CUSTOM_AUDIO_FILE = "custom_alarm_tone.audio";

    private AlarmStore() {}

    public static void saveAlarmsJson(Context ctx, String alarmsJson, String timeFormat) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit()
            .putString(KEY_ALARMS_JSON, alarmsJson != null ? alarmsJson : "[]")
            .putString(KEY_TIME_FORMAT, "24h".equals(timeFormat) ? "24h" : "12h")
            .apply();
    }

    public static String getAlarmsJson(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_ALARMS_JSON, "[]");
    }

    public static String getTimeFormat(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_TIME_FORMAT, "12h");
    }

    public static boolean saveCustomRingtone(Context ctx, String name, String base64Data) {
        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            File outFile = new File(ctx.getFilesDir(), CUSTOM_AUDIO_FILE);
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(bytes);
                fos.flush();
            }
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_CUSTOM_AUDIO_NAME, name != null ? name : "Custom Ringtone")
                .apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static void clearCustomRingtone(Context ctx) {
        File f = new File(ctx.getFilesDir(), CUSTOM_AUDIO_FILE);
        if (f.exists()) {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_CUSTOM_AUDIO_NAME)
            .apply();
    }

    public static File getCustomRingtoneFile(Context ctx) {
        File f = new File(ctx.getFilesDir(), CUSTOM_AUDIO_FILE);
        return f.exists() && f.length() > 0 ? f : null;
    }

    public static String getCustomRingtoneName(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CUSTOM_AUDIO_NAME, null);
    }

    public static void recordPendingAction(Context ctx, String action, String reminderId, int minutes) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PENDING_ACTION, action)
            .putString(KEY_PENDING_ID, reminderId)
            .putInt(KEY_PENDING_MINS, minutes)
            .apply();
    }

    public static JSONObject consumePendingAction(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String action = sp.getString(KEY_PENDING_ACTION, null);
        if (action == null) return null;
        String id = sp.getString(KEY_PENDING_ID, "");
        int mins = sp.getInt(KEY_PENDING_MINS, 5);
        sp.edit()
            .remove(KEY_PENDING_ACTION)
            .remove(KEY_PENDING_ID)
            .remove(KEY_PENDING_MINS)
            .apply();
        JSONObject out = new JSONObject();
        try {
            out.put("action", action);
            out.put("reminderId", id);
            out.put("minutes", mins);
        } catch (Exception ignored) {}
        return out;
    }

    public static int rescheduleAll(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;

        String raw = getAlarmsJson(ctx);
        String timeFormat = getTimeFormat(ctx);
        long now = System.currentTimeMillis();
        int scheduled = 0;

        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item == null) continue;
                long triggerAtMs = item.optLong("triggerAtMs", 0L);
                if (triggerAtMs <= now + 500L) continue;

                int reqCode = item.optInt("requestCode", 1000 + i);
                Intent fireIntent = new Intent(ctx, AlarmReceiver.class);
                fireIntent.setAction(AlarmReceiver.ACTION_FIRE_ALARM);
                fireIntent.putExtra("reminderId", item.optString("id", "alarm_" + i));
                fireIntent.putExtra("title", item.optString("title", "Alarm"));
                fireIntent.putExtra("note", item.optString("note", ""));
                fireIntent.putExtra("time", item.optString("time", ""));
                fireIntent.putExtra("timeFormat", timeFormat);
                fireIntent.putExtra("sound", item.optString("sound", "radar"));
                fireIntent.putExtra("isAlarm", item.optBoolean("isAlarm", true));
                fireIntent.putExtra("requestCode", reqCode);

                PendingIntent pi = PendingIntent.getBroadcast(
                    ctx,
                    reqCode,
                    fireIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                scheduleExactClock(ctx, am, triggerAtMs, pi, reqCode);
                scheduled++;
            }
        } catch (Exception ignored) {}

        AlarmHomeWidgetProvider.refreshAllWidgets(ctx);
        return scheduled;
    }

    public static void scheduleSnooze(
        Context ctx,
        String reminderId,
        String title,
        String note,
        String sound,
        String timeFormat,
        int minutes
    ) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        long triggerAtMs = System.currentTimeMillis() + (long) minutes * 60_000L;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.US);
        String newTime = sdf.format(new Date(triggerAtMs));
        int reqCode = Math.abs((reminderId + "_snooze").hashCode()) % 1_000_000 + 200_000;

        Intent fireIntent = new Intent(ctx, AlarmReceiver.class);
        fireIntent.setAction(AlarmReceiver.ACTION_FIRE_ALARM);
        fireIntent.putExtra("reminderId", reminderId);
        fireIntent.putExtra("title", title + " (Snoozed)");
        fireIntent.putExtra("note", note);
        fireIntent.putExtra("time", newTime);
        fireIntent.putExtra("timeFormat", timeFormat);
        fireIntent.putExtra("sound", sound);
        fireIntent.putExtra("isAlarm", true);
        fireIntent.putExtra("requestCode", reqCode);

        PendingIntent pi = PendingIntent.getBroadcast(
            ctx,
            reqCode,
            fireIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        scheduleExactClock(ctx, am, triggerAtMs, pi, reqCode);
        AlarmHomeWidgetProvider.refreshAllWidgets(ctx);
    }

    public static boolean scheduleLockScreenTest(Context ctx, int delaySec, String timeFormat) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return false;

        long triggerAtMs = System.currentTimeMillis() + Math.max(3, delaySec) * 1000L;
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.US);
        String timeStr = sdf.format(new Date(triggerAtMs));
        int reqCode = 991_420;

        Intent fireIntent = new Intent(ctx, AlarmReceiver.class);
        fireIntent.setAction(AlarmReceiver.ACTION_FIRE_ALARM);
        fireIntent.putExtra("reminderId", "lockscreen-test");
        fireIntent.putExtra("title", "Lock-Screen Alarm Test");
        fireIntent.putExtra("note", "Swipe up to dismiss or tap a snooze pill");
        fireIntent.putExtra("time", timeStr);
        fireIntent.putExtra("timeFormat", timeFormat);
        fireIntent.putExtra("sound", getCustomRingtoneFile(ctx) != null ? "custom" : "radar");
        fireIntent.putExtra("isAlarm", true);
        fireIntent.putExtra("requestCode", reqCode);

        PendingIntent pi = PendingIntent.getBroadcast(
            ctx,
            reqCode,
            fireIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        scheduleExactClock(ctx, am, triggerAtMs, pi, reqCode);
        return true;
    }

    private static void scheduleExactClock(
        Context ctx,
        AlarmManager am,
        long triggerAtMs,
        PendingIntent firePi,
        int reqCode
    ) {
        Intent showAppIntent = new Intent(ctx, MainActivity.class);
        showAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent showPi = PendingIntent.getActivity(
            ctx,
            reqCode + 500_000,
            showAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAtMs, showPi);
            am.setAlarmClock(info, firePi);
        } catch (SecurityException se) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, firePi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, firePi);
            }
        }
    }

    public static JSONObject getNextUpcomingAlarm(Context ctx) {
        long now = System.currentTimeMillis();
        JSONObject soonest = null;
        long soonestMs = Long.MAX_VALUE;
        try {
            JSONArray arr = new JSONArray(getAlarmsJson(ctx));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item == null) continue;
                long ts = item.optLong("triggerAtMs", 0L);
                if (ts > now && ts < soonestMs) {
                    soonestMs = ts;
                    soonest = item;
                }
            }
        } catch (Exception ignored) {}
        return soonest;
    }

    public static int getUpcomingAlarmCount(Context ctx) {
        long now = System.currentTimeMillis();
        int count = 0;
        try {
            JSONArray arr = new JSONArray(getAlarmsJson(ctx));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null && item.optLong("triggerAtMs", 0L) > now) {
                    count++;
                }
            }
        } catch (Exception ignored) {}
        return count;
    }

    public static String formatHm(String hhmm, String timeFormat) {
        if (hhmm == null || !hhmm.contains(":")) return hhmm != null ? hhmm : "--:--";
        try {
            String[] parts = hhmm.split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            if ("24h".equals(timeFormat)) {
                return String.format(Locale.US, "%02d:%02d", h, m);
            }
            String period = h >= 12 ? "PM" : "AM";
            int h12 = h % 12;
            if (h12 == 0) h12 = 12;
            return String.format(Locale.US, "%d:%02d %s", h12, m, period);
        } catch (Exception e) {
            return hhmm;
        }
    }
}
