package in.makeuperfect.reminderme;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Android Home-Screen Widget displaying the next active alarm even when reminderme is closed.
 */
public class AlarmHomeWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateSingleWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void refreshAllWidgets(Context context) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, AlarmHomeWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                for (int id : ids) {
                    updateSingleWidget(context, mgr, id);
                }
            }
        } catch (Exception ignored) {}
    }

    private static void updateSingleWidget(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_alarm_home);
        JSONObject next = AlarmStore.getNextUpcomingAlarm(ctx);
        int activeCount = AlarmStore.getUpcomingAlarmCount(ctx);
        String timeFormat = AlarmStore.getTimeFormat(ctx);

        if (next != null) {
            String time = AlarmStore.formatHm(next.optString("time", ""), timeFormat);
            String title = next.optString("title", "Scheduled Alarm");
            views.setTextViewText(R.id.widget_alarm_time, time);
            views.setTextViewText(R.id.widget_alarm_title, title);
            views.setTextViewText(
                R.id.widget_alarm_status,
                activeCount + (activeCount == 1 ? " alarm active" : " alarms active")
            );
        } else {
            views.setTextViewText(R.id.widget_alarm_time, "--:--");
            views.setTextViewText(R.id.widget_alarm_title, "No upcoming alarms");
            views.setTextViewText(R.id.widget_alarm_status, "Tap to add an alarm");
        }

        Intent launchIntent = new Intent(ctx, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            ctx,
            7701,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pi);
        mgr.updateAppWidget(widgetId, views);
    }
}
