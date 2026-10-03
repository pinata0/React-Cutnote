# 6단계: 호출·생성·변환 의존성

2026-10-03 작업 트리 기준. [UML 안내](../README.md) · [외부 계약](../contracts/README.md) · [포함·수명](../lifetime/README.md)

## 무엇을 왜 조사했는가

필드로 보관하지 않아도 함수 호출·HTTP·DB·파일 접근은 의존성을 만든다. 반대로 import만 있고 실행 경로가 없으면 현재 사용자 흐름의 서비스로 그릴 수 없다. 이번에는 실제 호출문과 진입점, 인자 주입·반환값 변환을 대조하고 코드 변경 없이 구조를 기록했다.

| 문서 | 내용 |
|---|---|
| [주요 의존 관계 표](calls.md) | 웹 검증/저장, PC 다운로드/분석, Android/Bridge, 실행기의 실행 근거 |
| [서비스·모듈 구조와 경계 점검](structure.md) | 분리 flowchart, 타입 순환과 값 의존 구분, 계층 결합·미확인 사항 |

## 선정과 조사 방법

2단계 대상 중 TS/JS125개를 TypeScript AST로 파싱해 정적 import/export의 내부 경로 그래프를 보조 검사했다. `@/`·상대 경로·`.mjs`→`.mts` 소스 대응을 해석하고 type-only import를 분리했다. 선택 소스 사이의 정적 내부 간선361개에서 값 import/export 순환은 없었고, 타입까지 포함한 strongly connected component는2묶음이었다. 이 결과를 호출 그래프나 번들 실행 검증이라고 부르지 않는다.

실제 사용 표는 import 그래프를 복사하지 않았다. 각 행의 함수 호출·생성자·SQL 실행·fetch/spawn/파일 API를 직접 확인했다. Java는 MainActivity/ConnectionProbe/ShareRequest의 공유·연결 호출과 Node Bridge 전달 실행문을 대조했다. 순수 도메인 변환도 Backend 실행 코드로 포함하고 일반 JSX·스타일은 제외했다. 테스트를 운영 참여자로 넣지 않았다.

## 표와 그림 읽는 방법

- `[CALL]`: 같은 실행 환경의 함수/메서드 호출. 같은 모듈의 helper도 필요하면 표시한다.
- `[NEW]`: 객체·timer·서버 생성, `[SPAWN]`: OS 자식 프로세스 실행. 둘은 다르다.
- `[HTTP]`: 브라우저/LAN/loopback/외부 API 요청. 네트워크 경계와 인증은 별도 확인한다.
- `[DB]`: D1 binding의 prepare/bind/run/first/all/batch. Drizzle schema import와 실제 ORM 사용을 혼동하지 않는다.
- `[FS]`: PC 파일 읽기/쓰기/rename/삭제. Worker R2 binding은 `[R2]`로 분리한다.
- `[VALUE]`: 입력 검증·직렬화·결과 병합. 새 runtime 서비스/class가 아니라 값의 변환이다.
- `[TYPE]`: 컴파일 때 사라지는 타입 의존. 실행 호출선에 포함하지 않는다.

UML 표시 여부의 “표시”는 구조도 핵심선, “분기”는 다른 그림/분기 설명, “표만”은 상세 근거를 뜻한다. flowchart는 모듈·프로세스 경계 설명도이며 정식 UML 컴포넌트/배포 표기가 아니다. 화살표는 **사용 주체 → 대상**, 필드 소유나 반환 방향을 뜻하지 않는다. 반환/시간 순서는 [3단계 호출 목록](../contracts/calls.md)으로 연결한다.

## 검증과 미확인

원본 코드·함수명·파일 경로·상대 링크·표 컬럼·공개 정보와 제품 소스 불변을 확인한 결과는 [검증 기록](../validation.md)에 남긴다. 앱 실행/타입 검사/Android 실기기/유료AI를 이번에 재실행하지 않았다. 정적 그래프는 동적 import·require·가변 경로·패키지 내부·생성물·선정 밖 파일과 Java 바이트코드까지 포함하지 않는다. 테스트 주입은 실제 production binding과 구분한다.

Mermaid는 편집 가능한 원본을 포함한다. 기존 조사에서 렌더러를 찾지 못했고 이번에도 PATH의 mmdc가 없어 **자동 Mermaid 파싱·시각 렌더링은 미검증**이다. 외부 서비스에 다이어그램을 게시하거나 의존성을 설치하지 않았다.
