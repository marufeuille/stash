import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('topic コレクションの設定', () => {
  let config;

  beforeAll(() => {
    config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
  });

  it('content.config.ts に topic コレクションが定義されている', () => {
    expect(config).toMatch(/collections\s*=\s*\{[^}]*topic/);
    expect(config).toContain("literal('topic')");
  });

  it('topic スキーマに stages 配列が定義されている', () => {
    expect(config).toMatch(/stages.*array/);
  });

  it('既存4タイプに optional な topic / stage / summary が定義されている', () => {
    expect(config).toMatch(/topic.*optional/);
    expect(config).toMatch(/stage.*optional/);
    expect(config).toMatch(/summary.*boolean/);
  });
});

describe('topic ページのソース', () => {
  it('src/pages/topic/[slug].astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/pages/topic/[slug].astro'))).toBe(true);
  });

  it('src/pages/topic/index.astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/pages/topic/index.astro'))).toBe(true);
  });

  it('src/lib/topics.ts が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/lib/topics.ts'))).toBe(true);
  });

  it('TopicSection.astro が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/components/TopicSection.astro'))).toBe(true);
  });
});

describe('BaseLayout に topic ナビが追加されている', () => {
  it("nav に '/topic/' へのリンクがある", () => {
    const src = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(src).toContain("'/topic/'");
    expect(src).toMatch(/key:\s*'topic'/);
  });
});

describe('topic ページのビルド結果', () => {
  let publishedTopics;

  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });

    const dir = resolve(ROOT, 'content', 'topic');
    publishedTopics = [];
    if (existsSync(dir)) {
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (!data.draft) {
          publishedTopics.push({ slug: data.slug, data });
        }
      }
    }
  });

  it('/topic/ 一覧ページが生成されている', () => {
    expect(existsSync(resolve(ROOT, 'dist/topic/index.html'))).toBe(true);
  });

  it('公開済みトピックの詳細ページがすべて生成されている', () => {
    expect(publishedTopics.length).toBeGreaterThan(0);
    for (const t of publishedTopics) {
      const html = resolve(ROOT, 'dist/topic', t.slug, 'index.html');
      expect(existsSync(html), `topic/${t.slug} の詳細ページが存在すべき`).toBe(true);
    }
  });

  it('トピック詳細にタイトルと description が表示されている', () => {
    for (const t of publishedTopics) {
      const html = readFileSync(
        resolve(ROOT, 'dist/topic', t.slug, 'index.html'),
        'utf-8',
      );
      expect(html).toContain(t.data.title);
      if (t.data.description) {
        expect(html).toContain(t.data.description);
      }
    }
  });

  it('stages のアンカー要素が生成されている', () => {
    for (const t of publishedTopics) {
      const html = readFileSync(
        resolve(ROOT, 'dist/topic', t.slug, 'index.html'),
        'utf-8',
      );
      for (const stage of t.data.stages ?? []) {
        const id = `stage-${encodeURIComponent(stage.replace(/\//g, '-'))}`;
        expect(html, `stage anchor ${id} が存在すべき`).toContain(`id="${id}"`);
      }
    }
  });

  it('一覧ページに各トピックのリンクが含まれている', () => {
    const html = readFileSync(resolve(ROOT, 'dist/topic/index.html'), 'utf-8');
    for (const t of publishedTopics) {
      expect(html).toContain(`/topic/${t.slug}/`);
      expect(html).toContain(t.data.title);
    }
  });

  it('topic を持つノートの詳細ページに戻り導線がある', () => {
    const noteDir = resolve(ROOT, 'content', 'note');
    if (!existsSync(noteDir)) return;
    const files = readdirSync(noteDir).filter((f) => f.endsWith('.md'));
    let checked = 0;
    for (const file of files) {
      const raw = readFileSync(resolve(noteDir, file), 'utf-8');
      const { data } = matter(raw);
      if (data.draft || !data.topic) continue;
      const slug = file.replace('.md', '');
      const htmlPath = resolve(ROOT, 'dist', 'note', slug, 'index.html');
      if (!existsSync(htmlPath)) continue;
      const html = readFileSync(htmlPath, 'utf-8');
      expect(html).toContain(`/topic/${data.topic}/`);
      checked++;
    }
    expect(checked, 'topic 付きノートで戻り導線を確認すべき').toBeGreaterThan(0);
  });

  it('topic を持たない既存ノートには影響しない（後方互換）', () => {
    const noteDir = resolve(ROOT, 'content', 'note');
    if (!existsSync(noteDir)) return;
    const files = readdirSync(noteDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const raw = readFileSync(resolve(noteDir, file), 'utf-8');
      const { data } = matter(raw);
      if (data.draft || data.topic) continue;
      const slug = file.replace('.md', '');
      const htmlPath = resolve(ROOT, 'dist', 'note', slug, 'index.html');
      if (!existsSync(htmlPath)) continue;
      const html = readFileSync(htmlPath, 'utf-8');
      expect(html, `${slug} はトピック戻り導線を持たないべき`).not.toContain('class="topic-link"');
    }
  });
});
