PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS job (
  encrypt_job_id TEXT PRIMARY KEY,
  position_name TEXT,
  boss_name TEXT,
  brand_name TEXT,
  city_name TEXT,
  salary_desc TEXT,
  experience_name TEXT,
  degree_name TEXT,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS job_detail_raw (
  encrypt_job_id TEXT PRIMARY KEY,
  zp_data_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_source_link (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypt_job_id TEXT NOT NULL,
  keyword TEXT,
  filters_json TEXT,
  captured_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  message TEXT,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_report (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypt_job_id TEXT NOT NULL,
  resume_hash TEXT NOT NULL,
  job_hash TEXT NOT NULL,
  kind TEXT,
  title TEXT,
  match_score REAL,
  jobs_count INTEGER,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(encrypt_job_id, resume_hash, job_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_report_job_id
  ON ai_report(encrypt_job_id);

CREATE INDEX IF NOT EXISTS idx_job_source_link_encrypt_job_id
  ON job_source_link(encrypt_job_id);
