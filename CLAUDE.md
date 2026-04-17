# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

個人の記録（メモ・読書メモ・写真・リンク）を静的サイトとして公開する Astro プロジェクト。本文 Markdown は別リポジトリ（Obsidian vault）に置き、ビルド時に `content/` へ同期して生成する。Cloudflare Workers で配信。

## コマンド

```bash
npm run dev              # 開発サーバー起動
npm run build            # 静的サイト生成 (dist/)
npm run check            # astro check (型チェック)
npm test                 # vitest run (全テスト)
npx vitest run tests/graph.test.js  # 単一テスト実行

# コンテンツ同期（ローカル開発時は STASH_VAULT_PATH を設定）
export STASH_VAULT_PATH=~/path/to/stash-vault
npm run sync-content     # vault → content/ に展開

# CI ビルド（sync-content → generate-summary → astro build）
npm run build:ci
```

## アーキテクチャ

- **Astro 6 SSG**: 全ページ静的生成。クライアント JS は検索とキャプチャ起動のみ
- **コンテンツ分離**: `content/` は gitignore。ビルド時に vault repo から clone するか、ローカル vault パスからコピー (`scripts/sync-content.mjs`)
- **4つのコンテンツタイプ**: note / reading / photo / link — 各コレクションは `src/content.config.ts` で Zod スキーマ定義
- **follows による DAG**: 各投稿の frontmatter `follows` フィールドで時系列 DAG を構成。`src/lib/graph.ts` の `buildGraph` → `layoutGraph` でレイアウト計算
- **検索**: `src/lib/buildSearchIndex.ts` でビルド時に JSON インデックス生成 → `search.astro` でクライアントサイド MiniSearch フィルタ
- **デプロイ**: Cloudflare Workers 静的アセット配信 (`wrangler.jsonc`)。vault 側の GitHub Actions が push 時に Deploy Hook を叩く

## コンテンツスキーマ

全タイプ共通: `type` (literal), `date`, `tags`, `follows`, `draft`, `title` (optional)

| タイプ | 追加フィールド |
|---|---|
| note | — |
| reading | `book`, `author`, `progress?` |
| photo | `image` (Astro image), `alt` |
| link | `url`, `quote?` |

## テスト

Vitest を使用。`fileParallelism: false` で直列実行。テストファイルは `tests/` ディレクトリに配置。コンテンツの存在を前提とするテストがあるため、テスト前に `npm run sync-content` が必要な場合がある。

## デザインファイル

`design/stash.pen` は Pencil MCP ツール専用のデザインファイル。Read/Grep ではなく pencil MCP ツール (`batch_get`, `batch_design` 等) でアクセスすること。
