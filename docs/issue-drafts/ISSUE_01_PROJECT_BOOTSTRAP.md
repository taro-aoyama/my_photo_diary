# [infra] Project bootstrap (Expo + TypeScript)

## 概要
新規プロジェクトの土台を作成します。`create-expo-app` を用いて TypeScript テンプレートで Expo Managed Workflow のプロジェクトを作成し、リポジトリに初期コミットします。アプリのルーティングと画面構成のプレースホルダを用意して、以降の開発（M0〜M1）のベースとします。

## 目的
- 開発環境をチームで共通化する
- 最小限のナビゲーション構造を作り、各画面の実装を並行して進められるようにする
- CI / Lint / TypeScript 等の導入に先立つベースを整える

## 受け入れ条件 (Acceptance Criteria)
- [ ] `my_photo_diary` リポジトリ直下に Expo Managed Workflow のプロジェクトが存在する（TypeScript テンプレート）。
- [ ] `app/` ディレクトリにルーティング構造（tabs、`albums.tsx`、`calendar.tsx`、`settings.tsx`、および `album/[id].tsx`、`photo/[id].tsx`、`add.tsx` のプレースホルダ）がある。
- [ ] `pnpm start`（または `npm start` / `yarn start`）で開発サーバーが起動し、最低限の画面遷移が可能であること（プレースホルダ画面の表示確認）。
- [ ] リポジトリに `README.md`（プロジェクト概要とローカル起動手順の簡易版）が存在する。
- [ ] `.gitignore`（node_modules, .expo, .expo-shared 等）が設定されている。

## 実装ノート / 手順
1. ローカルで以下コマンドを実行してプロジェクトを作成（例）
   - `npx create-expo-app my_photo_diary --template`
   - TypeScript テンプレートを選択
2. ルートに移動し、パッケージマネージャをプロジェクト方針に合わせる（pnpm が推奨なら `pnpm` に統一）。
3. `app/` 配下に以下のファイルを作成（それぞれは最小のプレースホルダコンポーネントで可）
   - `app/(tabs)/albums.tsx`
   - `app/(tabs)/calendar.tsx`
   - `app/(tabs)/settings.tsx`
   - `app/album/[id].tsx`
   - `app/photo/[id].tsx`
   - `app/add.tsx`
   - 必要に応じて `app/_layout.tsx` や `app/(tabs)/_layout.tsx` を作成してタブ構成を定義
4. `README.md` に「セットアップ」「起動方法（pnpm start）」を追記
5. 初回コミットを作成（ブランチ例: `chore/bootstrap`）し、PR を作成して main にマージ
6. （任意）ローカルで iOS/Android/ web の起動を確認してスクリーンショットを PR に添付

## 見積もり
- small（0.5〜2 日）

## 依存
- なし（この Issue は M0 の最初のタスク）

## 推奨ラベル / マイルストーン
- Labels: `infra`, `enhancement`, `priority:high`
- Milestone: `M0`

## レビューチェックリスト（PR に追加）
- [ ] プロジェクトが起動する（`pnpm start` 実行時にエラーが出ない）
- [ ] `app/` のルーティングから各プレースホルダ画面へ遷移確認
- [ ] `README.md` の起動手順が正しい
- [ ] `.gitignore` が含まれている

## 備考
- この Issue は環境整備が目的なので、依存パッケージの追加（例: eslint, prettier 等）は別 Issue（Tooling）で行います。まずは最小限でプロジェクトを立ち上げることを優先してください。
- 将来的に monorepo やワークスペース化を検討する場合は最初の構成で影響が出るため、早めに方針を確定してください。
