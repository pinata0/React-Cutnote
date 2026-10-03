# 2단계: 주요 선언 전수 목록과 핵심 타입 초안

2026-10-03 작업 트리 기준. [UML 안내](../README.md) · [1단계 선정표](../selection.md)

다음 단계: [외부 계약·주요 동작 및 시퀀스 호출 목록](../contracts/README.md).

## 무엇을 왜 조사했는가

파일 역할만으로 클래스를 만들어내지 않고 실제 선언을 확인한다. 타입 별칭, 런타임 함수·클래스·상수, DB 테이블을 구분하여 이후 관계/실행 UML의 근거를 만든다. 제품 코드는 수정하지 않았다.

1단계의 **포함 및 보조 애플리케이션 소스**를 펼쳐 TS/TSX/JS/MJS/MTS/Java/SQL 144개를 처리했다. 보조 파일도 선언은 빠뜨리지 않되 현재 실행 여부와는 구분했다. 파일별 처리와 0건 파일은 [대상 대조표](files.md)에 있다. 제외 파일·테스트·문서·shell·설정 JSON·생성 snapshot·개인 파일을 선언 전수 범위에 섞지 않았다. `.d.ts`는 직접 작성한 선언 파일이므로 포함했다.

## 선언 목록과 영역 분류

| 영역 | 항목 수 | 읽는 목적 |
|---|---:|---|
| [도메인·공통](domain.md) | 405 | Clip·구간·검수와 UI 요청/동기화 선언 |
| [작업·다운로드](jobs.md) | 124 | PC 함수 모듈·JobRow/PcJob·상태 처리 |
| [분석](analysis.md) | 291 | 제공자·프레임·검색 타입과 분석 함수 |
| [저장](storage.md) | 44 | 레코드 별칭·Drizzle 객체·영속 테이블 |
| [연결](connection.md) | 386 | Android 클래스·공유·LAN·호스팅 계약 |
| 합계 | **1,250** | 클래스 수가 아니라 선언/상태 표현/DB 메타데이터 항목 수 |

각 목록은 요청한 **이름 / 종류 / 정의 파일 / 모듈·package / 역할 / UML 표시 여부 / 표시·생략 이유** 7개 컬럼을 사용한다. 역할은 해당 모듈의 책임과 선언의 파라미터·타입 요약이다. 런타임 호출 증명은 1단계 및 기존 실행 문서를 따른다. 타입 본문은 표에서 최대220자로 요약하므로 전체 필드 정의를 대체하지 않는다. 파일 링크 옆 줄 번호에서 원본을 확인한다.

핵심 요소만 [classDiagram 초안](diagrams.md)에 표시했다. 상태 값·상수는 [상태 계약](states.md), 전체 DB 컬럼·키·인덱스는 [레코드 구조](records.md)에 보존했다.

## 수집 규칙과 종류별 결과

| 종류 | 수 | 해석 |
|---|---:|---|
| TS type alias | 72 | 런타임 객체/생성자가 아님 |
| TS interface | 3 | 타입 선언 및 namespace 확장. 런타임에서 소거 |
| TS/JS class | 3 | 실제 JS class. preview/설치 도구이며 PC JobService 클래스가 아님 |
| TS enum / Java enum | 0 / 0 | 선정 범위에서 선언 없음. 문자열 집합을 enum으로 발명하지 않음 |
| Java class | 16 | 명명 클래스13개와 익명 클래스3개 포함 |
| Java interface | 2 | DownloadTransfer.Progress, FileAccess.Connection |
| Java field / method·constructor | 64 / 122 | 보조 증거까지 보존. `<init>`은 생성자 |
| 일반 함수 / 함수 바인딩 / method·accessor | 400 / 88 / 25 | TS/JS 포함, 중첩 named function과 arrow binding도 보존 |
| JS class field / constructor | 2 / 2 | 설치 도구의 실제 멤버 선언. 독립 AST 대조에서 추가 수집 |
| 모듈 변수·상수 / 지역 문자열 배열 상수 | 154 / 2 | initializer 값을 임의 서비스 객체로 간주하지 않음 |
| React state/setter 바인딩 | 215 | hook의 분해 바인딩; 상태와 setter를 독립 항목으로 보존 |
| inline literal union | 60 | 별칭 내부·속성·인자·hook 타입의 문자열 union 출현 위치. 모두 영속 상태는 아님 |
| Drizzle table object / SQLite table | 7 / 7 | 각각 JS schema 객체와 실제 migration 적용 결과 |
| default export 표현식 / re-export | 5 / 1 | 새 선언인지 다른 모듈 참조인지 종류로 구분 |

전수의 단위는 다음과 같다. TS/Java 명명 타입은 중첩 범위도 수집한다. Java는 익명 클래스와 멤버도 포함한다. JS/TS 함수 선언, 이름이 붙은 함수 바인딩, object/class 메서드, 모듈 변수/상수·export를 수집한다. 함수 내부의 모든 루프 변수·catch 매개변수·임시 값, 일반 화살표 callback 자체, 모든 JSX 속성은 전수 단위가 아니다. 상태 누락을 줄이기 위해 hook state 바인딩과 문자열 literal union, 문자열 배열 상수는 추가 수집했다. 런타임 조건문/SQL에만 있는 상태 값은 별도 수동 대조했다.

같은 `Provider`, `Props`, `GET`, `POST`, `Cloudflare.Env`가 여러 파일에 있으면 합치지 않는다. `Cloudflare.Env` 두 interface는 다른 파일의 declaration merging이며 서로 다른 서비스가 아니다. inline union과 그것을 포함하는 type alias는 별도 출현 항목으로 중복 집계된다. `export;` 표시는 모듈이 내보내는 선언이며 그 자체로 현재 사용을 증명하지 않는다.

## 방법·재현

```powershell
# 저장소 루트, 설치된 프로젝트 TypeScript와 JDK 필요
node docs/engineering/uml/declarations/tools/collect.mjs
```

[collect.mjs](tools/collect.mjs)는 1단계 Markdown 표의 경로를 읽고 TypeScript compiler API로 구문 분석한다. Java는 [JavaDeclarations.java](tools/JavaDeclarations.java)의 javac Tree API `parse()`만 사용한다. Android 타입 해결·컴파일·APK 생성은 수행하지 않는다. SQL은 `:memory:` SQLite에 0000~0009만 적용해 PRAGMA로 컬럼·FK·인덱스를 읽는다. 실제 DB, `.dev.vars`, 키, 영상과 바이너리를 읽지 않는다. 설치된 TypeScript 파서 실행은 의존성 소스 조사와 구분한다.

명령은 영역별 생성 목록 5개와 files/records 문서를 갱신한다. 수동 작성 README·diagrams·states는 자동 덮어쓰지 않으므로 소스 변경 후 집계/핵심 선택을 함께 검토한다. 검사 중간 JSON은 Git 제외 `.security-checks/uml-declarations/`에만 남긴다. 상태와 설정은 예제 소스 선언만 다루며 실제 비밀값은 수집하지 않는다.

## 설계 판단·학습 포인트

`type LocalAsset = {...}`는 파일을 소유하는 런타임 객체 클래스가 아니다. `sqliteTable(...)` 결과는 런타임 JS schema 객체이며 그 안의 선언만으로 API가 Drizzle ORM을 쓴다고 볼 수 없다. 현 API는 raw SQL도 사용한다. `startRunner`의 반환 객체와 클로저를 `JobService`라는 가상 클래스로 그리지 않는다.

핵심 타입 표시는 관계 설명을 위한 선택이며 생략 항목이 중요하지 않다는 뜻은 아니다. 함수 실행과 모듈 수명은 기존 [sequence/state 조사](../jobs.md)로 연결한다. 타입 구조의 association을 DB cascade나 메모리 독점 소유로 해석하지 않는다.

## 검증과 미확인

144개 파일의 파싱/메모리 migration을 완료했다. 타입과 enum 개수, 주요 상태 분기, 테이블·레코드 구조를 소스와 대조했다. 전체 선언표 1,250행의 영역별 합계·7개 컬럼과 핵심 표시15개를 대조했다. 상대 링크 1,466개가 존재하며 제품/설정/테스트/스크립트 230개는 기존 해시와 같았다. 첫 민감정보 검사에서 secret/token 인자·컬럼 이름을 값으로 오인한 항목이 나왔다. 원본 선언과 대조해 실제 값이 아님을 확인하고 코드 식별자 표시를 적용한 뒤 10개 문서 재검사에서 발견 0건을 확인했다. git diff --check는 통과했다. 알려진 비밀값 원본은 읽지 않았으므로 실제 값과의 일치 검사는 하지 않았다. 파싱 성공은 앱 타입 검사·실행 테스트 성공을 뜻하지 않는다.

Mermaid 자동 파서·렌더러는 이번 환경에 없어 classDiagram 초안의 실제 렌더링은 미검증이다. 앱·유료 AI·Android·다운로드 검증을 재실행하지 않았다. 기존 실서비스 미검증과 알려진 결함은 유지한다. 저장소 밖 동적 사용을 증명하지 못한 보조 모듈도 현재 실행 요소로 승격하지 않았다.
