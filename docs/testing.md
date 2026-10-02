# 테스트와 검증

[문서 목록](README.md) · 기준일: 2026-10-02

## 웹 검사

저장소 루트에서:

```powershell
cd main/handoff-package/cutnote
npm run taxonomy:generate
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```

현재 웹 테스트는 11개 스위트입니다. 가짜 제공자·메모리 SQLite·메모리 버킷을 사용하며 기본 fetch와 실제 비밀 환경변수 전달을 차단합니다. 영속 DB나 유료 API가 필요하지 않습니다. 상세 범위는 [웹 테스트 내부 구조](testing-details.md)에 있습니다.

저장소 루트에서 추가 검사:

```powershell
node --test main/handoff-package/cutnote-android/bridge/server.test.mjs
node --test scripts/publication-secrets.test.mjs
node scripts/check-publication.mjs
node scripts/verify-publication-index.mjs
```

Bridge 테스트는 loopback HTTP 서버를 사용합니다. Android JVM·APK 검사는 [Android 문서](android.md)를 따릅니다.

## 기존 결과와 한계

2026-10-02 기존 기록의 Windows / Node 24.14.0 / npm 11.9.0 환경에서 웹 11/11, Bridge 18/18, lint 오류·경고 0, 타입·빌드, 신규 DB migration 9개 적용이 보고되었습니다. 이는 이번 문서 작업에서 재실행한 결과가 아닙니다.

Android 211개 검사·APK 서명 결과는 2026-10-01 macOS 인수인계 기록입니다. 현재 Windows APK 빌드·실기기·실제 AI 품질·온라인 배포·전체 브라우저 동작을 보장하지 않습니다. 실제로 실행한 검증과 과거 기록을 구분합니다.

## 이번 문서 통합 확인 (2026-10-02)

Windows / Node 24.14.0에서 문서 정리 후 공개 대상 Markdown의 로컬 링크 79개가 존재함을 확인했고 `git diff --check`를 통과했습니다. 임시 인덱스 공개 검사는 후보 312개(텍스트 310개, 검토 해시가 일치하는 이미지 2개)를 통과했으며 실제 인덱스는 변경하지 않았습니다.

실행 코드를 변경하지 않았으므로 앱 빌드·회귀 테스트·APK·유료 AI 호출은 재실행하지 않았습니다. 사용자 승인 후 옛 문서 12개를 삭제하고 중복 문서를 링크 안내로 전환했습니다. 대상은 [문서 정리 기록](cleanup.md)에 있습니다.
