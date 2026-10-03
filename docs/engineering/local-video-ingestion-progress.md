# PC 로컬 영상 수집 구현·검증 기록

[현재 구조·API](local-video-ingestion-reference.md) · [문서 대조·알려진 결함](documentation-review-2026-10-03.md) · [설계](local-video-ingestion-plan.md) · [학습 조사](local-video-ingestion-study.md) · [실행·운영 안내](local-video-ingestion-operations.md)

기준일: 2026-10-03, Windows / Node 24.14.0. **구현 및 독립 검증은 진행했으나 전체 완료 조건은 아직 충족하지 않았다.** 실제 OpenAI 키·모델 접근과 Android 실기기 검증이 남았고, 제공된 YouTube 링크는 현재 네트워크에서 429/로그인 요구로 차단됐다. mock 성공을 실제 서비스 성공으로 계산하지 않는다.

## 이어서 시작할 때

- 기존 사용자 변경은 조사 문서 2개와 문서 색인 2개였으며 보존했다. 사용자 DB·키를 테스트에 사용하지 않았다.
- 신규 구현: `apps/pc/`, 웹 jobs/internal API, `0009_pc_jobs` migration, PC/모바일 UI, Bridge allowlist/streaming, Android ACK.
- 도구·실제 Instagram 원본·격리 D1은 Git 제외 `.tools/` 아래에 있다. 키·영상·로그를 커밋하지 않는다.
- 다음 실행은 아래 미검증 절차를 따른다. 일반 웹 테스트나 실제 서비스 호출을 이유 없이 반복하지 않는다.
- 자동 예약·새 채팅·별도 에이전트는 생성하지 않았다.

## 완료 조건 판정

`통과`는 기재된 검증 수준에 한정한다. 실제 서비스/기기가 필요한 전체 항목은 자동 테스트가 있어도 `미검증`으로 남긴다.

| 번호 | 조건 | 종합 상태 | 확보한 증거 / 남은 검증 |
|---|---|---|---|
| 1 | PC YouTube 다운로드→OpenAI→저장 | 실패 | 사용자 제공 YouTube 테스트 링크: 429·로그인 요구. 원본 확보 이후 실제 OpenAI 검증도 남음 |
| 2 | PC Instagram 동일 흐름 | 미검증 | 사용자 제공 Instagram 테스트 링크: 실제 다운로드·정규화·썸네일·37프레임 통과. 유료 분석·최종 결과는 미검증 |
| 3 | Android YouTube 실제 공유 진입 | 미검증 | 기존 Intent/LinkPolicy 보존, JVM 통과. 실제 YouTube 앱·APK 검증 필요 |
| 4 | 공유→기존 인증→PC 영속 접수 | 미검증 | 실 HTTP Bridge 인증·작업 API, 실제 Worker/D1 접수 통과. 실기기 전체 연결 필요 |
| 5 | 접수 후 모바일 종료에도 PC 완료 | 미검증 | 독립 runner mock 완료, 실제 제출 요청 종료 후 FFmpeg·분석 실패 기록/구간 export 완료. 실제 모바일 종료+OpenAI 완료 필요 |
| 6 | 재접속 진행·결과 확인 | 통과(API) | 실제 D1 상태 조회·서버 재시작 후 동일 작업 조회. PC 브라우저의 모바일 복원 주소 표시 통과. 실기기 UI는 별도 미검증 |
| 7 | 동일 공유 재전송 중복 방지 | 통과(API/SQL) | 동시 동일 requestId 제출·응답 재전송·삭제 tombstone·retag 완료 후 재전송. job/clip 하나 |
| 8 | 미연결/다운로드/분석/취소 구별 | 통과(독립 검증) | 실제 downloader 제한/원본 보존+키 없는 분석 실패, SQL 취소/재시도, 실제 자식 프로세스 취소. 실기기 표시 확인 필요 |
| 9 | 재시작 상태 유실/영구 진행 방지 | 통과(API/SQL) | 실제 Worker 종료·재시작 후 실패/완료 상태 유지, SQL lease 만료→interrupted. 전원 강제 종료 실험은 미검증 |
| 10 | 로컬 재생·seek·구간 재분석 | 미검증 | 실제 원본/구간 Range·FFmpeg export 통과, retag SQL·수동 검수 보존 통과. PC 브라우저 디코딩·구간 이동/정지 통과. 기기 seek와 실제 OpenAI retag 필요 |
| 11 | 기존 주요 기능·필수 검사 | 미검증(일부) | 웹 13/13·Bridge 20/20·Node 6/6·JVM 211·lint/type/build 통과. 최종 변경 후 필수 재검사 완료; APK/실기기 미검증 |
| 12 | 새 경로 Google API/Gemini 없음 | 통과(코드/독립 검증) | runner는 `/api/ai/frames`만 사용, 결과 parser는 OpenAI engine만 허용, PC 편집기 링크 분기 검사. 실제 유료 호출 trace는 미검증 |

YouTube 공개 웹페이지·CDN·동의 리디렉션 접근은 Google API 사용과 구분한다. 기존 앱의 추천/Gemini 기능은 제거하지 않았다.

## 반복 1 — 작업 수명을 PC로 이전

- 목표: 모바일과 무관한 접수·실행·결과 반영을 만든다.
- 원인: 기존 화면이 분석 요청과 후속 PATCH를 소유하여 화면 종료 시 작업을 보장할 수 없었다.
- 수정: D1 `pc_jobs`와 clip local_asset/last_job_id, 멱등 접수, lease·heartbeat·취소·명시 재시도, revision 조건부 결과 반영. Node gateway 5173 / Worker 5175 / 기존 Bridge 5174.
- 검증: 메모리 SQLite에 migration 전체 적용. 동시 접수 fixture의 비동기 batch가 중첩 트랜잭션을 만들던 테스트 구현을 실제 D1 batch의 원자성에 맞게 수정했다. 애플리케이션 검증 조건을 제거하지 않았다.
- 결과: 동일 ID 중복·다른 payload 충돌·lease/삭제/취소·원본 attach 검사 통과.

## 반복 2 — 도구·저장소·스트리밍

- 목표: 브라우저 Blob 크기와 모바일 수명 제약 없이 원본을 확보한다.
- 수정: 도구 절대 경로와 버전 점검, shell 없는 spawn, 비밀 환경 제외, 프로세스 트리 취소, 안전한 root/UUID 상대경로, 디스크/시간/크기 제한, checkpoint와 임시 파일 정리.
- 수정: local media GET/HEAD Range 스트리밍, R2 fallback, Bridge media 응답 한도 2GiB 및 idle 제한. 일반 요청 한도 28MiB 유지.
- 검증: Windows sandbox에서는 기존 esbuild/자식 프로세스 검사까지 환경 오류로 실패했다. 승인된 제한 해제 실행에서는 실제 프로세스 취소·29MiB HTTP 스트리밍·Range가 통과했다. 이를 애플리케이션 성공 증거와 구분했다.
- 결과: Node 4/4, 기존 Bridge 19/19 통과. 이후 인증 jobs/29MiB Bridge 실전달 검사를 추가하여 20/20 통과.

## 반복 3 — PC·모바일 UI 및 검수 보존

- 목표: 기존 공유 Intent와 shareId를 유지하고 durable ACK를 표시한다.
- 수정: `/mobile`에서 PC 기능 가용성을 확인하여 jobs로 접수. 접수 이후 `accepted/saved/job` 주소 복원. PC 기존 추가 폼도 jobs 사용, 제출 실패 재시도 중 requestId 보존. 상태 polling·취소·실패 단계 재시도·폴더/도구 UI.
- 수정: 로컬 원본의 전체/구간 재분석은 jobs로 보낸다. PC 링크의 기존 자동 resolve/Gemini 버튼 경로를 차단하고 OpenAI 설정 안내를 표시한다. 기존 파일 업로드 경로 유지.
- 실패/수정: lint의 내부 Link 규칙과 effect의 동기 state 변경을 수정했다. 자동 공유 제출은 취소 가능한 예약 callback에서 시작하며 StrictMode 재실행에도 중복 전송을 방지한다.
- 검증: 수동 제목·메모·custom tag·구간 제목·거절한 태그·즐겨찾기 보존, revision 충돌, retag 재전송 검사 통과. 기존 웹 회귀 13/13 통과.

## 반복 4 — 실제 다운로드에서 드러난 환경·포맷 차이

- 목표: 사용자가 제공한 두 링크를 실제 yt-dlp/FFmpeg로 확인한다.
- 환경: 공식 yt-dlp 2026.08.19, FFmpeg/ffprobe 9.0.2 essentials를 `.tools`에 받고 SHA256 확인. npm 의존성 변경 없음.
- 실패/원인: Node `resolve4`가 이 PC에서 ECONNREFUSED지만 OS `lookup`은 성공했다. OS IPv4 조회→공개 주소 검증→같은 IP 연결로 수정하여 SSRF 제한을 유지했다.
- 실패/원인: YouTube의 공개 페이지 동의 리디렉션을 프록시가 거부했다. 정확한 `www.google.com/consent.google.com` 호스트를 추가했다. 그 뒤 실제 응답은 429와 로그인 요구였다. 이 외부 제한은 무의미하게 반복하지 않고 중단했다.
- 실패/원인: Instagram extractor에 duration/height가 없으면 filter에서 제외되었다. 미확인 메타데이터는 허용하되 실제 내려받은 파일을 ffprobe로 검증하도록 수정했다. H.264 우선과 안전한 포맷 fallback/변환을 추가했다.
- 실패/원인: 프레임 마지막 seek에 다음 프레임이 없고 JPEG 색 범위 초기화가 실패했다. 정규화된 파일에서 길이를 다시 읽고 끝 sample에 0.1초 여유, JPEG format을 지정했다.
- 결과: Instagram 전체 경로 재실행 통과, **3,246,104 bytes / 18.166667초 / JPEG 37개**. 실제 OpenAI 요청은 하지 않았다. YouTube 실제 다운로드 실패는 그대로 기록한다.

## 반복 5 — 실제 Worker·D1·Bridge와 구간 작업

- 목표: 모듈 mock을 넘어 PC 실행 계약을 확인한다.
- 수정: 실행별 private token 파일, Windows 소유자 ACL, 기존 env 보존, PC 암호화 키 생성, readiness의 내부 token 확인, owned process 종료, 다음 실행의 임시 파일 정리. 실행기 IPC 종료를 추가해 Windows 강제 child.kill로 작업자가 남는 문제를 줄였다.
- 수정: local 구간 export도 영속 작업으로 처리한다. FFmpeg 360p 출력→job 결과→기존 segment media URL로 연결하고 원본/구간 fingerprint가 달라지면 이전 파일을 숨긴다. 구간 시간 변경 후 stale export 차단 검사 통과.
- 검증: `tests/pc/worker-smoke.mjs`는 격리 D1을 migration하고 실제 built Worker·gateway·Bridge를 시작한다. 이전 실제 Instagram 원본을 cache fixture로 사용하여 추가 네트워크 다운로드 없이 실제 프레임 추출, 키 미연결 분석 실패, 원본 Range, 구간 변환·Range, 인증/금지 경로, 종료·재시작 상태를 확인했다.
- 결과: 통과. 이것은 실제 OpenAI 서비스나 실제 Android WebView 검증이 아니다. JVM 기존 6종은 49+25+20+32+23+62 = **211개** 통과.

## 반복 6 — 마지막 경계와 화면 확인

- 목표: 재시작 임시 파일, 마지막 구간 프레임, 실제 브라우저 표시를 확인한다.
- 수정: remux/변환 결과를 임시 staging/frames에 쓰고 검증 후 최종 이름으로 이동한다. 완성 원본 manifest를 먼저 남겨 취소 후 재사용한다. 프레임 seek는 평균 프레임 간격을 고려하여 마지막 표시 프레임도 추출한다. root가 나중에 junction으로 바뀐 경우도 거부한다.
- 검증: 실제 Instagram의 전체 37 JPEG와 끝 구간 17–18.166초를 추출하여 기존 `parseFrameInput` 통과. 수정 후 실제 Instagram 전체 경로와 Worker smoke 재검증 통과. 추가 네트워크 분석 호출 없음.
- 검증: 임시 관리 폴더만 삭제하고 원본·사용자 폴더를 보존하는 검사와 Windows junction 차단 검사 통과. Node 6/6, Bridge 20/20, 웹 13/13, JVM 211개. 최종 웹 lint·타입·빌드 통과(기존 Vite import/dynamic-import 경고는 남음).
- UI: 격리 보관함을 Codex 내장 브라우저로 열었다. 원본 duration 18.166667초와 export duration 2초, readyState 4·decode error 없음. 선택 구간 재생은 1초로 이동하고 약 3초에서 정지했다. 모바일 복원 주소에 분석 실패·재시도·보관함 링크가 표시됐다. Android 화면으로 간주하지 않는다. 임시 UI 서버와 탭은 종료했다.
- 문서: 상대 링크 263개 확인. 처음 링크 검사기가 URL 인코딩된 대괄호를 해제하지 않아 낸 오탐을 검사기에 반영해 재확인했다. 공개 검사는 Mermaid의 `token` 라벨을 값으로 오인하여, 다이어그램을 `내부 인증`으로 표현했다. 검사 규칙은 완화하지 않았다. 비밀 탐지 단위 4/4 및 임시 인덱스 후보 291개 검사 통과, 실제 인덱스 미변경.
- 추가 확인: OpenAI 타임아웃의 숫자 오류 코드를 분석 실패로 분류하는 검사 통과. 초기 연결 상태를 확인하기 전에는 기존 편집기의 자동 링크 분석을 시작하지 않도록 막았다. Drizzle 0009 snapshot을 현재 schema에서 생성하고 `db:generate`의 변경 없음 결과를 확인했다.
- 남음: 실 OpenAI/Android와 YouTube 외부 제한. 필요한 사용자 조치는 운영 안내에 남겼다. 전체 완료로 보고하지 않는다.

## 실제 수정 지도

| 영역 | 유지·수정·추가 내용 |
|---|---|
| `apps/pc/{start,settings,process,egress,media,runner,server}.mjs` | 새 PC 프로세스/도구/설정/작업 루프/파일·Range 경계 |
| `apps/web/lib/jobs/`, `app/api/jobs/`, `app/api/internal/jobs/` | 영속 접수·멱등성·lease·실패·취소·조건부 결과 반영 |
| `db/schema.ts`, `drizzle/0009_pc_jobs.sql`, journal | 기존 migration 보존, 새 스키마 추가 |
| `lib/server.ts`, `lib/clips.ts`, media·segment-media | 로컬 영상 직렬화·gateway 연결, 기존 R2 저장/재생 유지 |
| library의 pc-ingest/mobile-save/editor/hooks, segment-library/retag | PC 상태 UI·기존 공유 진입·수동 편집 보존·로컬 원본 재분석/export |
| `apps/web/scripts/start-pc.mjs`, `init-local-db.mjs` | Node gateway 시작, 기존 D1/R2 경로 유지, 테스트용 격리 state 옵션 |
| `apps/android/bridge/server.mjs`, `launcher.mjs`, `MainActivity.java` | 기존 pairing/Intent 유지, jobs 허용·스트리밍·IPC 종료·accepted ACK |
| `tests/web/pc-jobs.test.ts`, clip-analysis, `tests/pc/`, Bridge test | SQL/실 프로세스/선택적 서비스·Worker 통합 검증 |
| docs 색인·setup/testing/architecture/android/lan, 운영·본 기록 | 구현 상태·실행·복구·실제 검증의 한계 연결 |

## 설계에서 구체화한 선택과 남은 개선

- `ingest_requests/media_assets/job_results`를 각각 만들기보다 최초 ingest의 **requestId=jobId=clipId**, clips.local_asset와 pc_jobs.result로 단순화했다. 기존 APK의 saved ACK 호환성을 보존한다. 동일 영상의 별도 새 공유까지 dedup하는 기능은 아직 없다.
- 원본 경로는 제목 대신 UUID 고정 파일명이다. 제목 변경·특수문자가 파일 경로를 바꾸지 않는다. 원본 파일과 폴더 이동은 UI root 설정 계약을 따라야 한다.
- 로컬 경로를 R2로 복사하지 않는다. D1은 ID/상대 파일 정보만 저장하고 gateway가 설정된 root에 연결한다. 공개 API에서 절대 경로나 내부 token은 반환하지 않는다.
- crash recovery는 자동 유료 재분석보다 interrupted와 명시 재시도를 기본으로 한다. AI 응답을 받기 전에 PC가 꺼졌다면 provider 처리 여부를 알 수 없으므로 재시도가 추가 비용을 낼 수 있다.
- 원본·checkpoint·지난 export 자동 GC, URL 전체 중복 제거, 작업 목록 pagination, 쿠키/로그인, 도구 자동 업데이트, thumbnail 별도 고도화는 후속 개선이다. 앱은 로컬 원본을 임의 영구 삭제하지 않는다.
- 기존 R2 파일/태그/보관함/추천 경로는 유지한다. 온라인 배포에 PC 도구나 로컬 파일을 옮기지 않는다.

## 재현 명령과 남은 외부 조치

저장소 루트:

```powershell
node tests/run-web.mjs
node --test tests/pc/runtime.test.mjs apps/android/bridge/server.test.mjs
# 공식 도구와 다운로드 허용 링크를 준비한 뒤에만:
$env:CUTNOTE_LIVE_PROVIDER='instagram'
node tests/pc/live-download.mjs
node tests/pc/worker-smoke.mjs
```

웹 lint/type/build와 JVM 명령은 [테스트](testing.md), PC 설정·OpenAI 연결·실기기 확인의 정확한 조작과 기대 결과는 [운영 안내](local-video-ingestion-operations.md)를 따른다. `.tools/live-ingestion`과 `.tools/worker-smoke`는 개인 테스트 산출물이며 공개하지 않는다.

남은 필수 외부 조치: OpenAI 연결 후 Instagram 전체 완료 및 구간 재분석, YouTube 제한 해소 후 다운로드·분석, Android APK/실기기의 공유·재전송·접수 후 화면 종료·재접속·재생. 준비가 되기 전에는 전체 기능을 완료로 표시하지 않는다.
