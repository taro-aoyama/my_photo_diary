# M1 Issue Drafts — DB / File storage / Camera / Photo flow

このファイルには M1 フェーズで優先度高めの Issue 草案をまとめています。各ブロックはそのまま GitHub の New Issue にコピペして使える形式です。M0（#1〜#4）完了を前提に進めます。

---

## Issue: DB schema & initialization (expo-sqlite)

Title:
```
[backend] DB schema & initialization (expo-sqlite)
```

### 概要
ローカルの単一の正本として SQLite を採用し、初期スキーマ（albums, photos, labels, photo_labels, notes, events）を定義します。アプリ起動時に DB を初期化し、将来のマイグレーションに備えた schema_version 管理を実装します。全テーブルに同期メタ（id, remote_id, created_at, updated_at, deleted_at, sync_status）を付与します。

### 受け入れ条件
- [ ] `lib/db/schema.ts` に CREATE TABLE の SQL が記載されている（albums, photos, labels, photo_labels, notes, events, schema_version）。
- [ ] アプリ起動時に DB 初期化処理が実行され、テーブルが作成される（サンプルの初期化コードが存在）。
- [ ] `schema_version` の概念が実装され、現在バージョンを保存できる。
- [ ] 基本的なインデックス（photos.album_id, photos.taken_at など）が作成されている。
- [ ] 単体テストまたはスクリプトでテーブル作成が確認できるサンプルがある。

### 実装ノート
- SQLite は `expo-sqlite` を想定。Promise ベースの薄いラッパーを `lib/db/sqlite.ts` に作成する（`run`, `get`, `all`, `transaction`）。
- マイグレーションは idempotent に設計。起動時に未適用のマイグレーションを順次実行する。
- `sync_status` は `'synced' | 'pending' | 'conflict' | 'failed'` を採用。
- 外部キー制約は明示的に有効化するか、アプリ側で整合性を管理する（PRAGMA foreign_keys）。

### 見積もり
- medium（1〜3 日）

### 依存
- M0 完了（Project bootstrap, Tooling）

### ラベル / マイルストーン
- Labels: `backend`, `infra`, `priority:high`
- Milestone: `M1`

---

## Issue: File storage utilities (expo-file-system)

Title:
```
[media] File storage utilities (expo-file-system)
```

### 概要
撮影・取り込みした画像をアプリ内ストレージへ保存・削除・参照するユーティリティを実装します。保存時の命名規則、ディレクトリ構成、サムネイル生成、エラー処理の定義を含みます。

### 受け入れ条件
- [ ] `lib/media/storage.ts`（または同等）に `saveImage`, `deleteImage`, `getUri`, `generateThumbnail` の API が存在する。
- [ ] 画像を保存すると `file://` 形式の安定した URI が返る（iOS/Android）。
- [ ] サムネイル生成ができ、thumbnail URI を返す（非同期バックグラウンドでも可）。
- [ ] ファイル削除が成功しなかった場合に適切なエラーが返り、DBと整合するためのガイドがある。
- [ ] ユニットテスト（または小さな統合テスト）で保存・削除の基本動作が確認できる。

### 実装ノート
- 保存先: `${FileSystem.documentDirectory}photos/` のようなアプリ専用ディレクトリを使用。
- 命名: `<uuid>.<ext>`。拡張子は元ファイルから推定。
- サムネイルは `expo-image-manipulator` を利用して生成（例: 200x200）。
- 保存はトランザクションに準じて DB レコード作成と組合せる（ファイル保存が成功してから DB を更新する等の順序を明確に）。
- Web では `input[type=file]` → 一時 Blob → サーバアップロード or IndexedDB などの扱いを別途実装する（本 Issue ではモバイル重点）。

### 見積もり
- medium（1〜2 日）

### 依存
- DB 初期化（lib/db/schema.ts）

### ラベル / マイルストーン
- Labels: `media`, `backend`, `priority:high`
- Milestone: `M1`

---

## Issue: Camera & Image Picker integration

Title:
```
[media] Camera & Image Picker integration (expo-camera / expo-image-picker)
```

### 概要
`expo-camera` と `expo-image-picker` を統合し、権限リクエスト（カメラ・フォトライブラリ・位置情報）を扱う共通フローを実装します。撮影・取り込み API をラップしてアプリ内の保存処理へ繋げます。

### 受け入れ条件
- [ ] カメラ撮影フロー（`takePictureAsync` 等）で画像を取得できる。
- [ ] ギャラリーからの取り込みができる（必要なパーミッションをリクエスト・ハンドリング）。
- [ ] 権限が拒否された場合のフォールバック UX（設定画面への誘導や説明）が用意されている。
- [ ] 取得した画像のメタ（Exif の撮影日時・位置情報）が読める（可能な限り）。
- [ ] 取得した画像を `lib/media/storage.ts` の `saveImage` に渡して保存できるサンプルがある。

### 実装ノート
- Expo の権限周りは各プラットフォームで差異があるため、権限チェック/リクエストを抽象化したユーティリティを作る。
- 撮影画面は最小限の UI（撮影ボタン、フラッシュ、裏/表カメラ切替）を用意するプレースホルダで OK。
- Web は後続で `input[type=file]` にフォールバックする（本 Issue ではモバイル優先）。

### 見積もり
- medium（1〜3 日）

### 依存
- File storage utilities（保存 API と連携するため）

### ラベル / マイルストーン
- Labels: `media`, `feature`, `priority:high`
- Milestone: `M1`

---

## Issue: Photo save flow (capture/import → save → list)

Title:
```
[feature] Photo save flow: capture/import → save → list
```

### 概要
撮影またはギャラリーからの取り込みから、ファイル保存、Photo レコード作成、アルバム／写真一覧への反映までのエンドツーエンドのフローを実装します。まずはシンプルなワークフローで動作確認できることを目標とします。

### 受け入れ条件
- [ ] ユーザーが撮影または取り込みで得た画像を保存すると、`photos` テーブルにレコードが作成される（id, file_uri, created_at 等が記録される）。
- [ ] アルバム一覧（またはデフォルトの「All Photos」ビュー）に保存した写真が即時表示される（即時反映 / optimistic UI）。
- [ ] 保存処理中に適切なローディング UX とエラーハンドリングがある（例: 保存失敗時のリトライ）。
- [ ] 写真詳細に遷移して基本的なメタ（撮影日、位置、メモ編集リンク）を確認できる。（詳細の完全実装は別 Issue）

### 実装ノート
- フローの順序: 1) カメラ/ピッカーで画像取得 → 2) `saveImage` 実行（ファイル保存 & サムネイル生成）→ 3) DB トランザクションで `photos` レコード作成 → 4) UI 更新（Zustand またはクエリの再フェッチ）
- optimistic update を使う場合、ロールバック戦略（保存失敗時）を明記する。
- まずは単純表示（グリッド）で良い。画像の遅延読み込みやキャッシュは後で最適化。

### 見積もり
- medium（1〜3 日）

### 依存
- Camera & Image Picker integration
- File storage utilities
- DB schema & initialization

### ラベル / マイルストーン
- Labels: `feature`, `media`, `priority:high`
- Milestone: `M1`

---

## 実施フロー（推奨）
1. `DB schema & initialization` を完了して DB レイヤの雛形を作る。
2. 並行して `File storage utilities` を実装（保存・削除・サムネイル）。
3. `Camera & Image Picker integration` を実装し、保存 API と繋ぐ。
4. `Photo save flow` を組み上げ、E2E 的に保存→一覧が動くことを確認する。

並列作業が可能な部分は分割して着手してください（例: UI 側と DB 側で担当を分ける等）。各 Issue は 1〜3 日で完了する粒度を目標に、必要ならさらに細分化してください。

---

## 次のアクション（私が行うこと）
- これらの草案をあなたが GitHub Issues に貼ったら、Issue 番号を教えてください。
- あなたが許可すれば、`lib/db/schema.ts` の CREATE TABLE 実装雛形と `lib/db/sqlite.ts` の Promise ラッパーを作成します（作成後に単体テストの骨格も追加します）。

必要な修正や追加したい受け入れ条件があれば教えてください（優先度や見積もりを調整します）。
