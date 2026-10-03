# 11단계: 실제 상태 전이와 UML 종합

2026-10-03 작업 트리 기준. [전체 안내·추천 순서](../README.md) · [종합 검증](../final-review.md)

## 무엇을 왜 조사했는가

DB 상태, 일시적인 화면 플래그, Android 연결·공유, 파일 준비 상태를 하나의 상태 기계로 합치면 실제로 없는 전이가 생긴다. 각각의 값을 변경하는 SQL·setter·메서드를 확인하고 정상·오류·취소·재시도·재접속을 분리했다.

| 영역 | 실제 표현과 책임 | 문서 |
|---|---|---|
| PC 작업 | JobRow/PcJob의 state:string, phase:string. SQL의 상태 값과 cancel_requested가 처리 수명을 관리 | [작업 전이](jobs.md) |
| Android | checkingConnection/mainLoadFailed/settingsVisible/recoveredConnection/shareActive와 pendingShare의 조합. 단일 enum 아님 | [Android·모바일 전이](android-mobile.md) |
| 모바일 화면 | MobileRouter의 pc:boolean/null, PcIngest의 busy/error/message/jobs. 작업 완료는 jobs.state에서 읽음 | [Android·모바일 전이](android-mobile.md) |
| 구간 미디어 | SegmentMediaRow.status:string의 pending/ready/deleting. R2 업로드·정리 추적 | [미디어 전이](media.md) |
| PC 로컬 파일 | local_asset/파일/체크포인트의 존재와 export job.state. 별도 ready enum 없음 | [미디어 전이](media.md) |
| 대표 실행 경로 | 최초 접수 성공, 분석 실패 뒤 재시도, PC 중단 회수 | [성공·복구 시퀀스](scenarios.md) |

검증 근거 열의 **소스 대조**는 실제 실행 성공이 아니다. 테스트명은 검증 가능한 보조 코드의 위치이며 이번 단계에서 실행하지 않은 테스트를 통과로 표시하지 않는다. 별도 State 클래스가 handle/transition을 다형적으로 위임하는 State Pattern은 조사한 경로에 없다. AnalysisReport의 판별 union과 작업 상태 문자열도 서로 다른 개념이다.

Android 그림의 별칭은 읽기 위한 Mermaid ID이고 노드 라벨은 실제 필드 조건이다. flag 조합은 동시에 성립할 수 있으므로 그림을 모든 조합의 완전한 enum으로 해석하지 않는다. UI 문구는 영속 상태명으로 사용하지 않았다.

기존 상세 근거는 [계약](../contracts/README.md), [복구](../recovery/README.md), [상태 전달](../state-delivery/README.md)를 따른다. 자동 Mermaid 파싱·시각 렌더링의 제한과 1~10단계 교차 점검 결과는 [종합 검증](../final-review.md)에 기록한다.
