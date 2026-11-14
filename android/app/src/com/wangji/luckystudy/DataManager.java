package com.wangji.luckystudy;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;

import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * JSON backup export using the Storage Access Framework.
 *
 * The user can pick a persistent folder once (the "save path" in Settings),
 * after which exports write there silently. If no folder has been picked yet,
 * a normal system "save as" dialog is used instead. No storage permission is
 * required on any supported Android version.
 */
public class DataManager {

    public static final int REQ_CHOOSE_TREE = 601;
    public static final int REQ_CREATE_DOCUMENT = 602;

    private static final String PREFS = "lucky_study_prefs";
    private static final String KEY_TREE_URI = "save_tree_uri";
    private static final String KEY_TREE_LABEL = "save_tree_label";

    private final MainActivity activity;
    private final NativeBridge bridge;
    private final SharedPreferences prefs;

    private String pendingFilename;
    private String pendingContent;

    public DataManager(MainActivity activity, NativeBridge bridge) {
        this.activity = activity;
        this.bridge = bridge;
        this.prefs = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
    }

    public String getSavePathLabel() {
        return prefs.getString(KEY_TREE_LABEL, "");
    }

    public void chooseSaveFolder() {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                            | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                    activity.startActivityForResult(intent, REQ_CHOOSE_TREE);
                } catch (Exception error) {
                    sendSavePathError("系统没有可用的文件夹选择器：" + readable(error));
                }
            }
        });
    }

    public void exportData(final String filename, final String content) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (content == null || content.isEmpty()) {
                    sendExportError("没有可导出的数据。");
                    return;
                }
                String safeName = safeFilename(filename);
                String tree = prefs.getString(KEY_TREE_URI, "");
                if (tree != null && !tree.isEmpty()) {
                    Uri treeUri = Uri.parse(tree);
                    if (writeToTree(treeUri, safeName, content)) {
                        return;
                    }
                    // Revoked permission or a provider that no longer supports
                    // creation: gracefully fall back to the system save panel.
                }
                openCreateDocument(safeName, content);
            }
        });
    }

    private boolean writeToTree(Uri treeUri, String filename, String content) {
        try {
            ContentResolver resolver = activity.getContentResolver();
            String treeDocumentId = DocumentsContract.getTreeDocumentId(treeUri);
            Uri parent = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocumentId);
            Uri outputUri = DocumentsContract.createDocument(
                    resolver, parent, "application/json", filename);
            if (outputUri == null) return false;
            writeUri(outputUri, content);
            sendExportSuccess(filenameFor(outputUri, filename), getSavePathLabel());
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private void openCreateDocument(String filename, String content) {
        pendingFilename = filename;
        pendingContent = content;
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            activity.startActivityForResult(intent, REQ_CREATE_DOCUMENT);
        } catch (Exception error) {
            pendingFilename = null;
            pendingContent = null;
            sendExportError("系统没有可用的保存面板：" + readable(error));
        }
    }

    public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_CHOOSE_TREE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                Uri treeUri = data.getData();
                try {
                    int takeFlags = data.getFlags()
                            & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    activity.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
                } catch (SecurityException ignored) {
                    // Some providers do not support persistable permissions; the
                    // export may still work for this session if the URI is valid.
                }
                String label = describeTree(treeUri);
                prefs.edit()
                        .putString(KEY_TREE_URI, treeUri.toString())
                        .putString(KEY_TREE_LABEL, label)
                        .apply();
                sendSavePath(label);
            }
            return true;
        }

        if (requestCode == REQ_CREATE_DOCUMENT) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                Uri outputUri = data.getData();
                String content = pendingContent == null ? "" : pendingContent;
                String filename = pendingFilename == null ? "lucky-study-backup.json" : pendingFilename;
                pendingContent = null;
                pendingFilename = null;
                try {
                    writeUri(outputUri, content);
                    sendExportSuccess(filenameFor(outputUri, filename), "系统选择的位置");
                } catch (Exception error) {
                    sendExportError("写入备份文件失败：" + readable(error));
                }
            } else {
                pendingContent = null;
                pendingFilename = null;
                sendExportError("已取消保存。");
            }
            return true;
        }

        return false;
    }

    private void writeUri(Uri uri, String content) throws Exception {
        OutputStream output = activity.getContentResolver().openOutputStream(uri);
        if (output == null) throw new Exception("无法打开写入位置。");
        try {
            output.write(content.getBytes(StandardCharsets.UTF_8));
            output.flush();
        } finally {
            try { output.close(); } catch (Exception ignored) { }
        }
    }

    private void sendExportSuccess(String fileName, String path) {
        try {
            JSONObject event = new JSONObject();
            event.put("kind", "export");
            event.put("status", "saved");
            event.put("fileName", fileName);
            event.put("path", path == null ? "" : path);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void sendExportError(String message) {
        try {
            JSONObject event = new JSONObject();
            event.put("kind", "export");
            event.put("status", "error");
            event.put("error", message);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void sendSavePath(String path) {
        try {
            JSONObject event = new JSONObject();
            event.put("kind", "savePath");
            event.put("path", path);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void sendSavePathError(String message) {
        try {
            JSONObject event = new JSONObject();
            event.put("kind", "savePath");
            event.put("path", "");
            event.put("error", message);
            bridge.sendEvent(event);
        } catch (Exception ignored) {
            // ignore
        }
    }

    private String filenameFor(Uri uri, String fallback) {
        Cursor cursor = null;
        try {
            cursor = activity.getContentResolver().query(
                    uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
            // fall through
        } finally {
            if (cursor != null) {
                try { cursor.close(); } catch (Exception ignored) { }
            }
        }
        return fallback;
    }

    private String describeTree(Uri treeUri) {
        try {
            String id = DocumentsContract.getTreeDocumentId(treeUri);
            if (id == null || id.isEmpty()) return "已选择的文件夹";
            String decoded = Uri.decode(id);
            if (decoded.startsWith("primary:")) {
                String rest = decoded.substring("primary:".length());
                return rest.isEmpty() ? "内部存储" : "内部存储/" + rest;
            }
            if (decoded.startsWith("home:")) {
                String rest = decoded.substring("home:".length());
                return rest.isEmpty() ? "文档" : "文档/" + rest;
            }
            int colon = decoded.indexOf(':');
            if (colon > 0 && colon < decoded.length() - 1) {
                return decoded.substring(0, colon) + "/" + decoded.substring(colon + 1);
            }
            return decoded;
        } catch (Exception error) {
            return "已选择的文件夹";
        }
    }

    private static String safeFilename(String raw) {
        String name = raw == null ? "" : raw.trim();
        if (name.isEmpty()) name = "lucky-study-backup.json";
        name = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
        if (!name.toLowerCase().endsWith(".json")) name += ".json";
        if (name.length() > 80) {
            name = name.substring(0, 76) + ".json";
        }
        return name;
    }

    private static String readable(Exception error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return error.getClass().getSimpleName();
        }
        return message;
    }
}
