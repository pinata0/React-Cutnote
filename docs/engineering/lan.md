# 컷노트 LAN 연결 서버

2026-10-03 추가: PC 로컬 수집 작업자는 `apps/pc/`에서 실행됩니다. [운영 안내](local-video-ingestion-operations.md)와 [구현·검증 상태](local-video-ingestion-progress.md)를 함께 확인하세요. 외부 PC 5173·LAN 5174는 유지하고 내부 Worker는 5175로 분리했습니다.

[통합 문서 목록](../README.md) · 문서 통합: 2026-10-02


휴대폰 앱과 같은 LAN의 다른 컴퓨터가 **이 PC의 로컬 컷노트 보관함**에 접근하도록 연결하는 Node 서버입니다. 웹 UI·DB·AI 분석 서버는 `apps/web` 프로젝트가 담당합니다. Bridge에는 API 키나 보관함 데이터가 내장되지 않습니다.

명령은 저장소 루트 기준이며 Bridge 폴더는 `apps/android/bridge/`입니다.

## 요구 환경과 준비

Node.js 22.13.0 이상을 사용하세요. 별도 npm 의존성은 없으며 Node 기본 모듈만 사용합니다. `.command`는 macOS zsh용입니다. 다른 환경에서는 아래 절차대로 Bridge 폴더에서 `node server.mjs`를 실행하세요.

`apps/web`와 `apps/android`는 apps 아래 형제 폴더로 유지합니다. 웹 프로젝트에서 환경 설정 후 `npm ci`, `npm run taxonomy:generate`, `npm run build`, `npm run db:init`을 마치세요. DB 초기화·비밀값 설정의 상세 절차는 [설치 안내](setup.md)를 따르세요. 이 묶음에는 개인 DB·API 키·연결 코드가 포함되지 않습니다.

## 권장: PC 원클릭 실행기

저장소 루트에서 PC 실행기를 실행합니다.

```sh
node apps/android/launcher.mjs
```

실행기는 준비된 운영용 웹 빌드를 `127.0.0.1:5173`에 띄우고, Bridge를 `0.0.0.0:5174`에 바인딩합니다. 요청의 Host·Origin은 선택된 사설 IPv4 주소로 제한합니다. 기존 컷노트 서비스는 검사 후 재사용하고, 알 수 없는 서비스를 종료하지 않습니다. 종료 시에도 자신이 시작한 서비스만 종료합니다.

연결 코드는 `.cutnote-pairing.json`에 보존되어 재시작 후에도 유지됩니다. `connection.txt`에는 개인 연결 안내가 저장됩니다. 실행기의 JSON 저장은 mode 600을 요청하지만 Windows 소유자 전용 ACL을 적용하지 않습니다. 이 두 파일의 Windows 권한은 현재 보장하지 못하므로 개인 폴더에 체크아웃을 두고 파일 보안 탭에서 접근 권한을 확인하세요. Bridge 직접 실행의 안내 파일 보호와는 다릅니다. [확인한 결함](documentation-review-2026-10-03.md)을 참고하세요. 코드와 파일을 공유 저장소·채팅·로그에 올리지 마세요. 개인 터미널에서 실행하면 연결 정보를 확인할 수 있습니다. Bridge 재시작 시 기존 세션 쿠키는 만료되어 다시 인증해야 합니다.

## Bridge만 직접 실행

웹 프로젝트에서 먼저 `npm start`로 PC 서버를 실행한 뒤 새 터미널에서 실행합니다.

```sh
cd apps/android/bridge
node server.mjs
```

macOS에서는 Bridge 폴더의 `start.command`도 가능합니다. 이 스크립트는 `CUTNOTE_NODE`로 지정한 Node 실행 파일 또는 PATH의 `node`를 사용하며 개인 Codex 경로를 탐색하지 않습니다. `CUTNOTE_NODE`에는 실행 파일의 절대 경로를 지정하세요.

직접 실행은 감지한 **사설 IPv4 하나의 5174 포트**에만 바인딩하고 매번 새 연결 코드를 생성합니다. 원클릭 실행기의 코드 보존과 다릅니다. 여러 네트워크 장치가 있는 경우 `CUTNOTE_LAN_HOST`로 이 PC의 사설 IPv4를 지정할 수 있습니다.

TTY가 없는 실행 환경에서는 새 개인 파일의 절대 경로를 지정해야 합니다. 이미 존재하는 파일은 덮어쓰지 않습니다.

```sh
node server.mjs --connection-file /absolute/private/path/connection.txt
```

직접 실행한 Bridge는 정상 종료 시 이 안내 파일을 제거합니다. 실행 창을 닫거나 Control-C를 누르면 연결이 종료됩니다.

## 휴대폰·다른 컴퓨터 사용

- PC 자체 웹: `http://127.0.0.1:5173/`
- 휴대폰 앱 설정: `http://PC의사설IP:5174`와 연결 코드
- 같은 LAN의 다른 컴퓨터: `http://PC의사설IP:5174/`에서 코드 입력

브라우저 로그인은 정확한 `POST /pair`로만 처리하고 코드를 URL에 넣지 않습니다. Android는 최초 요청의 pairing 헤더로 인증합니다. 성공하면 HttpOnly·SameSite=Strict 세션 쿠키를 발급합니다. API 미인증 요청은401이며, AI 키 설정은 LAN에서403으로 차단합니다. OpenAI/Gemini 키는 PC의 로컬 웹에서 설정하고 모든 기기가 그 연결을 함께 사용합니다. 온라인 Site의 데이터와 자동 통합하는 기능은 아닙니다.

## 접근 제한

- 허용된 UI·정적 자산·API 경로만 loopback PC 서버에 전달합니다.
- `x-cutnote-client: lan`은 Bridge가 고정하고 클라이언트의 인증 헤더를 그대로 upstream에 넘기지 않습니다.
- 이미지·효과 검색, YouTube 추천, 추천 피드백, 보관함 정렬 등 현재 웹 기능의 정확한 경로와 메서드만 허용합니다.
- 요청과 일반 응답 최대28MiB, 일반 타임아웃210초, 동시 변경 요청4개입니다. media/segment-media GET·HEAD 스트리밍 응답은 최대2GiB, 전체24시간·유휴60초입니다. 업로드·Android 파일 저장 한도25MiB는 유지합니다.
- 작업 조회·접수·UUID별 취소/재시도 API를 허용합니다. 내부 작업·PC 폴더/도구 설정·AI 키 연결 API는 LAN에서 차단합니다. [API 기준](local-video-ingestion-reference.md)을 참고하세요.
- 브라우저 pairing 폼은 같은 Origin, 최대1KiB 본문, 시간 제한과 IP별 시도 제한을 적용합니다.
- 공개 `/health`는 간단한 생존 확인만 제공하며 사용자 데이터를 반환하지 않습니다. 개발 HMR WebSocket은 차단합니다.

이 서버는 TLS 없는 신뢰 가능한 LAN용입니다. 인터넷 포트 공개는 지원하지 않습니다. 기기 간 통신을 막는 게스트 Wi-Fi, 방화벽, PC 절전·IP 변경 시 연결되지 않을 수 있습니다. PC 운영용 빌드를 다시 만들고 서버를 재시작해야 웹 변경이 반영됩니다.

## 검사

```sh
node --check server.mjs
node --test server.test.mjs
```

위 명령은 Bridge 폴더 기준입니다. 현재 인증·경로·메서드·작업 API·29MiB 스트리밍 등을 확인하는 20개 테스트가 있으며 2026-10-03에 20/20 통과했습니다. 로컬 테스트 HTTP 서버를 띄우므로 loopback 통신이 허용된 환경에서 실행하세요. 리팩토링 4단계에서 Windows ACL을 포함한 19/19 통과와 실행기 연결을 확인했습니다. 19개 통과는 당시 기록이며 launcher JSON의 Windows ACL 보장은 아닙니다. 최신 범위는 [PC 구현 기록](local-video-ingestion-progress.md)을 따릅니다.
