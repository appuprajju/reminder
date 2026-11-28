package in.makeuperfect.reminderme;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmBridgePlugin.class);
        super.onCreate(savedInstanceState);

        final int appBgColor = Color.parseColor("#060812");
        Window window = getWindow();
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, true);
            window.setStatusBarColor(appBgColor);
            window.setNavigationBarColor(appBgColor);

            View decorView = window.getDecorView();
            decorView.setBackgroundColor(appBgColor);

            WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, decorView);
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        }

        // Android 15/16 (API 35/36) enforces edge-to-edge by default.
        // Applying systemBars + displayCutout + IME insets to android.R.id.content
        // guarantees the WebView never hides under the status bar, camera notch,
        // bottom gesture bar, or soft keyboard on any Android device.
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(appBgColor);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                int bottomInset = Math.max(bars.bottom, ime.bottom);
                view.setPadding(bars.left, bars.top, bars.right, bottomInset);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }
}
