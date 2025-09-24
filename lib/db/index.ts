/**
 * my_photo_diary/lib/db/index.ts
 *
 * DB abstraction that prefers the existing SQLite implementation but
 * falls back to a simple file-based JSON store (expo-file-system) when
 * SQLite is unavailable or fails to initialize (useful for Expo Go).
 *
 * Exported API (minimal subset used in app):
 * - initDatabase(): Promise<void>
 * - run(sql: string, params?: any[]): Promise<void>
 * - exec(sql: string, params?: any[]): Promise<any>
 * - all<T = any>(sql: string, params?: any[]): Promise<T[]>
 * - get<T = any>(sql: string, params?: any[]): Promise<T | null>
 * - transaction(statements: Array<[string, any[]?]>): Promise<void>
 * - tableExists(name: string): Promise<boolean>
 *
 * Implementation details:
 * - Try to use ./sqlite (the project's sqlite wrapper). If it initializes,
 *   delegate all calls to it.
 * - Otherwise use a file-backed JSON store at FileSystem.documentDirectory
 *   + 'my_photo_diary/db.json'.
 *
 * Note: file-store implements only a small subset of SQL semantics needed by
 * this project (CREATE TABLE, INSERT INTO photos, SELECT ... FROM photos).
 * It is intentionally minimal to keep the MVP flow working on Expo Go.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system'
import { MIGRATIONS, LATEST_MIGRATION_VERSION } from './schema'

// Try to import the project's sqlite wrapper (may fail on some runtimes)
let sqliteImpl: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  sqliteImpl = require('./sqlite').default || require('./sqlite')
} catch {
  sqliteImpl = null
}

const DB_FILE = `${FileSystem.documentDirectory || ''}my_photo_diary/db.json`

type SQLParams = any[] | undefined

// File-store in-memory cache + write queue
let fileStoreCache: any | null = null
let fileWriteQueue: Promise<void> = Promise.resolve()

// Active backend: 'sqlite' | 'filestore'
let activeBackend: 'sqlite' | 'filestore' | null = null

async function ensureFileStoreLoaded(): Promise<any> {
  if (fileStoreCache) return fileStoreCache

  try {
    const exists = await FileSystem.getInfoAsync(DB_FILE)
    if (!exists.exists) {
      // create initial structure
      fileStoreCache = {
        schema_version: 0,
        albums: [],
        photos: [],
        labels: [],
        photo_labels: [],
        notes: [],
        events: [],
      }
      await writeFileStore()
      return fileStoreCache
    }

    const content = await FileSystem.readAsStringAsync(DB_FILE)
    try {
      fileStoreCache = JSON.parse(content || '{}')
    } catch {
      fileStoreCache = {
        schema_version: 0,
        albums: [],
        photos: [],
        labels: [],
        photo_labels: [],
        notes: [],
        events: [],
      }
    }
    // Ensure keys exist
    fileStoreCache.schema_version = fileStoreCache.schema_version || 0
    fileStoreCache.photos = fileStoreCache.photos || []
    fileStoreCache.albums = fileStoreCache.albums || []
    fileStoreCache.labels = fileStoreCache.labels || []
    fileStoreCache.photo_labels = fileStoreCache.photo_labels || []
    fileStoreCache.notes = fileStoreCache.notes || []
    fileStoreCache.events = fileStoreCache.events || []
    return fileStoreCache
  } catch (err) {
    // If reading fails, recreate
    fileStoreCache = {
      schema_version: 0,
      albums: [],
      photos: [],
      labels: [],
      photo_labels: [],
      notes: [],
      events: [],
    }
    await writeFileStore()
    return fileStoreCache
  }
}

async function writeFileStore(): Promise<void> {
  const payload = JSON.stringify(fileStoreCache || {}, null, 2)
  // serialize writes to avoid concurrent file writes
  fileWriteQueue = fileWriteQueue.then(async () => {
    await FileSystem.writeAsStringAsync(DB_FILE, payload)
  })
  return fileWriteQueue
}

/**
 * Minimal SQL-like handlers for the file-store:
 * - CREATE TABLE -> ensure key exists
 * - INSERT INTO photos -> add photo object (params-driven)
 * - INSERT INTO schema_version -> update schema_version (params[0] expected)
 * - SELECT ... FROM photos -> return photos matching selected columns, support ORDER BY created_at DESC
 *
 * This is intentionally small and tailored to the repository's usage patterns.
 */
function isCreateTable(sql: string): { table?: string } | null {
  const m = sql.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)/i)
  if (m) return { table: m[1] }
  return null
}

function isInsertInto(sql: string): { table?: string } | null {
  const m = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i)
  if (m) return { table: m[1] }
  return null
}

function isSelectFrom(sql: string): { table?: string } | null {
  const m = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i)
  if (m) return { table: m[1] }
  return null
}

async function fileStoreRun(sql: string, params?: SQLParams): Promise<any> {
  const s = (sql || '').trim()
  const up = s.toUpperCase()
  const store = await ensureFileStoreLoaded()

  const create = isCreateTable(s)
  if (create && create.table) {
    const name = create.table
    if (!Object.prototype.hasOwnProperty.call(store, name)) {
      store[name] = []
      await writeFileStore()
    }
    return
  }

  const insert = isInsertInto(s)
  if (insert && insert.table) {
    const tbl = insert.table.toLowerCase()
    if (tbl === 'schema_version') {
      // params expected: [version, appliedAt]
      const version = params && params[0] ? Number(params[0]) : undefined
      if (version !== undefined && !Number.isNaN(version)) {
        store.schema_version = Math.max(store.schema_version || 0, version)
        await writeFileStore()
      }
      return
    }

    if (tbl === 'photos') {
      // Expect params in the order used by lib/data/photos.createPhoto:
      // [id, file_uri, thumbnail_uri, taken_at, created_at, updated_at, width, height]
      const [
        id,
        file_uri,
        thumbnail_uri,
        taken_at,
        created_at,
        updated_at,
        width,
        height,
      ] = params || []

      // create object compatible with Photo type
      const photo = {
        id: String(id),
        file_uri: String(file_uri),
        thumbnail_uri: thumbnail_uri ?? null,
        taken_at: taken_at ?? null,
        created_at: created_at ?? new Date().toISOString(),
        updated_at: updated_at ?? new Date().toISOString(),
        width: typeof width === 'number' ? width : width ? Number(width) : null,
        height: typeof height === 'number' ? height : height ? Number(height) : null,
      }

      // Upsert: remove existing with same id then push
      store.photos = store.photos.filter((p: any) => p.id !== photo.id)
      store.photos.push(photo)
      await writeFileStore()
      return
    }

    // Generic insert into other tables: attempt to push params as array/object
    if (!store[tbl]) store[tbl] = []
    store[tbl].push({ params: params ?? [] })
    await writeFileStore()
    return
  }

  // For any other statement, we do nothing (no-op) but don't error.
  return
}

async function fileStoreAll<T = any>(sql: string, params?: SQLParams): Promise<T[]> {
  const s = (sql || '').trim()
  const store = await ensureFileStoreLoaded()

  const select = isSelectFrom(s)
  if (select && select.table) {
    const tbl = select.table.toLowerCase()
    if (tbl === 'photos') {
      // Return photos mapped to expected columns (id, file_uri, thumbnail_uri, taken_at, created_at, width, height)
      const rows = (store.photos || []).slice()
      // Apply ORDER BY created_at DESC if present
      if (/ORDER\s+BY\s+created_at\s+DESC/i.test(s)) {
        rows.sort((a: any, b: any) => {
          const ta = a.created_at || ''
          const tb = b.created_at || ''
          return tb.localeCompare(ta)
        })
      }
      // Map to selected projection if necessary; for simplicity return objects with fields
      return rows as T[]
    }

    // For other tables, return their arrays if present
    if (store[tbl]) {
      return store[tbl] as T[]
    }
  }

  // No match: return empty
  return []
}

async function fileStoreGet<T = any>(sql: string, params?: SQLParams): Promise<T | null> {
  const rows = await fileStoreAll<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

async function fileStoreTransaction(statements: Array<[string, SQLParams?]>): Promise<void> {
  // Execute sequentially via run; note: not ACID, but sufficient for simple migrations
  for (let i = 0; i < statements.length; i++) {
    const [sql, params] = statements[i]
    await fileStoreRun(sql, params)
  }
}

async function fileStoreTableExists(name: string): Promise<boolean> {
  const store = await ensureFileStoreLoaded()
  return Object.prototype.hasOwnProperty.call(store, name)
}

/**
 * Public API delegating to sqliteImpl when available, otherwise using file-store.
 */

export async function initDatabase(): Promise<void> {
  // Try sqlite first if present
  if (sqliteImpl && typeof sqliteImpl.initDatabase === 'function') {
    try {
      await sqliteImpl.initDatabase()
      activeBackend = 'sqlite'
      return
    } catch (err) {
      // Fall through to file-store
      // eslint-disable-next-line no-console
      console.warn('sqlite init failed, falling back to file-store:', err)
    }
  }

  // Initialize file-store
  await ensureFileStoreLoaded()

  // Apply migrations using simple transaction semantics (fileStoreTransaction)
  // Each migration in MIGRATIONS is an array of SQL statements.
  for (let v = 0; v < MIGRATIONS.length; v++) {
    const version = v + 1
    if ((fileStoreCache && fileStoreCache.schema_version) >= version) continue
    const stmts = MIGRATIONS[v] || []
    const seq: Array<[string, SQLParams?]> = stmts.map((stmt: string) => [stmt, []])
    // Attempt to run migration statements; many are CREATE TABLE and will be no-ops or create keys.
    await fileStoreTransaction(seq)
    // After applying, record the schema_version
    await fileStoreRun('INSERT INTO schema_version (version, applied_at) VALUES (?, ?);', [
      version,
      new Date().toISOString(),
    ])
  }

  activeBackend = 'filestore'
}

export async function run(sql: string, params?: SQLParams): Promise<any> {
  if (activeBackend === 'sqlite' && sqliteImpl && typeof sqliteImpl.run === 'function') {
    return sqliteImpl.run(sql, params)
  }
  return fileStoreRun(sql, params)
}
export const exec = run

export async function all<T = any>(sql: string, params?: SQLParams): Promise<T[]> {
  if (activeBackend === 'sqlite' && sqliteImpl && typeof sqliteImpl.all === 'function') {
    return sqliteImpl.all(sql, params)
  }
  return fileStoreAll<T>(sql, params)
}

export async function get<T = any>(sql: string, params?: SQLParams): Promise<T | null> {
  if (activeBackend === 'sqlite' && sqliteImpl && typeof sqliteImpl.get === 'function') {
    return sqliteImpl.get(sql, params)
  }
  return fileStoreGet<T>(sql, params)
}

export async function transaction(statements: Array<[string, SQLParams?]>): Promise<void> {
  if (activeBackend === 'sqlite' && sqliteImpl && typeof sqliteImpl.transaction === 'function') {
    return sqliteImpl.transaction(statements)
  }
  return fileStoreTransaction(statements)
}

export async function tableExists(tableName: string): Promise<boolean> {
  if (activeBackend === 'sqlite' && sqliteImpl && typeof sqliteImpl.tableExists === 'function') {
    return sqliteImpl.tableExists(tableName)
  }
  return fileStoreTableExists(tableName)
}

// Convenience: expose which backend is active
export function getActiveBackend(): 'sqlite' | 'filestore' | null {
  return activeBackend
}
