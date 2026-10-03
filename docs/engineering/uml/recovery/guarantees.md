# 실제 보장과 미지원 동작

[9단계 안내](README.md) · [재시도 시퀀스](sequences.md) · [도메인 저장 구조](../domain/storage.md)

## 무엇을 왜 조사했는가

같은 요청을 재전송하거나 파일 쓰기와 DB 갱신 사이에 중단될 때, 무엇이 남고 무엇을 다시 수행하는지 확인했다. 아래의 “보장”은 해당 코드의 조건부 동작을 뜻한다. 실제 디스크 내구성·네트워크·다중 프로세스 경쟁까지 실험으로 증명한 것은 아니다.

| 상황 | 코드에서 확인한 동작 | 보장하지 않는 것·검증할 부분 | 근거 |
|---|---|---|---|
| 모바일 종료 | 접수 후 독립 Node runner가 D1 queued를 처리 | PC 종료 중 계속 처리, 접수 전 요청의 자동 PC 전송 | [PcIngest](../../../../apps/web/features/library/pc-ingest.tsx), [runner](../../../../apps/pc/runner.mjs) |
| 같은 요청 재전송 | 요청 ID PK와 payload 비교, ON CONFLICT로 중복 행 방지 | 다른 ID의 같은 URL 중복 제거, AI 호출 exactly-once | [submit](../../../../apps/web/lib/jobs/server.ts) |
| AI 완료 전 중단 | 원본을 이미 attach했다면 원본 유지, 추출·분석 재실행 | 스트리밍 응답/분석 중간 추론 이어받기, 비용 중복 방지 | [runner](../../../../apps/pc/runner.mjs) |
| AI 성공 후 DB 실패 | 기록된 체크포인트가 조건에 맞으면 결과 재사용 | 기록 전 종료 시 응답 복원; 손상 result 자동 재생성 | [runner](../../../../apps/pc/runner.mjs), [complete](../../../../apps/web/lib/jobs/server.ts) |
| 파일 rename 후 attach 전 중단 | asset.json과 원본 크기가 맞으면 download가 재사용 | manifest 작성 전 종료된 원본 자동 인식, 원본 내용 hash 검증 | [download](../../../../apps/pc/media.mjs) |
| DB에 원본이 있으나 파일 없음 | stat 실패를 source_missing으로 보고 | 같은 작업 retry만으로 원본 재다운로드; 폴더 자동 탐색 | [runner](../../../../apps/pc/runner.mjs) |
| 임시 파일 | download/frames/export의 finally 및 기동 정리 | 강제 종료 순간 finally, 모든 *.tmp 일괄 정리 | [media](../../../../apps/pc/media.mjs), [atomicJson](../../../../apps/pc/settings.mjs) |
| 취소 | queued 즉시 cancelled; running은 flag→heartbeat→abort→fail | 외부 AI 비용 회수, 이미 완료한 원본·체크포인트 삭제, 모든 타이밍 즉시 취소 | [changeJob/workerAction](../../../../apps/web/lib/jobs/server.ts), [runner](../../../../apps/pc/runner.mjs) |
| 클립 삭제 | 클립 행 삭제, 기존 R2 키 및 구간 캐시 정리 시도 | pc_jobs·PC 원본·manifest·checkpoint 동시 삭제; job에는 clip FK 없음 | [DELETE](../../../../apps/web/app/api/clips/[id]/route.ts), [migration](../../../../apps/web/drizzle/0009_pc_jobs.sql) |
| 재시작 | 만료 running을 interrupted/cancelled, 기존 queued 처리 | 중단된 작업 무조건 자동 재시도, 시스템 백업·재해 복구 | [recover](../../../../apps/web/lib/jobs/server.ts), [startPc](../../../../apps/pc/start.mjs) |
| 구간 내보내기 | 완료 result와 현재 asset/구간의 일치 여부로 파일 노출 | 원본·구간 변경 시 과거 export 자동 재사용 또는 자동 삭제 | [localSegments](../../../../apps/web/lib/jobs/server.ts), [exportLocal](../../../../apps/pc/media.mjs) |

## 파일과 DB는 하나의 트랜잭션이 아니다

원본 기록 순서는 정규화 중간 파일→video.mp4 rename→asset.json→poster 시도→asset.json→D1 attach다. 파일이 완성되어도 DB에 아직 연결되지 않은 구간이 있다. 반대로 DB에 asset이 있어도 사용자가 파일을 옮기거나 지우면 연결이 깨진다. D1 batch는 Node 파일 작업을 포함하지 않는다.

atomicJson은 임시 파일 write→sync→close→rename으로 JSON 교체를 시도한다. 디렉터리 fsync나 전원 차단 내구성 전체를 보장하는 구현으로 표현하지 않는다. write/sync/close가 실패하면 rename 구간의 finally에 도달하지 않아 tmp가 남을 수 있다. cleanTemporary는 staging/frames만 정리한다. 자세한 기존 발견은 [수명 조사](../lifetime/jobs-files.md)를 따른다.

DB asset이 없어서 download에 들어가면 toolchain/공간 점검을 먼저 거친 뒤 manifest를 재사용한다. 따라서 파일이 이미 있어도 도구 누락이나 여유 공간 부족이 재사용 전에 실패를 만들 수 있다. 현재 rootId를 바꾸면 이전 root의 미연결 manifest를 자동 검색하지 않는다. 반면 DB asset이 있으면 그 asset.root로 저장된 매핑을 사용한다.

체크포인트 비교의 videoSize는 현재 파일을 다시 잰 값이 아니라 asset.size 메타데이터다. DB asset 경로에서는 stat 성공만 확인한다. payload/size가 같아도 파일 내용이나 모델·프롬프트가 바뀐 사실을 감지하지 못할 수 있다. 체크포인트가 JSON으로 읽히지만 보고서 검증에 실패하는 경우, 같은 파일을 자동 폐기하지 않아 반복 실패할 수 있다. 이 항목들은 코드로 확인한 조건이며 오류 주입 재현은 미실시다.

## 현재 분석·이력·revision은 서로 다르다

| 동작 | 현재 analysis | analysis_history | revision/충돌 |
|---|---|---|---|
| 일반 클립 POST | 입력 report를 parseAnalysis 후 저장 | report 있으면 1개로 초기화 | 0으로 생성 |
| 일반 PATCH | analysis 필드 제출 시 교체 또는 null, 미제출 시 유지 | 이전 현재 report가 없으면 추가; 새 report가 다를 때 추가 후 slice(-10) | 요청 revision/expected는 선택 검사; 읽은 row.revision을 SQL WHERE로 다시 비교하고 +1 |
| PC ingest/analyze 완료 | 검증한 OpenAI report | 새 report 추가 후 slice(-10) | claim/attach에서 받은 revision으로 CAS; last_job_id 기록 |
| PC retag 완료 | 기존 현재 report 유지 | 구간 재분석 report 추가 후 slice(-10) | 같은 CAS; 구간 ID/시작/끝을 현재 값과 비교 |
| 원본 attach | 분석 변경 없음 | 변경 없음 | 최초 원본 연결 시 CAS로 +1; 이미 local_asset 있으면 현재 revision 반환 |
| 즐겨찾기 | 변경 없음 | 변경 없음 | 전용 SQL, revision 증가 없음 |
| 보관함 순서 | 변경 없음 | 변경 없음 | library_order의 별도 revision |

근거: [클립 POST](../../../../apps/web/app/api/clips/route.ts), [PATCH](../../../../apps/web/app/api/clips/[id]/route.ts), [complete/attach](../../../../apps/web/lib/jobs/server.ts), [favorites](../../../../apps/web/features/library/favorites.ts), [order route](../../../../apps/web/app/api/library/order/route.ts).

이력 항목은 제목·메모·즐겨찾기·원본 파일을 포함한 전체 클립 복제본이 아니다. report 안의 제안 구간은 사용자가 편집한 현재 segments와도 다르다. 이력을 선택해 전체 상태를 복원하거나 redo하는 동작은 확인한 API·호출 경로에 없다. 클립 revision도 이력 배열의 인덱스나 이벤트 번호가 아니다.

PATCH의 slice(-10)은 새 분석이 기존 분석과 다른 분기에서만 실행된다. 이력 10개에 현재 report가 없고 새 분석을 제출하지 않는 편집이라면 11개가 남을 수 있다. 따라서 전체 경로에서 “항상 최근 10개만 보존”한다고 쓰지 않는다. [기존 발견과 재현 조건](../lifetime/data.md)을 유지했다.

CAS는 읽은 버전과 쓰는 시점의 버전이 같은지 검사하는 방식이다. 일반 PATCH에서 요청 revision/expected를 생략하면 서버가 읽기 **이전에** 발생한 오래된 클라이언트 편집을 모두 감지할 수 있는 것은 아니다. 서버가 읽은 후 경쟁 갱신은 WHERE revision이 막는다. 작업 complete의 409는 기존 클립을 덮어쓰지 않고 runner가 conflict 실패 기록을 시도한다. 이후 retry는 최신 revision을 다시 claim하며, 결과 체크포인트는 그대로 재사용할 수 있다. 이는 AI 결과를 최신 편집 위에 다시 병합하는 것이지 과거 상태로 되돌리는 동작이 아니다.

분석 complete는 clip UPDATE와 job UPDATE를 db.batch로 묶고, 두 번째 문장은 last_job_id와 증가한 revision을 조건으로 삼는다. 응답이 유실되어도 이미 completed인 작업은 일반 retry 대상이 아니다. 다만 소유권 검사는 API 진입 때의 읽기와 후속 SQL이 나뉘어 있고, 일부 UPDATE는 token만 조건으로 사용하므로 모든 취소·임대 경쟁에 대한 선형화 보장을 주장하지 않는다. 실제 동시 요청 중단 실험은 남아 있다.

## 남은 검증과 재현 방법

개인 데이터 대신 별도 임시 root와 빈 DB, 가짜 분석 응답을 사용한다. 기존 [pc-jobs 테스트](../../../../tests/web/pc-jobs.test.ts)는 중복 접수·임대 만료·원본 유지·취소·CAS·retag 재접수를, [runtime 테스트](../../../../tests/pc/runtime.test.mjs)는 독립 runner와 체크포인트 생성을 보조한다. 이번 문서 작업에서는 이 테스트들을 재실행하지 않았다.

1. 다운로드 rename/manifest/attach 각 경계에서 종료한 뒤 같은 설정과 DB로 시작한다. 원본 재사용 여부와 고아 파일을 함께 확인한다.
2. AI 응답 직후, 체크포인트 기록 직후, complete 응답 직전에 실패를 주입한다. AI 호출 횟수·작업 상태·이력 추가 횟수를 확인한다.
3. 완료 전 revision을 바꾸고 같은 작업을 retry한다. 기존 편집과 사용자 태그 보존, 체크포인트 재사용을 확인한다.
4. 원본 누락·같은 크기 파일 교체·손상 체크포인트·디스크 오류를 각각 주입한다. 자동 재다운로드/폐기를 가정하지 않고 실제 오류 코드를 확인한다.
5. 임대 만료 전후의 재시작·취소 동시 요청을 시험한다. interrupted가 수동 재시도 전까지 queued로 돌아가지 않는지 확인한다.

테스트가 통과해도 실제 다운로드 서비스·AI·Android·전원 장애 검증과는 구분한다. 시퀀스와 구조 그림은 편집 가능한 Mermaid이며 이번 환경에서 렌더링하지 못했다.
