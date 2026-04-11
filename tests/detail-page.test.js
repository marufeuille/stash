import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('BaseLayout の存在と構造', () => {
  let layoutSrc;

  beforeAll(() => {
    layoutSrc = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf-8');
  });

  it('BaseLayout.astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'))).toBe(true);
  });

  it('head タグに viewport meta がある', () => {
    expect(layoutSrc).toContain('viewport');
    expect(layoutSrc).toContain('width=device-width');
  });

  it('OGP の最低限の meta タグがある', () => {
    expect(layoutSrc).toContain('og:title');
    expect(layoutSrc).toContain('og:description');
  });

  it('トップへ戻るナビゲーションリンクがある', () => {
    expect(layoutSrc).toContain('href="/"');
  });

  it('slot を含んでいる', () => {
    expect(layoutSrc).toContain('<slot');
  });
});

describe('詳細ページテンプレートの実装', () => {
  let detailSrc;

  beforeAll(() => {
    detailSrc = readFileSync(resolve(ROOT, 'src/pages/[type]/[...slug].astro'), 'utf-8');
  });

  it('[type]/[...slug].astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/pages/[type]/[...slug].astro'))).toBe(true);
  });

  it('getStaticPaths をエクスポートしている', () => {
    expect(detailSrc).toContain('getStaticPaths');
  });

  it('全3タイプの投稿を取得している', () => {
    expect(detailSrc).toContain("getCollection('photo')");
    expect(detailSrc).toContain("getCollection('reading')");
    expect(detailSrc).toContain("getCollection('note')");
  });

  it('draft をフィルタリングしている', () => {
    expect(detailSrc).toMatch(/filter.*draft/s);
  });

  it('Content コンポーネントで本文をレンダリングしている', () => {
    expect(detailSrc).toContain('render(');
    expect(detailSrc).toContain('<Content');
  });

  it('BaseLayout を使用している', () => {
    expect(detailSrc).toContain('BaseLayout');
  });

  it('タイプ固有のメタ情報を表示している', () => {
    // photo: 画像
    expect(detailSrc).toContain('image');
    expect(detailSrc).toContain('alt');
    // reading: book, author
    expect(detailSrc).toContain('book');
    expect(detailSrc).toContain('author');
  });

  it('日付を表示している', () => {
    expect(detailSrc).toContain('<time');
    expect(detailSrc).toContain('datetime');
  });
});

describe('トップページが BaseLayout を使用している', () => {
  it('index.astro が BaseLayout をインポートしている', () => {
    const indexSrc = readFileSync(resolve(ROOT, 'src/pages/index.astro'), 'utf-8');
    expect(indexSrc).toContain('BaseLayout');
    expect(indexSrc).toContain('<BaseLayout');
  });
});

describe('詳細ページのビルド結果検証', () => {
  let publishedPosts;

  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });

    // 公開済み投稿を収集
    const types = ['photo', 'reading', 'note'];
    publishedPosts = [];
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (!data.draft) {
          publishedPosts.push({
            type: data.type,
            slug: file.replace('.md', ''),
            data,
          });
        }
      }
    }
  });

  it('公開済み投稿すべての詳細ページが生成されている', () => {
    for (const post of publishedPosts) {
      const htmlPath = resolve(ROOT, 'dist', post.type, post.slug, 'index.html');
      expect(existsSync(htmlPath), `${post.type}/${post.slug} の詳細ページが存在すべき`).toBe(true);
    }
  });

  it('draft: true の投稿の詳細ページが生成されていない', () => {
    const types = ['photo', 'reading', 'note'];
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (data.draft) {
          const slug = file.replace('.md', '');
          const htmlPath = resolve(ROOT, 'dist', type, slug, 'index.html');
          expect(existsSync(htmlPath), `draft投稿 ${type}/${slug} の詳細ページは存在しないべき`).toBe(false);
        }
      }
    }
  });

  it('詳細ページに本文がレンダリングされている', () => {
    for (const post of publishedPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      // Markdown本文がHTMLに変換されていること（<p>タグの存在）
      expect(html).toContain('<p>');
    }
  });

  it('詳細ページにタイトルが表示されている', () => {
    for (const post of publishedPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      const expectedTitle = post.data.title || (post.data.type === 'reading' ? post.data.book : 'Untitled');
      expect(html).toContain(expectedTitle);
    }
  });

  it('詳細ページに日付が表示されている', () => {
    for (const post of publishedPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      expect(html).toContain('datetime=');
    }
  });

  it('詳細ページにトップへ戻るリンクがある', () => {
    for (const post of publishedPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      expect(html).toContain('href="/"');
    }
  });

  it('photo 詳細ページに画像が表示されている', () => {
    const photoPosts = publishedPosts.filter((p) => p.type === 'photo');
    for (const post of photoPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      expect(html).toContain('<img');
      expect(html).toContain(post.data.alt);
    }
  });

  it('reading 詳細ページに書籍メタ情報が表示されている', () => {
    const readingPosts = publishedPosts.filter((p) => p.type === 'reading');
    for (const post of readingPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      expect(html).toContain(post.data.book);
      expect(html).toContain(post.data.author);
    }
  });

  it('レスポンシブ対応の viewport meta タグがある', () => {
    for (const post of publishedPosts) {
      const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
      expect(html).toContain('width=device-width');
    }
  });

  it('OGP meta タグが設定されている', () => {
    const post = publishedPosts[0];
    const html = readFileSync(resolve(ROOT, 'dist', post.type, post.slug, 'index.html'), 'utf-8');
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
  });
});
