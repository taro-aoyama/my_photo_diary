/**
 * my_photo_diary/lib/db/sqlite.ts
 *
 * Lightweight Promise-based wrapper around Expo SQLite for:
 * - running SQL statements
 * - simple queries (get/all)
 * - running ordered migrations from lib/db/schema.ts
 *
 * Usage:
 *  await initDatabase();
 *  await run(`INSERT INTO albums (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`, [id, name, now, now]);
 *  const rows = await all(`SELECT * FROM albums WHERE name = ?`, [name]);
 *
 * Notes:
 * - This module assumes `lib/db/schema.ts` exports `MIGRATIONS` and `LATEST_MIGRATION_VERSION`.
 * - The wrapper keeps a module-level DB instance (singleton).
 */

import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, LATEST_MIGRATION_VERSION } from './schema';

const DB_NAME = 'my_photo_diary.db';

type ExecResult = any;
type SQLParams = any[] | undefined;

let db: any | null = null;

/**
 * Open (or return existing) DB handle.
 */
export function openDB() {
  if (!db) {
    db = SQLite.openDatabase(DB_NAME);
  }
  return db;
}

/**
 * Execute a single SQL statement using a transaction and return the raw result.
 * This uses a transactional wrapper for each statement to keep semantics simpler.
 */
export function exec(sql: string, params: SQLParams = []): Promise<ExecResult> {
  const database = openDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, result: ExecResult) => resolve(result),
          (_tx: any, error: any) => {
            // return true to roll back? expo-sqlite expects false/true semantics; we reject instead.
            reject(error);
            return false;
          }
        );
      },
      (txError: any) => {
        reject(txError);
      }
    );
  });
}

/**
 * Run a statement without expecting rows (convenience).
 */
export async function run(sql: string, params: SQLParams = []): Promise<void> {
  await exec(sql, params);
}

/**
 * Query for multiple rows. Returns an array of row objects.
 */
export function all<T = any>(sql: string, params: SQLParams = []): Promise<T[]> {
  const database = openDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, result: any) => {
            // expo-sqlite: result.rows._array contains rows
            const rows = result?.rows?._array ?? [];
            resolve(rows);
          },
          (_tx: any, error: any) => {
            reject(error);
            return false;
          }
        );
      },
      (txError: any) => {
        reject(txError);
      }
    );
  });
}

/**
 * Query for a single row. Returns the first row or null.
 */
export async function get<T = any>(sql: string, params: SQLParams = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to run multiple statements in a single transaction.
 * The statements param is an array of [sql, params].
 */
export function transaction(statements: Array<[string, SQLParams?]>): Promise<void> {
  const database = openDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        // execute sequentially using promise chaining inside transaction via callbacks
        const runNext = (i: number) => {
          if (i >= statements.length) {
            // all done
            return;
          }
          const [sql, params] = statements[i];
          tx.executeSql(
            sql,
            params ?? [],
            () => {
              runNext(i + 1);
            },
            (_tx: any, error: any) => {
              // abort transaction by throwing an exception
              // expo-sqlite will call the error callback of the transaction
              // Returning false indicates error to expo-sqlite (per its API)
              reject(error);
              return false;
            }
          );
        };

        try {
          runNext(0);
        } catch (e) {
          reject(e);
        }
      },
      (txError: any) => {
        reject(txError);
      },
      () => {
        // success callback: only called after transaction completes successfully
        resolve();
      }
    );
  });
}

/**
 * Get current applied migration version.
 * If the schema_version table doesn't exist, returns 0.
 */
async function getCurrentMigrationVersion(): Promise<number> {
  try {
    // If schema_version doesn't exist, this SELECT will fail; catch and return 0.
    const row = await get<{ version: number }>('SELECT MAX(version) as version FROM schema_version', []);
    if (!row || row.version === null || row.version === undefined) {
      return 0;
    }
    return Number(row.version) || 0;
  } catch (err) {
    // Likely schema_version table does not exist yet.
    return 0;
  }
}

/**
 * Apply migrations from currentVersion+1 to LATEST_MIGRATION_VERSION.
 * Each migration is an array of SQL statements to execute in order.
 */
export async function migrate(): Promise<void> {
  openDB();
  // Ensure foreign_keys is enabled (optional; may be ignored on some platforms)
  try {
    await exec('PRAGMA foreign_keys = ON;');
  } catch {
    // non-fatal
  }

  const current = await getCurrentMigrationVersion();
  if (current >= LATEST_MIGRATION_VERSION) {
    return;
  }

  for (let v = current + 1; v <= LATEST_MIGRATION_VERSION; v++) {
    const migrationIndex = v - 1;
    const statements = MIGRATIONS[migrationIndex] ?? [];
    // Run all statements for this migration inside a single transaction
    const stmts: Array<[string, SQLParams?]> = statements.map((s: string) => [s, []]);
    try {
      await transaction(stmts);
      const appliedAt = new Date().toISOString();
      // schema_version table might have been created by this migration, so insert now
      // Use exec to run a single insert
      await exec('INSERT INTO schema_version (version, applied_at) VALUES (?, ?);', [v, appliedAt]);
    } catch (err) {
      // If migration fails, throw with context
      throw new Error(`Migration v${v} failed: ${(err && err.message) || String(err)}`);
    }
  }
}

/**
 * Initialize DB: open, migrate.
 */
export async function initDatabase(): Promise<void> {
  openDB();
  await migrate();
}

/**
 * Small convenience: check if a table exists.
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const row = await get<{ count: number }>(
    'SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?;',
    ['table', tableName]
  );
  return !!(row && row.count > 0);
}

/**
 * Exported API
 */
export default {
  openDB,
  exec,
  run,
  all,
  get,
  transaction,
  migrate,
  initDatabase,
  tableExists,
};
