import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('StreamItem コンポーネントの存在確認', () => {
  let src;

  beforeAll(() => {
    src = readFileSync(resolve(ROOT, 'src/components/StreamItem.astro'), 'utf-8');
  });

  it('StreamItem.astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/components/StreamItem.astro'))).toBe(true);
  });

  it('photo タイプ向けにサムネイル画像表示がある', () => {
    expect(src).toMatch(/<Image/);
    expect(src).toContain('image');
    expect(src).toContain('alt');
  });

  it('reading タイプ向けに書籍情報（book, author, progress）を扱う', () => {
    expect(src).toContain('book');
    expect(src).toContain('author');
    expect(src).toContain('progress');
  });

  it('note タイプ向けにタグ表示がある', () => {
    expect(src).toContain('tags');
  });

  it('カードに詳細ページへのリンクがある', () => {
    expect(src).toMatch(/<a\s/);
    expect(src).toContain('href');
  });

  it('type 別のスタイルクラス（type-photo / type-reading / type-note / type-link）がある', () => {
    expect(src).toContain('type-${type}');
    expect(src).toContain('.type-photo');
    expect(src).toContain('.type-reading');
    expect(src).toContain('.type-note');
    expect(src).toContain('.type-link');
  });
});

describe('トップページ（index.astro）の実装', () => {
  let indexSrc;

  beforeAll(() => {
    indexSrc = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
  });

  it('getCollection で全タイプの投稿を取得している', () => {
    expect(indexSrc).toContain("getCollection('photo')");
    expect(indexSrc).toContain("getCollection('reading')");
    expect(indexSrc).toContain("getCollection('note')");
    expect(indexSrc).toContain("getCollection('link')");
  });

  it('draft: true の投稿をフィルタリングしている', () => {
    expect(indexSrc).toMatch(/filter.*draft/s);
  });

  it('日付降順でソートしている（sortPostsDesc）', () => {
    expect(indexSrc).toContain('sortPostsDesc');
  });

  it('StreamItem コンポーネントをインポートしている', () => {
    expect(indexSrc).toContain('StreamItem');
    expect(indexSrc).toMatch(/<StreamItem/);
  });

  it('type に応じて StreamItem に正しい props を渡している', () => {
    expect(indexSrc).toContain('type="photo"');
    expect(indexSrc).toContain('type="reading"');
    expect(indexSrc).toContain('type="note"');
    expect(indexSrc).toContain('type="link"');
  });
});

describe('ビルド結果の検証', () => {
  let html;

  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });
    html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
  }, 120_000);

  it('公開済み投稿がすべて表示されている', () => {
    const types = ['photo', 'reading', 'note', 'link'];
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      const published = files.filter((file) => {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        return !matter(raw).data.draft;
      });
      if (published.length === 0) continue;
      const found = published.some((file) => {
        const slug = file.replace('.md', '');
        return html.includes(`/${type}/${slug}/`);
      });
      expect(found, `${type} の公開済み投稿のリンクがトップページに出るべき`).toBe(true);
    }
  });

  it('photo カードにサムネイル画像がある', () => {
    expect(html).toMatch(/<img[^>]*src="[^"]*\.webp/);
  });

  it('各カードに詳細ページへのリンクがある', () => {
    expect(html).toMatch(/href="\/note\/[^"]+\/"/);
    expect(html).toMatch(/href="\/photo\/[^"]+\/"/);
  });

  it('type 別のラベル（type-note 等）が付与されている', () => {
    expect(html).toContain('type-note');
    expect(html).toContain('type-photo');
  });
});
