/**
 * lib/db/schema.ts
 *
 * Migration SQL statements for my_photo_diary.
 *
 * Each entry in MIGRATIONS is an array of SQL statements that form a single migration.
 * - MIGRATIONS[0] represents migration version 1
 * - MIGRATIONS[1] represents migration version 2, etc.
 *
 * The sqlite migration runner (`lib/db/sqlite.ts`) will apply each migration in order.
 *
 * NOTE:
 * Keep statements idempotent where possible (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, etc.)
 */

export const MIGRATIONS: string[][] = [
  // ---- v1: initial schema ----
  [
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );`,

    `CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      album_id TEXT,
      file_uri TEXT NOT NULL,
      thumbnail_uri TEXT,
      taken_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      location_lat REAL,
      location_lng REAL,
      width INTEGER,
      height INTEGER,
      orientation INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'tag',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );`,

    `CREATE TABLE IF NOT EXISTS photo_labels (
      photo_id TEXT NOT NULL,
      label_id TEXT NOT NULL,
      PRIMARY KEY (photo_id, label_id)
    );`,

    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      photo_id TEXT NOT NULL,
      body TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );`,

    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      title TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT,
      location TEXT,
      memo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);`,
    `CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);`,
    `CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);`,
    `CREATE INDEX IF NOT EXISTS idx_notes_photo_id ON notes(photo_id);`,
    `CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);`,
  ],

  // Future migrations can be appended here as additional arrays, e.g.:
  // ,
  // [
  //   `ALTER TABLE photos ADD COLUMN color_profile TEXT;`,
  //   `UPDATE schema_version ...`
  // ]
]

export const LATEST_MIGRATION_VERSION = MIGRATIONS.length
