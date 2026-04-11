# stash

個人の記録を静的サイトとして公開するためのプロジェクト。Astro で構築し、Markdown で投稿を管理する。

## コンテンツタイプ

| タイプ | 用途 |
|---|---|
| photo | 写真と説明 |
| reading | 読書メモ（書名・著者付き） |
| note | 自由なメモ・記事 |

投稿は `content/` 配下にタイプ別ディレクトリで管理する。front matter に `draft: true` を設定した投稿はビルドに含まれない。

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動
npm run build    # 静的サイト生成（dist/）
npm run check    # 型チェック
npm test         # テスト実行
```
