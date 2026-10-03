# 구조와 코드 지도

2026-10-03 추가: PC 로컬 수집 작업자는 `apps/pc/`에서 실행됩니다. [운영 안내](local-video-ingestion-operations.md)와 [구현·검증 상태](local-video-ingestion-progress.md)를 함께 확인하세요. 외부 PC 5173·LAN 5174는 유지하고 내부 Worker는 5175로 분리했습니다.

[문서 목록](../README.md) · 기준일: 2026-10-03

## 저장소 구조

| 경로 (저장소 루트 기준) | 역할 |
|---|---|
| `apps/web/` | 현재 웹 UI·API·분석·저장소 |
| `apps/pc/` | Node 도구 실행·영속 작업·로컬 스트리밍; [구조·API](local-video-ingestion-reference.md) |
| `apps/android/` | Android 앱, PC 실행기, LAN 서버 |
| `tests/` | 현재 웹 소스를 검사하는 오프라인 회귀 테스트 |
| `assets/branding/` | 브랜드 PNG 2개·SVG 4개; 출처를 유지한 통합 위치 |
| `archive/design/` | 과거 로고 제작 참고 소스; 앱 빌드에는 불필요 |
| `archive/handoff-2026-10-01/audit/` | 인수인계 당시 파일·출처·검증 기록 |
| `docs/engineering/` | 현재 기술문서와 개발 학습 자료 |
| `docs/product/` | 제품 요구·소개·영상 참고 자료; 실행 지침과 구별 |
| `docs/presentations/` | 발표 대본·Q&A; 작성 시점의 설명 |
| `docs/refactoring-study.md` | 단계별 리팩토링 계획과 실제 수행 기록 |
| `archive/` | 공개 가능한 과거 기록의 목록과 보존 기준 |
| `scripts/` | 공개 후보·비밀값 검사 |
| `archive/taxonomy/` | 이전 분류표 자료; 앱 런타임 기준 아님 |

`main/outputs/`, `main/work/`, 중복 `main/handoff-package/handoff-package/`는 Git에서 제외된 보관용입니다. `docs_ext/`, `example/`, 비공개 안내문·발표 PDF도 로컬 보존 대상입니다. 현재 소스 대신 수정하거나 배포하지 않습니다.

## 웹 내부

아래 경로는 `apps/web/` 기준입니다.

| 위치 | 책임 |
|---|---|
| `app/page.tsx`, `app/mobile/page.tsx`, `app/layout.tsx` | 홈·모바일 페이지와 레이아웃 진입점 |
| `features/library/` | 보관함·모바일 저장 UI, 편집·상세 화면, 상태 조정·동기화·분석 훅, 순서·즐겨찾기 규칙 |
| `features/segments/` | 구간 목록·편집, 입력 변환, 구간 검색·재태깅 병합 |
| `features/tagging/` | 태그 검수·필터·분석 이력 UI |
| `components/media/` | 여러 기능이 공유하는 파일·외부 소스 재생 |
| `features/discovery/` | 사진 검색·효과 탐색·추천 UI와 순수 검색·취향 규칙 |
| `features/connections/` | PC·AI 연결 UI |
| `app/api/` | HTTP API, 하위 `route.ts`가 진입점 |
| `components/` | 공통 오류 UI와 사용 중인 UI 6개; 미사용 UI·모바일 훅은 3단계에서 제거 |
| `lib/clips.ts`, `segments.ts`, `tagging.ts` | UI·API·분석이 공유하는 클립·구간·태그 데이터 규칙 |
| `lib/ai/`, `lib/analysis/`, `lib/links/` | 제공자 호출·파싱, 프레임/영상 분석, 링크 해석 |
| `lib/client-request.ts` | 보관함·분석 훅의 공통 JSON 요청·오류 처리 |
| `lib/server.ts`, `lib/server/chatgpt-auth.ts` | 서버 DB·버킷 접근 및 인증; 클라이언트에서 import하지 않음 |
| `db/schema.ts`, `drizzle/` | SQLite 스키마와 0000~0009 마이그레이션 |
| `data/taxonomy/`, `lib/taxonomy.ts` | 태그 원본·스키마와 조회·별칭 처리 |
| `scripts/` | 실행, DB 초기화, 태그 생성 |
| `build/` | Worker 진입점·Vite 플러그인 입력 소스 |
| `dist/`, `.next/`, `.wrangler/` | 생성물·로컬 상태; Git 제외 |

## 요청과 저장 흐름

브라우저 → `app/api/**/route.ts` → 공통 데이터 규칙·기능별 순수 검색 규칙·서버 제공자 코드 → D1/R2로 연결됩니다. 원본 프레임 추출과 구간 내보내기에는 브라우저 작업도 포함됩니다. `features`의 모든 파일이 브라우저 전용인 것은 아닙니다. API는 순수 규칙을 사용하고 UI·훅을 가져오지 않습니다.

보관함 화면은 `library-workspace.tsx` → `use-library-workspace.ts` → `use-library-sync.ts` / `use-clip-analysis.ts` 방향으로 연결됩니다. 편집·상세 화면은 상태와 동작을 props로 받으며 컨트롤러 타입만 참조합니다. 상태 조정 훅은 자식 화면을 import하지 않습니다. 공통 UI·재생기는 상위 보관함 화면에 의존하지 않습니다.

D1 테이블은 `clips`, `ai_settings`, `segment_media`, `recommendation_feedback`, `library_order`, `youtube_discovery`, `pc_jobs`입니다. 구간·태그·분석 이력 일부는 JSON 문자열 컬럼입니다. 별도 PostgreSQL 태그 테이블이 존재한다고 가정하지 않습니다. 기존 업로드 영상·포스터·구간 객체는 R2를 사용합니다. PC 수집 원본·썸네일·구간 파일은 지정 로컬 폴더에 두고 D1의 자산 ID·상대 파일 정보로 연결합니다.

주요 API는 `clips`, `media`, `segment-media`, `ai/analyze`, `ai/frames`, `ai/connect`, `ai/status`, `ai/image-query`, `ai/effect-query`, `links/resolve`, `links/media`, `library/order`, `recommendations/youtube`, `recommendations/feedback`입니다. 메서드·응답은 각 `route.ts`를 기준으로 확인합니다.

Android → LAN Bridge(5174) → PC Gateway(5173) → 내부 Worker(5175) → 동일한 D1/R2로 연결됩니다. PC 로컬 프레임 추출·내보내기는 Node/FFmpeg가 맡습니다. 새 jobs/settings/internal API와 모듈·흐름도는 [PC 구조·API 기준](local-video-ingestion-reference.md)에 모았습니다. 온라인 사이트와 로컬 PC DB는 별개입니다.

## 기능 수정 시 연결 지점

- 태깅: `lib/tagging.ts`, `features/segments/segment-tagging.ts`, `lib/ai/result.ts`와 구간 검수 테스트.
- 데이터: `db/schema.ts`, 신규 migration, API 직렬화와 테스트 DB.
- LAN API 추가: 웹 route와 `apps/android/bridge/server.mjs`의 허용 경로·메서드 및 테스트.
- 보관함 갱신: `features/library/use-library-sync.ts`와 `tests/web/sync-polling.test.mjs`.
- 분석 요청·편집 결과 적용: `features/library/use-clip-analysis.ts`, `use-library-workspace.ts`와 `tests/web/clip-analysis.test.ts`.
