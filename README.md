# React-Cutnote

영상 링크·파일을 저장하고 AI 태깅, 구간 검색·재생, Android 공유로 활용하는 컷노트입니다.

**[프로젝트 기술문서 → docs/README.md](docs/README.md)**

- [구조와 코드 위치](docs/engineering/architecture.md)
- [설치와 실행](docs/engineering/setup.md)
- [개발 규칙](docs/engineering/development.md)
- [테스트](docs/engineering/testing.md)
- [보안과 공개](docs/engineering/security.md)

개발·실행 소스는 웹 `apps/web/`, PC 작업자 `apps/pc/`, Android `apps/android/`, 테스트 `tests/`입니다. 실행기는 `tests/run-web.mjs`, 브랜드 자료는 `assets/branding/`에 있습니다.

```powershell
cd apps/web
npm ci --include=dev --include=optional
npm run taxonomy:generate
npm run build
npm run db:init
npm start
```

AI 연결을 사용하려면 [환경 설정](docs/engineering/setup.md)을 먼저 진행하세요. 개인 DB·키·영상과 보관용 원본은 Git에서 제외합니다. 공개 전 저장소 루트에서 `node scripts/verify-publication-index.mjs`로 현재 공개 구성을 확인합니다.

PC 링크 다운로드에는 yt-dlp·FFmpeg·ffprobe와 OpenAI 연결이 필요합니다. [사용 순서·저장 위치·제한](<docs/product/서비스 소개문.md>), [PC 운영 안내](docs/engineering/local-video-ingestion-operations.md), [현재 구조·API](docs/engineering/local-video-ingestion-reference.md)를 참고하세요. Android 공유는 설치 후 같은 LAN에서 저장소 루트의 `node apps/android/launcher.mjs`로 연결합니다.

새 PC 수집은 Google Data API/Gemini 없이 OpenAI를 사용합니다. 완전한 오프라인 분석은 아닙니다. 실제 Instagram 다운로드·PC 재생은 확인했고 YouTube 다운로드는 플랫폼 제한으로 실패했습니다. 실제 OpenAI 완료·Android 실기기는 [미검증](docs/engineering/local-video-ingestion-progress.md)입니다.
