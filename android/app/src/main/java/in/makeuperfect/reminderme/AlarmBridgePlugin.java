package in.makeuperfect.reminderme;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

@CapacitorPlugin(name = "AlarmBridge")
public class AlarmBridgePlugin extends Plugin {

    @PluginMethod
    public void syncAlarms(PluginCall call) {
        String alarmsJson = call.getString("alarmsJson", "[]");
        String timeFormat = call.getString("timeFormat", "12h");
        AlarmStore.saveAlarmsJson(getContext(), alarmsJson, timeFormat);
        int count = AlarmStore.rescheduleAll(getContext());

        JSObject ret = new JSObject();
        ret.put("scheduled", count);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleLockScreenTest(PluginCall call) {
        int delaySec = call.getInt("delaySec", 10);
        String timeFormat = call.getString("timeFormat", "12h");
        boolean ok = AlarmStore.scheduleLockScreenTest(getContext(), delaySec, timeFormat);

        JSObject ret = new JSObject();
        ret.put("ok", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void saveCustomRingtone(PluginCall call) {
        String name = call.getString("name", "Custom Ringtone");
        String base64 = call.getString("base64", "");
        boolean ok = AlarmStore.saveCustomRingtone(getContext(), name, base64);

        JSObject ret = new JSObject();
        ret.put("ok", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearCustomRingtone(PluginCall call) {
        AlarmStore.clearCustomRingtone(getContext());
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void consumePendingAction(PluginCall call) {
        JSONObject pending = AlarmStore.consumePendingAction(getContext());
        JSObject ret = new JSObject();
        if (pending != null) {
            ret.put("action", pending.optString("action", ""));
            ret.put("reminderId", pending.optString("reminderId", ""));
            ret.put("minutes", pending.optInt("minutes", 5));
        }
        call.resolve(ret);
    }
}
