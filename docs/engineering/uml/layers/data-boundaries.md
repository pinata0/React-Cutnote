# 공개 데이터·직렬화·런타임 검증 경계

[계층 안내](README.md) · [PC sequence](pc-sequence.md)

## 무엇을 왜 조사했는가

브라우저·Android가 받는 값과 Node/Worker 내부 값의 차이를 확인했다. 아래는 소스의 필드 이름과 전달 구조만 기록한다. 실제 API 키·연결코드·cookie·파일경로·프로세스ID·개인 보관함 값은 읽거나 출력하지 않았다. “공개 DTO”는 해당 UI가 받는 데이터이며 익명 인터넷 공개를 뜻하지 않는다.

## 노출과 변환 표

| 요소 | 계층 | 실행 위치 | 외부 노출 여부 | 입출력 계약 | 연결 대상 | 검증 책임 | UML 배치 제안 |
|---|---|---|---|---|---|---|---|
| ClipRow→Clip | 저장→공개DTO | Worker | 브라우저/인증Android에 Clip | JSON parse 및 `id/title/sourceUrl/videoUrl/posterUrl/tags/notes/segments/tagging/analysis/analysisHistory/revision/favorite` 등 | [serialize](../../../../apps/web/lib/server.ts)→clips응답 | 태그parse/구간보정·즐겨찾기필터. DB전체schema 검증은아님 | 서버선별 변환 |
| ClipRow 내부필드 | DB행 | Worker/D1 | 일반Clip응답 제외 | local_asset/video_key/poster_key/last_job_id는그대로미반환 | [server.ts](../../../../apps/web/lib/server.ts) serialize | localVideo bool/상대media URL로 대체. 원본링크·사용자메모는공개Clip에포함 | 내부행영역 |
| JobRow→PcJob | 작업→공개DTO | Worker | jobs 화면에 반환 | id/clipId/kind/state/phase/progress/attempt/cancelRequested/errorCode/createdAt/updatedAt | [publicJob](../../../../apps/web/lib/jobs/server.ts) | 명시필드 allowlist. DB state가 string인것을 enum검증으로 표현하지않음 | 공개상태 경계 |
| claim 내부응답 | 내부작업 계약 | Worker→Node | Gateway/Bridge 공개경로차단 | row spread + payload JSON해제 + clip/asset/revision; 소유권/만료정보 포함 | [workerAction](../../../../apps/web/lib/jobs/server.ts),[workerClient](../../../../apps/pc/runner.mjs) | Bearer 인증·lease 검사. runner의 response.json 자체는완전schema검증아님 | 내부HTTP 별도화살표 |
| LocalAsset | 경로간접 메타 | Worker/Node | 내부asset API만 | root UUID/directory/video/poster/size/duration/mime | [assetInput](../../../../apps/web/lib/jobs/server.ts),[assetFile](../../../../apps/pc/media.mjs) | Worker는메타형식; Node는등록root조회·경로이탈/symlink검사 | 내부메타→FS 경계 |
| 구간 파일목록 | 공개 파일 DTO | Worker→UI | 브라우저/Android 반환 | segmentId/fingerprint/file의상대URL·크기·MIME·길이·치수 | [segment list](../../../../apps/web/app/api/segment-media/[id]/route.ts) | localSegments 결과에서 asset 구조분해로 제거; fingerprint는현재구간/원본식별해시 | 공개변환 경계 |
| PC설정 응답 | PC관리 화면 | Node→PC브라우저 | **절대폴더·도구경로 의도적으로노출**; LAN403 | folder/tools/diagnostics.ready/version | [Gateway settings](../../../../apps/pc/server.mjs),[PcIngest.configure](../../../../apps/web/features/library/pc-ingest.tsx) | Host/Origin·LAN표시차단,settings.update 경로검증. version은도구출력요약 | 별도PC관리 경계 |
| AI상태 응답 | 연결상태 DTO | Worker→UI | 제공자·모델·설정여부·workspace 공개 | configured/canConnect/provider/model/providers/localIngestAvailable/workspace | [status route](../../../../apps/web/app/api/ai/status/route.ts),[aiStatus](../../../../apps/web/lib/ai/settings.ts) | 키/암호문 미반환. 상태는설정존재이며API성공증명아님 | 공개연결상태 |
| AI 키 입력/저장 | 자격정보 설정 | PC브라우저→Worker→제공자/D1 | 입력한PC브라우저에는일시존재; 응답미반환; LAN connect차단 | provider와입력키→모델권한조회→암호화저장→상태응답 | [connect](../../../../apps/web/app/api/ai/connect/route.ts),[settings/crypto](../../../../apps/web/lib/ai/settings.ts) | normalizeKeyInput·provider검사·모델응답·sealKey. UI의canConnect는단독인증장치아님 | 민감입력 화살표,값생략 |
| master/제공자/내부인증 설정 | 실행환경·암호화 | Node시작→Worker | 일반UI미반환 | 시작코드가 private 설정/환경을읽어runtime vars 작성·Worker에 전달; 내부인증값은workerClient에주입 | [startPc](../../../../apps/pc/start.mjs),[internal](../../../../apps/web/lib/jobs/server.ts) | 파일권한·loopback·내부Bearer. Worker spawn은process.env도 전달 | private실행설정 영역 |
| 외부 도구 인자/환경 | OS프로세스 실행 | Node→yt-dlp/FFmpeg/FFprobe | 자식프로세스에경로/URL노출,UI API에는PID미반환 | 인자배열에원본URL·로컬파일·proxy·실행파일; safeEnv 허용환경만 | [process.run/safeEnv](../../../../apps/pc/process.mjs),[media](../../../../apps/pc/media.mjs) | shell:false·실행경로·제한환경; AI/내부인증값은다운로드도구환경에서제외 | OS경계,Worker spawn과구분 |
| FrameInput/AI요청 | 분석 데이터 | Node→Worker→OpenAI | 외부AI에프레임/시각/길이/지시문·사전 전송 | data URL JPEG 배열,기간,선택구간→framesRequest | [frames](../../../../apps/pc/media.mjs),[openai](../../../../apps/web/lib/ai/openai.ts) | readLimited/parseFrameInput. 요청에PC절대경로/lease/PID 넣지않음; 이미지내개인정보는별개 | 외부AI 데이터 경계 |
| 공유/연결정보 | Android·LAN 인증 | Android↔Bridge | native앱이주소·연결값·cookie관리 | Intent→link/id; probe→session cookie; WebView가공개API사용 | [Activity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java),[Probe](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java),[Bridge](../../../../apps/android/bridge/server.mjs) | LinkPolicy/ShareRequest,session/허용API. Bridge는cookie·연결헤더를upstream전달목록에서제외 | native/Bridge 인증경계 |
| 프로세스·연결 파일 | launcher 내부운영 | PC Node/개인연결파일 | 일반Clip/jobs/status에PID/child객체미반환 | lock의pid/소유권,connection 파일의연결안내·선택pid,launch 반환child/server | [launcher](../../../../apps/android/launcher.mjs) acquireLock/launch/showConnection | 개인파일·기존서비스검증; 개인TTY 출력과HTTP DTO구분 | 실행기 내부영역 |

## 직렬화와 검증 위치

1. **브라우저→HTTP:** PcIngest/client-request는 JSON.stringify, 기존 업로드는 FormData를 만든다. 브라우저의 타입단언/폼 제약은 우회될 수 있으므로 Worker가 별도로 검사한다. 응답 res.json 후 `as T`는 TypeScript에 대한 약속일 뿐 런타임 검증이 아니다. useLibrarySync는 버전·취소·timeout으로 응답 수명을 관리하지만 Clip 전체 schema를 검증하지 않는다.
2. **route→도메인:** jobs POST는 readLimited→JSON.parse→submit. submit은 requestId/kind/URL/대상구간/기존클립을 검사한다. internal POST는 인증→크기/JSON→workerAction이며 assetInput·lease·revision·complete 검증이 뒤따른다. [HTTP 계약](../contracts/http.md)의 상태코드/제한을 따른다.
3. **객체→DB:** payload/asset/analysis/segments/tagging/history를 JSON.stringify해 TEXT로 저장한다. Row 타입의 generic·단언은 DB 내용의 런타임 검사 자체가 아니다. serialize와 publicJob의 선별도 서로 다르다. 전자는 일부 JSON을 복원하고 가공하며 후자는 정해진 컬럼을 공개 이름으로 복사한다.
4. **DB→Node:** claim은 JSON.parse로 payload/asset를 복원한다. HTTP 인증으로 제한된 계약이지만 모든 출력 필드를 다시 schema검증하는 방식은 아니다. 이후 Node assetFile/inside, manifest 재사용의 크기검사, ffprobe 결과검사 등이 수행된다. 신뢰/검증은 단계별이며 “내부 JSON이면 무조건 안전”으로 설명하지 않는다.
5. **AI→도메인→저장:** parseFramesResult→responseText/parseProposal→태그·필드·구간·실제표본근거 검사 후 report를 만든다. runner는 checkpoint에 JSON 저장하고 complete로 전송한다. Worker complete는 parseAnalysis로 재검증하고 사용자 태그/구간을 병합한 뒤 revision/lease 조건으로 D1을 갱신한다.

## 노출 경계의 한계와 학습 포인트

정상 DTO에 내부 필드가 없다는 것과 모든 오류/로그에서 유출이 불가능하다는 주장은 다르다. jobs POST 등 일부 route는 catch한 Error.message를 응답한다. 도구 diagnostic에는 URL 치환이 있지만 모든 가능한 경로 문자열을 지우는 전역정책은 아니다. 이번에는 실제 오류 로그나 비밀 원본을 열지 않았으므로 오류·운영로그까지 포괄한 비노출 보증은 하지 않는다. 후속 검증은 가상 경로·가상 자격정보를 넣은 실패 주입으로 응답/로그를 검사한다.

Bridge가 제공하는 session cookie는 HttpOnly이지만 native 연결 코드가 cookie를 수신/설정하는 구조다. Worker의 DB·AI 키와 Bridge의 연결 인증은 서로 다른 권한이다. Bridge는 upstream의 Set-Cookie도 일반중계에서 제외한다. 기본 LAN은 HTTP이므로 “인증이 있으니 전송 암호화도 제공한다”고 설명하지 않는다. 소스의 경계만 확인했으며 실제 네트워크 노출·TLS 구성은 이번에 확인하지 않았다.

PC 전용 settings 응답은 내부 경로를 의도적으로 사용자에게 보여주는 예외다. 일반 DTO의 비노출과 구분해야 한다. download child에 제한환경을 주는 것과 Worker/PC child 시작에 환경을 전달하는 것도 다른 호출이다. 실제 값은 본 문서에 포함하지 않았다.

관련 근거: [수명/보관 정책](../lifetime/README.md), [실제 의존 경계](../dependencies/structure.md), [검증 기록](../validation.md). 자동 Mermaid 렌더링·서비스 오류 주입·실기기 검증은 이번 범위에서 미실행이다.
