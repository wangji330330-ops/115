# -*- coding: utf-8 -*-
"""Build a signed, offline Lucky Study Machine APK from the web app.

This is a deliberately small, Gradle-free Android build:
  web assets -> aapt2 -> javac -> d8 -> zip -> zipalign -> apksigner

Why a staging directory?
  aapt2 on Windows cannot open resource directories that contain non-ASCII
  characters. The project lives in a Chinese-named folder, so the build is
  staged in an ASCII temp directory and the finished APK is copied back.

Requirements:
  * JDK 17 (or a JDK with javac/keytool)
  * Android SDK with platforms/android-35 and build-tools/35.x
  * Python 3

Set ANDROID_SDK_ROOT and JAVA_HOME to override the auto-detected locations.
The signing keystore is created once in android/.signing/ and is intentionally
excluded from git. Keep it safe if you want to publish updates that install
over the existing app.
"""
from __future__ import annotations

import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

# Windows consoles may use a legacy code page; never let a build log crash the
# build just because javac emits a localized warning.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE = Path(__file__).resolve().parent
SITE = BASE.parent
APP_SRC = BASE / "app"
SIGNING_REPO = BASE / ".signing"
APK_NAME = "lucky-study-machine.apk"
PACKAGE = "com.wangji.luckystudy"
VERSION_CODE = "13"
VERSION_NAME = "1.4.4"
MIN_SDK = "24"
TARGET_SDK = "34"
ALIAS = "luckystudy"

STAGE = Path(
    os.environ.get("LUCKY_BUILD_DIR")
    or (Path(tempfile.gettempdir()) / "lucky-study-apk-build")
).resolve()
STAGE_APP = STAGE / "app"
STAGE_ASSETS = STAGE_APP / "assets"
STAGE_WWW = STAGE_ASSETS / "www"
STAGE_OUT = STAGE / "out"
STAGE_SIGNING = STAGE / ".signing"

# These get filled in by build().
JDK: Path
ENV: dict


def log(message: str) -> None:
    print(message, flush=True)


def fail(message: str, code: int = 1) -> None:
    print("ERROR: " + message, flush=True)
    raise SystemExit(code)


def first_dir(candidates):
    for item in candidates:
        if not item:
            continue
        path = Path(item)
        if path.is_dir():
            return path
    return None


def find_sdk() -> Path:
    home = Path.home()
    sdk = first_dir(
        [
            os.environ.get("ANDROID_SDK_ROOT"),
            os.environ.get("ANDROID_HOME"),
            r"E:\glimmer-tools\android-sdk",
            home / "AppData/Local/Android/Sdk",
            r"C:\Android\Sdk",
            r"E:\Android\Sdk",
        ]
    )
    if sdk is None:
        fail("Android SDK not found. Set ANDROID_SDK_ROOT.")
    return sdk


def find_jdk() -> Path:
    home = Path.home()
    for item in [
        os.environ.get("JAVA_HOME"),
        r"E:\glimmer-tools\jdk17",
        r"C:\Program Files\Eclipse Adoptium",
        r"C:\Program Files\Java",
        home / ".jdks",
    ]:
        if not item:
            continue
        path = Path(item)
        if (path / "bin" / "javac.exe").is_file():
            return path
        if path.is_dir():
            for child in sorted(path.iterdir(), reverse=True):
                if (child / "bin" / "javac.exe").is_file():
                    return child
    fail("JDK 17 not found. Set JAVA_HOME.")


def find_build_tools(sdk: Path) -> Path:
    root = sdk / "build-tools"
    if not root.is_dir():
        fail("Android build-tools not installed.")
    versions = [
        item
        for item in root.iterdir()
        if item.is_dir() and re.match(r"^\d+(\.\d+)*$", item.name)
    ]
    versions.sort(key=lambda p: [int(x) for x in p.name.split(".")], reverse=True)
    for version in versions:
        if (version / "aapt2.exe").is_file() and (version / "apksigner.bat").is_file():
            return version
    fail("No usable build-tools directory with aapt2/apksigner found.")


def choose_platform(sdk: Path) -> Path:
    root = sdk / "platforms"
    for name in ("android-35", "android-34", "android-33"):
        candidate = root / name / "android.jar"
        if candidate.is_file():
            return candidate
    found = sorted(root.glob("android-*/android.jar")) if root.is_dir() else []
    if found:
        return found[-1]
    fail("No Android platform android.jar found.")


def run(command, what: str, cwd: Path | None = None) -> None:
    log(">> " + what)
    process = subprocess.run(
        command,
        cwd=str(cwd or STAGE),
        env=ENV,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    output = process.stdout.decode("utf-8", "replace")
    relevant = [line for line in output.splitlines() if line.strip()]
    if relevant:
        for line in relevant[-14:]:
            log("   " + line)
    if process.returncode != 0:
        fail("failed (%d): %s" % (process.returncode, what))


def prepare_stage() -> None:
    if any(ord(char) > 127 for char in str(STAGE)):
        fail(
            "build staging path must be ASCII: "
            + str(STAGE)
            + "\nSet LUCKY_BUILD_DIR to a simple ASCII path such as C:\\lucky-build."
        )
    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE_APP.mkdir(parents=True)
    STAGE_OUT.mkdir(parents=True)
    STAGE_SIGNING.mkdir(parents=True)

    for name in ("AndroidManifest.xml", "res", "src"):
        source = APP_SRC / name
        if not source.exists():
            fail("missing Android source: " + str(source))
        if source.is_dir():
            shutil.copytree(source, STAGE_APP / name)
        else:
            shutil.copy2(source, STAGE_APP / name)

    if STAGE_ASSETS.exists():
        shutil.rmtree(STAGE_ASSETS)
    STAGE_ASSETS.mkdir(parents=True)
    STAGE_WWW.mkdir(parents=True)

    for name in ("index.html", "manifest.webmanifest"):
        source = SITE / name
        if not source.is_file():
            fail("missing web file: " + str(source))
        shutil.copy2(source, STAGE_WWW / name)
    source_assets = SITE / "assets"
    if not source_assets.is_dir():
        fail("missing web assets directory")
    shutil.copytree(source_assets, STAGE_WWW / "assets")
    log("staging:      " + str(STAGE))


def load_or_create_signing() -> str:
    repo_keystore = SIGNING_REPO / "luckystudy.keystore"
    repo_password = SIGNING_REPO / "keystore-password.txt"
    stage_keystore = STAGE_SIGNING / "luckystudy.keystore"
    stage_password = STAGE_SIGNING / "keystore-password.txt"

    if repo_keystore.is_file() and repo_password.is_file():
        password = repo_password.read_text(encoding="utf-8").strip()
        if not password:
            fail("signing password file is empty: " + str(repo_password))
        shutil.copy2(repo_keystore, stage_keystore)
        stage_password.write_text(password, encoding="utf-8")
        log("   using existing signing key")
        return password

    password = secrets.token_urlsafe(18)
    keytool = JDK / "bin" / ("keytool.exe" if os.name == "nt" else "keytool")
    if not keytool.is_file():
        fail("keytool not found in JDK: " + str(keytool))
    run(
        [
            str(keytool),
            "-genkeypair",
            "-keystore",
            str(stage_keystore),
            "-alias",
            ALIAS,
            "-keyalg",
            "RSA",
            "-keysize",
            "2048",
            "-validity",
            "10950",
            "-storepass",
            password,
            "-keypass",
            password,
            "-dname",
            "CN=Lucky Study Machine, OU=Personal, O=Wangji, C=CN",
        ],
        "generate signing key (one time)",
    )
    # Preserve the key immediately so a later build step can never lose it.
    SIGNING_REPO.mkdir(exist_ok=True)
    shutil.copy2(stage_keystore, repo_keystore)
    repo_password.write_text(password, encoding="utf-8")
    stage_password.write_text(password, encoding="utf-8")
    log("   new keystore saved: " + str(repo_keystore))
    log("   keep this file and password safe for future updates")
    return password


def build() -> int:
    global JDK, ENV
    sdk = find_sdk()
    JDK = find_jdk()
    ENV = os.environ.copy()
    ENV["JAVA_HOME"] = str(JDK)
    ENV["PATH"] = str(JDK / "bin") + os.pathsep + ENV.get("PATH", "")

    build_tools = find_build_tools(sdk)
    android_jar = choose_platform(sdk)
    aapt2 = build_tools / "aapt2.exe"
    zipalign = build_tools / "zipalign.exe"
    apksigner = build_tools / "apksigner.bat"
    d8 = build_tools / "d8.bat"
    javac = JDK / "bin" / "javac.exe"

    for path in (aapt2, zipalign, apksigner, d8, javac, android_jar):
        if not path.is_file():
            fail("missing build tool: " + str(path))

    log("SDK:          " + str(sdk))
    log("build-tools:  " + build_tools.name)
    log("android.jar:  " + str(android_jar))
    log("JDK:          " + str(JDK))
    prepare_stage()

    gen = STAGE_OUT / "gen"
    classes = STAGE_OUT / "classes"
    dex = STAGE_OUT / "dex"
    for directory in (gen, classes, dex):
        directory.mkdir(parents=True)

    res_zip = STAGE_OUT / "res.zip"
    base_apk = STAGE_OUT / "base.apk"
    aligned_apk = STAGE_OUT / "aligned.apk"
    unsigned_final = STAGE_OUT / APK_NAME

    run(
        [str(aapt2), "compile", "--dir", str(STAGE_APP / "res"), "-o", str(res_zip)],
        "compile Android resources",
    )
    run(
        [
            str(aapt2),
            "link",
            "-o",
            str(base_apk),
            "-I",
            str(android_jar),
            "--manifest",
            str(STAGE_APP / "AndroidManifest.xml"),
            "--java",
            str(gen),
            "-A",
            str(STAGE_ASSETS),
            "--min-sdk-version",
            MIN_SDK,
            "--target-sdk-version",
            TARGET_SDK,
            "--version-code",
            VERSION_CODE,
            "--version-name",
            VERSION_NAME,
            str(res_zip),
        ],
        "link APK resources and assets",
    )
    log("   base.apk = %.2f MB" % (base_apk.stat().st_size / 1048576.0))

    java_sources = sorted(str(path) for path in (STAGE_APP / "src").rglob("*.java"))
    r_java = gen / "com" / "wangji" / "luckystudy" / "R.java"
    if not java_sources:
        fail("no Java sources found")
    if not r_java.is_file():
        fail("aapt2 did not generate R.java")
    run(
        [
            str(javac),
            "-encoding",
            "UTF-8",
            "-source",
            "8",
            "-target",
            "8",
            "-bootclasspath",
            str(android_jar),
            "-d",
            str(classes),
            *java_sources,
            str(r_java),
        ],
        "compile Java (%d files)" % len(java_sources),
    )

    # IMPORTANT: include every generated class, not just MainActivity/R.
    # Anonymous classes such as MainActivity$1 are separate .class files and a
    # missing one makes the app crash with NoClassDefFoundError at launch.
    class_files = sorted(str(path) for path in classes.rglob("*.class"))
    if not class_files:
        fail("no compiled Java class files found")
    run(
        [
            "cmd.exe",
            "/c",
            str(d8),
            "--lib",
            str(android_jar),
            "--min-api",
            MIN_SDK,
            "--output",
            str(dex),
            *class_files,
        ],
        "dex Java classes (%d files)" % len(class_files),
    )

    dex_file = dex / "classes.dex"
    if not dex_file.is_file():
        fail("classes.dex was not produced")

    log(">> add classes.dex to APK")
    with zipfile.ZipFile(base_apk, "a", zipfile.ZIP_DEFLATED) as archive:
        archive.write(dex_file, "classes.dex")

    run(
        [str(zipalign), "-f", "-p", "4", str(base_apk), str(aligned_apk)],
        "zipalign",
    )

    password = load_or_create_signing()
    signed_final = STAGE_OUT / "signed.apk"
    run(
        [
            "cmd.exe",
            "/c",
            str(apksigner),
            "sign",
            "--ks",
            str(STAGE_SIGNING / "luckystudy.keystore"),
            "--ks-key-alias",
            ALIAS,
            "--ks-pass",
            "pass:" + password,
            "--key-pass",
            "pass:" + password,
            "--out",
            str(signed_final),
            str(aligned_apk),
        ],
        "sign APK",
    )
    run(
        [
            "cmd.exe",
            "/c",
            str(apksigner),
            "verify",
            "--verbose",
            "--print-certs",
            str(signed_final),
        ],
        "verify APK signature",
    )
    run(
        [str(zipalign), "-c", "-v", "4", str(signed_final)],
        "verify alignment",
    )

    published = SITE / APK_NAME
    shutil.copy2(signed_final, published)
    size_mb = published.stat().st_size / 1048576.0
    log("")
    log("=" * 58)
    log("APK ready: " + str(published))
    log("Size:      %.2f MB" % size_mb)
    log("Package:   " + PACKAGE)
    log("Version:   " + VERSION_NAME + " (" + VERSION_CODE + ")")
    log("Build dir: " + str(STAGE_OUT))
    log("=" * 58)
    return 0


if __name__ == "__main__":
    sys.exit(build())
