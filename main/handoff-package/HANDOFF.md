# 컷노트 인수인계 현황

조사일: 2026-10-01 (Asia/Seoul). 파일과 코드 기준 조사입니다. 실서비스·유료 AI API·휴대폰 실기기 성공을 소스 검증 결과로 대신하지 않습니다.

## 원본 범위와 Git 현황

개인 계정 경로를 공개 패키지에 넣지 않기 위해 원래 작업 폴더를 `<PROJECT_ROOT>`로 표기합니다. 원래 프로젝트의 최상위는 `files-mentioned-by-the-user-codex`이며 그 안에 `outputs/`, `work/`가 있습니다. 이 인수인계 폴더는 `<PROJECT_ROOT>/handoff-package`입니다.

| 항목 | 확인 결과 |
|---|---|
| 실제 웹 저장소 | `<PROJECT_ROOT>/outputs/cutnote/.git` |
| 작업 폴더 자체 Git | 없음. 웹 하위 폴더만 독립 저장소 |
| 브랜치 | `main` |
| HEAD | `f2208a33cf3cce842e07930b96a0bd652bf72487` |
| 최근 커밋 6개 | `f2208a3`, `e7601b3`, `0283ec4`, `5ba00e6`, `248d3b1`, `bd7186e` |
| 최근 커밋 날짜/제목 | 모두 2026-09-29, `Update Site source` |
| remote | `origin`, `https://git.chatgpt-team.site/<private-repository>`; GitHub 아님. 공개 결과물에서는 계정/저장소 식별 경로를 생략 |
| dirty / untracked | 조사 시작 시 웹 저장소 변경·미등록 파일 없음. 무시된 개인 상태 파일은 존재하며 제외 목록에 기록 |
| worktree | 웹 저장소 1개, 브랜치 1개, 추가 Git worktree 없음 |
| Git 밖의 소스 | `outputs/cutnote-android`, `outputs/cutnote-logo-kit`, 선별한 `work/` 테스트·디자인 소스 |
| 별도 작업 폴더 | `work/cutnote-build-*`, `work/cutnote-dist-*`, `work/cutnote-package` 등은 생성/검증/백업 폴더. Git worktree가 아님 |

원격의 정확한 주소가 필요한 기존 소유자는 원본에서 `GIT_OPTIONAL_LOCKS=0 git remote get-url origin`으로 확인할 수 있습니다. Git 이력·원격 인증 정보는 전달하지 않았습니다. 이 작업은 커밋·푸시·브랜치/인덱스 변경을 수행하지 않습니다.

## 사본에서만 바뀐 내용

- 이전 설명서를 새 설치·운영 문서로 통합했습니다. 원본 설명서의 DB 0004까지만 적용, APK 0.2.0, 15초 폴링 안내는 현재 코드와 달랐습니다.
- `.openai/hosting.json`의 기존 `project_id`를 제거하고 필수 `DB`/`BUCKET` 바인딩 이름은 보존했습니다.
- `npm run db:init`을 추가했습니다. 로컬 DB에 전체 마이그레이션을 적용하는 도구이며 원격 DB를 수정하지 않습니다. 기존 개인 DB는 가져오지 않습니다.
- `npm test`와 오프라인 테스트 실행기를 추가하고 Git 밖에 있던 회귀 테스트의 참조 경로를 사본 구조에 맞췄습니다.
- Android 빌드·실행 스크립트에서 기존 개발자의 SDK/JDK/Node 경로 의존성을 제거했습니다. 서명 비밀번호는 값 없이 환경변수 이름만 사용합니다.
- 원본 `.gitignore`를 보완했습니다. 무시돼 있던 필요한 태그 사전·이미지 원본은 포함 여부를 따로 판단했습니다.
- 생성된 태그 JSON/TS, PNG, APK, 캐시는 제외했습니다. 태그 생성 명령을 빌드 전에 실행해야 합니다. SVG·XML·YAML 원본과 생성 스크립트는 보존했습니다.
- 제품 기능이나 기존 데이터 형식은 이번 작업에서 수정하지 않았습니다.

상세 원본/사본 대응과 수정 여부는 `audit/copy-records.json`, `audit/package-inventory.csv`에 있습니다.

## 현재 구현과 이어서 할 일

| 영역 | 코드에 구현된 동작 | 제한·후속 확인 |
|---|---|---|
| 수집 | 링크/영상 업로드, 제목·메모·수동 태그 선택 입력 | 파일25MB, 공개 메타데이터/원본 접근 실패 시 업로드 필요 |
| AI | Gemini YouTube 링크 분석, OpenAI 원본 프레임 분석, 표준 태그 선택 | 제공자 키·모델 접근권한/요금 확인 필요. 이번에는 유료 API 미호출 |
| 구간 태깅 | 최대30구간, 구간 안의 근거 시간, 부모/이웃 태그 누출 방지 | 2시간 이하. OpenAI는 최대120개 샘플 프레임이므로 빠른 효과를 놓칠 수 있음 |
| 검수 | 확실한 시각 특성 자동 확정, 제작 방식 등 추정 태그 제안·검수 | AI 사전 밖 기존/직접 태그 유지. 실제 영상별 정확도 수동 평가 필요 |
| 재생·파일 | 전체/구간 재생·반복, 원본 및 저화질 구간 저장 | 브라우저 변환0.3초~5분/약360p. 페이지 이탈 시 중단. 모든 외부 영상을 다운로드할 수 있는 것은 아님 |
| 검색·보관 | 색감/구도/효과 AND/OR 검색, 영상/구간 즐겨찾기, 길게 눌러 순서 변경 | 데이터는 연결한 서버 DB에 저장 |
| 사진 검색 | 사진의 정적 특징을 태그로 해석해 저장된 구간 태그와 비교 | 원본 영상 전체 임베딩 검색 아님. 움직임·제작 방식은 사진만으로 추정하지 않음 |
| 추천·피드백 | 유사 효과 카드, 선택형 피드백, YouTube/Shorts/다른 스타일 추천 | 태그·즐겨찾기 가중치이며 계정 취향 학습 모델 아님. 피드백은 해당 검색 조건 범위 |
| 외부 추천 | 공개 검색 HTML → oEmbed 확인 → 부족하면 OpenAI 검색 | 비공식 `ytInitialData` 구조 변경/차단 위험. 검색 메타데이터 기준 추천이지 영상 분석 결과는 아님 |
| Android | ACTION_SEND 링크 수신, 첫 실행 보관함, 공유 시 자동 저장/분석, 첨부/다운로드 | PC가 켜져 있어야 함. 실제 단말 공유/파일 선택/다운로드 재검증 필요 |
| 동기화 | 같은 LAN 연결 서버의 동일 보관함, 약5초 폴링, 진행 중 중복 갱신 억제 | PC 로컬/온라인 사이트 데이터는 별개. 계정 기반 클라우드 동기화 미구현 |

미구현/범위 밖: 여러 사용자 로그인·권한, 여러 보드의 독립 보관함, 백그라운드 분석 큐, 사용량/과금 제어, 완전한 오프라인 분석, Play Store 배포·자동 업데이트, 기존 개인 데이터 자동 이관.

알려진 운영 취약점/확인점:

- Instagram 분석은 공개 페이지·CDN·로그인 제한에 영향을 받습니다. 실패 시 원본 파일 업로드가 필요합니다.
- YouTube 추천은 요청당15초/본문2MB/최대3검색/동시2개 제한이 있습니다. 취향·형식별 결과를 약2시간 캐시합니다.
- 분석 모델 이름은 소스에 지정되어 있습니다. 후임자의 OpenAI/Gemini 계정에서 모델이 사용 가능한지 확인한 뒤 변경 여부를 판단하세요.
- 프레임워크 Vinext는 `1.0.0-beta.5`입니다. 의존성 일괄 업그레이드 전에 회귀 테스트가 필요합니다.
- 로컬 연결 서버는 LAN HTTP와 연결 코드 방식입니다. 실제 사용자 계정 인증을 제공하지 않습니다. PC 절전·IP 변경·방화벽·격리 Wi-Fi에서 접속이 끊길 수 있습니다. 세션은 재시작 시 다시 연결해야 합니다.
- 원본 `.gitignore`에는 일부 캐시가 누락돼 `tsconfig.tsbuildinfo`가 Git 추적 중이었습니다. 사본에는 포함하지 않았습니다.
- 오래된 `public/analysis-worker.js`, `examples/d1/`와 관리형 실행 스크립트는 현재 주 경로에서의 필요성이 확실하지 않아 삭제하지 않았습니다. 유지 이유와 검토 사항을 파일 목록에 기록했습니다.

## 데이터베이스·리소스

`db/schema.ts`는 Drizzle SQLite 스키마입니다. `drizzle/0000_*.sql`부터 `0008_*.sql`까지 9개와 생성 이력 `drizzle/meta/`를 포함했습니다. 주요 테이블은 `clips`, `ai_settings`, `segment_media`, `recommendation_feedback`, `library_order`, `youtube_discovery`입니다. 초기 사용자 데이터(seed)는 없습니다. 새 설치는 빈 보관함으로 시작합니다.

`data/taxonomy/taxonomy.v2.yaml`과 JSON Schema는 필요한 원본 데이터입니다. `npm run taxonomy:generate`로 생성물을 만듭니다. 분석 프롬프트는 `lib/ai/` 코드 안에 포함되어 있으며 별도의 개인 프롬프트/모델 파일은 발견하지 못했습니다. DB/R2/업로드·분석 결과·즐겨찾기·개인 메모는 포함하지 않았습니다.

앱 아이콘은 `cutnote-android/app/src/main/res/drawable/` XML, 웹 아이콘은 `cutnote/public/favicon.svg`입니다. 추가 로고 SVG 4개는 `assets/logos/`에 있습니다. 폰트 바이너리·로컬 모델은 포함하지 않았습니다. 가로형 로고는 Apple 시스템 글꼴의 윤곽선을 사용했으므로 공개 전 권리 검토가 필요합니다.

## 환경변수 이름과 외부 경로

| 이름 | 용도/필수 여부 |
|---|---|
| `CUTNOTE_SECRET_KEY` | API 키 암호화용 base64 32바이트 키. UI에서 키를 저장하려면 필요 |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | 각 제공자 기능 사용 시 필요. UI 저장 키가 우선 |
| `DB`, `BUCKET` | 환경변수 문자열이 아닌 D1/R2 바인딩 |
| `JAVA_HOME`, `ANDROID_SDK_ROOT` | APK 빌드 필수 설치 경로 |
| `CUTNOTE_KEYSTORE_PASSWORD` | 사본 APK 빌드 시 로컬에서 설정할 서명 비밀번호 |
| `CUTNOTE_ANDROID_PLATFORM`, `CUTNOTE_ANDROID_BUILD_TOOLS` | 기본35 / 35.0.0 재정의 |
| `CUTNOTE_NODE`, `CUTNOTE_LAN_HOST` | Node 실행 경로/PC LAN 주소 선택. 선택 사항 |
| `SITES_RUNTIME_ROOT` | 기본 `.sites-runtime` 대신 도구 상태 경로 지정. 보통 불필요 |
| `CLOUDFLARE_CF_FETCH_ENABLED` | 로컬 Request.cf 조회 제어. 기본 false |
| `WRANGLER_SEND_METRICS`, `WRANGLER_WRITE_LOGS` | 도구 텔레메트리/로그. 기본 false |
| `WRANGLER_LOG_PATH`, `WRANGLER_REGISTRY_PATH`, `MINIFLARE_REGISTRY_PATH` | 프로젝트별 도구 상태 경로 |
| `SHARP_IGNORE_GLOBAL_LIBVIPS` | 설치 시 시스템 libvips 대신 패키지 사용 |

관리형 Sites 설치 스크립트에는 추가 `SITES_*`, `npm_*`, `XDG_*`, `CODEX_SANDBOX` 등 도구 전용 변수가 있습니다. 일반 `npm ci`/portable 로컬 실행에는 설정하지 않습니다. 소스에서 발견한 이름 목록은 `audit/environment-variable-names.txt`에 기록합니다. 실제 값은 조사/공유하지 않았습니다.

원본 Android 스크립트의 외부 경로는 작업 폴더의 `work/android-toolchain`과 개발 환경의 Codex Node 런타임이었습니다. 사본에서는 명시적인 환경변수/PATH를 사용합니다. 관리형 템플릿의 `/workspace/...`는 관리형 환경 전용 기본값이며 로컬 설치의 필수 파일 경로가 아닙니다. 실행 소스에서 다른 개인 홈 파일을 런타임 데이터로 직접 참조하는 경우는 발견하지 못했습니다.

## 프로젝트 밖의 관련 파일 — 자동 복사하지 않음

아래는 사용자가 지정했거나 프로젝트 생성 경로로 확인한 파일만 조사했습니다. Downloads 전체·다른 프로젝트는 검색하지 않았습니다.

| 원래 위치(개인 홈 생략) | 처리 이유/후속 확인 |
|---|---|
| `~/Downloads/구현 범위 요약.md` | 초기 요구 자료. 앱에 통합된 동작을 현재 소스로 설명; 문서의 추가 비공개 내용/권리는 재검토 후 공유 |
| `~/Downloads/태깅 기능 기술 구현안 09291200.md` | 설계 참고 문서. 원문은 별도 권리/내용 확인 후 전달 |
| `~/Downloads/README.md` | 태그 자료 안내로 추정. 이름만으로 범용 파일을 패키지에 합치지 않음 |
| `~/Downloads/taxonomy.v2.yaml`, `taxonomy.schema.json` | 실제 앱에 통합된 `cutnote/data/taxonomy/` 사본을 포함. 외부 파일을 최신본으로 간주해 덮어쓰지 않음 |
| `~/Downloads/유사 효과 탐색 카드 기능 설명.md` | 추천 기능 요구 자료. 런타임에서 읽지 않음. 원문 공유 범위 확인 필요 |
| `~/Downloads/KakaoTalk_Video_<사용자 제공 테스트 영상>.mp4` (실제 날짜 포함 파일명 생략) | 사용자가 테스트에 쓴 영상. 개인정보/콘텐츠 권리 때문에 제외 |
| 이전 대화의 `codex-clipboard-*.png` 임시 첨부 경로 | 화면·기획 참고 이미지, 개인정보/임시 파일. 제품 리소스 아님 |
| 설치된 Android SDK/JDK/Node, macOS Apple SD Gothic Neo | 설치 프로그램/OS 글꼴. 바이너리·라이선스 승인 기록·인증서 미복사 |
| 태그 사전의 `분류 후보군_개정판.md` | 사전에 출처 이름만 기록됨. 이번 범위에서 원문·저자·권리 확인 불가 |

외부 파일이 없더라도 앱 소스의 import/리소스 참조는 이 사본 안에서 해결되도록 구성했습니다. 다만 디자인 생성 참고 스크립트는 옛 `outputs/`, `work/logo-outline.json` 구조와 macOS CoreText를 전제로 합니다. 앱 실행에 필요하지 않고 바로 실행 가능한 로고 빌드 도구로 검증하지 않았습니다.

## 검증 결과

검증은 패키지를 별도의 임시 폴더로 복사하여 수행했습니다. 원본 의존성 디렉터리를 심볼릭 링크하거나 원본 DB·API 키를 쓰지 않습니다. 완료한 결과는 아래와 같습니다.

| 검증 | 결과 |
|---|---|
| 독립 npm 설치 | 통과. 새 캐시/검증 사본에 잠금 파일 기준690패키지 설치 |
| 태그 사전 생성 | 통과. 12분류/403태그, 스키마·참조·순환 검사 |
| 웹 운영 빌드 | 통과. Vite/Vinext worker·client·SSR 생성 |
| TypeScript | `--noEmit --incremental false` 통과 |
| 웹 회귀 테스트 | **11/11 묶음 통과**. 실제 현재 소스, 가짜 AI/메모리 DB |
| DB 초기화 | 새 로컬 D1에 **마이그레이션9/9 적용**, 재실행 시 중복 적용 없음 |
| 운영 실행 | `/`, `/mobile` HTML·CSS 로딩, 빈 보관함·키 미연결 상태 확인 |
| 합성 저장 검증 | 검증 사본에서 example.invalid 링크 클립 저장→조회→삭제 통과 |
| Android | **211/211 검사**, APK 빌드·v2/v3 서명·zipalign 통과 |
| LAN 연결 서버 | 테스트용 loopback에서 **18/18 통과** |
| 스크립트 문법 | 변경한 Bash/zsh/Node 실행 진입점 통과 |
| 원본/Git 보존 | 원본251개·Git 메타4개 hash 일치. 시작/완료 시 웹 Git clean |

검증 도구: macOS arm64, Node24.19.0, npm10.9.2, JDK Temurin21.0.12.1+1, SDK35/build-tools35.0.0. 설치 도구는 컴퓨터에 있던 실행 파일을 사용했지만 의존성과 앱 소스·DB는 검증 사본만 사용했습니다. 세부 기록은 `audit/validation-results.json`에 있습니다.

처음 제한된 실행 환경에서는 npm registry DNS 및 loopback listen이 차단됐습니다. 다운로드/로컬 소켓 사용을 허용한 뒤 같은 명령으로 모두 통과했습니다. 설치의 구형 esbuild-kit 안내, Vinext의 정적 페이지 분류 한계, Java8 대상/deprecated API 안내가 있었으며 성공 결과와 구분해 기록했습니다. 테스트 중 제공자 402 메시지는 **가짜 오류 응답 검증**으로 실제 잔액 오류가 아닙니다.

실제 유료 AI 호출0회. 기존 사용자 DB/비밀값 사용0건. 검증용 서버는 종료했습니다. APK·키스토어·빌드물·의존성·검증 DB·원시 로그는 최종 인수인계 폴더에 포함하지 않았습니다. 실기기 UI·Wi-Fi 두 기기 동기화·실제 영상 분석·온라인 배포·Windows는 검증하지 않았습니다.

## 후임자가 직접 확인할 사항

1. 팀 코드 공개 라이선스와 태그 사전·가로형 로고의 사용/재배포 권리를 결정하세요. 의존성 전체의 배포 의무 확인은 별도입니다.
2. 새 제공자 API 키·암호화 키를 로컬에서 설정하고, 작은 테스트 영상 1개로 비용·모델 접근·구간 태깅 정확도를 확인하세요.
3. 실제 Android에서 앱 일반 실행, YouTube/Instagram 공유, 보류 공유 재개, 영상/사진 첨부, 파일 저장을 확인하세요.
4. 호스트 PC와 다른 PC/휴대폰에서 동일 서버로 연결한 뒤 양방향 저장·태그 변경·즐겨찾기·순서 변경을 확인하세요.
5. 기존 설치 위에 APK를 업데이트하려면 기존 서명 키가 필요합니다. 이 패키지에는 없으며 공개 GitHub에 넣지 않습니다.
6. 온라인 배포는 새 소유자의 리소스/도메인과 비밀 설정으로 구성하세요. 로컬 개인 데이터와 자동 합쳐지지 않습니다.
7. `work/`의 미이식 테스트/리뷰 목록을 보고 추가 회귀 검증의 우선순위를 정하세요. 불확실한 파일은 제외 사유와 함께 기록했습니다.
