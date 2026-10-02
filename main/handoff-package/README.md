# 컷노트 — 영상 레퍼런스 라이브러리

2026-10-02 보안 패치: 의존성 잠금파일을 갱신하고 Windows 회귀검사·운영 빌드·
로컬 실행을 확인했습니다. 현재 저장소의 검증 결과는 루트
`SECURITY_REMEDIATION.md`에 있습니다. `audit/`의 인수인계 시점 목록과 해시는
원래 복사본의 기록이며 이후 변경된 파일의 현재 해시를 나타내지 않습니다.

이번 lint 수정의 원인, 전후 코드, 동작 보존 시 주의점은
[lint 수정 학습 노트](docs/LINT_FIX_STUDY.md)에 정리했습니다.

부산 카카오 랄프톤에서 만든 웹 + Android 프로젝트입니다. 영상 링크나 파일을 저장하고 색감·구도·효과를 분류해 구간별로 찾고 재생합니다. 이 폴더는 새 팀원이 GitHub 저장소의 최상위에 올릴 수 있도록 만든 소스 사본입니다. Git 이력, API 키, 개인 보관함과 업로드 영상은 들어 있지 않습니다.

공개 전에는 [LICENSE_NOTES.md](LICENSE_NOTES.md)의 프로젝트 라이선스·태그 사전·로고 글꼴 권리를 확인하세요. 구현 상태와 검증 결과는 [HANDOFF.md](HANDOFF.md), 복사 출처는 [FILE_MANIFEST.md](FILE_MANIFEST.md)에 있습니다.

## 구성

```text
cutnote/                 웹 UI, API, 분석/검색, D1 스키마, R2 저장, 태그 사전
cutnote-android/         Android 공유 수신 앱, PC 실행기, LAN 연결 서버
tests/                  실제 소스를 대상으로 하는 오프라인 웹 회귀 테스트
assets/logos/           로고 SVG 원본 리소스 (권리 확인 항목 있음)
reference/design/       과거 로고 생성 스크립트 참고 자료
audit/                  파일 목록, 원본 보존 확인, 의존성 라이선스 목록
```

`cutnote`와 `cutnote-android`는 형제 폴더로 유지하세요. PC 실행기가 이 구조를 사용합니다. `cutnote/build/`는 빌드 **입력 소스**이므로 삭제하거나 Git에서 제외하면 안 됩니다.

## 필요한 프로그램

- 웹/연결 서버: Node.js **22.13 이상**, npm (lockfile v3 지원). 인수인계 검증은 Node 24.19.0에서 진행했습니다.
- Android APK: JDK **21**, Android SDK platform **35**, build-tools **35.0.0**, Bash, zip, shasum. Android 8(API26) 이상에서 동작하도록 설정되어 있습니다.
- Windows에서는 웹 Node 명령을 사용할 수 있으나 APK 빌드와 `.command`는 Unix/macOS용입니다. Windows/WSL 전체 동작은 검증하지 않았습니다.
- 일반 로컬 실행에 Cloudflare 계정이나 기존 소유자의 Sites 계정은 필요하지 않습니다. 최초 npm 설치에는 인터넷이 필요합니다.

## 웹 설치 및 환경 설정

이 README가 있는 폴더에서 시작합니다.

```sh
cd cutnote
npm ci --include=dev --include=optional
npm run taxonomy:generate
cp ../.env.example .dev.vars
```

`.dev.vars`를 에디터로 열어 `CUTNOTE_SECRET_KEY`에 새 32바이트 base64 키를 넣으세요. 생성 명령은 예제 파일 주석에 있습니다. 키가 없으면 웹에서 API 키를 암호화하여 저장할 수 없습니다. `.dev.vars`는 Git에 올리지 않습니다. 제공자 키는 로컬 파일의 `OPENAI_API_KEY`, `GEMINI_API_KEY` 또는 웹의 연결 설정에서 입력합니다. **실제 비밀값을 공유 문서에 붙여 넣지 마세요.**

환경변수 없이도 빌드, 오프라인 회귀 테스트와 빈 보관함 조회를 검증할 수 있습니다. AI 분석에는 사용 가능한 제공자 키와 네트워크가 필요합니다. YouTube 링크의 직접 영상 분석은 Gemini 경로를 사용하며, OpenAI 분석에는 접근 가능한 원본/업로드 영상이 필요합니다.

```sh
npm run build
npm run db:init
npm start
```

[PC 보관함](http://127.0.0.1:5173/)을 엽니다. `db:init`은 **이 사본의 로컬 D1**에 0000~0008 전체 마이그레이션을 적용하고 적용 기록을 남깁니다. 같은 새 DB에서 재실행할 수 있습니다. 이미 다른 방식으로 초기화한 개인 DB를 이 사본에 덮어씌우지 마세요. 기존 데이터 이전은 별도 백업·마이그레이션 계획이 필요합니다.

`DB`, `BUCKET`은 Cloudflare 바인딩 이름입니다. `.env`의 문자열로 대체하지 않습니다. `.openai/hosting.json`에는 로컬 구성에 필요한 바인딩 이름만 보존하고 이전 계정의 `project_id`는 제거했습니다. 온라인 배포는 새 팀의 Sites/Cloudflare 리소스를 연결한 뒤 별도로 검증해야 합니다.

개발 화면이 필요하면 운영 서버를 종료한 뒤 `npm run dev -- --hostname 127.0.0.1`을 사용합니다. 휴대폰에서는 운영 빌드를 권장합니다. 코드 변경 후에는 운영 서버를 중지하고 `npm run build`를 실행한 뒤 다시 시작하세요. 실행 중인 서버의 빌드 파일을 교체하면 일시적인 파일 오류가 생길 수 있습니다.

## 휴대폰·다른 PC와 연결

웹 설치·빌드·DB 초기화를 마친 다음, 인수인계 루트에서:

```sh
node cutnote-android/launcher.mjs
```

실행기가 PC 웹(5173)과 LAN 연결 서버(5174)를 시작하거나 확인하고, **그 컴퓨터에서 새로 만든** 접속 주소와 연결 코드를 안내합니다. 출력된 주소를 같은 Wi-Fi의 다른 PC 브라우저나 컷노트 앱에 입력하세요. 호스트 PC는 켜져 있어야 합니다. 다른 기기의 `127.0.0.1`은 호스트 PC 주소가 아닙니다.

앱과 브라우저가 같은 연결 서버를 사용하면 같은 D1 보관함을 조회하므로 양방향 저장·수정이 반영됩니다. 목록은 약 5초 간격으로 확인합니다. 온라인 배포 사이트와 로컬 PC 보관함은 별개입니다. 계정 기반 클라우드 동기화는 구현되어 있지 않습니다.

연결이 안 되면 PC 절전, 방화벽, Wi-Fi의 기기 간 격리, 변경된 IP, 서버 종료 여부를 확인합니다. 현재 방식은 신뢰할 수 있는 LAN용 HTTP이며 인터넷에 그대로 공개할 용도가 아닙니다. 세부 실행 방식은 [Android 안내](cutnote-android/README.md)와 [연결 서버 안내](cutnote-android/bridge/README.md)를 참고하세요.

## Android APK 빌드

[cutnote-android/README.md](cutnote-android/README.md)의 SDK/JDK 환경변수와 새 서명 비밀번호 설정 후:

```sh
bash cutnote-android/build.sh
```

현재 버전은 0.4.3 / versionCode 9입니다. 빌드 과정에 JVM 회귀 테스트와 서명 검증이 포함됩니다. APK·키스토어·서명 비밀번호는 인수인계 소스에 없습니다. 새 서명 키로 빌드한 앱은 예전 설치에 덮어설치할 수 없습니다. 기존 앱 업데이트가 필요하면 기존 서명 키를 별도의 비공개 절차로 인수인계해야 합니다.

## 테스트

```sh
cd cutnote
npm run taxonomy:generate
npm test
npx tsc --noEmit --incremental false
npm run build
cd ..
node --test cutnote-android/bridge/server.test.mjs
```

웹 회귀 테스트는 메모리 DB·가짜 제공자 응답으로 현재 소스를 검사하며 실제 유료 API와 개인 DB를 사용하지 않습니다. 연결 서버 테스트는 테스트 전용 로컬 포트를 사용합니다. 테스트 범위는 [tests/README.md](tests/README.md)에 있습니다. 실기기 공유·파일 선택·다운로드와 실제 제공자 분석은 별도 수동 확인이 필요합니다.

## 주요 기능

- 링크/파일 저장, 제목·메모·직접 태그 선택 입력, 공개 메타데이터 조회
- 색감·구도·효과와 구간별 독립 태그, 추정 태그 검수, AND/OR 검색
- 전체/구간 재생, 즐겨찾기, 마우스·터치 길게 눌러 순서 변경
- 구간 저화질 파일 생성/저장, 사진 특징을 이용한 저장 구간 검색
- 유사 효과 추천·선택형 피드백, 취향/다른 스타일 YouTube·Shorts 추천
- Android 공유 수신과 PC 보관함 연결

파일은 최대25MB, 분석 영상은 최대2시간/30구간입니다. 구간 파일 생성은 브라우저에서 최대약360p, 0.3초~5분 범위를 처리하며 페이지를 벗어나면 중단됩니다. 분석 정확성·외부 링크 접근성·추천 서비스 안정성의 한계는 HANDOFF에 기록했습니다.
