# 문서 정리 기록

> 아래는 2단계 이전 기록이며 본문의 이전 경로·삭제 사실을 보존합니다. 현재 위치는 [리팩토링 학습 기록](../../docs/refactoring-study.md)의 2단계 이동표를 확인하세요.

[문서 목록](../../docs/README.md)

2026-10-02: 사용자 승인에 따라 아래 옛 문서 12개를 삭제했습니다. 필요한 현재 안내는 통합 기술문서에 반영했습니다. 실행 소스·개인 파일·감사 기록은 보존했습니다.

| 삭제 완료 | 대체 위치/이유 |
|---|---|
| `legacy/구현 범위 요약.md` | 개정 요구·현재 구조 문서로 대체된 초기안 |
| `legacy/구현 예시.md` | 현재 소스와 구조 문서로 대체 |
| `legacy/분류 후보군.md` | 앱의 v2 사전과 태깅 문서로 대체 |
| `legacy/초기 아이디어 기획서.public.md` | 초기 공개 기획; 현행 문제 정의·서비스 소개 유지 |
| `main/initial_index.md` | 예전 컴퓨터 절대경로·인수인계 요약 |
| `main/handoff-package/HANDOFF.md` | 구조·설치·보안·테스트 문서로 대체 |
| `main/handoff-package/FILE_MANIFEST.md` | 구조 문서; 원본 출처는 audit에 보존 |
| `main/handoff-package/EXCLUDED_FILES.md` | 보안 문서와 .gitignore로 대체 |
| `docs/태깅 기능 기술 구현안 09291200.md` | 미구현·PostgreSQL 전제의 옛 설계안 |
| `docs/태깅 기능 기술 구현 프롬프트 09291200.md` | 완료된 전환 작업 지시문 |
| `docs/태깅 기능 구체화.md` | 현행 태깅 문서로 통합 |
| `SECURITY_REMEDIATION.md` | 현행 보안·테스트 문서로 통합 |

아래 상세 본문은 `docs/`에 통합하고 링크·현황을 갱신했습니다. 원래 위치에는 통합 문서로 이동하는 짧은 안내만 남겼습니다.

- `main/handoff-package/LICENSE_NOTES.md` → `docs/licenses.md`
- `main/handoff-package/docs/LINT_FIX_STUDY.md` → `docs/lint-notes.md`
- `main/handoff-package/tests/README.md` → `docs/testing-details.md`
- `main/handoff-package/cutnote-android/README.md` → `docs/android.md`
- `main/handoff-package/cutnote-android/bridge/README.md` → `docs/lan.md`

`audit/`, 비공개 `legacy/초기 아이디어 기획서.md`, 실행 코드의 legacy 호환 로직은 보존합니다. 제품·발표 문서는 이동하지 않았습니다.
