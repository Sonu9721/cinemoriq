ALTER TABLE generation_jobs
ADD COLUMN poll_error_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_jobs_scene_version
ON generation_jobs(scene_id, version_id);

PRAGMA optimize;
