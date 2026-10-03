# 보안과 공개

[문서 목록](../README.md) · 기준일: 2026-10-02

실제 비밀값은 `.dev.vars` 등 로컬 설정에만 보관하고 `.env.example`은 빈 자리표시자를 유지합니다. 개인 DB·영상·서명 키·연결정보와 보관용 원본은 `.gitignore`로 제외합니다. 제외는 삭제나 자격정보 폐기를 의미하지 않습니다.

## 공개 검사 (저장소 루트)

```powershell
node scripts/check-publication.mjs
node scripts/verify-publication-index.mjs
```

첫 검사는 작업 파일과 실제 인덱스를 확인합니다. 두 번째는 임시 인덱스·별도 객체 디렉터리에 현재 작업 트리를 반영하며 실제 인덱스·커밋·참조를 변경하지 않습니다. 검사기는 비밀값 자체를 출력하지 않습니다. 전체 과거 Git 객체·이미지 내용·외부 공유본을 보증하지 않습니다.

이미 공유된 접근 코드·비밀번호·키는 발급 서비스에서 별도 교체/폐기해야 합니다. 완료 여부는 확인되지 않았습니다. `.git` 전체나 Codex 참조를 포함한 mirror 업로드는 공개 검사 범위를 벗어납니다.

비공개 `legacy/초기 아이디어 기획서.md`는 개인 원본이며 검사기의 비교 자료이므로 Git 제외 상태로 유지합니다. 삭제한 공개 문서는 [정리 기록](../../archive/documentation/cleanup.md)에 명시합니다.

## 현재 설정

의존성 기준은 `apps/web/package.json`과 잠금파일입니다. 현재 override는 Miniflare의 sharp 0.35.4, esbuild-kit의 esbuild 0.25.12, fflate 0.7.5입니다. 변경 전 상위 패키지 호환성을 확인합니다. 기존 audit 0건 보고는 2026-10-02 시점이며 오늘의 외부 취약점 상태를 새로 조회한 결과가 아닙니다.

LAN은 신뢰 가능한 사설망 HTTP용이며 인터넷 공개를 지원하지 않습니다. AI 키 설정은 PC loopback에서만 허용합니다. Bridge 직접 실행 안내 파일과 PC runtime 비밀 파일에는 POSIX 권한 또는 Windows 소유자 ACL을 적용합니다. 실행기 pairing/connection JSON의 Windows ACL 적용은 누락되어 있습니다. [확인한 결함](documentation-review-2026-10-03.md)을 참고하고 개인 폴더 접근 권한을 점검하세요. [LAN 상세](lan.md)를 참고합니다.

프로젝트·태그 사전·로고 권리는 [라이선스 확인 사항](licenses.md)에 있습니다. `archive/handoff-2026-10-01/audit/` 목록·해시는 인수인계 당시 기록이며 현재 상태가 아닙니다. 과거 보안 기록의 '커밋 없음' 설명도 현재와 다릅니다. 최초 커밋은 `97f9629`, 리팩토링 6단계 조사 시 HEAD는 `e0ccff5`(기술문서 정리)입니다. 1~6단계 리팩토링 변경은 작업 트리에 있으며 이번 검증에서 커밋·배포하지 않았습니다.
