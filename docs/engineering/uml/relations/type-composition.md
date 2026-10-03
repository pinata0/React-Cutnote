# 일반화로 그리면 안 되는 타입 조합

[관계 조사 안내](README.md) · [실제 상속 그림](inheritance.md) · [기존 타입 초안](../declarations/diagrams.md)

## 무엇을 왜 조사했는가

TypeScript의 `A & B`는 두 타입의 조건을 함께 요구하고 `A | B`는 가능한 형태의 선택을 뜻한다. 어느 쪽도 prototype이나 부모 생성자를 만들지 않는다. 실제 선언과 생성/판별 함수를 대조해 상속 화살표 사용 여부를 판단했다. 아래의 상위/하위 컬럼은 요청한 표 형식을 유지한 것이며 **타입 입력과 조합 결과**를 담는다. 이 표의 어느 행도 런타임 부모/자식을 주장하지 않는다.

## intersection 전체 출현 관계 표

선정 TS/JS125개 AST에서 intersection15곳을 확인했다. 같은 타입 표현이라도 별도 파일·선언·타입 단언이면 따로 남긴다. `추가 필드` 표현의 전체 필드는 해당 링크의 타입 선언에서 확인한다.

| 상위 요소 | 하위 요소 | 코드 표현 | 관계 종류 | abstract 여부 | 관련 메서드 | 근거 | UML 표기 |
|---|---|---|---|---|---|---|---|
| AiStatus, error 필드 | AiConnection의 data | `AiStatus & {error?:string}` | 응답 타입 단언 | 해당 없음 | connect의 응답 처리 | [ai-connection.tsx](../../../../apps/web/features/connections/ai-connection.tsx) L9 | 일반화 없음 |
| AiStatus, error 필드 | LibraryConnection의 data | `AiStatus & {error?:string}` | 응답 타입 단언 | 해당 없음 | 상태 fetch 처리 | [library-connection.tsx](../../../../apps/web/features/connections/library-connection.tsx) L12 | 일반화 없음 |
| T, error 필드 | effect explorer data | `T & {error?:string}` | generic 응답 단언 | 해당 없음 | request | [effect-explorer.tsx](../../../../apps/web/features/discovery/effect-explorer.tsx) L11 | 생략 |
| ImageQuery, preview 필드 | PhotoSearch | `ImageQuery & {preview:string}` | type alias의 교차 타입 | 해당 없음 | ImageSearchDialog 결과 callback | [image-search-dialog.tsx](../../../../apps/web/features/discovery/image-search-dialog.tsx) L8 | type 노트; 상속 없음 |
| ImageQuery, error 필드 | 이미지 응답 data | `ImageQuery & {error?:string}` | 응답 타입 단언 | 해당 없음 | 이미지 쿼리 응답 처리 | [image-search-dialog.tsx](../../../../apps/web/features/discovery/image-search-dialog.tsx) L24 | 생략 |
| SegmentResult, imageMatch 필드 | ImageSegmentResult | `SegmentResult & {imageMatch?:{score:number;labels:string[]}}` | type alias의 교차 타입 | 해당 없음 | rankImageSegments | [image-search.ts](../../../../apps/web/features/discovery/image-search.ts) L36~43 | 타입 의존 가능, 일반화 없음 |
| SegmentResult, 추천 추가 필드 | Recommendation | `SegmentResult & {kind:'exact' 또는 'similar';reason;feedback;signature;weights}` 요약 | type alias의 교차 타입 | 해당 없음 | recommendSegments | [recommendations.ts](../../../../apps/web/features/discovery/recommendations.ts) L46 이후 | 타입 의존 가능, 일반화 없음 |
| DiscoveryResult, error/code | fetchSuggestions data | `DiscoveryResult & {error?:string;code?:string}` | 지역 변수 타입 | 해당 없음 | fetchSuggestions | [youtube-discovery.tsx](../../../../apps/web/features/discovery/youtube-discovery.tsx) L8 선언부 | 생략 |
| DiscoveryResult, error/code | fetchSuggestions JSON 단언 | 동일 intersection | 응답 타입 단언, 위와 별도 출현 | 해당 없음 | fetchSuggestions | [youtube-discovery.tsx](../../../../apps/web/features/discovery/youtube-discovery.tsx) L8 `as` 표현 | 생략 |
| T, error 필드 | mobile-save data | `T & {error?:string}` | generic 응답 단언 | 해당 없음 | request | [mobile-save.tsx](../../../../apps/web/features/library/mobile-save.tsx) L16 | 생략 |
| T, error 필드 | pc-ingest data | `T & {error?:string}` | generic 응답 단언 | 해당 없음 | api | [pc-ingest.tsx](../../../../apps/web/features/library/pc-ingest.tsx) L7 | 생략 |
| Document, modelContext 필드 | document의 국소 단언 | `Document & {modelContext?:{registerTool:...}}` | 기존 객체의 국소 타입 조합 | 해당 없음 | useLibraryWorkspace effect의 registerTool | [use-library-workspace.ts](../../../../apps/web/features/library/use-library-workspace.ts) L50 | Document subclass 없음 |
| ReportBase, engine별 union | AnalysisReport | `ReportBase & (MobileCLIP형식 또는 Gemini형식 또는 OpenAI형식)` 요약 | 교차 타입+판별 union | 해당 없음 | parseAnalysis | [types.ts](../../../../apps/web/lib/analysis/types.ts) L4~5,7 이후 | 공통 필드·대안 노트, 일반화 없음 |
| T, error 필드 | client-request data | `T & {error?:string}` | generic 응답 단언 | 해당 없음 | request | [client-request.ts](../../../../apps/web/lib/client-request.ts) L3 | 생략 |
| ClipSegment의 두 필드, 요청 필드 | PlaybackRange | `Pick<ClipSegment,'startSeconds' 또는 'endSeconds'> & {requestId:number;loop?:boolean}` 요약 | Pick 투영+교차 타입 | 해당 없음 | 재생 요청·SourcePlayer의 범위 처리 | [segments.ts](../../../../apps/web/lib/segments.ts) L6; [source-player.tsx](../../../../apps/web/components/media/source-player.tsx) | 필드 사용 의존, 일반화 없음 |

`또는`은 Markdown 표 안에서 union 구분자를 풀어 쓴 설명이다. 실제 소스 기호는 아래와 같다. 설명용 MobileCLIP형식 등은 원본에 이름 붙은 class/type이 아니라 inline 객체 대안이다.

```typescript
// 실제 선언의 구조 요약 — 완전한 필드 선언은 원본을 따른다.
type PlaybackRange = Pick<ClipSegment, 'startSeconds' | 'endSeconds'>
  & { requestId: number; loop?: boolean };
// AnalysisReport: ReportBase & ( {engine:'mobileclip-s0-v1'; ...}
//                           | {engine:'gemini-video-v1'; ...}
//                           | {engine:'openai-frames-v1'; ...} )
```

## 판별 union과 선언 확장 관계 표

| 상위 요소 | 하위 요소 | 코드 표현 | 관계 종류 | abstract 여부 | 관련 메서드 | 근거 | UML 표기 |
|---|---|---|---|---|---|---|---|
| 공통 ReportBase | AnalysisReport의 3대안 | `ReportBase & (...)`, 각 대안에 서로 다른 engine literal | **판별 union**+intersection | 해당 없음 | parseAnalysis의 engine 분기, generateFrames의 OpenAI report 생성 | [analysis/types.ts](../../../../apps/web/lib/analysis/types.ts) L5,12~14; [openai.ts](../../../../apps/web/lib/ai/openai.ts) parseFramesResult | 클래스 일반화 금지 |
| 성공/실패 객체 대안 | ConnectorResult | success 상태와 ConnectorFailureStatus 상태의 union | **판별 union**, 상태 집합이 분리됨 | 해당 없음 | createConnectors.invoke | [connector-contract.mts](../../../../apps/web/lib/connector-contract.mts) L9~21,30~42, invoke | type 노트로 선택 구조 표시 |
| 성공/실패 객체 대안 | ConnectorContext | success+connectors 또는 오류 status | **판별 union** | 해당 없음 | createConnectors.getContext의 status 검사/switch | [connector-contract.mts](../../../../apps/web/lib/connector-contract.mts) L55~77 및 getContext | type 노트, 상속 없음 |
| Cloudflare.Env의 두 선언 | 병합된 Cloudflare.Env | 같은 namespace 안 `interface Env` 재선언 | interface **declaration merging**, extends 아님 | interface 타입, 런타임 abstract class 아님 | env.DB/BUCKET, 개발용 CONNECTORS binding | [cloudflare-env.d.ts](../../../../apps/web/cloudflare-env.d.ts) L2; [connector-preview.d.ts](../../../../apps/web/lib/connector-preview.d.ts) L9 | Env 한 타입에 필드 합침 |
| 전역 Window | YT/onYouTubeIframeAPIReady가 보강된 Window | `declare global { interface Window {...} }` | 전역 interface augmentation/병합 | interface 타입 | SourcePlayer의 YouTube iframe 연결 | [source-player.tsx](../../../../apps/web/components/media/source-player.tsx) L10 | Window subclass 금지 |
| ConnectorBinding의 함수 구조 | 주입 binding/구조가 맞는 객체 | `type ConnectorBinding={invoke(...);getContext?()}` | **구조적 타입 계약**, 명시 implements 없음 | type alias | createConnectors, ConnectorPreview의 binding 위임 | [connector-contract.mts](../../../../apps/web/lib/connector-contract.mts) L45~52; [preview worker](../../../../apps/web/build/connector-preview-worker.mjs) | 상속/명시 realization 선 없음 |

## 다이어그램 읽기에 적용할 판단

이 문서의 조합은 classDiagram의 `<|--`나 `<|..`로 그리지 않았다. 도메인 타입의 필드를 보고 싶으면 [2단계 classDiagram](../declarations/diagrams.md)을 읽고, 실행 분기는 [계약·호출 목록](../contracts/calls.md)에서 따른다. 그림보다 위 표가 정확한 교차·선택·병합 연산을 보존한다.

AnalysisReport는 모든 형태가 analyzedAt/notes 등의 공통 필드를 가지면서 engine에 따라 추가 필드가 달라진다. parseAnalysis는 외부 unknown의 engine과 필드를 실제로 검사한다. `ReportBase` 부모 생성자나 `new OpenAIReport()`는 없다. 이 타입이 MobileCLIP 기록을 수용한다는 사실과 현재 PC 다운로드가 OpenAI를 호출한다는 사실도 구분한다.

ConnectorResult는 status가 success일 때 result가 필수이고, 실패 대안에서는 message가 필수다. 이것이 판별 union의 의미다. 상태 문자열을 읽고 접근할 수 있는 필드가 달라진다. connector는 보조/개발 경계이며 새 PC 수집이 이를 사용한다고 해석하지 않는다.

## 판별 union이 아닌 예와 학습 포인트

- [WorkspaceContext](../../../../apps/web/lib/workspace-context.ts)의 `kind:'pc'|'online'`과 `keyManagement:'pc'|'here'`는 한 객체 안의 독립 필드 union이다. 서로 다른 객체 대안의 필드 조합을 타입이 제한하는 판별 union은 아니다.
- [Recommendation](../../../../apps/web/features/discovery/recommendations.ts)의 kind exact/similar 역시 동일한 객체 필드 구조다. 런타임 정렬 분기에 사용되지만 두 하위 클래스를 뜻하지 않는다.
- [videoProvider](../../../../apps/web/lib/links/provider.ts)는 `{kind:'youtube'|'instagram';id;url;embed} | null`이다. nullable 결과이며 두 플랫폼별 별도 객체 타입의 union은 아니다.
- [PcJob](../../../../apps/web/lib/jobs/types.ts)의 state/kind/phase는 **string**이다. jobMessages와 DB 조건문에 알려진 상태가 있어도 선언된 판별 union이라고 바꿔 적지 않는다. 작업 상태 전이는 [상태 조사](../jobs.md)에서 설명한다.
- `Json`의 재귀 union, `Blob|string`, `Clip|null`, React state의 문자열 선택지는 값의 가능성을 나타낸다. `null`을 부모/자식 노드로 넣지 않는다.
- `as T & {error?:string}`는 런타임 검증·필드 추가·객체 복제를 수행하지 않는다. HTTP status 검사와 별도로 JSON 값의 실제 검증 책임을 확인해야 한다. `Pick`도 객체를 자동으로 복사하지 않는다.
- `ImageSegmentResult`/`Recommendation` 생성부의 `{...item,...}`은 실제 새 객체를 만드는 **spread**이고, `&`는 컴파일 단계의 타입 조합이다. 같은 위치에서 사용되어도 서로 다른 동작이다.
- declaration merging은 같은 interface에 필드를 보강한다. 다른 이름의 자식 interface를 만드는 `interface B extends A`와 다르다. 이번 선정 범위에는 후자의 선언이 없다.

미확인: 외부 라이브러리의 타입 선언 전체와 구조적 할당의 모든 사용처를 TypeScript checker로 재검증하지 않았다. 이번 수집은 구문 AST 및 주요 생성/판별 실행문 대조다. 새 실행 테스트·API 모델 검증은 수행하지 않았고 기존 보조 코드의 활성 호출 미확인 상태도 유지한다.
