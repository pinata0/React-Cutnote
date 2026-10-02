# 컷노트 문서 목록

기준일: 2026-10-02 (Asia/Seoul). 현재 개발·실행 소스는 `apps/web/`와 `apps/android/`, 테스트는 `tests/`입니다.

| 구분 | 내용 |
|---|---|
| [기술문서](engineering/README.md) | 구조 → 설치 → 개발 규칙 → 테스트 순서로 읽기 |
| [제품 기획](product/README.md) | 문제 정의, 요구 범위, 서비스 소개, 기능·영상 참고 |
| [발표 자료](presentations/README.md) | 발표 대본과 Q&A, 작성 시점의 제품 설명 |
| [공개 과거 기록](../archive/README.md) | 이전 사전·변환기, 인수인계 감사, 디자인 참고, 초기 기획 |
| [리팩토링 계획과 학습 기록](refactoring-study.md) | 단계별 요청문, 판단 근거, 이동 전후 경로와 실제 검증 |

## 현재 구현과 문서 기준

웹은 React + Vinext/Vite, 저장소는 Cloudflare D1(SQLite)·R2, DB 정의와 마이그레이션은 Drizzle을 사용합니다. Android는 Java WebView 앱이고 Node LAN 서버를 통해 PC 보관함에 연결합니다. 과거 PostgreSQL 설계안은 현재 구현이 아닙니다.

링크·파일 저장, OpenAI/Gemini 분석, 구간별 태그·검수, AND/OR 검색, 즐겨찾기·정렬, 사진/효과 검색, YouTube 추천·피드백, 구간 파일 저장이 구현되어 있습니다. 계정별 클라우드 동기화, 백그라운드 분석 큐, 과금 제어, Play Store 배포·자동 업데이트는 구현 범위에 없습니다.

코드·설정이 현재 구현의 근거입니다. 제품 요구·발표 문서는 배경 자료이며 현재 실행 지침이 아닙니다. 인수인계 해시·의존성·검증 결과는 당시 기록으로 보존합니다. 앱 사전 원본은 `apps/web/data/taxonomy/`이고, 과거 사전은 `archive/taxonomy/`입니다.

Git 제외 보관본과 개인 DB·영상·키는 이동하지 않았습니다. 별도 보관 대상은 [archive 보존 정책](../archive/README.md)에 기록했습니다.
