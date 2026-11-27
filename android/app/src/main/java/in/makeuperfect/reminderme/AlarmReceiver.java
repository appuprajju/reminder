package in.makeuperfect.reminderme;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_FIRE_ALARM = "in.makeuperfect.reminderme.ACTION_FIRE_ALARM";
    public static final String CHANNEL_LOCKSCREEN_ALARM = "reminderme_lockscreen_alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            AlarmStore.rescheduleAll(context);
            return;
        }

        String reminderId = intent.getStringExtra("reminderId");
        String title = intent.getStringExtra("title");
        String note = intent.getStringExtra("note");
        String time = intent.getStringExtra("time");
        String timeFormat = intent.getStringExtra("timeFormat");
        String sound = intent.getStringExtra("sound");
        int requestCode = intent.getIntExtra("requestCode", 4201);

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "reminderme:alarm_wakelock"
            );
            wakeLock.acquire(15_000L);
        }

        try {
            ensureAlarmChannel(context);

            Intent fullScreenIntent = new Intent(context, LockScreenAlarmActivity.class);
            fullScreenIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP
                    | Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            fullScreenIntent.putExtra("reminderId", reminderId);
            fullScreenIntent.putExtra("title", title != null ? title : "Alarm");
            fullScreenIntent.putExtra("note", note != null ? note : "");
            fullScreenIntent.putExtra("time", time != null ? time : "");
            fullScreenIntent.putExtra("timeFormat", timeFormat != null ? timeFormat : "12h");
            fullScreenIntent.putExtra("sound", sound != null ? sound : "radar");
            fullScreenIntent.putExtra("notificationId", requestCode);

            PendingIntent fullScreenPi = PendingIntent.getActivity(
                context,
                requestCode,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Notification notification = new NotificationCompat.Builder(context, CHANNEL_LOCKSCREEN_ALARM)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title != null ? title : "reminderme Alarm")
                .setContentText(
                    note != null && !note.isEmpty()
                        ? note
                        : "Swipe up to dismiss or tap snooze"
                )
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(fullScreenPi, true)
                .setContentIntent(fullScreenPi)
                .build();

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(requestCode, notification);
            }

            try {
                context.startActivity(fullScreenIntent);
            } catch (Exception ignored) {
                // On Android 14+ when locked, FullScreenIntent launches LockScreenAlarmActivity automatically
            }

            AlarmHomeWidgetProvider.refreshAllWidgets(context);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    private static void ensureAlarmChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_LOCKSCREEN_ALARM) != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_LOCKSCREEN_ALARM,
            "Lock-Screen Full Alarms",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Wakes your lock screen with swipe-up dismiss and snooze gestures even when closed.");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(true);
        channel.setBypassDnd(true);
        // LockScreenAlarmActivity handles audio playback directly on USAGE_ALARM stream
        channel.setSound(null, new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build());
        nm.createNotificationChannel(channel);
    }
}
