/**
 * Example usage of the DB layer for my_photo_diary.
 *
 * This file demonstrates:
 *  - Initializing the SQLite DB and applying migrations
 *  - Creating a simple album
 *  - (Optionally) saving an image via the media storage utilities
 *  - Inserting a photo record referencing a local file URI
 *  - Querying photos for an album
 *
 * NOTE:
 *  - This is an example file intended to be read/run inside the Expo environment.
 *  - Replace `sampleSourceUri` with an actual file URI from the camera or picker when running on-device.
 */

/**
 * Simple internal UUID v4 generator (RFC4122-like).
 * This avoids an external dependency for the example usage.
 * Note: For production, prefer a robust UUID library or crypto-backed implementation.
 */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
import { initDatabase, run, all, get, tableExists } from './sqlite'
import { saveImage, deleteImage } from '../media/storage'

/**
 * Verify that all expected tables exist after migration.
 */
async function verifySchema() {
  const requiredTables = [
    'schema_version',
    'albums',
    'photos',
    'labels',
    'photo_labels',
    'notes',
    'events',
  ]
  console.log('Verifying schema...')
  for (const tableName of requiredTables) {
    const exists = await tableExists(tableName)
    if (!exists) {
      throw new Error(`Verification failed: table '${tableName}' does not exist.`)
    }
    console.log(`- Table '${tableName}' exists.`)
  }
  console.log('Schema verification successful.')
}

async function createAlbum(name: string) {
  const id = uuidv4()
  const now = new Date().toISOString()

  await run(
    `INSERT INTO albums (id, name, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?);`,
    [id, name, now, now, 'pending'],
  )

  return id
}

async function addPhotoRecord({
  id,
  albumId,
  fileUri,
  thumbnailUri,
  takenAt,
}: {
  id: string
  albumId?: string | null
  fileUri: string
  thumbnailUri?: string | null
  takenAt?: string | null
}) {
  const now = new Date().toISOString()
  await run(
    `INSERT INTO photos (id, album_id, file_uri, thumbnail_uri, taken_at, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      albumId ?? null,
      fileUri,
      thumbnailUri ?? null,
      takenAt ?? null,
      now,
      now,
      'pending',
    ],
  )
}

/**
 * Query and print photos belonging to an album
 */
async function listPhotosForAlbum(albumId?: string | null) {
  const rows = await all(
    albumId
      ? `SELECT id, file_uri, thumbnail_uri, taken_at, created_at FROM photos WHERE album_id = ? AND deleted_at IS NULL ORDER BY created_at DESC;`
      : `SELECT id, file_uri, thumbnail_uri, taken_at, created_at FROM photos WHERE deleted_at IS NULL ORDER BY created_at DESC;`,
    albumId ? [albumId] : [],
  )
  console.log('Photos:', rows)
  return rows
}

/**
 * High-level example flow:
 * 1. Initialize DB (applies migrations)
 * 2. Create an album
 * 3. Save an image into app storage (simulated by passing a source URI)
 * 4. Insert DB record and query it back
 *
 * Run this on a device/simulator where `sampleSourceUri` points to a real image file URI,
 * e.g. a result from `expo-image-picker` or camera.
 */
export async function exampleFlow(sampleSourceUri?: string) {
  try {
    // 1) Init DB and verify schema
    await initDatabase()
    console.log('Database initialized')
    await verifySchema()

    // 2) Create Album
    const albumId = await createAlbum('My Test Album')
    console.log('Created album:', albumId)

    // 3) Save image to app storage
    // If sampleSourceUri is omitted, we skip actual file operations and insert a placeholder URI.
    let saved: {
      id: string
      fileUri: string
      thumbnailUri?: string | null
    } | null = null
    if (sampleSourceUri) {
      try {
        saved = await saveImage(sampleSourceUri, {
          generateThumbnail: true,
          thumbnailMaxSize: 400,
        })
        console.log('Saved image to app storage:', saved)
      } catch (err) {
        console.warn('Image save failed, falling back to placeholder URI', err)
        saved = {
          id: uuidv4(),
          fileUri: sampleSourceUri,
          thumbnailUri: null,
        }
      }
    } else {
      // placeholder
      const placeholderUri = `file:///placeholder/${uuidv4()}.jpg`
      saved = { id: uuidv4(), fileUri: placeholderUri, thumbnailUri: null }
      console.log('Using placeholder image URI:', placeholderUri)
    }

    // 4) Insert photo record referencing saved.fileUri
    const photoId = uuidv4()
    await addPhotoRecord({
      id: photoId,
      albumId,
      fileUri: saved.fileUri,
      thumbnailUri: saved.thumbnailUri ?? null,
      takenAt: new Date().toISOString(),
    })
    console.log('Inserted photo record:', photoId)

    // 5) Query photos for the album
    const photos = await listPhotosForAlbum(albumId)
    console.log(`Found ${photos.length} photos for album ${albumId}`)

    // Example cleanup: delete saved image files if we created them
    // (In real app you might not delete immediately)
    if (sampleSourceUri && saved) {
      try {
        await deleteImage(saved.fileUri, saved.thumbnailUri ?? undefined)
        console.log('Deleted saved files (example cleanup)')
      } catch (err) {
        console.warn('Failed to delete saved files during cleanup', err)
      }
    }

    return { albumId, photoId, photos }
  } catch (err) {
    console.error('exampleFlow failed:', err)
    throw err
  }
}

/**
 * If you want to run this script in a dev environment, call exampleFlow with a real URI.
 * Example (do NOT call in production code directly):
 *
 * import { exampleFlow } from './lib/db/example_usage';
 * exampleFlow('file:///.../IMG_1234.JPG').catch(console.error);
 *
 */
