# 최종 구현 기준 문서 점검

2026-10-03. 이번 작업은 문서만 수정했다. 기능 코드·사용자 DB·실행 환경을 초기화하지 않았고 외부 게시·배포도 하지 않았다. [현재 구조·API](local-video-ingestion-reference.md), [운영](local-video-ingestion-operations.md), [실제 구현 검증](local-video-ingestion-progress.md)이 기준이다.

## 문서별 독자와 판단

| 문서 | 독자·목적 | 불일치와 처리 |
|---|---|---|
| 루트 README, docs/README | 첫 방문자의 제품·실행 진입 | PC 모듈/도구와 현재 상태 링크 보강 |
| engineering/README | 개발자 문서 탐색 | 현재 API 기준·운영·검증과 과거 계획을 구분하여 연결 |
| architecture | 개발자 코드 지도 | 0008까지인 migration, R2만 설명한 저장 구조를 수정; PC 상세는 별도 기준 문서로 연결 |
| setup | 새 개발자의 설치 | 실제 npm scripts·Node/패키지 버전·10개 migration·예제 env 경로 대조. 도구 상세는 운영 문서 참조 유지 |
| local-video-ingestion-operations | PC 운영자 | 도구가 새 체크아웃에 포함되지 않음을 명시, 취소 시간 보장 표현 수정, 로그/설정 안내 추가 |
| local-video-ingestion-reference (신규) | 개발자·유지보수자 | 현재 모듈·API·데이터·흐름·복구 계약을 조사 제안과 분리 |
| android | 앱 설치·공유 사용자/개발자 | 화면 유지 의무, 백그라운드 미지원 표현 수정; PC 작업과 Android 파일 저장 구분, JVM/APK/실기기 분리 |
| lan | 연결 운영자 | media 한도·작업 allowlist·검사 수 수정, Windows 권한 보장 오류 정정 |
| security | 공개·운영 담당자 | launcher JSON Windows ACL 미적용을 명시. 과거 audit 수치를 현재 취약점 검사로 갱신하지 않음 |
| testing, testing-details | 검사 실행자 | 현재 13스위트/PC 검사, fixture·도구 전제와 실제 서비스 검증 한계 반영. 과거 결과는 보존 |
| tagging | 태깅/검색 개발자 | 사전·검수·기존 제공자 정책 유지. 새 로컬 입력 경로는 기준 문서 연결 |
| licenses | 배포 담당자 | 기존 도구 배포·라이선스 안내 유지; 바이너리 재배포나 라이선스 판정 새로 수행하지 않음 |
| development | 기여자 | 기존 코드·데이터 보존과 문서 검사 규칙 적용, 변경 불필요 |
| lint-notes, Codex 활용 기록 | 학습 독자 | 특정 개발 당시 기록으로 보존, 실행 지침으로 승격하지 않음 |
| local-video-ingestion-study, plan | 설계 학습자 | 구현 전 조사·제안 보존. 현재 구현의 테이블/중복 제거/복구 선택은 기준 문서에서 설명 |
| local-video-ingestion-progress | 후속 구현자 | 당시 실패·수정·검증 보존; 테스트 영상 식별자만 비공개화하고 현재 기준/결함 링크 추가 |
| refactoring-study와 하위 기록, archive | 이력 독자 | 당시 경로·검사 수·발표 원본 보존. 새 기능 완료 근거로 인용하지 않음 |
| product/README, 서비스 소개문 | 사용자·외부 독자 | 사용 순서·환경·저장/AI 전송·제한을 서비스 소개에 통합 |
| 구현 범위 요약 개정판 | 평가자·팀 | 새 PC 기능 구현과 실제 검증을 분리, 이전 테스트 수/브라우저 미실행 문장 갱신 |
| 문제 정의서 | 기획 독자 | 고객/문제 가설 보존, 현재 지원 범위 링크 추가 |
| 유사 효과 탐색 카드 기능 설명 | 기능 사용자 | 기존 검색 동작 유지, AI 제공자/로컬 처리 범위는 서비스 소개 연결 |
| 영상 후보군 | 참고 자료 독자 | 참고 URL 목록 유지. 다운로드 성공·권한·현재 링크 유효성을 새로 검증하지 않음 |
| presentations/README 및 발표문 2개 | 발표자·외부 청중 | 색인이 현재 안내로 명시하므로 관련 설명 수정. 사업 가설/낭독 원문은 보존하며 동기화 과장·저장 방식·검증 범위 정정 |
| Git 제외 발표 PDF·개인 보관본 | 과거 개인 자료 | 현재 공개 안내에 사용하지 않음. 열거나 이동·공개하지 않음 |

## 코드 대조에서 확인한 결함

문서로 해결된 것으로 표시하지 않는다. 아래 항목은 코드 수정을 하지 않은 후속 작업이다.

1. **실행기 연결 JSON의 Windows ACL 미적용.** [launcher의 writePrivateJson](../../apps/android/launcher.mjs)은 임시 파일을 mode 600/chmod로 만들고 rename한다. Bridge의 `protectConnectionFile` 호출은 이 함수에 없다. Windows에서는 소유자 전용 ACL 보장을 할 수 없으며 부모 폴더 권한에 따라 다른 계정이 읽을 가능성이 있다. 재현: 개인 테스트 폴더에서 실행기가 만든 `.cutnote-pairing.json`과 `connection.txt`의 보안 탭/ACL을 확인한다(파일 내용 출력 금지). 후속: 임시 파일에 Windows ACL을 적용한 뒤 쓰고, 두 파일을 대상으로 권한 회귀 검사를 추가한다. 이번에는 개인 파일의 실제 ACL을 변경하거나 비밀 내용을 읽지 않았다.
2. **실제 다운로드 검사 실패와 종료 코드 불일치.** [live-download.mjs](../../tests/pc/live-download.mjs)는 제공자별 예외를 `results`에 저장하지만 실패 후 `process.exitCode`를 설정하지 않는다. 재현: 해당 스크립트에서 다운로드 실패 시 결과에 `failed`가 있어도 프로세스는 0으로 끝날 수 있다. CI가 종료 코드만 보면 오판한다. 현재는 `result.json`의 각 제공자 결과까지 확인해야 한다. 후속: 한 제공자라도 실패하면 실패 종료하도록 구현하고 성공/실패 혼합 케이스를 검사한다. 이번 문서 작업에서는 네트워크 호출을 재실행하지 않았다.

운영 오류의 상세 진단도 제한되어 있다. Worker 자식 프로세스 stdio는 무시되고 runner는 공개 오류 코드만 남기므로 통합 영속 로그 파일이 있다고 안내하지 않는다. 필요한 다음 개선은 비밀 제거된 단계별 진단이다.

## 문서 검증 기록

- 코드 대조: npm scripts, env 예제, Node 요구 버전, start/runner/settings/media/egress, jobs 입력·migration, MainActivity/Bridge/launcher, 테스트 fixture 전제를 확인했다.
- 실제 실행 범위: 이번에는 문서 링크·명령 대상·공개 정보·diff 검사를 수행했다. 앱 build, db:init, 다운로드, 유료 AI, APK/실기기는 재실행하지 않는다. 이전 통과 결과는 구현 기록의 날짜·범위로만 인용한다.
- 예시 정책: 절대 경로·주소는 loopback 또는 명시적 자리표시자, 영상은 설명용 가상 사례만 추가했다. 테스트 영상 식별자는 공개 문서에서 제거하되 성공/실패·바이트·프레임 수 증거는 보존했다. 개인 설정·DB·영상·스크린샷은 추가하지 않았다.
- 상대 파일 링크 371개: 대상 존재 확인, 깨진 링크 0개. URL 인코딩·공백 경로를 해제하여 검사했다. 외부 사이트 가용성이나 Markdown 제목 anchor 검증을 뜻하지 않는다.
- npm scripts 8개와 문서의 실행 파일/환경 예제 경로, migration 10개: 실제 파일과 일치. 설치·서버 시작 명령 자체는 이번에 실행하지 않았다.
- README/docs의 개인 홈 경로·사설 IP·제공된 테스트 영상 식별자 패턴 검사: 발견 0개. 기존 공개 검사기의 알려진 비밀값/패턴 검사도 통과했다. 실제 비밀값을 출력하거나 문서에 재현하지 않았다.
- `node --test scripts/publication-secrets.test.mjs`: 4/4 통과.
- `node scripts/check-publication.mjs`: 작업 트리 후보 294개(텍스트 292개·기존 해시 검토 이미지 2개)와 기존 인덱스 검사 통과.
- `node scripts/verify-publication-index.mjs`: 격리 인덱스 후보 294개 통과, 실제 인덱스 해시 동일. tree/commit/ref/push 생성 없음.
- `git diff --check`: 통과. 기존 코드 파일의 LF→CRLF 안내는 있었으며 문서 공백 오류는 없었다.
- 현재 지원 범위 표현을 재검색하여 모바일 화면 유지 의무, R2 단일 저장 설명, 라이브러리 자동 동기화 표현을 수정했다. 조사·과거 단계의 수치는 당시 기록으로 남겼다.
