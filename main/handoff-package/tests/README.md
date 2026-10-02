# 오프라인 웹 회귀 테스트

이 폴더는 인수인계 사본의 현재 `cutnote/` 소스를 검사합니다. 개발 서버, 개인 보관함 DB, 실제 API 키, YouTube 페이지 캡처가 필요하지 않습니다.

## 실행

Node.js **22.13 이상**이 필요합니다. Node의 `node:sqlite`로 메모리 DB를 만드는 테스트가 포함되어 있습니다.

인수인계 폴더에서:

```sh
cd cutnote
npm ci
npm run taxonomy:generate
npm test
```

의존성이 이미 설치되어 있다면 인수인계 폴더에서 다음 명령도 같습니다.

```sh
node tests/run-web.mjs
```

`npm ci`는 의존성 설치 시 네트워크를 사용할 수 있습니다. **테스트 실행 자체는 오프라인**이며 유료 API를 호출하지 않습니다. 실행기는 `cutnote/node_modules/esbuild`를 사용하므로 전역 esbuild나 원본 프로젝트의 `node_modules`를 참조하지 않습니다.

## 실행 방식과 격리

- `run-web.mjs`가 11개 테스트를 각각 현재 소스와 함께 임시 디렉터리에 ESM으로 bundle합니다. 각 테스트는 별도의 Node 프로세스에서 실행하고 끝나면 생성 파일을 지웁니다.
- `cloudflare:workers`는 `web/mock-cloudflare.ts`의 빈 `env` 객체로 연결됩니다. 각 테스트가 메모리 DB와 메모리 버킷을 직접 설정합니다. 영속 SQLite, D1, R2, Wrangler 상태에는 연결하지 않습니다.
- 기본 `fetch`는 항상 실패합니다. 테스트에 선언된 가짜 `fetch`만 사용할 수 있고, 기본 차단 함수 호출이 한 번이라도 발생하면 그 suite는 실패합니다. localhost 요청도 기본 차단에 포함됩니다.
- 자식 프로세스에는 실행에 필요한 환경 변수만 전달합니다. API 키, 비밀 키, `NODE_OPTIONS`는 전달하지 않습니다. 테스트 안의 키 문자열은 가짜 값이며 암호화 테스트용 키는 메모리에서 새로 생성합니다.
- migration SQL은 `cutnote/drizzle/`에서 읽고 `DatabaseSync(':memory:')`에만 적용합니다. 동기화 테스트는 `cutnote/app/cutnote.tsx`의 현재 callback을 읽어 가짜 시계와 request 함수로 실행합니다.
- npm 패키지는 인수인계 사본에서 해석한 절대 경로로 연결합니다. 임시 출력 경로 때문에 패키지 해석이 다른 프로젝트로 넘어가지 않도록 했습니다. `@/` 별칭은 `cutnote/tsconfig.json`을 사용합니다.

## 원본 출처와 변경

아래 원본 경로는 **개발 작업 폴더 기준 상대 경로**입니다. 실행 시 이 원본 파일이 필요하지 않습니다. 복사한 테스트의 프로젝트 import를 `../../cutnote/`로 변경했고, migration 파일 경로는 실행기의 작업 디렉터리인 인수인계 폴더에 맞췄습니다. 기존 검증 내용은 유지했습니다.

| 인수인계 파일 (`tests/web/`) | 원본 | 검증 범위 |
| --- | --- | --- |
| `discovery-order-check.ts` | `work/discovery-order-check.ts` | 보이지 않는 항목의 순서를 보존하는 재정렬, 취향의 원본 영상별 가중치, 검수 상태, 개인정보 제외, 검색 출처 대조, Shorts 식별, 가짜 oEmbed 응답 |
| `segment-independent-review-tests.ts` | `work/segment-independent-review-tests.ts` | 부모/인접 구간 태그 누출 방지, 구간별 근거, 상태·수동 판단 보존 |
| `segment-tagging-current-review-tests.ts` | `work/segment-tagging-current-review-tests.ts` | 구간 수동 편집, 재분석 후 사용자 판단 유지, legacy 태그, 빈 AI 결과 처리 |
| `segment-retag-parser-review-tests.ts` | `work/segment-retag-parser-review-tests.ts` | OpenAI/Gemini 결과 파서, 선택 구간 재분석, 프레임 샘플 범위, 취소 시 저장 방지 |
| `image-search-review-tests.ts` | `work/image-search-review-tests.ts` | 사진 입력 검사, 허용된 정적 태그, 구간 검색 점수와 태그 격리, 가짜 AI 응답과 API 오류 |
| `recommendation-review-tests.ts` | `work/recommendation-review-tests.ts` | 효과 추천과 관련도, 선택형 피드백, 사용자 판단, context/signature, 충돌·입력·오류 처리 |
| `segment-media-review-tests.ts` | `work/segment-media-review-tests.ts` | 가짜 구간 파일 저장/조회, 범위·원본 변경과 경합, 중복 저장, 삭제 재시도 |
| `favorites-review-tests.ts` | `work/favorites-review-tests.ts` | 영상/구간 즐겨찾기 독립성, 중복 요청, 동시 수정, 메타데이터 보존 |
| `full-video-tests.ts` | `work/full-video-tests.ts` | 암호화, 링크 분류, 전체 길이 샘플링, AI 요청·응답 형식과 근거, 할당량 오류, 임시 업로드 정리 |
| `sync-polling-tests.mjs` | `work/sync-polling-tests.mjs` | 느린 동기화 요청과 주기 polling, 타임아웃, 수동 동기화 우선 처리, 오래된 응답 무시 |
| `mock-cloudflare.ts` | `work/mock-cloudflare.ts` | 테스트별로 채우는 빈 Cloudflare 환경 객체 |
| `youtube-public-search-tests.ts` | 인수인계용 신규 작성 | 합성 renderer/HTML로 공개 검색 JSON 파서, 실제 Shorts endpoint, 중복·저장 영상 제외, 검색 횟수·동시성 제한, 오류·취소 |

`sync-polling-tests.mjs`만 원본의 `import.meta.url` 상대 읽기를 작업 디렉터리 기준 읽기로 변경했습니다. bundle이 임시 폴더에서 실행되어도 인수인계 소스를 찾기 위한 변경입니다. `segment-media-review-tests.ts`의 migration 목록은 원본 테스트가 지정한 목록을 그대로 유지합니다.

`youtube-public-search-tests.ts`의 HTML/영상 ID/제목은 모두 직접 만든 가짜 값입니다. 검색 결과를 실제로 수집하지 않습니다. 실행기와 이 설명서도 인수인계용으로 새로 작성했습니다.

## 범위와 남은 수동 확인

이 suite는 로직 및 mock 환경에서의 route 동작을 확인합니다. 실제 YouTube 검색 구조의 변경, 외부 제공자 응답 품질·공개 상태, APK 설치·공유시트, 모바일 터치 드래그, 실제 영상 재생/인코딩, PC와 휴대폰의 네트워크 연결까지 검증하지는 않습니다. 이런 동작은 별도의 기기/브라우저 점검이 필요합니다.

원래 작업 폴더의 실서버 테스트, 유료 API 실행 스크립트, 실제 HTML, 생성된 bundle, 실사용 DB와 영상 자료는 포함하지 않았습니다. 이식 후 독립 설치한 검증 사본에서 **11/11 suite 통과**를 확인했습니다. 상세 환경과 실제 서비스 미검증 범위는 루트 HANDOFF.md 및 audit/validation-results.json을 참고하세요.
