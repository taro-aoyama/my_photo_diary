import { all, run } from '@/lib/db/sqlite';

export type Photo = {
  id: string;
  file_uri: string;
  thumbnail_uri?: string | null;
  taken_at?: string | null;
  created_at: string;
  width?: number | null;
  height?: number | null;
};

export async function createPhoto(photo: Omit<Photo, 'created_at'>): Promise<void> {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO photos (id, file_uri, thumbnail_uri, taken_at, created_at, updated_at, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      photo.id,
      photo.file_uri,
      photo.thumbnail_uri,
      photo.taken_at,
      now,
      now,
      photo.width,
      photo.height,
    ]
  );
}

export async function getPhotos(): Promise<Photo[]> {
  return all<Photo>('SELECT id, file_uri, thumbnail_uri, taken_at, created_at, width, height FROM photos ORDER BY created_at DESC');
}
