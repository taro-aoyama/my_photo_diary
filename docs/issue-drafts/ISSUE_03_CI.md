# [ci] GitHub Actions: Lint / Typecheck / Tests

## 概要
Pull Request と main ブランチへの push に対して自動的に静的解析（ESLint）、型チェック（TypeScript）、ユニットテスト（Jest）、および簡易ビルド検証（必要に応じて）を実行する CI ワークフローを追加します。これによりコード品質を維持し、PR マージ前に致命的な問題を検出できるようにします。

## 受け入れ条件 (Acceptance Criteria)
- [ ] `.github/workflows/ci.yml`（または同等のファイル）がリポジトリに追加されている。
- [ ] PR 作成時に該当ワークフローがトリガーされ、`lint` / `type-check` / `test` が実行される。
- [ ] `pnpm` を使用する想定で、依存キャッシュ（pnpm store/cache）を利用する設定が含まれている。
- [ ] いずれかが失敗した場合、チェックとして PR に表示されマージがブロックされる。
- [ ] ワークフロー実行ログからコマンドの実行結果が確認できる（成功/失敗の明示）。

## 実装ノート / 推奨方針
- ワークフローは以下のジョブを含める：
  - `lint`: ESLint を走らせる（`pnpm lint`）
  - `type-check`: TypeScript の型チェック（`pnpm type-check` -> `tsc --noEmit`）
  - `test`: ユニットテスト（`pnpm test` -> `jest`）
  - （オプション）`build`: Web / Native のビルド検証を行う（必要に応じて追加）
- 並列実行 (matrix) を使い、Node.js のバージョン複数検証や OS ごとの検証を行うことも可能だが、最初は単一 Node バージョンで十分。
- `pnpm` を前提にキャッシュ設定を行う（`~/.pnpm-store` / `node_modules` キャッシュ）。
- シークレット不要（この段階では）。後で Supabase 等を使う際に Secrets を追加。
- レポートやアーティファクト（テストカバレッジ、jest html レポート）は将来的に追加可能。
- CI は早期に導入し、PR マージ条件に組み込む（Protect branch の設定で required checks を指定）。

## 推奨ワークフロー（例）
以下はサンプルの GitHub Actions ワークフローです。プロジェクトルートに `.github/workflows/ci.yml` として追加してください。

```/dev/null/example_ci.yml#L1-200
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  setup:
    name: Setup and Install
    runs-on: ubuntu-latest
    outputs:
      cache-hit: ${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js 18.x
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: Setup pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
      - name: Cache pnpm store
        id: cache
        uses: actions/cache@v4
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

  lint:
    name: Lint
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js 18.x
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: Setup pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Run ESLint
        run: pnpm lint

  type-check:
    name: Type Check
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js 18.x
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: Setup pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Run TypeScript type-check
        run: pnpm type-check

  tests:
    name: Tests
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js 18.x
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - name: Setup pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Run tests
        run: pnpm test -- --ci --reporters=default
```

（上記はテンプレなので、実際のスクリプト名やオプション（--ci など）はプロジェクトの jest 設定に合わせて調整してください）

## 追加オプション（検討）
- Lint の自動修正を PR にコミットするワークフロー（ただし自動コミットはチームポリシーに依存）。
- プルリクのサイズ・変更内容に応じた分割実行（例: フロントエンドのみであれば軽量ジョブ）。
- モノレポ/ワークスペース対応：ワークフローを monorepo に対応させる場合、対象パッケージごとのジョブ分割を検討。
- E2E（Detox / Maestro）ジョブは別ワークフローで管理し、専用ランナーやデバイスが必要になるため別途計画する。

## 実装手順（推奨）
1. プロジェクトルートに `.github/workflows/ci.yml` を追加して PR を作成する。
2. PR を作成し、ワークフローがトリガーされることを確認する（Intentional failing state を使ってワークフローが動くかテスト）。
3. `required checks` を GitHub ブランチ保護設定で有効にする（例: `lint`, `type-check`, `test` を必須に設定）。
4. 実行ログを確認し、必要に応じてジョブやスクリプトを調整する。

## 見積もり
- small（0.5〜2 日）：既存のテンプレートに沿って設定する場合は短時間で導入可能。テストの安定化やキャッシュ最適化に追加時間を見積もる。

## 依存
- ISSUE_01_PROJECT_BOOTSTRAP（プロジェクトの土台ができていること）
- ISSUE_02_TOOLING（`lint` / `type-check` / `test` スクリプトが package.json に追加されていること）

---
