package com.bongohorse.monstergirldelivery;

import android.os.Bundle;
import android.webkit.URLUtil;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(EvidenceExportPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        installEvidenceDownloadHandler();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // MGD is a single-screen game. Consume Android's back gesture/button so
                // an accidental edge swipe cannot minimize/leave the game during play.
            }
        });
        applyImmersiveFullscreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }

    private void installEvidenceDownloadHandler() {
        getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || !url.startsWith("blob:")) {
                return;
            }

            String guessedFilename = URLUtil.guessFileName(url, contentDisposition, mimeType);
            String safeFilename = guessedFilename == null
                ? "mgd-performance-evidence.json"
                : guessedFilename.replaceAll("[^A-Za-z0-9._-]", "-");
            if (safeFilename.length() == 0 || safeFilename.length() > 180) {
                safeFilename = "mgd-performance-evidence.json";
            }
            if (!safeFilename.toLowerCase().endsWith(".json")) {
                safeFilename = "mgd-performance-evidence.json";
            }

            String script = "(async()=>{try{"
                + "const response=await fetch(" + JSONObject.quote(url) + ");"
                + "const content=await response.text();"
                + "await window.Capacitor.Plugins.EvidenceExport.share({filename:"
                + JSONObject.quote(safeFilename)
                + ",content});"
                + "}catch(error){"
                + "console.error('MGD native evidence export failed',error);"
                + "window.alert('MGD evidence export failed. The evidence remains stored locally.');"
                + "}})();";

            getBridge().getWebView().post(
                () -> getBridge().getWebView().evaluateJavascript(script, null)
            );
        });
    }

    private void applyImmersiveFullscreen() {
        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController == null) {
            return;
        }

        insetsController.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        insetsController.hide(WindowInsetsCompat.Type.systemBars());
    }
}
