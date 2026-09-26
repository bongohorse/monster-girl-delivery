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
    private static final String PERFORMANCE_EVIDENCE_STORAGE_KEY = "mgd:last-performance-evidence";
    private static final String MEMORY_EVIDENCE_STORAGE_KEY = "mgd:last-memory-evidence";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(EvidenceExportPlugin.class);
        super.onCreate(savedInstanceState);
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

            // Foundation persists the exact serialized evidence before it creates and clicks the
            // browser Blob download. Read that canonical payload instead of trying to fetch the
            // short-lived blob: URL after DownloadListener dispatch; the page revokes that URL on
            // the next task, which races the asynchronous native hand-off on real devices.
            // Blob downloads do not reliably carry the anchor's download filename through
            // WebView's DownloadListener. If it is missing, select the latest persisted report
            // instead of assuming the performance-evidence key.
            String requestedKind = safeFilename.startsWith("mgd-memory-")
                ? "memory"
                : safeFilename.startsWith("mgd-performance-")
                    && !safeFilename.equals("mgd-performance-evidence.json")
                    ? "performance"
                    : "";
            String script = "(async()=>{try{"
                + "const requested=" + JSONObject.quote(requestedKind) + ";"
                + "const entries=["
                + "{kind:'memory',content:localStorage.getItem("
                + JSONObject.quote(MEMORY_EVIDENCE_STORAGE_KEY)
                + ")},"
                + "{kind:'performance',content:localStorage.getItem("
                + JSONObject.quote(PERFORMANCE_EVIDENCE_STORAGE_KEY)
                + ")}"
                + "].filter(e=>typeof e.content==='string'&&e.content.length>0);"
                + "if(entries.length===0)throw new Error('No stored MGD evidence was found.');"
                + "const timestamp=e=>{try{return JSON.parse(e.content).capturedAtIso||''}"
                + "catch{return ''}};"
                + "const latest=entries.reduce((a,b)=>timestamp(a)>=timestamp(b)?a:b);"
                + "const selected=requested?entries.find(e=>e.kind===requested):latest;"
                + "if(!selected)throw new Error('Requested MGD evidence was not found.');"
                + "const filename=requested===selected.kind?"
                + JSONObject.quote(safeFilename)
                + ":'mgd-'+selected.kind+'-evidence.json';"
                + "const params={filename,content:selected.content};"
                + "const bridge=window.Capacitor;"
                + "if(bridge?.Plugins?.EvidenceExport?.share){"
                + "await bridge.Plugins.EvidenceExport.share(params);"
                + "}else if(typeof bridge?.nativePromise==='function'){"
                + "await bridge.nativePromise('EvidenceExport','share',params);"
                + "}else throw new Error('Native EvidenceExport bridge unavailable.');"
                + "}catch(error){"
                + "console.error('MGD native evidence export failed',error);"
                + "window.alert('MGD evidence export failed: '+(error?.message||String(error))"
                + "+' The report remains in WebView localStorage.');"
                + "}})();";

            getBridge().getWebView().post(
                () -> getBridge().getWebView().evaluateJavascript(script, null)
            );
        });
    }

    private void applyImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        DisplayCutoutPolicy.apply(getWindow(), android.os.Build.VERSION.SDK_INT);

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
