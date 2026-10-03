ALTER TABLE clips ADD COLUMN local_asset TEXT;
ALTER TABLE clips ADD COLUMN last_job_id TEXT;
CREATE TABLE pc_jobs (
 id TEXT PRIMARY KEY NOT NULL, clip_id TEXT NOT NULL, kind TEXT NOT NULL,
 payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued', phase TEXT NOT NULL DEFAULT 'queued',
 progress INTEGER NOT NULL DEFAULT 0, attempt INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0, cancel_requested INTEGER NOT NULL DEFAULT 0,
 error_code TEXT, result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX pc_jobs_queue ON pc_jobs(state,created_at);
CREATE INDEX pc_jobs_clip ON pc_jobs(clip_id);
