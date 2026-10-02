# 구조와 코드 지도

[문서 목록](README.md) · 기준일: 2026-10-02

## 저장소 구조

| 경로 (저장소 루트 기준) | 역할 |
|---|---|
| `main/handoff-package/cutnote/` | 현재 웹 UI·API·분석·저장소 |
| `main/handoff-package/cutnote-android/` | Android 앱, PC 실행기, LAN 서버 |
| `main/handoff-package/tests/` | 현재 웹 소스를 검사하는 오프라인 회귀 테스트 |
| `main/handoff-package/assets/logos/` | 로고 SVG 원본 |
| `main/handoff-package/reference/design/` | 과거 로고 제작 참고 소스; 앱 빌드에는 불필요 |
| `main/handoff-package/audit/` | 인수인계 당시 파일·출처·검증 기록 |
| `docs/` | 현재 기술문서와 제품·발표 자료 |
| `scripts/` | 공개 후보·비밀값 검사와 이전 분류표 변환 도구 |
| `taxonomy/` | 이전 분류표 자료; 앱 런타임 기준 아님 |
| `material/` | 브랜드 이미지 |

`main/outputs/`, `main/work/`, 중복 `main/handoff-package/handoff-package/`는 Git에서 제외된 보관용입니다. `docs_ext/`, `example/`, 비공개 안내문·발표 PDF도 로컬 보존 대상입니다. 현재 소스 대신 수정하거나 배포하지 않습니다.

## 웹 내부

아래 경로는 `main/handoff-package/cutnote/` 기준입니다.

| 위치 | 책임 |
|---|---|
| `app/page.tsx`, `app/cutnote.tsx` | 홈 진입과 보관함 상태·화면 |
| `app/mobile/` | 모바일 보관함·공유 저장 화면 |
| `app/segment-library.tsx`, `segment-editor.tsx`, `tag-review.tsx` | 구간 목록·편집·검수 |
| `app/video-player.tsx`, `source-player.tsx` | 파일·외부 소스 재생 |
| `app/image-search.tsx`, `effect-explorer.tsx`, `youtube-discovery.tsx` | 사진 검색·효과 탐색·추천 |
| `app/api/` | HTTP API, 하위 `route.ts`가 진입점 |
| `components/`, `hooks/` | 공통 UI와 React 훅 |
| `lib/clips.ts`, `segments.ts`, `tagging.ts`, `segment-tagging.ts` | 클립·구간·태그 검수 정책 |
| `lib/ai/`, `lib/analysis/`, `lib/links/` | 제공자 호출·파싱, 프레임/영상 분석, 링크 해석 |
| `lib/segment-search.ts`, `image-search.ts`, `recommendations.ts` | 검색과 추천 |
| `lib/server.ts` | DB·버킷 접근, 직렬화, 공통 응답 |
| `db/schema.ts`, `drizzle/` | SQLite 스키마와 0000~0008 마이그레이션 |
| `data/taxonomy/`, `lib/taxonomy.ts` | 태그 원본·스키마와 조회·별칭 처리 |
| `scripts/` | 실행, DB 초기화, 태그 생성 |
| `build/` | Worker 진입점·Vite 플러그인 입력 소스 |
| `dist/`, `.next/`, `.wrangler/` | 생성물·로컬 상태; Git 제외 |

## 요청과 저장 흐름

브라우저 → `app/api/**/route.ts` → `lib/`의 검증·분석·검색 → D1/R2로 연결됩니다. 원본 프레임 추출과 구간 내보내기에는 브라우저 작업도 포함됩니다.

D1 테이블은 `clips`, `ai_settings`, `segment_media`, `recommendation_feedback`, `library_order`, `youtube_discovery`입니다. 구간·태그·분석 이력 일부는 JSON 문자열 컬럼입니다. 별도 PostgreSQL 태그 테이블이 존재한다고 가정하지 않습니다. 영상·포스터·구간 객체는 R2를 사용합니다.

주요 API는 `clips`, `media`, `segment-media`, `ai/analyze`, `ai/frames`, `ai/connect`, `ai/status`, `ai/image-query`, `ai/effect-query`, `links/resolve`, `links/media`, `library/order`, `recommendations/youtube`, `recommendations/feedback`입니다. 메서드·응답은 각 `route.ts`를 기준으로 확인합니다.

Android → LAN Bridge(5174) → PC 웹(5173) → 동일한 D1/R2를 사용합니다. 온라인 사이트와 로컬 PC DB는 별개입니다.

## 기능 수정 시 연결 지점

- 태깅: `lib/tagging.ts`, `lib/segment-tagging.ts`, `lib/ai/result.ts`와 구간 검수 테스트.
- 데이터: `db/schema.ts`, 신규 migration, API 직렬화와 테스트 DB.
- LAN API 추가: 웹 route와 `cutnote-android/bridge/server.mjs`의 허용 경로·메서드 및 테스트.
- 보관함 갱신: `app/cutnote.tsx`와 `tests/web/sync-polling-tests.mjs`.
