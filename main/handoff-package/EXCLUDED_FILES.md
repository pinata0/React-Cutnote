# 제외한 파일과 이유

원본 위치는 `<PROJECT_ROOT>` 기준입니다. 이 목록의 ‘제외’는 **사본에 복사하지 않았다**는 뜻이며 원본 삭제가 아닙니다. `.gitignore` 여부와 별도로 용도·재생성 가능성·민감정보를 판단했습니다.

| 원본 파일/폴더 | 제외 이유 | 재생성/별도 인수인계 |
|---|---|---|
| `outputs/cutnote/.git/` | 원래 Git 이력·원격 설정 보존, 사본에 중첩 저장소 불필요 | 새 저장소 초기화는 후임자 수행 |
| `outputs/cutnote/.dev.vars`, `.env*` | 실제 비밀 설정 | `.env.example`에서 새 로컬 설정 작성 |
| `outputs/cutnote/.wrangler/` | 개인 D1/R2, API 설정, 저장 영상·메모·추천 캐시 | 개인 데이터는 별도 비공개 백업 계획 필요 |
| `.sites-runtime/`, `.next/`, `.vinext/`, `dist/`, `node_modules/` | 실행 상태, 빌드물, 의존성 | npm 설치/빌드로 생성 |
| `tsconfig.tsbuildinfo`, `next-env.d.ts` | 재생성 가능한 TS/Next 파일. 앞 파일은 원본 Git 추적 상태여도 제외 | 타입 검사/프레임워크 생성 |
| `lib/taxonomy-data.ts`, `data/taxonomy/taxonomy.generated.json` | 태그 사전 생성물 | 포함한 YAML/Schema + `npm run taxonomy:generate` |
| `outputs/cutnote-android/build/` | 클래스/DEX/APK/키스토어 등 | SDK/JDK와 새 로컬 서명 설정으로 빌드 |
| `outputs/cutnote-android/connection.txt`, `.cutnote-pairing.json`, lock/tmp | 실제 PC 주소·연결 인증·프로세스 상태 | 새 PC에서 launcher가 생성 |
| Android APK/ZIP/CPGZ/IDSIG/SHA256 | 재빌드 가능한 배포물 및 서명 관련 산출물 | APK 빌드 절차 사용 |
| 인증서·키스토어·비밀번호·토큰 | 일반 GitHub 소스에 넣으면 안 되는 비밀 | 필요 시 별도 비공개 관리. 패키지에는 값 없음 |
| `outputs/cutnote-logo-kit/*.png`, 프리뷰, 로고 ZIP | SVG에서 만들 수 있는 이미지/압축 결과 | SVG 원본 4개 포함. 권리 확인 후 내보내기 |
| `outputs/*/README.md`의 오래된 안내 | 현재 구현과 다른 절차 존재 | 필요한 내용은 새 문서에 통합. 원본 보존 |
| `work/android-toolchain/`, `work/npm-runtime/`, `work/bin/` | SDK/JDK/npm 설치 파일·캐시·도구 링크 | 표준 도구 설치. 약관/라이선스는 새 사용자가 확인 |
| `work/cutnote-build-*`, `work/cutnote-dist-*`, `work/cutnote-package/` | 과거 검증 복사본/빌드 백업 | 현재 소스에서 새 빌드 |
| `work/logo-outline.json`, `logo-module-cache/`, 프리뷰 | 글꼴 윤곽선 및 디자인 생성 중간물 | Swift/Python 원본은 참고용 포함, 가로형 SVG 권리 확인 필요 |
| `work/*-tests.mjs` 중 TS에서 생성된 묶음 | 이전 코드가 인라인된 생성 번들 | TS 원본을 이식한 회귀 테스트 실행 |
| `work/order-api-live-tests.ts`, `test-pc-sync.mjs`, `style-profile-audit.ts` 등 | 기존 서버/실제 보관함 접속 또는 변경 위험 | 필요 시 합성 데이터 전용 서버로 바꾼 후 실행 |
| `work/youtube-probe/public-search.html`, 실제 응답·스크린샷·조사 JSON | 외부 콘텐츠·개인 저장 영상·결과가 섞일 수 있음 | 합성 fixture로 파서 검증 |
| `work/`의 나머지 미이식 테스트/리뷰/프로브 | 현재 코드와 중복/불확실/환경 종속 여부 검토 필요 | 파일별 이름·처리는 `audit/work-file-review.csv` 참고. 삭제하지 않음 |
| Downloads의 원문 설계 문서·테스트 영상·임시 첨부 이미지 | 프로젝트 밖의 참고/개인 자료, 런타임 의존성 아님 | HANDOFF 외부 자료 표에 기록. 공개 가능 범위 별도 확인 |
| `.DS_Store`, 로그, 가상환경, 캐시, 임시 파일 | OS/개발 환경 상태 | 필요할 때 재생성 |

필수로 보존한 예외: `cutnote/build/`는 생성 디렉터리가 아니라 **플러그인 소스**입니다. `drizzle/meta/`는 향후 마이그레이션 생성을 위한 이력이라 SQL과 함께 포함했습니다. 태그 YAML/JSON Schema, 앱 XML/SVG, 별도 로고 SVG는 무시 규칙에만 의존하지 않고 포함했습니다.

기계가 읽을 수 있는 복사 단계 제외 목록은 `audit/exclusion-records.json`에 있습니다. 이 문서의 폴더 범위 항목은 그 하위 전체에 적용됩니다. 민감한 데이터 내부는 열어서 목록화하지 않았습니다.
