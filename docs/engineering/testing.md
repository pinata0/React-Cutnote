# 테스트와 검증

[문서 목록](../README.md) · 기준일: 2026-10-03

## 웹 검사

저장소 루트에서:

```powershell
cd apps/web
npm run taxonomy:generate
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```

현재 웹 테스트는 13개 스위트입니다. 가짜 제공자·메모리 SQLite·메모리 버킷을 사용하며 기본 fetch와 실제 비밀 환경변수 전달을 차단합니다. 영속 DB나 유료 API가 필요하지 않습니다. 상세 범위는 [웹 테스트 내부 구조](testing-details.md)에 있습니다.

저장소 루트에서 추가 검사:

```powershell
node --test apps/android/bridge/server.test.mjs tests/pc/runtime.test.mjs
node --test scripts/publication-secrets.test.mjs
node scripts/check-publication.mjs
node scripts/verify-publication-index.mjs
```

Bridge 테스트는 loopback HTTP 서버를 사용합니다. Android JVM·APK 검사는 [Android 문서](android.md)를 따릅니다.

## PC 수집 검증 (2026-10-03)

[구현·검증 기록](local-video-ingestion-progress.md)에 SQL/프로세스/실제 다운로드/실기기를 구분했습니다. 실제 Worker·격리 D1 테스트는 `node tests/pc/worker-smoke.mjs`, 명시적 실제 서비스 다운로드는 `node tests/pc/live-download.mjs`입니다. 후자는 공식 도구와 허용된 테스트 링크가 필요하며 기본 회귀 검사에 포함하지 않습니다.

## 기존 결과와 한계

2026-10-02 기존 기록의 Windows / Node 24.14.0 / npm 11.9.0 환경에서 웹 11/11, Bridge 18/18, lint 오류·경고 0, 타입·빌드, 신규 DB migration 9개 적용이 보고되었습니다. 이는 이번 문서 작업에서 재실행한 결과가 아닙니다.

Android 211개 검사·APK 서명 결과는 2026-10-01 macOS 인수인계 기록입니다. 현재 Windows APK 빌드·실기기·실제 AI 품질·온라인 배포·전체 브라우저 동작을 보장하지 않습니다. 실제로 실행한 검증과 과거 기록을 구분합니다.

## 이전 문서 통합 확인 (2026-10-02, 리팩토링 1단계 이전)

Windows / Node 24.14.0에서 문서 정리 후 공개 대상 Markdown의 로컬 링크 79개가 존재함을 확인했고 `git diff --check`를 통과했습니다. 임시 인덱스 공개 검사는 후보 312개(텍스트 310개, 검토 해시가 일치하는 이미지 2개)를 통과했으며 실제 인덱스는 변경하지 않았습니다.

실행 코드를 변경하지 않았으므로 앱 빌드·회귀 테스트·APK·유료 AI 호출은 재실행하지 않았습니다. 사용자 승인 후 옛 문서 12개를 삭제하고 중복 문서를 링크 안내로 전환했습니다. 대상은 [문서 정리 기록](../../archive/documentation/cleanup.md)에 있습니다.

## 리팩토링 단계별 검증

1~6단계 결과는 [학습 기록](../refactoring-study.md)에 구분했습니다. 6단계에서는 공개 소스만 복사한 별도 디렉터리에서 오프라인 `npm ci --include=dev --include=optional --no-audit --no-fund`, 사전 생성, lint·타입, 웹 12/12 스위트, 운영 빌드와 빈 DB 최초 실행을 확인했습니다. 개인 키·DB·영상은 복사하지 않았습니다. 변경 없는 Bridge 19/19·공개 검사기 4/4·JVM 211개 결과는 이전 단계의 유효한 검증을 재사용했습니다. 실기기·실제 AI·온라인 배포는 미검증입니다.

## 현재 결과를 해석하는 기준

2026-10-03 구현 검증에서는 웹 13/13, Bridge 20/20, PC runtime 6/6, JVM 211개, lint·타입·빌드를 통과했다. 실제 서비스 검증은 Instagram 한 영상의 다운로드·정규화·썸네일·37 JPEG 추출까지 통과했고, YouTube는 429/로그인 요구로 실패했다. 실제 OpenAI 분석 완료·구간 재분석과 최신 APK·Android 실기기 전체 흐름은 미검증이다. PC 브라우저 원본/구간 디코딩·선택 구간 이동/정지는 통과했으나 모든 UI 회귀를 뜻하지 않는다. 이번 문서 갱신에서 이 기능 검사를 재실행하지 않았다.

| 검사 | 준비와 의미 |
|---|---|
| `node tests/run-web.mjs` | 설치된 웹 의존성·생성 사전 필요. 가짜 제공자와 메모리 DB에서 논리 계약 확인 |
| `node --test tests/pc/runtime.test.mjs` | 실제 자식 프로세스·임시 파일·loopback 통신. AI 응답은 가짜이며 서비스 성공 아님 |
| `node tests/pc/live-download.mjs` | Windows `.tools`의 운영 안내에 적힌 도구 경로와 스크립트에 지정된 테스트 링크 사용 권한 필요. 외부 다운로드 발생. 개인 결과 `.tools/live-ingestion/result.json`을 확인해야 하며 종료 코드 0만으로 성공 판정 금지 |
| `node tests/pc/worker-smoke.mjs` | 먼저 build 완료, live-download가 만든 asset.json/video.mp4·도구 settings 필요. `.tools/worker-smoke`의 격리 D1/실제 Worker·FFmpeg·Bridge 사용. 포트 5273/5274/5275를 비워둔다. 분석 키 미연결을 확인하고 유료 호출 없이 실패 보존·export·재시작을 검사 |
| Android 실제 공유 | JVM/HTTP 검사와 별개. 운영 안내의 연결→공유→접수 ACK→화면 종료→재접속 절차를 실제 기기에서 실행 |

선택적 검사 스크립트는 범용 설치 검사기가 아니며 저장소에 바이너리·원본 fixture가 포함되지 않는다. `CUTNOTE_LIVE_PROVIDER=instagram`은 Instagram만 선택하고 미지정 시 두 제공자를 시도한다. 다른 링크를 사용하려면 테스트 소스의 fixture를 검토해야 한다. 유효한 제공자 키를 물려받는 환경에서 worker-smoke를 실행하지 않는다. 기존 개인 `.dev.vars`나 DB를 지워 테스트 조건을 만들지 않는다.

문서 전용 검증과 코드 대조 결과는 [문서 점검 기록](documentation-review-2026-10-03.md)을 따른다.
