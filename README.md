# React-Cutnote

공개·개발 기준 소스는 [main/handoff-package](main/handoff-package/README.md)입니다.
웹 앱과 Android 연결 서버는 해당 폴더의 형제 디렉터리 구조를 유지합니다.

```sh
cd main/handoff-package/cutnote
npm ci --include=dev --include=optional
npm run taxonomy:generate
npm test
npm run build
```

환경 설정은 `main/handoff-package/.env.example`을 웹 앱의 `.dev.vars`로 복사한 뒤
로컬에서만 입력합니다. 예제에는 빈 자리표시자만 있으며 실제 키는 저장하지 않습니다.
Android 서명 비밀번호는 `CUTNOTE_KEYSTORE_PASSWORD` 환경변수로 전달합니다.

`main/outputs/`의 원래 중첩 Git 저장소, `main/work/`의 DB·백업·도구,
`docs_ext/`의 개인정보 서류, `example/`의 로컬 영상과 비공개 참가 안내 문서는
삭제하지 않고 Git에서 제외합니다. 이 로컬 사본들의 이전 의존성은 공개 앱의
지원·검증 대상이 아닙니다. 실행·배포에는 공개 기준 소스를 사용하세요.

루트에서 `node scripts/check-publication.mjs`로 Git 추가 후보의 민감 파일,
비밀키 패턴, 중첩 Git 링크를 검사할 수 있습니다. 값은 출력하지 않습니다.
검사 후에도 `.gitignore`를 우회하는 `git add -f`는 사용하지 마세요.
이미 공유된 접근 코드와 비밀번호는 발급 서비스에서 별도로 교체해야 합니다.

적용 버전, 공개 구성 검증 결과와 남은 위험은
[보안 수정 기록](SECURITY_REMEDIATION.md)에 정리했습니다.

초기 기획서 원문과 발표 PDF는 로컬에 보존하며 Git에서 제외합니다.
공개 기획 내용은 [비밀값을 제거한 사본](legacy/초기%20아이디어%20기획서.public.md)을 참고하세요.
`node scripts/verify-publication-index.mjs`는 실제 인덱스를 변경하지 않고 임시 인덱스와
별도 객체 디렉터리로 공개 파일 구성을 검사합니다. 로컬 `.git` 전체를 공개하지 마세요.
