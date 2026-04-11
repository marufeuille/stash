# Front Matter 仕様

投稿は photo / reading / note の3タイプで構成される。各投稿は Markdown ファイルの YAML front matter でメタデータを定義する。

## 共通フィールド

すべてのタイプで使用できるフィールド。

| フィールド | 型 | 必須/任意 | 説明 |
|-----------|------|----------|------|
| `type` | `"photo" \| "reading" \| "note"` | 必須 | 投稿タイプ |
| `date` | `string` (ISO 8601 形式: `YYYY-MM-DD`) | 必須 | 投稿日 |
| `tags` | `string[]` | 任意 | タグの配列。省略時は空配列扱い |
| `draft` | `boolean` | 任意 | `true` の場合、下書き扱いで公開されない。省略時は `false` |
| `title` | `string` | 任意 | 投稿タイトル。省略可（本文だけでも成立するコンセプト） |

## photo タイプ

写真を主体とする投稿。

### 固有フィールド

| フィールド | 型 | 必須/任意 | 説明 |
|-----------|------|----------|------|
| `image` | `string` | 必須 | 画像ファイルのパス（`attachments/` からの相対パス） |
| `alt` | `string` | 必須 | 画像の代替テキスト（アクセシビリティ用） |

### YAML 例

```yaml
---
type: photo
date: "2025-06-15"
tags:
  - 風景
  - 旅行
image: 2025/sunset-at-beach.jpg
alt: 海岸に沈む夕日。空がオレンジと紫のグラデーションに染まっている
---
```

## reading タイプ

読書中・読了した本に関する断片的な感想や引用を記録する投稿。

同じ書籍について複数の投稿を作成できる。`book` フィールドの値が一致する投稿は同一書籍に紐づくものとして扱われる。これにより、読書の進行に合わせて感想を少しずつ書き溜め、あとから同じ本の断片をまとめて閲覧できる。

### 固有フィールド

| フィールド | 型 | 必須/任意 | 説明 |
|-----------|------|----------|------|
| `book` | `string` | 必須 | 書籍タイトル。同じ本の投稿では同一の文字列を使用すること |
| `author` | `string` | 必須 | 著者名 |
| `progress` | `string` | 任意 | 読書の進捗（例: `"p.42"`, `"30%"`, `"第3章"`）。省略可 |

### YAML 例

```yaml
---
type: reading
date: "2025-07-01"
tags:
  - 技術書
book: リファクタリング
author: Martin Fowler
progress: "第3章"
---
```

### 同一書籍の複数投稿

`book` と `author` を同じ値にすることで、同一書籍に関する投稿をグループ化できる。

```yaml
# 1件目: 序盤の感想
---
type: reading
date: "2025-07-01"
book: リファクタリング
author: Martin Fowler
progress: "第3章"
---

# 2件目: 中盤の感想
---
type: reading
date: "2025-07-10"
book: リファクタリング
author: Martin Fowler
progress: "第8章"
---
```

## note タイプ

テキスト主体の短いメモ・雑感。追加の固有フィールドはない。

### 固有フィールド

なし（共通フィールドのみ）。

### YAML 例

```yaml
---
type: note
date: "2025-08-01"
tags:
  - 日記
title: 朝の散歩
---
```

## ファイル配置ルール

- 投稿ファイル: `content/{type}/` ディレクトリに Markdown ファイルとして配置する
  - 例: `content/photo/2025-06-15-sunset.md`
  - 例: `content/reading/2025-07-01-refactoring-ch3.md`
  - 例: `content/note/2025-08-01-morning-walk.md`
- 画像ファイル: `attachments/` ディレクトリに配置する
  - photo タイプの `image` フィールドは `attachments/` からの相対パスを指定する
