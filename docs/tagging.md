# 태깅과 검색 정책

[문서 목록](README.md) · 기준일: 2026-10-02

## 단일 기준 원본

앱의 원본은 [taxonomy.v2.yaml](../main/handoff-package/cutnote/data/taxonomy/taxonomy.v2.yaml), 검증은 [taxonomy.schema.json](../main/handoff-package/cutnote/data/taxonomy/taxonomy.schema.json)입니다. 현재 12개 namespace, 403개 태그입니다. 루트 `taxonomy/`와 `scripts/generate-taxonomy.mjs`는 이전 분류표 자료·변환 도구이며 앱 수정 경로가 아닙니다.

웹 폴더의 `npm run taxonomy:generate`가 `data/taxonomy/taxonomy.generated.json`, `lib/taxonomy-data.ts`를 생성합니다. 생성기는 스키마·ID 중복·namespace·부모 참조·순환·relation을 검사합니다. 빌드는 생성물과 원본 일치를 확인합니다.

## 현재 데이터 계약

[lib/tagging.ts](../main/handoff-package/cutnote/lib/tagging.ts)의 `Tagging`에는 `taxonomyVersion`, `assignments`가 있습니다. 할당 필드는 `tagId`, `aiScore`, `source`, `status`, `decisionBy`, `evidenceMs`입니다.

- `source`: `ai_observed`, `ai_inferred`, `user`.
- `status`: `accepted`, `suggested`, `rejected`.
- `decisionBy`: `policy`, `user`.
- `evidenceMs`: AI 태그의 영상 근거 시점. 사용자 태그와 달리 AI 태그에는 근거가 필요합니다.

DB는 클립·구간 JSON에 검수 정보를 보관합니다. 과거 PostgreSQL 설계안의 테이블·필드 예시는 현재 계약이 아닙니다.

## 판정·재분석

1. canonical ID를 저장하고 별칭은 `lib/taxonomy.ts`에서 해석합니다.
2. 관찰 불가능한 제작 방식은 AI 추정입니다. `observable: false` 태그는 자동 확정하지 않습니다.
3. 자동 확정은 관찰 가능·자동 확정 허용 태그이며 `aiScore >= 0.85`일 때 가능합니다. 그 외에는 제안입니다.
4. 사용자 판단이 아닌 AI 점수 0.6 미만 결과는 제거합니다. 점수는 실제 정확도 확률이 아닙니다.
5. 재분석 병합은 `decisionBy: user`인 승인·거절을 보존합니다.
6. 구간은 자체 근거로 판단하고 부모 영상·이웃 구간 태그를 그대로 상속하지 않습니다.
7. 사전 밖 기존/직접 태그 호환성은 유지합니다. 문서 정리와 데이터 호환성 코드 제거는 별개입니다.

사전 버전은 분석 결과에 저장하며 현재 파서는 버전 일치를 요구합니다. PATCH(별칭·설명), MINOR(호환 태그 추가), MAJOR(ID·의미 변경) 정책을 따르되 ID·버전 변경에는 기존 데이터 이관을 별도 검토합니다. 자동 이관이 구현되었다는 뜻은 아닙니다.

분석 한도는 2시간/30구간이며 OpenAI 프레임은 최대 120개입니다. 사진 검색은 정적 특징과 저장 구간 태그 비교이며 전체 영상 임베딩 검색이 아닙니다. 사진만으로 제작 방식·움직임을 확정하지 않습니다.
