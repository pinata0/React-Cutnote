# 3단계: 외부 계약과 주요 동작

2026-10-03 작업 트리 코드 기준. [UML 안내](../README.md) · [2단계 선언 목록](../declarations/README.md)

## 무엇을 왜 조사했는가

선언된 타입만으로는 호출자가 무엇을 기다려야 하는지 알 수 없다. 이번에는 요청을 받은 함수의 입력 검증, 반환 시점, 오류 변환, DB·파일·프로세스 변경을 추적했다. 후속 sequenceDiagram에서 **접수 응답과 작업 완료**, **취소 표시와 프로세스 종료**를 분리하기 위한 조사다. 제품 코드는 수정하지 않았다.

| 문서 | 확인한 파일·심볼과 조사 결과 |
|---|---|
| [HTTP 계약](http.md) | app/api의 모든 route 메서드, PC Gateway와 Bridge의 별도 HTTP 경계 |
| [작업·PC 계약](pc-jobs.md) | submit/workerAction/startRunner, 다운로드·프레임·파일·프로세스 함수 |
| [분석·저장·화면 계약](analysis-storage.md) | generateFrames/retagSegments/serialize/cleanSegmentMedia, PcIngest와 모바일 ACK |
| [Android·연결·실행기 계약](connection.md) | 실제 Java 접근 제한·static·override, Bridge 생성 및 실행기 종료 |
| [후속 시퀀스 호출 목록](calls.md) | 호출자 → 실제 함수/HTTP → 반환, 대기·반복·실패 분기 |

## 표 읽는 방법과 선정 기준

표의 시그니처는 원본의 인자 이름과 주요 타입을 요약한다. JS에 붙인 `→` 뒤의 형태는 **구현 반환값에 대한 설명**이며 실제 선언된 TS interface가 아니다. `Promise`도 클래스 관계나 별도 프로세스를 뜻하지 않는다. 함수 안의 옵션 객체 세부 필드·일반 UI setter·순수 태그 변환은 [전체 선언표](../declarations/README.md)에 보존하고, 외부 요청과 영속 변경을 이해하는 데 필요한 계약을 상세 선정했다. 모든 helper를 API로 승격하지 않았다.

- `async`: 실제 async 선언. `Promise 반환`: async 키워드 없이 Promise를 만드는 함수. `동기`: 호출 스레드에서 반환. Java의 동기 HTTP는 UI에서 실행해도 된다는 뜻이 아니다.
- 공개 범위의 `export`는 모듈 외부 사용 가능성을 뜻한다. HTTP 노출·현재 호출 여부와 별개다. 중첩 함수는 `내부`로 표시했다.
- UML 표시의 `호출`은 후속 sequence 참여 메시지 후보, `보조`는 설명/분기용, `생략`은 표에만 남기는 요소다. 새로운 Controller/Service 클래스를 만들지 않는다.
- HTTP 반환의 상태 번호는 코드의 명시 응답이다. 미처리 예외나 프록시 연결 실패는 별도로 적었다. `200`이어도 재시도 상태가 실제 변경되었거나 AI 분석이 완료되었다는 뜻은 아니다.

## 설계 판단·학습 포인트

사실: jobs GET은 만료 lease를 복구하고, segment 목록 GET은 오래된 R2 항목을 정리한다. 따라서 조회 화살표를 무조건 읽기 전용으로 그리면 틀린다. local retag는 작업 접수 뒤 **기존 Clip을 반환**한다. Android ACK는 완료가 아니라 요청 접수 URL의 shareId 일치를 확인한다.

해석: route·Node runner·Java Activity를 HTTP와 프로세스 수명 경계로 나누면 실패 책임을 이해하기 쉽다. 이 묶음은 새 런타임 계층이나 클래스의 존재를 주장하지 않는다. DB 트랜잭션·조건부 revision 갱신은 파일 삭제·외부 AI 호출까지 한꺼번에 되돌려주지 않는다.

## 검증과 미확인

파일·호출문·응답 분기를 대조하고 상대 링크·표·공개 정보 검사를 수행한 결과는 [검증 기록](../validation.md)에 남긴다. 이번 단계는 API 실행 테스트나 Android 실기기 검증이 아니다. 실제 다운로드·OpenAI·기기의 미검증 범위는 [구현 기록](../../local-video-ingestion-progress.md)을 유지한다. 새로운 Mermaid는 추가하지 않고 후속 그림의 근거 호출 목록을 작성했다. 기존 그림의 자동 파싱·시각 렌더링은 여전히 미검증이다.
