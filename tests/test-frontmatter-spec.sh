#!/usr/bin/env bash
# Front matter仕様ドキュメントの検証テスト
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_FILE="$REPO_ROOT/docs/frontmatter-spec.md"
PASS=0
FAIL=0

assert_contains() {
  local description="$1"
  local pattern="$2"
  if grep -qE "$pattern" "$SPEC_FILE"; then
    echo "  ✓ $description"
    ((PASS++))
  else
    echo "  ✗ $description (pattern not found: $pattern)"
    ((FAIL++))
  fi
}

echo "=== Front Matter 仕様ドキュメント テスト ==="
echo ""

# 1. ファイル存在チェック
echo "[1] ファイル存在チェック"
if [ -f "$SPEC_FILE" ]; then
  echo "  ✓ docs/frontmatter-spec.md が存在する"
  ((PASS++))
else
  echo "  ✗ docs/frontmatter-spec.md が存在しない"
  ((FAIL++))
  echo ""
  echo "=== 結果: $PASS passed, $FAIL failed ==="
  exit 1
fi

# 2. 3タイプの定義が存在するか
echo "[2] 3タイプの定義"
assert_contains "photo タイプの定義がある" "## photo タイプ"
assert_contains "reading タイプの定義がある" "## reading タイプ"
assert_contains "note タイプの定義がある" "## note タイプ"

# 3. 共通フィールドの定義
echo "[3] 共通フィールド定義"
assert_contains "type フィールドが定義されている" "\`type\`"
assert_contains "date フィールドが定義されている" "\`date\`"
assert_contains "tags フィールドが定義されている" "\`tags\`"
assert_contains "draft フィールドが定義されている" "\`draft\`"
assert_contains "title フィールドが定義されている" "\`title\`"

# 4. photo固有フィールド
echo "[4] photo 固有フィールド"
assert_contains "image フィールドが定義されている" "\`image\`"
assert_contains "alt フィールドが定義されている" "\`alt\`"

# 5. reading固有フィールド
echo "[5] reading 固有フィールド"
assert_contains "book フィールドが定義されている" "\`book\`"
assert_contains "author フィールドが定義されている" "\`author\`"
assert_contains "progress フィールドが定義されている" "\`progress\`"

# 6. フィールド定義テーブル（名前・型・必須/任意・説明の列がある）
echo "[6] フィールド定義テーブルの形式"
assert_contains "フィールド定義テーブルに型の列がある" "型"
assert_contains "フィールド定義テーブルに必須/任意の列がある" "必須.*任意|任意.*必須"
assert_contains "フィールド定義テーブルに説明の列がある" "説明"

# 7. 各タイプのYAML例
echo "[7] YAML 具体例"
assert_contains "photo の YAML 例がある" "type: photo"
assert_contains "reading の YAML 例がある" "type: reading"
assert_contains "note の YAML 例がある" "type: note"

# 8. 同一書籍の複数投稿の説明
echo "[8] reading: 同一書籍の複数投稿"
assert_contains "同一書籍の紐付け方法が説明されている" "同.*書籍|同じ本"
assert_contains "bookフィールドでグループ化する説明がある" "book.*同一|同.*book"

echo ""
echo "=== 結果: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
