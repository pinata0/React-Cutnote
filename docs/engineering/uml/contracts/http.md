# HTTP route의 외부 계약

[3단계 안내](README.md) · [호출 목록](calls.md)

## 조사 질문과 확인 위치

어떤 메서드가 실제 export되며, 접수·결과·파일 응답을 어떻게 구분하는가? 아래 파일 링크의 해당 메서드를 근거로 한다. 표의 `ctx`는 `{params:Promise<{id:string}>}`이며 구간 route에는 `segmentId:string`, 작업 action에는 `action:string`이 추가된다. 모든 route handler의 반환은 `Promise<Response>`다. HEAD 별칭은 GET과 같은 함수 참조이며 본문 생략은 mediaResponse에서 처리한다. Bridge 허용 목록에 있다는 이유만으로 route 구현이 있다고 간주하지 않았다.

## API 계약 표

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [jobs](../../../../apps/web/app/api/jobs/route.ts) | GET(req:Request) | HTTP export | async | 선택 id → 200 `{jobs,available}` | 비활성도 200. listJobs가 만료 작업 복구; DB 오류503 | 호출 |
| jobs | POST(req:Request) | HTTP export | async | JSON requestId/kind/sourceUrl 또는 clipId/segmentTargets → 202 신규,200 재사용 `{job,reused?}` | 본문16,000bytes; D1 clip/job 접수; 400 입력/파싱/throw,403출처,404원본,409충돌·비활성 | 호출 |
| [job action](../../../../apps/web/app/api/jobs/[id]/[action]/route.ts) | POST(req:Request,ctx) | HTTP export | async | cancel/retry → 200 `{job}` | 비활성·출처403; 없음404; action400; DB503. 200이어도 전이 대상 상태가 아니면 변화 없음 | 호출 |
| [internal jobs](../../../../apps/web/app/api/internal/jobs/route.ts) | POST(req:Request) | 내부 HTTP export | async | action별 JSON → workerAction 응답 | Bearer401; 본문2MiB; 만료 소유권409; 입력·예외422. Gateway/Bridge에서 외부 접근 차단 | 호출 |
| [clips](../../../../apps/web/app/api/clips/route.ts) | GET() | HTTP export | async | 200 `{clips,order}` | D1 조회, 실패503 | 호출 |
| clips | POST(req:Request) | HTTP export | async | FormData 필드·video/poster·idempotencyKey → 201신규/200재사용 clip | 영상25MiB/포스터1MiB; D1/R2 쓰기, 실패 시 R2 보상 삭제; 입력400·출처403·충돌409·크기413·저장503 | 호출 |
| [clip](../../../../apps/web/app/api/clips/[id]/route.ts) | PATCH(req:Request,ctx) | HTTP export | async | 필드·태그·구간·revision → `{clip}` | D1 조건 갱신/오래된 구간 정리; 400/403/404/409/503 | 호출 |
| clip | DELETE(req:Request,ctx) | HTTP export | async | id → `{deleted:true}` | D1 및 R2 정리. PC 원본 디스크 삭제 아님; 이미 없음도 성공;403/409/503. DB 삭제 뒤 정리 실패 가능 | 호출 |
| [order](../../../../apps/web/app/api/library/order/route.ts) | PATCH(req:Request) | HTTP export | async | 순서 변경 JSON → `{order}` | 본문1,500,000bytes; D1 조건부 revision;400/403/409최신순서/503 | 보조 |
| [media](../../../../apps/web/app/api/media/[id]/route.ts) | GET(req:Request,ctx); HEAD=GET | HTTP export/별칭 | async | id, poster=1, Range, download=1 → R2 stream 또는 HEAD | 200/206/416/404/503; 로컬 원본은 앞단 Gateway가 가로챔 | 호출 |
| media | POST(req:Request,ctx) | HTTP export | async | FormData video/durationSeconds → 201 `{clip}` | 기존 링크에 R2 원본 첨부;25MiB/2시간; 기존원본·revision409,입력400,403/404/413/503; 실패 업로드 정리 | 보조 |
| [segment list](../../../../apps/web/app/api/segment-media/[id]/route.ts) | GET(req:Request,ctx) | HTTP export | async | id → `{segments}` | localSegments 또는 R2 목록, cleanSegmentMedia 실행;없음404·실패503 | 호출 |
| [segment file](../../../../apps/web/app/api/segment-media/[id]/[segmentId]/route.ts) | GET(req:Request,ctx); HEAD=GET | HTTP export/별칭 | async | v=fingerprint,Range → R2 파일 | 없음404·fingerprint409·range416·실패503. 로컬은 Gateway 우선 | 호출 |
| segment file | POST(req:Request,ctx) | HTTP export | async | 파일/fingerprint/길이/너비/높이 → 201 `{segments}` | pending D1→R2→ready 조건 갱신.25MiB·형식·치수 검사;400/403/404/409/413/503; 실패 보상 삭제 | 보조 |
| [status](../../../../apps/web/app/api/ai/status/route.ts) | GET(req:Request) | HTTP export | async | workspace/AI 상태/localIngestAvailable | DB 및 환경 설정 조회; 모델 호출 아님;503 fallback 상태 | 호출 |
| [connect](../../../../apps/web/app/api/ai/connect/route.ts) | POST(req:Request) | PC HTTP export | async | provider/apiKey → AI 상태 | 모델 접근 확인15초 후 암호화 D1 저장;400/403/413/503. 2048 크기는 Content-Length 검사. DELETE 구현 없음 | 보조 |
| [frames](../../../../apps/web/app/api/ai/frames/route.ts) | POST(req:Request) | HTTP export | async | FrameInput JSON → report/title/memo | 본문20MiB·180초; OpenAI만 호출; 키409·출처403·크기413·분석/취소422. Clip 저장 안 함 | 호출 |
| [analyze](../../../../apps/web/app/api/ai/analyze/route.ts) | POST(req:Request) | HTTP export | async | multipart video 또는 clipId/url, segmentTargets → 분석 결과 | 기존 Gemini 경로; 원본 확보/원격 임시파일 정리;400/403/404/409/413/422 | 보조 |
| [image query](../../../../apps/web/app/api/ai/image-query/route.ts) | POST(req:Request) | HTTP export | async | 검색 이미지 JSON → 검색 해석 결과 | 설정 제공자 OpenAI/Gemini 호출;400/403/409/413/422 | 보조 |
| [effect query](../../../../apps/web/app/api/ai/effect-query/route.ts) | POST(req:Request) | HTTP export | async | query≤300자,본문6000bytes → `{intent,mode}` | 키 없으면 dictionary 성공, 있으면 AI;60초·400/403/422 | 보조 |
| [resolve](../../../../apps/web/app/api/links/resolve/route.ts) | POST(req:Request) | HTTP export | async | `{url}` → `{link}` | 외부 페이지/메타데이터 조회;400/403/422. PC 다운로드 접수 아님 | 보조 |
| [link media](../../../../apps/web/app/api/links/media/route.ts) | GET(req:Request) | HTTP export | async | url → 이미지/영상 bytes | 허용 공개 URL fetch 후8/25MiB 제한;400/422;15분 private cache. PC 원본 저장 안 함 | 보조 |
| [YouTube 추천](../../../../apps/web/app/api/recommendations/youtube/route.ts) | POST(req:Request) | HTTP export | async | format/refresh → DiscoveryResult, cached? | D1 cache/검색 lock/외부 검색;400/403/429/502; finally 자기 lock 해제 | 보조 |
| [추천 feedback](../../../../apps/web/app/api/recommendations/feedback/route.ts) | GET(req:Request) | HTTP export | async | context JSON query → `{feedback}` | D1 조회;400/403 | 보조 |
| feedback | POST(req:Request) | HTTP export | async | intent/clipId/segmentId/signature/value → `{feedback}` | D1 upsert;null→none 저장;400/403/404/409/500 | 보조 |

## route 파일 밖의 HTTP 경계

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [Gateway](../../../../apps/pc/server.mjs) | createGateway의 request callback: GET/POST `/api/pc/settings` | loopback PC만 | async callback | GET 상태/POST folder·도구경로 → `{folder,tools,diagnostics}` | POST16,000bytes; 파일 쓰기·도구 실행. LAN403·메서드405·오류503 | 호출 |
| Gateway | GET/HEAD `/api/media/:id`, `/api/segment-media/:id/:segmentId` | 인증된 Bridge 또는 PC | async callback | 내부 asset 조회 후 serveFile, 로컬 없으면 Worker proxy | 최대4 stream,60초 idle;200/206/416/404/503. local 일반 영상 없음404; 구간 예외는 outer503 가능 | 호출 |
| [Bridge](../../../../apps/android/bridge/server.mjs) | request callback: GET/HEAD `/health`; POST `/pair` | LAN HTTP | async callback | health 응답/폼 연결코드·next → session cookie·redirect | health는 인증 전이지만 Host 검사는 적용. pair 출처403·형식400/415·크기413·인증401·빈도429 | 호출 |
| Bridge | 허용 경로 proxy callback(req,res) | 허용 API+session/연결 인증 | 이벤트/stream | PC Gateway로 요청·응답 중계 | 일반28MiB·210초, 미디어 응답2GiB·idle60초·최대24시간. 미인증401·금지403·메서드405·초과413·동시변경4개 초과503 | 호출 |

## 판단 근거·학습 포인트와 미확인

`HEAD=GET`을 별도 구현으로 세지 않되 HTTP 계약에는 남겼다. `[id]` route에는 GET이 없는데 Bridge는 GET을 허용할 수 있다. 허용 목록은 접근 상한이지 기능 목록이 아니다. 내부 jobs의 Bearer 검증은 웹 로그인과 다른 경계이며 외부 경로를 차단한 Gateway를 우회하여 Worker 포트를 LAN에 노출하면 안 된다.

오류 메시지·상태는 층마다 변환된다. 예를 들어 submit의 throw는 public route에서400, workerAction throw는422가 된다. 본문 제한도 실제 readLimited와 Content-Length 사전 검사만 있는 경우를 혼동하면 안 된다. 이 조사는 응답 분기 대조이며 모든 상태 코드의 실제 네트워크 재현은 하지 않았다. 실패 시 사용자 표시와 기존 제한은 [운영 문서](../../local-video-ingestion-operations.md)를 참고한다.

세부 비동기 주의: media GET과 segment file GET은 `return mediaResponse(...)`를 await 없이 반환한다. 따라서 mediaResponse의 나중 Promise rejection은 해당 try/catch의 unavailable(503) 변환을 거치지 않을 수 있다. 위 503은 handler 내부에서 포착된 오류의 계약이며 모든 저장소 오류가 항상503이라고 보장하지 않는다. 소스 독해로 확인한 예외 전파 특성이며 실제 실패 주입은 미실행이다.
