# Issue Drafts & Architecture Notes

このファイルはプロジェクト開始時に立てるべき Issue のドラフトと、現時点でのアーキテクチャ方針の要約をまとめたものです。あなたが手を動かし始める前に、作業の粒度・優先度・受け入れ条件を明確にしてプロジェクトの歩みを管理できるようにします。Issue テンプレはそのまま GitHub Issue に貼れる形式になっています。

---

## 決定済み方針（短く）
- ローカル DB: `expo-sqlite`（SQLite）を一次採用。複雑なクエリ／リレーションに対応するため。
- Key-Value (MMKV): 設定や軽量キャッシュ用途で併用可（ただしメタの正本は SQLite）。
- 状態管理: `Zustand`（UI ローカル状態） + `React Query`（サーバ同期／キャッシュ／ミューテーション）を併用。
- 画像実体: `expo-file-system` に保存。DB はメタ（URI / EXIF / sync メタ等）を保持する。
- 同期メタを全テーブルに持たせる（`id` (UUIDv4), `remoteId`, `createdAt`, `updatedAt`, `deletedAt`, `syncStatus`）。

---

## マイルストーン（README の M0〜M7 を反映）
- M0: リポジトリ初期化、CI、Lint/Prettier、TypeScript 設定
- M1: アルバム/写真 CRUD、撮影/取り込み、保存（ローカル）
- M2: ラベル/メモ付与、検索/フィルタ
- M3: カレンダー/予定、予定→撮影導線
- M4: Web最適化、アクセシビリティ
- M5: E2Eテスト（Detox or Maestro）
- M6: バックエンド連携（Supabase or Rails）
- M7: 共有/コメント/チャット/通知

---

## 優先度高めの Issue（テンプレ：そのまま貼って使えます）

### Issue: プロジェクト初期化（Expo + TypeScript）
- 説明
  ```
  create-expo-app で TypeScript の Expo プロジェクトを作成し、初期 `app/` 構成（tabs + albums/calendar/settings のプレースホルダ）をコミットする。
  ```
- 受け入れ条件
  - リポジトリルートに Expo プロジェクトが存在する。
  - `pnpm start` (または npm/yarn) で起動できる。
  - `app/` に最低限のルートプレースホルダ画面がある。
- 規模: small
- 依存: なし
- ラベル: infra, enhancement
- マイルストーン: M0

---

### Issue: TypeScript / ESLint / Prettier / 基本設定
- 説明
  ```
  `tsconfig.json`（strict）を有効にし、ESLint と Prettier をセットアップする。CI とローカルで型チェックと lint が走るように設定する。
  ```
- 受け入れ条件
  - `pnpm lint` と `pnpm type-check` がローカルで通る（もしくは許容される既知の警告があることを明記）。
  - CI ワークフロー（草案）を追加してある。
- 規模: small
- 依存: #プロジェクト初期化
- ラベル: infra, quality
- マイルストーン: M0

---

### Issue: DB 方針とスキーマ雛形（SQLite）
- 説明
  ```
  データモデルを確定し、`lib/db/schema.ts` に初期 CREATE TABLE 文と同期メタ（remoteId, syncStatus, deletedAt 等）を追加する。
  ```
- 受け入れ条件
  - `lib/db/schema.ts` または同等のファイルに SQL スクリプト（photos, albums, labels, photolabels, notes, events）が存在する。
  - 各テーブルに UUID 主キー、createdAt, updatedAt, deletedAt, syncStatus を含める。
- 規模: medium
- 依存: #プロジェクト初期化
- ラベル: backend, infra
- マイルストーン: M1

---

### Issue: DB 初期化ロジック（SQLite）
- 説明
  ```
  Expo SQLite を使って DB を初期化するユーティリティを実装する。アプリ起動時にマイグレーション／バージョンチェックを行えるようにする。
  ```
- 受け入れ条件
  - アプリ起動時に DB が初期化され、テーブルが作成されるサンプルコードが存在する。
  - schema version 管理の最小実装がある（バージョン番号を保存して将来のマイグレーションへ繋げる）。
- 規模: medium
- 依存: #DB 方針とスキーマ雛形
- ラベル: backend, enhancement
- マイルストーン: M1

---

### Issue: 画像保存ユーティリティ（expo-file-system）
- 説明
  ```
  撮影/取込した画像をアプリ内ディレクトリに保存するユーティリティ群（保存、削除、URI 変換）を実装する。保存時の命名ルールとディレクトリ構成を決める。
  ```
- 受け入れ条件
  - 画像を保存して `file://` ベースの URI を取得できる。
  - 保存に失敗した場合に適切なエラーが返る。
- 規模: medium
- 依存: #DB 初期化ロジック
- ラベル: media, enhancement
- マイルストーン: M1

---

### Issue: カメラ / 画像ピッカー統合
- 説明
  ```
  `expo-camera` と `expo-image-picker` を統合し、権限リクエストを含む撮影/取り込みフローを実装する（iOS/Android/Web の挙動差は後続で扱う）。
  ```
- 受け入れ条件
  - 権限ダイアログを表示して許可処理を行える。
  - 撮影またはギャラリーから画像を取得でき、`画像保存ユーティリティ` と連携して保存できる。
- 規模: medium
- 依存: #画像保存ユーティリティ
- ラベル: media, feature
- マイルストーン: M1

---

### Issue: 写真保存フローのエンドツーエンド（撮影 → 保存 → 一覧）
- 説明
  ```
  カメラ/ピッカーで取得した画像を保存し、Photo レコードを作成してアルバム一覧／写真一覧で表示できるようにする。
  ```
- 受け入れ条件
  - 画像を撮影/取り込みして保存した結果がアルバム一覧で確認できる。
  - DB に Photo レコードが作成されている（所定のフィールドが埋まっている）。
- 規模: medium
- 依存: #カメラ / 画像ピッカー統合, #DB 初期化ロジック
- ラベル: feature
- マイルストーン: M1

---

## その他の Issue（中期〜長期）
- アルバム CRUD（作成/編集/削除）
- 写真詳細（メモ/ラベルの付与、編集）
- ラベル CRUD と写真への紐付け UI
- カレンダー UI と日付バッジ（`react-native-calendars`）
- 予定（Event）モデルと「予定 → 撮影」ボタン
- Web の input:file フォールバック UX
- テスト（ユニット/コンポーネント/E2E）
- バックエンド連携設計（Supabase vs Rails）とマイグレーション案
- エクスポート / バックアップ機能
- アクセシビリティ改善

各 Issue は「受け入れ条件 (Acceptance Criteria)」を必ず記載して粒度を 1〜3 日で片付く単位に分割してください。大きいものはさらに分割することを推奨します。

---

## Issue 作成テンプレート（コピーして使ってください）
タイトル:
```
[カテゴリ] <短い概要>
```

本文:
```
### 概要
（何を作るか、なぜ必要かを簡潔に）

### 受け入れ条件
- [ ] 条件1
- [ ] 条件2

### 実装ノート / 備考
- 技術方針: SQLite (`expo-sqlite`) を使用
- 参考: docs/architecture.md にアーキテクチャ方針あり
- 見積もり: small / medium / large

### 依存
- #xxx (依存する Issue 番号)
```

---

## 推奨ラベルセット（最初に用意すると便利）
- infra, feature, enhancement, bug, ci, test, docs, web, media, priority:high, priority:medium, priority:low

---

## docs/architecture.md（素案・要約）
- ローカル第一: SQLite を single source of truth とする
- ストア: Zustand（UI）、React Query（同期/非同期ジョブ管理）
- 画像: `expo-file-system` に保存。DB はファイル URI を参照
- 同期メタ: `remoteId`, `createdAt`, `updatedAt`, `deletedAt`, `syncStatus`
- 衝突解決: 初期は LWW（updatedAt 優先）。将来的に UI ベースの手動解決を検討
- マイグレーション: `schema_version` を DB に保存して、起動時にバージョン差分でマイグレーションを実行する仕組みを用意する

（上記は別ファイル `docs/architecture.md` に展開することを推奨）

---

## 次のアクション提案（私が行えること）
1. 上記の Issue をそのまま Markdown として出力します（このファイルはその出力の一つです）。  
2. あなたの指示があれば、`docs/architecture.md` の完全な雛形（より詳細なスキーマ例、CREATE TABLE 文の雛形、sync メタ例）を作成してここに追加します。  
3. GitHub に直接 Issue を作成する場合は、あなたの権限（トークン or repository 認可）が必要です。私は手元で Issue を直接作れないので、Markdown を提供してあなたが貼り付ける形を推奨します。

---

もしこのまま進めるなら、次にどれを出力しましょうか？
- A: `docs/architecture.md` の詳細版（CREATE TABLE 文、フィールド説明、syncStatus 列の enum）を作る  
- B: 上の Issue を個別 Markdown ファイルとして分割して出力する（例: `ISSUE_01_PROJECT_INIT.md` など）  
- C: GitHub に貼る用のまとめ Markdown（コピーして一括で貼れるテンプレ）を出力する

どれを希望しますか？また、Issue をそのまま貼る際に優先して作りたいものがあれば教えてください（例: 最初は M0 の 1〜4 を一括で）。