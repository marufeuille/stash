# stash

> 書き上げるプレッシャーを外して、断片を置いておくための場所。

個人の記録を静的サイトとして公開するための Astro プロジェクト。本文 Markdown は別リポジトリ（Obsidian vault）に置き、ビルド時にクローンして生成する。

## コンテンツタイプ

| タイプ | 用途 | 必須 frontmatter |
|---|---|---|
| note | 自由なメモ・断片 | `type` `date` |
| reading | 読書メモ | `type` `date` `book` `author` |
| photo | 写真 | `type` `date` `image` `alt` |
| link | 外部URLを一言とともに残す | `type` `date` `url` |

すべて `title` `tags` `draft` が扱える。`draft: true` の投稿はビルド対象外。
link は任意で `quote`（引用）が持てる。

## 投稿フロー

```
モバイル/デスクトップ Obsidian
  │ Obsidian Git plugin が auto-commit+push
  ▼
GitHub: stash-vault (private)
  │ Actions → Cloudflare Deploy Hook
  ▼
Cloudflare Workers
  │ npm run build:ci （scripts/sync-content.mjs が vault を clone → content/ へ）
  ▼
https://stash.marufeuille.workers.dev
```

- オーナー端末で `/?own=1` を一度開くと localStorage にフラグが立ち、ホームにキャプチャバーが出る
- `/compose/{note,reading,photo,link}` で type別に Obsidian 新規ノートを起動。Android では各ページをホーム画面追加すると type色違いのアイコンになる
- `/compose/link` は URL を `?url=...` クエリで受け取るか、無ければ起動時に `prompt()` で訊く
- キャプチャバーは `⌘N` / `Ctrl+N` のショートカットに対応

## アーキテクチャ

- **Astro static build**: 全ページSSG、クライアントJSは検索・キャプチャ起動のみ
- **ストリーム型UI**: カード枠を撤廃しハイライン区切り、等幅タイプラベル
- **検索**: ビルド時に JSON インデックスを作成、クライアント側で即時フィルタ
- **コンテンツ分離**: `content/` は gitignore、ビルド時に vault repo から clone

## 開発

### 通常のローカル開発

```bash
npm install
export STASH_VAULT_PATH=~/path/to/stash-vault
npm run sync-content   # vault を content/ に展開
npm run dev            # 開発サーバー
npm run build          # 静的サイト生成（dist/）
npm run check          # 型チェック
npm test               # テスト
```

### CI / 本番ビルド

`npm run build:ci` が以下を実行：

1. `scripts/sync-content.mjs` が `STASH_VAULT_REPO`（例: `user/stash-vault`）を shallow clone
2. `note/` `reading/` `photo/` `link/` を `content/` にコピー
3. `astro build`

必要な環境変数:

| 変数 | 用途 |
|---|---|
| `STASH_VAULT_REPO` | `owner/repo` 形式 |
| `STASH_VAULT_TOKEN` | private repo 用 fine-grained PAT（contents:read） |
| `STASH_VAULT_BRANCH` | デフォルト `main` |
| `STASH_VAULT_PATH` | ローカル vault パス（設定されていれば clone の代わりに使う） |

## デプロイ

Cloudflare Workers（静的アセット配信）。`wrangler.jsonc` の `assets.directory` が `./dist` を指す。

```
Build command:   npm run build:ci
Deploy command:  npx wrangler deploy
```

stash-vault 側の `.github/workflows/trigger-build.yml` が push 時に Cloudflare Deploy Hook を叩く（テンプレは `docs/stash-vault-setup/` 配下）。

## ディレクトリ

```
src/
  layouts/BaseLayout.astro       ヘッダ・ナビ・全体スタイル
  components/StreamItem.astro    一覧の1項目
  pages/
    index.astro                  all 一覧
    {note,reading,photo,link}/   type別 一覧
    [type]/[...slug].astro       詳細
    search.astro                 クライアントサイド検索
    compose.astro                /compose → /compose/note リダイレクト
    compose/[type].astro         obsidian://new 発火
  lib/excerpt.ts                 Markdown 抜粋生成
content/                         vault から注入（gitignore）
design/stash.pen                 Pencil デザインファイル
public/
  icons/{note,reading,photo,link}.png Android ホーム画面アイコン
  manifest-*.json                type別 PWA manifest
scripts/sync-content.mjs         vault 同期スクリプト
docs/stash-vault-setup/          vault 側テンプレ
wrangler.jsonc                   Cloudflare Workers 設定
```
