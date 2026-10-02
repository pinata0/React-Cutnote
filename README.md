# React-Cutnote

영상 링크·파일을 저장하고 AI 태깅, 구간 검색·재생, Android 공유로 활용하는 컷노트입니다.

**[프로젝트 기술문서 → docs/README.md](docs/README.md)**

- [구조와 코드 위치](docs/engineering/architecture.md)
- [설치와 실행](docs/engineering/setup.md)
- [개발 규칙](docs/engineering/development.md)
- [테스트](docs/engineering/testing.md)
- [보안과 공개](docs/engineering/security.md)

개발·실행 소스는 웹 `apps/web/`, Android `apps/android/`, 웹 테스트 `tests/web/`입니다. 실행기는 `tests/run-web.mjs`, 브랜드 자료는 `assets/branding/`에 있습니다.

```powershell
cd apps/web
npm ci --include=dev --include=optional
npm run taxonomy:generate
npm run build
npm run db:init
npm start
```

AI 연결을 사용하려면 [환경 설정](docs/engineering/setup.md)을 먼저 진행하세요. 개인 DB·키·영상과 보관용 원본은 Git에서 제외합니다. 공개 전 저장소 루트에서 `node scripts/verify-publication-index.mjs`로 현재 공개 구성을 확인합니다.
