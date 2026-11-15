package com.wangji.luckystudy;

import android.content.pm.PackageInfo;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.lang.ref.WeakReference;

/**
 * Small, deliberately narrow bridge to the local web UI.
 *
 * The WebView only ever displays the app's own localhost page, external links
 * are handed to the browser, and every exposed method is an allow-listed
 * operation. No arbitrary file or shell access is available to JavaScript.
 */
public class NativeBridge {

    private static WeakReference<NativeBridge> activeBridge;

    private final MainActivity activity;
    private final WebView webView;
    private final UpdateManager updateManager;
    private final DataManager dataManager;

    public NativeBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.updateManager = new UpdateManager(activity, this);
        this.dataManager = new DataManager(activity, this);
        activeBridge = new WeakReference<>(this);
    }

    public DataManager getDataManager() {
        return dataManager;
    }

    public UpdateManager getUpdateManager() {
        return updateManager;
    }

    public void dispose() {
        if (activeBridge != null && activeBridge.get() == this) {
            activeBridge.clear();
        }
    }

    public void sendEvent(JSONObject event) {
        if (event == null || webView == null) return;
        final String payload = event.toString();
        webView.post(new Runnable() {
            @Override
            public void run() {
                if (webView == null) return;
                String script = "if(window.LuckyNative&&window.LuckyNative.onEvent){window.LuckyNative.onEvent("
                        + JSONObject.quote(payload) + ");}";
                try {
                    webView.evaluateJavascript(script, null);
                } catch (Exception ignored) {
                    // The page may already be gone during an update.
                }
            }
        });
    }

    static void notifyInstallFailure(int status, String message) {
        NativeBridge bridge = activeBridge != null ? activeBridge.get() : null;
        if (bridge == null) return;
        try {
            JSONObject event = new JSONObject();
            event.put("kind", "update");
            event.put("status", "error");
            event.put("error", "安装没有完成：" + (message == null ? "已取消或系统拒绝安装。" : message));
            event.put("installerStatus", status);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private int readVersionCode() {
        try {
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) {
                return (int) info.getLongVersionCode();
            }
            return info.versionCode;
        } catch (Exception error) {
            return BuildConfigVersion.FALLBACK_CODE;
        }
    }

    private String readVersionName() {
        try {
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            return info.versionName == null ? BuildConfigVersion.FALLBACK_NAME : info.versionName;
        } catch (Exception error) {
            return BuildConfigVersion.FALLBACK_NAME;
        }
    }

    @JavascriptInterface
    public String getVersionName() {
        return readVersionName();
    }

    @JavascriptInterface
    public int getVersionCode() {
        return readVersionCode();
    }

    @JavascriptInterface
    public String getPlatform() {
        return "android";
    }

    @JavascriptInterface
    public String getSavePath() {
        return dataManager.getSavePathLabel();
    }

    @JavascriptInterface
    public void chooseSaveFolder() {
        dataManager.chooseSaveFolder();
    }

    @JavascriptInterface
    public void exportData(String filename, String content) {
        dataManager.exportData(filename, content);
    }

    @JavascriptInterface
    public void checkForUpdate() {
        updateManager.checkForUpdate();
    }

    @JavascriptInterface
    public void downloadAndInstallUpdate() {
        updateManager.downloadAndInstall();
    }

    @JavascriptInterface
    public void openInstallPermissionSettings() {
        updateManager.openUnknownSourcesSettings();
    }

    /** Keeps the JS fallback versions in one place without a generated BuildConfig. */
    private static final class BuildConfigVersion {
        static final int FALLBACK_CODE = 9;
        static final String FALLBACK_NAME = "1.4.0";
    }
}
