# my_photo_diary — アーキテクチャ設計（詳細）

このドキュメントは、ローカル第一（オフラインファースト）な写真日記アプリのアーキテクチャ方針、SQLite スキーマ雛形、同期メタ情報、マイグレーション方針、及び実装上の注意点をまとめたものです。
初期実装は Expo (Managed workflow) + TypeScript + expo-sqlite を前提とします。

目次
1. 方針サマリ
2. 同期メタと ID 方針
3. SQL スキーマ（CREATE TABLE 文）
4. インデックスとクエリの指針
5. マイグレーション戦略
6. データアクセスの実装ガイドライン
7. 画像ファイルの取り扱い（FileSystem、サムネイル）
8. 同期（ローカル ⇄ クラウド）設計の概要
9. 衝突解決ポリシー（初期案）
10. 型（TypeScript）インターフェイス例
11. 運用・テスト注意点
12. 次のステップ

---

1. 方針サマリ
- SQLite (`expo-sqlite`) を Single Source of Truth（正本）として採用します。
- 画像の実体（バイナリ）は `expo-file-system` に保存し、DB にはファイル URI とメタデータを保持します。
- 各レコードに同期に必要なメタ（UUID、remote_id、created_at、updated_at、deleted_at、sync_status）を持たせて、将来のクラウド同期に備えます。
- 状態管理: UI 状態は `Zustand`、非同期/同期タスクやリモート通信は `React Query` で扱う想定です。

---

2. 同期メタと ID 方針
- `id`: ローカルで生成する UUID v4（文字列）。全テーブルの主キー。
- `remote_id`: クラウド側で付与される ID（ある場合）。`NULL` を許容。
- `created_at`, `updated_at`: ISO 8601 文字列（UTC）。タイムスタンプは常に UTC を使う。
- `deleted_at`: ソフトデリート用のタイムスタンプ（NULL = 未削除）。
- `sync_status`: 同期状態の簡易 enum（文字列）。初期値は `'pending'`。

推奨 `sync_status` 候補:
- `'synced'` — ローカルの変更がクラウドに反映済み
- `'pending'` — ローカルで変更あり、まだクラウドへアップロードされていない
- `'conflict'` — クラウドとの競合が検出された（UI での解決を要する）
- `'failed'` — 同期中にエラーが発生した状態
- `'deleted'` — ソフトデリート済み（クラウドに削除通知が必要）

設計メモ:
- `updated_at` を競合解決（Last-Write-Wins 等）やマージ判定のために必須で更新する。
- 変更があった際は `sync_status` を `'pending'` にセットする。

---

3. SQL スキーマ（CREATE TABLE 文の雛形）
以下は `lib/db/schema.ts` に置くことを想定した SQL 雛形です。初期化時に一括で実行します。

- schema_version テーブル（マイグレーション管理）
```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

- albums テーブル
```sql
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,               -- UUID v4
  remote_id TEXT,                    -- クラウド側 ID
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
```

- photos テーブル
```sql
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,               -- UUID v4
  remote_id TEXT,
  album_id TEXT,                     -- FK (logical) -> albums.id
  file_uri TEXT NOT NULL,            -- file:// パスやローカルの相対パス
  thumbnail_uri TEXT,                -- あればサムネイルの URI
  taken_at TEXT,                     -- 撮影日時（EXIF から）
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  location_lat REAL,
  location_lng REAL,
  width INTEGER,
  height INTEGER,
  orientation INTEGER
);
```

- labels テーブル（ラベル／タグ／タイトル候補）
```sql
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  remote_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tag',  -- 'title' | 'tag'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
```

- photo_labels テーブル（多対多）
```sql
CREATE TABLE IF NOT EXISTS photo_labels (
  photo_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (photo_id, label_id)
);
```

- notes テーブル（写真に対する日記メモ）
```sql
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  remote_id TEXT,
  photo_id TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
```

- events テーブル（予定）
```sql
CREATE TABLE IF NOT EXISTS events (
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
);
```

- その他（履歴・ログテーブル等は必要に応じて追加）

注意:
- SQLite は外部キー制約を利用できますが、Expo の SQLite 実装では PRAGMA foreign_keys = ON を明示的にセットして使用する必要があります。実運用では論理的参照のみでコード側で整合性を管理する方が安全な場合もあります。
- 全テーブルで `created_at`/`updated_at` を持つことで、差分同期やマージが容易になります。

---

4. インデックスとクエリの指針
パフォーマンス上、下記インデックスを追加することを推奨します（クエリ頻度に応じて調整）：

```sql
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);
CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);
CREATE INDEX IF NOT EXISTS idx_notes_photo_id ON notes(photo_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);
```

クエリの指針:
- カレンダー表示では `taken_at` / `created_at` を日付で抽出してカウントする。可能なら日付だけを格納する補助列（`taken_date`）を用意して高速検索することを検討する。
- ラベル検索では `JOIN` を用いて `photos` ↔ `photo_labels` ↔ `labels` の絞り込みを行う。
- ページネーションは LIMIT/OFFSET ではなく、キー（created_at や id）を用いた cursor-based を推奨（大量データ時に性能が良い）。

---

5. マイグレーション戦略
- schema_version テーブルを用い、起動時に現在のバージョンを読み取り、適用されていないマイグレーション SQL を順次実行する。
- マイグレーションは破壊的変更を避け、次の流れで行う：
  1. 新しい列を追加（ALTER TABLE ADD COLUMN）
  2. アプリをデプロイしてデータを移行（必要ならバックグラウンドで既存行を更新）
  3. 古い列を安全に削除するときは別マイグレーションで対応（SQLite は DROP COLUMN を直接サポートしていないため、テーブル再作成が必要）
- マイグレーションはトランザクション内で実行する（可能な限り）し、失敗時にロールバックできる設計にする。

---

6. データアクセスの実装ガイドライン
- `lib/db/sqlite.ts` は以下を提供:
  - DB 初期化（open、PRAGMA 設定、schema_version チェック、マイグレーション実行）
  - 基本的な CRUD ヘルパー（run, all, get）
  - トランザクションヘルパー（BEGIN/COMMIT/ROLLBACK）
  - シンプルな ORM-ish ユーティリティ（パラメータ置換を安全に扱う）
- DB アクセスは Promise ベースのラッパーにし、呼び出し元（React Query の mutation / query）で扱いやすくする。
- 重要: SQL インジェクション対策として必ずプレースホルダ（? or :named）を使用する。

パターン例（擬似コード）
- `db.run('INSERT INTO photos (...) VALUES (?, ?, ...)', [id, uri, ...])`
- `db.all('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at DESC LIMIT ?', [albumId, pageSize])`

---

7. 画像ファイルの取り扱い（FileSystem、サムネイル）
- 画像は `expo-file-system` のアプリ専用ディレクトリ（例: `${FileSystem.documentDirectory}photos/`）に保存する。
- 保存時の命名規則: `<uuid>.<ext>`（拡張子は元ファイルのもの。JPEG/PNG/WebP 等）
- DB には `file_uri`（file://...）を格納し、画像の取り扱いはファイルシステムで行う。
- サムネイル: 表示のパフォーマンス向上のため、原寸画像とは別にサムネイル（例: 200x200）を生成し `thumbnail_uri` を保存する。生成は保存処理の一部として行う（可能なら非同期で背景処理）。
- 画像削除: Photo レコード削除時（ソフトデリートまたは完全削除）にファイルの削除を行う。ファイル削除に失敗した場合でも DB の状態と整合するようにエラー処理を明確にする。
- Web: ブラウザでは `input type="file"` ベースのアップロードを行い、IndexedDB / blob URL など Web の制約に合わせる。Web では file:// URI が使えないので、Web 用のパス解決ロジックを実装する。

---

8. 同期（ローカル ⇄ クラウド）設計の概要
- 基本戦略（フェーズ）
  1. ローカルで操作（作成/更新/削除） → `sync_status` を `'pending'` にセット
  2. バックグラウンドジョブ（React Query の mutation / worker）で差分をクラウドに送信
  3. 成功時に `remote_id` と `sync_status='synced'` に更新。失敗時は `sync_status='failed'` とする。
  4. 初回ログインまたは定期同期でローカルとクラウドを照合（アップロード・ダウンロード）してマージ
- 差分検出:
  - `updated_at` を使ってローカルの変更を検出する（`updated_at > lastSyncAt`）
  - 画像はファイルハッシュ（SHA256）を持たせて重複検出を行うと効率的
- 転送:
  - 画像はクラウドストレージ（Supabase Storage / S3）へアップロードして、その公開/署名付き URL をリモートメタに保存
  - メタ（photo レコード等）は API（Postgres）へ送信
- 初回マージ:
  - ローカルの `id` とクラウドの `remote_id` を対応付けるステップを実装（local → upload → server returns remote_id）
- オフラインと再同期:
  - オフラインではローカルで変更を受け付け、オンライン復帰時に同期を試みる
  - 同期の実行は retry/backoff を使い、ネットワーク障害時にリトライする

---

9. 衝突解決ポリシー（初期案）
- シンプルな初期戦略: Last Write Wins (LWW) — `updated_at` が新しい方を採用
- フィールドレベルのより複雑なマージは将来の拡張（例: メモは結合、ラベルは集合和）
- 衝突検出:
  - クラウドから受け取ったエントリの `updated_at` とローカルの `updated_at` を比較し、双方が更新されている場合は `sync_status='conflict'` としてユーザーに UI で選ばせるフローを提供する
- 衝突解決 UI:
  - 変更のサマリを表示し、ローカル/クラウドのどちらを採用するか選べる画面を用意する
- 画像の競合:
  - 画像ファイル自体はハッシュで差分を検出し、重複がなければ両方保存、あるいはユーザーに選択させる

---

10. TypeScript インターフェイス例
（簡易版。プロジェクトで共通の型定義を `lib/db/types.ts` に置くことを推奨）

```ts
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'failed' | 'deleted';

export interface BaseModel {
  id: string;
  remoteId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus: SyncStatus;
}

export interface Album extends BaseModel {
  name: string;
  description?: string | null;
}

export interface Photo extends BaseModel {
  albumId?: string | null;
  fileUri: string;
  thumbnailUri?: string | null;
  takenAt?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  width?: number;
  height?: number;
  orientation?: number;
}

export interface Label extends BaseModel {
  name: string;
  type: 'title' | 'tag';
}

export interface Note extends BaseModel {
  photoId: string;
  body?: string | null;
}

export interface EventModel extends BaseModel {
  title: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  memo?: string | null;
}
```

---

11. 運用・テスト注意点
- 単体テスト: DB ラッパー（SQL 実行）とファイル保存ユーティリティをユニットテストでカバーする。SQLite の挙動はモックもしくは実ファイルでのインテグレーションテストを用いる。
- E2E: 重要なフロー（撮影→保存→一覧表示→同期）を E2E テストで検証（Detox / Maestro を検討）。
- バックアップ/エクスポート: データエクスポート（JSON + 画像 zip）を用意して、ユーザーが自分のデータを持ち出せるようにする。
- ロギング: 同期処理は詳細なログ（成功/失敗/HTTP レスポンス）を残す（開発時はアプリ内のデバッグ画面に表示すると便利）。

---

12. 次のステップ（短期）
- `lib/db/schema.ts` に上記 SQL を実装して DB 初期化ロジックを作成（Issue: DB schema & initialization）。
- `lib/db/sqlite.ts` に Promise ベースのラッパーとマイグレーション実行を作る。
- 画像保存ユーティリティ（`lib/media/storage.ts`）を実装し、サムネイル生成（`expo-image-manipulator` を利用）を組み込む。
- Camera/Picker の PoC を作り、`photo save flow` の E2E を確認する。

---

補足メモ
- Expo の SQLite は iOS/Android/web で実装差があるため、Web 用は `react-native-web` と `input[type=file]` によるフォールバックを検討してください。
- 画像のメタ（EXIF）取得は `expo-image-picker` や `expo-media-library` の機能を利用し、保存時に `taken_at` / `location` を埋めると便利です。
- セキュリティ: 端末内に個人情報（顔写真/位置情報）を保存するため、バックアップ/復元や共有機能を実装する際はアクセス権と削除ポリシーを明確に。

---

このファイルは随時更新してください。次に進める作業は `DB schema & initialization` の Issue をドラフト化して GitHub に登録することです。必要であれば、CREATE TABLE 文のマイグレーションスクリプト（v1, v2 などの SQL）も生成します。
