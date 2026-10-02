# 영상 효과 태그 사전 v2

이 디렉터리는 서비스가 사용하는 canonical 태그 사전의 단일 기준본을 관리한다.

## 파일

- `taxonomy.v2.yaml`: 애플리케이션과 DB seed가 읽는 실제 태그 데이터
- `taxonomy.schema.json`: 태그 데이터의 필수 필드와 ID 형식을 정의한 검증 스키마
- `../scripts/generate-taxonomy.mjs`: 기존 개정판을 변환하고 v2 분류를 추가하는 생성 스크립트

기존 `분류 후보군_개정판.md`는 기획 기록과 원본 데이터로 보존한다. 실제 구현에서는 `taxonomy.v2.yaml`만 기준으로 사용한다.

## v2 변경 사항

기존 8개 namespace를 유지하면서 서비스 검색 시나리오에 필요한 다음 분류를 추가했다.

- `color`: 주조색, 색온도, 채도, 명암
- `shot_type`: 피사체 크기와 숏 구도
- `camera_motion`: 카메라 또는 가상 카메라의 이동
- `subject`: 주요 피사체 유형

`motion_style`은 피사체와 화면 요소의 움직임을, `camera_motion`은 카메라 자체의 움직임을 나타낸다.

## 운영 규칙

1. 저장과 API 통신에는 `display_name`이 아니라 변경되지 않는 `id`를 사용한다.
2. 사용자가 입력한 동의어는 `aliases`를 거쳐 canonical ID로 정규화한다.
3. `observable: false`인 태그는 결과 화면만으로 제작 방식을 확정할 수 없으므로 AI 추정값으로만 취급한다.
4. `auto_accept_allowed: false`인 태그는 점수가 높아도 자동 확정하지 않고 사용자 검수 대상으로 남긴다.
5. 사용자 확정 태그는 이후 AI 재분석으로 덮어쓰지 않는다.
6. 태그 삭제 대신 비활성화 필드를 추가하고 버전을 올리는 방식을 우선한다.
7. 의미가 다른 동일 표시 이름은 namespace가 포함된 canonical ID로 구분한다.

## 버전 정책

- PATCH: 별칭, 설명, 오탈자 수정
- MINOR: 기존 의미를 깨지 않는 태그 추가
- MAJOR: ID 변경, 태그 병합·분리 또는 판정 의미 변경

태그 결과에는 항상 분석 당시의 taxonomy 버전을 함께 저장해야 한다.

## 재생성

프로젝트 루트에서 다음 명령을 실행한다.

```powershell
node scripts/generate-taxonomy.mjs
```

생성 후 namespace ID, 태그 ID, parent 참조, relation 참조의 유효성을 검사해야 한다.
