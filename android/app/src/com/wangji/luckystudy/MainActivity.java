package com.wangji.luckystudy;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * 幸运学习机 —— 把网页版装进一个离线 WebView。
 *
 * 为什么在应用内启动一个只监听 127.0.0.1 的静态文件服务？
 *  - file:// 是不透明来源，部分 WebView 会禁用 localStorage，学习记录就会丢；
 *  - 固定端口让 localStorage 的来源地址跨启动保持一致；
 *  - 页面完全离线，服务只读 APK 内的 assets/www，不访问外网。
 */
public class MainActivity extends Activity {

    private static final int BASE_PORT = 17315;
    private static final int IMPORT_FILE_REQUEST = 701;
    private static final String ASSET_ROOT = "www/";
    private static final String BG = "#0B0810";

    private WebView webView;
    private NativeBridge nativeBridge;
    private ValueCallback<Uri[]> fileChooserCallback;
    private ServerSocket serverSocket;
    private int port;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor(BG));
        getWindow().setNavigationBarColor(Color.parseColor(BG));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor(BG));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // 允许 file:// 仅作为本地 HTTP 服务启动失败时的兜底；页面自身没有外部内容。
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        // 禁止 WebView 的缩放与“自动适配”：界面始终按 CSS 像素 1:1 渲染。
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        // 长按不要弹出文字选择/上下文菜单，避免出现多余选中框。
        webView.setLongClickable(false);
        webView.setHapticFeedbackEnabled(false);
        webView.setInitialScale(100);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        nativeBridge = new NativeBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "LuckyAndroid");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(
                            Intent.createChooser(intent, "选择学习记录备份"),
                            IMPORT_FILE_REQUEST
                    );
                    return true;
                } catch (Exception error) {
                    fileChooserCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                if ("127.0.0.1".equals(uri.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // 没有可处理该链接的应用时，留在本应用内。
                }
                return true;
            }
        });

        setContentView(webView);
        startLocalServer();

        if (serverSocket != null) {
            webView.loadUrl("http://127.0.0.1:" + port + "/index.html?app=1");
        } else {
            // 极端情况下端口全部被占用，退回 file://，至少页面还能打开。
            webView.loadUrl("file:///android_asset/www/index.html?app=1");
        }
    }

    private void startLocalServer() {
        for (int candidate = BASE_PORT; candidate < BASE_PORT + 8; candidate += 1) {
            ServerSocket socket = null;
            try {
                socket = new ServerSocket();
                socket.setReuseAddress(true);
                socket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), candidate));
                serverSocket = socket;
                port = candidate;
                break;
            } catch (IOException error) {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (IOException ignored) {
                        // ignore
                    }
                }
            }
        }

        if (serverSocket == null) return;

        Thread acceptThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (serverSocket != null && !serverSocket.isClosed()) {
                    try {
                        final Socket client = serverSocket.accept();
                        client.setSoTimeout(10000);
                        Thread worker = new Thread(new Runnable() {
                            @Override
                            public void run() {
                                serve(client);
                            }
                        });
                        worker.setDaemon(true);
                        worker.start();
                    } catch (IOException error) {
                        break;
                    }
                }
            }
        });
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    private void serve(Socket client) {
        byte[] body = null;
        int status = 200;
        String mime = "application/octet-stream";
        try (Socket socket = client;
             BufferedInputStream input = new BufferedInputStream(socket.getInputStream());
             OutputStream output = socket.getOutputStream()) {

            StringBuilder head = new StringBuilder();
            int value;
            while ((value = input.read()) != -1) {
                head.append((char) value);
                int length = head.length();
                if (length >= 4
                        && head.charAt(length - 4) == '\r'
                        && head.charAt(length - 3) == '\n'
                        && head.charAt(length - 2) == '\r'
                        && head.charAt(length - 1) == '\n') {
                    break;
                }
                if (length > 16384) break;
            }

            String requestLine = head.toString().split("\r\n", 2)[0];
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                body = "Bad Request".getBytes(StandardCharsets.UTF_8);
                status = 400;
                mime = "text/plain; charset=utf-8";
            } else {
                String method = parts[0];
                if (!"GET".equals(method) && !"HEAD".equals(method)) {
                    body = "Method Not Allowed".getBytes(StandardCharsets.UTF_8);
                    status = 405;
                    mime = "text/plain; charset=utf-8";
                } else {
                    String requestPath = parts[1];
                    int queryAt = requestPath.indexOf('?');
                    if (queryAt >= 0) requestPath = requestPath.substring(0, queryAt);
                    if (requestPath.isEmpty() || "/".equals(requestPath)) {
                        requestPath = "/index.html";
                    }
                    String decoded = URLDecoder.decode(requestPath, "UTF-8");
                    if (decoded.contains("..")) {
                        body = "Forbidden".getBytes(StandardCharsets.UTF_8);
                        status = 403;
                        mime = "text/plain; charset=utf-8";
                    } else {
                        while (decoded.startsWith("/")) decoded = decoded.substring(1);
                        mime = mimeOf(decoded);
                        try (InputStream asset = getAssets().open(ASSET_ROOT + decoded)) {
                            body = readAll(asset);
                            status = 200;
                        } catch (IOException notFound) {
                            body = "Not Found".getBytes(StandardCharsets.UTF_8);
                            status = 404;
                            mime = "text/plain; charset=utf-8";
                        }
                    }
                    if ("HEAD".equals(method)) {
                        // HEAD 只需要响应头；body 长度仍由 Content-Length 表示。
                        int fullLength = body == null ? 0 : body.length;
                        writeResponse(output, status, mime, fullLength, new byte[0]);
                        return;
                    }
                }
            }

            if (body == null) {
                body = new byte[0];
            }
            writeResponse(output, status, mime, body.length, body);
        } catch (Exception error) {
            // 单个资源读取失败不影响页面，WebView 会收到连接关闭。
        }
    }

    private static void writeResponse(OutputStream output, int status, String mime,
                                      int length, byte[] body) throws IOException {
        String reason = "OK";
        if (status == 400) reason = "Bad Request";
        if (status == 403) reason = "Forbidden";
        if (status == 404) reason = "Not Found";
        if (status == 405) reason = "Method Not Allowed";
        String header = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + mime + "\r\n"
                + "Content-Length: " + length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "X-Content-Type-Options: nosniff\r\n"
                + "Connection: close\r\n\r\n";
        output.write(header.getBytes(StandardCharsets.UTF_8));
        output.write(body);
        output.flush();
    }

    private static byte[] readAll(InputStream input) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[16384];
        int read;
        while ((read = input.read(chunk)) > 0) {
            buffer.write(chunk, 0, read);
        }
        return buffer.toByteArray();
    }

    private static String mimeOf(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".json")) return "application/json; charset=utf-8";
        if (lower.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == IMPORT_FILE_REQUEST) {
            if (fileChooserCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i += 1) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
            return;
        }

        if (nativeBridge != null
                && nativeBridge.getDataManager().onActivityResult(requestCode, resultCode, data)) {
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException ignored) {
            // ignore
        }
        serverSocket = null;
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("LuckyAndroid");
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        if (nativeBridge != null) {
            nativeBridge.dispose();
            nativeBridge = null;
        }
        super.onDestroy();
    }
}
