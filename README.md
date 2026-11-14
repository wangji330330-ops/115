# 幸运学习机 · 把努力摇成好运

一台可以认真做任务、也可以认真摇奖的老虎机。中间一排摇出三个七、三颗星、同款水果或一对图案，就会收获灵感和下一份好运。

**当前版本：v1.1.0（versionCode 2）**

- **在线玩：<https://wangji330330-ops.github.io/115/>**
- **安卓安装包：[lucky-study-machine.apk](https://wangji330330-ops.github.io/115/lucky-study-machine.apk)**（约 0.40 MB，Android 7.0+，离线可玩）

![桌面版预览](docs/preview-desktop.png)

## v1.1.0 更新内容

- **修复安卓版启动闪退**：上一版手动打包时只把 `MainActivity.class` 放进了 dex，漏掉了匿名内部类；现在构建脚本会收入全部 `.class` 文件，APK 可以正常启动。
- **右上角设置**：安装、数据导入/导出、保存路径、版本号、更新内容和检查更新，都收进了一个设置抽屉。
- **应用内更新**：从 GitHub Pages 的 `update.json` 检查新版本，在应用内下载 APK、核对 SHA-256 与包名/版本，然后直接调起 Android 系统安装器，不必再自己去文件管理器找安装包。
- **数据备份与恢复**：把任务、灵感星、连胜和历史记录导出成 JSON；安卓版可以选择一个持久化保存目录，之后静默导出到该目录；网页版走浏览器下载。
- **更完整的手机适配**：设置抽屉全屏、键盘焦点管理、确认弹窗，以及窄屏下的头部排布。

> **第一次升级说明**：v1.0.0 因为启动闪退无法在应用内自救，需要手动安装一次 **v1.1.0**。从 v1.1.0 开始，后续更新才可以使用设置里的“下载并安装”。
>
> Android 的安全模型不允许普通应用静默覆盖安装自己。应用内更新会把下载、校验和跳转系统安装器都做完，但系统最后仍会显示一次“更新/安装”确认框。

![设置与更新](docs/preview-settings.png)

## 它是怎么运转的

- 写下今天真正想完成的小事，也可以点骰子随机抽一条。
- 每完成一项，获得 **1 张摇奖券**，同时收下 **12 颗灵感星**。同一项任务只发一次奖励，重新打勾不会重复刷券。
- 摇一次消耗 1 张摇奖券。中间那一排出现配对或三连，就有额外灵感星；三个 7 的头彩还会送 3 张摇奖券。
- 每天自动获得 5 张初始摇奖券；跨天会清空任务和当日进度，但累计灵感星与连续完成任务的天数会保留。
- 所有记录只存在当前浏览器或 App 的本地存储里，不上传任何服务器。

## 图案与手感

- 7 个转轮图案：幸运七、🍒、🍋、🍇、🍉、🔔、⭐。
- 三个转轮分别加速、减速、停稳，带上机械咔哒声、落定声、中奖小旋律与头彩号角。
- 头彩、对子、任务完成会撒下彩纸；没有连成线也会收到 5 颗勇气星和一句不太敷衍的鼓励。
- 音效由 Web Audio 实时合成，不依赖任何音频文件。第一次点击页面后才会启动，右上角可随时静音。
- 按 `空格键` 也能摇；数据存在 `localStorage`，刷新不丢。

![手机版预览](docs/preview-mobile.png)

## 网页版与安卓版

- **网页版**：无需构建、无外部依赖，直接打开 `index.html` 就能用。线上版本支持安装到主屏幕（PWA），并通过 service worker 缓存核心页面。
- **安卓版**：一个轻量 WebView 壳，把同一份网页资源打进 APK。App 启动时只在 `127.0.0.1:17315` 上起一个只读静态文件服务，既保证 `localStorage` 有一个稳定来源，又完全离线。
- **应用内更新**：更新源固定为 `https://wangji330330-ops.github.io/115/update.json`。Java 端负责下载和 SHA-256 校验，随后通过 `PackageInstaller` 交给系统；需要声明 `REQUEST_INSTALL_PACKAGES` 权限。第一次使用时，Android 可能会要求允许“幸运学习机”安装未知应用。

APK 已使用 `apksigner` 签名并通过 v3 签名校验和 `zipalign` 校验。

签名证书 SHA-256：

```
04c92bc2ea9c0b0acf7a7fe428e355fb40841172b687965a4f51d717d92d4267
```

## 设置里有什么

- **版本更新**：当前版本号、最新版本、发布日期、更新日志、检查更新、应用内下载安装。
- **安装**：网页版可以安装到主屏幕 / 下载 APK；安卓版显示已安装状态。
- **数据**：JSON 导入/导出、导入前摘要确认、自动过滤非法内容、跨日期备份的按天重置规则。
- **保存路径**：安卓版可以通过系统文件夹选择器指定一个长期保存目录；网页版由浏览器管理下载位置。
- **清空记录**：二次确认后清空任务、灵感星、连胜和历史。

## 本地打开

```bash
# 最简单：双击 index.html
# 或启动一个本地服务器
python -m http.server 8000
# 打开 http://localhost:8000/
```

## 目录结构

```text
index.html                 页面结构和设置抽屉
assets/style.css           全部视觉样式
assets/app.js              转轮、任务、音效、设置、更新与备份逻辑
assets/icon*.png           PWA / Android 图标
manifest.webmanifest       PWA 清单
sw.js                      线上环境的离线缓存
update.json                安卓/网页更新清单（版本、日志、APK、SHA-256）
lucky-study-machine.apk    已签名安卓安装包（v1.1.0）
docs/                      预览图
android/                   APK 工程与免 Gradle 构建脚本
  app/                     Manifest、Java、资源
  app/src/                 MainActivity、NativeBridge、UpdateManager、
                           DataManager、InstallResultReceiver
  build_apk.py             一条命令构建并签名 APK
tools/make_icons.py        重新生成图标（需要 Pillow）
```

## 重新构建安卓版

依赖：JDK 17、Android SDK（`platforms/android-35`、`build-tools/35.x`）、Python 3。

```powershell
$env:ANDROID_SDK_ROOT = "C:\path\to\android-sdk"
$env:JAVA_HOME = "C:\path\to\jdk17"
python android/build_apk.py
```

脚本会把工程临时复制到一个纯英文路径（`aapt2` 在 Windows 上无法处理中文资源路径），依次执行 aapt2 → javac（全部 Java 源文件）→ d8（全部 class 文件）→ zipalign → apksigner，最后把 APK 复制到仓库根目录。

正式签名密钥生成一次后保存在本地的 `android/.signing/`，不会提交到 git。**请保留这个目录和密码文件；丢失后将无法用同一个签名覆盖安装更新。**

发布新版本时：

1. 同时提升 `android/app/AndroidManifest.xml`、`android/build_apk.py` 和 `assets/app.js` 里的版本号。
2. 重新构建 APK。
3. 更新 `update.json` 的 `versionCode`、`versionName`、`notes`、`size` 和 `sha256`。
4. 把 APK 与 `update.json` 一起发布。

## 数据说明

- Web 端存储键：`lucky-study-machine.v1`
- 安卓版与网页版是不同的来源（origin），进度互不相通。
- 清除浏览器站点数据或卸载 App 会清空任务和灵感星；建议先在设置里导出备份。
- 安卓安装包申请的权限：
  - `INTERNET`：只用于访问 App 自己在本机启动的 `127.0.0.1` 静态服务，以及从项目自己的 GitHub Pages 更新源下载新版本。
  - `REQUEST_INSTALL_PACKAGES`：用于应用内更新；Android 仍会显示系统安装确认，普通应用无法静默覆盖安装。
