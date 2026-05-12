import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AuthType, JobStatus } from "./schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(HERE, "..", "..", "data", "jobs.db");

export interface Job {
  id: number;
  url: string;
  status: JobStatus;
  attempts: number;
  claimed_at: string | null;
  html_snippet: string | null;
  auth_type: AuthType | null;
  notes: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

type DbInstance = ReturnType<typeof Database>;

let dbInstance: DbInstance | null = null;

export function getDb(path?: string): DbInstance {
  if (dbInstance) return dbInstance;
  const dbPath = path ?? process.env.DB_PATH ?? DEFAULT_DB_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      claimed_at DATETIME,
      html_snippet TEXT,
      auth_type TEXT,
      notes TEXT,
      error TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_jobs_status_id ON jobs(status, id);`,
  );
  dbInstance = db;
  return db;
}

export function insertJob(url: string): Job {
  const db = getDb();
  const row = db
    .prepare(`INSERT INTO jobs (url, status) VALUES (?, 'pending') RETURNING *`)
    .get(url) as Job | undefined;
  if (!row) throw new Error("insertJob: no row returned");
  return row;
}

export function listJobs(limit = 50): Job[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM jobs ORDER BY id DESC LIMIT ?`)
    .all(limit) as Job[];
}

export function getJob(id: number): Job | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM jobs WHERE id = ?`)
    .get(id) as Job | undefined;
  return row ?? null;
}

const STUCK_AFTER_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export function claimNextJob(): Job | null {
  const db = getDb();
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const row = db
    .prepare(
      `
      UPDATE jobs
      SET status = 'processing',
          claimed_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending'
           OR (status = 'processing' AND claimed_at < ?)
        ORDER BY id
        LIMIT 1
      )
      RETURNING *;
      `,
    )
    .get(cutoff) as Job | undefined;
  return row ?? null;
}

export function completeJob(
  id: number,
  result: { snippet: string | null; authType: AuthType; notes: string },
): void {
  const db = getDb();
  db.prepare(
    `UPDATE jobs
     SET status = 'completed',
         html_snippet = ?,
         auth_type = ?,
         notes = ?,
         error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(result.snippet, result.authType, result.notes, id);
}

export function failJob(id: number, error: string): void {
  const db = getDb();
  const job = getJob(id);
  if (!job) return;
  if (job.attempts >= MAX_ATTEMPTS) {
    db.prepare(
      `UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(error, id);
  } else {
    db.prepare(
      `UPDATE jobs SET status = 'pending', error = ?, claimed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(error, id);
  }
}

export { MAX_ATTEMPTS };
