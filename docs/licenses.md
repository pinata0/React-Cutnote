# LICENSE_NOTES

[통합 문서 목록](README.md) · 문서 통합: 2026-10-02


검토일: 2026-10-01. 이 문서는 인수인계 자료의 출처와 확인 범위를 기록합니다. 프로젝트에 새로운 라이선스나 이용 허가를 부여하지 않습니다.

> 아래 의존성 수치·검토 결과는 2026-10-01 기록입니다. 이후 잠금파일이 변경되어 현재 목록과 다릅니다. 현재 의존성은 앱 package-lock.json을 기준으로 재확인하며, 기존 권리 미확인 항목이 해결되었다는 의미는 아닙니다.

## 검토 범위와 근거

`cutnote/package.json`, `cutnote/package-lock.json`, 기존 고지 파일, 태그 사전의 출처 필드, 레거시 분석 워커, 로고 생성 기록을 읽었습니다. 외부 웹·모델 카드·폰트 이용약관을 새로 조회하지 않았고, node_modules의 개별 배포본을 설치하거나 라이선스 전문을 조사하지 않았습니다. 라이브러리의 실제 번들 포함 여부, 링크 방식, 수정 여부에 따른 법적 의무를 판정한 결과가 아닙니다.

원본 소스·Git·서비스는 변경하지 않았습니다. 이 문서와 `audit/THIRD_PARTY_DEPENDENCIES.csv`만 인수인계 폴더 안에 작성했습니다. 사용자 영상·썸네일, 개인 DB, API 키, 폰트 바이너리, 모델 가중치, Android SDK와 JDK는 이 검토를 위해 복사하지 않았습니다.

## 프로젝트 자체 라이선스

웹 프로젝트 루트에 LICENSE/COPYING/NOTICE 파일이 없고 `package.json` 및 잠금 파일의 루트 레코드에도 license 필드가 없습니다. 일부 포함된 구성요소의 MIT 고지가 프로젝트 전체에 적용된다고 해석하지 않습니다. 프로젝트 소유자가 허용할 이용·수정·재배포 범위를 별도로 정해야 합니다.

컷노트 이름·아이콘·워드마크에 관해서도 이 문서가 상표 사용이나 재배포 권한을 부여하지 않습니다.

## 의존성 목록

[전체 목록](../main/handoff-package/audit/THIRD_PARTY_DEPENDENCIES.csv)은 잠금 파일의 루트 프로젝트를 제외한 **895개 설치 경로 레코드**를 모두 포함합니다. 같은 패키지의 중첩 설치·여러 버전·플랫폼별 선택 의존성을 합치지 않았으므로 895개가 고유 패키지 이름 수는 아닙니다. 별도로 vendored source, 런타임 다운로드, 모델, 분류표, 폰트 파생 자산 6행을 추가해 CSV는 총 **901행**입니다.

npm 레코드 895개 모두 license 필드가 있습니다. 889개의 resolved URL은 공개 npm registry 주소이고 6개는 잠금 파일에 URL이 없어 빈칸으로 유지했습니다. URL의 사용자정보·query·fragment는 제거하도록 처리했으며, 출처에 없는 다운로드 주소를 만들어 채우지 않았습니다. `dev`, `optional`, `in_bundle`은 잠금 파일의 선언 그대로이며 실제 배포물 포함 여부를 확정하지 않습니다.

| 잠금 파일의 라이선스 표현 | 설치 경로 수 |
| --- | ---: |
| 0BSD | 2 |
| Apache-2.0 | 45 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 2 |
| BSD-2-Clause | 11 |
| BSD-3-Clause | 6 |
| BlueOak-1.0.0 | 1 |
| CC-BY-4.0 | 1 |
| CC0-1.0 | 2 |
| ISC | 33 |
| LGPL-3.0-or-later | 10 |
| MIT | 745 |
| MIT AND ISC | 1 |
| MIT OR Apache-2.0 | 4 |
| MPL-2.0 | 28 |
| Python-2.0 | 1 |

MIT 이외의 표현도 있습니다. 특히 sharp/libvips 계열의 LGPL 포함 표현 15행, lightningcss·resvg·satori 등 MPL-2.0 28행, caniuse-lite의 CC-BY-4.0 1행은 실제 재배포하는 파일과 해당 전문을 확인해야 합니다. `AND`/`OR` 표현은 CSV에 그대로 남겼으며 임의로 MIT나 Apache 하나로 축약하지 않았습니다. `dev` 또는 `optional`이라는 이유만으로 재배포 검토 대상에서 자동 제외하지 않습니다.

이 목록은 개별 패키지의 LICENSE/NOTICE 전문을 대신하지 않습니다. 설치된 라이브러리나 생성된 서버·브라우저 번들을 별도 배포할 때는 실제 포함 구성요소의 고지와 조건을 확인해야 합니다.

## 기존 고지 보존

다음 두 고지 파일은 인수인계 사본과 원본이 바이트 단위로 같음을 확인했습니다.

- `cutnote/vendor/shadcn-tailwind-4.13.0.LICENSE.md`: MIT 고지. 같은 폴더의 CSS와 함께 보존합니다.
- `cutnote/build/sites-vite-plugin.LICENSE`: MIT 고지. 해당 플러그인 소스와 함께 보존합니다.

`cutnote/build/`는 Vite 플러그인과 Worker 진입점이 들어 있는 **필수 소스 폴더**입니다. 재생성 가능한 `cutnote/dist/`와 혼동해 제거하지 않습니다. 기존 저작권·허가 문구는 이 문서로 대체하지 않습니다.

## 분류표 출처

`cutnote/data/taxonomy/taxonomy.v2.yaml`의 `source_document` 값은 `분류 후보군_개정판.md`입니다. 제공된 필드만으로 원저작자, 원문 라이선스 또는 재배포 허가를 확인할 수 없습니다. YAML과 생성된 JSON을 함께 전달하더라도 권리 확인이 끝난 것은 아닙니다. 원문 제공자의 허용 범위를 확인해야 하는 자료로 표시합니다.

## 레거시 Transformers / MobileCLIP

`cutnote/public/analysis-worker.js`에 아래 외부 로딩 정보가 남아 있습니다.

- Transformers JavaScript: `@huggingface/transformers@3.8.1`, jsDelivr 동적 import.
- 모델: `Xenova/mobileclip_s0`, 고정 revision `757d59c9c6870a76a4b0306f05f5061bca15c39f`.
- 관련 경로: `cutnote/lib/analysis/video.ts`, `cutnote/lib/analysis/types.ts`.

현재 전체 영상 분석 UI는 OpenAI/Gemini 경로를 사용하고 기존 MobileCLIP 결과 형식을 보존합니다. 레거시 소스가 남아 있다는 사실을 의존성 목록에서 누락하지 않았습니다. 워커가 실행되면 JavaScript, tokenizer/processor, ONNX/WASM 및 모델 파일을 외부에서 받을 수 있으며 이들 전체는 npm 잠금 파일만으로 열거되지 않습니다.

**모델 카드는 이번 검토에서 받거나 읽지 않았습니다.** 위 고정 revision의 모델 카드와 LICENSE, 상위 MobileCLIP 모델 조건, 변환 모델 및 tokenizer/processor 조건을 재사용 전에 확인해야 합니다. JavaScript 라이브러리의 라이선스를 모델 가중치의 라이선스로 대신하지 않습니다. 모델·캐시·가중치 파일은 이 문서를 위해 패키지에 넣지 않았습니다.

## Apple 폰트에서 만든 가로형 워드마크

기존 작업 기록 `work/logo-outline.swift`는 CoreText의 `CTFontCreateWithName("AppleSDGothicNeo-Bold", ...)`와 `CTFontCreatePathForGlyph`로 한글 글자 윤곽을 만들었습니다. `work/logo-outline.json`의 font 필드도 같은 이름입니다. 해당 JSON의 path 문자열이 다음 SVG에 **정확히 포함됨**을 확인했습니다.

- `assets/logos/cutnote-lockup-dark.svg`
- `assets/logos/cutnote-lockup-white.svg`

폰트 파일이나 SVG 폰트 임베딩은 없지만, 제공된 자료에는 해당 폰트의 윤곽 출력·재배포 조건이 없습니다. 따라서 두 가로형 워드마크의 외부 재배포 허가는 **미확인**으로 표시합니다. 폰트를 path로 변환했다는 이유로 권한이 새로 생겼다고 판단하지 않습니다. 사용 중인 폰트에 적용되는 조건을 확인하거나, 허용 범위가 명확한 폰트/독자적인 글자 도형으로 교체한 뒤 배포 범위를 결정해야 합니다.

아이콘만 있는 `cutnote-app-icon.svg`, `cutnote-web-icon.svg`에서는 그 폰트 윤곽과 폰트 임베딩이 발견되지 않았습니다. 이것이 프로젝트 자체 아이콘에 새 라이선스를 부여한다는 뜻은 아닙니다. 로고 파일을 삭제·교체하지 않고 확인사항만 기록했습니다.

## 영상·썸네일·서비스

이 검토를 위해 사용자 영상, 다운로드한 YouTube/Instagram 영상, 썸네일 또는 개인 보관함을 복사하지 않았습니다. 코드에 외부 URL이나 플레이어가 있다는 사실은 해당 콘텐츠를 재배포할 권한의 근거로 사용하지 않습니다. 향후 실제 영상·썸네일을 함께 제공한다면 해당 콘텐츠의 권한을 별도로 확인해야 합니다.

OpenAI·Gemini·YouTube·Instagram 및 Sites의 서비스 사용은 소스 라이선스와 별개의 계정·서비스 조건을 따르는 항목입니다. API 키와 기존 계정의 이용 권한은 이 소스 패키지에 포함되지 않습니다. Android SDK/JDK를 재배포하는 패키지도 아닙니다.
