# 컷노트 기술문서

기준일: 2026-10-02 (Asia/Seoul). 현재 개발·실행 소스는 `main/handoff-package/`입니다.

처음 참여했다면 **구조 → 설치 → 개발 규칙 → 테스트** 순서로 읽으세요. 현재 개발 안내는 이 폴더를 기준으로 관리합니다.

| 문서 | 내용 |
|---|---|
| [구조와 코드 지도](architecture.md) | 폴더 역할, 기능별 수정 위치, 데이터 흐름 |
| [설치와 실행](setup.md) | Windows 로컬 실행, 환경변수, DB, LAN |
| [개발 규칙](development.md) | 타입·lint, 데이터 보존, 생성물과 검증 |
| [태깅 정책](tagging.md) | 실제 사전 원본, 검수·재분석·검색 규칙 |
| [테스트와 현재 확인 범위](testing.md) | 검증 명령과 결과의 해석 |
| [보안과 공개](security.md) | 비밀값·개인 파일 제외와 공개 검사 |
| [문서 정리 기록](cleanup.md) | 삭제한 옛 문서와 대체 위치 |

[Android](android.md), [LAN](lan.md), [라이선스](licenses.md), [lint 학습 노트](lint-notes.md), [웹 테스트 상세](testing-details.md) 본문도 이 폴더에 통합했습니다. 중복 문서는 통합 문서 링크로 전환하고, 대체된 옛 문서 12개는 삭제했습니다.

## 현재 구현

웹은 React + Vinext/Vite, 저장소는 Cloudflare D1(SQLite)·R2, DB 정의와 마이그레이션은 Drizzle을 사용합니다. Android는 Java WebView 앱이고 Node LAN 서버를 통해 PC 보관함에 연결합니다. 과거 PostgreSQL 설계안은 현재 구현이 아닙니다.

링크·파일 저장, OpenAI/Gemini 분석, 구간별 태그·검수, AND/OR 검색, 즐겨찾기·정렬, 사진/효과 검색, YouTube 추천·피드백, 구간 파일 저장이 구현되어 있습니다. 계정별 클라우드 동기화, 백그라운드 분석 큐, 과금 제어, Play Store 배포·자동 업데이트는 구현 범위에 없습니다.

## 문서의 기준

코드·설정이 현재 구현의 근거입니다. 경로·명령·정책 변경 시 관련 문서도 같은 변경에서 갱신합니다. 제품 요구·발표 문서는 배경 자료이며 현재 실행 지침이 아닙니다. `main/handoff-package/audit/`는 2026-10-01 인수인계 기록으로, 현재 해시·의존성 목록이 아닙니다.

루트 `taxonomy/`도 과거 분류표 자료입니다. 앱은 `main/handoff-package/cutnote/data/taxonomy/`를 읽습니다.
