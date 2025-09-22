# my_photo_diary

写真日記（仮）

学習目的で React Native + Expo を使って iOS / Android / Web のクロスプラットフォーム写真日記アプリを作る計画です。最初はスタンドアローン（端末内完結）で実装し、のちに Supabase（または Rails API）を用いたバックエンド連携へ拡張します。

## Getting Started

1.  **Install dependencies:**

    ```bash
    corepack enable
    corepack prepare pnpm@latest --activate
    pnpm install --frozen-lockfile
    ```

2.  **Start the development server:**
    ```bash
    pnpm start
    ```

⸻

目的 / ビジョン
• 毎日の写真に ラベル（タイトル・内容タグ）と メモ（日記本文） を添えて保存。
• アルバムで整理し、カレンダーから振り返る/予定から撮影へ遷移できる導線を提供。
• 学習用として、モバイル/Webの違い・メディア権限・オフライン対応・将来の同期を一通り体験すること。

⸻

スコープ

MVP（端末内完結）
• アルバム機能（一覧/作成/名前変更/削除）
• 撮影/取り込み（カメラ、ギャラリー）と保存
• 写真に複数ラベル（タイトル＋内容タグ）・メモ（日記本文）を付与
• カレンダー表示（撮影・作成日でバッジ表示、タップで該当写真にジャンプ）
• 予定表 → 撮影起点（予定日詳細からカメラ起動）
• 端末内データ永続化（SQLite or MMKV + ファイルシステム）
• 端末間同期なし、ユーザー登録なし

将来拡張
• ログイン（メール/パスワード、OAuth）
• クラウド同期（Supabase / Rails API + S3 等）
• アルバム共有（招待、閲覧/編集権限）
• コメント/リアクションのソーシャル機能
• チャット（アルバム単位のスレッド）
• プッシュ通知（コメント/招待/リマインド）
• 端末間バックアップ・復元

⸻

技術スタック（初期案）
• 言語: TypeScript
• フレームワーク: React Native + Expo（Managed Workflow）
• ルーティング: Expo Router
• 状態管理: Zustand or React Query（後でリモート同期を見据えて）
• データ永続化（MVP）:
• SQLite（expo-sqlite）で構造化データ
• 画像ファイルは expo-file-system に保存（メタはDB）
• 代替: react-native-mmkv（軽量Key-Value）
• メディア: expo-camera, expo-image-picker, expo-media-library
• カレンダーUI: react-native-calendars 等
• フォーム: react-hook-form
• バリデーション: Zod
• スタイル: Tailwind系（nativewind） or StyleSheet
• Web対応: react-native-web（撮影はファイルアップロードにフォールバック）
• テスト: Jest + React Native Testing Library
• 品質: ESLint + Prettier + TypeScript strict
• CI: GitHub Actions（Lint/Typecheck/Test/ビルド）

将来的なクラウド：Supabase（Auth/DB/Storage/Realtime）第一候補。別案として Rails API + Postgres + Active Storage(S3)。

⸻

画面 / ユースケース
• アルバム一覧：カード表示、作成ボタン。
• アルバム詳細：グリッドで写真一覧、フィルタ（ラベル、期間）、一括選択。
• 撮影/追加：カメラ起動 or ギャラリー取り込み → 編集（トリミング/回転）→ メタ入力。
• 写真詳細：写真プレビュー、ラベル（複数）とメモ、位置情報、撮影日、編集/削除。
• カレンダー：日付にバッジ、タップでその日の写真へ。予定詳細から「撮影開始」。
• 設定：保存先、権限、バックアップ/エクスポート（将来）。

⸻

データモデル（MVP・ローカル）

Album(id, name, createdAt, updatedAt)
Photo(id, albumId, uri, createdAt, takenAt, locationLat, locationLng)
Label(id, name, type) // type: title | tag
PhotoLabel(photoId, labelId)
Note(id, photoId, body, createdAt, updatedAt)
Event(id, title, startAt, endAt, location, memo) // 予定

    •	画像の実体は fileSystemUri を保持。メタは SQLite に保存。
    •	Web ではブラウザの制約により、撮影は <input type="file"> ベースにフォールバック。

⸻

フォルダ構成（例）

app/
(tabs)/
albums.tsx
calendar.tsx
settings.tsx
album/[id].tsx
photo/[id].tsx
add.tsx
components/
lib/
db/
schema.ts
sqlite.ts
media/
calendar/
store/
useAlbums.ts
usePhotos.ts
useEvents.ts
assets/
scripts/

⸻

開発のはじめ方

前提
• Node.js LTS、pnpm/yarn/npm
• Xcode（iOS）、Android Studio（Android）

初期化（例）

# Expoプロジェクト作成（TypeScript）

npx create-expo-app@latest photo-diary --template
cd photo-diary

# 主要パッケージ（例）

pnpm add expo-router react-native-calendars zustand zod react-hook-form
pnpm add expo-sqlite expo-file-system expo-camera expo-image-picker expo-media-library
pnpm add -D typescript eslint prettier @types/react @types/react-native jest @testing-library/react-native

# ルーター有効化

npx expo install expo-router

実行

# 依存インストール（初回）

corepack enable
corepack prepare pnpm@latest --activate
pnpm install --frozen-lockfile

# 開発サーバ起動

pnpm start

# Expo DevTools が開きます — iOS: i, Android: a, Web: w

# 実機: Expo Go で QR をスキャン

# DB とメディアの簡易動作確認（dev screen）

- `lib/db/example_usage.ts` の `exampleFlow()` を呼ぶ dev スクリーンを使うと簡単に確認できます（リポジトリに `app/(tabs)/dev.tsx` があればボタンで実行可能）。
- もしくは Metro/Expo のコンソールで `exampleFlow` や `bootstrap` のログ（テーブル作成確認）を確認してください。

# よくあるトラブルと対処

- `pnpm: command not found` の場合：
  - corepack を有効化して pnpm を使えるようにする：
    ```
    corepack enable
    corepack prepare pnpm@latest --activate
    pnpm -v
    ```
  - それでも動かない場合は `npm i -g pnpm` を試す（ローカル環境の方針に合わせてください）。
- `ERR_PNPM_NO_PKG_MANIFEST` の場合：
  - `package.json` がプロジェクトルートに存在することを確認してください（このリポジトリでは `package.json` を追加済み）。
- expo-sqlite でテーブルが見つからない／スキーマが古い場合：
  - シミュレータ上でアプリデータを消去して再インストールするか、`initDatabase()` を呼ぶ dev スクリーンを使ってマイグレーションを再実行してください。

# 補足（便利コマンド）

- 型チェック: `pnpm type-check`
- Lint: `pnpm lint`
- テスト: `pnpm test`（テストが追加されている場合）

⸻

権限とプラットフォーム差異
• カメラ/フォトライブラリ/位置情報の権限リクエスト（iOS: Info.plist、Android: AndroidManifest）。
• Web ではカメラアクセスの挙動が異なるため、撮影→アップロードの UX を別途用意。

⸻

オフライン設計（MVP）
• すべてローカル保存。操作は即時反映。
• 後日のクラウド同期に備え、一意ID（UUID v4） と 変更履歴（updatedAt） を保持。

⸻

将来の同期設計（案）
• Supabase: Auth（ユーザー）、Postgres（RLS）、Storage（画像）、Realtime（コメント）
• 同期戦略：
• 初回ログイン時にローカル→クラウドへアップロード（重複は URI ハッシュで検出）
• 2方向マージポリシー：updatedAt 優先 or サーバ優先
• 画像は Storage、メタは Postgres（外部キー）

⸻

ロードマップ
• M0: リポジトリ初期化、CI、Lint/Prettier、TypeScript設定
• M1: アルバム/写真 CRUD、撮影/取り込み、保存
• M2: ラベル/メモ付与、検索/フィルタ
• M3: カレンダー/予定、予定→撮影導線
• M4: Web最適化、アクセシビリティ
• M5: E2Eテスト（Detox or Maestro）
• M6: バックエンド連携（Supabase or Rails API）
• M7: 共有/コメント/チャット/通知

⸻

テスト戦略
• 単体: 型 + ユーティリティ、ストア、フック
• コンポーネント: React Native Testing Library
• E2E: Detox（iOS/Android） or Maestro（iOS/Android/Web）

⸻

コーディング規約
• ESLint + Prettier + TypeScript strict
• コミットメッセージ：Conventional Commits
• バージョニング：SemVer
• 変更履歴：CHANGELOG.md

⸻

セキュリティ/プライバシー（学習段階の指針）
• 個人情報（位置情報・顔写真）を扱うため、端末内保存でも PIN/生体ロック（OS）活用を明示。
• 共有機能を導入する際は、権限設計 と 消去権（削除要求） を検討。

⸻

ライセンス
• 学習用のため MIT を想定（必要に応じて変更）。

⸻

貢献（将来）
• Issue/PR テンプレート、RFC プロセス（大きな仕様は docs/rfcs/ に提案）。

⸻

次の一歩（実務メモ）1. 空リポジトリにこの README を追加。2. create-expo-app で雛形作成、CI/TypeScript/ESLint整備。3. SQLite + FileSystem の最小保存フロー（撮影→保存→一覧表示）を完成。4. カレンダーと予定テーブルを連携。5. Web のフォールバック UX を用意。6. M3 まで達したらバックエンド方式（Supabase vs Rails API）を再評価。

---

Julesへ、
下記ドキュメントを読んでください

docs/ONBOARDING_JULES.md
