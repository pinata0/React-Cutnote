# UML 종합 점검과 남은 검증

2026-10-03 작업 트리 기준. [추천 읽기 순서](README.md) · [상태 전이 종합](states/README.md) · [단계별 검증 이력](validation.md)

## 교차 점검 방법과 한계

전체 UML 문서를 순회해 상대 링크·코드 펜스·시퀀스 분기 균형·공개 패턴을 검사하고 모든 Mermaid 소스를 읽어 관계 방향과 도해 범위를 검토했다. 기존 공개 소스/설정/테스트/스크립트 230개 SHA-256이 조사 기준과 동일하며, 이 중 TS/JS 160개를 설치된 TypeScript AST 파서로 구문 검사했다. 이는 TypeScript 타입 검사나 전체 코드의 의미 검증이 아니다.

이전 단계의 선언 수집 근거를 유지하고 이번에는 전이·수명·경계의 주요 심볼과 변경 문서의 API/필드/SQL을 직접 대조했다. 모든 자연어 문장과 선언 1,250행을 자동으로 의미 증명한 것은 아니다. 그림은 전체 속성·함수·분기를 펼치지 않고 근거 표에 상세를 남겼다.

## 1~10단계 교차 대조

| 단계 | 대조한 기준과 주요 판단 | 결과 |
|---|---|---|
| 1 분류·선정 | apps/web, apps/pc, Android/Bridge/launcher 경계와 참조 파일 존재; 생성물·개인 자료 분리 | 실제 파일 경로 유지. 내용 미열람 자료를 운영 코드로 추가하지 않음 |
| 2 선언 | Clip/ClipRow/JobRow/PcJob/AnalysisReport/LocalAsset 및 Java 선언, 기존 AST 수집과 불변 소스 | 타입·런타임 객체 구분 유지; 전체 인벤토리와 핵심 도해 범위 구분 |
| 3 계약 | submit/workerAction/complete/serialize, GET jobs/clips, Java callback 접근 범위 | route와 함수 기반 계약 유지. 가상 Service/Controller class 없음 |
| 4 상속 | Java 명명/익명 extends·interface 구현, JS ConnectorPreview | 일반화 화살표는 실제 상속/구현에만 사용; union/intersection은 상속선 없음 |
| 5 수명 | FileAccess 생성/destroy, job/clip 논리 참조, 원본/임시/체크포인트 정리 | FileAccess 다중성을 개요와 같은 0..1로 통일; GC/스레드 즉시 종료 보장 아님 |
| 6 의존 | Worker HTTP/SQL, Node child/FS, Bridge 중계, 현재 호출 방향 | 단순 import와 실제 호출 분리 유지; 전체 시스템 무순환 주장 없음 |
| 7 계층 | 공개 DTO·내부 asset/lease·PC settings와 Worker 경계 | 내부 경로 무조건 비노출 같은 과장 없음; 개인정보 실제 값 열람 없음 |
| 8 도메인 | 현재 report/이력, JSON과 DB FK, favorites/order revision | 이력 상한 예외 및 즐겨찾기 revision 예외 유지 |
| 9 복구 | lease/recover/retry, manifest/checkpoint, last_job_id | last_job_id 선을 논리 참조로 통일; 재시작 그림의 runner→DB를 Worker 경유로 수정 |
| 10 전달 | jobs 3초/보관함 5초, callback/effect/event, Android ACK와 재진입 | push/EventBus/Observer 구현으로 확대하지 않음; GET 중첩·오류 잔류 조건 유지 |

근거 원문은 각 단계 표와 [상태 전이 파일 링크](states/README.md)에 있다. PC 원본이 없으면 자동 재수집한다거나, interrupted가 자동 queued로 바뀐다거나, Memento/undo/redo가 존재한다고 설명하지 않는다. 기존 개요 jobs.md의 중복 상태 그림은 [작업 상태 기준](states/jobs.md) 링크로 통합했다.

## 다이어그램 지도

| 목적 | 기준 문서 | 표기 |
|---|---|---|
| 전체 경계 | [선정](selection.md), [프로세스](runtime.md), [계층](layers/README.md) | flowchart |
| 선언·상속·값 관계 | [타입 초안](declarations/diagrams.md), [상속](relations/inheritance.md), [수명](lifetime/README.md) | classDiagram |
| 핵심 도메인·DB | [도메인](domain/README.md), [저장](domain/storage.md) | classDiagram, erDiagram |
| 호출 의존 | [의존 구조](dependencies/structure.md) | flowchart |
| 입력·저장·재생 | [PC 입력](layers/pc-sequence.md), [재생](media-and-features.md) | sequenceDiagram |
| 재시도·재시작 | [복구 구조](recovery/README.md), [복구 순서](recovery/sequences.md) | classDiagram, flowchart, sequenceDiagram |
| 화면 동기화·공유 | [전달 구조](state-delivery/README.md), [Android 재진입](state-delivery/android-sequence.md) | flowchart, sequenceDiagram |
| 작업 전이 | [jobs](states/jobs.md) | stateDiagram-v2 1개 |
| Android 연결/공유 투영 | [Android·모바일](states/android-mobile.md) | stateDiagram-v2 2개; 모바일은 실제 필드 전이 표 |
| R2 미디어 준비/정리 | [media](states/media.md) | stateDiagram-v2 1개 |
| 대표 성공·실패 복구 | [scenarios](states/scenarios.md) | sequenceDiagram 2개 |

종합본은 Mermaid 43개(class 15, sequence 12, flowchart 11, ER 1, state 4)다. 상태 전이는 작업·연결·공유·미디어로 나누었으며 각 별칭·생략 경유지·다중성 해석을 설명했다. 긴 시퀀스는 조회/재시도/재진입 주제로 분리했고 새 상태 전이 표는 52행, 요청한 8개 컬럼이다.

## 통과와 미검증

- 통과: 상대 파일/디렉터리 링크 존재, 펜스 짝, sequence alt/opt/loop/end 균형, 새 전이 표 컬럼, 공개 credential-pattern, 소스 230개 불변, TS/JS 160개 구문 파싱, git diff --check.
- 수동 대조: 그림의 실제 필드/심볼과 호출 방향, 참조·의존·상속·합성 구분, 상태명·전이 조건, 입력 실패와 작업 실패 구분, 미구현/과거 기록 표현.
- 미검증: Mermaid 정식 파서와 이미지 렌더링. PATH mmdc 및 웹 직접 의존성에서 Mermaid 도구를 찾지 못했다. 펜스·분기 검사는 정식 Mermaid 문법 검증의 대체물이 아니며 “모든 문법 유효”나 시각 가독성 검증 완료로 보고하지 않는다. 외부 도구 설치·문서 업로드는 하지 않았다.
- 과거 실행 근거: 8단계의 메모리 SQLite 마이그레이션, 10단계의 네트워크 없는 폴링 callback 테스트 5개는 [검증 이력](validation.md)에 보존했다. 제품 코드가 바뀌지 않아 이 테스트들을 반복하지 않았다.

첫 공개 패턴 검사에서 SQL의 임대 필드를 NULL로 초기화한다는 표기를 자격값으로 오인했다. 코드 필드와 NULL 동작을 설명하는 문장으로 수정한 뒤 다시 검사했다. 실제 비밀값 파일을 읽거나 재현하지 않았다.

## 미확인 관계와 후속 검증

1. Android 실제 ACK/lifecycle 및 백그라운드→복귀 타이밍: 연결·공유 그림은 코드 조건 투영이다. 실제 기기에서 ACK 전후 종료와 launcher/복원 진입을 나눠 확인해야 한다.
2. lease/취소/complete의 경쟁과 파일·DB 중단 경계: 실제 전원 차단·오류 주입으로 선형화·내구성을 증명하지 않았다. [복구 검증 절차](recovery/guarantees.md)를 따른다.
3. PcIngest의 느린 GET 응답 역전과 오류 문구 잔류, 진행률 요청 순서: 가능 조건은 코드로 확인했으나 브라우저 지연 주입은 미실시다. [정리 책임](state-delivery/lifecycle.md)을 따른다.
4. 실제 다운로드/AI/Android 종단 결과는 UML의 정적 관계가 보장하지 않는다. [구현·검증 기록](../local-video-ingestion-progress.md)의 미검증을 유지한다.

문서 작성·코드 대조는 마무리했지만 정식 Mermaid 파싱·시각 렌더링까지 완료한 상태는 아니다. 렌더러가 준비되면 각 fenced source를 로컬에서 검사하고 겹침·글자 크기·화살표 방향을 검토해 이 문서에 도구 버전과 결과를 추가한다.
