# 공개 가능한 과거 기록

[현재 문서 목록](../docs/README.md)

| 보관 위치 | 출처와 보존 이유 |
|---|---|
| [taxonomy](taxonomy/README.md) | 이전 분류표 원문·YAML·스키마·변환 도구를 함께 보존. 현재 앱 사전과 별개 |
| [handoff-2026-10-01/audit](handoff-2026-10-01/audit/) | 인수인계 당시 감사·출처·검증·해시 10개 파일. 내용과 내부 당시 경로는 원본 그대로 |
| [design](design/README.md) | 로고 제작 Python·Swift 참고 소스. 앱 실행에 사용하지 않음 |
| [문서 정리 기록](documentation/cleanup.md) | 2단계 이전의 문서 삭제·통합 이력. 본문 경로는 당시 기준 |
| [초기 아이디어 메모](<planning/아이디어 베끼기.md>) | 현재 제품 외 아이디어도 있는 초기 탐색 기록 |
| [참가자 허브 공개 예제](event/참가자-허브.example.md) | 자리표시자만 있는 행사 참고 문서. 비공개 안내 원문과 구별 |

과거 해시와 의존성 목록을 현재 상태에 맞게 다시 쓰지 않습니다. 디자인 소스·PNG·SVG나 현재/과거 사전은 출처와 역할이 달라 중복 삭제하지 않았습니다. 현재 브랜드 자산은 4단계에서 `assets/branding/`으로 이동했습니다. PNG·SVG의 파일 내용은 그대로입니다.

## 별도 비공개 보관 대상 — 이번 이동 제외

- `main/outputs/`, `main/work/`, `main/handoff-package/handoff-package/`: 원본·작업·중첩 보관본, 개인 자료 혼재 가능.
- `docs_ext/`, `example/`, 제외된 `legacy/` 자료: 로컬 보존 대상.
- `docs/Presentation.pdf`, 비공개 참가 안내문: 개인 화면·행사 접근정보가 포함될 수 있어 기존 위치와 제외 정책 유지.
- 웹 `.wrangler/`, DB·영상·환경 키·연결 파일·서명 키: 영속 상태·개인 설정이며 archive로 복사하지 않음.
- `.sites-runtime/`, 제외된 Android `.env.example`: 실행 설정·공개 정책 검토 대상, 이번 변경 없음.

이 목록은 별도 보관 필요성을 기록하며 모든 파일의 존재나 내부 내용·중복·민감성을 검사했다는 뜻은 아닙니다. 기존 ignore와 공개 검사 차단 경로도 유지했습니다.
