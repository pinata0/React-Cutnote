# UML로 읽는 컷노트

2026-10-03 작업 트리 소스 기준. [기술문서](../README.md) · [현재 운영](../local-video-ingestion-operations.md)

목적은 기능 설계안을 만드는 것이 아니라 **실제 코드의 구조·호출·상태를 학습하고 수정 지점을 찾는 것**이다. 제품 코드는 수정하지 않는다. 현재 구현이 존재하는 것과 실제 OpenAI/Android 전체 검증이 끝난 것은 다르다. [실제 검증 기록](../local-video-ingestion-progress.md)의 미검증·실패를 유지한다.

| 읽는 순서 | 질문과 표기 |
|---|---|
| [1. 전체 파일 분류](inventory.md) | 무엇이 현재 소스인가? 파일 목록·분류 flowchart |
| [상세 조사 대상 선정](selection.md) | 포함/제외/보조·실행 위치·역할·근거 표와 기기/서비스 경계 |
| [2단계 선언 목록·타입 초안](declarations/README.md) | 선정 파일의 타입·함수·상태·DB 레코드와 핵심 classDiagram |
| [3단계 외부 계약·주요 동작](contracts/README.md) | HTTP·export 함수·Java 메서드의 입력/출력·오류·부수 효과와 후속 시퀀스 호출 목록 |
| [4단계 상속·구현·타입 조합](relations/README.md) | 실제 extends/익명 구현의 classDiagram과 intersection·판별 union·선언 병합 구분 |
| [5단계 포함·참조·수명](lifetime/README.md) | 클립 값·DB ID·작업·파일·프로세스·Android의 생성/삭제 책임과 분리 다이어그램 |
| [6단계 호출·생성·변환 의존](dependencies/README.md) | 실제 사용 표와 서비스·모듈 구조도, 타입/값 import 순환 및 경계 점검 |
| [7단계 계층·데이터 경계](layers/README.md) | 책임별 계층 표·공개/내부 DTO·검증 위치와 PC 입력→저장 sequenceDiagram |
| [8단계 핵심 도메인·저장](domain/README.md) | Clip·구간·태그·보고서의 생성/검증/저장, DB 제약 ER과 확장 영향 표 |
| [9단계 작업 영속화·재시도·이력](recovery/README.md) | 요청 ID·임대·파일 체크포인트·revision, 재시도/재시작 sequence와 보장 범위 |
| [10단계 상태 전달·화면 동기화](state-delivery/README.md) | polling·callback·effect·프로세스 이벤트, 정리 책임과 Android 종료/재진입 sequence |
| [11단계 상태 전이·종합](states/README.md) | DB 작업·Android 플래그·모바일 화면·미디어 준비 상태와 성공/복구 시퀀스 |
| [전체 교차 검증·다이어그램 목록](final-review.md) | 1~10단계 대조 결과·수정 사항·미검증 범위 |
| [개요: 프로세스와 모듈](runtime.md) | 코드가 어디서 실행되고 누가 시작하는가? 배포를 설명하는 flowchart |
| [개요: 데이터 타입](types.md) | Clip·구간·태그·작업의 관계는 무엇인가? classDiagram |
| [개요: Android 클래스와 공유](android.md) | 실제 Java 클래스와 shareId·ACK는 어떻게 연결되는가? classDiagram·sequenceDiagram |
| [개요: PC 수집 순서와 상태](jobs.md) | 화면 종료와 무관하게 어떻게 실행·복구하는가? sequenceDiagram·stateDiagram-v2 |
| [개요: 재생·편집·분석·검색](media-and-features.md) | 기존 기능과 새 경로의 분기점은 어디인가? sequenceDiagram |
| [검증·유지보수](validation.md) | 무엇을 확인했고 무엇을 아직 확인하지 못했는가? |

## 추천 읽기 순서

- 처음 구조를 익힐 때: [파일 분류](inventory.md) → [프로세스 개요](runtime.md) → [계층 경계](layers/README.md) → [도메인·저장](domain/README.md) → [상태 전이](states/README.md).
- 기능을 수정할 때: [선정 파일](selection.md) → [선언](declarations/README.md) → [외부 계약](contracts/README.md) → [실제 상속·타입 조합](relations/README.md) → [수명](lifetime/README.md) → [호출 의존](dependencies/README.md).
- 장애를 추적할 때: [작업 복구](recovery/README.md) → [상태 전달](state-delivery/README.md) → [전이 표](states/jobs.md) → [검증과 미확인](final-review.md).

위 1~11단계는 상세 조사 순서이고 “개요” 문서는 짧은 입문 지도다. 동일 주제의 정확한 조건은 상세 문서를 기준으로 읽는다. 사전 조사·구현 진행 기록은 작성 당시 근거를 보존하며 현재 코드의 상태로 자동 승격하지 않는다.

## 공통 범례

- **사실**: 파일·심볼의 선언 또는 실행문으로 확인한 관계. 표에 근거를 둔다.
- **해석**: 코드를 읽기 위한 묶음/생명주기 설명. 실제 클래스나 서비스의 추가를 뜻하지 않는다.
- **미확인**: 실행 환경에서 재검증하지 않았거나 해당 모델에서 생략한 것.
- classDiagram의 `<<type>>`는 TS 타입 별칭, `<<class>>`는 Java 클래스다. `-->`는 필드/ID 참조, `..>`는 사용·변환 의존, `<|--`는 실제 상속이다. 합성 `*--`는 생성·정리 생명주기 근거가 있는 경우만 사용한다. 빈 다이아몬드 집합 관계는 쓰지 않는다.
- `0..1`은 없거나 하나, `0..*`는 없거나 여러 개다. optional 배열은 부재와 빈 배열을 구분할 수 있지만 다중성에서는 둘 다 0이다. 참조 선은 데이터 삭제/객체 소유권을 보장하지 않는다.
- sequenceDiagram의 `->>`는 호출/요청, `-->>`는 반환/응답이다. 네트워크 경유지를 생략하면 해당 그림에 명시한다. 화살표는 Promise 실행 시간이나 스레드 블로킹을 의미하지 않는다.
- stateDiagram-v2는 DB state/status 전이 또는 명시한 Android 필드 조건의 변화를 나타낸다. Android 별칭은 실제 enum이 아니며 조건 투영임을 각 그림에 명시한다. `phase` 진행 표시는 별도로 설명한다.
- flowchart는 Mermaid 구조 그림이다. 정식 UML 컴포넌트 포트·배포 노드 규격을 구현한 그림이라고 부르지 않는다.

TypeScript 함수·React 훅·Node 클로저를 가상의 Controller/Service 클래스로 바꾸지 않았다. 생성된 Drizzle 스냅샷도 런타임 객체 클래스가 아니다. UI 모양·스타일과 테스트 프로세스는 운영 UML에서 제외한다.

## 범위와 보존

전체 디렉터리의 이름 메타데이터를 분류하고 현재 실행 경로를 선별해 읽었다. 비밀 파일·개인 DB·영상·캐시·의존성 구현은 열람하지 않았다. 예전 조사·계획은 근거를 찾는 안내로만 사용했다. 주요 화살표는 주제별 표에서 호출문·필드·SQL로 추적한다. 이 문서는 전체 함수 목록이나 새 설계 제안이 아니다.

편집 가능한 Mermaid 소스가 각 문서에 있다. 이번 환경에는 Mermaid 파서/CLI가 확인되지 않아 **이미지 렌더링과 자동 문법 검증은 수행하지 못했다**. 구조·관계와 텍스트 가독성을 수동 점검했으며 시각 렌더링 검증과 구분한다. 자세한 재검증 방법은 [검증 문서](validation.md)를 따른다.
