# Front Matter 仕様

投稿は **photo**・**reading**・**note**・**link** の4タイプ、加えて集約用の **topic** タイプで構成される。
すべての投稿は Markdown ファイルの YAML front matter でメタデータを持つ。

---

## 共通フィールド

| フィールド | 型        | 必須 | 説明                                           |
| ---------- | --------- | ---- | ---------------------------------------------- |
| `type`     | `string`  | ✅   | 投稿タイプ。`"photo"` / `"reading"` / `"note"` / `"link"` |
| `date`     | `date`    | ✅   | 投稿日（YYYY-MM-DD）                           |
| `tags`     | `string[]`| ✅   | タグの配列（空配列も可）                       |
| `draft`    | `boolean` | ✅   | `true` の場合は下書き扱い                      |
| `title`    | `string`  | ❌   | タイトル（任意）                               |
| `topic`    | `string`  | ❌   | 紐づく `topic` の `slug`                       |
| `stage`    | `string`  | ❌   | トピック内のステージ。階層は `親/子` のスラッシュ区切り |
| `summary`  | `boolean` | ❌   | `true` で当該ステージの「いまの結論」として扱う |

---

## photo タイプ

写真とその説明を投稿するタイプ。

### 固有フィールド

| フィールド | 型       | 必須 | 説明                                             |
| ---------- | -------- | ---- | ------------------------------------------------ |
| `image`    | `string` | ✅   | 画像パス（`/attachments/` から始まるルート相対パス） |
| `alt`      | `string` | ✅   | 画像の代替テキスト                               |

### YAML 例

```yaml
---
type: photo
title: 朝焼けの空
date: 2025-06-15
image: /attachments/morning-sky.png
alt: オレンジとピンクに染まった朝焼けの空
tags:
  - 空
  - 朝
draft: false
---
```

---

## reading タイプ

読書中に気になった一節や感想を投稿するタイプ。

同じ本について複数の投稿（断片）を残すことを想定している。
**`book` フィールドの値を揃える**ことで、同一書籍に紐づく断片としてグルーピングできる。

### 固有フィールド

| フィールド | 型       | 必須 | 説明                                               |
| ---------- | -------- | ---- | -------------------------------------------------- |
| `book`     | `string` | ✅   | 書籍タイトル。同じ本の断片は同一の値を指定する     |
| `author`   | `string` | ✅   | 著者名                                             |
| `progress` | `string` | ❌   | 読書の進捗（例: `"p.42"`, `"第3章"`, `"30%"`）     |

### 同一書籍の複数断片

`book` と `author` を同じ値にすることで、複数の投稿を1冊の本にグルーピングする。
各投稿は独立した Markdown ファイルとして `content/reading/` に配置する。

```
content/reading/
  sapiens-1.md   # book: "サピエンス全史" / progress: "第1章"
  sapiens-2.md   # book: "サピエンス全史" / progress: "第3章"
```

### YAML 例

```yaml
---
type: reading
title: 認知革命の衝撃
date: 2025-07-10
book: サピエンス全史
author: ユヴァル・ノア・ハラリ
progress: 第1章
tags:
  - 歴史
  - 人類学
draft: false
---
```

---

## note タイプ

短いメモや雑感を投稿するタイプ。共通フィールド以外の固有フィールドはない。

### YAML 例

```yaml
---
type: note
date: 2025-08-01
tags:
  - 雑記
draft: false
---
```

---

## link タイプ

外部 URL を一言コメントとともに残すタイプ。本文（Markdown）は任意で、なぜ保存したかや感想を書ける。

### 固有フィールド

| フィールド | 型       | 必須 | 説明                                                         |
| ---------- | -------- | ---- | ------------------------------------------------------------ |
| `url`      | `string` | ✅   | 外部 URL（`http(s)://` で始まる）                            |
| `quote`    | `string` | ❌   | URL から引用したい一節                                       |

サイト名は `url` のホスト名から自動で抽出して表示する（`example.com` 等）。

### YAML 例

```yaml
---
type: link
title: Astro 5.0 released
date: 2026-04-16
url: https://astro.build/blog/astro-5/
quote: The new content layer transforms how Astro handles content.
tags:
  - astro
  - frontend
draft: false
---

なぜ気になったか、関連する自分の考えを書く。本文は任意。
```

---

## topic タイプ

時系列のテーマ（例: メダカ育成）を集約するためのタイプ。1トピック = 1ノート。
本文には概要や運用ルールを書ける。詳細ページ `/topic/<slug>/` で同 `topic` を持つ投稿が
ステージ順にグルーピングされる。

### 固有フィールド

| フィールド    | 型         | 必須 | 説明                                                 |
| ------------- | ---------- | ---- | ---------------------------------------------------- |
| `slug`        | `string`   | ✅   | 投稿の `topic` フィールドから参照される識別子        |
| `title`       | `string`   | ✅   | トピック名                                           |
| `description` | `string`   | ❌   | 一覧と詳細冒頭で表示される短い説明                   |
| `stages`      | `string[]` | ✅   | ステージの表示順。階層は `親/子` のスラッシュ区切り  |
| `draft`       | `boolean`  | ✅   | `true` で詳細ページを生成しない                       |

### YAML 例

```yaml
---
type: topic
slug: medaka
title: メダカ育成
description: ベランダで始めたメダカ育成の観察と結論ログ
stages:
  - 卵
  - 針子/水
  - 針子/餌
  - 針子/ケース
  - 成魚
draft: false
---
```

### ステージ付与の運用

各投稿側で `topic`/`stage` を指定するとトピック詳細に集約される。`stage` が `topic.stages`
に含まれない、または未指定の投稿は「未分類」セクションに集約される。

`summary: true` を付けたノートは当該ステージの「いまの結論」として最上部に表示され、
複数あれば最新が現役・残りは「過去の結論」として畳まれる。

未分類ノートに対しては `node scripts/suggest-stage.mjs --topic <slug>` を実行すると、
ローカルの `claude` CLI に問い合わせて stage 候補を提案する（書き換えはしない）。
