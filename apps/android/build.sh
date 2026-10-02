#!/bin/bash
# Build without Gradle: only the official JDK, Android platform and build-tools.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
: "${JAVA_HOME:?JAVA_HOME에 JDK 21 경로를 지정해주세요.}"
: "${ANDROID_SDK_ROOT:?ANDROID_SDK_ROOT에 Android SDK 경로를 지정해주세요.}"
: "${CUTNOTE_KEYSTORE_PASSWORD:?CUTNOTE_KEYSTORE_PASSWORD에 서명 키 비밀번호를 설정해주세요.}"
if [ "${#CUTNOTE_KEYSTORE_PASSWORD}" -lt 6 ]; then
  echo 'CUTNOTE_KEYSTORE_PASSWORD는 6자 이상이어야 합니다.' >&2
  exit 1
fi
SDK_DIR="$ANDROID_SDK_ROOT"
JDK_DIR="$JAVA_HOME"
PLATFORM="${CUTNOTE_ANDROID_PLATFORM:-35}"
TOOLS_VERSION="${CUTNOTE_ANDROID_BUILD_TOOLS:-35.0.0}"
TOOLS="$SDK_DIR/build-tools/$TOOLS_VERSION"
ANDROID_JAR="$SDK_DIR/platforms/android-$PLATFORM/android.jar"
if [ ! -x "$JDK_DIR/bin/javac" ] || [ ! -f "$ANDROID_JAR" ] || [ ! -x "$TOOLS/aapt2" ]; then
  echo 'JDK와 Android SDK platform 35 / build-tools 35.0.0 경로를 설정해주세요.' >&2
  echo 'JAVA_HOME, ANDROID_SDK_ROOT 설정을 확인해주세요. README.md를 참고해주세요.' >&2
  exit 1
fi
export JAVA_HOME="$JDK_DIR"
export CUTNOTE_KEYSTORE_PASSWORD
export PATH="$JDK_DIR/bin:$PATH"
BUILD="$PROJECT_DIR/build"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/test-classes"
"$JDK_DIR/bin/javac" --release 8 -d "$BUILD/test-classes" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/LinkPolicy.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/ShareRequest.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/EntryPolicy.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/DownloadPolicy.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/DownloadTransfer.java" \
  "$PROJECT_DIR/app/src/main/java/app/cutnote/mobile/UploadPolicy.java" \
  "$PROJECT_DIR/tests/LinkPolicyTest.java" \
  "$PROJECT_DIR/tests/ShareRequestTest.java" \
  "$PROJECT_DIR/tests/EntryPolicyTest.java" \
  "$PROJECT_DIR/tests/ConnectionProbeTest.java" \
  "$PROJECT_DIR/tests/DownloadFormatsTest.java" \
  "$PROJECT_DIR/tests/MediaTransferTest.java"
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.LinkPolicyTest
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.ShareRequestTest
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.EntryPolicyTest
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.ConnectionProbeTest
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.DownloadFormatsTest
"$JDK_DIR/bin/java" -cp "$BUILD/test-classes" app.cutnote.mobile.MediaTransferTest
"$TOOLS/aapt2" compile --dir "$PROJECT_DIR/app/src/main/res" -o "$BUILD/resources.zip"
"$TOOLS/aapt2" link -I "$ANDROID_JAR" --manifest "$PROJECT_DIR/app/src/main/AndroidManifest.xml" \
  "$BUILD/resources.zip" -o "$BUILD/unsigned.apk"
SOURCES=()
while IFS= read -r -d '' source; do SOURCES+=("$source"); done < <(find "$PROJECT_DIR/app/src/main/java" -name '*.java' -print0)
"$JDK_DIR/bin/javac" --release 8 -encoding UTF-8 -cp "$ANDROID_JAR" -d "$BUILD/classes" "${SOURCES[@]}"
"$JDK_DIR/bin/jar" --create --file "$BUILD/classes.jar" -C "$BUILD/classes" .
"$TOOLS/d8" --min-api 26 --lib "$ANDROID_JAR" --output "$BUILD/dex" "$BUILD/classes.jar"
(cd "$BUILD/dex" && /usr/bin/zip -q "$BUILD/unsigned.apk" classes*.dex)
"$TOOLS/zipalign" -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ ! -f "$BUILD/cutnote-debug.keystore" ]; then
  "$JDK_DIR/bin/keytool" -genkeypair -keystore "$BUILD/cutnote-debug.keystore" \
    -alias cutnote-debug -keyalg RSA -keysize 2048 -validity 3650 \
    -storepass:env CUTNOTE_KEYSTORE_PASSWORD -keypass:env CUTNOTE_KEYSTORE_PASSWORD -dname 'CN=Cutnote Local Development' -noprompt
fi
"$TOOLS/apksigner" sign --ks "$BUILD/cutnote-debug.keystore" --ks-key-alias cutnote-debug \
  --ks-pass env:CUTNOTE_KEYSTORE_PASSWORD --key-pass env:CUTNOTE_KEYSTORE_PASSWORD --out "$PROJECT_DIR/cutnote-android.apk" "$BUILD/aligned.apk"
"$TOOLS/apksigner" verify --verbose "$PROJECT_DIR/cutnote-android.apk"
"$TOOLS/zipalign" -c 4 "$PROJECT_DIR/cutnote-android.apk"
"$TOOLS/aapt2" dump badging "$PROJECT_DIR/cutnote-android.apk"
(cd "$PROJECT_DIR" && /usr/bin/shasum -a 256 cutnote-android.apk > cutnote-android.apk.sha256)
echo "APK: $PROJECT_DIR/cutnote-android.apk"
