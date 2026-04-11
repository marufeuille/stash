import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('カードコンポーネントの存在確認', () => {
  const components = ['CardPhoto.astro', 'CardReading.astro', 'CardNote.astro'];

  it.each(components)('%s が存在する', (component) => {
    expect(existsSync(resolve(ROOT, 'src/components', component))).toBe(true);
  });

  it('CardPhoto にサムネイル画像表示がある', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    expect(src).toContain('<img');
    expect(src).toContain('image');
    expect(src).toContain('alt');
  });

  it('CardReading に書籍情報（book, author）がある', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardReading.astro'), 'utf-8');
    expect(src).toContain('book');
    expect(src).toContain('author');
    expect(src).toContain('progress');
  });

  it('CardNote にタグ表示がある', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardNote.astro'), 'utf-8');
    expect(src).toContain('tags');
  });

  it('各カードに詳細ページへのリンクがある', () => {
    for (const component of components) {
      const src = readFileSync(resolve(ROOT, 'src/components', component), 'utf-8');
      expect(src).toMatch(/<a\s/);
      expect(src).toContain('href');
    }
  });

  it('各カードのデザインが異なる（type別CSSクラスが存在する）', () => {
    const photoSrc = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    const readingSrc = readFileSync(resolve(ROOT, 'src/components/CardReading.astro'), 'utf-8');
    const noteSrc = readFileSync(resolve(ROOT, 'src/components/CardNote.astro'), 'utf-8');

    expect(photoSrc).toContain('card-photo');
    expect(readingSrc).toContain('card-reading');
    expect(noteSrc).toContain('card-note');
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
  });

  it('draft: true の投稿をフィルタリングしている', () => {
    expect(indexSrc).toMatch(/filter.*draft/s);
  });

  it('日付降順でソートしている', () => {
    expect(indexSrc).toMatch(/sort/);
    expect(indexSrc).toMatch(/date/);
  });

  it('3種類のカードコンポーネントをインポートしている', () => {
    expect(indexSrc).toContain('CardPhoto');
    expect(indexSrc).toContain('CardReading');
    expect(indexSrc).toContain('CardNote');
  });

  it('type に応じてカードコンポーネントを出し分けている', () => {
    expect(indexSrc).toContain("type === 'photo'");
    expect(indexSrc).toContain("type === 'reading'");
    expect(indexSrc).toContain("type === 'note'");
  });

  it('レスポンシブ対応の viewport meta タグがある（BaseLayout経由）', () => {
    // viewport は BaseLayout に移動済み
    expect(indexSrc).toContain('BaseLayout');
    const layoutSrc = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(layoutSrc).toContain('viewport');
    expect(layoutSrc).toContain('width=device-width');
  });
});

describe('ビルド結果の検証', () => {
  let html;

  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });
    html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
  });

  it('ビルドが成功し index.html が生成される', () => {
    expect(existsSync(resolve(ROOT, 'dist/index.html'))).toBe(true);
  });

  it('公開済み投稿がすべて表示されている', () => {
    // 公開投稿を収集
    const types = ['photo', 'reading', 'note'];
    let publishedCount = 0;
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (!data.draft) publishedCount++;
      }
    }
    // HTML内の投稿数テキストと一致
    expect(html).toContain(`${publishedCount} posts`);
  });

  it('draft: true の投稿がビルド結果に含まれない', () => {
    // draft投稿のタイトルを収集
    const types = ['photo', 'reading', 'note'];
    const draftTitles = [];
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (data.draft && data.title) {
          draftTitles.push(data.title);
        }
      }
    }
    for (const title of draftTitles) {
      expect(html).not.toContain(title);
    }
  });

  it('日付降順で表示されている', () => {
    // HTML内の datetime 属性の順序を確認
    const dateMatches = [...html.matchAll(/datetime="(\d{4}-\d{2}-\d{2})"/g)];
    const dates = dateMatches.map((m) => m[1]);
    expect(dates.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1] >= dates[i]).toBe(true);
    }
  });

  it('photo カードにサムネイル画像がある', () => {
    expect(html).toContain('card-photo');
    expect(html).toContain('<img');
    expect(html).toContain('/attachments/');
  });

  it('reading カードに書籍情報がある', () => {
    expect(html).toContain('card-reading');
    expect(html).toContain('サピエンス全史');
    expect(html).toContain('ユヴァル・ノア・ハラリ');
  });

  it('note カードにタグが表示されている', () => {
    expect(html).toContain('card-note');
    expect(html).toContain('card-tags');
  });

  it('各カードに詳細ページへのリンクがある', () => {
    expect(html).toMatch(/href="\/photo\/[^"]+\/"/);
    expect(html).toMatch(/href="\/reading\/[^"]+\/"/);
    expect(html).toMatch(/href="\/note\/[^"]+\/"/);
  });

  it('3タイプのカードの見た目が異なる（type別CSSが含まれる）', () => {
    expect(html).toContain('card-photo');
    expect(html).toContain('card-reading');
    expect(html).toContain('card-note');
  });
});
