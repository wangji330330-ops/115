package com.wangji.luckystudy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;

/**
 * Receives the result of a PackageInstaller session. On Android the first
 * callback is usually STATUS_PENDING_USER_ACTION: we start the system installer
 * confirmation activity, which is the only step a normal app cannot skip.
 */
public class InstallResultReceiver extends BroadcastReceiver {

    public static final String EXTRA_SESSION_ID = "session_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1);
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmation = null;
            if (Build.VERSION.SDK_INT >= 33) {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                //noinspection deprecation
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }
            if (confirmation != null) {
                confirmation.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    context.startActivity(confirmation);
                } catch (Exception ignored) {
                    NativeBridge.notifyInstallFailure(status, "无法打开系统安装界面。");
                }
            } else {
                NativeBridge.notifyInstallFailure(status, "系统没有返回安装确认界面。");
            }
            return;
        }

        if (status == PackageInstaller.STATUS_SUCCESS) {
            // Android usually restarts the app after replacing the APK. Nothing
            // else is required here; local WebView data stays intact.
            return;
        }

        NativeBridge.notifyInstallFailure(status, message);
    }
}
