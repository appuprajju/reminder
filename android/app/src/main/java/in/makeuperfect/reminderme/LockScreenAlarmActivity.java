package in.makeuperfect.reminderme;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import java.io.File;

/**
 * Full-screen Android Lock-Screen Alarm Activity.
 * Wakes the locked screen even when reminderme is completely closed,
 * plays custom or system alarm audio on USAGE_ALARM stream,
 * and provides Swipe Up to Dismiss + 5m / 10m / 15m Snooze Pills.
 */
public class LockScreenAlarmActivity extends Activity {
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private String reminderId = "";
    private String alarmTitle = "Alarm";
    private String alarmNote = "";
    private String alarmSound = "radar";
    private String timeFormat = "12h";
    private int notificationId = 4201;

    private float touchStartY = 0f;
    private static final float SWIPE_UP_THRESHOLD_PX = 220f;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Wake screen and display directly over the Android lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setContentView(R.layout.activity_lock_screen_alarm);

        if (getIntent() != null) {
            reminderId = safe(getIntent().getStringExtra("reminderId"), "");
            alarmTitle = safe(getIntent().getStringExtra("title"), "Alarm");
            alarmNote = safe(getIntent().getStringExtra("note"), "");
            alarmSound = safe(getIntent().getStringExtra("sound"), "radar");
            timeFormat = safe(getIntent().getStringExtra("timeFormat"), "12h");
            notificationId = getIntent().getIntExtra("notificationId", 4201);
        }

        String rawTime = getIntent() != null ? safe(getIntent().getStringExtra("time"), "") : "";
        TextView timeView = findViewById(R.id.lock_alarm_time);
        TextView titleView = findViewById(R.id.lock_alarm_title);
        TextView noteView = findViewById(R.id.lock_alarm_note);
        TextView soundView = findViewById(R.id.lock_alarm_sound);
        TextView swipeHint = findViewById(R.id.lock_swipe_hint);
        View swipeHandle = findViewById(R.id.lock_swipe_handle);

        timeView.setText(AlarmStore.formatHm(rawTime, timeFormat));
        titleView.setText(alarmTitle);
        if (!alarmNote.isEmpty()) {
            noteView.setText(alarmNote);
            noteView.setVisibility(View.VISIBLE);
        } else {
            noteView.setVisibility(View.GONE);
        }

        String customName = AlarmStore.getCustomRingtoneName(this);
        if ("custom".equals(alarmSound) && customName != null && !customName.isEmpty()) {
            soundView.setText("Ringtone: " + customName);
        } else {
            soundView.setText("Ringtone: " + alarmSound);
        }

        // Snooze pills: 5m, 10m, 15m
        Button snooze5 = findViewById(R.id.btn_snooze_5);
        Button snooze10 = findViewById(R.id.btn_snooze_10);
        Button snooze15 = findViewById(R.id.btn_snooze_15);
        Button fallbackDismiss = findViewById(R.id.btn_dismiss_fallback);

        snooze5.setOnClickListener(v -> handleSnooze(5));
        snooze10.setOnClickListener(v -> handleSnooze(10));
        snooze15.setOnClickListener(v -> handleSnooze(15));
        fallbackDismiss.setOnClickListener(v -> handleDismiss());

        // Tactile Swipe Up to Dismiss gesture on the bottom handle
        swipeHandle.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    touchStartY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float dyUp = Math.max(0f, touchStartY - event.getRawY());
                    float clamped = Math.min(dyUp, SWIPE_UP_THRESHOLD_PX * 1.15f);
                    v.setTranslationY(-clamped);
                    if (dyUp >= SWIPE_UP_THRESHOLD_PX) {
                        swipeHint.setText("Release to Dismiss");
                    } else {
                        swipeHint.setText("Swipe Up to Dismiss");
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    float releaseUp = Math.max(0f, touchStartY - event.getRawY());
                    if (releaseUp >= SWIPE_UP_THRESHOLD_PX) {
                        handleDismiss();
                    } else {
                        v.animate().translationY(0f).setDuration(200).start();
                        swipeHint.setText("Swipe Up to Dismiss");
                    }
                    return true;
                default:
                    return false;
            }
        });

        startAlarmPlayback();
    }

    private void startAlarmPlayback() {
        stopAlarmPlayback();
        try {
            mediaPlayer = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            mediaPlayer.setAudioAttributes(attrs);
            mediaPlayer.setLooping(true);

            File customFile = "custom".equals(alarmSound) ? AlarmStore.getCustomRingtoneFile(this) : null;
            if (customFile != null) {
                mediaPlayer.setDataSource(customFile.getAbsolutePath());
            } else {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                mediaPlayer.setDataSource(this, alarmUri);
            }
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception ignored) {}

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 450, 250, 450, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    //noinspection deprecation
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopAlarmPlayback() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
        }
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(notificationId);
        }
    }

    private void handleSnooze(int minutes) {
        stopAlarmPlayback();
        AlarmStore.scheduleSnooze(this, reminderId, alarmTitle, alarmNote, alarmSound, timeFormat, minutes);
        AlarmStore.recordPendingAction(this, "snooze", reminderId, minutes);
        finish();
    }

    private void handleDismiss() {
        stopAlarmPlayback();
        AlarmStore.recordPendingAction(this, "dismiss", reminderId, 0);
        AlarmHomeWidgetProvider.refreshAllWidgets(this);
        finish();
    }

    @Override
    protected void onDestroy() {
        stopAlarmPlayback();
        super.onDestroy();
    }

    private static String safe(String val, String fallback) {
        return val != null ? val : fallback;
    }
}
