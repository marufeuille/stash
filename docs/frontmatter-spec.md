# Front Matter 仕様

投稿は **photo**・**reading**・**note** の3タイプで構成される。
すべての投稿は Markdown ファイルの YAML front matter でメタデータを持つ。

---

## 共通フィールド

| フィールド | 型        | 必須 | 説明                                           |
| ---------- | --------- | ---- | ---------------------------------------------- |
| `type`     | `string`  | ✅   | 投稿タイプ。`"photo"` / `"reading"` / `"note"` |
| `date`     | `date`    | ✅   | 投稿日（YYYY-MM-DD）                           |
| `tags`     | `string[]`| ✅   | タグの配列（空配列も可）                       |
| `draft`    | `boolean` | ✅   | `true` の場合は下書き扱い                      |
| `title`    | `string`  | ❌   | タイトル（任意）                               |

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
