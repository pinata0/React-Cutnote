# 문자열 union·상수와 상태 계약

[선언 안내](README.md) · [작업 상태 전이](../jobs.md)

## 무엇을 왜 조사하는가

`state: string`처럼 넓은 타입과 실제 허용 상태를 혼동하지 않도록 선언과 런타임 분기를 나눠 읽는다. 다음 집합은 새 enum 선언이 아니라 소스에 존재하는 union·상수·SQL/검증 목록을 정리한 것이다. 개별 출현은 영역별 전수 표에도 남겼다.

| 이름·위치 | 종류 | 실제 값·의미 | 판단 근거 |
|---|---|---|---|
| PcJob/JobRow.state | string 필드 + 런타임 상태 | queued, running, completed, failed, cancelled, interrupted | jobs/server의 SQL·recover·changeJob. 타입 alias가 값을 제한하지 않음 |
| kind | string + submit 허용 목록 | ingest, analyze, retag, export | submit의 kind 검사; 기본 ingest |
| phase | string + progress 허용 목록 | download, frames, analyze, commit, export; 초기 queued, 완료 completed | workerAction(progress), DB default, complete |
| terminalJob | 함수 내부 목록 | completed, failed, cancelled, interrupted | 목록 자체는 named enum이 아님 |
| jobMessages | 런타임 Record 상수 | 상태·phase·오류 안내가 섞인 키 집합 | jobs/types.ts. 모든 키가 DB state는 아님 |
| cancel_requested / cancelRequested | integer / boolean | DB 요청 플래그와 공개 DTO boolean | publicJob의 `!!` 변환. cancelled 상태와 별개 |
| TagAssignment.status | literal union | accepted, suggested, rejected | tagging.ts 선언·parseTagging |
| TagAssignment.source | literal union | ai_observed, ai_inferred, user | 관찰/추정/수동 입력 |
| TagAssignment.decisionBy | literal union | policy, user | 검수 결정 주체 |
| AnalysisReport.engine | discriminated union | mobileclip-s0-v1, gemini-video-v1, openai-frames-v1 | analysis/types.ts. legacy 형식 허용이 현재 실행을 증명하지 않음 |
| Provider (서로 다른 두 정의) | literal union | openai, gemini | ai/key-input.ts와 ai/settings.ts를 별도 행으로 보존 |
| WorkspaceContext.kind/keyManagement | literal union | pc/online, pc/here | workspace-context.ts. 접속 host/LAN marker로 결정 |
| categories → Category | 런타임 as-const 배열 → indexed access type | color, shot, effect | clips.ts의 값과 타입 별칭을 구분 |
| FeedbackValue | literal union | match, partial, irrelevant | discovery/recommendations.ts. 작업 상태와 무관 |
| OrderScope | literal union | videos, segments | library-order.ts |
| LinkInfo.basis | literal union | video, storyboard, preview, unavailable | links/types.ts, 기존 링크 표현 |
| SourcePlayerSession.state | useState literal union | loading, ready, failed | source-player.tsx. 영속 Job 상태 아님 |
| ConnectorFailureStatus / ConnectorResult | union 및 판별 union | 호스팅 실패 상태 / success·실패 | connector-contract.mts. LAN pairing/PC 작업 상태로 합치지 않음 |

정의 파일은 [영역별 표](README.md)의 이름으로 찾을 수 있다. 핵심 실제 근거는 [jobs/server](../../../../apps/web/lib/jobs/server.ts), [jobs/types](../../../../apps/web/lib/jobs/types.ts), [tagging](../../../../apps/web/lib/tagging.ts), [분석 types](../../../../apps/web/lib/analysis/types.ts), [schema](../../../../apps/web/db/schema.ts)다.

## 오류와 보관 구조

workerAction(fail)이 저장 대상으로 허용하는 코드는 download_failed, frames_failed, export_failed, analysis_failed, needs_auth, tool_missing, disk_full, unsupported, source_missing, conflict, interrupted, storage_failed다. cancellation은 상태·플래그로 별도 처리한다. `jobMessages`의 worker_offline 등 안내 키가 모두 fail의 저장 코드 목록에 포함되는 것은 아니다.

segment_media.status의 실제 문자열은 pending, ready, deleting이며 TypeScript 레코드에서도 string이다. [segment-media.ts](../../../../apps/web/lib/segment-media.ts)와 해당 API가 객체 준비·완료·정리 단계에서 사용하는 문자열을 읽어야 하며 `pc_jobs.state`와 같은 상태 기계로 그리지 않는다. 상세 선언과 실제 DB 제약은 [저장 목록](storage.md), [DB 레코드](records.md)에 있다.

## 다이어그램과 학습 포인트

실제 전이는 기존 [stateDiagram-v2](../jobs.md)에 유지한다. 이번 classDiagram은 구조만 표현하고 값 집합을 가짜 enum 박스로 추가하지 않았다. 상수는 JavaScript 런타임 값이지만 union은 컴파일 시 제약이며 DB의 CHECK와 같지 않다. 현재 pc_jobs.state에는 DB enum/CHECK를 가정하면 안 된다.

상태 이름의 존재는 해당 분기가 실환경에서 통과했다는 증거가 아니다. 실제 서비스·기기 검증은 기존 [구현 기록](../../local-video-ingestion-progress.md)을 따른다.
