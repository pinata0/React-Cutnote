# 컷노트 lint 수정으로 배우는 TypeScript와 React

[통합 문서 목록](../README.md) · 문서 통합: 2026-10-02


이 문서는 2026-10-02에 `apps/web`의 기존 lint 문제를 수정한 사례를 설명합니다. 오류 메시지를 없애는 방법보다, 각 규칙이 보호하려는 동작과 수정 후 확인할 것을 중심으로 읽으면 좋습니다.

이전 기록은 **오류 70개·경고 34개**, 수정 후 검증 결과는 **오류 0개·경고 0개**입니다. 타입 검사, 오프라인 웹 회귀 테스트 11개 스위트, 운영 빌드도 통과했습니다. 이 결과가 전체 브라우저 상호작용이나 실기기 동작까지 검증했다는 뜻은 아닙니다.

아래 전후 코드는 실제 변경의 핵심을 읽기 좋게 축약한 예시입니다. 그대로 붙여 넣는 완성 코드가 아니며, 오류 처리·타입·취소 로직의 전체 구현은 연결된 소스를 확인하세요. 실제 인증정보는 포함하지 않았습니다.

## 1. 먼저 구분하기: lint, 타입 검사, 테스트, 빌드

| 도구 | 이번 작업에서 확인한 것 | 이것만으로 확인할 수 없는 것 |
|---|---|---|
| ESLint | 명시적 `any`, Hook 사용, ref 접근, 사용하지 않는 값 등 | 서버 응답의 실제 형태, 사용자 흐름 전체 |
| TypeScript | 함수 인자·반환값·필드 사용의 정적 타입 | JSON이 선언된 타입대로 도착하는지 |
| 회귀 테스트 | 검색·태그·피드백·동기화 등 기존 계약 | 테스트하지 않은 화면·기기·외부 서비스 |
| 운영 빌드 | 실제 배포용 번들을 만들 수 있는지 | 배포 환경에서 모든 기능이 정상인지 |

따라서 “lint가 통과했으니 동작도 같다”라고 결론 내리면 안 됩니다. 이번에도 lint 수정 후 타입 검사와 회귀 테스트에서 추가 문제가 드러나 이를 수정했습니다.

이번 작업에서는 ESLint 규칙을 추가로 끄거나 일괄 무시하지 않았습니다. 다만 [기존 ESLint 설정](../../apps/web/eslint.config.mjs)에는 외부에서 가져온 UI 컴포넌트에 대한 제한적 예외가 이미 있습니다. **기존 예외가 없었다는 뜻과 이번에 예외를 추가하지 않았다는 뜻은 다릅니다.**

## 2. `no-explicit-any`: 외부 JSON은 타입을 확인한 뒤 사용하기

### 문제

```ts
// 수정 전의 핵심 형태
function parseResponse(data: any) {
  return data.output.map((item: any) => item.text);
}
```

`any`는 잘못된 필드 접근까지 허용합니다. `output`이 배열이 아니거나 응답이 `null`이어도 컴파일러가 막아주지 못합니다. `response.json()`이 성공했다는 사실도 응답의 구조가 올바르다는 뜻은 아닙니다.

### 수정

[lib/json.ts](../../apps/web/lib/json.ts)에 `unknown`을 좁히는 함수를 추가했습니다.

```ts
export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
```

이 함수는 “객체 또는 배열인가?”만 확인합니다. 객체의 각 필드가 원하는 타입인지까지 보장하지 않으므로, 사용하는 위치에서 다시 좁혀야 합니다.

```ts
const data = object(input);

if (data.status !== 'completed' || !Array.isArray(data.output)) {
  throw new Error('응답을 끝까지 받지 못했어요.');
}

const texts = data.output
  .map(object)
  .filter(item => item.type === 'message')
  .flatMap(item => array(item.content))
  .map(object)
  .filter(part => part.type === 'output_text' && typeof part.text === 'string')
  .map(part => part.text);
```

공통 `responseText()`는 제공자별 완료 상태와 텍스트 블록을 확인합니다. 그 결과로 나온 문자열은 각 기능의 파서가 다시 검사합니다. **응답 봉투의 검증과 분석 내용의 검증을 나눈 것**입니다.

관련 코드:

- [AI 효과 검색](../../apps/web/lib/ai/effect-query.ts)
- [AI 사진 검색](../../apps/web/lib/ai/image-query.ts)
- [영상 분석 결과 파서](../../apps/web/lib/ai/result.ts)
- [YouTube 공개 검색 파서](../../apps/web/lib/ai/youtube-public-search.ts)

### 타입 단언과 검증을 혼동하지 않기

```ts
const data = await response.json() as SomeResponse;
```

이 코드는 TypeScript에게 타입을 알려줄 뿐, 런타임 검사를 실행하지 않습니다. 이번 수정의 일부 내부 API 호출에도 구체적인 응답 타입 단언이 남아 있습니다. 모든 API 경계에 완전한 스키마 검증을 추가한 작업은 아닙니다.

`unknown`으로 바꾼 뒤 곧바로 넓은 타입으로 강제 단언하거나, `any`를 다른 이름으로 감싸면 원래 문제를 해결하지 못합니다.

## 3. `rules-of-hooks`: 일반 동작 함수에 `use` 이름을 붙이지 않기

[effect-explorer.tsx](../../apps/web/features/discovery/effect-explorer.tsx)의 `useIntent()`는 내부에서 Hook을 호출하는 사용자 정의 Hook이 아니라, 기존 상태를 변경하는 이벤트 함수였습니다.

```tsx
// 수정 전
function useIntent(next: EffectIntent) {
  cancel();
  setIntent(parseIntent(next));
}

<button onClick={() => useIntent(nextIntent)}>선택</button>

// 수정 후
function applyIntent(next: EffectIntent) {
  cancel();
  setIntent(parseIntent(next));
}

<button onClick={() => applyIntent(nextIntent)}>선택</button>
```

React 규칙은 `use` 다음에 대문자가 오는 함수 이름을 Hook으로 취급합니다. 그래서 이벤트 콜백이나 일반 함수 안에서 `useIntent()`를 호출하면 Hook 호출 규칙 위반으로 판단했습니다.

이 경우 이름을 바꾸는 것은 실제 역할을 정확히 표현하는 수정입니다. 반대로 **실제로 Hook을 호출하는 함수라면 이름만 바꾸면 안 됩니다.** Hook은 컴포넌트나 사용자 정의 Hook의 최상위에서 호출해야 합니다.

## 4. `refs`: 렌더링 중 ref를 최신 값으로 덮어쓰지 않기

ref는 변경해도 렌더링을 일으키지 않는 저장소입니다. 화면에 보여줄 상태와 구분해야 합니다.

```tsx
// 수정 전
const currentRef = useRef({ clips, loading, loadError });
currentRef.current = { clips, loading, loadError };

// 수정 후
const currentRef = useRef({ clips, loading, loadError });
useLayoutEffect(() => {
  currentRef.current = { clips, loading, loadError };
}, [clips, loading, loadError]);
```

렌더링은 다시 실행되거나 완료되지 않을 수 있습니다. 렌더링 중 공유된 ref를 바꾸면 외부 콜백이 아직 화면에 반영되지 않은 값을 읽을 여지가 생깁니다. 이번에는 화면 반영 후 ref를 갱신하도록 옮겼습니다.

관련 코드:

- [use-library-workspace.ts](../../apps/web/features/library/use-library-workspace.ts): 외부 도구가 읽는 라이브러리 상태
- [sortable-cards.tsx](../../apps/web/features/library/sortable-cards.tsx): 드래그 이벤트가 사용하는 최신 목록·콜백
- [effect-explorer.tsx](../../apps/web/features/discovery/effect-explorer.tsx): 비동기 피드백이 여전히 같은 검색 조건인지 확인

`useLayoutEffect`를 모든 곳에 적용하는 것이 정답은 아닙니다. 브라우저의 화면 그리기 전에 실행되므로 긴 작업을 넣지 않아야 합니다. 그 시점의 동기화가 필요 없다면 일반 `useEffect`가 적절할 수 있습니다. 화면 출력에 필요한 값은 여전히 state나 props로 관리해야 합니다.

또한 추천 카드의 피드백 표시를 `RecommendationFeedback` 컴포넌트로 분리해, 화면을 만드는 코드와 ref를 사용하는 투표 이벤트 콜백의 경계를 명확히 했습니다.

## 5. `set-state-in-effect`: 상태가 바뀌는 원인을 찾아서 배치하기

이 규칙을 “Effect 안에서는 절대 상태를 바꾸면 안 된다”로 외우면 잘못된 수정으로 이어집니다. 네트워크 응답이나 외부 이벤트 콜백에서 상태를 반영하는 것은 필요합니다. 이번에는 상태 변경의 원인을 나눴습니다.

### A. 사용자의 입력으로 바뀌면 이벤트에서 처리하기

파일 선택 후 미리보기 상태를 별도 Effect로 다시 계산하던 부분을 선택 이벤트로 옮겼습니다.

```tsx
// 수정 전의 핵심 형태
useEffect(() => {
  if (!file) {
    setPreview('');
    setPoster(null);
    return;
  }
  const url = URL.createObjectURL(file);
  setPreview(url);
  setPoster(null);
  return () => URL.revokeObjectURL(url);
}, [file]);

// 수정 후
function setFile(next: File | null) {
  storeFile(next);
  setPreview(next ? URL.createObjectURL(next) : '');
  setPoster(null);
}

useEffect(() => () => {
  if (preview) URL.revokeObjectURL(preview);
}, [preview]);
```

미리보기 생성은 입력 이벤트에, 브라우저 자원의 해제는 생명주기 정리에 남겼습니다. 상태 갱신 위치만 바꾸고 `revokeObjectURL()`을 빼먹으면 메모리 사용이 늘어날 수 있습니다.

### B. 대상이 바뀌면 컴포넌트 상태의 수명도 바꾸기

```tsx
export function SourcePlayer(props: Parameters<typeof SourcePlayerSession>[0]) {
  return <SourcePlayerSession key={props.url} {...props} />;
}
```

재생 대상 URL이 달라지면 이전 재생 세션을 해제하고 새 세션을 만듭니다. 이전 오류·로딩 상태를 여러 `setState()`로 초기화하는 대신, 상태가 어느 대상에 속하는지를 `key`로 표현한 것입니다.

같은 원리를 적용한 곳은 다음과 같습니다.

| 대상 | 상태를 초기화하는 기준 |
|---|---|
| 원본 영상 플레이어 | 원본 URL |
| 파일 영상 플레이어 | 미디어 `src` |
| 외부에서 요청한 유사 효과 탐색 | seed의 요청 ID |
| YouTube 추천 검색 | 취향 식별자와 검색 형식 |
| 사진 검색 대화상자 | 닫으면 세션 해제, 다시 열면 새 세션 |

`key` 변경은 해당 하위 트리의 **모든 로컬 상태와 Effect를 다시 시작**합니다. 입력 중인 내용, 포커스, 스크롤 등을 유지해야 하는 화면에는 무조건 적용하면 안 됩니다. 매 렌더링마다 무작위 key를 만드는 것도 피해야 합니다.

### C. 초기 로딩과 사용자가 누른 새로고침을 분리하기

[use-library-sync.ts](../../apps/web/features/library/use-library-sync.ts)에서는 실제 데이터 요청과 수동 새로고침의 UI 상태 변경을 나눴습니다.

```tsx
// 구조를 설명하기 위한 축약 예시
const loadClips = useCallback(() => {
  return request('/api/clips')
    .then(data => setClips(data.clips))
    .catch(error => setLoadError(error.message))
    .finally(() => setLoading(false));
}, []);

const refresh = useCallback(() => {
  setSyncing(true);
  setSyncError('');
  return loadClips();
}, [loadClips]);

useEffect(() => {
  void loadClips();
}, [loadClips]);
```

첫 로딩 표시는 초기 state로 표현하고, 수동 갱신 표시는 사용자나 외부 이벤트가 `refresh()`를 호출할 때 설정합니다. 응답에 따른 변경은 Promise 콜백에서 처리합니다.

실제 구현에는 이 예시에서 생략한 요청 버전, `AbortController`, 시간초과, 자동 폴링 중복 방지, 정렬 저장과의 충돌 방지가 있습니다. 이 로직이 동작 보존의 핵심입니다.

**`async/await` 자체가 잘못된 것은 아닙니다.** `.then()`으로 바꾼다는 이유만으로 설계가 좋아지는 것도 아닙니다. 이번 수정의 핵심은 초기 상태·이벤트 상태·응답 상태의 책임을 나누고, Effect의 동기 실행과 응답 콜백을 명확히 한 데 있습니다.

### D. 브라우저에서만 알 수 있는 값은 서버 초기 화면과 구분하기

[library-connection.tsx](../../apps/web/features/connections/library-connection.tsx)와 [mobile/save.tsx](../../apps/web/features/library/mobile-save.tsx)에서는 `useSyncExternalStore`의 서버 snapshot과 브라우저 snapshot을 구분했습니다. 서버에서는 빈 문자열을 반환하고 브라우저에서 host 또는 location을 읽습니다.

이 구현의 구독 함수는 아무 이벤트도 등록하지 않습니다. 따라서 **일반적인 URL 변경 감지기로 만든 것은 아닙니다.** 클라이언트 초기화 경계를 표현한 사례이며, 뒤로 가기나 임의의 주소 변경까지 반응해야 한다면 그에 맞는 구독 또는 라우터 API가 필요합니다.

## 6. 의존성 배열: 사용한 값과 실행 시점을 함께 검토하기

`exhaustive-deps`와 `preserve-manual-memoization`을 만났을 때 의존성을 지워 경고만 없애면 오래된 값을 캡처하는 문제가 생길 수 있습니다.

이번 수정에서는 다음을 함께 처리했습니다.

- Effect나 메모 함수가 실제로 읽는 값을 의존성에 반영했습니다.
- `Boolean(onReorder)`, `keys.join('|')`처럼 배열 안에 있던 표현식은 의미 있는 변수로 분리했습니다.
- 플레이어의 선택 구간처럼 동작에 필요한 props가 바뀔 때 정리·재실행되도록 했습니다.
- 표시 결과 계산에 더 이상 사용하지 않는 의존성은 제거했습니다.

```tsx
const sortable = !!onReorder;
const keyIdentity = keys.join('|');

useEffect(() => {
  // 드래그 이벤트 등록 및 정리
}, [sortable, keyIdentity]);
```

변수로 분리하는 것만으로 모든 문제가 해결되는 것은 아닙니다. 문자열로 합친 식별자는 항목 값에 구분자가 포함될 때 충돌할 수 있고, 객체 전체를 의존성에 넣으면 참조가 자주 바뀌어 재실행이 늘 수 있습니다. 데이터의 식별 규칙과 부모가 만드는 값의 안정성도 함께 봐야 합니다.

## 7. 비동기 처리: lint 통과 후에도 오래된 응답을 막기

검색 조건 A의 요청이 끝나기 전에 B로 바뀌는 상황을 생각해 보세요. 나중에 도착한 A의 결과를 그대로 표시하면 사용자는 B의 결과라고 오해할 수 있습니다.

이번 피드백 상태는 데이터가 속한 검색 조건을 함께 저장하도록 바꿨습니다.

```ts
type FeedbackState = {
  context: string;
  records: FeedbackRecord[];
};

const applicableFeedback =
  feedback.context === context ? feedback.records : [];
```

여기에 요청 버전과 취소 상태를 함께 확인합니다. `AbortController`는 요청을 취소하는 수단이고, 조건·버전 비교는 결과를 지금 반영해도 되는지 결정하는 수단입니다. 역할이 다르므로 하나를 쓴다는 이유로 다른 하나를 무조건 제거하면 안 됩니다.

읽어 볼 코드: [effect-explorer.tsx](../../apps/web/features/discovery/effect-explorer.tsx), [youtube-discovery.tsx](../../apps/web/features/discovery/youtube-discovery.tsx).

## 8. Next.js 규칙: 내부 이동과 이미지 표시

내부 페이지 이동은 일반 `<a>` 또는 `window.location.assign()`에서 `Link`로 변경했습니다. 외부 원본 영상 링크까지 내부 라우팅으로 바꾼 것은 아닙니다.

```tsx
import Link from 'next/link';

<Link href="/">내 라이브러리</Link>
```

이미지는 `next/image`를 사용하되, 기존 blob URL·미디어 프록시·외부 썸네일 주소를 유지하기 위해 `unoptimized`를 사용했습니다.

```tsx
import NextImage from 'next/image';

<NextImage
  unoptimized
  width={640}
  height={360}
  src={thumbnailUrl}
  alt="영상 썸네일"
/>
```

이 변경이 자동으로 이미지 최적화 성능 개선을 보장하지는 않습니다. `unoptimized`이므로 최적화 서버를 통한 변환을 요청하지 않습니다. 크기 속성·기존 CSS·실제 이미지 비율의 조합은 화면에서 추가로 확인해야 합니다. 이번 작업에서 전체 브라우저 시각 회귀 검증까지 수행하지는 않았습니다.

## 9. 작은 경고도 의미를 확인한 뒤 수정하기

| 규칙 | 실제 수정 | 공부할 때 주의할 점 |
|---|---|---|
| `no-unused-vars` | 사용하지 않는 import·변수·인자 제거 | 함수 인자를 제거하면 호출부도 확인 |
| `no-unused-expressions` | 부수 효과만 있는 삼항식을 `if/else`로 변경 | 반환값이 필요한 표현식과 구분 |
| `import/no-anonymous-default-export` | taxonomy 객체에 이름을 붙여 export | 생성 파일만 고치지 말고 생성기도 수정 |

```ts
// 수정 전
error ? reject(error) : resolve();

// 수정 후
if (error) reject(error);
else resolve();
```

이 코드는 조건에 따라 Promise를 완료시키는 것이 목적이므로 문장으로 쓰면 의도가 더 명확합니다. 반대로 값을 반환하는 `return condition ? a : b`까지 모두 바꿀 필요는 없습니다.

taxonomy는 [생성기](../../apps/web/scripts/generate-taxonomy.mjs)를 수정하고 `npm run taxonomy:generate`로 `lib/taxonomy-data.ts`를 재생성했습니다. 이 파일은 Git 제외 생성물이므로 깨끗한 체크아웃에는 없습니다. 생성 파일만 직접 수정하면 다음 생성 때 사라지거나 `--check`에서 불일치가 납니다.

## 10. 테스트가 실패하면 제품 오류인지 테스트 연결 오류인지 구분하기

[sync-polling.test.mjs](../../tests/web/sync-polling.test.mjs)는 실제 앱 파일에서 갱신 함수를 추출해 가짜 시간·요청 환경에서 실행합니다. 이번에 함수가 `loadClips`와 `refresh`로 분리되면서 기존 추출 범위가 맞지 않아 테스트가 실패했습니다.

검증을 삭제하거나 기대 결과를 느슨하게 만들지 않고, 두 실제 함수를 추출해 연결하도록 바꿨습니다. 유지한 검증은 다음과 같습니다.

1. 6초 걸리는 요청을 5초 자동 폴링이 중간에 취소하지 않는다.
2. 멈춘 요청은 시간초과 처리하고 기존 목록을 유지하며 재시도를 허용한다.
3. 수동 동기화는 진행 중인 요청을 대체하되 오래된 오류를 반영하지 않는다.
4. 변경 작업으로 무효화된 오래된 GET 결과를 버린다.
5. 백그라운드 조회 실패 시 기존 클립을 유지하고 오류를 표시한다.

소스 문자열 추출 방식은 함수 이름·배치 변화에 민감하다는 한계도 있습니다. 테스트가 실패했다는 사실만으로 앱이 깨졌다고 단정할 수도, “리팩터링이라 괜찮다”며 실패를 무시할 수도 없습니다.

## 11. 직접 따라 해 볼 순서

공개 소스 폴더인 `apps/web`에서 실행합니다. 아래 명령은 인증정보 입력이나 실제 인덱스 변경을 요구하지 않습니다.

```sh
npm run lint
npm exec -- tsc --noEmit --incremental false
npm test
npm run build
```

코드를 직접 바꿀 때는 작은 단위로 확인하세요.

1. `lib/json.ts`를 읽고 `null`, 배열, 잘못된 완료 상태에 어떤 결과가 나오는지 예상합니다.
2. `useIntent`와 `applyIntent`의 차이를 보고, 이름 변경만 적절한 경우를 설명해 봅니다.
3. 파일 선택 → 미리보기 생성 → 파일 교체 → URL 정리 순서를 따라갑니다.
4. 플레이어의 `key`가 바뀔 때 사라지는 state와 실행되는 cleanup을 적어 봅니다.
5. 검색 A보다 B가 먼저 완료되는 경우, 어느 조건이 오래된 A의 반영을 막는지 찾습니다.
6. 변경한 기능에 맞는 기존 회귀 테스트를 확인한 뒤 lint·타입 검사·테스트·빌드를 수행합니다.

실행에 실패하면 환경 제한과 코드 오류를 구분하세요. 이번 작업에서는 Windows 샌드박스의 상위 디렉터리 읽기 제한으로 esbuild가 처음 실행되지 않았고, 허용된 실행 환경에서 다시 확인했습니다. 이 실패를 해결하기 위해 ESLint 규칙이나 테스트를 비활성화하지 않았습니다.

## 12. 이번 사례에서 가져갈 판단 기준

- 외부 입력의 타입을 모르면 먼저 `unknown`으로 받고 사용 전에 좁힙니다.
- 상태 갱신을 옮기기 전에 무엇이 그 상태를 바꾸는지 찾습니다.
- ref는 화면 상태의 대체재가 아니며 렌더링 중 임의로 갱신하지 않습니다.
- key로 초기화하면 입력·포커스·진행 중 요청까지 영향을 받는지 확인합니다.
- 의존성을 수정할 때 재실행 빈도와 오래된 값의 캡처를 함께 봅니다.
- lint 통과와 앱 동작 보존은 별개이므로 회귀 테스트로 계약을 확인합니다.

현재 보안·검증 안내는 [보안](security.md)과 [테스트](testing.md)에 있습니다. 이 문서는 lint 학습용이며 보안 기록이나 실제 소스를 대체하지 않습니다.
