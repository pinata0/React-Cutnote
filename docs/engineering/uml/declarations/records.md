# 실제 DB 테이블과 레코드 구조

[선언 안내](README.md) · [저장 선언](storage.md)

선정된 0000~0009 migration을 빈 메모리 SQLite에 적용한 뒤 PRAGMA로 읽었다. 사용자 DB·.wrangler 상태에 연결하지 않았다. schema.ts의 Drizzle 객체와 영속 테이블은 같은 것이 아니다.

## ai_settings

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| id | TEXT | 예 | 1 | 없음 |
| encrypted_key | TEXT | 예 | 0 | 없음 |
| updated_at | TEXT | 예 | 0 | 없음 |

FK: 없음.

인덱스: sqlite_autoindex_ai_settings_1 (unique).

## clips

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| id | TEXT | 예 | 1 | 없음 |
| title | TEXT | 예 | 0 | 없음 |
| source_url | TEXT | 예 | 0 | '' |
| video_key | TEXT | 아니오 | 0 | 없음 |
| poster_key | TEXT | 아니오 | 0 | 없음 |
| tags | TEXT | 예 | 0 | 없음 |
| notes | TEXT | 예 | 0 | '' |
| created_at | TEXT | 예 | 0 | 없음 |
| analysis | TEXT | 아니오 | 0 | 없음 |
| segments | TEXT | 예 | 0 | '[]' |
| tagging | TEXT | 아니오 | 0 | 없음 |
| revision | INTEGER | 예 | 0 | 0 |
| analysis_history | TEXT | 예 | 0 | '[]' |
| favorite | INTEGER | 예 | 0 | false |
| favorite_segments | TEXT | 예 | 0 | '[]' |
| local_asset | TEXT | 아니오 | 0 | 없음 |
| last_job_id | TEXT | 아니오 | 0 | 없음 |

FK: 없음.

인덱스: idx_clips_created_at, sqlite_autoindex_clips_1 (unique).

## library_order

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| scope | TEXT | 예 | 1 | 없음 |
| ordered_keys | TEXT | 예 | 0 | '[]' |
| revision | INTEGER | 예 | 0 | 0 |

FK: 없음.

인덱스: sqlite_autoindex_library_order_1 (unique).

## pc_jobs

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| id | TEXT | 예 | 1 | 없음 |
| clip_id | TEXT | 예 | 0 | 없음 |
| kind | TEXT | 예 | 0 | 없음 |
| payload | TEXT | 예 | 0 | 없음 |
| state | TEXT | 예 | 0 | 'queued' |
| phase | TEXT | 예 | 0 | 'queued' |
| progress | INTEGER | 예 | 0 | 0 |
| attempt | INTEGER | 예 | 0 | 0 |
| <code>lease_token</code> | TEXT | 아니오 | 0 | 없음 |
| lease_until | INTEGER | 예 | 0 | 0 |
| cancel_requested | INTEGER | 예 | 0 | 0 |
| error_code | TEXT | 아니오 | 0 | 없음 |
| result | TEXT | 아니오 | 0 | 없음 |
| created_at | TEXT | 예 | 0 | 없음 |
| updated_at | TEXT | 예 | 0 | 없음 |

FK: 없음.

인덱스: pc_jobs_clip, pc_jobs_queue, sqlite_autoindex_pc_jobs_1 (unique).

## recommendation_feedback

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| context_key | TEXT | 예 | 1 | 없음 |
| clip_id | TEXT | 예 | 2 | 없음 |
| segment_id | TEXT | 예 | 3 | 없음 |
| signature | TEXT | 예 | 0 | 없음 |
| value | TEXT | 예 | 0 | 없음 |
| updated_at | TEXT | 예 | 0 | 없음 |

FK: clip_id → clips.id; onDelete=CASCADE.

인덱스: sqlite_autoindex_recommendation_feedback_1 (unique).

## segment_media

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| object_key | TEXT | 예 | 1 | 없음 |
| clip_id | TEXT | 예 | 0 | 없음 |
| segment_id | TEXT | 예 | 0 | 없음 |
| source_identity | TEXT | 예 | 0 | 없음 |
| start_ms | INTEGER | 예 | 0 | 없음 |
| end_ms | INTEGER | 예 | 0 | 없음 |
| fingerprint | TEXT | 예 | 0 | 없음 |
| status | TEXT | 예 | 0 | 없음 |
| mime | TEXT | 예 | 0 | 없음 |
| size | INTEGER | 예 | 0 | 없음 |
| duration_ms | INTEGER | 예 | 0 | 없음 |
| width | INTEGER | 예 | 0 | 없음 |
| height | INTEGER | 예 | 0 | 없음 |
| created_at | TEXT | 예 | 0 | 없음 |

FK: 없음.

인덱스: idx_segment_media_clip, sqlite_autoindex_segment_media_1 (unique).

## youtube_discovery

| 컬럼 | SQLite 타입 | NOT NULL | PK 순서 | 기본값 |
|---|---|---|---|---|
| id | TEXT | 예 | 1 | 없음 |
| result | TEXT | 예 | 0 | '{}' |
| updated_at | INTEGER | 예 | 0 | 0 |
| locked_until | INTEGER | 예 | 0 | 0 |
| <code>lock_token</code> | TEXT | 예 | 0 | '' |

FK: 없음.

인덱스: sqlite_autoindex_youtube_discovery_1 (unique).

TEXT JSON 컬럼은 SQLite 테이블의 자식 객체가 아니다. ClipRow/JobRow/SegmentMediaRow는 해당 행을 읽는 TypeScript 별칭이고 serialize/publicJob 등에서 공개 DTO로 바꾼다. PK 순서는 복합 키 순서를 나타낸다. SQLite의 PRAGMA NOT NULL 값과 PRIMARY KEY 의미를 혼동하지 않는다.
