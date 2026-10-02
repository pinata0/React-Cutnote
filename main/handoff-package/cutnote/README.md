# 컷노트 웹

설치·환경 설정·실행·검증은 [인수인계 루트 README](../README.md)를 참고하세요. Android 앱과 함께 전달되는 monorepo 구조이므로 `cutnote` 폴더만 분리하면 루트의 테스트 실행기와 PC launcher 연결이 빠집니다.

기본 순서는 `npm ci` → `npm run taxonomy:generate` → `.dev.vars` 설정 → `npm run build` → `npm run db:init` → `npm start`입니다.

루트 `.env.example`에는 이름만 있고 실제 키는 없습니다. 개인 데이터와 API 키는 별도로 비공개 설정합니다. 현재 기능과 제한은 [HANDOFF](../HANDOFF.md), 권리 검토는 [LICENSE_NOTES](../LICENSE_NOTES.md)를 확인하세요.
