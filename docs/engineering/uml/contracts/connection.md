# Android·Bridge·실행기의 공개 동작

[3단계 안내](README.md) · [기존 Android 그림](../android.md)

## 무엇을 왜 조사했는가

Android의 공유 이벤트, 연결 검증, 파일 저장과 PC 작업 실행을 구분한다. Java의 `public`은 HTTP 공개가 아니며 동기 메서드도 내부에서 Thread를 시작할 수 있다. 아래 Java 파일의 package는 모두 `app.cutnote.mobile`이다. `override`는 원본 @Override 표시를 뜻한다. 표시가 없는 정책 메서드는 override가 아니다.

## Java 주요 계약

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [MainActivity](../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java) | onCreate(Bundle):void | public, override, instance | 동기 lifecycle | 복원 Bundle | preferences·FileAccess·Intent·화면 초기화, 필요 연결 시작 | 호출 |
| MainActivity | onNewIntent(Intent):void | protected, override, instance | 동기 callback | 새 공유/일반 진입 | setIntent·공유 추출·pending/진입화면 변경 | 호출 |
| MainActivity | receiveShare(String link):void; persistPendingShare():void | private, instance | 동기 진입 | URL / 없음 | ShareRequest 생성 및 preferences 저장; SharedPreferences.apply의 디스크 반영은 비동기 | 호출 |
| MainActivity | openPending(boolean restore):void | private, instance | 동기 진입 | 복원 여부 | pending mobilePath 또는 보관함 경로 선택·연결/웹 열기 | 호출 |
| MainActivity | verifyConnection(String address,String secret,boolean save,boolean restore,String targetPath):void | private, instance | Thread 시작 후 반환 | 연결/목적 경로 → void | ConnectionProbe.check를 background 실행, generation 비교 후 UI·cookie·preferences 갱신; 실패는 연결 오류 화면 | 호출 |
| MainActivity의 익명 WebViewClient | doUpdateVisitedHistory(WebView,String url,boolean reload):void | public, override, instance | UI callback | 현재 web·동일origin·허용path URL | accepted 또는 saved가 pending id와 같으면 pending 제거/저장. 분석 완료 검사는 아님 | 호출 |
| MainActivity | onPause():void; onResume():void | protected, override, instance | 동기 callback | 없음 | WebView pause/resume, PC 취소 호출 없음 | 보조 |
| MainActivity | onSaveInstanceState(Bundle):void; onActivityResult(int,int,Intent):void | protected, override, instance | 동기 callback | Bundle/외부화면 결과 | UI·FileAccess 복원 상태 저장/선택 결과 전달 | 보조 |
| MainActivity | onDestroy():void | protected, override, instance | 동기 callback | 없음 | generation 무효화·FileAccess.destroy·WebView 파괴; PC job 취소 아님 | 호출 |
| MainActivity | onBackPressed():void | public, override, instance | 동기 callback | 없음 | 설정/웹 뒤로가기·기본 lifecycle 분기 | 보조 |
| [ShareRequest](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ShareRequest.java) | create(String link):ShareRequest; restore(String link,String id):ShareRequest | public static, override 아님 | 동기 | 유효 입력 → 객체, 무효 링크 null | create UUID생성; restore 유효ID 유지·무효ID 재생성. 자체 영속저장 안 함 | 호출 |
| ShareRequest | changedIncomingShare(String incoming,String previous):boolean | public static | 동기 | 링크 비교 → boolean | 순수 비교 | 보조 |
| ShareRequest | mobilePath():String | public instance | 동기 | → /mobile query | URL인코딩·shareId 전달, HTTP 전송 아님 | 호출 |
| [ConnectionProbe](../../../../apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java) | check(String base,String pairing):Result throws IOException | public static | **동기 blocking** | → json/cookie/clipsJson | status→clips HTTP; 연결6초/읽기12초·리다이렉트 금지·응답제한; Failure.kind/IOException. 호출자는 Thread 사용 | 호출 |
| [LinkPolicy](../../../../apps/android/app/src/main/java/app/cutnote/mobile/LinkPolicy.java) | extractSharedParts(Iterable<String>):String; extractSharedLink(String):String | public static | 동기 | 텍스트 → 링크 또는 null | 지원플랫폼 우선 추출; 다운로드 허용 판정과 다름 | 호출 |
| LinkPolicy | normalizeBase(String):String; normalizeComputerBase(String):String | public static | 동기 | → 정규 origin 또는 null | HTTP 사설주소/HTTPS 규칙, computer는 loopback 거절; 네트워크 없음 | 보조 |
| LinkPolicy | sameOrigin(String base,String candidate):boolean; externalHttp(String candidate):boolean; internalPath(String base,String candidate):String | public static | 동기 | → boolean / 경로 또는 null | 주소 비교·내부경로 제한, 실패 false/null | 보조 |
| [EntryPolicy](../../../../apps/android/app/src/main/java/app/cutnote/mobile/EntryPolicy.java) | openLibrary(boolean freshShare,boolean restoring,boolean fromHistory):boolean; path(boolean shareActive,ShareRequest pending,String current):String; canRefreshLibrary(String base,String currentUrl):boolean | public static | 동기 | 진입 상태 → 선택/경로 | 순수 정책, 화면 전환 자체는 Activity 책임 | 보조 |
| [DownloadTransfer](../../../../apps/android/app/src/main/java/app/cutnote/mobile/DownloadTransfer.java) | copy(String base,String url,String cookie,String pairing,String expectedMime,long expectedLength,OutputStream output,Progress progress):long throws IOException | public instance | **동기 blocking** | → 복사 bytes | 인증된 PC 파일→Android output 쓰기;25MiB·MIME·URL·취소 검사; Failure/InterruptedIOException 등 | 호출 |
| DownloadTransfer | cancel():void; isCancelled():boolean | public instance | 동기 | 취소 설정 / 조회 | cancel은 active HTTP disconnect; PC 다운로드 job 취소 아님 | 호출 |
| DownloadTransfer.Progress | update(long downloaded,long total):void | 암시적 public abstract, interface | 호출자 thread callback | 진행 byte | 구현이 UI thread 전환 책임 | 보조 |
| DownloadTransfer.Failure | Failure(String message) | public constructor | 동기 | IOException 객체 | throw 자체는 호출부에서 수행 | 생략 |
| [DownloadPolicy](../../../../apps/android/app/src/main/java/app/cutnote/mobile/DownloadPolicy.java) | allowed(String base,String url):boolean; videoMime(String mime):String; filename(String disposition,String mime):String | public static | 동기 | → 허용/정규MIME 또는 null/파일명 | URL·종류·이름 제한; 실제 저장 없음 | 보조 |
| [UploadPolicy](../../../../apps/android/app/src/main/java/app/cutnote/mobile/UploadPolicy.java) | accepted(String[] input):String[]; allowed(String mime,String[] accepted):boolean | public static | 동기 | → MIME목록/허용 | 업로드 선택 정책,네트워크 없음 | 보조 |
| [FileAccess](../../../../apps/android/app/src/main/java/app/cutnote/mobile/FileAccess.java) | FileAccess(Activity,Connection,Bundle) | package-private constructor | 동기 | 파일 UI 소유 객체 | Activity/복원 상태 참조; public 서비스 아님 | 보조 |
| FileAccess | download(String url,String disposition,String mime,long length):void; choose(WebView,ValueCallback<Uri[]>,FileChooserParams):boolean | package-private instance | UI 시작 후 반환 | 다운로드/업로드 선택 | Android 문서 선택기 호출, 즉시 파일완료가 아님 | 호출 |
| FileAccess | result(int requestCode,int resultCode,Intent data):boolean; save(Bundle):void; cancelChooser():void; destroy():void | package-private instance | callback/동기 종료 요청 | 처리여부/void | result 후 전송 Thread, destroy 취소·thread interrupt·UI 정리. 부분 파일 정리는 전송 결과 처리와 연동 | 호출 |
| FileAccess.Connection | base():String; pairing():String | interface 메서드 public abstract, enclosing package-private | 동기 | 현재 연결값 | Activity 익명 구현은 public override. 값을 로그에 넣지 않음 | 보조 |

익명 WebViewClient의 로드/오류/SSL callback과 WebChromeClient의 chooser/window callback은 [선언 목록](../declarations/connection.md)에 모두 보존했다. ACK·공유·연결·전송에 필요한 호출만 위 표에 상세 표시하고 일반 페이지 진행 표시를 별도 운영 요소로 만들지 않았다.

## Bridge·실행기 계약

| 소속 요소 | 함수/메서드 시그니처 | 공개 범위 | 비동기 여부 | 입력/출력 | 부수 효과·오류 | UML 표시 여부 |
|---|---|---|---|---|---|---|
| [Bridge](../../../../apps/android/bridge/server.mjs) | createBridge({publicOrigin,projectRoot,upstream,pairingSecret,maxBytes,timeout}) | export | 동기 | → `{server,pairingSecret}` | 서버/메모리session 준비만. listen은 main/launch 책임. 인증·크기·시간·허용 API는 [HTTP 표](http.md) | 호출 |
| Bridge | privateIPv4(address); discoverAddress(interfaces=networkInterfaces()) | export | 동기 | → boolean / 사설IPv4 | 인터페이스 조회, 후보없음 throw | 보조 |
| Bridge | allowedPath(pathname,method,projectRoot); findProject(start=모듈폴더) | export | 동기 | → boolean / 웹루트 | 경로/메서드 정책·파일 존재 검사; 프로젝트없음 throw | 보조 |
| Bridge | protectConnectionFile(filename,file); writeConnectionFile(filename,details) | export | async | → void | 파일권한/Windows ACL; write는 절대경로 wx 생성·보호 후 쓰기,finally handle close. 실패 파일 unlink 보장은 없음 | 보조 |
| Bridge | main(); stop closure | 내부 CLI | async / 동기 | listen 완료 / void | main은5174 선택주소 listen,signals의 stop은 server.close/closeAllConnections·연결파일 비동기unlink | 호출 |
| [launcher](../../../../apps/android/launcher.mjs) | readPrivateJson(filename); writePrivateJson(filename,value) | export | async | → 객체/null / void | read16KiB·nofollow·오류메시지 정리; write임시파일600/fsync/rename. Windows ACL 추가 설정은 이 함수에 없음 | 보조 |
| launcher | connectionCode(value); persistentCode(value) | export | 동기 | → 검증한 코드 또는 null | persistent의 잘못된 저장구조 throw, 임의 재발급 안 함 | 보조 |
| launcher | chooseAddress(interfaces,override) | export | 동기 | → LAN 주소 | override는 실제 인터페이스 사설IPv4여야 함; 아니면 throw | 보조 |
| launcher | probeJson(url,headers={},timeout=2500); pcReady(result) | export | Promise 반환 / 동기 | → response/offline/occupied / boolean | HTTP16KiB probe; 거절연결만 offline,timeout은occupied; pcReady는 workspace/JSON 상태 검사 | 호출 |
| launcher | acquireLock(filename,alive=processExists) | export | async | → async release 함수 또는 null | wx lock·죽은소유자 확인·자기소유권일치 시 unlink;실패 reject/경합null | 호출 |
| launcher | showConnection(origin,code,{write,personalTTY}={}) | export | 동기 | → void | 연결정보 출력,코드는 개인TTY일 때만 출력. 문서 검사 중 실행하지 않음 | 생략 |
| launcher | launch(options={}) | export | async | → busy 응답 또는 origin/code/ownsServices/ownsPc/ownsBridge/close/child/server | 기존PC·Bridge 확인/재사용; 필요자식시작·5174 listen·연결정보저장. 불명확한기존서비스 교체 안 함;오류는 close 후throw | 호출 |
| launch 반환 객체 | close() | 반환 API | async | → void | idempotent; 자기Bridge 종료,자기PC에 IPC shutdown 또는 SIGTERM·최대5초 대기,lock해제. 재사용서비스 종료 안 함 | 호출 |

## 설계 판단·읽는 방법·미확인

`public static check`에 async 키워드가 없다는 이유로 빠른 순수 함수로 그리면 안 된다. Android Thread→check→UI callback을 따로 그린다. 반대로 JS createBridge/startRunner는 동기 factory여도 후속 이벤트·timer를 시작한다.

launch.close의 5초 대기 종료는 자식 종료가 반드시 확인되었다는 보장이 아니다. Windows 연결 JSON ACL 문제는 [기존 검증 기록](../../local-video-ingestion-progress.md)의 알려진 제한이며 문서로 해결 처리하지 않는다. APK·실기기 lifecycle 타이밍·강제종료는 이번에 재검증하지 않았다. HTTP session은 Bridge 메모리에 있으므로 서버 재시작 후 재인증과 영속 job 복구는 다른 과정이다.
