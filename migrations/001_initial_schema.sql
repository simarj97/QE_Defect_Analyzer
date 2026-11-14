-- DefectLens Multi-Project AI QA Platform Database Schema
-- Compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  purpose TEXT NOT NULL,
  background TEXT,
  in_scope TEXT,
  out_of_scope TEXT,
  user_roles TEXT,
  business_rules TEXT,
  target_environments TEXT,
  browser_coverage TEXT,
  app_url TEXT,
  api_docs_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  parsed_items TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  requirement_version INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  title TEXT NOT NULL,
  req_refs TEXT,
  story_refs TEXT,
  ac_refs TEXT,
  preconditions TEXT,
  test_data TEXT,
  steps TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'Positive',
  priority TEXT NOT NULL DEFAULT 'Medium',
  review_status TEXT NOT NULL DEFAULT 'Draft',
  version INTEGER NOT NULL DEFAULT 1,
  version_history TEXT,
  monday_item_id TEXT,
  monday_link TEXT,
  monday_sync_status TEXT DEFAULT 'not_synced',
  monday_sync_error TEXT,
  monday_last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_executions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  test_case_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  actual_result TEXT,
  environment TEXT,
  build_version TEXT,
  evidence TEXT,
  execution_type TEXT NOT NULL DEFAULT 'manual',
  executed_by TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  defect_id TEXT,
  executed_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  test_case_id TEXT,
  execution_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  steps TEXT,
  expected TEXT,
  actual TEXT,
  environment TEXT,
  build_version TEXT,
  severity TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Draft',
  analysis TEXT,
  hypotheses TEXT,
  monday_item_id TEXT,
  monday_link TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monday_configs (
  project_id TEXT PRIMARY KEY,
  token TEXT,
  board_id TEXT,
  version TEXT DEFAULT '2026-10',
  column_map TEXT,
  status_map TEXT,
  is_enabled INTEGER DEFAULT 0,
  last_sync_at TEXT,
  last_sync_status TEXT DEFAULT 'idle',
  last_sync_error TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
