# 작업·다운로드·로컬 저장 계약

[3단계 안내](README.md) · [상태 선언](../declarations/states.md) · [기존 작업 그림](../jobs.md)

## 조사 질문과 확인 위치

화면 요청이 끝난 뒤 누가 실행을 소유하며, 실패·취소·재시작이 어떤 반환과 저장을 만드는가? 함수 모듈과 반환 클로저를 그대로 기록한다. 아래 JS 반환 형태는 소스에서 추론한 설명이며 새 interface 선언이 아니다. 내부 API action은 하나의 workerAction 분기이며 메서드를 새로 발명하지 않는다.

## Worker 작업 계약

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [jobs/server](../../../../apps/web/lib/jobs/server.ts) | enabled():boolean; internal(req:Request):boolean | export | 동기 | 환경 활성 여부 / Bearer 일치 | 환경 읽기; 인증값 반환 안 함 | 보조 |
| jobs/server | canonicalSource(value:unknown):string | export | 동기 | YouTube/Instagram 개별 링크 → 정규 URL | 파싱·길이·호스트·경로 불일치 throw; 네트워크 없음 | 보조 |
| jobs/server | publicJob(row:JobRow):PcJob | export | 동기 | 내부행 → 공개 상태 | payload·lease·로컬경로 제외 | 보조 |
| jobs/server | submit(value:Record<string,unknown>) | export | async | → Response `{job,reused?}` | requestId 기준 D1 clip/job 접수. 동일ID·payload 재사용, 다른내용409. 같은 URL의 다른 ID는 별도 요청 | 호출 |
| jobs/server | recover():Promise<void> | export | async | 입력 없음 | 만료 running을 interrupted 또는 cancel_requested이면 cancelled로 변경. 자동 재다운로드 안 함 | 호출 |
| jobs/server | listJobs(id?:string):Promise<PcJob[]> | export | async | 한 ID 또는 최근100건 | 먼저 recover; 잘못된 ID는 빈 목록; DB reject | 호출 |
| jobs/server | changeJob(id:string,action:string) | export | async | → Response `{job}` | queued 취소는 즉시 cancelled, running은 플래그. retry는 failed/interrupted/cancelled만 queued; 없는 clip404 | 호출 |
| jobs/server | workerAction(v:Record<string,unknown>) | export/내부 HTTP 경유 | async | action → Response | 아래 분기 표. D1 변경·입력 throw·소유권409 | 호출 |
| jobs/server | localSegments(clip:ClipRow) | export | async | → 구간별 fingerprint/file/asset 목록 | D1 completed export와 현재 구간 대조; 파일 디스크 존재까지 증명하지 않음 | 호출 |
| jobs/server | complete(row,clip,v) | 내부 helper | async | AI 결과 → Response | OpenAI 결과 검증·태그/편집 병합·revision 조건·D1 완료 receipt. 외부 AI 재호출 안 함 | 호출 |

| workerAction action | 입력과 출력 | 변경·실패 의미 |
|---|---|---|
| claim | action → job 또는 null | recover 후 queued 1개 atomic UPDATE RETURNING, attempt+1,60초 lease; payload/clip/asset/revision 포함 |
| asset / segmentAsset | clipId, 후자는 segmentId/fingerprint → 원본/구간 파일 메타 | job lease 검사 이전의 읽기 분기; HTTP 내부 인증은 필요 |
| heartbeat | id/소유권 값 → `{cancel:boolean}` | lease60초 연장; 취소 요청·클립 삭제 전달 |
| progress | id/소유권 값/phase/progress → `{ok:true}` | download/frames/analyze/commit/export만 허용,0~100 제한 |
| attach | id/소유권 값/asset/revision → `{revision}` | LocalAsset 형식·범위 검증 및 clip 조건부 갱신; 충돌409 |
| complete | id/소유권 값/result/revision → `{ok:true}` 등 | 일반 분석은 결과 병합·완료; export는 원본·구간·치수·길이·revision 확인 후 완료 |
| fail | id/소유권 값/code → `{ok:true}` | cancelled/interrupted/failed 및 허용 error_code 저장; 알 수 없는 오류는 storage_failed |

claim·asset 조회를 제외한 쓰기에는 running 상태·유효 lease·소유권 일치가 필요하다. 단순히 UUID를 아는 것으로 작업 완료를 쓸 수 없다. 이 조건은 오류를 줄이는 DB 경계이며 OS 파일 전체의 트랜잭션은 아니다.

## PC 실행·다운로드 계약

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [start](../../../../apps/pc/start.mjs) | startPc({webRoot,port=5173,workerPort=5175,statePath,runtimePath}={}) | export | async | → `{close,gateway,runner}` | 설정·런타임 준비, Wrangler 자식/loopback Gateway 시작, readiness 후 임시정리와 runner; 실패 reject | 호출 |
| startPc 반환 객체 | close() | 반환 API | async | → void | idempotent; runner 종료→Gateway 종료→자기 Worker 종료·임시 런타임 파일 정리 | 호출 |
| [runner](../../../../apps/pc/runner.mjs) | workerClient(origin,token) | export | 동기 factory | → async `(action,body={},signal)` | 반환 함수가 내부 POST, 기본15초; 비정상응답 conflict 또는 storage_failed throw | 호출 |
| runner | startRunner({client,origin,settings,downloadMedia=download,extractFrames=frames,interval=1500}) | export | 동기 | → `{tick,busy,close}` | 즉시 tick과 주기 timer 시작; 생성 자체가 작업 스케줄링 | 호출 |
| runner 반환 객체 | tick(); get busy(); close() | 반환 API | async / 동기 getter / async | tick void, busy boolean, close void | 단일 실행;5초 heartbeat. close는 새 poll 중단·active abort(interrupted)·busy 해제 대기 | 호출 |
| runner | failureCode(error,phase) | export | 동기 | → 오류 코드 문자열 | ENOSPC→disk_full; 알려진코드 보존; 단계별 오류 변환 | 보조 |
| [process](../../../../apps/pc/process.mjs) | safeEnv() | export | 동기 | → 허용 환경변수 객체 | 자식에게 AI 키·내부 인증값 전달 제외 | 보조 |
| process | executable(configured,name) | export | async | → 실행 파일 절대경로 | 지정값/PATH access 검사, Windows exe; tool_missing throw | 보조 |
| process | run(file,args,{signal,timeout=120000,onLine,maxOutput=2097152,cwd,successCodes=[0]}={}) | export | Promise 반환 | → stdout string | shell:false spawn·출력제한·취소/timeout 시 자기 process tree 종료. tool_missing/needs_auth/download_failed 등 reject | 호출 |
| process | toolchain(settings); diagnose(settings) | export | async | → 실행경로 / 도구별 ready·version | toolchain은 누락 reject; diagnose는 실제 버전 명령10초, 도구별 실패를 ready:false로 반환 | 호출 |
| [media](../../../../apps/pc/media.mjs) | download(settings,job,signal,progress) | export | async | → LocalAsset 형태 | manifest/파일 재사용 또는 yt-dlp→FFmpeg→poster→atomic manifest.2GiB/2시간·여유공간 검사, finally staging 정리 | 호출 |
| media | frames(settings,asset,targets,signal,progress) | export | async | → frames/durationSeconds/segmentTargets | FFmpeg JPEG 최대120개·본문20MiB; finally frames 임시정리; 추출·취소 오류 reject | 호출 |
| media | exportLocal(settings,asset,job,signal) | export | async | → asset+width/height | 최대300초·25MiB 구간 파일, 검증 뒤 rename; 임시정리; 실패 reject | 호출 |
| media | sampleTimes(duration,targets) | export | 동기 | → number[] | 기간 검증 및 표본 시각; 잘못된 입력 throw | 보조 |
| media | assetFile(settings,asset,poster=false) | export | async | → 허용 루트 안 파일경로 | root UUID·directory·파일명/링크 검증; source_missing/경로 오류 | 호출 |
| media | cleanDirectory(root,id,name); cleanTemporary(settings) | export | async | → void | UUID 디렉터리의 staging/frames만 제거; 원본은 보존. 임의 하위경로 삭제 API 아님 | 호출 |
| [settings](../../../../apps/pc/settings.mjs) | safeRoot(value); inside(root,...parts) | export | async | → 검증한 절대경로 | safeRoot는 mkdir/realpath도 실행; inside는 루트 이탈·symlink 검사. 단순 문자열 변환 아님 | 보조 |
| settings | atomicJson(file,value) | export | async | → void | 임시 wx/권한600/fsync/rename; rename 단계 finally에서 임시삭제. 앞선 write/fsync 실패 잔류는 [수명 조사](../lifetime/jobs-files.md) 참조; 오류 reject | 호출 |
| settings | loadSettings(stateDir) | export | async | → `{get,update}` | 설정 디렉터리 생성·JSON 읽기/기본값·검증; 파싱/경로 오류 reject | 호출 |
| loadSettings 반환 객체 | get(); update(value) | 반환 API | 동기 / async | → 현재 settings | update는 폴더 write probe·등록 루트·도구경로 검사·atomic 저장 후 메모리 반영 | 호출 |
| settings | requireSpace(root,min=5GiB) | export | async | → void | statfs 검사, 부족 시 disk_full | 보조 |
| [egress](../../../../apps/pc/egress.mjs) | allowedHost(host); publicIPv4(ip) | export | 동기 | → 허용 여부 | 네트워크 없음; downloader 목적지 검증 | 보조 |
| egress | egressProxy() | export | async | → `{blocked,url,close}` | 임시 loopback CONNECT 서버; DNS IPv4 전체 검사 후 검증 주소에 연결,443만; close는 socket파괴+server.close, 동기 void | 호출 |
| [server](../../../../apps/pc/server.mjs) | createGateway({upstream,settings,client,port=5173}) | export | 동기 | → http.Server | callback 등록만, listen은 startPc. Host/Origin/내부경로 차단·proxy·로컬 stream | 호출 |
| server | rangeFor(header,size); serveFile(req,res,file,mime,title) | export | 동기 / async | → 범위 객체 / void | range 오류 throw를 serveFile이416으로 변환; 파일handle finally close; HEAD 본문없음/GET stream | 호출 |

## 읽는 방법·설계 판단과 미확인

runner는 요청 화면의 Promise가 아니라 PC timer로 살아간다. tick은 실패를 내부 fail 요청으로 저장한 뒤 종료할 수 있으므로 `await tick()` 성공을 작업 completed로 해석하면 안 된다. 완료 여부는 DB 상태로 확인한다. 다운로드 이후 분석 실패라면 원본과 분석 checkpoint를 재사용할 수 있지만, payload·원본 크기 등 재사용 조건을 통과해야 한다.

취소는 요청 플래그→heartbeat→AbortSignal→자식 종료→fail 반영의 과정이다. 레이스에 의해 API 응답과 실제 중단 시점이 다르다. 프로세스 강제 종료에서는 lease 만료 후 recover가 명시적인 interrupted를 만든다. [호출 목록](calls.md)에서 이 경계를 분리했다. 실 전원 종료/Windows 자식 종료 타이밍은 이번 문서 단계에서 재현하지 않았다.
