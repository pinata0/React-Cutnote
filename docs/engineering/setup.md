# 설치와 실행

[문서 목록](../README.md) · 기준일: 2026-10-02

## 환경

Node.js **22.13 이상**, npm(lockfile v3)을 사용합니다. 현재 `package.json` 선언은 React 19.2.8, Next/eslint-config-next 16.3.8, Vinext 1.0.1, Vite 8.3.2, TypeScript 5.9.3입니다. 실제 설치는 잠금파일 기준입니다. 실행기는 Vinext/Vite 기반입니다.

기존 2026-10-02 검증 환경은 Windows / Node 24.14.0 / npm 11.9.0입니다. Android APK 빌드는 별도로 JDK 21, SDK 35/build-tools 35.0.0 및 Bash 도구가 필요합니다.

리팩토링 6단계에서 이 Windows 환경의 공개 소스 사본과 npm 캐시로 아래 최초 설치·사전 생성·빌드·빈 DB 초기화·로컬 실행을 확인했습니다. 기존 node_modules와 개인 설정을 복사하지 않았으며, 빈 캐시에서 다운로드하는 설치와 managed-linux/APK는 별도 미검증입니다. 상세 결과는 [학습 기록](../refactoring-study.md)에 있습니다.

## 최초 웹 설치 (저장소 루트, PowerShell)

```powershell
cd apps/web
npm ci --include=dev --include=optional
npm run taxonomy:generate
```

AI 키 저장·분석을 사용할 경우 새 설치에서 `.dev.vars`를 만들고 에디터로 값을 입력합니다. 기존 파일은 덮어쓰지 않습니다.

```powershell
if (-not (Test-Path .dev.vars)) { Copy-Item ../.env.example .dev.vars }
```

| 설정 | 의미 |
|---|---|
| `CUTNOTE_SECRET_KEY` | UI의 제공자 키를 암호화하는 base64 32바이트 키; 생성 명령은 `.env.example` 주석 참조 |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | 제공자 분석용; UI 저장 키가 우선 |
| `DB`, `BUCKET` | 문자열 환경변수가 아닌 Cloudflare D1/R2 바인딩 |

키 없이도 빈 보관함·수동 저장·빌드·오프라인 테스트는 가능합니다. YouTube 링크 직접 분석은 Gemini, 접근 가능한 원본/업로드 프레임 분석은 OpenAI 경로를 사용합니다.

```powershell
npm run build
npm run db:init
npm start
```

PC에서 <http://127.0.0.1:5173/>을 엽니다. `db:init`은 이 앱의 로컬 D1에 9개 마이그레이션을 적용합니다. 개인 DB 자동 이관 절차가 아니므로 새 설치 DB로 진행합니다.

개발 화면은 운영 서버를 종료한 뒤 `npm run dev -- --hostname 127.0.0.1`로 실행합니다.

## 다른 기기 연결

설치·빌드·DB 초기화 후 저장소 루트에서 실행합니다.

```powershell
node apps/android/launcher.mjs
```

PC 웹(5173)과 LAN 서버(5174)를 시작/확인하고 주소·코드를 제공합니다. 다른 기기는 PC 사설 IP를 사용합니다. AI 키 설정은 PC의 5173에서 수행합니다. 자세한 내용은 [LAN](lan.md)과 [Android](android.md)를 따릅니다.

## 변경 반영·배포

운영 서버를 종료하고 `npm run build` 후 재시작합니다. 사전 변경 후에는 `npm run taxonomy:generate`를 먼저 실행합니다. 실행 중 서버의 빌드 파일을 교체하지 않습니다.

일반 로컬 실행은 Cloudflare 계정 없이 가능합니다. 온라인 배포는 `.openai/hosting.json`의 바인딩과 새 소유자 리소스·비밀 설정을 별도 구성합니다. 온라인 배포·실기기 공유·유료 AI 호출 성공은 로컬 빌드 성공과 별도로 확인합니다.

## 기존 체크아웃의 경로 이동 (리팩토링 4단계)

웹은 `apps/web`, Android는 `apps/android`로 이동했습니다. 기존 보관함은 웹 폴더의 `.wrangler/state`, 암호화 키·환경 설정은 `.dev.vars` 등 로컬 파일에 있습니다. 기존 데이터를 사용할 때는 서버를 종료하고 이 상태·환경 파일을 소스와 함께 보존해야 하며 새 DB 초기화로 대체하지 마세요. 실제 이동 검증과 미검증 범위는 [학습 기록](../refactoring-study.md)의 4단계에 있습니다. D1 database_id/database_name과 R2 bucket_name은 기존 저장소 식별을 위해 유지했습니다.
