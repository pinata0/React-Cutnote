# 조회 주기·진행률·정리 책임

[10단계 안내](README.md) · [Android 재진입](android-sequence.md)

## 조사 질문과 근거

“주기적으로 조회한다”는 설명만으로는 느린 요청의 중복, 오래된 응답의 역전, 화면 종료 후 남는 작업을 알 수 없다. [useLibrarySync](../../../../apps/web/features/library/use-library-sync.ts), [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx), [runner](../../../../apps/pc/runner.mjs), [process.run](../../../../apps/pc/process.mjs)의 시작·정리·응답 적용 조건을 대조했다.

## 주기와 수명 표

| 요소 | 조회/전달 주기 | 시작·중단 조건 | 요청·타이머·리스너 정리 | 주의할 차이 |
|---|---|---|---|---|
| PcIngest job 목록 | 즉시+3초 | mount 및 jobEndpoint 변경; terminal/비활성/hidden도 코드상 계속 조회 | cleanup: live=false, clearInterval | 진행 중 fetch를 abort하지 않음. 중복 요청 방지·응답 version·명시 timeout 없음 |
| PcIngest submit 자동 실행 | setTimeout 0, 시작 ref로 1회 | location의 shareLaunch 조건 만족 | effect cleanup clearTimeout | 제출 중 running ref는 중복 submit만 막고 GET 중첩은 막지 않음 |
| useLibrarySync 최초 조회 | mount 1회 | 초기 렌더 | 이후 수명 effect cleanup에서 현재 요청 abort | 첫 요청은 visible 검사 없이 실행 |
| useLibrarySync 자동 조회 | 5초, focus, online, visibilitychange | document.visibilityState=visible일 때; 진행 중 요청이면 생략 | 12초 timeout, 응답 finally clearTimeout; cleanup abort·4개 listener 해제 | 숨겨질 때 이미 시작한 요청을 즉시 취소하지 않음 |
| useLibrarySync 명시 갱신 | 버튼/cutnote:sync/mutation 뒤 | 이벤트는 visible일 때, 직접 refresh는 호출 조건에 따름 | 이전 요청 abort, 새 listRequestRef 번호 | 자동 조회와 달리 진행 중 요청을 대체함 |
| AI status | 즉시+15초+focus | visible일 때 | interval/focus 제거 | 진행 fetch abort·live guard 없음. 작업 상태 조회와 별개 |
| MobileRouter AI status | mount 1회 | PC/기존 경로 결정 | live=false로 응답 반영 차단 | fetch 자체는 계속될 수 있음 |
| 기존 MobileSaveSession | 10초+focus | saved 존재, analysis 없음, busy=false | AbortController, interval, focus 해제 | checking으로 중첩 방지; 해당 effect는 즉시 check를 호출하지 않음 |
| SegmentLibrary 파일 목록 | effect dependency 변경 시 | clip.id/segments/videoUrl 변경 | 요청 abort | 전용 interval 없음. 보관함이 새 segments 배열을 전달하면 재조회될 수 있음 |
| runner claim | 즉시+1.5초 | busy/stopped이면 생략 | close: timer 해제, active abort, busy 종료 대기 | 화면 종료와 무관한 Node 프로세스 수명 |
| runner heartbeat | 작업 중 5초 | claim 후 설치 | 작업 finally clearInterval | 요청 실패도 interrupted abort로 처리; 중첩 heartbeat 전용 guard는 없음 |
| 외부 도구 run | data/error/close 사건마다 | spawn 후 | finish: timeout/abort listener 제거, Promise 1회 완료 | stdout/stderr listener는 child 수명에 묶임; 수동 removeAllListeners는 없음 |
| 다운로드 용량 감시 | 2초 | download stage 처리 중 | download finally clearInterval/proxy.close/staging 삭제 | 진행률 폴링이 아니라 로컬 공간·크기 검사 |
| Bridge HTTP | 요청 단위 deadline | HTTP 접수부터 종료까지 | finally deadline 해제, 미완료 응답 close 때 upstream destroy | 화면 연결 종료가 이미 D1에 접수된 job 취소를 의미하지 않음 |
| Android WebView | OS lifecycle callback | onPause/onResume/onDestroy | destroyWeb: stopLoading/destroy, fileAccess.destroy | pause는 React unmount가 아님; 백그라운드 타이머 정확도는 OS에 의존 |

추가 근거: [MobileSave](../../../../apps/web/features/library/mobile-save.tsx), [workspace](../../../../apps/web/features/library/use-library-workspace.ts), [SegmentLibrary](../../../../apps/web/features/segments/segment-library.tsx), [media](../../../../apps/pc/media.mjs), [Bridge](../../../../apps/android/bridge/server.mjs), [MainActivity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java).

## 다운로드 출력이 화면 숫자가 되는 과정

[process.run](../../../../apps/pc/process.mjs)은 stdout data 청크를 줄 단위로 모아 onLine을 호출한다. stderr는 최근 8KiB를 모아 실패 분류·진단에 사용하며 UI로 스트리밍하지 않는다. close에서 성공 코드 또는 취소/오류로 Promise를 끝낸다. 개행 없는 마지막 stdout 잔여 줄을 onLine으로 별도 flush하는 코드는 없다.

[download](../../../../apps/pc/media.mjs)는 yt-dlp에 newline/progress-template을 지정하고 parseFloat가 유한 숫자인 줄만 `round(n*0.5)`로 전달한다. 정상 0~100% 출력이라면 화면용 다운로드 구간은 0~50이다. FFmpeg 정규화·poster 단계의 세부 진행률을 읽는 callback은 없다.

frames는 각 이미지 추출 후 `50 + round(완료 장수/전체 장수*25)`를 전달한다. runner는 단계 시작에 frames=50, analyze=80, commit=95를 기록하고 Worker complete가 100을 기록한다. export는 시작 50, 완료 100이며 세부 변환 퍼센트는 없다. OpenAI의 내부 처리량을 실시간 계측한 퍼센트가 아니다.

runner의 progress callback은 HTTP 요청을 await하지 않고 실패를 무시한다. Worker는 숫자를 0~100으로 제한하지만 이전 값보다 큰지 검사하지 않는다. 따라서 전달 순서와 진행률의 단조 증가를 보장하지 않는다. 최종 UI는 stdout을 직접 보는 것이 아니라 GET /api/jobs로 DB에 남은 최근 값을 읽는다. 프레임 progress가 높은 빈도로 발생하면 매번 별도 요청하며 별도 throttle은 없다.

## 취소·완료·실패가 보이는 방식

PcIngest는 cancel/retry POST 후 refresh한다. running의 취소는 먼저 cancelRequested가 표시되고, runner가 heartbeat 응답으로 flag를 읽어 AbortController를 중단한 뒤 fail로 cancelled를 기록한다. completed/failed/interrupted도 다음 목록 응답으로 표시한다. 화면이 숨겨졌다고 작업 취소를 호출하지 않는다.

상태 문구는 [jobMessages/terminalJob](../../../../apps/web/lib/jobs/types.ts)를 사용한다. 취소 요청 문구가 우선이고 이후 errorCode/state/phase 순서로 선택한다. terminal에서는 퍼센트를 숨긴다. 완료를 감지해 OS 알림이나 다른 기기 이벤트를 보내는 코드는 이 경로에 없다. 보관함 저장·태그·즐겨찾기 등의 toast는 사용자가 보낸 요청의 응답을 처리하는 해당 화면의 알림이다.

PcIngest의 성공한 주기 GET은 setError를 비우지 않는다. 일시적인 조회 오류 뒤 상태 목록이 회복돼도 이전 오류 문구가 남을 수 있다. GET에 version guard가 없어 같은 effect 안의 요청 응답이 역전되면 오래된 상태가 잠깐 덮일 가능성도 있다. 이는 소스에서 확인한 위험 조건이며 브라우저 지연 주입으로 재현하지 않았다. 제품 코드는 수정하지 않았다.

## 보관함 갱신과 다중 화면

useLibrarySync는 전체 clips/order를 받아 React 상태를 교체하고 선택된 클립도 최신 응답 객체로 바꾼다. query/filter/편집 draft를 전부 서버 상태로 초기화하지 않는다. listRequestRef로 GET 응답 순서를 확인하며 mutation 응답을 반영할 때도 번호를 증가시켜 이전 조회를 무효화한다. orderPendingRef/orderVersionRef는 순서 편집 중 오래된 order가 덮어쓰는 것을 방지한다. 이 ref 번호는 DB의 clips.revision과 다른 **화면 내부 요청 번호**다.

실패하면 이미 받은 clips는 유지하고 syncError를 표시한다. 처음부터 목록을 받지 못했으면 loadError도 표시한다. syncedAt은 클라이언트가 마지막 응답을 적용한 시각이며 서버 변경 시각이나 모든 기기의 동기화 완료 시각이 아니다. [LibraryWorkspace](../../../../apps/web/features/library/library-workspace.tsx)는 이를 LibraryConnection의 갱신 상태·버튼으로 전달한다.

각 탭·Android 화면이 같은 보관함을 조회하면 다음 성공한 GET에서 다른 화면의 편집을 본다. 숨겨진 보관함은 다시 visible/focus가 되었을 때 조회한다. 중간 변경 이벤트 목록·delta cursor·push ACK는 없다. jobs와 clips의 조회 주기가 달라 작업 completed와 결과 카드가 동시에 갱신된다는 보장도 없다.

## 검증·남은 의문

`node tests/web/sync-polling.test.mjs`를 실행해 5개 검사를 통과했다: 6초 요청이 5초 자동 조회 때문에 취소되지 않음, 12초 timeout 뒤 기존 목록 유지·재시도, 명시 갱신의 요청 대체, mutation 뒤 오래된 GET 무시, 조용한 실패 시 기존 목록 유지. 테스트는 실제 hook의 callback 본문을 VM/가짜 타이머·응답으로 실행하며 networkCalls=0이다. React DOM/Android/실제 서버 검증과 구분한다. [테스트 소스](../../../../tests/web/sync-polling.test.mjs)

남은 검증은 PcIngest 응답 역전·오류 회복, Android 백그라운드 제한, 느린 Bridge 연결에서 취소 표시 지연, 여러 탭의 편집/순서 충돌이다. 임시 테스트 서버로 응답 순서·지연을 제어하고 실제 기기에서 백그라운드→복귀를 관찰해야 한다. 주기는 코드의 예약 간격이지 사용자에게 보장되는 최대 지연이 아니다.
