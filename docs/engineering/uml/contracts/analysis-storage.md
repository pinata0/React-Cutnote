# 분석·저장·화면 경계 계약

[3단계 안내](README.md) · [호출 목록](calls.md)

## 무엇을 왜 조사했는가

프레임 분석 결과가 언제 Clip에 저장되는지, 브라우저 Promise와 PC 작업 접수가 같은 계약인지 확인했다. 표의 파일·심볼이 근거다. UI JSX·스타일은 제외하고 요청·공유·동기화에 영향을 주는 함수만 상세화했다. 타입·순수 태그 변환의 전체 선언은 [분석](../declarations/analysis.md)·[도메인](../declarations/domain.md) 표에 남아 있다.

## 분석과 저장 계약

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [openai](../../../../apps/web/lib/ai/openai.ts) | parseFrameInput(value:unknown):FrameInput | export | 동기 | 외부 JSON → 검증한 프레임·길이·대상 | 개수·시각·이미지·기간 오류 throw; 네트워크 없음 | 보조 |
| openai | framesRequest(input:FrameInput) | export | 동기 | → Responses API 요청 객체 | store:false·이미지/시각/사전/JSON schema 구성; 전송 자체는 안 함 | 보조 |
| openai | parseFramesResult(data:unknown,input:FrameInput) | export | 동기 | → report/title/memo | JSON·제안·표본 근거 시각 검증; 잘못된 AI 출력 throw | 보조 |
| openai | generateFrames(key:string,input:FrameInput,signal:AbortSignal) | export | async | → report/title/memo | OpenAI Responses POST; 401/403권한·429한도·기타 오류 메시지 변환, abort reject. DB 저장 없음 | 호출 |
| [AI settings](../../../../apps/web/lib/ai/settings.ts) | aiStatus() | export | async | → configured/provider/model/providers 등 | D1/환경 연결 상태; 실제 모델 성공 보장 아님 | 호출 |
| AI settings | apiKey(provider:Provider) | export | async | → string 또는 null | 저장된 행은 복호화; 행이 없을 때만 환경 fallback; 복호화 실패 reject. 반환값 로그 금지 | 호출 |
| AI settings | saveKey(provider:Provider,key:string) | export | async | → void | 암호화 후 D1 upsert; master 설정/저장 실패 reject | 보조 |
| [crypto](../../../../apps/web/lib/ai/crypto.ts) | sealKey(value:string,<code>secret</code>:string); openKey(value:string,<code>secret</code>:string) | export | async | → 암호문JSON / 평문 string | AES-GCM, 난수 IV·암호화/복호화; 키 형식·버전·인증 오류 reject | 보조 |
| [whole-video](../../../../apps/web/lib/analysis/whole-video.ts) | sampleTimes(duration:number); targetSampleTimes(duration:number,targets:SegmentTarget[]) | export | 동기 | → number[] | 길이/대상 검증 throw. PC media의 동명 함수와 별개 | 보조 |
| whole-video | extractWholeVideo(source:Blob 또는 string,signal,onProgress,targets?) | export | async | → FrameInput 형태 | 브라우저 video/canvas 로드·seek·이미지 추출/자원정리; 접근/디코드/취소 오류 reject | 호출 |
| whole-video | analyzeWholeVideo(source,signal,onProgress,segmentTargets?):Promise<{report,title,memo}> | export | async | 원본 → 분석 응답 | 추출 후 POST /api/ai/frames; 응답오류 throw. 결과 Clip 저장은 호출자 책임 | 호출 |
| [retag-segments](../../../../apps/web/lib/analysis/retag-segments.ts) | retagSegments(clip:Clip,selected:ClipSegment[],signal,onProgress):Promise<Clip> | export | async | 로컬은 기존 clip 반환; 비로컬은 저장된 clip | localVideo면 retag job 접수만. 비로컬은 provider 분기→분석→사용자 태그 병합→revision PATCH. 구간 결과 누락 시 저장 안 함 | 호출 |
| [server](../../../../apps/web/lib/server.ts) | database(); bucket() | export | 동기 | → D1Database / R2Bucket binding | 환경 미설정 throw. 로컬 디스크 API 아님 | 보조 |
| server | serialize(row:ClipRow):Clip | export | 동기 | DB 문자열/필드 → Clip | JSON parse 오류 가능; localVideo·media URL 생성, 실제 파일 존재 검사는 안 함 | 호출 |
| server | findClip(id:string) | export | async | → ClipRow 또는 null | D1 SELECT, 저장소 오류 reject | 호출 |
| server | json(data:unknown,status=200); crossOrigin(req:Request); unavailable(error:unknown) | export | 동기 | → Response / boolean /503 Response | json no-store; crossOrigin은 Origin이 있을 때 비교; unavailable은 서버 오류 로그 | 보조 |
| [segment-media](../../../../apps/web/lib/segment-media.ts) | sourceIdentity(row:ClipRow); mediaUrl(clipId,segmentId,fingerprint) | export | 동기 | → 원본 식별값 / URL | local_asset→video_key→source_url 순; 단순 값 생성 | 보조 |
| segment-media | segmentFingerprint(row:ClipRow,segment:ClipSegment) | export | async | → SHA-256 문자열 | 원본/구간 ID/시작·끝/포맷 버전 digest; 저장 없음 | 호출 |
| segment-media | segmentMediaList(row:ClipRow) | export | async | → segmentId/fingerprint/file[] | ready D1 조회 및 현재 구간 매칭; R2 실제 존재까지 확인 안 함 | 호출 |
| segment-media | cleanSegmentMedia(clipId:string) | export | async | → void | 무효·중복 레코드 deleting 표시→R2→D1 삭제. 항목 삭제 실패는 경고·행 유지 후 다음 호출 재시도; 앞선 SQL 실패는 reject | 호출 |
| [media-response](../../../../apps/web/lib/media-response.ts) | attachmentName(title:string,mime:string) | export | 동기 | → Content-Disposition 문자열 | 이름 정리·확장자 결정; 파일 쓰기 없음 | 생략 |
| media-response | mediaResponse(req:Request,key:string,title:string) | export | async | → Response | R2 head/get·단일Range200/206/416,HEAD 본문없음,없음404; 저장소 reject. PC serveFile의 If-Range/ETag 구현과 같다고 가정하지 않음 | 호출 |

## 공유·상태 처리 경계

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [mobile-share](../../../../apps/web/lib/mobile-share.ts) | sharedUrl(text:string); shareLaunch(search:string) | export | 동기 | → URL/빈문자열, `{url,id}`/null | start=analyze·미saved·UUID 검사. 최종 플랫폼 canonical 검증은 submit 책임 | 호출 |
| [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx) | PcIngest({location}:{location?:string}) | export React 함수 | 동기 render+effect | props → JSX | effect가 3초 job 조회/공유 자동 접수 시작. 컴포넌트 자체는 async 작업 서비스 아님 | 보조 |
| PcIngest 모듈 | api<T>(url:string,body?:unknown):Promise<T> | 내부 | async | body없으면 GET,있으면POST → JSON | non-ok는 Error; 호출자가 UI 표시 | 보조 |
| PcIngest | submit(source:string,id?:string) | 내부 | async | → void | requestId 유지·중복실행 ref; 접수 후 history saved/accepted/job 기록, refresh, cutnote:sync. 실패 표시 후 같은ID 재전송 | 호출 |
| PcIngest | refresh(); action(job:PcJob,name:string); configure(event?:FormEvent) | 내부 | async | → void | 상태조회 / cancel·retry POST / PC설정 GET·POST; 오류는 state에 저장. 작업완료까지 대기 안 함 | 호출 |
| PcIngest effect | update callback 및 cleanup | 내부 hook | async callback/동기 cleanup | jobs/available state | unmount는 timer 제거·응답반영 차단. PC cancel 요청은 보내지 않음 | 호출 |

## 설계 판단·읽는 방법·미확인

HTTP 분석 응답과 보관함 저장은 별도 메시지로 그려야 한다. 새 PC 링크 경로는 Node의 FFmpeg 표본 → frames API → OpenAI → 작업 complete가 D1에 저장한다. 기존 브라우저 업로드·비로컬 retag는 여전히 Gemini 분기를 갖는다. Google API 미사용을 앱 전체 외부 API 미사용으로 확대할 수 없다.

태그 병합의 전체 순수 함수는 [선언 목록](../declarations/domain.md), UI 나머지 요청 흐름은 [기존 기능 그림](../media-and-features.md)을 참고한다. 여기의 상세 계약 선정은 모든 React event handler의 전수 API 명세가 아니다. 실제 모델 품질·브라우저 codec·Android history callback 순서는 이번에 실행 검증하지 않았다.
