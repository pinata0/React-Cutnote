# 주요 실행 의존 관계 표

[6단계 안내](README.md) · [구조도·순환/경계 점검](structure.md)

## 무엇을 왜 조사했는가

요청을 받은 함수가 실제로 호출하는 대상과 값을 다음 경계로 넘기는 방법을 확인했다. 표의 사용 위치 링크와 심볼이 판단 근거다. 전체 public 함수 시그니처는 [계약 표](../contracts/README.md)에 있으므로 여기서는 방향·사용 형태·경계를 중복 없이 설명한다.

## 웹 API → 검증 → 도메인 → 저장

| 사용 주체 | 대상 | 사용 위치 | 호출/생성/변환 방식 | 프로세스 경계 | UML 표시 여부 | 이유 |
|---|---|---|---|---|---|---|
| jobs POST route | crossOrigin/readLimited/submit | [jobs/route.ts](../../../../apps/web/app/api/jobs/route.ts) POST | [CALL][VALUE] 출처·본문16,000bytes·JSON 파싱 후 await submit | Worker 내부 | 표시 | import뿐 아니라 요청마다 호출 |
| submit | canonicalSource/parseSegmentTargets/validateFields/parseSegments/findClip | [jobs/server.ts](../../../../apps/web/lib/jobs/server.ts) submit | [VALUE][DB] kind별 분기,ID·링크·기존 구간/원본 대조 | Worker→D1 binding | 표시 | 검증 성공 후에만 접수 SQL 구성 |
| submit | D1 prepare/batch/job 조회 | 같은 파일 submit | [DB] clip/job 조건부INSERT, 동일 requestId payload 대조 | Worker→로컬 D1 backing | 표시 | 접수는 영속 저장이며 다운로드 직접 호출 아님 |
| clips POST | 검증 함수/R2/D1/serialize | [clips/route.ts](../../../../apps/web/app/api/clips/route.ts) POST | [VALUE] FormData→필드/분석/태그/구간; [R2] put; [DB] INSERT; [VALUE] 공개Clip | Worker→D1/R2 | 분기 | 기존 업로드 경로, 실패 업로드 보상삭제 |
| clip PATCH | parseAnalysis/parseTagging/mergeTagging/decideTag/parseSegments | [clip route](../../../../apps/web/app/api/clips/[id]/route.ts) PATCH | [VALUE] revision/expected 검사·사용자 편집/AI결과 병합; [DB] 조건 UPDATE | Worker→D1 | 분기 | UI 편집도 같은 검증/저장 경계 사용 |
| clip PATCH/DELETE 및 segment list | cleanSegmentMedia | [clip route](../../../../apps/web/app/api/clips/[id]/route.ts), [segment list](../../../../apps/web/app/api/segment-media/[id]/route.ts) | [CALL][DB][R2] 무효 파일행 표시→object 삭제→행 삭제 | Worker→D1/R2 | 표만 | GET도 쓰기/정리를 호출할 수 있음 |
| Worker의 server 모듈 | env.DB/env.BUCKET | [server.ts](../../../../apps/web/lib/server.ts) database/bucket/findClip/serialize | [DB][R2] binding 반환·SQL조회; [VALUE] JSON parse/URL 구성 | Worker binding,브라우저 파일시스템 아님 | 표시 | 실제 API는 raw SQL 경로. db/index.getDb 호출과 다름 |

## 링크 접수 → PC 다운로드 → 프레임 → 분석

| 사용 주체 | 대상 | 사용 위치 | 호출/생성/변환 방식 | 프로세스 경계 | UML 표시 여부 | 이유 |
|---|---|---|---|---|---|---|
| PcIngest.submit/action/effect | jobs API | [pc-ingest.tsx](../../../../apps/web/features/library/pc-ingest.tsx) api/submit/action | [HTTP] GET/POST; 공유ID 유지; [VALUE] JSON→state,접수 후history ACK | 브라우저→Gateway→Worker; 모바일은Bridge추가 | 표시 | 화면은 외부 도구를 spawn하지 않음 |
| startRunner.tick | workerClient가 반환한 async 함수 | [runner.mjs](../../../../apps/pc/runner.mjs) claim/heartbeat/progress/attach/fail/complete | [HTTP] 내부jobs action,Bearer·lease 값; [NEW] timer/AbortController | Node PC→loopback Worker | 표시 | 함수 주입·실제호출. 소스에 JobService 클래스 없음 |
| internal POST | internal/workerAction | [internal route](../../../../apps/web/app/api/internal/jobs/route.ts) POST | [VALUE] 인증·2MiB JSON; [CALL][DB] claim/상태/완료 분기 | Worker→D1 | 표시 | 외부Gateway/Bridge 허용 API와 별도 경계 |
| tick | downloadMedia/extractFrames/exportLocal | [runner.mjs](../../../../apps/pc/runner.mjs) startRunner 기본인자와 tick | [CALL] 기본 주입은 download/frames, kind=export 분기 직접호출 | 같은 Node 프로세스 | 표시 | 테스트 대체가능성과 production 기본함수 연결을 구분 |
| download/frames/exportLocal | toolchain/run/inside/assetFile/atomicJson | [media.mjs](../../../../apps/pc/media.mjs) 각 함수 | [CALL][FS] 안전경로·manifest·JPEG·완료파일 처리 | Node→로컬 FS | 표시 | import뿐 아니라 원본 확보/추출 중 실행 |
| run | yt-dlp/FFmpeg/FFprobe ChildProcess | [process.mjs](../../../../apps/pc/process.mjs) run, [media.mjs](../../../../apps/pc/media.mjs) 인자 구성 | [SPAWN] shell:false 배열 인자; stdout/종료코드; abort 시 자기트리 종료 | Node→OS 외부 프로그램 | 표시 | 일반 함수 호출과 다른 실패·수명 경계 |
| download | egressProxy → 다운로드 사이트 | [media.mjs](../../../../apps/pc/media.mjs) --proxy; [egress.mjs](../../../../apps/pc/egress.mjs) CONNECT callback | [NEW] proxy server; [HTTP/TLS] 호스트·IPv4 검사 후 검증 IP에 연결 | yt-dlp→Node proxy→인터넷 | 표시 | 단순 URL 문자열 검증보다 별도 네트워크 통제 |
| tick | checkpoint FS 및 frames HTTP | [runner.mjs](../../../../apps/pc/runner.mjs) checkpoint/fetch | [FS] 이전결과 조건부재사용; [HTTP] 없으면 /api/ai/frames, [FS] 결과 atomicJson | Node→FS/loopback Worker | 표시 | 유효 checkpoint이면 프레임/AI 호출 생략 |
| frames POST | apiKey('openai')/parseFrameInput/generateFrames | [frames route](../../../../apps/web/app/api/ai/frames/route.ts) POST | [CALL][VALUE] 입력 프레임 검증; [DB] 설정조회/복호화; AI 호출 | Worker→D1→외부OpenAI | 표시 | 새 PC경로의 제공자는 OpenAI로 고정 |
| generateFrames | framesRequest/fetch/parseFramesResult | [openai.ts](../../../../apps/web/lib/ai/openai.ts) generateFrames | [VALUE] 표본·시각·schema→요청; [HTTP] Responses; [VALUE] 응답검증 | Worker→OpenAI HTTPS | 표시 | 가져온 원본 전체/음성 전송이 아니라 표본이미지·텍스트 요청 |

## 분석 응답 → 검증·변환 → 클립 저장

| 사용 주체 | 대상 | 사용 위치 | 호출/생성/변환 방식 | 프로세스 경계 | UML 표시 여부 | 이유 |
|---|---|---|---|---|---|---|
| parseFramesResult | responseText/parseProposal/validateSampledEvidence | [openai.ts](../../../../apps/web/lib/ai/openai.ts) parseFramesResult | [VALUE] 제공자응답→텍스트→제안; 근거시각을 전달표본과 대조 | Worker 내부 | 표시 | 타입단언만으로 AI값을 저장하지 않음 |
| parseProposal | aiTagging/projectedTags/validateFields/parseSegments/alignSegmentTargets | [result.ts](../../../../apps/web/lib/ai/result.ts) parseProposal | [VALUE] JSON·사전ID·점수·관찰·기간 검사,구간 형태 정규화/기존대상 정렬 | Worker 내부 | 표시 | schema요청과 실제응답검증은 별개 단계 |
| parseFramesResult | AnalysisReport 형태 값 | [openai.ts](../../../../apps/web/lib/ai/openai.ts) report 생성 | [VALUE] parseSegments 결과·engine/model·시각·태그를 객체로 구성 | Worker→HTTP응답→Node | 표시 | new Report 클래스 생성이나 D1저장 아님 |
| tick | client('complete') | [runner.mjs](../../../../apps/pc/runner.mjs) commit | [HTTP] result/revision→내부 Worker | Node→Worker | 표시 | AI응답 획득과 보관함 저장의 별도 호출 |
| workerAction/complete | parseAnalysis/mergeSegmentTagging/refreshSegmentTags/mergeTagging | [jobs/server.ts](../../../../apps/web/lib/jobs/server.ts) complete | [VALUE] OpenAI report 재검증·기존 태그결정/구간 보존·이력 구성 | Worker 내부 | 표시 | 재분석 시 사용자 판단을 덮어쓰지 않도록 병합 |
| complete | D1 batch | 같은 파일 complete | [DB] revision·lease·receipt 조건하에 clips UPDATE와 job completed | Worker→D1 | 표시 | FS checkpoint와 DB완료는 동일 트랜잭션 아님 |
| retagSegments 비로컬 분기 | ai/status, ai/analyze 또는 analyzeWholeVideo, clip PATCH | [retag-segments.ts](../../../../apps/web/lib/analysis/retag-segments.ts) | [HTTP][VALUE] 제공자선택·브라우저 프레임/Gemini·태그병합·저장 | 브라우저→Worker→외부AI | 분기 | 로컬 retag는 job접수만, 기존경로와 구분 |

## Android → Bridge와 PC 실행기

| 사용 주체 | 대상 | 사용 위치 | 호출/생성/변환 방식 | 프로세스 경계 | UML 표시 여부 | 이유 |
|---|---|---|---|---|---|---|
| MainActivity | LinkPolicy/ShareRequest/preferences | [MainActivity.java](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java) sharedLink/receiveShare/persistPendingShare | [CALL][NEW][VALUE] Intent→링크→UUID 요청; Android preferences에 값 저장 | Android 프로세스/플랫폼 저장 | 표시 | 공유ID 생성·복원은 PC job 생성과 별개 |
| verifyConnection의 Thread | ConnectionProbe.check | [Activity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java), [ConnectionProbe.java](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java) | [NEW] Thread; [HTTP] status→clips, cookie 결과를 UI에 전달 | Android→LAN Bridge | 표시 | 동기 HTTP를 UI Thread에서 직접 실행하지 않음 |
| Activity/WebView | ShareRequest.mobilePath/PcIngest | [Activity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java) openPending/loadPath/history callback | [VALUE] URL query 생성; [HTTP] 페이지로드,JS실행; accepted ID ACK로 pending정리 | Android WebView→LAN HTTP→브라우저JS | 표시 | Java가 Worker submit 함수를 직접 호출하지 않음 |
| Bridge request callback | allowedPath/인증/http.request | [bridge/server.mjs](../../../../apps/android/bridge/server.mjs) createBridge callback | [VALUE] 인증/허용경로/크기; [HTTP] 헤더선별·upstream Origin 재작성·LAN표시 후중계 | LAN→Node Bridge→loopback Gateway | 표시 | 실제중계 실행문에 근거, 단순import와다름 |
| Gateway callback | client('asset'/'segmentAsset')/serveFile/http.request | [pc/server.mjs](../../../../apps/pc/server.mjs) createGateway | [HTTP] 메타조회/일반요청 proxy; [FS] 로컬파일Range stream | Node→Worker/로컬FS | 표시 | 로컬 재생은 Worker가 디스크를 읽는 구조 아님 |
| launch | acquireLock/probeJson/pcReady/spawn/createBridge | [launcher.mjs](../../../../apps/android/launcher.mjs) launch | [FS] lock/연결상태파일; [HTTP] 준비조회; [SPAWN] 필요PC자식; [NEW] 필요Bridge | Launcher Node→PC자식/LAN HTTP/FS | 표시 | 기존서비스재사용과 직접소유분 구분 |
| start-pc entry | startPc | [scripts/start-pc.mjs](../../../../apps/web/scripts/start-pc.mjs) top-level | [CALL] 시작, signal/IPC shutdown→close | Node entry→PC모듈 | 표시 | 엔트리와 라이브러리 함수 연결 근거 |
| startPc | loadSettings/protectConnectionFile/createGateway/spawn/workerClient/startRunner | [start.mjs](../../../../apps/pc/start.mjs) startPc | [FS] 런타임설정; [NEW] 서버; [SPAWN] Wrangler; [HTTP] readiness; [CALL] worker시작 | Node→FS/Worker자식 | 표시 | 브라우저 runtime이 Node API를 직접사용하지 않음 |
| launcher.close / startPc.close / runner.close | 자기서비스·timer·active signal·child | [launcher](../../../../apps/android/launcher.mjs), [start](../../../../apps/pc/start.mjs), [runner](../../../../apps/pc/runner.mjs) | [CALL/IPC] 종료전달,서버close,abort; [SPAWN] Windows taskkill; [FS] runtime정리 | Node간 IPC/OS/FS | 표시 | 종료는 실제호출; 기존서비스를 임의종료하지 않음 |

## 판단과 미확인

검증 함수 호출, `new` 객체, OS `spawn`, HTTP, D1/R2, 로컬FS를 서로 다른 의존으로 분류했다. 도메인 함수의 실행 위치는 호출자에 따라 브라우저/Worker가 달라질 수 있고, 폴더 이름만으로 단일 실행 위치를 정하지 않았다. 표의 “실제 사용”은 코드의 활성 분기 호출문을 확인했다는 뜻이며 이번에 해당 서비스를 실행해 성공을 관찰했다는 뜻은 아니다. 조건별 테스트 주입·실기기·외부AI 검증 상태는 [검증 기록](../validation.md)을 따른다.
