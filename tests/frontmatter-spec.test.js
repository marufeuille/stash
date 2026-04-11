import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const specPath = resolve(ROOT, 'docs/frontmatter-spec.md');
const spec = readFileSync(specPath, 'utf-8');

describe('frontmatter-spec.md の存在と構造', () => {
  it('docs/frontmatter-spec.md が存在する', () => {
    // readFileSync が成功していれば存在する
    expect(spec.length).toBeGreaterThan(0);
  });

  it('3タイプ（photo / reading / note）のセクションがある', () => {
    expect(spec).toContain('## photo タイプ');
    expect(spec).toContain('## reading タイプ');
    expect(spec).toContain('## note タイプ');
  });

  it('共通フィールドのセクションがある', () => {
    expect(spec).toContain('## 共通フィールド');
  });
});

describe('共通フィールドの定義', () => {
  const commonFields = ['type', 'date', 'tags', 'draft', 'title'];

  it.each(commonFields)('共通フィールド `%s` が記載されている', (field) => {
    expect(spec).toContain(`\`${field}\``);
  });
});

describe('photo タイプのフィールド定義', () => {
  it.each(['image', 'alt'])('固有フィールド `%s` が記載されている', (field) => {
    expect(spec).toContain(`\`${field}\``);
  });

  it('YAML 具体例が記載されている', () => {
    // photo セクション内に type: photo を含む YAML ブロックがある
    expect(spec).toMatch(/```yaml[\s\S]*?type: photo[\s\S]*?```/);
  });
});

describe('reading タイプのフィールド定義', () => {
  it.each(['book', 'author', 'progress'])('固有フィールド `%s` が記載されている', (field) => {
    expect(spec).toContain(`\`${field}\``);
  });

  it('YAML 具体例が記載されている', () => {
    expect(spec).toMatch(/```yaml[\s\S]*?type: reading[\s\S]*?```/);
  });

  it('同一書籍を複数投稿から参照する方法が説明されている', () => {
    expect(spec).toMatch(/同.*(書籍|本).*複数/);
  });
});

describe('note タイプのフィールド定義', () => {
  it('YAML 具体例が記載されている', () => {
    expect(spec).toMatch(/```yaml[\s\S]*?type: note[\s\S]*?```/);
  });

  it('固有フィールドがないことが記載されている', () => {
    expect(spec).toMatch(/固有フィールドはない/);
  });
});

describe('フィールド定義の品質', () => {
  it('各フィールドに型情報が記載されている', () => {
    // テーブル内に型の列がある
    expect(spec).toContain('| 型');
  });

  it('各フィールドに必須/任意の情報が記載されている', () => {
    expect(spec).toContain('| 必須');
  });

  it('各フィールドに説明が記載されている', () => {
    expect(spec).toContain('| 説明');
  });
});
