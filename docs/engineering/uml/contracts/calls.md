# 후속 시퀀스 다이어그램용 호출 목록

[3단계 안내](README.md) · [HTTP 계약](http.md) · [작업 계약](pc-jobs.md) · [분석·저장](analysis-storage.md) · [연결 계약](connection.md)

## 무엇을 왜 조사했는가

실제 호출문을 기준으로 요청과 반환의 경계를 정리했다. 아래 각 ID는 후속 sequenceDiagram 메시지의 근거 번호로 사용할 수 있다. 참여자는 함수가 실행되는 모듈/프로세스이며 가상의 서비스 클래스가 아니다. 소스 링크에서 표에 적은 심볼과 호출문을 확인한다. `await`가 있는 순서는 기다리지만 timer·UI callback·스트림은 다른 시점에 동작한다.

## 시작과 공유 접수

| ID | 호출자 → 대상·호출 | 입력 → 반환 | 순서·분기·근거 |
|---|---|---|---|
| S1 | launcher.launch → acquireLock, probeJson, pcReady | 파일/상태URL → release 또는 경합, 서비스상태 | [launcher](../../../../apps/android/launcher.mjs): 죽은 서비스와 점유된 포트를 구분, 필요할 때만 spawn scripts/start-pc.mjs |
| S2 | start-pc → startPc → loadSettings/createGateway/listen/startRunner | 설정 → runtime | [entry](../../../../apps/web/scripts/start-pc.mjs), [start](../../../../apps/pc/start.mjs): Worker 준비 확인·cleanTemporary 후 poll |
| S3 | launcher.launch → createBridge → server.listen | PC upstream/인증설정 → LAN 준비 | [launcher](../../../../apps/android/launcher.mjs), [Bridge](../../../../apps/android/bridge/server.mjs): 기존 Bridge면 생성 대신 인증 probe, 소유권 보존 |
| A1 | Android lifecycle → sharedLink/receiveShare → ShareRequest.create → persistPendingShare | Intent 텍스트 → URL/UUID/pending | [MainActivity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java), [ShareRequest](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ShareRequest.java): 신규 공유와 복원 ID 구분 |
| A2 | verifyConnection의 Thread → ConnectionProbe.check → Bridge → PC status/clips | 주소/인증 → Result 또는 IOException | [ConnectionProbe](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java): 동기HTTP를 별도Thread에서 실행, generation guard 후UI·cookie |
| A3 | Activity → ShareRequest.mobilePath → WebView → PcIngest effect | url/shareId/start → submit 호출 | [mobile-share](../../../../apps/web/lib/mobile-share.ts), [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx): shareLaunch 검증; PC 직접 입력은 이 부분 대신 form submit |
| A4 | PcIngest.submit → POST /api/jobs → jobs.submit → D1 batch | 같은 requestId/payload → 202접수 또는200재사용 | [route](../../../../apps/web/app/api/jobs/route.ts), [jobs](../../../../apps/web/lib/jobs/server.ts): 모바일은 Bridge→Gateway→Worker 경유, PC는 Gateway부터 |
| A5 | PcIngest.submit → history.replaceState → WebViewClient.doUpdateVisitedHistory | accepted=id/job → pending 제거 | [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx), [Activity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java): 접수 ACK, 분석 완료 ACK가 아님 |

## 다운로드·분석·저장

| ID | 호출자 → 대상·호출 | 입력 → 반환 | 순서·분기·근거 |
|---|---|---|---|
| J1 | runner.tick → workerClient('claim') → workerAction → recover/조건부D1 UPDATE | → job 또는 null | [runner](../../../../apps/pc/runner.mjs), [jobs](../../../../apps/web/lib/jobs/server.ts): 단일 busy, poll1.5초; job없으면 종료 |
| J2 | heartbeat timer → client('heartbeat') → workerAction | id/소유권 → cancel 여부 | [runner](../../../../apps/pc/runner.mjs): 5초 반복, 오류는 interrupted abort; J3~J6와 시간상 겹침 |
| J3 | tick → downloadMedia(기본 download) → toolchain/egressProxy/run | job/signal/progress → LocalAsset | [media](../../../../apps/pc/media.mjs), [process](../../../../apps/pc/process.mjs): yt-dlp/FFmpeg 자식. 기존 asset 있으면 stat 검사로 분기 |
| J4 | tick → client('attach') → workerAction | asset/revision → 새 revision | [runner](../../../../apps/pc/runner.mjs), [jobs](../../../../apps/web/lib/jobs/server.ts): 다운로드 후 D1 원본 연결; 충돌은 fail 경로 |
| J5 | tick → extractFrames(기본 frames) → run(FFmpeg) | asset/targets → JPEG FrameInput | [media](../../../../apps/pc/media.mjs): finally 임시 frame 삭제; 유효 checkpoint면 J5/J6 생략 |
| J6 | tick → Worker POST /api/ai/frames → apiKey('openai') → generateFrames → OpenAI | 표본 이미지/시각/사전 → report/title/memo | [runner](../../../../apps/pc/runner.mjs), [route](../../../../apps/web/app/api/ai/frames/route.ts), [openai](../../../../apps/web/lib/ai/openai.ts): Bridge/Gateway 경유 아님, runner가 내부 Worker origin 호출 |
| J7 | tick → atomicJson(checkpoint) → client('complete') → complete helper | AI result/revision → 저장응답 | [runner](../../../../apps/pc/runner.mjs), [jobs](../../../../apps/web/lib/jobs/server.ts): D1 병합·완료 receipt; checkpoint 성공만으로 completed 아님 |
| J8 | PcIngest timer → GET /api/jobs → listJobs → UI state | id → PcJob 목록 | [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx): 3초 조회; 화면 unmount는 poll 정리만, PC tick과 독립 |

## 취소·재시도·복구와 종료

| ID | 호출자 → 대상·호출 | 입력 → 반환 | 순서·분기·근거 |
|---|---|---|---|
| F1 | PcIngest.action → POST jobs/:id/cancel → changeJob | → job | [jobs](../../../../apps/web/lib/jobs/server.ts): queued즉시취소/running플래그; 실제 종료는 J2에서 감지 |
| F2 | heartbeat abort → run abort 처리 → tick catch → client('fail') | 취소/실패 코드 → DB 상태 | [process](../../../../apps/pc/process.mjs), [runner](../../../../apps/pc/runner.mjs): 자식종료·finally임시정리; fail 저장도 실패하면 lease복구 필요 |
| F3 | PcIngest.action → POST jobs/:id/retry → changeJob | 동일 job → queued | [jobs](../../../../apps/web/lib/jobs/server.ts): 실패·중단·취소만 대상, 다음 J1이 실행; 기존원본/checkpoint 조건부재사용 |
| F4 | PC 재시작/listJobs/claim → recover | 만료 running → interrupted/cancelled | [jobs](../../../../apps/web/lib/jobs/server.ts): 만료 전 즉시 복구 아님; 사용자 retry로 재진입 |
| F5 | launcher signal/child exit → launch.close → 자기PC IPC shutdown → startPc.close → runner.close | → 종료 요청/대기 | [launcher](../../../../apps/android/launcher.mjs), [entry](../../../../apps/web/scripts/start-pc.mjs), [start](../../../../apps/pc/start.mjs): 자기서비스만 종료. PC launcher 종료와 모바일 Activity 종료는 다른 사건 |

## 재생·구간 작업·기존 경로

| ID | 호출자 → 대상·호출 | 입력 → 반환 | 순서·분기·근거 |
|---|---|---|---|
| M1 | video/Android 전송 → Gateway GET/HEAD media → client('asset') → assetFile/serveFile | Range → 로컬200/206/416 | [server](../../../../apps/pc/server.mjs): 모바일만 Bridge추가; R2원본이면 Worker route/mediaResponse로 proxy |
| M2 | 구간 화면 → retagSegments → POST jobs(kind=retag) | selected → **기존 Clip** | [retag](../../../../apps/web/lib/analysis/retag-segments.ts): 로컬원본은 J1,J5~J7; 완료 결과는 후속 동기화로 확인 |
| M3 | 구간 내보내기 요청 → jobs(kind=export) → tick → exportLocal → complete | 한 구간 → export asset/완료상태 | [segment 화면](../../../../apps/web/features/segments/segment-library.tsx), [runner](../../../../apps/pc/runner.mjs): AI 호출 없음; 현재 원본/구간·revision 검사 |
| M4 | 구간파일GET → Gateway client('segmentAsset') → localSegments → serveFile | segmentId/fingerprint → 파일 | [jobs](../../../../apps/web/lib/jobs/server.ts), [Gateway](../../../../apps/pc/server.mjs): 변경/미완료는 로컬404; R2는 Worker GET |
| M5 | 비로컬 retagSegments → ai/status → Gemini analyze 또는 analyzeWholeVideo → PATCH clip | 분석 결과 → 새 Clip | [retag](../../../../apps/web/lib/analysis/retag-segments.ts): 사용자 태그 병합·revision; 로컬 경로와 분리 |
| M6 | 파일 등록 요청 → clips.POST → R2 put → D1 insert → serialize | FormData →201 Clip | [clips route](../../../../apps/web/app/api/clips/route.ts): 저장실패 시 R2보상삭제; PC disk download 작업 아님 |
| M7 | Android FileAccess.result → 전송 Thread → DownloadTransfer.copy → progress/update | PC 파일 → Android 문서 bytes | [FileAccess](../../../../apps/android/app/src/main/java/app/cutnote/mobile/FileAccess.java), [DownloadTransfer](../../../../apps/android/app/src/main/java/app/cutnote/mobile/DownloadTransfer.java): Android 파일 저장과 PC 수집 취소를 혼동하지 않음 |

## 다이어그램 읽는 방법과 학습 포인트

후속 그림은 S(시작), A(접수), J(처리), F(실패), M(미디어)로 나눈다. 실선 요청·점선 반환을 사용하고 J2/J8은 loop, 기존원본/checkpoint/제공자 분기는 alt로 표시한다. 클라이언트와 runner 사이에 직접 메모리 호출 화살표를 그리지 않는다. 둘은 HTTP/D1 상태를 통해 연결된다. 합성 관계나 동시 실행 성공 보장은 이 호출 목록에서 도출하지 않는다.

사실은 위 호출문이며 그룹 이름은 설명을 위한 해석이다. 시간차·네트워크 단절·OS 프로세스 강제종료의 실제 순서는 미확인이다. 이번 단계에서는 새 그림 대신 편집 가능한 기존 [작업 sequence/state](../jobs.md)·[재생 sequence](../media-and-features.md)에 연결하고 후속 세분화 근거를 남겼다.
