# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

個人の記録（メモ・読書メモ・写真・リンク）を静的サイトとして公開する Astro プロジェクト。本文 Markdown は別リポジトリ（Obsidian vault）に置き、ビルド時に `content/` へ同期して生成する。Cloudflare Workers で配信。

## コマンド

ローカル開発・テスト・ビルドはすべて `fixtures/dev-vault/` のテストデータに対して動く。
`npm run dev`/`build`/`test`/`check` の前に自動で `sync:fixtures` が走る (`predev` 等の npm hook)。

```bash
npm run dev              # 開発サーバー起動（自動で fixtures 同期）
npm run build            # 静的サイト生成 (dist/) — fixtures 同期込み
npm run check            # astro check (型チェック) — fixtures 同期込み
npm test                 # vitest run — fixtures 同期込み
npx vitest run tests/graph.test.js  # 単一テスト実行（事前に sync:fixtures 必要）

npm run sync:fixtures    # fixtures/dev-vault → content/ に明示同期

# 本番 vault（外部 Obsidian repo）からの同期
export STASH_VAULT_PATH=~/path/to/stash-vault     # ローカル vault
# または
export STASH_VAULT_REPO=owner/repo                # GitHub repo
npm run sync-content     # vault → content/ に展開

# CI ビルド（vault sync → generate-summary → astro build）
npm run build:ci
```

CI では `STASH_VAULT_REPO`/`STASH_VAULT_TOKEN` を env で渡し `build:ci` が直接 `astro build` を呼ぶため、`prebuild` は発火しない（CI は本番 vault を使う）。

## アーキテクチャ

- **Astro 6 SSG**: 全ページ静的生成。クライアント JS は検索とキャプチャ起動のみ
- **コンテンツ分離**: `content/` は gitignore。ビルド時に vault repo から clone するか、ローカル vault パスからコピー (`scripts/sync-content.mjs`)
- **dev/test 用 fixtures**: `fixtures/dev-vault/` に repo-tracked のテストデータ。`STASH_VAULT_PATH=fixtures/dev-vault` で sync すれば本番 vault なしで dev/test/build が完結
- **5つのコンテンツタイプ**: note / reading / photo / link / topic — 各コレクションは `src/content.config.ts` で Zod スキーマ定義
- **follows による DAG**: 各投稿の frontmatter `follows` フィールドで時系列 DAG を構成。`src/lib/graph.ts` の `buildGraph` → `layoutGraph` でレイアウト計算
- **topic による集約**: `topic` content type と note 等の `topic`/`stage`/`summary` フィールドで時系列＋ステージ階層を集約。`src/lib/topics.ts` の `groupByStage` / `splitSummary` で整形し `/topic/[slug]/` に出力
- **検索**: `src/lib/buildSearchIndex.ts` でビルド時に JSON インデックス生成 → `search.astro` でクライアントサイド MiniSearch フィルタ
- **デプロイ**: Cloudflare Workers 静的アセット配信 (`wrangler.jsonc`)。vault 側の GitHub Actions が push 時に Deploy Hook を叩く

## コンテンツスキーマ

全タイプ共通: `type` (literal), `date`, `tags`, `follows`, `draft`, `title?`, `topic?`, `stage?`, `summary?`

| タイプ | 追加フィールド |
|---|---|
| note | — |
| reading | `book`, `author`, `progress?` |
| photo | `image` (Astro image), `alt` |
| link | `url`, `quote?` |
| topic | `slug`, `title`, `description?`, `stages: string[]`（集約専用、`type` 共通フィールドの follows/tags 等は持たない） |

## テスト

Vitest を使用。`fileParallelism: false` で直列実行。テストファイルは `tests/` ディレクトリに配置。
`pretest` フックで `fixtures/dev-vault` を `content/` に同期するため、`npm test` だけで完結する。`npx vitest` を直接呼ぶ場合は事前に `npm run sync:fixtures` を実行する。

新フィクスチャを追加する際は `fixtures/dev-vault/<type>/<slug>.md` に置き、テストで参照する固定ファイル名（例: `tools-and-thinking.md`, `sapiens-1.md`, `morning-sky.md`）は壊さないこと。トピック機能の各分岐（結論複数 / 未分類 / orphan stage / 未存在 topic 参照 / draft）は `fixtures/dev-vault/note/medaka-*.md` でカバー済み。

## デザインファイル

`design/stash.pen` は Pencil MCP ツール専用のデザインファイル。Read/Grep ではなく pencil MCP ツール (`batch_get`, `batch_design` 等) でアクセスすること。
