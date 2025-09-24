/**
 * my_photo_diary/lib/db/sqlite.ts
 *
 * Clean, robust wrapper around expo-sqlite that:
 * - lazy-loads the runtime module to avoid bundling web-only assets
 * - supports multiple shapes: openDatabase, openDatabaseAsync, openDatabaseSync
 * - provides a fallback transaction shim when the returned DB instance doesn't
 *   expose `transaction` but offers `executeSql`/`executeSqlAsync`-like APIs
 * - exposes Promise-based helpers: exec, run, all, get, transaction, migrate, initDatabase
 *
 * Notes:
 * - Keep this file platform-aware: on web we provide a clear shim which throws
 *   informative errors when usage is attempted.
 * - Diagnostic logging is intentionally verbose to help during development.
 */

import { Platform } from 'react-native'
import { MIGRATIONS, LATEST_MIGRATION_VERSION } from './schema'

const DB_NAME = 'my_photo_diary.db'

type ExecResult = any
type SQLParams = any[] | undefined

let sqliteModule: any | null = null
let dbInstance: any | null = null
let dbReady: Promise<any> | null = null

function isNativeRuntime(): boolean {
  return typeof Platform !== 'undefined' && Platform.OS && Platform.OS !== 'web'
}

/**
 * Try to require the runtime module and normalize shapes.
 */
function loadSQLiteModule(): any {
  if (sqliteModule) return sqliteModule

  try {
    // Use require at runtime to avoid bundling optional web WASM artifacts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require('expo-sqlite')
    // Diagnostic: log module shape keys
    try {
      // eslint-disable-next-line no-console
      console.log(
        'loadSQLiteModule: expo-sqlite exports ->',
        mod ? Object.keys(mod) : mod,
      )
    } catch {
      // ignore logging errors
    }

    // Normalize default vs named export
    const impl = mod && mod.default ? mod.default : mod
    sqliteModule = impl
    return sqliteModule
  } catch (err) {
    // The require may fail in some runtime contexts; leave module null and let callers handle.
    // eslint-disable-next-line no-console
    console.warn(
      "loadSQLiteModule: require('expo-sqlite') failed:",
      err && (err as any).message ? (err as any).message : err,
    )
    sqliteModule = null
    return null
  }
}

/**
 * Create a transaction shim when DB instance doesn't provide `transaction`.
 * The shim will attempt to emulate expo-sqlite's transaction API by using
 * available `executeSql` or `executeSqlAsync` functions on the DB instance.
 *
 * The shim provides the signature:
 *   db.transaction(fn, errorCallback, successCallback)
 *
 * Where `fn` receives a `tx` object with `executeSql(sql, params, success, error)`.
 */
function createTransactionShim(db: any) {
  // detect possible executor function names
  const executeSyncName =
    db && typeof db.executeSql === 'function' ? 'executeSql' : undefined
  const executeAsyncName =
    db && typeof db.executeSqlAsync === 'function'
      ? 'executeSqlAsync'
      : undefined

  const fallbackExecName =
    db && typeof db.exec === 'function' ? 'exec' : undefined
  const fallbackRunName = db && typeof db.run === 'function' ? 'run' : undefined

  // If no single-statement executor exists, we cannot emulate transaction reliably.
  if (
    !executeSyncName &&
    !executeAsyncName &&
    !fallbackExecName &&
    !fallbackRunName
  ) {
    return null
  }

  // The shim
  return function transactionShim(
    fn: any,
    errorCallback?: any,
    successCallback?: any,
  ) {
    // Simple tx object with executeSql that returns a Promise when using async executor
    const tx = {
      executeSql: function (
        sql: string,
        params: any[] = [],
        success?: any,
        error?: any,
      ) {
        try {
          // Prefer sync-style executor if available
          if (executeSyncName) {
            // Some implementations call executeSql(sql, params, success, error)
            const res = db[executeSyncName](sql, params, (result: any) => {
              if (typeof success === 'function') success(tx, result)
            })
            // No return value expected for sync exec
            return true
          }

          // If async executor exists and returns a promise
          if (executeAsyncName) {
            db[executeAsyncName](sql, params)
              .then((result: any) => {
                if (typeof success === 'function') success(tx, result)
              })
              .catch((err: any) => {
                if (typeof error === 'function') {
                  error(tx, err)
                } else {
                  // bubble to transaction error handler
                  throw err
                }
              })
            return true
          }

          // Fallback to exec/run style which may be promise based or callback based
          if (fallbackExecName) {
            const maybe = db[fallbackExecName](sql, params)
            if (maybe && typeof maybe.then === 'function') {
              maybe
                .then((result: any) => {
                  if (typeof success === 'function') success(tx, result)
                })
                .catch((err: any) => {
                  if (typeof error === 'function') error(tx, err)
                  else throw err
                })
            } else {
              if (typeof success === 'function') success(tx, maybe)
            }
            return true
          }

          if (fallbackRunName) {
            const maybe = db[fallbackRunName](sql, params)
            if (maybe && typeof maybe.then === 'function') {
              maybe
                .then((result: any) => {
                  if (typeof success === 'function') success(tx, result)
                })
                .catch((err: any) => {
                  if (typeof error === 'function') error(tx, err)
                  else throw err
                })
            } else {
              if (typeof success === 'function') success(tx, maybe)
            }
            return true
          }

          // Shouldn't reach here
          throw new Error('No executor available for executeSql')
        } catch (err) {
          if (typeof error === 'function') {
            error(tx, err)
          } else {
            throw err
          }
        }
      },
    }

    // Execute the user's transaction function. We cannot fully emulate atomicity,
    // but we can attempt to run the provided statements/sequences. Any errors will
    // be reported via errorCallback.
    try {
      fn(tx)
      if (typeof successCallback === 'function') {
        successCallback()
      }
    } catch (err) {
      if (typeof errorCallback === 'function') {
        errorCallback(err)
      } else {
        // If no error callback, rethrow to surface in dev logs
        throw err
      }
    }
  }
}

/**
 * Ensure a DB instance is available. This handles different module shapes and open methods.
 */
async function ensureDB(): Promise<any> {
  if (dbInstance) return dbInstance
  if (dbReady) return dbReady

  if (!isNativeRuntime()) {
    // Provide a shim on web that clearly errors on use
    dbInstance = {
      transaction: (fn: any, _err?: any, _succ?: any) => {
        const err = new Error(
          'expo-sqlite is not available in the current (web) environment. ' +
            'Run this flow on a native device/simulator or configure a web-compatible SQLite build (wa-sqlite) in your bundler.',
        )
        if (typeof _err === 'function') {
          _err(err)
          return
        }
        throw err
      },
    }
    return dbInstance
  }

  // Attempt to load module
  const mod = loadSQLiteModule()
  if (!mod) {
    throw new Error('expo-sqlite module could not be required at runtime.')
  }

  // Try different open functions on the module
  try {
    // 1) openDatabase (may be sync or return a DB instance)
    if (typeof mod.openDatabase === 'function') {
      const maybe = mod.openDatabase(DB_NAME)
      // If returns a Promise
      if (maybe && typeof maybe.then === 'function') {
        dbReady = maybe.then((inst: any) => {
          dbInstance = inst
          return dbInstance
        })
        return dbReady
      }
      dbInstance = maybe
      // If instance lacks transaction, try to provide shim later
      if (!dbInstance) {
        throw new Error('openDatabase returned falsy instance')
      }
      // Diagnostic
      try {
        // eslint-disable-next-line no-console
        console.log(
          'ensureDB: opened DB via openDatabase; keys=',
          Object.keys(dbInstance || {}),
        )
      } catch {}
      // If DB does not expose transaction, attach shim if possible
      if (typeof dbInstance.transaction !== 'function') {
        const shim = createTransactionShim(dbInstance)
        if (shim) {
          dbInstance.transaction = shim
          // eslint-disable-next-line no-console
          console.warn('ensureDB: attached transaction shim to DB instance')
        }
      }
      return dbInstance
    }

    // 2) openDatabaseAsync
    if (typeof mod.openDatabaseAsync === 'function') {
      const maybe = mod.openDatabaseAsync(DB_NAME)
      dbReady = maybe.then((inst: any) => {
        dbInstance = inst

        // If the implementation returns a wrapper with a nativeDatabase property,
        // prefer the nativeDatabase (it typically exposes transaction).
        if (dbInstance && dbInstance.nativeDatabase) {
          const native = dbInstance.nativeDatabase
          // eslint-disable-next-line no-console
          console.log(
            'ensureDB: nativeDatabase keys (openDatabaseAsync) ->',
            native ? Object.keys(native) : null,
          )
          if (typeof native.transaction === 'function') {
            dbInstance = native
            // eslint-disable-next-line no-console
            console.log(
              'ensureDB: using nativeDatabase from wrapper (openDatabaseAsync)',
            )
          } else if (typeof native.executeSql === 'function') {
            const shimNative = createTransactionShim(native)
            if (shimNative) {
              native.transaction = shimNative
              dbInstance = native
              // eslint-disable-next-line no-console
              console.warn(
                'ensureDB: attached transaction shim to nativeDatabase (openDatabaseAsync)',
              )
            }
          }
        }

        // If transaction missing on the final instance, attach shim
        if (typeof dbInstance.transaction !== 'function') {
          const shim = createTransactionShim(dbInstance)
          if (shim) {
            dbInstance.transaction = shim
            // eslint-disable-next-line no-console
            console.warn(
              'ensureDB: attached transaction shim to DB instance (async)',
            )
          }
        }

        try {
          // eslint-disable-next-line no-console
          console.log(
            'ensureDB: opened DB via openDatabaseAsync; keys=',
            Object.keys(dbInstance || {}),
          )
        } catch {}
        return dbInstance
      })
      return dbReady
    }

    // 3) openDatabaseSync
    if (typeof mod.openDatabaseSync === 'function') {
      const inst = mod.openDatabaseSync(DB_NAME)
      dbInstance = inst

      // If returned wrapper contains nativeDatabase, use/bind it
      if (dbInstance && dbInstance.nativeDatabase) {
        const native = dbInstance.nativeDatabase
        // eslint-disable-next-line no-console
        console.log(
          'ensureDB: nativeDatabase keys (openDatabaseSync) ->',
          native ? Object.keys(native) : null,
        )
        if (typeof native.transaction === 'function') {
          dbInstance = native
          // eslint-disable-next-line no-console
          console.log(
            'ensureDB: using nativeDatabase from wrapper (openDatabaseSync)',
          )
        } else if (typeof native.executeSql === 'function') {
          const shimNative = createTransactionShim(native)
          if (shimNative) {
            native.transaction = shimNative
            dbInstance = native
            // eslint-disable-next-line no-console
            console.warn(
              'ensureDB: attached transaction shim to nativeDatabase (openDatabaseSync)',
            )
          }
        }
      }

      if (typeof dbInstance.transaction !== 'function') {
        const shim = createTransactionShim(dbInstance)
        if (shim) {
          dbInstance.transaction = shim
          // eslint-disable-next-line no-console
          console.warn(
            'ensureDB: attached transaction shim to DB instance (sync)',
          )
        }
      }
      try {
        // eslint-disable-next-line no-console
        console.log(
          'ensureDB: opened DB via openDatabaseSync; keys=',
          Object.keys(dbInstance || {}),
        )
      } catch {}
      return dbInstance
    }

    // If module itself is shaped differently (e.g. exposing a Database class factory),
    // attempt to find any function that looks like "openDatabase" by inspecting exports.
    const modKeys = Object.keys(mod || {})
    const candidate = modKeys.find((k) => /open.*database/i.test(k))
    if (candidate && typeof mod[candidate] === 'function') {
      const maybe = mod[candidate](DB_NAME)
      if (maybe && typeof maybe.then === 'function') {
        dbReady = maybe.then((inst: any) => {
          dbInstance = inst

          // Handle wrapper -> nativeDatabase shape if present
          if (dbInstance && dbInstance.nativeDatabase) {
            const native = dbInstance.nativeDatabase
            // eslint-disable-next-line no-console
            console.log(
              'ensureDB: nativeDatabase keys (candidate async) ->',
              native ? Object.keys(native) : null,
            )
            if (typeof native.transaction === 'function') {
              dbInstance = native
            } else if (typeof native.executeSql === 'function') {
              const shimNative = createTransactionShim(native)
              if (shimNative) {
                native.transaction = shimNative
                dbInstance = native
                // eslint-disable-next-line no-console
                console.warn(
                  'ensureDB: attached transaction shim to nativeDatabase (candidate async)',
                )
              }
            }
          }

          if (typeof dbInstance.transaction !== 'function') {
            const shim = createTransactionShim(dbInstance)
            if (shim) dbInstance.transaction = shim
          }
          return dbInstance
        })
        return dbReady
      }
      dbInstance = maybe

      if (dbInstance && dbInstance.nativeDatabase) {
        const native = dbInstance.nativeDatabase
        // eslint-disable-next-line no-console
        console.log(
          'ensureDB: nativeDatabase keys (candidate sync) ->',
          native ? Object.keys(native) : null,
        )
        if (typeof native.transaction === 'function') {
          dbInstance = native
        } else if (typeof native.executeSql === 'function') {
          const shimNative = createTransactionShim(native)
          if (shimNative) {
            native.transaction = shimNative
            dbInstance = native
            // eslint-disable-next-line no-console
            console.warn(
              'ensureDB: attached transaction shim to nativeDatabase (candidate sync)',
            )
          }
        }
      }

      if (typeof dbInstance.transaction !== 'function') {
        const shim = createTransactionShim(dbInstance)
        if (shim) dbInstance.transaction = shim
      }
      return dbInstance
    }

    // If we reach here, module doesn't expose an expected open API
    // eslint-disable-next-line no-console
    console.error(
      'ensureDB: expo-sqlite module did not expose openDatabase/openDatabaseAsync/openDatabaseSync or compat function. moduleKeys=',
      modKeys,
    )
    throw new Error('expo-sqlite module missing openDatabase APIs')
  } catch (err) {
    // Bubble up with a useful message
    // eslint-disable-next-line no-console
    console.error(
      'ensureDB: failed to open DB:',
      err && (err as any).message ? (err as any).message : err,
    )
    throw err
  }
}

/**
 * Execute single SQL statement in its own transaction and return the raw result.
 */
export async function exec(
  sql: string,
  params: SQLParams = [],
): Promise<ExecResult> {
  const database = await ensureDB()

  // If the DB does not provide a transaction() method, fall back to a best-effort
  // single-statement execution using database.executeSql / database.exec / database.run.
  if (!database || typeof database.transaction !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      'exec(): database.transaction is not available; falling back to single-statement execution',
    )
    try {
      if (typeof database.executeSql === 'function') {
        const maybe = database.executeSql(sql, params ?? [])
        if (maybe && typeof maybe.then === 'function') {
          return maybe
        }
        return Promise.resolve(maybe)
      }
      if (typeof database.exec === 'function') {
        const maybe = database.exec(sql, params ?? [])
        if (maybe && typeof maybe.then === 'function') {
          return maybe
        }
        return Promise.resolve(maybe)
      }
      if (typeof database.run === 'function') {
        const maybe = database.run(sql, params ?? [])
        if (maybe && typeof maybe.then === 'function') {
          return maybe
        }
        return Promise.resolve(maybe)
      }
      return Promise.reject(new Error('No executeSql/exec/run available on db'))
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return new Promise((resolve, reject) => {
    try {
      database.transaction(
        (tx: any) => {
          // Some TX objects accept (sql, params, success, error)
          const success = (_tx: any, result: ExecResult) => resolve(result)
          const error = (_tx: any, err: any) => {
            reject(err)
            return false
          }
          // executeSql might be available directly on tx, or on db; prefer tx.executeSql
          if (tx && typeof tx.executeSql === 'function') {
            tx.executeSql(sql, params ?? [], success, error)
          } else if (typeof database.executeSql === 'function') {
            // fallback: database-level executeSql
            const maybe = database.executeSql(sql, params ?? [])
            if (maybe && typeof maybe.then === 'function') {
              maybe.then((res: any) => resolve(res)).catch(reject)
            } else {
              resolve(maybe)
            }
          } else {
            reject(new Error('No executeSql available on tx or db'))
          }
        },
        (txError: any) => {
          reject(txError)
        },
      )
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Convenience: run statement without returning rows.
 */
export async function run(sql: string, params: SQLParams = []): Promise<void> {
  await exec(sql, params)
}

/**
 * Query for multiple rows. Returns an array extracted from result.rows._array when available.
 */
export async function all<T = any>(
  sql: string,
  params: SQLParams = [],
): Promise<T[]> {
  const database = await ensureDB()

  // If the DB does not provide a transaction() method, fall back to single-statement execution.
  if (!database || typeof database.transaction !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      'all(): database.transaction is not available; falling back to single-statement executeSql',
    )
    try {
      if (typeof database.executeSql === 'function') {
        const maybe = database.executeSql(sql, params ?? [])
        if (maybe && typeof maybe.then === 'function') {
          return maybe.then((res: any) => {
            const rows =
              res && res.rows && Array.isArray(res.rows._array)
                ? res.rows._array
                : res && res.rows
                  ? res.rows
                  : []
            return rows
          })
        } else {
          const rows =
            maybe && maybe.rows && Array.isArray(maybe.rows._array)
              ? maybe.rows._array
              : maybe && maybe.rows
                ? maybe.rows
                : []
          return Promise.resolve(rows)
        }
      }

      if (typeof database.exec === 'function') {
        const maybe = database.exec(sql, params ?? [])
        if (maybe && typeof maybe.then === 'function') {
          return maybe.then((res: any) => {
            const rows =
              res && res.rows && Array.isArray(res.rows._array)
                ? res.rows._array
                : res && res.rows
                  ? res.rows
                  : []
            return rows
          })
        } else {
          const rows =
            maybe && maybe.rows && Array.isArray(maybe.rows._array)
              ? maybe.rows._array
              : maybe && maybe.rows
                ? maybe.rows
                : []
          return Promise.resolve(rows)
        }
      }

      return Promise.reject(new Error('No executeSql/exec available on db'))
    } catch (err) {
      return Promise.reject(err)
    }
  }

  return new Promise((resolve, reject) => {
    try {
      database.transaction(
        (tx: any) => {
          const success = (_tx: any, result: any) => {
            // expo-sqlite typically places rows in result.rows._array
            const rows =
              result && result.rows && Array.isArray(result.rows._array)
                ? result.rows._array
                : result && result.rows
                  ? result.rows
                  : []
            resolve(rows)
          }
          const error = (_tx: any, err: any) => {
            reject(err)
            return false
          }
          if (tx && typeof tx.executeSql === 'function') {
            tx.executeSql(sql, params ?? [], success, error)
          } else if (typeof database.executeSql === 'function') {
            const maybe = database.executeSql(sql, params ?? [])
            if (maybe && typeof maybe.then === 'function') {
              maybe
                .then((res: any) => {
                  const rows =
                    res && res.rows && Array.isArray(res.rows._array)
                      ? res.rows._array
                      : res && res.rows
                        ? res.rows
                        : []
                  resolve(rows)
                })
                .catch(reject)
            } else {
              const rows =
                maybe && maybe.rows && Array.isArray(maybe.rows._array)
                  ? maybe.rows._array
                  : maybe && maybe.rows
                    ? maybe.rows
                    : []
              resolve(rows)
            }
          } else {
            reject(new Error('No executeSql available on tx or db'))
          }
        },
        (txError: any) => {
          reject(txError)
        },
      )
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Query for a single row.
 */
export async function get<T = any>(
  sql: string,
  params: SQLParams = [],
): Promise<T | null> {
  const rows = await all<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Run multiple statements inside a single transaction using the DB's transaction method.
 * Accepts statements: Array<[sql, params?]>
 */
export async function transaction(
  statements: Array<[string, SQLParams?]>,
): Promise<void> {
  const database = await ensureDB()

  // Fallback: if the DB instance does not expose a transaction() method,
  // execute statements sequentially using the exec() helper. This is less
  // atomic than a real transaction but allows migrations / statements to run
  // in environments where a transaction API is not provided by the runtime
  // wrapper (we log a warning so this is visible during development).
  if (!database || typeof database.transaction !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      'transaction(): database.transaction is not available; falling back to sequential exec()',
    )
    for (let i = 0; i < statements.length; i++) {
      const [sql, params] = statements[i]
      // exec will throw on error which will propagate to the caller
      await exec(sql, params ?? [])
    }
    return
  }

  return new Promise((resolve, reject) => {
    try {
      database.transaction(
        (tx: any) => {
          let i = 0
          const runNext = () => {
            if (i >= statements.length) {
              return
            }
            const [sql, params] = statements[i]
            tx.executeSql(
              sql,
              params ?? [],
              () => {
                i += 1
                if (i >= statements.length) {
                  // done (note: success callback of transaction will be called by runtime)
                  return
                }
                runNext()
              },
              (_tx: any, err: any) => {
                // bubble error to transaction-level error, rejecting outer promise
                reject(err)
                return false
              },
            )
          }
          try {
            if (statements.length === 0) {
              // nothing to do
              return
            }
            runNext()
          } catch (err) {
            reject(err)
          }
        },
        (txErr: any) => {
          reject(txErr)
        },
        () => {
          resolve()
        },
      )
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Get current applied migration version.
 * If the schema_version table doesn't exist, returns 0.
 */
async function getCurrentMigrationVersion(): Promise<number> {
  try {
    const row = await get<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version',
      [],
    )
    if (!row || row.version === null || row.version === undefined) {
      return 0
    }
    return Number(row.version) || 0
  } catch {
    // table probably doesn't exist
    return 0
  }
}

/**
 * Apply migrations sequentially.
 */
export async function migrate(): Promise<void> {
  // Ensure DB is ready
  await ensureDB()
  // enable foreign keys if available
  try {
    await exec('PRAGMA foreign_keys = ON;')
  } catch {
    // non-fatal
  }

  const current = await getCurrentMigrationVersion()
  if (current >= LATEST_MIGRATION_VERSION) {
    return
  }

  for (let v = current + 1; v <= LATEST_MIGRATION_VERSION; v++) {
    const migrationIndex = v - 1
    const statements = MIGRATIONS[migrationIndex] ?? []
    const stmts: Array<[string, SQLParams?]> = statements.map((s: string) => [
      s,
      [],
    ])
    try {
      await transaction(stmts)
      const appliedAt = new Date().toISOString()
      await exec(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?);',
        [v, appliedAt],
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Migration v${v} failed: ${message}`)
    }
  }
}

/**
 * Initialize DB (open + migrate)
 */
export async function initDatabase(): Promise<void> {
  await ensureDB()
  await migrate()
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const row = await get<{ count: number }>(
    'SELECT COUNT(*) as count FROM sqlite_master WHERE type = ? AND name = ?;',
    ['table', tableName],
  )
  return !!(row && row.count > 0)
}

/**
 * Export default API
 */
export default {
  openDB: ensureDB,
  exec,
  run,
  all,
  get,
  transaction,
  migrate,
  initDatabase,
  tableExists,
}
