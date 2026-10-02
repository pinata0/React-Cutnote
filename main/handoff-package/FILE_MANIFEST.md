# 파일 인수인계 목록

원본 기준점 `<PROJECT_ROOT>`는 원래 작업 폴더 `files-mentioned-by-the-user-codex`입니다. 아래 원래 위치는 이 기준점 아래의 상대 경로입니다. 개인 홈 경로는 공개 패키지에서 생략했습니다. 전달 폴더의 기준점은 이 파일이 있는 `handoff-package/`입니다.

Git ‘예’는 **앞으로 새 저장소에 포함할 소스**라는 뜻입니다. 이번 작업에서 Git 인덱스·브랜치·커밋·원격을 변경하지 않았습니다. 검사 ‘예’는 파일 형식/실제 비밀값 패턴/개인 경로 정적 검사를 뜻하며, 알려지지 않은 모든 형태의 비밀정보 부재를 수학적으로 보장하지 않습니다.

| 원래 위치 | 인수인계 위치 | 용도 | Git 포함 | 비밀정보 검사 | 누락·추가 확인 |
|---|---|---|---|---|---|
| `outputs/cutnote/app/` | `cutnote/app/` | 웹 화면, 저장/분석/검색/추천/연결 API | 예 | 예 | 실제 AI·외부 영상 접근 수동 검증 |
| `outputs/cutnote/components/`, `hooks/` | `cutnote/components/`, `hooks/` | UI 컴포넌트·공유 hook | 예 | 예 | 미사용 starter 컴포넌트도 섣불리 제외하지 않음 |
| `outputs/cutnote/lib/` | `cutnote/lib/` | 분석 프롬프트·표준 태그 처리·구간·검색·서버 로직 | 예 | 예 | `taxonomy-data.ts`만 재생성 대상으로 제외 |
| `outputs/cutnote/data/taxonomy/taxonomy.v2.yaml` | 같은 하위 위치 | 필수 원본 태그 사전 | 예, 권리 확인 후 공개 | 예 | 출처 문서/저작권 미확인. JSON 생성물 대신 원본 포함 |
| `outputs/cutnote/data/taxonomy/taxonomy.schema.json` | 같은 하위 위치 | 태그 데이터 검증 스키마 | 예 | 예 | 생성 스크립트와 함께 유지 |
| `outputs/cutnote/db/schema.ts` | `cutnote/db/schema.ts` | 현행 Drizzle SQLite 스키마 | 예 | 예 | 개인 DB 파일은 미포함 |
| `outputs/cutnote/drizzle/` | `cutnote/drizzle/` | SQL 9개와 마이그레이션 메타 이력 | 예 | 예 | 사용자 seed 없음. 신규 DB에 전부 적용 |
| `outputs/cutnote/public/` | `cutnote/public/` | favicon SVG, 기존 분석 worker | 예 | 예 | legacy worker의 현행 필요성·외부 모델 라이선스 확인 |
| `outputs/cutnote/vendor/` | `cutnote/vendor/` | shadcn CSS·MIT 고지 | 예 | 예 | 고지 보존 |
| `outputs/cutnote/build/` | `cutnote/build/` | Sites worker·Vite/connector 플러그인 **원본 소스**·MIT 고지 | 예 | 예 | `build`라는 이름이어도 필수 소스이므로 제외하지 않음 |
| `outputs/cutnote/scripts/` | `cutnote/scripts/` | 실행/설치/태그 생성 도구 | 예 | 예 | 관리형 Linux 경로는 선택 환경. portable 실행 검증 |
| `outputs/cutnote/examples/` | `cutnote/examples/` | 초기 D1 사용 예제 | 예 | 예 | 현재 앱의 필수 여부 불확실하여 참고 소스 보존. 별도 실행 미검증 |
| `outputs/cutnote/package.json`, `package-lock.json` | `cutnote/` 동일 이름 | 의존성·잠금·명령 | 예 | 예 | 사본 package에 `test`, `db:init`만 추가. lock 유지 |
| `outputs/cutnote/`의 TS/Vite/Next/ESLint/PostCSS/Drizzle 설정, 타입 선언, `components.json`, `.npmrc` | `cutnote/` 동일 이름 | 빌드·개발 구성 | 예 | 예 | `.npmrc` 인증정보 없음. 개인 env/캐시 제외 |
| `outputs/cutnote/.openai/hosting.json` | `cutnote/.openai/hosting.json` | 필수 바인딩 이름 설정 | 예 | 예, 정제 | 원래 `project_id` 제거. 새 계정으로 배포 재설정 |
| `outputs/cutnote-android/app/src/main/` | `cutnote-android/app/src/main/` | Java·manifest·Android XML 리소스 | 예 | 예 | 서명 키/SDK 없음. 실기기 UX 수동 확인 |
| `outputs/cutnote-android/tests/*.java` | `cutnote-android/tests/` | 공유·연결·첨부·다운로드 JVM 검사 | 예 | 예, 가짜 fixture 확인 | 211개 통과. 실단말 테스트 대체 아님 |
| `outputs/cutnote-android/bridge/server.mjs`, `server.test.mjs` | `cutnote-android/bridge/` 동일 이름 | LAN 인증/전달 서버와 회귀 테스트 | 예 | 예, 가짜 fixture 확인 | 실제 연결 코드 미포함 |
| `outputs/cutnote-android/launcher.mjs` | `cutnote-android/launcher.mjs` | PC 웹/연결 서버 실행 | 예 | 예 | `cutnote` 형제 구조 유지, PC는 켜져 있어야 함 |
| Android `build.sh`, 두 `.command`, `.gitignore` | `cutnote-android/` 동일 하위 위치 | 빌드·실행 진입점 | 예 | 예, 정제 | 사본만 SDK/JDK/Node 경로·서명 비밀번호 환경변수화 |
| `outputs/cutnote-logo-kit/*.svg` | `assets/logos/*.svg` | 앱/웹 아이콘과 가로형 로고 4개 | 예, 가로형 권리 확인 후 공개 | 예, 외부 이미지/폰트 없음 | Apple 글꼴 윤곽선 사용한 가로형 2개 권리 확인 필요 |
| `work/export-cutnote-logo.py`, `logo-outline.swift` | `reference/design/` 동일 이름 | 로고 원본 생성 경위·편집 참고 | 예 | 예 | 과거 폴더 구조/OS 글꼴 의존. 앱 빌드에 불필요, 직접 실행 미검증 |
| 선별한 `work/*.ts`, `sync-polling-tests.mjs`, `mock-cloudflare.ts` | `tests/web/` | 현재 소스에 대한 오프라인 회귀 테스트 | 예 | 예, 가짜 데이터·키 확인 | 복사 후 import/SQL 경로 수정. 파일별 출처는 tests/README |
| 신규 작성 | `tests/run-web.mjs`, 합성 YouTube 테스트, `tests/README.md` | 독립 실행기·실제 HTML 대신 합성 fixture | 예 | 예 | 유료 API·기존 서버 미접촉 |
| 신규 작성 | `cutnote/scripts/init-local-db.mjs` | 전체 로컬 D1 migration 적용 | 예 | 예 | 새 DB와 재실행 확인. 기존 DB 자동 이관 아님 |
| 신규 작성 / 원본 문서 통합 | 루트 안내 MD, `.env.example`, `.gitignore`, 하위 README | 설치·현황·권리·파일·비밀 설정 안내 | 예 | 예, env 값 공란 | 사람이 권리/배포/실기기 확인 |
| 조사 기록으로 신규 작성 | `audit/` | 원본 비교 hash, 세부 파일/환경변수/의존성/제외 목록 | 예 | 예, 상대 경로만 | 원본 비밀/개인 DB 본문은 읽거나 기록하지 않음 |

## 파일 단위 목록과 복사 증거

- [audit/package-inventory.csv](audit/package-inventory.csv): 모든 전달 파일의 원래 위치, 목적, Git 포함 여부, 정적 검사 여부, 수정 여부, 추가 확인, SHA-256입니다. 신규 문서/도구는 원본을 `신규 작성`으로 표시합니다. 자기 자신인 CSV의 hash는 순환을 피하기 위해 비웁니다.
- [audit/copy-records.json](audit/copy-records.json): 복사한 각 파일의 원본/사본 SHA-256, 수정 여부입니다.
- [audit/original-baseline.json](audit/original-baseline.json): 작업 전 원본 소스·리소스251개 및 Git 메타4개의 비교 기준 hash입니다. 인증정보 값은 없습니다.
- [audit/original-preservation.json](audit/original-preservation.json): 완료 시 기준 hash와 비교한 원본 보존 결과입니다.
- [audit/work-file-review.csv](audit/work-file-review.csv): Git 밖의 작업 파일/폴더192개에 대한 개별 복사 여부와 미이식·불확실 사유입니다.
- [EXCLUDED_FILES.md](EXCLUDED_FILES.md): 생략한 데이터·비밀·생성물의 범위와 이유입니다.

## 누락 가능성이 남은 곳

Git만으로는 Android·작업 폴더의 테스트·로고를 모을 수 없어 별도로 포함했습니다. 실제 개인 보관함·영상·연결 코드·서명 키는 의도적으로 빠져 있으므로 예전 앱과 같은 내용이 나타나는 패키지는 아닙니다.

프로젝트 밖 설계 문서 원문, 태그 사전의 출처 문서, 실서버용 과거 테스트, 디자인 중간 산출물은 자동 복사하지 않았습니다. HANDOFF 외부 자료 표와 work 목록에 기록했으며, 필요 없다고 확정한 것은 아닙니다. 실행에 필요한 외부 **소스 파일** 누락은 독립 설치·빌드·테스트 범위에서 발견하지 못했습니다.
