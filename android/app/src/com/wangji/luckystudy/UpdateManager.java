package com.wangji.luckystudy;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * In-app update pipeline:
 *   check a small JSON manifest -> download the APK into app cache ->
 *   verify SHA-256 + package/version -> hand it to Android PackageInstaller.
 *
 * Android does not permit a sideloaded app to silently install another APK.
 * The system confirmation dialog is still shown, but the browser/file-manager
 * detour is removed.
 */
public class UpdateManager {

    private static final String UPDATE_URL =
            "https://wangji330330-ops.github.io/115/update.json";
    private static final String USER_AGENT = "LuckyStudyMachine-Updater/1.0";
    private static final int CONNECT_TIMEOUT_MS = 20000;
    private static final int READ_TIMEOUT_MS = 30000;

    private final Activity activity;
    private final NativeBridge bridge;
    private volatile boolean checking;
    private volatile boolean downloading;
    private volatile JSONObject latestManifest;

    public UpdateManager(Activity activity, NativeBridge bridge) {
        this.activity = activity;
        this.bridge = bridge;
    }

    public void checkForUpdate() {
        if (checking || downloading) return;
        checking = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject manifest = fetchManifest();
                    String packageName = manifest.optString("packageName", "");
                    if (!packageName.isEmpty() && !activity.getPackageName().equals(packageName)) {
                        throw new IOException("更新清单与应用包名不一致。");
                    }

                    int latestCode = manifest.getInt("versionCode");
                    String latestName = manifest.getString("versionName");
                    if (latestCode <= 0 || latestName.trim().isEmpty()) {
                        throw new IOException("更新清单缺少版本信息。");
                    }
                    String apkUrl = resolveApkUrl(manifest.optString("apkUrl", ""));
                    String sha256 = manifest.optString("sha256", "");
                    latestManifest = manifest;
                    latestManifest.put("apkUrlResolved", apkUrl);

                    JSONObject event = baseUpdateEvent();
                    event.put("versionCode", latestCode);
                    event.put("versionName", latestName);
                    event.put("latestVersionCode", latestCode);
                    event.put("latestVersionName", latestName);
                    event.put("publishedAt", manifest.optString("publishedAt", ""));
                    event.put("apkUrl", apkUrl);
                    event.put("sha256", sha256);
                    event.put("size", manifest.optLong("size", 0));
                    event.put("notes", manifest.optJSONArray("notes") == null
                            ? new JSONArray() : manifest.optJSONArray("notes"));
                    event.put("status", latestCode > currentVersionCode() ? "available" : "latest");
                    bridge.sendEvent(event);
                } catch (Exception error) {
                    sendError("检查更新失败：" + readable(error));
                } finally {
                    checking = false;
                }
            }
        }, "lucky-update-check").start();
    }

    public void downloadAndInstall() {
        if (downloading) return;
        if (latestManifest == null) {
            sendError("还没有可安装的更新，请先检查更新。");
            return;
        }

        final int currentCode = currentVersionCode();
        final int latestCode = latestManifest.optInt("versionCode", 0);
        if (latestCode <= currentCode) {
            sendError("当前已经是最新版本。");
            return;
        }

        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            try {
                JSONObject event = baseUpdateEvent();
                event.put("status", "permission-needed");
                bridge.sendEvent(event);
            } catch (Exception ignored) {
                // ignore
            }
            openUnknownSourcesSettings();
            return;
        }

        final String apkUrl = latestManifest.optString("apkUrlResolved", "");
        final String expectedSha = latestManifest.optString("sha256", "");
        final long expectedSize = latestManifest.optLong("size", 0);
        if (apkUrl.isEmpty() || expectedSha.isEmpty()) {
            sendError("更新清单缺少安装包地址或校验值。");
            return;
        }

        downloading = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                File updateFile = new File(activity.getCacheDir(), "lucky-update-" + latestCode + ".apk");
                try {
                    downloadApk(apkUrl, updateFile, expectedSize);
                    sendProgress(100);

                    JSONObject verifyEvent = baseUpdateEvent();
                    verifyEvent.put("status", "verifying");
                    verifyEvent.put("versionCode", latestCode);
                    verifyEvent.put("versionName", latestManifest.optString("versionName", ""));
                    bridge.sendEvent(verifyEvent);

                    String actualSha = sha256(updateFile);
                    if (!actualSha.equalsIgnoreCase(expectedSha)) {
                        updateFile.delete();
                        throw new IOException("安装包完整性校验失败，已停止安装。");
                    }

                    verifyArchive(updateFile, latestCode);
                    installPackage(updateFile);

                    JSONObject installingEvent = baseUpdateEvent();
                    installingEvent.put("status", "installing");
                    installingEvent.put("versionCode", latestCode);
                    installingEvent.put("versionName", latestManifest.optString("versionName", ""));
                    bridge.sendEvent(installingEvent);
                } catch (Exception error) {
                    updateFile.delete();
                    sendError("更新失败：" + readable(error));
                } finally {
                    downloading = false;
                }
            }
        }, "lucky-update-download").start();
    }

    public void openUnknownSourcesSettings() {
        if (Build.VERSION.SDK_INT < 26) return;
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent intent = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())
                    );
                    activity.startActivity(intent);
                } catch (Exception firstError) {
                    try {
                        activity.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));
                    } catch (Exception ignored) {
                        // The JS notice remains the only guidance.
                    }
                }
            }
        });
    }

    private JSONObject fetchManifest() throws Exception {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(UPDATE_URL);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setRequestProperty("Accept", "application/json");
            connection.setInstanceFollowRedirects(true);
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("服务器返回 HTTP " + code);
            }
            InputStream input = new BufferedInputStream(connection.getInputStream());
            String text = readText(input);
            return new JSONObject(text);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void downloadApk(String apkUrl, File target, long expectedSize) throws Exception {
        HttpURLConnection connection = null;
        InputStream input = null;
        OutputStream output = null;
        try {
            URL url = new URL(apkUrl);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                throw new IOException("更新地址必须使用 HTTPS。");
            }
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setInstanceFollowRedirects(true);
            int code = connection.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("下载服务器返回 HTTP " + code);
            }
            long total = connection.getContentLengthLong();
            if (total <= 0 && expectedSize > 0) total = expectedSize;

            input = new BufferedInputStream(connection.getInputStream());
            output = new FileOutputStream(target);
            byte[] buffer = new byte[16384];
            long written = 0;
            int read;
            int lastPercent = -1;
            long lastEmit = 0;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                written += read;
                if (total > 0) {
                    int percent = (int) Math.min(99, (written * 100) / total);
                    long now = System.currentTimeMillis();
                    if (percent != lastPercent && (percent >= lastPercent + 2 || now - lastEmit > 160)) {
                        lastPercent = percent;
                        lastEmit = now;
                        sendProgress(percent);
                    }
                }
            }
            output.flush();
            if (target.length() <= 0) {
                throw new IOException("下载到的安装包是空的。");
            }
            if (expectedSize > 0 && target.length() != expectedSize) {
                throw new IOException("安装包大小与更新清单不一致。");
            }
        } finally {
            if (output != null) {
                try { output.close(); } catch (IOException ignored) { }
            }
            if (input != null) {
                try { input.close(); } catch (IOException ignored) { }
            }
            if (connection != null) connection.disconnect();
        }
    }

    private void verifyArchive(File file, int expectedCode) throws Exception {
        PackageManager manager = activity.getPackageManager();
        PackageInfo archive = manager.getPackageArchiveInfo(file.getAbsolutePath(), 0);
        if (archive == null) {
            throw new IOException("无法读取下载的安装包。");
        }
        if (!activity.getPackageName().equals(archive.packageName)) {
            throw new IOException("安装包不属于幸运学习机，已停止安装。");
        }
        int archiveCode;
        if (Build.VERSION.SDK_INT >= 28) {
            archiveCode = (int) archive.getLongVersionCode();
        } else {
            archiveCode = archive.versionCode;
        }
        if (archiveCode != expectedCode) {
            throw new IOException("安装包版本与更新清单不一致。");
        }
    }

    private void installPackage(final File file) throws Exception {
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            throw new IOException("还没有获得安装未知应用的权限。");
        }

        PackageManager packageManager = activity.getPackageManager();
        PackageInstaller installer = packageManager.getPackageInstaller();
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(activity.getPackageName());

        int sessionId = installer.createSession(params);
        PackageInstaller.Session session = installer.openSession(sessionId);
        try {
            OutputStream out = session.openWrite("base.apk", 0, file.length());
            FileInputStream in = new FileInputStream(file);
            try {
                byte[] buffer = new byte[16384];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                session.fsync(out);
            } finally {
                try { in.close(); } catch (IOException ignored) { }
                try { out.close(); } catch (IOException ignored) { }
            }

            Intent resultIntent = new Intent(activity, InstallResultReceiver.class);
            resultIntent.putExtra(InstallResultReceiver.EXTRA_SESSION_ID, sessionId);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    activity, sessionId, resultIntent, flags);
            session.commit(pendingIntent.getIntentSender());
        } catch (Exception error) {
            session.abandon();
            throw error;
        } finally {
            session.close();
        }
    }

    private int currentVersionCode() {
        try {
            PackageInfo info = activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return (int) info.getLongVersionCode();
            return info.versionCode;
        } catch (Exception error) {
            return -1;
        }
    }

    private JSONObject baseUpdateEvent() throws Exception {
        JSONObject event = new JSONObject();
        event.put("kind", "update");
        try {
            PackageInfo info = activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0);
            int code = Build.VERSION.SDK_INT >= 28
                    ? (int) info.getLongVersionCode() : info.versionCode;
            event.put("currentVersionCode", code);
            event.put("currentVersionName", info.versionName == null ? "" : info.versionName);
        } catch (Exception error) {
            event.put("currentVersionCode", -1);
            event.put("currentVersionName", "");
        }
        return event;
    }

    private void sendProgress(int percent) {
        try {
            JSONObject event = baseUpdateEvent();
            event.put("status", "downloading");
            event.put("progress", percent);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void sendError(String message) {
        try {
            JSONObject event = baseUpdateEvent();
            event.put("status", "error");
            event.put("error", message);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private String resolveApkUrl(String raw) throws Exception {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IOException("更新清单没有安装包地址。");
        }
        URL resolved = new URL(new URL(UPDATE_URL), raw.trim());
        if (!"https".equalsIgnoreCase(resolved.getProtocol())) {
            throw new IOException("安装包地址必须使用 HTTPS。");
        }
        return resolved.toString();
    }

    private static String readText(InputStream input) throws IOException {
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        try {
            while ((read = input.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
        } finally {
            try { input.close(); } catch (IOException ignored) { }
        }
        return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
    }

    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        FileInputStream input = new FileInputStream(file);
        try {
            byte[] buffer = new byte[16384];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        } finally {
            try { input.close(); } catch (IOException ignored) { }
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) {
            hex.append(String.format(Locale.US, "%02x", value & 0xff));
        }
        return hex.toString();
    }

    private static String readable(Exception error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return error.getClass().getSimpleName();
        }
        return message;
    }
}
