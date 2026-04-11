"""Front matter 仕様ドキュメント (docs/frontmatter-spec.md) の検証テスト"""

import os
import re
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_FILE = os.path.join(REPO_ROOT, "docs", "frontmatter-spec.md")


class TestFrontmatterSpecExists(unittest.TestCase):
    """仕様ドキュメントの存在確認"""

    def test_spec_file_exists(self):
        self.assertTrue(
            os.path.isfile(SPEC_FILE),
            "docs/frontmatter-spec.md が存在しない",
        )


class TestFrontmatterSpec(unittest.TestCase):
    """仕様ドキュメントの内容検証"""

    @classmethod
    def setUpClass(cls):
        with open(SPEC_FILE, encoding="utf-8") as f:
            cls.content = f.read()

    # --- 3タイプの定義 ---

    def test_photo_type_defined(self):
        self.assertRegex(self.content, r"## photo タイプ")

    def test_reading_type_defined(self):
        self.assertRegex(self.content, r"## reading タイプ")

    def test_note_type_defined(self):
        self.assertRegex(self.content, r"## note タイプ")

    # --- 共通フィールド ---

    def test_common_field_type(self):
        self.assertIn("`type`", self.content)

    def test_common_field_date(self):
        self.assertIn("`date`", self.content)

    def test_common_field_tags(self):
        self.assertIn("`tags`", self.content)

    def test_common_field_draft(self):
        self.assertIn("`draft`", self.content)

    def test_common_field_title(self):
        self.assertIn("`title`", self.content)

    # --- photo 固有フィールド ---

    def test_photo_field_image(self):
        self.assertIn("`image`", self.content)

    def test_photo_field_alt(self):
        self.assertIn("`alt`", self.content)

    # --- reading 固有フィールド ---

    def test_reading_field_book(self):
        self.assertIn("`book`", self.content)

    def test_reading_field_author(self):
        self.assertIn("`author`", self.content)

    def test_reading_field_progress(self):
        self.assertIn("`progress`", self.content)

    # --- フィールド定義テーブルの形式 ---

    def test_table_has_type_column(self):
        self.assertIn("型", self.content)

    def test_table_has_required_column(self):
        self.assertRegex(self.content, r"必須.*任意|任意.*必須")

    def test_table_has_description_column(self):
        self.assertIn("説明", self.content)

    # --- 各タイプの YAML 具体例 ---

    def test_photo_yaml_example(self):
        self.assertIn("type: photo", self.content)

    def test_reading_yaml_example(self):
        self.assertIn("type: reading", self.content)

    def test_note_yaml_example(self):
        self.assertIn("type: note", self.content)

    # --- reading: 同一書籍の複数投稿 ---

    def test_same_book_explanation(self):
        self.assertTrue(
            re.search(r"同.*書籍|同じ本", self.content),
            "同一書籍の紐付け方法が説明されていない",
        )

    def test_book_field_grouping(self):
        self.assertTrue(
            re.search(r"book.*同一|同.*book|`book`.*同じ", self.content),
            "book フィールドでグループ化する説明がない",
        )


if __name__ == "__main__":
    unittest.main()
