# 성공과 대표 실패·복구 경로

[상태 안내](README.md) · [상세 재시도/PC 재시작](../recovery/sequences.md) · [Android 화면 종료/재진입](../state-delivery/android-sequence.md)

## 무엇을 왜 조사했는가

전이 표의 조건이 실제 호출 순서에서도 성립하는지 확인했다. 근거는 [submit/workerAction/complete](../../../../apps/web/lib/jobs/server.ts), [startRunner](../../../../apps/pc/runner.mjs), [download/frames](../../../../apps/pc/media.mjs), [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx)다. 아래는 gateway/bridge·heartbeat 반복을 생략한 핵심 시퀀스이며 외부 실행 성공을 증명한 그림은 아니다.

## 성공 경로

```mermaid
sequenceDiagram
  participant UI as PC 또는 모바일
  participant W as Worker jobs API
  participant D as D1
  participant R as Node runner
  participant M as media / 파일 / 도구
  participant AI as frames API / OpenAI
  UI->>W: submit(requestId, sourceUrl)
  W->>D: clip와 queued job batch
  W-->>UI: 접수 ACK
  R->>W: claim
  W->>D: running, lease, attempt 증가
  W-->>R: 현재 clip/asset/revision
  R->>M: 원본 없으면 download
  M-->>R: LocalAsset
  R->>W: attach
  W->>D: local_asset 및 revision 증가
  W-->>R: 새 revision
  R->>M: frames (checkpoint 없을 때)
  M-->>R: 프레임·시각
  R->>AI: 분석 요청
  AI-->>R: result
  R->>M: result checkpoint 기록
  R->>W: complete(result, revision)
  W->>D: clip 병합과 completed batch
  W-->>R: ok
  UI->>W: jobs 및 clips를 별도 polling
  W-->>UI: 공개 상태와 결과
```

이 그림은 최초 원본·체크포인트가 없는 ingest 성공 예다. 기존 asset/checkpoint 재사용 분기는 [9단계](../recovery/sequences.md)에 있다. 접수 ACK 뒤 화면을 닫아도 runner는 계속하며, 같은 ID 재전송은 별도 작업을 만들지 않고 기존 행을 반환한다(입력/현재 클립 사전 조건 통과 시).

## 분석 실패 후 재시도와 중단 회수

```mermaid
sequenceDiagram
  participant UI as 사용자 화면
  participant W as Worker jobs API
  participant D as D1
  participant R as Node runner
  participant F as 원본 / checkpoint
  participant AI as frames API
  Note over R,D: running이며 원본 attach는 이미 완료
  R->>AI: 분석 요청
  AI-->>R: 비정상 HTTP 응답
  R->>W: fail(analysis_failed)
  W->>D: failed, error_code, lease 제거
  UI->>W: 상태 GET 후 retry
  W->>D: queued
  R->>W: claim
  W-->>R: 원본, 최신 revision, 새 lease
  R->>F: 원본 stat, checkpoint 검사
  R->>AI: 유효 결과 없으면 다시 분석
  AI-->>R: 성공 result
  R->>F: checkpoint 기록
  alt PC가 완료 요청 전에 종료
    Note over R,W: fail 미기록이면 running이 남음
    W->>D: 재시작 후 list/claim의 recover (lease 만료)
    D-->>W: interrupted
    UI->>W: retry
    W->>D: queued
    R->>W: 재기동 runner claim
    W-->>R: 최신 revision, 새 lease
    R->>F: 일치하는 result 재사용
  else PC 계속 실행
    Note over R,F: 현재 result 사용
  end
  R->>W: complete(result, revision)
  alt revision 일치
    W->>D: completed와 클립 결과 저장
  else 다른 화면 편집
    W-->>R: 409 conflict
    R->>W: fail(conflict) 시도
    W->>D: 유효 lease일 때 failed
  end
```

검증 근거: [pc-jobs 테스트](../../../../tests/web/pc-jobs.test.ts)의 원본 유지·재시도·만료·CAS 사례와 [runtime 테스트](../../../../tests/pc/runtime.test.mjs)의 독립 runner 사례를 읽고 소스 순서와 대조했다. 이번에 실제 다운로드·AI·PC 재시작은 실행하지 않았다. 실패 후 fail도 통신/lease 문제로 거절될 수 있으며 그 경우 즉시 failed가 아니라 만료 회수를 기다린다. 연결 재시도, 취소, 중복 접수의 세부 조건은 [작업 표](jobs.md)와 [Android 표](android-mobile.md)를 따른다.
