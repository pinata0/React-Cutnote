# 컷노트 구조 리팩토링 계획과 학습 기록

작성일: 2026-10-02 (Asia/Seoul)

이 문서는 요청문·판단 근거와 실제 수행 결과를 함께 담는다. 현재 상태는 **1~6단계 완료**다. 미사용 코드·의존성을 정리하고 앱·테스트·브랜드 경로를 이동했으며 기능별 UI·보관함 동기화·분석 요청을 분리했다. 6단계에서는 공개 소스만 복사한 새 디렉터리에서 캐시 기반 오프라인 설치, 사전 생성, lint·타입·웹 12/12·빌드와 빈 DB 최초 실행을 확인했다. 완료는 이 문서에 명시한 범위의 완료이며 Android 실기기·유료 AI·온라인 배포 등 미검증 환경까지 뜻하지 않는다. 앞 단계의 당시 결과는 이력으로 유지하고 최신 통합 판정은 마지막 **6단계 실제 수행 기록**을 따른다.

## 작업을 6단계로 나누는 이유

파일 수가 아니라 변경의 목적과 실패 원인을 기준으로 나눈다. 삭제, 경로 이동, 동작을 가진 코드의 분리를 한 번에 하면 오류의 원인을 찾고 되돌리기 어렵다. 각 단계는 검증 가능한 단위로 끝내고 다음 단계로 넘어간다. 단계 안에서도 변경이 크면 작은 단위로 나눈다.

| 단계 | 질문 | 결과물 | 상태 |
|---|---|---|---|
| 1. 기준선과 분류 | 무엇이 실제로 사용되고 있는가? | 파일 분류표, 참조 근거, 기준 검증 결과 | 완료, 환경별 한계는 아래 참조 |
| 2. 자료 정리 | 현재 코드와 과거 자료를 어떻게 구별할까? | 자료 구조, 갱신된 문서 링크 | 완료 |
| 3. 미사용 코드 제거 | 삭제해도 동작이 유지되는가? | 정리된 UI·의존성, 검증 결과 | 완료 |
| 4. 경로와 명명 정리 | 코드를 어디서 찾아야 하는가? | 앱 중심 구조, 수정된 경로 참조 | 완료, Windows 로컬 검증 |
| 5. 책임별 코드 분리 | 함께 변경되는 코드는 무엇인가? | 기능 모듈, 유지된 동작 | 완료 |
| 6. 최종 검증과 회고 | 개선 효과를 무엇으로 설명할까? | 통합 검증, 전후 비교, 학습 정리 | 완료, Windows portable·캐시 기반 새 설치 검증 |

## 작업 전 조사에서 확인한 사실

- 조사 시점 Git 관리 파일은 312개였다. 이 문서 추가 전 수치이며 전체 로컬 파일 수가 아니다.
- 실제 웹 소스는 `main/handoff-package/cutnote/`, Android는 형제 폴더 `cutnote-android/`에 있다.
- 웹 테스트 실행기는 형제 폴더 `tests/`와 `cutnote/`의 위치를 사용한다. 공개 검사에도 기존 경로가 명시되어 있다.
- `main/outputs/`, `main/work/`, 중첩 인수인계 폴더 등은 Git 제외 대상이다. Git 제외와 삭제 가능은 같은 의미가 아니다.
- `components/ui/`에는 61개 파일이 있다. 앱의 직접 참조는 일부지만 간접 참조 분석 전에는 나머지를 미사용으로 확정할 수 없다.
- `app/cutnote.tsx`는 약 50KB이며 보관함·태깅·분석·검색 등 여러 기능을 연결한다. 크기는 검토 신호이고 분리 기준 자체는 아니다.
- 현재 사전 원본은 앱의 `data/taxonomy/`다. 루트 `taxonomy/`는 과거 자료다.
- 웹 `build/`는 실제 입력 소스다. `next.config.ts`에는 요청 크기 설정이 있다. 둘 다 이름만 보고 삭제할 수 없다.
- 기존 DB 마이그레이션과 메타데이터, 외부 코드 라이선스는 보존 대상이다.

근거: 조사 시점의 `git ls-files`, 파일 목록·import 검색, `docs/architecture.md`, `docs/development.md`, 웹 설정, 테스트 실행기, 공개 검사 스크립트. 후속 변경으로 경로가 바뀌면 현재 안내를 갱신하되 이 항목은 작업 전 기록으로 유지한다.

## 그대로 사용할 요청문

각 요청은 이전 단계의 결과를 읽고 시작한다. 새 채팅에서도 이 문서를 먼저 읽도록 요청문에 포함했다. 단계의 작업이 끝나면 결과를 확인하고 다음 요청을 보낸다.

### 요청 1 — 기준선과 분류

```text
docs/refactoring-study.md를 읽고 1단계를 수행해줘.
현재 구조와 파일 참조를 조사하고 파일 또는 동질적인 파일 묶음을
유지 / 이동 / 삭제 후보 / 생성물 / 개인 데이터로 분류해줘.
Git 관리 파일과 Git 제외 로컬 파일을 구분하고, 분류마다 근거를 남겨줘.
import 외에도 동적 로딩, public URL, 빌드 설정, 실행 스크립트,
테스트, 문서에서의 참조를 확인해줘.
docs/engineering/testing.md의 관련 검증을 실행해 기준선을 기록하고,
기존 실패와 환경 때문에 실행하지 못한 검사를 구분해줘.
이 단계에서는 코드 이동이나 삭제를 하지 말고,
이 문서에 분류표·검증 결과·후속 단계의 범위를 정리해줘.
```

### 요청 2 — 과거 자료와 문서 정리

```text
docs/refactoring-study.md의 1단계 결과를 읽고 2단계를 수행해줘.
현재 기술문서, 제품 기획, 발표 자료, 공개 가능한 과거 기록을 구분해서
docs/engineering, docs/product, docs/presentations, archive 구조로 정리해줘.
자료가 있는 폴더만 만들고, 현재 문서의 링크·안내·관련 스크립트 참조도 갱신해줘.
과거 taxonomy와 관련 도구는 사용 여부를 확인해 함께 보관하고,
원본이 다른 자료를 단순 중복으로 취급하지 마.
Git 제외 보관본과 개인 DB·영상·키는 그대로 두고 별도 보관 대상만 기록해줘.
공개 검사와 문서 링크를 검증하고, 판단 근거와 이동 전후 경로를
학습 문서에 기록해줘. 학습 문서를 옮겼다면 새 경로도 알려줘.
```

### 요청 3 — 미사용 UI와 의존성 정리

```text
리팩토링 학습 문서(최초 경로 docs/refactoring-study.md, 이동했다면 현재 위치)를
읽고 3단계를 수행해줘.
앱 진입점에서 도달하는 import와 동적 참조를 추적해서
components/ui, 관련 훅, examples/d1의 미사용 여부를 확인해줘.
미사용이 확인된 코드만 제거하고 해당 코드만 사용하는 패키지를 정리해줘.
설정·빌드·테스트에서 사용하는 패키지도 확인하고 package-lock.json을 함께 갱신해줘.
버전 업그레이드와 전체 재서식은 섞지 마.
lint, 타입, 웹 회귀 테스트, 빌드를 검증하고
삭제 근거, 유지한 후보의 이유, 패키지 변경과 결과를 학습 문서에 기록해줘.
```

### 요청 4 — 폴더 구조와 이름 정리

```text
리팩토링 학습 문서를 읽고 4단계를 수행해줘.
웹을 apps/web, Android와 기존 bridge를 apps/android,
웹 테스트를 tests/web, 브랜드 자료를 assets/branding으로 정리해줘.
기존 tests/run-web.mjs의 역할을 유지하면서 실행 경로도 갱신해줘.
테스트 이름은 *.test.ts 또는 *.test.mjs로 통일하고 실행 목록도 수정해줘.
패키지 이름의 starter 흔적도 정리해줘.
import, 실행기, 설치·빌드 도구, 공개 검사, .gitignore, 문서,
생성 파일 경로와 호스팅 관련 설정까지 이동 영향을 확인해줘.
로컬 DB·미디어 상태가 경로 이동 후에도 보존되는지 확인하고,
기존 기록을 새 위치에서 사용하지 못한다면 완료로 처리하지 마.
DB 마이그레이션 이름과 내용은 유지하고 기능 변경은 섞지 마.
lint, 타입, 웹 테스트, 빌드, Bridge와 공개 검사를 수행하고
로컬 시작 및 Android 실행기 연결은 가능한 환경에서 확인해줘.
미검증 환경은 명시하고 변경 전후 경로와 문제 해결 과정을 학습 문서에 기록해줘.
```

### 요청 5 — 기능과 책임별 코드 분리

```text
리팩토링 학습 문서를 읽고 5단계를 수행해줘.
apps/web의 app에는 페이지·레이아웃·API 진입점을 유지하고,
일반 UI와 로직을 library, segments, tagging, discovery 등의 기능으로 묶어줘.
app/cutnote.tsx의 상태 관리, 데이터 갱신, 분석 작업, 화면을
실제 책임과 함께 변경되는 관계를 기준으로 작은 단위부터 분리해줘.
공통 UI와 서버 전용 코드의 경계를 유지하고 순환 의존성을 피하도록 해줘.
폴더 수를 늘리기 위한 추상화나 신규 기능은 추가하지 마.
비동기 취소, 오래된 응답 방지, 폴링, 사용자 검수 태그 보존 등
기존 동작이 유지되는지 관련 테스트로 확인해줘.
기존 테스트가 중요한 동작을 다루지 못할 때만 필요한 검증을 추가해줘.
lint, 타입, 웹 회귀 테스트, 빌드를 수행하고,
분리한 책임·의존 방향·검증 결과와 대표 코드 전후를 학습 문서에 기록해줘.
```

### 요청 6 — 최종 검증과 학습 문서 완성

```text
리팩토링 학습 문서를 읽고 6단계를 수행해줘.
변경 전체를 검토하고 문서·명령·경로·생성물 정책의 일관성을 확인해줘.
적용된 최신 변경을 이미 검증한 검사는 결과를 활용하되,
누락되었거나 이후 변경의 영향을 받은 검사는 추가로 실행해줘.
가능하면 별도 깨끗한 작업 디렉터리에서 설치, 사전 생성, 테스트, 빌드를 확인해줘.
개인 DB·키·영상과 유료 API 없이 검증하고 실환경 미검증 항목을 밝혀줘.
학습 문서를 실제 수행 기준으로 완성해줘:
문제 → 확인 근거 → 판단 기준 → 선택지와 선택 이유 → 실제 변경 → 검증 → 한계.
단계별 파일·의존성 증감, 대표 구조·코드 전후, 발생한 오류와 해결,
되돌리는 방법, 이번에 적용하지 않은 개선을 정리해줘.
미실행 작업과 실패한 검증을 완료처럼 기록하지 마.
```

## 판단 기준과 배울 내용

| 판단 | 확인할 근거 | 배우는 개념 |
|---|---|---|
| 삭제 | 실행 진입점에서의 참조, 빌드·테스트·URL·도구 사용 여부 | 의존성 그래프, 도달 가능성 |
| 이동 | 역할, 변경 주기, 사용 주체, 경로 결합 | 관심사 분리, 결합도 |
| 파일 분리 | 서로 다른 변경 이유, 상태·부작용 소유권 | 단일 책임, 응집도 |
| 공통화 | 실제 반복과 동일한 변경 이유 | 과도한 추상화 방지 |
| 생성물 제외 | 원본과 재생성 명령, 깨끗한 환경에서 재현 가능 여부 | 단일 원본, 재현 가능한 빌드 |
| 이름 변경 | 코드의 역할을 예측할 수 있는지, 도구가 요구하는 이름인지 | 명명 규칙, 프레임워크 계약 |
| 완료 판정 | 기준선 대비 동작, 테스트 범위와 실행 환경 | 회귀 검증, 증거의 한계 |

파일 수 감소는 참고 지표다. 기능별 분리로 파일 수가 증가해도 책임이 명확해지고 변경 범위를 좁힐 수 있다면 개선일 수 있다.

## 단계별 실제 수행 기록 양식

각 단계 완료 시 아래 양식을 복사해서 채운다. 긴 파일 목록은 별도 자료로 연결하고 핵심 판단을 본문에 설명한다. 명령 출력에는 비밀값과 개인 경로·데이터를 포함하지 않는다.

```markdown
### 단계 N — 제목

- 수행 날짜 / 환경:
- 상태: 완료 / 일부 완료 / 미실행
- 해결하려던 문제:
- 관찰한 근거: 파일·심볼·참조 관계 등
- 검토한 선택지와 선택 이유:
- 실제 변경: 이전 경로 → 이후 경로, 핵심 코드 전후
- 의도적으로 유지한 것과 이유:
- 검증: 작업 디렉터리 / 명령 / 결과 / 확인한 동작
- 실패·예상 밖의 문제와 해결:
- 검증하지 못한 범위와 영향:
- 되돌리기: 해당 변경 단위와 데이터 복원 시 주의점
- 배운 원칙과 다음 적용 사례:
```

## 이번 문서 작성 기록

- 요청문 6개와 분류·검증 기준을 작성했다.
- 앞선 읽기 전용 조사와 리팩토링의 실행 결과를 구분했다.
- 실행 코드, 폴더 위치, 의존성은 변경하지 않았다.
- 문서 목록에 이 문서의 링크를 추가했다.

## 1단계 실제 수행 기록 — 조사·분류와 기준선

> 이 절은 이번 요청을 시작할 때 이미 있던 수행 기록을 보존한 것이다. 이번 요청에서 다시 조사·실행한 결과는 문서 끝의 **1단계 재확인 기록**에 구분했다. 위 상태 표의 완료는 조사·분류 범위이며 APK·실기기 등 모든 실행 환경의 검증 완료를 뜻하지 않는다.

수행일: 2026-10-02 (Asia/Seoul). 환경: Windows PowerShell, Node 24.14.0, npm 11.9.0, Java/Javac 21.0.10. 설치돼 있는 웹 의존성으로 검사했다. 새 설치의 재현성 검증은 이번 범위에 포함하지 않았다.

### 문제와 조사 방법

현재 실행 소스와 인수인계 기록이 같은 계층에 있고, Git에서 제외된 보관본까지 탐색기에 보인다. 파일 수만 줄이면 필요한 실행 도구나 개인 데이터를 잃을 수 있으므로 먼저 역할과 참조를 확인했다.

1. `git ls-files`, `git ls-files --others --exclude-standard`, `git ls-files --others --ignored --exclude-standard --directory`로 관리·미추적·제외 항목을 분리했다. 제외 디렉터리는 묶음 단위로 조사했으며 내부 파일을 전부 내용 분석한 것은 아니다.
2. `rg`로 import, 동적 import, Worker URL, 메타데이터 URL, CSS import, 실행 스크립트, 테스트 목록, 문서의 경로를 확인했다. 공개되는 소스를 중심으로 조사하고 보관본의 개인 파일 내용은 문서에 옮기지 않았다.
3. 설치된 TypeScript의 AST로 import/export, 문자열 리터럴 `import()`와 `require()`를 추출했다. 상대 경로와 `@/` 별칭을 해석해 UI 사이의 간접 참조도 따라갔다. 삭제 후보를 보수적으로 좁히기 위해 웹의 UI·hooks·examples를 제외한 모든 소스 파일을 시작점으로 잡았다. 실제 라우트에서의 최소 도달 그래프와는 다르며 타입 import도 유지 근거에 포함했다.
4. AST로 포착하지 못하는 계산된 로딩과 파일 경로는 실행기·설정·public URL 검색으로 보완했다. 외부 사용자가 직접 호출하는 public URL까지 자동으로 부재를 증명할 수는 없으므로 삭제 확정 대신 후보로 기록했다.
5. 코드 변경 전에 문서의 검사 명령을 실행했다. 제한 환경에서 실패한 검사는 같은 코드로 제한 밖에서 재실행해 환경 영향과 코드 실패를 구분했다.

작업 시작 시 Git 관리 파일은 312개, 공개 가능한 미추적 파일은 이 문서 1개였다. `docs/README.md`의 목록 추가와 이 문서는 앞선 요청에서 이미 변경돼 있었다. 이번에 코드나 의존성, Git 인덱스는 변경하지 않았다.

### 분류표 — Git 관리 파일과 공개 문서

아래 `웹/`, `Android/`, `묶음/`은 각각 `main/handoff-package/cutnote/`, `main/handoff-package/cutnote-android/`, `main/handoff-package/`를 뜻한다. 이동은 내용 보존을 전제로 한다. 파일명이 같다는 이유로 중복 삭제하지 않는다.

| 대상 | Git 상태 | 분류 | 근거와 후속 처리 |
|---|---|---|---|
| 웹 `app/`, `lib/`의 현재 기능, `db/` | 관리 | 유지 → 이동 | 페이지·API·앱 import·테스트가 사용. 4단계 앱 전체 이동 후 5단계 책임 분리 |
| 웹 `components/connector-error.tsx`, UI 6개 | 관리 | 유지 → 이동 | 앱 및 공통 오류 UI에서 정적 참조 확인. 아래 목록 참조 |
| 웹 UI 55개와 `hooks/use-mobile.ts` | 관리 | 삭제 후보 | 보수적 참조 그래프에서도 도달하지 않음. 3단계에서 삭제 직전 재확인 |
| 웹 `examples/d1/` | 관리 | 삭제 후보 또는 자료 이동 | `tsconfig.json`의 exclude에 있고 실제 API는 `app/api/`에 있음. 조사한 앱·도구·테스트에서 실행 참조를 찾지 못함 |
| 웹 `lib/analysis/link.ts`, `video.ts`, `public/analysis-worker.js` | 관리 | 유지, 추가 조사 | `link.ts` → `video.ts` → Worker URL 연결은 존재. 현재 화면은 `whole-video.ts`를 사용하고 `analyzeLink`·`analyzeVideo` 호출은 조사 범위에서 발견되지 않음. 기존 분석 경로 전체와 export 사용을 3단계에서 추가 확인; Worker만 먼저 삭제하지 않음 |
| 웹 `public/favicon.svg` | 관리 | 유지 | `app/layout.tsx`의 metadata가 `/favicon.svg` 사용. import가 없어도 필요한 공개 자산 |
| 웹 `build/` | 관리 | 유지 | `vite.config.ts`가 플러그인과 Worker 진입점 참조. 출력 디렉터리가 아님 |
| 웹 `.openai/hosting.json`, `vite.config.ts`, `next.config.ts` | 관리 | 유지 | Vite의 바인딩·Worker 구성과 Next 요청 크기 설정. 웹 이동 때 연관 경로 검토 |
| 웹 TS·ESLint·PostCSS·Drizzle 설정, `components.json`, 타입 선언 | 관리 | 유지 | 별칭·코드 생성·타입·CSS·DB 도구의 입력. `components.json`도 `app/globals.css`와 UI 별칭을 가리킴 |
| 웹 `package.json`, `package-lock.json` | 관리 | 유지 | 스크립트 및 의존성 기준. 3단계에서 미사용 패키지만 함께 갱신; 4단계 패키지명 변경 |
| 웹 `scripts/` | 관리 | 유지, 환경별 정리 검토 | 실행 프로필에 따라 portable/managed-linux 분기. `install-ci.mjs` → npm 설치 도구 또는 Bash 설치 도구, `run-framework.mjs` → CLI 동적 import 또는 `build-verified.sh`. pnpm 도구도 상호 참조가 있어 단순 중복 확정 불가 |
| 웹 `data/taxonomy/*.yaml`, schema, `lib/taxonomy.ts` | 관리 | 유지 | 앱 생성기의 현재 입력과 조회 코드. 루트의 과거 사전과 구분 |
| 웹 `drizzle/*.sql`, `drizzle/meta/` | 관리 | 유지 | DB 이력 0000~0008 및 스냅샷·journal. `drizzle.config.ts`와 DB 초기화 도구가 사용 |
| 웹 `vendor/` CSS·LICENSE | 관리 | 유지 | `app/globals.css`의 직접 CSS import. 외부 코드와 고지를 함께 보존 |
| Android `app/`, `tests/`, `build.sh` | 관리 | 유지 → 이동 | manifest·리소스와 직접 javac/APK 빌드 대상. 자바의 표준 패키지 폴더는 임의 평탄화하지 않음 |
| Android `launcher.mjs`, `bridge/` | 관리 | 유지 → 이동 | PC 실행·인증·프록시 및 테스트. 웹 프로젝트 이름과 상대 위치에 결합됨 |
| 묶음 `tests/` | 관리 | 유지 → 이동 | `npm test` → `../tests/run-web.mjs` → 명시적 11개 스위트 동적 import. 이름 변경 때 목록과 내부 상대 import 동시 갱신 |
| 루트 `scripts/check-publication.mjs`, `verify-publication-index.mjs`, secrets 검사·테스트·`reviewed-media.json` | 관리 | 유지 | 공개 후보, 제외 경로, 필수 소스, 이미지 해시 검증. 앱·이미지 이동 시 경로 규칙도 갱신 |
| 루트 `taxonomy/`, `scripts/generate-taxonomy.mjs` | 관리 | 이동 | 과거 자료 및 변환 도구. 현재 웹 package 스크립트는 웹 내부의 다른 생성기를 사용. 과거 입력 경로 불일치는 아래 기록 |
| `docs/` 기술·기획·발표 Markdown | 관리 | 이동 | 현재 실행 안내와 제품 배경을 분리. 기술 문서 간 링크와 README 진입점 함께 갱신 |
| 묶음 README·하위 README·`docs/LINT_FIX_STUDY.md` | 관리 | 유지 또는 통합 후 삭제 후보 | 일부는 통합 문서로 가는 안내. 외부 링크의 입구 역할을 확인한 뒤 중복 본문과 안내 파일을 구별 |
| 묶음 `audit/`, `reference/design/` | 관리 | 이동 | 인수인계 시점 기록과 과거 로고 제작 코드. 현재 검증 결과가 아니며 디자인 스크립트도 과거 경로를 전제 |
| `material/` PNG, 묶음 `assets/logos/` SVG | 관리 | 이동 | 브랜드 자료. PNG 2개는 `reviewed-media.json`에서 경로별 해시 관리. SVG와 PNG를 동일한 원본으로 간주하지 않음 |
| 묶음 `.env.example`, LICENSE_NOTES 및 각 `.gitignore` | 관리 | 유지 | 환경 안내·라이선스·개인 자료 제외 정책. 중첩 ignore 규칙은 이동 시 의미 재검토 |
| `docs/refactoring-study.md` | 미추적, 공개 검사 대상 | 유지 | 이번 학습 기록. 새 파일이라는 이유로 임시 파일로 분류하지 않음 |

### 분류표 — Git 제외 로컬 항목

| 대상 | 분류 | 근거와 처리 원칙 |
|---|---|---|
| `main/outputs/`, `main/work/`, 중첩 `main/handoff-package/handoff-package/` | 이동 후보, 개인 데이터 혼재 가능 | ignore와 구조 문서에서 보관용으로 지정. 디렉터리 존재를 확인했지만 내부 전체 중복·민감성 검사는 하지 않음. 2단계 자동 이동·삭제 대상에서 제외 |
| `docs_ext/`, `example/`, `legacy/`의 제외 자료 | 개인/비공개 보관 자료 | 로컬 보존 정책에 따른 묶음. 폴더 이름만으로 미사용 삭제 판정 불가 |
| `docs/Presentation.pdf`, 비공개 참가 안내문 | 개인 데이터 포함 가능 자료 | 기존 보안·제외 정책의 보존 대상. 이번에 내용을 공개 문서로 복사하지 않음 |
| `main/__MACOSX/`, 묶음 `__MACOSX/`, `.DS_Store` | 삭제 후보 | OS·압축 메타데이터. Git 제외 상태 확인, 이번 삭제 없음 |
| 웹 `node_modules/`, `dist/`, `.next/`, `next-env.d.ts` | 생성물 | 설치·빌드·타입 도구가 생성. `dist`는 현재 실행에 필요하므로 삭제 후에는 재빌드 필요 |
| 웹 `data/taxonomy/taxonomy.generated.json`, `lib/taxonomy-data.ts` | 생성물 | `npm run taxonomy:generate`로 재생성. 직접 편집 대상 아님 |
| 웹 `.wrangler/` | 개인 데이터/로컬 영속 상태로 취급 | D1/R2 상태가 저장되는 경로. `db:init`도 `.wrangler/state`를 사용하므로 캐시처럼 삭제하면 안 됨. 실제 레코드 내용은 읽지 않음 |
| 웹 `.sites-runtime/` | 유지, 로컬 설정 | `execution-profile.mjs`가 이곳의 실행 프로필을 읽음. 없을 때 portable로 동작하므로 제거가 실행 방식에 영향을 줄 수 있음 |
| `.security-checks/` | 생성물, 비공개 검사 산출물 | 임시 공개 인덱스·객체·manifest와 이번 JVM 클래스 출력. Git 제외 유지 |
| Android `.env.example` | 유지, 공개 정책 검토 | 실제 파일은 있지만 Android `.gitignore`의 `/.env.*` 규칙에 걸림. `.example` 이름만으로 공개 안전을 확정하지 않음. 내용·중복성 검토 후 포함 여부 결정 |
| 환경 키·연결 파일·서명 키·DB 패턴 | 개인 데이터 | `.env*`, `.dev.vars*`, `connection.txt`, `.cutnote-pairing.json`, `*.keystore`, `*.db` 등 제외 규칙 존재. 각 파일이 모두 존재한다는 뜻은 아님. 보관본 내부를 포함해 이동 직전에 별도 확인 |

### UI 삭제 후보의 근거와 한계

유지할 6개: `alert-dialog.tsx`, `button.tsx`, `dialog.tsx`, `sheet.tsx`, `sonner.tsx`, `tabs.tsx`.

나머지 55개는 이번 정적 참조 분석의 삭제 검토 후보다:

```text
accordion alert aspect-ratio attachment avatar badge breadcrumb bubble
button-group calendar card carousel chart checkbox collapsible combobox
command context-menu direction drawer dropdown-menu empty field form
hover-card input-group input-otp input item kbd label marker menubar
message-scroller message native-select navigation-menu pagination popover
progress radio-group resizable scroll-area select separator sidebar skeleton
slider spinner switch table textarea toggle-group toggle tooltip
```

모두 웹 `components/ui/<이름>.tsx` 경로다. `hooks/use-mobile.ts`는 후보인 `sidebar.tsx`에서 참조한다. 따라서 훅을 단독 삭제하지 말고 사용처와 함께 판단한다.

후보 UI에서만 직접 import를 발견한 패키지는 `react-day-picker`, `embla-carousel-react`, `recharts`, `@base-ui/react`, `cmdk`, `vaul`, `react-hook-form`, `input-otp`, `@shadcn/react`의 message-scroller 경로, `react-resizable-panels`다. 이는 패키지 삭제 확정 목록이 아니다. 설정·도구와 다른 패키지의 peer dependency까지 3단계에서 확인해야 한다. `package.json`에만 남는 다른 패키지도 추가 조사한다.

### import 외에 확인한 참조와 경로 결합

| 연결 | 확인한 의미 |
|---|---|
| `app/layout.tsx` → `/favicon.svg` | public 파일은 import 없이 필요할 수 있음 |
| `lib/analysis/video.ts` → `/analysis-worker.js` → 외부 Transformers 모듈 동적 import | Worker 파일만 삭제하면 기존 분석 경로가 깨짐. 외부 모델 로딩은 이번에 실행하지 않음 |
| `app/globals.css` → vendor CSS | JS 의존성 검사만으로 CSS를 미사용 판정하면 안 됨 |
| `vite.config.ts` → `.openai/hosting.json`, `build/` 플러그인·Worker | `build`라는 이름과 달리 유지할 소스 |
| `scripts/run-framework.mjs` → 프로필별 CLI URL 동적 import | 문자열 import 목록만으로는 실행 의존성 전체를 찾을 수 없음 |
| `tests/run-web.mjs` → 문자열 스위트 목록 + 동적 import | 테스트 파일 이름 변경 시 실행 목록을 갱신해야 함 |
| Android `bridge/server.mjs:findProject` → 상위 경로의 `cutnote/package.json` | `apps/web`로 이동할 때 탐색 로직을 함께 변경해야 함 |
| Android 실행기 → `scripts/start-pc.mjs`, `dist/server/wrangler.json` | 소스 이동·빌드 출력·PC 실행을 함께 검증해야 함 |
| `init-local-db.mjs` → `drizzle/`, `.wrangler/state` | 코드 이동과 개인 DB의 위치를 따로 다루면 빈 보관함으로 보일 수 있음 |
| 공개 검사 → 필수 파일 경로·제외 루트·이미지 해시 경로 | 소스는 정상이어도 경로 이동 후 공개 검사가 실패할 수 있음 |
| 문서 → README·설치·테스트·라이선스의 상대 링크 | 문서를 옮길 때 단순 폴더 이동으로 끝낼 수 없음 |

### 기존 불일치 — 이번 리팩토링으로 생긴 실패가 아님

- 루트 `scripts/generate-taxonomy.mjs`는 루트의 `분류 후보군_개정판.md`를 읽도록 작성됐지만 그 위치의 파일은 없고 `docs/`에 있다. 입력 경로를 정적으로 확인한 결과이며 과거 생성기를 실행한 실패 기록은 아니다. 현재 앱 생성기는 별개이며 정상 통과했다. 2단계에서 과거 도구로 설명하고 보관 위치에 맞춰 처리한다.
- `docs/android.md`는 `cutnote-android/PC-컷노트-시작.command` 더블클릭을 안내하지만 해당 파일은 존재하지 않는다. 실제 `launcher.mjs`와 `bridge/start.command`는 있다. 2단계에서 문서의 실제 실행 안내를 일치시킨다.
- Android `.env.example`은 존재하지만 하위 ignore 규칙에 의해 제외된다. 비밀 노출 또는 앱 오류로 단정하지 않고 4단계의 ignore/환경 안내 정리 항목으로 남긴다.
- 빌드에서 Vite의 향후 native config loader 관련 JSON import 속성·확장자 경고, Vinext CLI 전환 안내, 의존성 내부의 ineffective dynamic import 경고가 발생했다. 현재 빌드는 성공했다. 버전 변경이나 경고 억제를 이번 구조 조사에 섞지 않는다.

### 기준 검증 결과

아래는 이번에 직접 실행한 결과다. `웹` 작업 디렉터리는 `main/handoff-package/cutnote`, `루트`는 저장소 루트다.

| 작업 디렉터리 / 명령 | 결과 | 범위와 해석 |
|---|---|---|
| 웹 / `npm run taxonomy:generate` | 통과 | 12 namespaces, 403 tags. schema·참조·부모 순환 검사; 제외된 생성 파일 갱신 |
| 웹 / `npm run lint` | 통과, 종료 0 | ESLint 오류·경고 출력 없음 |
| 웹 / `npx --no-install tsc --noEmit --incremental false` | 통과, 종료 0 | 설치된 TypeScript 사용. 문서 명령에 자동 다운로드 방지 옵션만 추가 |
| 웹 / `npm test` | 제한 밖 재실행 11/11 통과 | 최초 샌드박스 실행은 esbuild 상위 경로 Access denied로 0/11. 실제 테스트 assertion 실패와 구분 |
| 웹 / `npm run build` | 통과, 종료 0 | RSC·SSR·클라이언트 빌드 완료. 기존 경고는 위 항목에 기록 |
| 루트 / `node --test main/handoff-package/cutnote-android/bridge/server.test.mjs` | 제한 밖 재실행 18/18 통과 | 최초 샌드박스에서는 개인 연결 파일 ACL 설정 실패로 17/18. 코드 수정 없이 재실행해 해소 |
| 루트 / `node --test scripts/publication-secrets.test.mjs` | 4/4 통과 | 검사기의 비밀값 탐지와 placeholder 허용 검증 |
| 루트 / `node scripts/check-publication.mjs` | 통과 | 작업 트리 공개 후보 313개와 기존 인덱스 312개 검사. 이미지 2개는 등록 해시 일치 |
| 루트 / `node scripts/verify-publication-index.mjs` | 통과 | 후보 313개를 격리 인덱스·객체에서 검사; 실제 인덱스 해시 불변 |

웹 테스트는 실제 AI를 호출하지 않는다. 출력에 나오는 Gemini 402와 미디어 cleanup 재시도 문구는 오류 처리 테스트의 모의 응답이며, 실제 과금 계정 오류나 개인 데이터 삭제가 아니다. SQLite experimental warning도 테스트 실패는 아니다.

Android JVM 검사는 `build.sh`의 javac 입력 7개와 테스트 6개를 그대로 사용해 `javac --release 8 -encoding UTF-8`로 컴파일했다. 출력은 제외 경로 `.security-checks/refactoring-jvm-20261002`이며, 각 `app.cutnote.mobile.*Test`를 `java -cp`로 실행했다. APK 빌드·서명과 분리해 JDK만으로 가능한 범위를 검증했다. 결과는 **6종 211개 검사 통과**: LinkPolicy 49, ShareRequest 25, EntryPolicy 20, ConnectionProbe 32, DownloadFormats 23, MediaTransfer 62. 컴파일 시 Java 8 source/target의 향후 지원 종료 경고 3개가 있었으며 종료 코드는 0이었다.

### 미검증 범위와 환경 제약

- APK 생성·서명·설치: `JAVA_HOME`, `ANDROID_SDK_ROOT`가 설정돼 있지 않으며 SDK 플랫폼·빌드 도구 준비를 확인하지 못했다. JDK 자체는 존재한다. 전체 `bash build.sh`를 실행하지 않았으며 기존 2026-10-01 APK 성공 기록을 이번 결과로 재사용하지 않았다.
- Android 실기기·WebView 생명주기·공유 시트·파일 선택기, 브라우저 수동 조작, 실제 AI 및 외부 모델 다운로드, 온라인 배포·managed-linux 프로필은 실행하지 않았다.
- `npm ci`를 통한 깨끗한 설치와 `npm run db:init`은 실행하지 않았다. 전자는 6단계 재현성 검사로 남기고 후자는 현재 영속 DB 변경을 피했다. 회귀 테스트의 메모리 DB 검증이 개인 DB 이동·복원을 보장하지 않는다.
- 보관본 내부 전체 중복 검사와 개인 DB·영상 내용 검사는 수행하지 않았다. 따라서 제외 폴더 전체를 삭제 가능으로 판정하지 않는다.

### 후속 단계의 구체적인 범위

1. **2단계:** 공개 문서·과거 사전·audit·디자인 참고자료만 재배치한다. 사전 도구의 과거 입력 경로, Android 문서의 없는 실행 파일 안내, 이동된 문서 링크를 정리한다. 비공개 보관본은 목록으로만 남긴다.
2. **3단계:** UI 55개·훅 1개·D1 예제부터 참조를 재확인한다. 이전 분석 경로는 별도 묶음으로 호출 관계를 더 조사한다. 사용 패키지의 peer 관계를 확인한 뒤 lockfile과 함께 정리한다.
3. **4단계:** 앱·테스트·브랜드 자료 이동과 실행기 탐색·테스트 목록·공개 검사·해시 경로·ignore·환경 안내를 같은 변경에서 갱신한다. `.wrangler`의 개인 상태 이전은 소스 이동과 구분해 보존 여부를 확인한다.
4. **5단계:** 동작을 보존하면서 보관함·구간·태깅·탐색 책임을 분리한다. 파일 크기나 줄 수만으로 분할하지 않는다.
5. **6단계:** 깨끗한 설치와 최신 경로 기준 검증, 전후 비교, 남은 경고·환경별 미검증을 정리한다.

### 변경·되돌리기와 배운 점

이번 변경은 이 학습 문서의 기록이다. 실행 코드·폴더·파일명·패키지는 변경하지 않았다. 기준 검증 과정에서 사전·빌드 출력 및 제외된 검사 산출물이 생성·갱신됐다. 이를 코드 이동·삭제와 구별한다. 커밋이나 스테이징은 하지 않았다.

기록을 되돌릴 때는 이 문서의 1단계 추가 부분과 상태 표시만 되돌린다. 이전 요청에서 만든 요청문과 `docs/README.md` 변경까지 함께 지우지 않는다. `.wrangler`와 보관 폴더를 일괄 정리하는 명령은 사용하지 않는다.

핵심 학습은 **파일 이름과 Git 제외 여부가 아니라 실행 경로·원본 관계·데이터 성격으로 판단한다**는 것이다. `build/`는 소스이고 `.wrangler/`는 개인 상태일 수 있다. 반대로 파일이 import됐더라도 호출하는 경로 전체가 도달 불가능할 수 있어, UI 55개처럼 근거가 좁혀진 후보부터 작은 변경으로 검증해야 한다.

## 1단계 재확인 기록 — 2026-10-02 (Asia/Seoul)

이번 요청에서는 기존 분류표를 실제 작업 트리와 대조하고 검증을 다시 실행했다. 환경은 Windows PowerShell / Node 24.14.0 / npm 11.9.0 / Java·Javac 21.0.10이다. 시작 시 관리 파일 312개, 제외되지 않은 미추적 파일은 이 문서 1개였다. 기존 `docs/README.md` 변경은 그대로 보존했다. 코드 이동·삭제·의존성 수정·스테이징은 수행하지 않았다.

### 분류의 재확인과 보완

앞의 두 분류표와 UI 후보 목록을 유지한다. 아래는 이번에 직접 대조한 핵심 근거와 기존 표에서 명시성이 부족했던 항목이다. `웹/`, `Android/`, `묶음/`의 경로 약칭은 앞 표와 같다.

| 대상 | Git 구분 | 분류 | 이번 확인 근거 |
|---|---|---|---|
| 루트 `README.md`, `.gitignore`, 문서 목록 | 관리 | 유지 | 현재 소스와 검사 진입점, 로컬 보존 정책. 후속 이동 때 안내·제외 경로 갱신 |
| 웹 `app/`, `lib/`, `db/`, Android 소스·리소스, 웹·JVM·Bridge 테스트 | 관리 | 유지 → 이동 | 프레임워크 라우트, import, manifest, 테스트 실행기의 명시적 입력. 위 분류표의 기능·경로별 판단 유지 |
| 웹 UI 61개와 `hooks/use-mobile.ts` | 관리 | 6개 유지 / 55개와 훅 삭제 후보 | 설치된 TypeScript AST로 import/export·문자열 import/require의 상대 경로와 `@/` 별칭을 재추적. UI·hooks·examples 외 웹 소스를 시작점으로 했을 때 앞 목록과 일치. 테스트·빌드·실행 도구에서 후보 UI를 직접 참조하는 별도 경로를 찾지 못함 |
| 웹 `examples/d1/` | 관리 | 삭제 후보 | `tsconfig.json`이 examples를 제외. 현재 실행·테스트 경로에서 사용 참조 미발견. 자동 삭제 승인은 아님 |
| 웹 `build/`, `next.config.ts`, `.openai/hosting.json`, `.npmrc` 및 나머지 설정·타입 선언 | 관리 | 유지 | Vite가 build 플러그인·Worker와 hosting 설정 사용. Next 설정은 요청 본문 27mb 제한. `.npmrc`는 npm audit·fund·갱신 알림 설정 |
| 웹 `scripts/`, 사전 원본·스키마, migration SQL·meta, vendor CSS·LICENSE | 관리 | 유지 | package 실행 명령·프로필 분기·생성기 입력·DB 이력·CSS import로 연결. 생성된 형태의 migration meta도 DB 이력이므로 폐기 가능한 출력과 구별 |
| 기술·기획·발표 문서, 루트 과거 taxonomy·생성기, audit·디자인 참고 소스, 브랜드 PNG·SVG | 관리 | 이동 | 현재 구조 문서와 실제 경로 대조. 과거 생성기는 문서가 이미 이동한 이전 입력 경로를 사용. PNG 2개는 공개 검사의 경로별 해시 대상 |
| `docs/refactoring-study.md` | 미추적·제외 아님 | 유지 | 공개 검사 후보에 포함되는 학습 기록 |
| `.next/`, `dist/`, `node_modules/`, 사전 생성 JSON·TS, `next-env.d.ts`, `.security-checks/` | 제외 로컬 | 생성물 | 실제 제외 목록과 생성기·빌드·검사 출력 경로 대조. 이번 실행도 사전·빌드·JVM·검사 출력만 생성·갱신 |
| `.wrangler/` | 제외 로컬 | 개인 데이터 | `start-pc.mjs`와 `init-local-db.mjs` 모두 `--persist-to .wrangler/state` 사용. 내부 데이터를 읽거나 초기화하지 않음 |
| `.sites-runtime/`, Android `.env.example` | 제외 로컬 | 유지 | 전자는 실행 프로필 입력. 후자는 `git check-ignore -v`로 Android `.gitignore:15`의 `/.env.*` 적용 확인 |
| outputs·work·중첩 인수인계·docs_ext·example·legacy·제외 PDF/안내문 | 제외 로컬 | 개인/비공개 자료 보존, 이동 검토 | 존재와 ignore 정책만 확인. 동질적인 런타임 생성물로 볼 근거가 없어 내부 전체 삭제·이동 대상에서 제외 |
| `__MACOSX/`, `.DS_Store` | 제외 로컬 | 삭제 후보 | OS 메타데이터이며 현재 앱 입력 참조 없음. 이번 삭제 없음 |

AST 분석은 보수적 파일 그래프이며 함수별 사용 여부나 계산된 모든 경로의 부재를 증명하지 않는다. 특히 `link.ts`는 `video.ts`의 `analyzeFrames`·`extractFrames`를 사용한다. `analyzeVideo` 호출만 검색해서 `video.ts`를 삭제하면 안 된다. 외부 공개 URL 소비자, 미검토 보관본, 패키지 peer 의존성은 삭제 직전 추가 확인 범위다.

### import 이외의 참조 증거

- **동적 로딩:** `scripts/run-framework.mjs:23`의 `import(cli.href)`는 실행 프로필에 따라 Vite/Vinext CLI를 선택한다. `tests/run-web.mjs:83`은 11개 스위트 목록을 동적 import한다. `public/analysis-worker.js:34`는 외부 Transformers 모듈을 로드한다.
- **public URL·CSS:** `app/layout.tsx:3`은 `/favicon.svg`, `lib/analysis/video.ts:17`은 `/analysis-worker.js`를 사용한다. `app/globals.css:3`은 vendor CSS를 import한다. 두 public 파일의 외부 참조 부재는 증명하지 않았다.
- **빌드·설치:** `vite.config.ts`의 `build/sites-worker.ts`, connector-preview Worker, hosting 설정과 `scripts/install-ci.mjs`의 portable/managed-linux 분기를 확인했다. 현재 빌드는 성공했지만 Linux 프로필까지 실행한 것은 아니다.
- **실행·영속 경로:** `Android/bridge/server.mjs:294–300`은 상위에서 `cutnote/package.json`을 찾는다. `Android/launcher.mjs:167–168`은 `scripts/start-pc.mjs`와 `dist/server/wrangler.json`을 요구한다. 웹 실행기와 DB 도구의 `.wrangler/state`도 앱 이동 시 함께 다뤄야 한다.
- **테스트·공개 검사:** 웹 실행기는 형제 `cutnote`에서 esbuild와 tsconfig를 해석한다. JVM 입력은 `Android/build.sh`에 명시된다. `scripts/check-publication.mjs:63–66`의 필수 파일과 `scripts/reviewed-media.json`의 PNG 경로도 이동 영향 대상이다.
- **문서:** 루트 README, `docs/architecture.md`, `docs/development.md`, `docs/android.md`의 기존 폴더 경로를 확인했다. 공개 Markdown의 인라인 로컬 링크 80개는 모두 존재했다. 이 검사는 링크 대상 존재만 검사하며 본문 명령의 유효성을 보장하지 않는다.

### 이번 실행의 기준선

`웹`은 `main/handoff-package/cutnote`, 나머지 명령은 저장소 루트 기준이다. 설치된 의존성을 사용했고 자동 다운로드를 막기 위해 타입 검사에는 `--no-install`을 추가했다.

| 위치 / 명령 | 이번 결과 | 실패·경고의 해석 |
|---|---|---|
| 웹 / `npm run taxonomy:generate` | 종료 0 | 12 namespaces / 403 tags, schema·참조·부모 순환 검증 |
| 웹 / `npm run lint` | 종료 0 | 오류·경고 출력 없음 |
| 웹 / `npx --no-install tsc --noEmit --incremental false` | 종료 0 | 타입 검사 통과 |
| 웹 / `npm test` | 재실행 11/11 통과 | 최초 0/11은 esbuild 상위 디렉터리 Access denied로 assertion 전 실패. 제한 밖에서 같은 코드로 통과하여 환경 문제로 구분 |
| 웹 / `npm run build` | 종료 0 | RSC·클라이언트·SSR 빌드 완료. native config loader, Vinext CLI 전환, ineffective dynamic import 및 라우트 자동 분류 한계 안내는 기존 경고 |
| 루트 / `node --test main/handoff-package/cutnote-android/bridge/server.test.mjs` | 재실행 18/18 통과 | 최초 17/18은 임시 연결 파일 ACL 설정 실패. 제한 밖에서 코드 수정 없이 통과 |
| 루트 / `node --test scripts/publication-secrets.test.mjs` | 종료 0, 4/4 통과 | 검사기 자체 회귀 검사 |
| 루트 / `node scripts/check-publication.mjs` | 종료 0 | 작업 트리 후보 313개 / 기존 인덱스 312개 검사, PNG 2개 해시 일치 |
| 루트 / `node scripts/verify-publication-index.mjs` | 종료 0 | 격리 인덱스·객체의 후보 313개 통과, 실제 인덱스 해시 불변 |
| 루트 / JVM 별도 컴파일·6개 테스트 실행 | 종료 0, 211개 검사 통과 | LinkPolicy 49, ShareRequest 25, EntryPolicy 20, ConnectionProbe 32, DownloadFormats 23, MediaTransfer 62 |
| 루트 / 공개 Markdown 로컬 링크 검사, `git diff --check` | 통과 | 인라인 링크 80개 대상 존재. 미추적 학습 문서는 별도로 줄 끝 공백 검사 |

JVM 재실행은 `build.sh`에 나열된 정책 소스 7개와 테스트 소스 6개를 `javac --release 8 -encoding UTF-8 -d <출력>`으로 컴파일한 뒤 `java -cp <출력> app.cutnote.mobile.<테스트명>`을 각각 실행했다. 출력은 새로 만든 제외 경로 `.security-checks/refactoring-jvm-recheck-<임의 ID>/`다. Java 8 source/target 지원 종료 예정 경고 3개가 있었고 APK 도구는 호출하지 않았다.

웹 테스트의 Gemini 402·cleanup 재시도 출력은 모의 오류 검증이다. 실제 API 호출 실패로 집계하지 않았다. 이번 확인에서 코드 수정이 필요한 재현 가능한 테스트 실패는 발견하지 못했다.

### 기존 문제와 미실행 범위, 후속 단계

기존 과거 사전 생성기의 입력 문서 경로 불일치와 Android 문서의 없는 `PC-컷노트-시작.command` 안내를 다시 확인했다. 이는 정적 조사로 발견한 기존 불일치이며 이번 테스트에서 실패한 항목과 구별한다. Android `.env.example` 제외 문제도 기존 정책 검토 항목이다.

APK 빌드·서명은 `JAVA_HOME`·`ANDROID_SDK_ROOT`가 설정되지 않아 실행하지 않았다. JDK 자체는 존재하지만 SDK와 Bash·플랫폼 도구를 포함한 전체 빌드 환경은 준비된 것으로 판정하지 않았다. 실기기·브라우저 수동 확인, 실제 AI/모델 다운로드, 온라인 배포·managed-linux, 깨끗한 `npm ci`는 미실행이다. `db:init`도 현재 개인 DB에 쓰지 않기 위해 실행하지 않았다.

후속 범위는 앞의 2~6단계 계획을 유지한다. 2단계는 공개 문서·과거 자료의 이동과 링크·명령 정합성, 3단계는 UI 55개·훅·D1 예제와 관련 패키지의 삭제 직전 재확인, 4단계는 앱·테스트·브랜드 이동과 실행 경로·ignore·개인 상태 보존, 5단계는 동작을 유지한 책임 분리, 6단계는 깨끗한 설치와 환경별 통합 검증이다. 이번 기록의 삭제 후보를 삭제 확정이나 다음 단계 수행으로 간주하지 않는다.

## 2단계 실제 수행 기록 — 자료 정리

수행일: 2026-10-02 (Asia/Seoul), Windows PowerShell / Node 24.14.0. 상태: 완료. 학습 문서는 `docs/refactoring-study.md`에 유지했다. 1단계 기록의 경로·결과는 당시 조사 증거이므로 소급 수정하지 않았으며, 다시 사용할 요청문의 테스트 문서 경로만 갱신했다.

### 문제 → 판단 → 선택

현재 운영 안내, 제품 의도, 발표 대본, 과거 감사 자료가 섞여 현재 구현으로 오해할 수 있었다. 문서 제목·본문·참조와 1단계 결과를 대조해 사용 목적에 따라 분리했다. 40개 파일을 개별 이동하고 기존 파일을 중복으로 간주해 삭제·병합하지 않았다. 실제 자료가 있는 폴더만 만들었다.

- 기술문서 12개는 `docs/engineering/`으로 이동했다. Codex 활용 문서는 프로젝트 개발 경험이므로 이 묶음에 포함했다.
- 제품 요구·소개·효과 기능·공개 영상 후보 5개는 `docs/product/`, 발표 대본 2개는 `docs/presentations/`으로 이동했다. 자료의 원문은 유지하고 각 목록에서 현재 구현과 구별했다.
- 인수인계 감사 10개는 `archive/handoff-2026-10-01/audit/`, 디자인 참고 3개는 `archive/design/`으로 이동했다. 감사 데이터의 해시·원본 경로는 당시 증거라 바꾸지 않았다.
- 과거 사전·스키마·README와 원문·변환기 5개를 `archive/taxonomy/`에 모았다. 루트 변환기 사용 참조를 조사한 결과 현재 앱 package·빌드는 웹 내부 생성기만 사용했다. 동일 이름의 현재/과거 YAML을 합치지 않았다.
- 이전 문서 정리 기록, 초기 아이디어 메모, 행사 공개 예제는 각각 archive의 documentation·planning·event에 보관했다. 공개 예제와 비공개 안내 원문은 별개다.

### 이동 전후 경로 — 저장소 루트 기준

| 이전 | 이후 |
|---|---|
| `docs/android.md` | `docs/engineering/android.md` |
| `docs/architecture.md` | `docs/engineering/architecture.md` |
| `docs/development.md` | `docs/engineering/development.md` |
| `docs/lan.md` | `docs/engineering/lan.md` |
| `docs/licenses.md` | `docs/engineering/licenses.md` |
| `docs/lint-notes.md` | `docs/engineering/lint-notes.md` |
| `docs/security.md` | `docs/engineering/security.md` |
| `docs/setup.md` | `docs/engineering/setup.md` |
| `docs/tagging.md` | `docs/engineering/tagging.md` |
| `docs/testing-details.md` | `docs/engineering/testing-details.md` |
| `docs/testing.md` | `docs/engineering/testing.md` |
| `docs/codex 활용법.md` | `docs/engineering/codex 활용법.md` |
| `docs/구현 범위 요약 개정판.md` | `docs/product/구현 범위 요약 개정판.md` |
| `docs/문제 정의서.md` | `docs/product/문제 정의서.md` |
| `docs/서비스 소개문.md` | `docs/product/서비스 소개문.md` |
| `docs/영상 후보군.md` | `docs/product/영상 후보군.md` |
| `docs/유사 효과 탐색 카드 기능 설명.md` | `docs/product/유사 효과 탐색 카드 기능 설명.md` |
| `docs/서비스 소개 발표문.md` | `docs/presentations/서비스 소개 발표문.md` |
| `docs/컷노트_3분발표_5분QnA.md` | `docs/presentations/컷노트_3분발표_5분QnA.md` |
| `docs/cleanup.md` | `archive/documentation/cleanup.md` |
| `docs/아이디어 베끼기.md` | `archive/planning/아이디어 베끼기.md` |
| `docs/참가자-허브.example.md` | `archive/event/참가자-허브.example.md` |
| `docs/분류 후보군_개정판.md` | `archive/taxonomy/분류 후보군_개정판.md` |
| `scripts/generate-taxonomy.mjs` | `archive/taxonomy/generate-taxonomy.mjs` |
| `main/handoff-package/audit/THIRD_PARTY_DEPENDENCIES.csv` | `archive/handoff-2026-10-01/audit/THIRD_PARTY_DEPENDENCIES.csv` |
| `main/handoff-package/audit/copy-records.json` | `archive/handoff-2026-10-01/audit/copy-records.json` |
| `main/handoff-package/audit/environment-variable-names.txt` | `archive/handoff-2026-10-01/audit/environment-variable-names.txt` |
| `main/handoff-package/audit/exclusion-records.json` | `archive/handoff-2026-10-01/audit/exclusion-records.json` |
| `main/handoff-package/audit/original-baseline.json` | `archive/handoff-2026-10-01/audit/original-baseline.json` |
| `main/handoff-package/audit/original-preservation.json` | `archive/handoff-2026-10-01/audit/original-preservation.json` |
| `main/handoff-package/audit/package-inventory.csv` | `archive/handoff-2026-10-01/audit/package-inventory.csv` |
| `main/handoff-package/audit/security-review.json` | `archive/handoff-2026-10-01/audit/security-review.json` |
| `main/handoff-package/audit/validation-results.json` | `archive/handoff-2026-10-01/audit/validation-results.json` |
| `main/handoff-package/audit/work-file-review.csv` | `archive/handoff-2026-10-01/audit/work-file-review.csv` |
| `main/handoff-package/reference/design/README.md` | `archive/design/README.md` |
| `main/handoff-package/reference/design/export-cutnote-logo.py` | `archive/design/export-cutnote-logo.py` |
| `main/handoff-package/reference/design/logo-outline.swift` | `archive/design/logo-outline.swift` |
| `taxonomy/README.md` | `archive/taxonomy/README.md` |
| `taxonomy/taxonomy.schema.json` | `archive/taxonomy/taxonomy.schema.json` |
| `taxonomy/taxonomy.v2.yaml` | `archive/taxonomy/taxonomy.v2.yaml` |

추가한 파일은 `docs/engineering/README.md`, `docs/product/README.md`, `docs/presentations/README.md`, `archive/README.md` 4개다. 기존 `docs/README.md`를 전체 목록으로 갱신했다. 시작의 공개 후보 313개에서 이동 후 실재 파일 317개로 증가했으며, 이동 40개 자체는 파일 수를 줄이지 않는다. 실제 Git 인덱스는 변경하지 않아 status에는 이전 경로 삭제와 새 경로 미추적으로 표시된다.

### 참조·도구 변경

루트 README, 문서 목록, 기술문서 간 상대 링크, 앱·Android·Bridge·테스트·라이선스 안내 README의 링크를 새 위치에 맞췄다. 구조·개발·태깅·보안 안내와 검증 기록의 현재 참조도 갱신했다. 과거 감사 JSON/CSV의 내부 경로와 학습 문서의 1단계 경로는 역사적 증거로 남겼다. 이전 cleanup 본문은 당시 기록임을 표시하고 현재 이동표를 연결했다.

과거 변환기는 스크립트 폴더의 원문을 읽고 같은 폴더의 YAML에 쓰도록 수정했다. 쓰기 없는 `--check`를 추가해 기존 보관 YAML을 비교했으며 12 namespaces / 403 tags / 7 relations가 일치했다. 변환 로직·원문·YAML·스키마는 변경하지 않았다. 현재 웹 생성기와 그 입력·출력은 손대지 않았다.

디자인 도구는 과거 outputs/work 경로와 macOS 폰트 환경에 결합된 참고 소스다. 새 위치에서 현재 자산을 덮어쓰는 도구로 바꾸지 않았고, README의 고지·자산 링크만 고쳤다. 별도 `material/` PNG와 인수인계 SVG는 출처가 달라 삭제하지 않았다. 없는 PC 시작 .command 안내는 Android·LAN 양쪽에서 실제 `node cutnote-android/launcher.mjs`로 수정했다. 존재하는 `bridge/start.command`는 Bridge 전용으로 설명했다.

공개 검사 스크립트의 필수 앱 경로, 검토된 PNG 경로, 개인 자료 제외 경로는 이번 이동 대상이 아니므로 규칙을 변경할 필요가 없었다. 과거 생성기의 이전 위치를 실행하는 현재 스크립트 참조도 없었다.

### 보존한 로컬 자료

`main/outputs/`, `main/work/`, 중첩 인수인계, `docs_ext/`, `example/`, 제외 legacy, 개인 화면 PDF·참가 안내문, `.wrangler/` DB·미디어, 키·서명·연결 설정은 이동·복사·삭제하지 않았다. 별도 보관 목록은 [archive 보존 정책](../archive/README.md)에 기록했다. Git 제외 목록은 작업 전후 일치한다. 내부 전체 파일 해시·내용 검사는 하지 않았으며 새 검사 산출물만 기존 제외 경로 `.security-checks/`에 기록했다.

### 검증과 한계

| 검사 (저장소 루트 기준) | 결과 | 해석 |
|---|---|---|
| 이동표 40개 및 이전 공개 파일 전체 존재 대조 | 통과 | 목적지 누락 없음, 앱 실행 소스·설정·잠금파일 변경 없음 |
| 보존 파일 SHA-256 비교 | 15개 일치 | 감사 10개, 디자인 코드 2개, 과거 YAML·스키마·원문 3개 원본 보존 |
| 공개 Markdown 인라인 로컬 링크 검사 | 115개 통과 | 파일·디렉터리 대상 존재 확인. 외부 URL·페이지 내용·앵커 의미까지 검증하지 않음 |
| `node archive/taxonomy/generate-taxonomy.mjs --check` | 종료 0 | 기존 YAML과 생성 결과 일치, 쓰기 없음 |
| `node --check archive/taxonomy/generate-taxonomy.mjs` | 종료 0 | 변환기 구문 검사 |
| `node main/handoff-package/cutnote/scripts/generate-taxonomy.mjs --check` | 종료 0 | 현재 앱 사전과 생성물 일치, 12 namespaces / 403 tags |
| `node --test scripts/publication-secrets.test.mjs` | 종료 0, 4/4 | 공개 검사기 회귀 검사 |
| `git diff --check` 및 미추적 Markdown 공백 검사 | 통과 | 새로 추가·변경된 줄의 후행 공백 없음; 기존 원문 공백은 보존 |
| `node scripts/check-publication.mjs` | 종료 0 | 작업 트리 텍스트 315개·PNG 2개 및 기존 인덱스 312개 통과 |
| `node scripts/verify-publication-index.mjs` | 종료 0 | 격리 인덱스 후보 317개 통과, 실제 인덱스 해시 불변 |

일반 공개 검사의 후보 수 357은 Git에 남은 이전 경로 40개까지 센 값이다. 실재 파일은 317개이며 격리 인덱스 검사가 이동을 반영한 최종 공개 집합을 확인했다. 원본 PNG 2개는 기존 검토 해시와 일치했다. 이번 검사 실패나 환경 제한으로 중단된 검사는 없었다.

앱 동작·패키지·빌드 설정을 변경하지 않아 1단계의 lint·타입·웹 11/11·Bridge 18/18·JVM 211개·빌드 결과를 기준선으로 유지하고 이번에는 반복 실행하지 않았다. APK·실기기·실제 AI·배포·깨끗한 설치의 미검증 상태도 유지된다. 과거 디자인 도구의 실행은 이번 범위 밖이다.

### 후속 범위와 되돌리기

3단계에서 UI 55개·훅·D1 예제와 관련 의존성을 삭제 직전에 다시 조사한다. 웹·Android·테스트·브랜드 경로와 개인 상태 이전은 4단계 범위이며 이번에 미리 수행하지 않았다.

되돌릴 때는 위 이동표를 역방향으로 적용하고 이번 링크·안내·과거 생성기 경로/검사 옵션 변경 및 새 목록 4개만 되돌린다. 이전부터 있던 `docs/README.md`와 학습 기록 변경을 통째로 초기화하지 않는다. 감사 원본·현재 앱 사전·개인 데이터의 복원이나 삭제는 필요하지 않다.

배운 점: 과거 기록의 경로는 증거이고 현재 안내의 경로는 실행 계약이다. 전자는 원문을 보존하고 후자는 이동과 함께 갱신해야 한다. Git 제외 보관본은 공개 archive와 성격이 달라 일괄 이동하지 않는다.

## 3단계 실제 수행 기록 — 미사용 UI·훅·예제와 의존성 제거

수행일: 2026-10-02 (Asia/Seoul). 환경: Windows PowerShell / Node 24.14.0 / npm 11.9.0. 상태: 완료. 앞선 1·2단계 작업 트리를 유지하며 현재 웹 폴더 `main/handoff-package/cutnote/`만 정리했다. 앱 경로 이동·기능 분리·버전 업그레이드·전체 재서식은 하지 않았다.

### 삭제 판단과 확인 범위

TypeScript AST와 프로젝트 tsconfig의 모듈 해석으로 import/export, 타입 import, 문자열 동적 import/require를 추적했다. 실제 진입점은 웹 `app/` 아래 page 2개·layout 1개·API route 16개, 총 19개다. 예제의 `examples/d1/app/`는 앱 라우트 루트가 아니므로 실제 진입점에 포함하지 않았다. 앱에서 도달하는 UI는 6개였다.

삭제 판단은 이 그래프만으로 끝내지 않았다. UI·hooks·examples 외의 웹 소스·build·scripts·설정도 보수적으로 시작점에 넣었고, 형제 tests의 명시적 실행 목록과 import, 루트 공개 도구, CSS·public URL·문서 참조도 대조했다. 후보에서 후보로 이어지는 간접 import는 있었지만 유지 파일에서 삭제 대상으로 들어오는 import는 없었다. 계산된 `import(cli.href)`는 실행 프로필별 Vite/Vinext CLI, 테스트의 동적 import는 11개 스위트, Worker의 외부 import는 Transformers 모듈이었다. 후보 UI를 동적으로 선택하거나 glob 로딩하는 경로는 발견하지 못했다.

| 대상 | 실제 처리 | 근거 |
|---|---|---|
| `components/ui/` 55개 | 삭제 | 앱 19개 진입점과 추가 빌드·도구 그래프에서 도달하지 않음. 테스트·public URL 참조 없음 |
| `hooks/use-mobile.ts` | 삭제 | 사용처가 삭제 대상 `sidebar.tsx`뿐 |
| `examples/d1/app/api/notes/route.ts`, `examples/d1/db/schema.ts` | 삭제 | 별도 예제, 기존 tsconfig exclude 대상. 현재 API·DB는 app/api와 db에 있고 예제를 로딩하지 않음 |
| `eslint.config.mjs` | 해당 훅 경로만 제거 | 남은 UI의 기존 lint 예외는 유지 |
| `tsconfig.json` | examples exclude만 제거 | 삭제된 예제를 가리키는 설정 정리 |

삭제한 UI 파일의 전체 목록(웹 `components/ui/` 기준):

```text
accordion.tsx alert.tsx aspect-ratio.tsx attachment.tsx
avatar.tsx badge.tsx breadcrumb.tsx bubble.tsx
button-group.tsx calendar.tsx card.tsx carousel.tsx
chart.tsx checkbox.tsx collapsible.tsx combobox.tsx
command.tsx context-menu.tsx direction.tsx drawer.tsx
dropdown-menu.tsx empty.tsx field.tsx form.tsx
hover-card.tsx input-group.tsx input-otp.tsx input.tsx
item.tsx kbd.tsx label.tsx marker.tsx
menubar.tsx message-scroller.tsx message.tsx native-select.tsx
navigation-menu.tsx pagination.tsx popover.tsx progress.tsx
radio-group.tsx resizable.tsx scroll-area.tsx select.tsx
separator.tsx sidebar.tsx skeleton.tsx slider.tsx
spinner.tsx switch.tsx table.tsx textarea.tsx
toggle-group.tsx toggle.tsx tooltip.tsx
```

총 소스 삭제는 58개다. 남은 UI 6개의 본문은 변경하지 않았다. 현재 구조·개발 문서의 훅 및 lint 예외 안내를 갱신했고, 과거 분류표·감사 원문은 당시 기록으로 유지했다.

### 유지한 후보와 의존성의 이유

- `alert-dialog`, `dialog`, `sheet`, `tabs`, `sonner`: app/cutnote 및 AI·보관함 연결 UI에서 사용한다. `button`은 dialog·alert-dialog에서 간접 사용되므로 직접 앱 import가 적다는 이유로 삭제하지 않았다.
- `components/connector-error.tsx`: 실제 app 진입점 그래프에서는 도달하지 않지만 이번 삭제 대상으로 좁힌 ui·hooks·examples 바깥의 connector 통합 UI라 유지했다. 향후 connector 미리보기 오류 흐름과 함께 조사할 항목이며, 유지가 현재 화면의 사용을 입증한다는 뜻은 아니다.
- `lib/analysis/link.ts`, `video.ts`, `public/analysis-worker.js`: 현재 화면의 whole-video 경로와 별개지만 link → video의 프레임 함수와 공개 Worker URL 계약이 남는다. 외부 URL 사용까지 부재를 증명하지 못해 이번에 삭제하지 않았다. `favicon.svg`도 metadata URL로 사용한다.
- `components.json`의 `@/hooks` 별칭은 shadcn 생성 위치 설정이다. 파일을 실행하는 import가 아니므로 훅 삭제 후에도 생성 규칙으로 유지했다.
- `next-themes`·`sonner`는 남은 알림 UI, `radix-ui`·`class-variance-authority`는 남은 UI, `clsx`·`tailwind-merge`는 lib/utils에서 사용한다.
- `@vitejs/plugin-react`, `@vitejs/plugin-rsc`, `react-server-dom-webpack`는 직접 앱 import가 없어도 설치된 Vinext의 peer 요구다. `@cloudflare/vite-plugin`, Vite/Vinext, Wrangler는 빌드·실행, Drizzle은 실제 DB·migration, ajv·js-yaml은 현재 사전 생성, json-rpc-2.0·raw-body·zod는 connector 도구에서 사용한다.
- Tailwind·tw-animate-css·vendor CSS는 globals.css, PostCSS 플러그인은 postcss.config, workers·React·Node 타입은 tsconfig·타입 검사에 필요하다. ESLint·TypeScript와 나머지 개발 의존성 22개를 유지했다.

### 패키지와 lockfile 변경

| 제거한 직접 의존성 | 제거 근거 |
|---|---|
| @base-ui/react | 삭제한 combobox에서만 import |
| @shadcn/react | 삭제한 message-scroller에서만 import; vendor CSS는 별도 파일 |
| cmdk | 삭제한 command에서만 import |
| embla-carousel-react | 삭제한 carousel에서만 import |
| input-otp | 삭제한 input-otp에서만 import |
| react-day-picker | 삭제한 calendar에서만 import |
| react-hook-form | 삭제한 form에서만 import |
| react-resizable-panels | 삭제한 resizable에서만 import |
| recharts | 삭제한 chart에서만 import |
| vaul | 삭제한 drawer에서만 import |
| @hookform/resolvers | 소스·설정·도구·테스트 사용처 없음. react-hook-form을 요구하는 폼 보조 의존성 |
| date-fns | 직접 사용처 없음. 제거하는 react-day-picker의 의존성, @base-ui/react의 optional peer에만 필요 |

삭제 후보 12개에 대한 잠금파일의 dependencies·optionalDependencies·peerDependencies 역참조도 확인했다. 유지 패키지가 요구하는 후보는 없었다. 웹에서 다음 명령을 실행해 npm이 package.json·package-lock.json과 설치 트리를 함께 정리했다.

```powershell
npm uninstall @base-ui/react @hookform/resolvers @shadcn/react cmdk date-fns embla-carousel-react input-otp react-day-picker react-hook-form react-resizable-panels recharts vaul --offline --ignore-scripts --no-audit --no-fund
```

직접 dependencies는 25 → 13, devDependencies는 22개 그대로다. lockfile의 설치 경로 레코드는 루트 제외 873 → 817, 총 56개 감소했고 새 레코드는 없다. 남은 모든 레코드의 version·resolved·integrity와 남은 직접 의존성 버전 범위는 변경하지 않았다. npm은 7개 잔존 레코드(ajv 계열 등)의 dev/devOptional 도달성 플래그만 재계산했다. 잠금파일을 수동으로 재작성하거나 재해석해 버전을 올리지 않았다.

### 검증 결과

작업 디렉터리는 별도 표시가 없으면 웹 폴더다. 의존성 제거 후 설치 트리에서 실행했다.

| 명령·검사 | 결과 | 확인 범위 |
|---|---|---|
| `npm ls --depth=0` | 종료 0 | 남은 직접 의존성의 설치·버전 정합성 |
| lockfile 전후 구조 비교 | 통과 | 제거 56개 / 추가·버전·resolved·integrity 변경 0개 |
| 삭제 파일 존재·잔존 import 검사 | 통과 | 58개 삭제 확인, 유지 파일에서 후보로 향하는 import 0개 |
| `npm run lint` | 종료 0 | 오류·경고 출력 없음 |
| `npx --no-install tsc --noEmit --incremental false` | 종료 0 | 자동 다운로드 없이 타입 검사 |
| `npm test` | 종료 0, 11/11 | 사용자 검수·구간·검색·피드백·미디어·동기화 등 기존 오프라인 회귀 |
| `npm run build` | 종료 0 | 현재 사전 검증 및 RSC·client·SSR 빌드 완료 |
| 루트 / Markdown 링크·`git diff --check` | 통과 | 로컬 링크 115개 존재, 공백 오류 없음 |
| 루트 / `node scripts/verify-publication-index.mjs` | 종료 0 | 공개 후보 259개(텍스트 257·PNG 2), 실제 인덱스 해시 불변 |

웹 테스트는 1단계에서 확인한 esbuild 상위 경로 접근 제한을 피하려고 처음부터 제한 밖에서 실행했다. 이번 테스트 assertion 실패는 없다. Gemini 402·cleanup 재시도·SQLite experimental 출력은 기존 모의 오류 검사/런타임 안내다. 빌드는 이전 native config loader·Vinext CLI·ineffective dynamic import 경고와 라우트 자동 분류 한계 안내를 남겼으며, 추가로 번들 callback timing/debugName 진단도 출력했다. 경고 억제나 패키지 갱신은 하지 않았다.

이번 정리로 Tailwind가 탐색할 미사용 컴포넌트 클래스가 줄었다. 1단계 출력의 CSS 201.42 kB와 이번 88.69 kB는 로컬 빌드 참고값이며 화면 동등성이나 실제 네트워크 성능 측정 결과로 해석하지 않는다.

### 한계·문제 해결·되돌리기

삭제 목록 로딩의 첫 PowerShell 실행은 lockfile 루트의 빈 JSON 키를 ConvertFrom-Json 기본 모드가 처리하지 못해 파일을 삭제하지 않았다. `-AsHashtable`로 읽고 작업 영역 안의 정확한 파일 58개임을 확인한 뒤 개별 삭제했다. 앱 코드 변경으로 생긴 테스트 실패와 구별한다.

브라우저 수동 UI·Android APK/실기기·실제 AI·온라인 배포·managed-linux 프로필과 깨끗한 npm ci는 이번에 검증하지 않았다. Bridge·JVM 소스는 변경하지 않았고 해당 검사는 1단계 결과를 기준선으로 유지했다. DB·미디어·키·마이그레이션·Git 제외 보관본은 수정하지 않았다. npm uninstall은 설치 트리를 정리했고 빌드는 제외된 출력 디렉터리를 갱신했다.

되돌릴 때는 이 절의 58개 소스와 package.json·package-lock.json을 같은 변경 단위로 복원하고, ESLint/tsconfig의 삭제한 설정 항목을 복원한 뒤 의존성을 설치한다. 앞선 2단계 문서 이동이나 개인 상태를 reset/삭제하지 않는다. 다음 4단계는 앱·테스트·브랜드 경로 변경이며, 아직 수행하지 않았다.

배운 원칙: 앱의 import 부재만으로 패키지를 제거하면 CSS·CLI·peer 의존성을 놓친다. 파일 도달성과 설치 그래프를 함께 확인하고 삭제 후 실제 설치 트리에서 lint·타입·테스트·빌드를 통과시켜야 한다.

## 4단계 실제 수행 기록 — 앱 중심 경로와 테스트 명명

수행일: 2026-10-02 (Asia/Seoul). 환경: Windows PowerShell / Node 24.14.0 / npm 11.9.0. 상태: 완료(로컬 실행·데이터 보존 검증, 실기기·배포 환경은 아래 한계 참조). 학습 문서는 `docs/refactoring-study.md`에 유지했다. 이전 단계 기록의 경로는 작업 당시 증거라 소급 변경하지 않았다.

### 판단과 이동 전후 경로

인수인계 폴더 구조에 실행기·테스트·안내가 결합되어 있었다. 앱을 역할별로 묶되 소스 경로만 바꾸고 저장소 식별자·migration·기능은 유지했다. 공개 파일 202개를 이동했고, 파일 수는 259개 그대로다. 웹과 Android 디렉터리는 활성 로컬 설정·상태를 포함해 이동했으며 제외 보관본 전체를 이동한 것은 아니다.

| 이전 경로 | 이후 경로 | 범위·판단 |
|---|---|---|
| main/handoff-package/cutnote/ | apps/web/ | 공개 151개와 활성 node_modules·생성물·.wrangler·.sites-runtime 등 체크아웃 로컬 파일 함께 이동 |
| main/handoff-package/cutnote-android/ | apps/android/ | 공개 30개, bridge 포함. 제외 .env.example도 로컬 상태 그대로 이동 |
| main/handoff-package/tests/ | tests/ | 공개 14개, 실행기는 tests/run-web.mjs에 유지 |
| main/handoff-package/assets/logos/ | assets/branding/ | SVG 4개, 원본 바이트 유지 |
| material/ | assets/branding/ | PNG 2개, 검토 해시 유지 |
| main/handoff-package/.env.example | apps/.env.example | 공통 환경 예제. apps/web에서 ../.env.example로 참조 가능 |

테스트는 다음과 같이 이름을 바꿨다. `mock-cloudflare.ts`는 실행 스위트가 아닌 테스트용 바인딩 모듈이므로 이름을 유지했다. Bridge의 `server.test.mjs`는 이미 규칙에 맞고 Java 테스트는 JVM 이름을 유지한다.

| 이전 tests/web 파일명 | 새 tests/web 파일명 |
|---|---|
| discovery-order-check.ts | discovery-order.test.ts |
| favorites-review-tests.ts | favorites.test.ts |
| full-video-tests.ts | full-video.test.ts |
| image-search-review-tests.ts | image-search.test.ts |
| recommendation-review-tests.ts | recommendation.test.ts |
| segment-independent-review-tests.ts | segment-independent.test.ts |
| segment-media-review-tests.ts | segment-media.test.ts |
| segment-retag-parser-review-tests.ts | segment-retag-parser.test.ts |
| segment-tagging-current-review-tests.ts | segment-tagging-current.test.ts |
| sync-polling-tests.mjs | sync-polling.test.mjs |
| youtube-public-search-tests.ts | youtube-public-search.test.ts |

### 함께 수정한 참조

- 웹 `package.json`과 lockfile의 루트 name을 `site-creator-vinext-starter` → `cutnote-web`으로 바꿨다. lockfile은 이름 외 내용·버전·무결성 값이 모두 같다. npm test는 `node ../../tests/run-web.mjs`를 실행한다.
- 실행기는 저장소 루트·apps/web·tests/web를 자신의 import.meta.url에서 찾는다. 11개 명시적 스위트 목록을 새 이름으로 수정하고 내부 import는 `../../apps/web/`, migration·polling 소스 읽기는 `apps/web/`로 변경했다. 메모리 DB·mock fetch·환경변수 격리·임시 bundle 정리 역할은 그대로다.
- Android Bridge의 findProject는 apps/android에서 상위를 따라 형제 web 또는 apps/web를 찾는다. 실제 이동 경로를 검증하는 회귀 검사 1개를 추가해 Bridge는 18 → 19개 검사가 됐다. 실행기는 기존 start-pc와 dist/server/wrangler.json 요구를 유지한다.
- 설치·빌드·DB 도구의 projectRoot는 import.meta.url 또는 스크립트 위치로 계산하므로 본문을 바꿀 필요가 없었다. 앱 내부 상대 import와 @/ 별칭, public URL도 유지했다. 웹 사전 생성 경로와 .gitignore는 앱에 상대적이어서 함께 이동했다.
- 루트 .gitignore의 Android build 경로, 공개 검사 필수 소스·환경 예제 경로, reviewed-media.json의 PNG 키를 갱신했다. 기존 main/outputs·main/work·중첩 보관본 차단 규칙은 그대로다. Android의 제외 .env.example은 공개로 전환하지 않았다.
- 공개 검사에서 인덱스 검증과 작업 트리 경로를 섞지 않도록 수정했다. --index는 선택한 manifest에 따라 이전/현재 앱 루트를 확인하고 디스크 존재 대신 인덱스 blob을 검사한다. 실제 인덱스가 이전 단계 상태여도 이를 건너뛰지 않고 검사한다.
- README·설치·테스트·구조·Android/LAN·라이선스 링크와 현재 archive 안내를 갱신했다. 과거 audit 파일 내부 경로·해시와 테스트의 원본 work 파일명은 과거 기록으로 보존했다.
- .openai/hosting.json의 DB·BUCKET 바인딩 및 Vite의 상대 build Worker 경로는 그대로 유효하다. 새 빌드는 apps/web/dist를 재생성했고 worker name은 cutnote-web이다. D1 database_id/database_name 및 R2 bucket_name은 저장소 식별자이므로 이름 정리를 이유로 바꾸지 않았다. 온라인 호스팅 설정 변경·배포는 하지 않았다.

### 로컬 DB·미디어 보존 — 완료 판정의 근거

1. 실행 중인 5173·5174 서비스가 없는 상태에서 기존 .wrangler/state를 조사했다. 상태 파일 21개, 실제 D1 migration 이력 9개, clips·ai_settings·segment_media·추천 피드백·순서·탐색 레코드는 모두 0개였다. 기존 미디어 객체도 없었다. 비공개 파일 내용·키는 출력하거나 공개 문서에 저장하지 않았다.
2. 상태 21개를 제외 경로 `.security-checks/stage4-state-backup/`에 복사해 보존하고, 웹 폴더 전체를 apps/web로 이동했다. 서버를 띄우기 전 상대 경로별 SHA-256 21개가 모두 일치했다. 별도 main/outputs 등의 개인 보관본은 읽어 들여 가져오지 않았다.
3. 새 서버 시작 후 기존 D1 테이블과 migration 이력의 전체 행을 메모리에서 비교한 결과 이동 전 백업과 같았다. /api/clips는 정상 200과 기존 빈 보관함을 반환했다. 원래 레코드가 없는 상태였으므로 실제 개인 클립 재생을 검증했다고 쓰지 않는다. 서버 실행이 만든 런타임 내부 상태·로그의 바이트 변화와 사용자 테이블 변경은 구분했다.
4. 빈 보관함만으로 R2 보존을 입증하지 않기 위해 **별도 상태 사본**에 실제 앱 API로 합성 클립 1개와 12바이트 WebM 형식의 테스트 파일을 저장했다(재생용 영상은 아님). 서버를 종료하고 사본 디렉터리를 이동한 뒤 worker name도 이전 이름에서 cutnote-web으로 바꿔 다시 시작했다. 같은 클립 ID와 GET /api/media 응답 바이트가 일치했다. 실제 apps/web/.wrangler에는 합성 자료를 쓰지 않았다.
5. DB migration SQL 9개와 meta 10개, 총 19개는 이름·내용 해시가 모두 같다. 브랜드 6개도 해시가 같다. .wrangler·node_modules·dist·사전 생성 JSON/TS가 새 경로에서도 Git 제외되는지 확인했다. 검사 사본·백업은 .security-checks에 남기고 커밋/공개하지 않았다.

### 검증 결과

웹 명령은 apps/web, 나머지는 저장소 루트에서 실행했다.

| 명령·검사 | 결과 | 비고 |
|---|---|---|
| npm run lint | 종료 0 | 오류·경고 없음 |
| npx --no-install tsc --noEmit --incremental false | 종료 0 | 새 앱 경로 타입 검사 |
| npm test | 11/11, 종료 0 | 새 이름·목록·import·migration 읽기·polling 소스 모두 검사 |
| npm run build | 종료 0 | 현재 사전 검증 및 RSC·client·SSR 완료 |
| node --test apps/android/bridge/server.test.mjs | 19/19, 종료 0 | 기존 18개 + 새 레이아웃 탐색 |
| node --test scripts/publication-secrets.test.mjs | 4/4, 종료 0 | 공개 검사기 회귀 |
| node scripts/check-publication.mjs | 종료 0 | 작업 트리 실재 259개와 기존 인덱스 312개 모두 통과 |
| node scripts/verify-publication-index.mjs | 종료 0 | 격리 인덱스 259개, 실제 인덱스 해시 불변 |
| 로컬 상태·migration·브랜드·lock 비교 | 통과 | 상태 이동 직후 21개, migration 19개, 브랜드 6개 동일; lock은 이름만 변경 |
| 로컬 실행기 통합 확인 | 통과 | 실제 start-pc → Wrangler → PC API 및 실제 Bridge 연결 |
| 합성 DB·R2 사본의 경로/이름 이동 | 통과 | 클립 ID·미디어 바이트 동일 |
| Markdown 링크 및 git diff --check | 통과 | 로컬 링크 117개 존재, 미추적 Markdown의 새 후행 공백도 없음 |

로컬 통합 검사에서는 Android launcher의 launch를 호출해 직접 PC 프로세스와 Bridge를 시작했다. /api/ai/status의 pc 상태, /api/clips의 직접/Bridge 조회 일치, /·/mobile·/favicon.svg의 HTTP 200을 확인했다. pairing 상태는 제외된 임시 검사 폴더에 저장했고 실제 Android 연결 코드를 만들거나 바꾸지 않았다. 검사에서 시작한 프로세스 트리만 종료했으며 검사 후 5173·5174는 열려 있지 않았다.

### 문제 해결과 미검증 범위

- 기본 샌드박스의 로컬 시작은 esbuild가 상위 디렉터리를 읽지 못해 실패했다. npm start의 Access denied를 확인하고 같은 코드로 제한 밖에서 재실행해 통과했다. 웹·Bridge 검사는 앞 단계에서 확인한 esbuild/ACL 제약 때문에 처음부터 제한 밖에서 실행했다. 코드 결함으로 수정한 실패는 없었다.
- 빌드는 이전 native config loader·Vinext CLI 전환·ineffective dynamic import·라우트 자동 분류 한계 및 callback timing/debugName 안내를 유지한다. 이 단계에서 버전 변경이나 경고 억제를 하지 않았다.
- 기존 APK build.sh의 스크립트 상대 경로는 유지했으나 Android SDK·서명 환경이 준비되지 않아 APK 빌드·설치·실기기 연결은 미검증이다. LAN Bridge의 HTTP 연결 확인을 휴대폰 실기기 검증으로 대신하지 않는다. JVM 소스·패키지는 바꾸지 않았다.
- 브라우저 화면 수동 조작·영상 실제 재생, 유료 AI, 깨끗한 npm ci, managed-linux 설치·빌드, 온라인 배포는 미실행이다. 설치 스크립트의 상대 경로는 정적으로 확인했고 현재 설치 트리를 이동해 검증했다.
- 제외 보관본에 있는 다른 개인 DB를 현재 보관함으로 자동 가져오지 않았다. 이번 보존 검증의 대상은 이동 전 활성 웹의 .wrangler/state다.

### 후속 단계와 되돌리기

5단계는 apps/web 안의 책임별 코드 분리이며 이번에는 기능 변경을 섞지 않았다. 되돌릴 때는 서버를 종료한 뒤 위 경로를 역이동하고 실행기·테스트 목록·패키지 이름·공개 검사·문서 링크 변경을 함께 되돌린다. 그 사이 새로 저장한 자료가 있으면 최신 .wrangler/state·환경 키·Android pairing을 우선 보존한다. 초기 백업으로 무조건 덮어쓰면 이후 기록을 잃으므로 복원 대상과 시점을 확인해야 한다. migration 이름과 내용은 바꿀 필요가 없다.

배운 점: 코드 경로 이동은 상대 import뿐 아니라 테스트 cwd·실행기 탐색·공개 manifest와 영속 저장소 식별에 영향을 준다. 파일 이동 직후 해시, 실제 서버의 기존 데이터 조회, 별도 사본의 DB/R2 재조회까지 확인해야 소스 빌드 성공과 데이터 보존을 구별할 수 있다.

## 5단계 실제 수행 기록 — 2026-10-02

상태: **완료**. 학습 문서는 `docs/refactoring-study.md`에 유지했다. 4단계 완료 시점의 작업 트리를 기준으로 진행했고, 이전 단계의 미커밋 변경을 되돌리거나 인덱스에 올리지 않았다. 이번 단계는 소스 책임 분리이며 DB·미디어 위치, API URL, migration, 패키지·lockfile, 기능은 변경하지 않았다.

### 분리 기준과 남겨 둔 경계

기존 `app/cutnote.tsx`에는 보관함 조회·순서·검색, 편집 상태, 분석 요청, 입력 병합, 화면이 함께 있었다. 먼저 같은 취소·버전 규칙을 공유하는 보관함 동기화와 분석 요청을 각각 훅으로 옮겼다. 상태를 단순히 파일마다 나누지 않고, 저장 성공 시 목록·선택·편집기를 함께 갱신하는 조정은 하나의 컨트롤러에 남겼다.

| 새 위치 (`apps/web/` 기준) | 소유하는 책임 | 밖으로 전달하는 것 |
|---|---|---|
| `features/library/use-library-sync.ts` | 목록·순서 상태, 요청 버전, 12초 timeout, 5초 polling, focus/online/visibility/native sync, 공유 clip 선택 | 목록·표시 상태, refresh, 컨트롤러가 사용하는 상태 setter와 요청/순서 ref |
| `features/library/use-clip-analysis.ts` | 분석 상태·AbortController·링크 debounce timer, OpenAI/Gemini 요청, 링크 해석·포스터 응답의 유효성 확인, 종료 정리 | 분석 상태와 시작·취소 동작. 유효한 결과만 편집기의 completeAnalysis로 전달 |
| `features/library/use-library-workspace.ts` | 검색·선택·편집 세션, 수동 입력 보호, 검수 태그 병합, 저장·삭제·즐겨찾기·순서 변경 후 목록 갱신, AI 연결 후 재개 | 화면 상태와 사용자 동작. 화면에는 내부 ref를 노출하지 않음 |
| `features/library/library-workspace.tsx` | 보관함 탐색·검색·카드·연결 UI 구성 | 컨트롤러를 한 번 호출하고 편집·상세 화면에 상태·동작 전달 |
| `features/library/clip-editor-dialog.tsx` | 등록·수정·분석 상태·태그/구간 입력 표시 | props로 받은 동작 호출. 자체 저장소·요청 상태를 새로 만들지 않음 |
| `features/library/clip-details-sheet.tsx` | 선택 클립 재생·검수·구간·수정/삭제 표시 | 필요한 상태·동작만 Pick 타입으로 명시 |
| `features/library/clip-draft.ts` | 편집 초깃값·필드 타입 | 컨트롤러와 분석 입력의 공유 계약 |
| `features/library/library-presentation.ts` | 반복 사용되는 태그 그룹 이름/아이콘·날짜 표시 | 보관함·편집·상세에서 같은 표시 기준 사용 |
| `features/segments/segment-drafts.ts` | 구간 입력 ↔ 저장 모델 변환, 범위 밖 근거 처리와 사용자 판단 보존 | 순수 함수. 테스트·컨트롤러가 SegmentEditor UI를 import할 필요 제거 |
| `lib/client-request.ts` | 기존 JSON 응답·HTTP 오류 처리 | 보관함·분석 훅에서 동일한 오류 계약 사용 |

파일 크기는 결과를 확인하는 보조 지표다. 기존 약 50KB 화면은 보관함 화면 약 13KB, 편집 약 9.7KB, 상세 약 4.7KB, 상태 조정 약 20KB, 동기화 약 3.7KB, 분석 요청 약 6.6KB로 나뉘었다. 중복 import와 명시적인 계약 때문에 전체 바이트가 줄어드는 작업은 아니다. 저장·선택·검수 상태가 밀접하게 함께 바뀌는 부분까지 별도 폴더나 일반화한 상태 관리 계층으로 나누지는 않았다.

`lib/clips.ts`, `lib/segments.ts`, `lib/tagging.ts`, `lib/taxonomy.ts`는 여러 기능·API·분석 파서가 공유하는 데이터 규칙이어서 공통으로 유지했다. `features/tagging`에는 검수 UI가 있고, 구간 재분석의 병합 정책은 구간 기능에 있다. 서버 제공자·DB·암호화 코드를 UI 파일 옆으로 무조건 이동하지 않았다. 공통 UI 6개는 `components/ui`, 공통 재생기는 `components/media`를 사용한다.

### 이동 전후 경로

아래 경로는 모두 `apps/web/` 기준이다. 파일명 목록으로 묶인 행은 각 파일을 같은 이름으로 이동했다.

| 이전 | 이후 | 판단 |
|---|---|---|
| `app/cutnote.tsx` | `features/library/library-workspace.tsx` 및 위의 훅·편집/상세·공유 계약 파일 | 페이지 진입과 보관함 구현 분리 |
| `app/mobile/save.tsx` | `features/library/mobile-save.tsx` | 모바일 저장 기능. `app/mobile/page.tsx`는 유지 |
| `app/favorite-button.tsx`, `app/sortable-cards.tsx` | `features/library/favorite-button.tsx`, `features/library/sortable-cards.tsx` | 영상·구간 카드가 공유하는 보관함 상호작용 |
| `app/segment-editor.tsx`, `app/segment-library.tsx` | `features/segments/segment-editor.tsx`, `features/segments/segment-library.tsx` | 구간 편집·목록 책임. 변환 함수는 segment-drafts로 추출 |
| `app/tag-review.tsx` | `features/tagging/tag-review.tsx` | 검수·필터·이력 UI |
| `app/effect-explorer.tsx`, `app/youtube-discovery.tsx` | `features/discovery/effect-explorer.tsx`, `features/discovery/youtube-discovery.tsx` | 탐색 UI |
| `app/image-search.tsx` | `features/discovery/image-search-dialog.tsx` | 순수 검색 모듈과 이름 충돌을 피한 대화상자 이름 |
| `app/ai-connection.tsx`, `app/library-connection.tsx` | `features/connections/ai-connection.tsx`, `features/connections/library-connection.tsx` | PC·AI 연결 UI, 모바일에서도 사용 |
| `app/source-player.tsx`, `app/video-player.tsx` | `components/media/source-player.tsx`, `components/media/video-player.tsx` | 보관함·구간·탐색이 공유하는 재생 UI |
| `app/chatgpt-auth.ts` | `lib/server/chatgpt-auth.ts` | next/headers와 redirect를 사용하는 기존 서버 전용 도구. 기능·사용 여부 변경 없음 |
| `lib/library-order.ts`, `lib/favorites.ts` | `features/library/library-order.ts`, `features/library/favorites.ts` | UI/API에서 함께 쓰는 보관함 순수 규칙 |
| `lib/segment-search.ts`, `lib/segment-tagging.ts` | `features/segments/segment-search.ts`, `features/segments/segment-tagging.ts` | 구간 검색·태그 병합 |
| `lib/discovery-profile.ts`, `lib/image-search.ts`, `lib/recommendations.ts` | `features/discovery/`의 같은 이름 | 탐색 취향·사진 순위·효과 추천 규칙 |

원본 22개 파일을 이동하고 추출 파일 9개·회귀 테스트 1개를 추가했다. `app`에는 page/layout/API route와 globals.css만 남았다. API·테스트·모바일·공통 재생기의 import, 동적 import, 현재 구조/테스트/lint 학습 문서의 안내와 링크를 새 경로로 갱신했다. 과거 단계의 조사 결과와 archive의 당시 경로는 이력으로 유지했다. 패키지 추가·삭제·업그레이드와 전체 재서식은 하지 않았고, 추출한 파일의 import만 사용에 맞게 정리했다.

### 의존 방향과 서버 경계

```text
app/page → library-workspace → use-library-workspace
                              ├→ use-library-sync → client-request
                              └→ use-clip-analysis → client-request / analysis/whole-video
           ├→ clip-editor-dialog / clip-details-sheet (상태·동작 props)
           └→ segments / tagging / discovery / connections UI
각 UI → components/ui 또는 components/media → 공통 데이터 규칙
app/api route → 기능별 순수 규칙 / 서버 제공자·저장소 모듈
```

편집·상세 화면은 컨트롤러의 반환 **타입만** 참조한다. 컨트롤러는 화면을 import하지 않는다. 서버 route는 `features`의 순수 규칙을 가져올 수 있지만 UI·훅은 가져오지 않는다. 클라이언트/서버를 섞어 재수출하는 barrel 파일은 만들지 않았다.

TypeScript 변환 후 남는 로컬 runtime import/export와 문자열 동적 import 그래프를 전후 비교했다. 조사 대상 앱 소스 모듈은 89 → 98개, 클라이언트 경계에서 도달하는 모듈은 39 → 48개였다. 전후 모두 runtime 순환 0개이며 클라이언트에서 DB·lib/server·node:·cloudflare:·drizzle-orm·next/headers로 이어지는 경로는 없었다. 기존 공유 데이터 타입의 상호 참조를 실행 시 순환으로 세지 않았다. 임의 문자열 계산으로 만든 import까지 일반적으로 증명하는 검사는 아니며 이번에 그런 참조를 추가하지 않았다.

### 대표 코드 전후

이전의 핵심 형태(긴 본문을 축약):

```tsx
// app/cutnote.tsx
export default function Cutnote() {
  // 목록·편집·분석 상태와 요청 버전/취소 ref
  const loadClips = useCallback(/* 목록 조회와 오래된 응답 차단 */, [setSelected]);
  // polling effect, classify, classifyUrl, completeAnalysis, save ...
  return <div>{/* 보관함 + 편집 Dialog + 상세 Sheet */}</div>;
}
```

이후의 연결 형태(반환 필드·JSX를 축약):

```tsx
// app/page.tsx → features/library/library-workspace.tsx
export default function LibraryWorkspace() {
  const workspace = useLibraryWorkspace();
  return <div>
    {/* 보관함·검색·카드 */}
    <ClipEditorDialog {...workspace} />
    <ClipDetailsSheet {...workspace} />
  </div>;
}

// use-library-workspace.ts
const {clips, refresh, listRequestRef /* ... */} = useLibrarySync(setSelected);
const {classify, classifyUrl, stopAnalysis /* ... */} = useClipAnalysis({
  editing, automatic, completeAnalysis, setPoster, setAiStatus,
});
```

단순 함수 추출로 취소 의미가 바뀌지 않도록, 요청의 완료 조건은 그대로 유지했다.

```ts
// use-clip-analysis.ts: 실제 완료 조건
if (analysisController.current === controller && !controller.signal.aborted)
  completeAnalysis(result);

// use-library-sync.ts: 요청 취소와 별개로 mutation 이후의 GET도 거른다
if (version === listRequestRef.current) { /* 목록 반영 */ }
```

`completeAnalysis`는 기존처럼 함수형 setter로 **현재** 검수 상태와 병합한다. 수동 구간이면 `refreshSegmentTags(readSegments(previous), result.report.segments)`를 사용하고, 직접 수정한 필드는 `manualFields`로 보호한다. 이를 분석 훅 내부의 오래된 상태 사본으로 바꾸지 않았다. 주요 함수 22개는 추출 전후 AST 본문을 비교했고 공백과 `*Ref` 명명 변경을 제외하면 모두 같았다.

### 검증 결과와 추가한 범위

웹 명령은 `apps/web`에서 실행했다.

| 검증 | 결과 | 의미 |
|---|---|---|
| `npm run lint` | 종료 0, 오류·경고 0 | 규칙 비활성화 없이 훅·화면 경계 검사 |
| `npx --no-install tsc --noEmit --incremental false` | 종료 0 | 새 import·props·훅 계약 검사 |
| `npm test` | **12/12 스위트 통과** | 기존 11개 + 분석/편집 회귀 1개(7건) |
| `npm run build` | 종료 0 | taxonomy 사전 검사, RSC·client·SSR 빌드와 기존 route 목록 유지 |
| runtime 의존 그래프·함수 비교 | 통과 | 순환·서버 코드 유입 0, 주요 22개 함수 본문 보존 |
| package.json·package-lock.json·migration 비교 | 동일 | 의존성·DB 스키마 변경 없음 |
| `node scripts/check-publication.mjs` | 종료 0 | 실제 작업 트리 269개와 기존 인덱스 312개 모두 통과 |
| `node scripts/verify-publication-index.mjs` | 종료 0 | 격리 인덱스 269개(텍스트 267개·검토 PNG 2개), 실제 인덱스 해시 유지 |
| Markdown 링크·`git diff --check` | 통과 | 로컬 링크 117개 존재, 현재 수정 문서의 새 후행 공백 없음 |

기존 `sync-polling.test.mjs`는 새 동기화 훅의 실제 callback을 읽도록 변경했다. 6초 요청이 5초 polling에 끊기지 않음, 12초 timeout 후 재시도, 수동 새로고침 우선, mutation 뒤 stale GET 차단, 조용한 갱신 실패 시 기존 목록 보존의 5건을 그대로 통과했다. 구간·태그·미디어·즐겨찾기·추천 회귀도 기존 기대값을 유지했다.

기존 선택 구간 재태깅 테스트에는 취소 검증이 있었지만, 편집기 전체 영상 분석의 취소/경합은 직접 다루지 않았다. 그래서 `tests/web/clip-analysis.test.ts`를 추가했다. 실제 훅 함수와 편집 완료 함수를 AST로 읽어 타입만 제거하고, 가짜 React state/effect·제공자·지연 응답으로 실행한다. 요청 모형이 일부러 AbortSignal을 무시해도 다음 결과를 보장하는지 검사한다.

1. 오래된 AI 상태 응답은 새 분석을 시작하지 않는다.
2. 이전 OpenAI 진행률·오류·결과가 다음 분석이나 취소 상태를 덮어쓰지 않는다.
3. Gemini 요청은 같은 취소 signal을 받고 취소 뒤 결과를 반영하지 않는다.
4. 취소된 링크 해석은 제목을 바꾸거나 제공자 조회를 시작하지 않는다.
5. 종료 cleanup은 debounce를 정리하고 요청을 취소하며 늦은 포스터·분석 결과를 무시한다.
6. 완료 경로에서 사용자 검수 거절, 수동 제목·구간 제목/메모·직접 태그를 보존한다.
7. AI 연결 후 재개는 같은 편집 세션에서만 한 번 실행된다.

이 검사는 실제 React 렌더러·브라우저 DOM을 실행하는 E2E 검사가 아니다. 화면의 HTML/CSS와 기존 이벤트 동작은 유지하고 타입·빌드까지 확인했지만 브라우저 수동 조작, 실제 영상 재생·AI 호출, Android 실기기, 온라인 배포는 이번 단계에서 실행하지 않았다. 개인 DB·미디어를 쓰는 테스트도 추가하지 않았다.

### 중간 문제와 해결, 남은 범위

- 순수 `image-search.ts`와 이동한 UI `image-search.tsx`가 같은 stem으로 만나 TypeScript가 순수 모듈을 먼저 해석했다. UI를 `image-search-dialog.tsx`로 명명하고 호출부를 수정해 해결했다. 신규 기능으로 해결하지 않았다.
- ref를 사용자 정의 훅 밖으로 꺼낸 첫 분리에서는 React immutability lint가 실패했다. 화면의 모드 변경·수동 구간 편집·제안 적용·재생 동작을 컨트롤러로 옮겨 내부 ref를 감췄다. 동기화/분석과 컨트롤러 사이에 필요한 ref는 `*Ref`로 명시했다. 린트 예외는 추가하지 않았다.
- 제안 적용을 JSX에서 함수로 옮기며 기존 조건부 렌더링의 타입 좁히기가 사라졌다. 함수 첫 줄에 `analysis?.segments` 조건을 두어 같은 호출 전제를 명시했다. 사용자가 확인할 수 있는 새 동작은 없다.
- 테스트는 앞 단계에서 확인된 esbuild 샌드박스 상위 경로 읽기 제약 때문에 허용된 제한 밖 환경에서 실행했다. 이를 코드 실패로 세지 않는다. 빌드의 기존 native config loader·Vinext CLI·ineffective dynamic import·callback timing·라우트 분류 안내는 유지된다.
- 6단계의 깨끗한 설치와 환경별 통합 검증은 별도 후속 범위다. 이번 결과를 실기기·유료 AI·온라인 호스팅 보증으로 확대하지 않는다. 되돌릴 때는 이 절의 소스 이동·추출과 import·테스트·문서만 함께 되돌리며 4단계에서 보존한 로컬 상태를 과거 사본으로 덮어쓰지 않는다.

배운 점: 상태를 파일로 나누는 것보다 요청을 무효화하는 책임과 결과를 현재 편집 상태에 합치는 책임을 구분하는 것이 중요했다. 취소만으로는 늦은 응답을 막을 수 없으므로 controller 동일성·요청 버전·편집 세션·사용자 검수 병합을 함께 보존했다.

## 6단계 실제 수행 기록 — 통합 검토와 회고, 2026-10-02

상태: **완료, 아래 검증 범위 한정**. Windows / Node 24.14.0 / npm 11.9.0의 portable 실행 경로를 확인했다. 이번 단계는 기술문서 6개와 이 학습 문서만 수정했다. 실행 소스·패키지·migration은 5단계 완료 상태와 같으며 개인 DB·키·영상·제외 보관본을 가져오지 않았다. 새 Git 커밋·배포도 만들지 않았다.

### 문제 → 확인 근거 → 판단 기준

기존 설치 트리와 생성물이 남아 있으면 경로·필수 파일 누락을 놓칠 수 있다. 단계별 통과 기록을 단순히 합치는 대신, 실제 공개 집합을 새 디렉터리에 복사해 재현성을 확인하고 재검증이 필요한 범위를 골랐다.

- 실제 인덱스의 312개 경로와 2·4·5단계 이동표를 합성해 최종 공개 파일 269개를 대조했다. 이전 경로 삭제/새 경로 미추적이라는 Git 상태를 실제 파일 손실로 오해하지 않았다. 파일 내용 비교는 텍스트 CRLF/LF를 정규화하고 바이너리는 바이트를 비교했다.
- 기존 파일 중 같은 경로·내용 5개, 이동 후 같은 내용 171개, 내용도 달라진 78개, 제거 58개였다. 최종 추가 파일 15개를 더하면 269개다. 78개에는 경로 import·안내 수정과 큰 파일 분리가 함께 포함되며, 모두 기능 변경이라는 뜻은 아니다.
- 직접 dependencies 25 → 13, devDependencies 22 유지, lockfile 루트 제외 레코드 873 → 817을 다시 확인했다. 잔존 레코드의 version·resolved·integrity 변경은 0개다. migration·Android 앱/테스트·브랜드의 보존 근거도 이동표와 대조했다.
- 최신 실행 소스가 이미 통과한 검사는 재사용할 수 있지만, 새 설치에서 사라지는 생성물·설치 의존성·최초 실행 절차는 기존 체크아웃의 성공으로 대신하지 않는 것을 완료 기준으로 삼았다.

### 선택지와 선택 이유 → 실제 변경

| 문제 | 검토한 선택지 | 선택과 이유 | 실제 결과 |
|---|---|---|---|
| 로컬 보관본과 현재 소스 혼재 | 폴더 전체 복사 / 공개 후보만 복사 | Git 제외 규칙을 적용한 실재 공개 파일만 복사. 개인 상태와 이전 node_modules가 검증을 대신하지 않게 함 | 제외 경로 `.security-checks/stage6-clean/`에 공개 소스 269개 사본 |
| 기존 Git 인덱스가 이동 전 구조 | HEAD만 checkout / 현재 공개 작업 트리 복사 | 단계별 변경이 미커밋 상태이므로 HEAD만으로는 최신 코드를 검사할 수 없음 | 원본 인덱스는 유지, 검증용 사본에만 별도 Git 저장소 초기화 |
| 설치 재현성 미검증 | 기존 node_modules 재사용 / 새 설치 | 빈 설치 디렉터리에서 lockfile 기반 npm ci. 사용 가능한 npm 캐시를 활용해 외부 서비스 없이 검증 | 오프라인 설치 성공, 기존 설치 트리는 그대로 유지 |
| 생성 사전 누락 가능성 | 생성 파일 복사 / 원본에서 재생성 | YAML·스키마·생성기만 복사하고 생성 명령 실행 | JSON·TS 2개를 재생성, 기존 생성물과 해시 일치 |
| 마지막 화면 분리 후 실행 확인 | 개인 보관함 재실행 / 새 빈 DB로 HTTP 확인 | 개인 데이터에 접근할 필요가 없는 새 사본의 빈 D1 사용 | migration 9개 적용, PC 실행기·Bridge·홈·모바일 HTTP 확인 |
| 검사 중복 | 모든 환경 검사 무조건 재실행 / 변경 영향으로 선택 | 환경이 달라진 웹 검사는 새 설치에서 실행, 변경 없는 Bridge/JVM/검사기 회귀는 이전 결과 재사용 | 아래 검증 매트릭스로 실행·재사용·미검증 구분 |

현재 기술문서에서 다음 불일치를 고쳤다. 런타임 코드 수정은 필요하지 않았다.

1. 개발 규칙의 “웹·Android·tests가 형제”라는 설명을 `apps/web`·`apps/android`는 형제, `tests`는 저장소 루트라고 명확히 했다.
2. LAN 안내의 현재 테스트 수를 18 → 19로 고치고 4단계의 실제 결과와 실기기 한계를 연결했다.
3. lint 학습 노트의 `lib/taxonomy-data.ts` 링크를 제거하고 원본 생성기·재생성 명령을 안내했다. 로컬에 우연히 존재하는 생성물을 공개 문서의 필수 링크로 삼지 않는다.
4. 설치·테스트 안내에 이번 새 설치 결과와 캐시·플랫폼 한계를 추가했다.
5. 보안 문서의 HEAD 설명을 확인했다. 최초 커밋은 `97f9629`, 이번 조사 HEAD는 `e0ccff5`(기술문서 정리)다. 리팩토링 변경은 여전히 작업 트리에 있으며 임의 커밋하지 않았다.

### 단계별 파일·의존성 증감

“공개 파일”은 실제 존재하고 Git 제외되지 않은 파일 수다. node_modules·개인 상태·생성물, Git에만 남은 이전 경로는 포함하지 않는다. 이동 횟수는 단계별 작업 수이며 같은 파일이 여러 단계에서 이동하므로 합산해 고유 파일 수로 해석하지 않는다.

| 단계 | 공개 파일 전 → 후 | 추가 / 삭제 / 이동 | 직접 deps / devDeps | lock 레코드(루트 제외) |
|---|---|---|---|---|
| 시작 기준 | 312 | Git 관리 기준 | 25 / 22 | 873 |
| 1. 조사·기준선 | 312 → 313 | 학습 문서 +1, 코드 삭제·이동 0 | 25 / 22 | 873 |
| 2. 자료 정리 | 313 → 317 | 안내 +4, 삭제 0, 이동 40 | 25 / 22 | 873 |
| 3. 미사용 제거 | 317 → 259 | 추가 0, 삭제 58(UI 55·훅 1·예제 2) | **13 / 22** | **817** |
| 4. 앱 구조·명명 | 259 → 259 | 추가·삭제 0, 이동 202 | 13 / 22 | 817 |
| 5. 책임 분리 | 259 → 269 | 추출 +9·테스트 +1, 삭제 0, 원본 이동 22 | 13 / 22 | 817 |
| 6. 통합 검토 | 269 → 269 | 추가·삭제·이동 0, 문서 7개 갱신 | 13 / 22 | 817 |

1단계 재확인 요청을 시작할 때에는 학습 문서가 이미 존재했다. 표의 +1은 전체 시리즈에서 그 문서를 도입한 증가분이며 재확인 때 파일을 또 만들었다는 뜻은 아니다. 전체 증감은 **312 + 15 − 58 = 269**, 직접 의존성 −12, 개발 의존성 0, lock 설치 경로 레코드 −56이다. 파일 수 감소 자체를 성능·품질 개선의 증명으로 사용하지 않는다.

### 대표 구조·코드 전후와 선택의 효과

```text
전: main/handoff-package/
      cutnote/app/{page,cutnote,segment-editor,tag-review,...}
      cutnote-android/{app,bridge,launcher.mjs}
      tests/{run-web.mjs,web/*-tests 또는 *-check}
    docs/{현재 기술,제품,발표,과거 기록 혼재}
    taxonomy/ + material/ + assets/logos/ 성격의 분산 자료

후: apps/web/app/{page,layout,mobile/page,api/**/route,globals.css}
             features/{library,segments,tagging,discovery,connections}
             components/{ui,media} + lib/ 공통 규칙·서버 도구
    apps/android/{app,bridge,launcher.mjs}
    tests/{run-web.mjs,web/*.test.ts 또는 *.test.mjs}
    assets/branding/
    docs/{engineering,product,presentations,refactoring-study.md}
    archive/{design,documentation,event,handoff-2026-10-01,planning,taxonomy}
```

대표 코드의 실제 전후는 5단계 절에 있다. 핵심 변화는 `Cutnote` 하나가 모든 상태·요청·JSX를 소유하던 형태에서, `LibraryWorkspace → useLibraryWorkspace → useLibrarySync/useClipAnalysis`와 편집/상세 화면으로 나눈 것이다. 동기화 요청 버전은 mutation 뒤의 오래된 GET을 막고, 분석 controller 동일성은 취소·교체된 응답을 막으며, 결과 적용은 현재 사용자 검수 상태에 함수형 setter로 병합한다. 기능별 폴더 이름만 바꾸는 데 그치지 않고 변경 이유에 따라 소유권을 나눴다.

확인 가능한 개선은 현재 문서·코드 위치가 역할별로 구분되고, 미사용 의존성이 줄고, UI 없이 구간 변환을 검사할 수 있으며, 전체 영상 편집의 응답 경합에 대한 회귀 검증이 추가됐다는 것이다. 번들 크기·실행 속도 개선이나 AI 품질 향상을 측정한 작업은 아니다.

### 깨끗한 검증 절차와 결과

검증 사본의 웹 작업 디렉터리는 `.security-checks/stage6-clean/apps/web`다. 최초 복사 시 node_modules·dist·.wrangler·.sites-runtime·.env·.dev.vars·생성 사전이 없음을 확인했다. 명령에는 OS 실행에 필요한 환경변수만 전달하고 개인 AI 키·NODE_OPTIONS를 전달하지 않았다. npm 사용자 설정도 빈 검증용 파일로 지정했다. 사본과 로그는 모두 Git 제외 경로에 남아 있다.

| 검사·명령 | 이번 실행 / 재사용 | 결과와 판정 |
|---|---|---|
| `npm ci --include=dev --include=optional --no-audit --no-fund` + `npm_config_offline=true` | 새 사본에서 실행 | 종료 0, 628개 설치, 54초. 플랫폼별 optional을 포함한 lock 전체 817개와 실제 Windows 설치 수는 다른 지표 |
| `npm run taxonomy:generate` | 새 사본에서 실행 | 종료 0, taxonomy 2.0.0 / 12 namespaces / 403 tags. 생성 JSON·TS가 기존 생성물과 일치 |
| `npm run lint` | 새 사본에서 실행 | 종료 0, 오류·경고 0 |
| `npm exec --no -- tsc --noEmit --incremental false` | 새 사본에서 실행 | 종료 0. 기존 안내의 `npx --no-install tsc ...`와 같은 로컬 compiler 사용 |
| `npm test` | 새 사본에서 실행 | **12/12 스위트** 통과. 실제 네트워크 기본 차단, 메모리 DB·가짜 제공자 사용 |
| `npm run build` | 새 사본에서 실행 | 종료 0. 사전 `--check`, RSC·client·SSR와 기존 페이지 2개·API 16개 경로 확인 |
| `npm run db:init` | 새 사본에서 실행 | 종료 0. 새 로컬 빈 D1에 0000~0008 migration 9개 적용. 기존 개인 DB 접근 없음 |
| PC start-pc + Android launcher/Bridge HTTP 통합 | 새 사본에서 실행 | pcReady, 빈 목록, PC/Bridge API 응답 일치, `/`·`/mobile`·`/favicon.svg` 모두 200 |
| Bridge 단위 회귀 | 4단계 결과 재사용 | 19/19. server·test·launcher 이후 내용 변경 없음. 최신 웹과의 연결은 위 새 smoke로 보완 |
| 공개 검사기 단위 회귀 | 4단계 결과 재사용 | 4/4. publication-secrets 코드·테스트 변경 없음 |
| Android JVM 정책 테스트 | 1단계 재확인 결과 재사용 | 6종 211개. Java 소스·테스트·build.sh 내용 변경 없음; 경로 이동은 이미 별도 확인 |
| 기존 DB·R2 이동 보존 | 4단계 결과 재사용 | 기존 빈 D1 이력/행 비교와 별도 합성 클립·R2 바이트 재조회. 이번에는 개인 보관함을 다시 열지 않음 |
| 의존 그래프·핵심 함수 | 5단계 결과 재사용 | runtime 순환·클라이언트 서버 코드 유입 0, 주요 22개 함수 보존. 이후 실행 코드 변경 없음 |
| `node scripts/check-publication.mjs` | 개인 자료 없는 사본에서 실행 | 종료 0. 공개 269개, 텍스트 267·검토 PNG 2, known local values 0 |
| `node scripts/verify-publication-index.mjs` | 개인 자료 없는 사본에서 실행 | 종료 0. 격리 인덱스 269개 통과, 사본의 원래 인덱스는 없는 상태 그대로. 원본 저장소 인덱스에 쓰지 않음 |
| 공개 manifest 기준 Markdown 링크 | 최신 문서로 실행 | 118개 유효, 누락 0. 생성 파일에 대한 링크 의존 제거 |
| ignore·생성물·잠금파일 | 새 사본에서 실행 | 제외 경로 13종·필수 소스 5종 통과, 사전 생성물 2개 일치, npm ci 뒤 lockfile 바이트 동일 |
| `git diff --check` 및 수정 Markdown 공백 검사 | 원본 작업 트리에서 실행 | 종료 0, 수정 문서 7개 새 후행 공백 없음. LF/CRLF 안내는 남음 |

새 설치는 기존 node_modules를 복사하지 않았지만 **기존 npm tarball 캐시**는 사용했다. 완전히 빈 캐시에서 인터넷 다운로드하는 설치나 registry 장애 대응을 검증한 것은 아니다. `npm run install:ci`의 managed-linux 분기는 실행하지 않고, README·설치 안내의 직접 `npm ci` 절차를 검증했다. 테스트 출력의 Gemini 402·R2 정리 실패는 기대한 오류 분기를 검사하는 가짜 시나리오이며 실제 유료 요청 실패가 아니다.

로컬 smoke는 시작 전에 5173·5174가 비어 있는지 확인했다. 이미 열려 있으면 기존 서버를 읽거나 재사용하지 않고 중단하도록 했다. pairing은 검증 사본 아래 임시 위치에 새로 만들었고, 검사에서 소유한 PC 프로세스 트리와 Bridge만 종료했다. 검사 후 두 포트가 닫힌 것도 확인했다. 빈 보관함 조회를 개인 클립 재생 성공으로 기록하지 않는다.

### 문서·명령·경로·생성물 정책의 최종 일관성

- README·설치·테스트·Android 안내는 `apps/web`, `apps/android`, `tests/run-web.mjs`를 기준으로 한다. 현재 문서의 이전 코드 링크를 검색했고 과거 단계·archive의 당시 경로, 비공개 보관본 경로는 역사·보존 안내로 구분했다.
- Git 제외 생성물: `node_modules`, `dist`, `.next`, `next-env.d.ts`, tsbuildinfo, 사전 JSON·TS. 소스: `build/sites-worker.ts`, `.openai/hosting.json`, drizzle migration, `apps/.env.example`, 검토된 브랜드 원본. `build`라는 이름만으로 일괄 제외하지 않는다.
- `.wrangler`, `.sites-runtime`, `.dev.vars`, Android pairing·빌드·서명 자료는 로컬 상태다. 새 사본의 별도 Git에서 생성/개인 경로 13종 제외, 필수 소스 5종 포함을 검사했다. 사전 생성과 빌드 후에도 공개 후보는 269개로 유지됐다.
- `dist/server/wrangler.json`의 Worker 이름은 `cutnote-web`, 바인딩은 DB/BUCKET이다. 기존 D1/R2 식별자는 유지했다. `db:init`은 임시 설정의 migrations_dir를 현재 drizzle로 지정하며 local 모드만 실행한다. 온라인 DB·버킷을 생성·이관·배포하지 않았다.
- 문서 링크는 디스크 존재뿐 아니라 **공개 manifest의 파일 또는 실제 자료가 있는 디렉터리**를 가리키는지 검사했다. 따라서 로컬에만 존재하는 생성 파일이나 개인 보관본에 의존하는 문서 링크를 통과시키지 않는다.
- 최종 공개 검사는 개인 파일이 없는 검증 사본에서 수행했다. known local values는 0이며 경로·문자열 비밀 패턴·빈 환경 예제·PNG 해시 검사를 통과했다. 기존 개인 비밀값과의 대조·원본 인덱스 검사는 5단계 결과를 재사용했다. 전체 Git 이력·OCR·외부 공유본에 대한 보증으로 확대하지 않는다.

### 발생한 오류와 해결 방식

| 단계 | 관찰한 문제 | 원인과 해결 | 최종 상태 |
|---|---|---|---|
| 1·4 | 샌드박스에서 esbuild/상위 디렉터리 접근·Windows ACL 검사 제약 | 같은 코드로 허용된 제한 밖 환경에서 해당 검사 실행. 테스트 비활성화나 코드 우회 없음 | 해당 검사 통과, 환경 제약으로 분류 |
| 3 | PowerShell JSON 읽기의 빈 루트 키 오류 | lockfile의 빈 키를 처리하는 Hashtable 모드로 바꾸고 삭제 대상 경로 재확인 | 삭제 전 발생한 도구 오류, 잠금파일 손상 없음 |
| 4 | 이동 중인 작업 트리와 이전 인덱스의 경로 혼합 | 공개 검사에서 manifest별 앱 루트를 선택하고 인덱스는 blob으로 검사 | 작업 트리·기존 인덱스 각각 통과 |
| 5 | image-search 순수 모듈/TSX 해석 충돌 | 대화상자를 image-search-dialog로 명명 | 타입·빌드 통과 |
| 5 | 훅에서 반환한 ref를 화면이 직접 변경 | 사용자 동작을 컨트롤러 함수로 옮기고 내부 ref 감춤, 필요한 훅 간 ref는 명명 명확화 | lint 예외 추가 없이 통과 |
| 5 | JSX 밖으로 옮긴 제안 적용의 nullable 타입 | 함수에 기존 분석 구간 존재 전제를 명시 | 타입 통과, 새 UI 기능 없음 |
| 6 | 생성 파일 문서 링크·Bridge 수·폴더 관계·HEAD 안내 불일치 | 현재 소스와 공개 manifest를 기준으로 문서 6개 수정 | 최종 링크·정합성 재검증 |
| 6 | 링크 검사 초안이 디렉터리 링크 2개를 누락으로 표시 | 실제 공개 하위 파일을 가진 디렉터리도 유효 대상으로 검사 | 검증 도구의 거짓 실패 수정, 원본 자료 삭제 없음 |

이번 새 설치·웹 검사·빌드·빈 DB·HTTP smoke에 해결되지 않은 실행 실패는 없다. npm의 기존 esbuild-kit deprecated 안내, 빌드의 native loader·Vinext CLI·ineffective dynamic import·timing/debugName·라우트 자동 분류 안내는 남았다. 버전 업그레이드나 경고 억제로 범위를 넓히지 않았다. APK·실기기는 성공도 실패도 아닌 **미실행**이다.

### 되돌리는 방법

이번 시리즈는 단계별 커밋이 없으므로 단계 번호에 대응하는 `git revert` 명령은 없다. 기준 Git 커밋 `e0ccff5`에는 원래 경로 소스가 있고, 이 문서의 이동표와 로컬 `.security-checks`의 단계별 사본·검증 기록으로 변경 단위를 구분할 수 있다. 로컬 검증 폴더는 공개 백업의 대체물이 아니며 다른 체크아웃에 자동으로 존재하지 않는다.

1. 실행 중인 앱을 정상 종료하고 현재 소스 변경과 **최신** 개인 DB·R2 상태·환경 키·Android pairing/서명 파일을 별도 비공개 위치에 보존한다. DB와 암호화 키의 시점을 맞춘다. 검증용 빈 DB로 기존 보관함을 덮어쓰지 않는다.
2. 6단계만 되돌릴 때는 기술문서 6개·이 문서의 마지막 통합 기록을 되돌린다. 5단계 검증 스냅샷을 확인해 앞 단계의 문서 변경까지 무조건 덮어쓰지 않는다.
3. 5단계는 cutnote 및 이동표의 UI·순수 모듈을 이전 경로로 복원하고 page/API/test import를 함께 되돌린다. 추출 파일·신규 테스트·실행 목록은 같은 단위로 되돌린다. 기능 분리만 되돌릴 경우 4단계 `apps` 배치는 유지한다.
4. 4단계 경로를 되돌릴 경우 테스트 실행기·문서·공개 검사·패키지 이름·ignore도 함께 역변경한다. 그동안 새로 저장한 `.wrangler/state`와 로컬 환경 파일을 최신 상태 그대로 따라 옮긴다. 저장소 식별자와 migration 이름을 임의로 바꾸지 않는다.
5. 3단계 삭제를 되돌릴 때는 원래 Git 경로의 UI 55개·훅 1개·예제 2개, package.json·lockfile·설정 정리를 한 단위로 복원하고 새로 설치·검증한다. 소스만 복원해 제거된 패키지 import가 깨진 상태로 두지 않는다.
6. 2단계는 이동표를 역으로 적용하고 안내·링크·과거 taxonomy 도구 참조를 같이 복원한다. 출처가 다른 보관본을 같은 이름이라는 이유로 병합하지 않는다. 1단계는 문서 변화만 되돌릴 수 있다.

모든 경우 `git reset --hard`, `git clean -fdx`나 상위 폴더 전체 삭제로 혼합된 변경·개인 상태를 일괄 처리하지 않는다. 복원 대상 변경 단위를 별도 사본에서 검증한 뒤 적용한다. 제외된 검증 사본을 정리할 때도 서버 종료와 경로 확인 후 해당 사본만 제거하며 실제 앱의 로컬 상태에는 손대지 않는다.

### 한계와 이번에 적용하지 않은 개선

| 항목 | 이번 판정 | 적용하지 않은 이유·다음 검증 |
|---|---|---|
| Android APK·서명·휴대폰/에뮬레이터 공유·재생 | 미실행 | SDK·서명·기기 환경 필요. JVM 정책·Bridge HTTP 성공으로 대체하지 않음 |
| 브라우저 실제 렌더·조작·영상 재생 E2E | 미실행 | 현재 가짜 state/effect 검사는 React DOM 전체가 아님. 실제 브라우저에서 폼 전환·취소·재생 검증은 후속 범위 |
| 실제 OpenAI/Gemini·YouTube 응답 품질 | 미실행 | 개인 키·유료 API 없이 검증한다는 범위 준수. 가짜 제공자 계약 테스트와 구별 |
| 온라인 배포·managed-linux·다른 OS | 미실행 | 로컬 portable 경로만 검증. 리소스·비밀 설정·호스팅 migration 절차 별도 확인 필요 |
| 빈 npm 캐시의 다운로드·최신 취약점 audit | 미실행 | 캐시 기반 오프라인 설치만 수행, 감사 네트워크 조회 없음. 과거 audit 결과를 현재 결과로 취급하지 않음 |
| 기존 개인 영상의 경로 이동 후 실제 재생 | 미검증 유지 | 4단계 활성 DB에는 개인 clip이 0개였음. 당시 합성 객체 보존과 이번 빈 DB 실행은 실제 영상 재생 증거가 아님 |
| 남은 20KB 상태 조정 훅의 추가 분리·새 전역 상태 라이브러리 | 미적용 | 저장·선택·검수의 결합을 더 나눌 실질적 변경 이유가 부족함. 파일 수만 늘리지 않음 |
| legacy 분석 Worker·connector 오류 코드 추가 삭제 | 미적용 | 외부 public URL·통합 계약 부재를 증명하지 못한 후보. 크기 절감만으로 삭제하지 않음 |
| 패키지 업그레이드·전체 포맷·schema 변경·DB 이름 정리 | 미적용 | 회귀 원인을 섞거나 기존 저장소 식별을 바꿀 수 있어 범위 밖으로 유지 |
| CI 도입·단계별 커밋·자동 rollback·성능 최적화 | 미적용 | 이번 로컬 구조 검증과 별개 작업. 검증된 변경을 검토 후 독립 변경 단위로 다룰 수 있음 |

이번 작업의 완료 근거는 파일 수 감소가 아니라, 원본·생성물·개인 상태를 구별한 이동, 책임 경계와 기존 비동기 계약의 보존, 공개 소스만으로 재현한 설치·검증·빈 DB 실행이다. 실제 환경의 빈칸은 위 표에 남겨 후속 작업이 성공 기록을 과장하지 않도록 했다.
