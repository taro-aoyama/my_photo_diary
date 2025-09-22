# GH Issues: M0（プロジェクト初期化）— GitHub に貼る用まとめ

このファイルは、M0（初期化フェーズ）で作成するべき GitHub Issue をそのままコピー＆ペーストできる形式でまとめたものです。各 Issue は「タイトル」と「本文（概要／受け入れ条件／実装ノート／ラベル等）」のセットになっており、そのまま GitHub の New Issue に貼り付けて登録できます。

先に作成しておくと便利なもの（推奨）
- Milestone: `M0`
- Labels: `infra`, `enhancement`, `quality`, `ci`, `docs`, `priority:high`

使い方
1. 下の各 Issue ブロックを選択してコピーします（タイトル＋本文を両方）。
2. GitHub リポジトリの Issues → New issue に貼り付けます。
3. ラベルと Milestone を選択して Issue を作成してください。

---
## Issue 1
Title:
```
[infra] Project bootstrap (Expo + TypeScript)
```

Body:
```
## 概要
create-expo-app を使って TypeScript テンプレートの Expo Managed Workflow プロジェクトを作成し、リポジトリに初期スケルトンを追加します。`app/` 下に tabs（albums, calendar, settings）とページプレースホルダ（album/[id], photo/[id], add）を用意してください。

## 受け入れ条件
- [ ] リポジトリルートに Expo プロジェクト（TypeScript テンプレート）が作成されている
- [ ] `app/` にプレースホルダ画面が存在する（`(tabs)/albums.tsx`, `(tabs)/calendar.tsx`, `(tabs)/settings.tsx`, `album/[id].tsx`, `photo/[id].tsx`, `add.tsx` 等）
- [ ] `pnpm start`（または `npm start` / `yarn start`）で開発サーバーが起動し、画面遷移（プレースホルダの表示）が確認できる
- [ ] `README.md` にセットアップと起動手順の簡易版が追記されている
- [ ] `.gitignore`（node_modules, .expo, .expo-shared 等）が設定されている

## 実装ノート
- Expo Router を使ったファイルベースルーティングを想定
- 最小限のプレースホルダで OK。UI の詳細は後続 Issue で実装
- PR ブランチ例: `chore/bootstrap`

## 推奨ラベル / マイルストーン
- Labels: `infra`, `enhancement`, `priority:high`
- Milestone: `M0`

## 見積もり
- small (0.5〜2日)
```

---
## Issue 2
Title:
```
[infra] Tooling: TypeScript / ESLint / Prettier / EditorConfig
```

Body:
```
## 概要
TypeScript を `strict` モードで有効にし、ESLint / Prettier / EditorConfig を導入して最小限の開発ツールチェインを整備します。CI とローカルの両方で型チェックと lint が走るように設定してください。

## 受け入れ条件
- [ ] `tsconfig.json` に `"strict": true` が設定されている
- [ ] `.eslintrc`（または `.eslintrc.js`）と `.prettierrc` が追加されている
- [ ] `.editorconfig` が追加されている
- [ ] `package.json` に以下のスクリプトが追加されている
  - `type-check`（例: `tsc --noEmit`）
  - `lint`（例: `eslint "app/**/*.{ts,tsx}"`）
  - `format`（例: `prettier --write`）
- [ ] ローカルで `pnpm type-check` と `pnpm lint` を実行して致命的なエラーが無い（既知の除外は README に記載）

## 実装ノート / 推奨パッケージ
- 推奨パッケージ（devDependencies）: `typescript`, `eslint`, `prettier`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`
- 初期はルールを厳しすぎない（段階的に強化）
- Husky や commitlint の導入は別 Issue で行ってもよい

## 推奨ラベル / マイルストーン
- Labels: `infra`, `quality`
- Milestone: `M0`

## 見積もり
- small (0.5〜2日)
```

---
## Issue 3
Title:
```
[ci] GitHub Actions: Lint / Typecheck / Tests
```

Body:
```
## 概要
Pull Request と main ブランチへの push に対して、ESLint / TypeScript 型チェック / 単体テスト（Jest）を実行する GitHub Actions ワークフローを追加します。CI によりマージ前に品質検査が行われます。

## 受け入れ条件
- [ ] `.github/workflows/ci.yml` が追加されている
- [ ] ワークフローは `pull_request` と `push` (main) で実行される
- [ ] `lint`, `type-check`, `test` が実行され、いずれか失敗時はワークフローが失敗する
- [ ] ワークフロー実行ログが GitHub Actions 上で確認できる

## 実装ノート
- Node.js LTS（例: 18.x）を指定
- `pnpm` を前提にインストールとキャッシュ設定を行う
- E2E やビルド検証は別ワークフローで追加する

## 推奨ラベル / マイルストーン
- Labels: `ci`, `infra`
- Milestone: `M0`

## 見積もり
- small (0.5〜2日)
```

---
## Issue 4
Title:
```
[docs] Commit & PR templates / Contributing
```

Body:
```
## 概要
Contributing ガイド、PR テンプレート、Issue テンプレートを追加し、Conventional Commits を推奨する開発フローを整備します。オプションで Husky + commitlint によるコミットメッセージ検証を導入します。

## 受け入れ条件
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` が追加されている
- [ ] `.github/ISSUE_TEMPLATE/` にバグと機能要望テンプレが存在する
- [ ] `CONTRIBUTING.md` に開発フローとコミット規約が記載されている
- [ ] （任意）Husky + commitlint が導入され、コミットメッセージが検証される

## 実装ノート
- PR テンプレにチェックリスト（Lint / Typecheck / Tests）を含めるとレビュワーの負担が減る
- Husky の導入はチームポリシーに合わせて後から追加しても良い

## 推奨ラベル / マイルストーン
- Labels: `docs`, `infra`
- Milestone: `M0`

## 見積もり
- small (0.5〜2日)
```

---
## 追加メモ（Issue 作成時の推奨フロー）
- まずは M0 の 4 件を作成して、Milestone `M0` に紐付けることを推奨します。  
- ラベルを事前に作っておくと管理が楽です（上部に記載のラベルを追加してください）。  
- 各 Issue は 1〜3 日で終わる粒度を目安に。大きければさらに分割してください。  
- PR を作成する際は PR テンプレート（ISSUE_04 のチェックリスト）を使い、CI が通ることを必須にしましょう。  

---
質問や修正したい点があれば教えてください。M0 が作成できたら、私が次にやるべき Issue（M1 の優先タスク）を順次用意していきます。よろしくお願いします。  
