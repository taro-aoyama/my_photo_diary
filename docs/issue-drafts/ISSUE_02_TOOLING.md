# [infra] Tooling: TypeScript / ESLint / Prettier / EditorConfig

## 概要

開発を安定させ、品質を担保するための基盤ツール群を導入します。主な目的は以下です。

- TypeScript を strict モードで有効にして型安全性を高める
- ESLint による静的解析でコード品質を担保する
- Prettier による整形でスタイルのばらつきをなくす
- EditorConfig でエディタ間の差異を吸収する
- これらを CI（後続 Issue）で検証できるように設定する

この Issue は M0 の一部で、Project bootstrap（ISSUE_01）完了後に続けて実施することを想定しています。

---

## 目的

- ローカル開発と CI の両方で一貫した型チェック / Lint / 整形が走るようにする
- PR レビュー時の雑務（フォーマットの差分など）を削減する
- 初期段階から厳しめのルール（strict, recommended rules）で安全に開発を進める

---

## 受け入れ条件 (Acceptance Criteria)

- [ ] `tsconfig.json` がプロジェクトルートに存在し、`strict: true` が設定されている
- [ ] ESLint 設定ファイル（`.eslintrc.js` / `.eslintrc.json` 等）が存在し、TypeScript と React/React Native 向けの基本ルールを導入している
- [ ] Prettier 設定（`.prettierrc` または `prettier.config.js`）が存在し、エディタ用の設定（タブ幅、セミコロン等）が明記されている
- [ ] EditorConfig（`.editorconfig`）が存在する
- [ ] package.json に `scripts` が追加されている：
  - `type-check`（例: `tsc --noEmit`）
  - `lint`（例: `eslint "app/**/*.{ts,tsx}"`）
  - `format`（例: `prettier --write`）
- [ ] ローカルで `pnpm type-check` と `pnpm lint` が実行可能で、重大なエラーがないこと（既存の許容される警告がある場合は README に理由を明記）
- [ ] CI ワークフロー（別 Issue: ISSUE_03_CI で実施）でこれらのコマンドが動くことが確認できる（該当ワークフローは ISSUE_03 で実装）

---

## 実装ノート / 推奨パッケージ

- TypeScript
  - `typescript`
  - `@types/react`, `@types/react-native`（必要に応じて）
- ESLint
  - `eslint`
  - `@typescript-eslint/parser`
  - `@typescript-eslint/eslint-plugin`
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-config-prettier`（Prettier と衝突するルールを無効化）
  - `eslint-plugin-import`（オプション）
- Prettier
  - `prettier`
  - `eslint-config-prettier`（上記）
- Editor/IDE
  - `.editorconfig`
  - VSCode を想定する場合は `.vscode/extensions.json` と `settings.json` の推奨設定を README に記入しておくと親切
- フック（任意、別 Issue でも可）
  - Husky + commitlint（Conventional Commits 検証） は別 Issue（ISSUE_04_TEMPLATES / コミット規約）で扱うことを推奨

サンプル `tsconfig.json` の必須候補設定（実装時に参照）

- `"strict": true`
- `"noEmit": true`（type-check スクリプト用）
- `"jsx": "react-native"`（react-native / expo-web を意識）
- `"skipLibCheck": true`（初期は有効でも可）

サンプル ESLint の方針

- TypeScript + React + React Native のベース設定
- Prettier と共存させる（`extends: ['plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'prettier']` など）
- 可能であればルールセットは緩め→厳しめの順で段階的に強化する（初期は警告レベルを多めにして開発速度を担保）

---

## 手順（推奨）

1. `pnpm add -D typescript eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-config-prettier`
2. ルートに `tsconfig.json` を追加（`strict: true` を有効にする）
3. ルートに `.eslintrc.js`（または json）を追加し基本構成を記述
4. `.prettierrc` と `.editorconfig` を追加
5. package.json に `type-check`, `lint`, `format` スクリプトを追加
6. ローカルで `pnpm type-check` と `pnpm lint` を実行して問題を洗い出し、許容できないエラーは修正する
7. README にセットアップ手順を追記
8. PR を作成し、レビューチェック（下記）を通す

---

## レビューチェックリスト（PR）

- [ ] `tsconfig.json` に `strict: true` が設定されている
- [ ] `lint` / `type-check` を実行して致命的なエラーがない
- [ ] Prettier 設定が ESLint と競合していない（`eslint-config-prettier` が含まれている）
- [ ] `.editorconfig` が含まれている
- [ ] README にローカルセットアップ手順が追記されている

---

## 見積もり

- small（0.5〜2 日）。既存のテンプレートを流用すれば短時間で設定可能。

---

## 依存

- ISSUE_01_PROJECT_BOOTSTRAP（Project bootstrap が完了していることを前提）
- ISSUE_03_CI（CI に組み込む場合は CI Issue と連携）

---

## ラベル / マイルストーン

- Labels: `infra`, `quality`, `priority:high`
- Milestone: `M0`

---

## 備考

- 初期段階はルールをあまりにも厳しくしない（開発のフローを阻害しない）ことも重要です。重大な問題（セキュリティ、型エラー等）は即座に修正し、スタイル周りは段階的に厳格化する方針を採ると良いです。
- `Husky`（コミットフック）や `lint-staged`（変更ファイルのみ整形）は別 Issue（ISSUE_04_TEMPLATES の一部）で導入することを推奨します。もし必要であれば、この Issue に追記してください。
