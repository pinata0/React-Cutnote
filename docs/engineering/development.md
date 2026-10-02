# 개발 규칙

[문서 목록](../README.md) · 기준일: 2026-10-02

## 구조와 코드

- `apps/`와 `tests/`를 수정 기준으로 사용합니다. 웹과 Android는 `apps/` 아래 형제 폴더이며, 테스트는 저장소 루트의 `tests/`에 있습니다. 실행기와 테스트가 이 배치를 사용합니다.
- `apps/web/build/`는 입력 소스입니다. 생성물인 `dist/`와 혼동하지 않습니다.
- 기술문서는 `docs/engineering/`에서 관리하고 기능·명령 변경 시 함께 갱신합니다. 제품·발표 자료는 각각 `docs/product/`, `docs/presentations/`, 과거 기록은 `archive/`에 보관합니다.
- TypeScript는 `strict: true`, `@/*`는 웹 프로젝트 루트를 가리킵니다.
- ESLint는 Next core-web-vitals와 TypeScript 규칙입니다. 설정 기준은 `eslint.config.mjs`와 `tsconfig.json`입니다.
- 남아 있는 `components/ui/**`에는 외부 UI 원본 보존을 위한 unused-vars, purity, set-state-in-effect 예외가 있습니다. 이를 앱 전체로 확대하지 않습니다. 미사용 UI 55개와 `hooks/use-mobile.ts`, D1 예제는 리팩토링 3단계에서 제거했습니다.
- 별도 Prettier 설정·커밋 메시지 규약은 확인되지 않았습니다. 인접 코드 스타일을 따르고 불필요한 전체 재서식을 피합니다.
- 외부 JSON은 `unknown`에서 타입·범위를 확인합니다. AI 응답을 타입 단언만으로 신뢰하지 않습니다. 비동기 취소·오래된 응답·React 상태 보존은 [lint 학습 노트](lint-notes.md)를 참고합니다.

## 데이터와 생성물

- DB 변경은 `db/schema.ts`와 migration을 함께 관리합니다. 이미 적용된 migration을 편의상 수정하지 않습니다.
- 사용자 승인·거절·직접 태그는 재분석 시 보존합니다. [태깅 정책](tagging.md)을 따릅니다.
- 사전 원본은 `apps/web/data/taxonomy/taxonomy.v2.yaml`입니다. 생성 JSON과 `lib/taxonomy-data.ts`를 직접 수정하지 않습니다.
- 의존성 변경에는 `package.json`과 `package-lock.json`을 함께 갱신하고 호환성을 검증합니다.
- 키·개인 DB·영상·서명 파일은 Git에서 제외합니다. `.gitignore`를 우회하는 `git add -f`를 사용하지 않습니다.

## 검증

웹 코드 변경에는 lint·타입·회귀 테스트·빌드를 확인합니다. LAN 변경에는 Bridge 테스트, Android 변경에는 JVM/APK와 관련 실기기 확인을 추가합니다. 문서만 바꾸면 링크·경로·명령 일치와 공개 검사를 우선합니다.

자동 회귀 테스트는 가짜 제공자와 메모리 DB를 사용합니다. 개인 DB·유료 API를 연결하지 않습니다. 결과에는 날짜·환경·실제 실행 범위와 미검증 범위를 구분합니다. 명령은 [테스트](testing.md)에 있습니다.
