# 디자인 생성 참고 소스

`export-cutnote-logo.py`와 `logo-outline.swift`는 원래 작업 폴더 `work/`에서 사용한 코드의 사본입니다. 로고의 생성 경위와 편집 가능한 소스를 보존하려고 포함했습니다. 앱 설치·실행에 필요하지 않습니다.

Python 스크립트는 과거 `outputs/cutnote-android`, `outputs/cutnote`, `outputs/cutnote-logo-kit`, `work/logo-outline.json` 경로를 전제로 합니다. **이 폴더에서 그대로 실행하는 도구가 아닙니다.** 기존 산출물에 바로 덮어쓰지 말고 별도 디자인 작업 폴더에서 경로를 조정해야 합니다.

Swift 스크립트는 macOS CoreText와 `AppleSDGothicNeo-Bold`를 사용합니다. 폰트 파일과 생성된 윤곽선 JSON은 포함하지 않았습니다. 가로형 로고의 글꼴 윤곽선 재배포 권한을 먼저 확인하거나 허용된 글꼴로 다시 제작하세요. 자세한 내용은 [LICENSE_NOTES](../../LICENSE_NOTES.md)에 있습니다.

인수인계에서 사용할 SVG는 [assets/logos](../../assets/logos/)에 있습니다. PNG는 벡터에서 재생성 가능한 파일이라 제외했습니다. 이번 검증에서 디자인 스크립트를 실행하거나 폰트를 추출하지 않았습니다.
