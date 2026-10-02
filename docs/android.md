# 컷노트 Android · 인수인계 안내

[통합 문서 목록](README.md) · 문서 통합: 2026-10-02


Android 앱은 PC에서 실행하는 컷노트 웹을 여는 WebView 앱입니다. 일반 실행은 PC 보관함, YouTube·Instagram 등에서 링크를 공유하면 저장·자동분석 화면을 엽니다. 현재 소스 버전은 **0.4.3 / versionCode 9**, 패키지명은 `app.cutnote.mobile`입니다.

이 소스 묶음에는 기존 APK, 서명 키, 연결 코드, API 키, PC 보관함 데이터, SDK·JDK·Node 실행 파일이 포함되지 않습니다. 앱 기능을 바꾸지 않고 다른 개발 환경에서도 빌드할 수 있도록 실행 경로와 비밀번호 설정만 분리했습니다.

명령은 별도 표시가 없으면 저장소의 `main/handoff-package/`에서 실행합니다.

## 준비 환경

- Android 8.0(API 26) 이상 기기와 최신 Android System WebView
- 빌드: JDK 21, Android SDK Platform 35, Android SDK Build-Tools 35.0.0
- PC 서버: Node.js **22.13.0 이상**, npm. 웹 프로젝트의 요구 버전도 확인하세요.
- 빌드 스크립트: Bash, `/usr/bin/zip`, `/usr/bin/shasum`. 제공된 `.command` 파일은 macOS zsh용입니다.
- Gradle 설치는 필요하지 않습니다. `aapt2`, `javac`, `d8`, `zipalign`, `apksigner`를 직접 사용합니다.

SDK는 [Android 공식 다운로드](https://developer.android.com/studio#command-line-tools-only)에서 준비하고 해당 [이용약관](https://developer.android.com/studio/terms)을 확인하세요. 이 패키지는 SDK/JDK 바이너리를 재배포하지 않으며 별도 프로젝트 라이선스를 부여하지 않습니다.

## PC 보관함 먼저 준비하기

다음 폴더 이름과 상대 위치를 유지하세요. 실행기는 상위 폴더를 따라가며 이름이 `cutnote`인 웹 프로젝트를 찾습니다.

```text
handoff-package/
├── cutnote/           # 웹·DB·AI 서버
└── cutnote-android/   # Android·LAN 연결 서버·실행기
```

웹 프로젝트에서 최초 설치·빌드·DB 초기화를 마칩니다. 환경 설정과 로컬 암호화 비밀값 생성은 [설치 안내](setup.md)를 따르세요.

```sh
cd cutnote
npm ci
npm run taxonomy:generate
npm run build
npm run db:init
```

`db:init`은 이 복사본의 로컬 DB에 마이그레이션을 적용합니다. 기존 개인 보관함이나 API 키를 가져오는 기능은 아닙니다. 코드 변경 후에는 다시 `npm run build`를 실행해야 합니다. 실행기는 빌드나 DB 초기화를 대신하지 않습니다.

그다음 `cutnote-android/PC-컷노트-시작.command`를 더블클릭하거나 아래 명령을 실행합니다.

```sh
node cutnote-android/launcher.mjs
```

실행기는 준비된 `cutnote/scripts/start-pc.mjs`와 `cutnote/dist/server/wrangler.json`으로 PC 서버 및 LAN 연결을 시작합니다. PC 웹만 별도로 실행하려면 `cutnote`에서 `npm start`를 사용하세요. 이미 같은 컷노트 서버가 실행 중이면 확인 후 재사용하고, 정체를 확인할 수 없는 프로세스는 종료하지 않습니다.

두 `.command`는 `CUTNOTE_NODE`에 지정한 실행 파일, 그다음 PATH의 `node`를 사용합니다. Finder에서 Node를 찾지 못하면 터미널에서 실행하거나 `CUTNOTE_NODE`에 Node 실행 파일의 절대 경로를 지정하세요. Codex 전용 런타임은 필요하지 않습니다.

## APK 빌드와 서명

`JAVA_HOME`과 `ANDROID_SDK_ROOT`를 반드시 지정해야 합니다. `work/` 폴더나 특정 컴퓨터의 경로를 자동으로 찾지 않습니다.

```sh
cd cutnote-android
export JAVA_HOME=/absolute/path/to/jdk-21
export ANDROID_SDK_ROOT=/absolute/path/to/android-sdk
printf 'APK 서명 키 비밀번호: '
read -r -s CUTNOTE_KEYSTORE_PASSWORD
printf '\n'
export CUTNOTE_KEYSTORE_PASSWORD
bash build.sh
unset CUTNOTE_KEYSTORE_PASSWORD
```

비밀번호는 6자 이상이어야 합니다. 실제 비밀번호를 명령 기록·문서·저장소에 적지 마세요. 빌드는 `keytool -storepass:env`와 `apksigner env:` 방식으로 환경변수를 읽으며, 고정 비밀번호를 포함하지 않습니다.

처음 빌드하면 `build/cutnote-debug.keystore`에 개발용 서명 키가 생성됩니다. 이후 빌드에는 같은 키와 같은 비밀번호를 사용하세요. **기존 배포 앱의 서명 키는 이 묶음에 포함되어 있지 않습니다. 새 키로 빌드한 APK는 기존 설치 앱에 덮어설치할 수 없습니다.** 업데이트 설치를 유지하려면 기존 키를 권한 있는 담당자에게 별도 비공개 경로로 전달받아야 합니다. 키 없이 기존 앱을 삭제하고 새 APK를 설치하면 휴대폰의 연결 설정·보류 중인 공유 상태가 사라질 수 있습니다. PC 보관함은 PC 서버에 저장됩니다.

빌드 결과는 `cutnote-android.apk`와 `cutnote-android.apk.sha256`입니다. APK 파일을 휴대폰으로 전달한 뒤 **설치**해야 공유 목록에 표시됩니다. Play Store 배포용 절차는 포함하지 않습니다. 서명 키를 잃지 않도록 별도로 보관하고 `build/` 전체 삭제에 주의하세요.

기본 SDK 버전은 `CUTNOTE_ANDROID_PLATFORM=35`, `CUTNOTE_ANDROID_BUILD_TOOLS=35.0.0`이며 필요한 경우 환경변수로 지정할 수 있습니다. 다른 버전에서의 동작은 별도 검증이 필요합니다.

## 테스트와 검증 범위

`bash build.sh`는 다음 JVM 테스트 6종의 **총 211개 검사**를 실행하고, APK 서명·zip 정렬·manifest를 검증합니다.

- `LinkPolicyTest`, `ShareRequestTest`, `EntryPolicyTest`
- `ConnectionProbeTest`, `DownloadFormatsTest`, `MediaTransferTest`

연결·다운로드 검사는 테스트용 loopback HTTP 서버를 사용합니다. Bridge 테스트는 별도로 실행합니다.

```sh
node --test bridge/server.test.mjs
```

211개 검사는 기존 개발 과정에서 통과한 기준이며, 새 환경에서는 빌드 출력으로 다시 확인해야 합니다. 2026-10-01 인수인계 기록은 APK 빌드·서명과 211개 검사 통과를 보고했습니다. 이번 문서 정리에서 APK 검사를 재실행한 것은 아닙니다. 실제 Android 기기·에뮬레이터에서 설치, 공유 시트, 생명주기, 시스템 파일 선택기를 모두 자동 검증한 상태는 아닙니다.

## 휴대폰과 연결

1. PC와 휴대폰을 같은 신뢰할 수 있는 Wi-Fi/LAN에 연결하고 PC 실행기를 유지합니다.
2. PC는 `http://127.0.0.1:5173/`에서 보관함과 OpenAI/Gemini 연결을 설정합니다.
3. 휴대폰 앱의 설정에 실행기가 보여 주는 `http://PC의사설IP:5174` 주소와 연결 코드를 한 번 입력합니다. 휴대폰에 `127.0.0.1`을 입력하면 PC에 연결되지 않습니다.
4. 앱 아이콘으로 실행하면 PC 보관함을 엽니다. YouTube·Instagram 공유 메뉴에서 **컷노트 · 영상 분석**을 선택하면 새 링크를 저장하고 분석합니다. 공유 목록에 없다면 가로 스크롤이나 더보기에서 찾으세요.

휴대폰은 PC와 같은 보관함과 AI 연결을 사용합니다. API 키는 휴대폰에 다시 입력하지 않습니다. 온라인에 배포된 Site의 보관함은 이 PC의 로컬 보관함과 별개입니다. 분석 중에는 앱과 PC 서버를 열어 두세요. 이전에 받은 링크는 일반 실행 시 자동으로 다시 분석하지 않고 이어보기 안내에서 복구할 수 있습니다.

같은 LAN의 다른 컴퓨터는 `http://PC의사설IP:5174/`에 접속해 연결 코드를 입력하면 됩니다. 키 설정은 PC의 `127.0.0.1:5173`에서만 가능합니다. 자세한 인증 방식은 [LAN 안내](lan.md)를 참고하세요.

## 파일·운영 제한

- 원본·구간 다운로드는 인증된 같은 PC 출처의 MP4/WebM/MOV/OGG 파일만 지원하며 최대25MiB입니다. 저장 위치는 Android 파일 선택기에서 고릅니다.
- 사진·영상 첨부는 시스템 파일 선택기를 사용합니다. 다른 앱에서 영상 파일 자체를 공유받는 기능은 제공하지 않습니다.
- PC가 꺼지거나 절전 상태가 되면 조회·분석이 중단됩니다. 공용/게스트 Wi-Fi의 기기 간 격리, 방화벽, PC IP 변경도 연결에 영향을 줍니다.
- 현재 연결은 HTTP LAN용입니다. 인터넷에 포트 공개·포워딩하는 운영 방식은 지원하지 않습니다.
- 오프라인 분석, 백그라운드 분석·다운로드 서비스, 계정 로그인 기반 원격 동기화는 포함하지 않습니다. 강제 종료 시 문서 제공자에 미완성 다운로드가 남을 수 있습니다.
- `connection.txt`, `.cutnote-pairing.json`, 서명 키와 `.dev.vars` 등은 개인 설정입니다. 소스·ZIP·Git에 포함하지 마세요.
