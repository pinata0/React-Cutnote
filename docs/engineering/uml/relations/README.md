# 4단계: 상속·구현·타입 조합

2026-10-03 작업 트리 기준. [UML 안내](../README.md) · [선정 파일](../selection.md) · [선언 목록](../declarations/README.md) · [메서드 계약](../contracts/README.md)

## 무엇을 왜 조사했는가

공통 필드를 갖는다는 이유로 부모 클래스를 만들거나 union의 선택지를 자식 클래스로 그리지 않기 위한 조사다. 2단계 대상144개 중 TS/JS125개를 TypeScript AST로 재확인하고 Java9개에서 명명 선언·익명 클래스 생성·callback 구현을 확인했다. SQL 등 나머지10개는 이번 언어 관계 검사 대상이 아니다. 개인 상태·비밀값·의존성 구현·빌드 결과는 근거에 포함하지 않았다.

| 주제 | 결과와 상세 문서 |
|---|---|
| [실제 상속과 구현](inheritance.md) | Java 명명 클래스의 명시 extends 3곳, 익명 클래스 상속2곳·interface 구현1곳. JS class extends 1곳. classDiagram 3개 |
| [타입 조합과 판별](type-composition.md) | intersection15출현, 주요 판별 union3개, declaration merging. 일반화 화살표를 쓰면 안 되는 사례 |

## 결과 요약과 해석

**사실:** 선정 범위에는 TypeScript class extends/implements, interface extends, Java 명명 클래스의 명시 implements, 소스의 abstract class 선언이 없다. JS 클래스3개 중 ConnectorPreview만 명시 상속하고 설치 도구2개는 상속 선언이 없다. 앱 도메인 Clip·PcJob·AnalysisReport는 클래스 상속 계층이 아니다. Cloudflare.Env 2개와 Window 1개의 interface 선언도 extends가 아니라 선언 병합/확장이다.

**해석:** 상속은 Android 플랫폼 callback과 예외, 개발용 Cloudflare RPC 경계에 집중되어 있다. 다운로드·작업·분석의 책임 분리는 함수 모듈·클로저·데이터 타입으로 설명하는 편이 맞다. 상속이 적다고 누락된 설계 패턴을 추가하지 않는다.

**범위:** AST의 union195개는 null/undefined·문자열 값·함수 인자 등 중첩 출현까지 센 수다. 판별 union195개라는 뜻이 아니다. 객체 대안의 필수 리터럴 필드로 구분되는 AnalysisReport·ConnectorResult·ConnectorContext를 상세 조사했다. 나머지는 기존 선언·상태 표와 타입 조합 문서의 반례로 연결한다. import만으로 관계를 세지 않았다.

## 공통 표기와 검증

- `상위 <|-- 하위`: 코드의 실제 클래스 일반화. 삼각형이 상위에 있다.
- `인터페이스 <|.. 구현체`: 실제 인터페이스 realization. 점선이며 일반화와 다르다.
- `..>`: 필요할 때 사용하는 타입 의존/호출. 상속·소유·다중성을 뜻하지 않는다. 이번 타입 조합은 표로 설명한다.
- 익명 클래스의 그림 이름은 위치를 식별하기 위한 **문서용 별칭**이다. 코드에 동명의 class가 있다고 주장하지 않는다.
- 관계 표의 abstract는 하위 소스 선언 중심이다. 외부 SDK 부모의 전체 상속 트리·modifier는 이번에 다시 조사하지 않았다. interface의 추상 메서드는 별도로 적는다.

파일·심볼·줄 번호와 관계를 대조했다. 새 classDiagram의 선 방향·분리 범위·텍스트를 수동 검사했다. PATH에 mmdc가 없고 이전 조사에서도 프로젝트/제공 런타임의 Mermaid 렌더러를 찾지 못했으므로 **자동 Mermaid 파싱·시각 렌더링은 미검증**이다. 외부 게시나 의존성 설치는 하지 않았다. 문서 링크·공개 정보·제품 소스 불변 검사는 [검증 기록](../validation.md)에 남긴다. 코드 구문 확인은 앱 실행이나 SDK 타입 검증을 대신하지 않는다.
