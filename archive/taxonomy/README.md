# 과거 태그 사전과 변환 도구

[과거 기록 목록](../README.md) · [현재 태깅 정책](../../docs/engineering/tagging.md)

이 폴더는 이전 루트 `taxonomy/`, `scripts/generate-taxonomy.mjs`, `docs/분류 후보군_개정판.md`를 함께 보관합니다. 현재 앱은 `apps/web/data/taxonomy/`와 웹 내부 생성기를 사용합니다. 같은 이름의 YAML·스키마라도 별도 원본이므로 병합·삭제하지 않았습니다.

- [분류표 원문](<분류 후보군_개정판.md>)
- [과거 YAML](taxonomy.v2.yaml) · [과거 스키마](taxonomy.schema.json)
- [과거 변환기](generate-taxonomy.mjs)

저장소 루트에서 `node archive/taxonomy/generate-taxonomy.mjs --check`로 원문에서 계산한 출력과 보관 YAML을 쓰기 없이 비교합니다. `--check` 없이 실행하면 이 폴더의 YAML을 재생성하므로 의도적인 과거 자료 수정 때만 사용하세요. 입력·출력은 실행 위치가 아닌 스크립트 위치 기준입니다. YAML의 `source_document`는 같은 폴더의 원문 이름을 유지합니다.
