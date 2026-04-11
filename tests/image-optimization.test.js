import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('画像最適化の設定', () => {
  it('content.config.ts で photo スキーマに image() ヘルパーを使用している', () => {
    const src = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
    expect(src).toContain('image()');
  });

  it('content.config.ts で schema が関数形式（image ヘルパー取得のため）になっている', () => {
    const src = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
    expect(src).toMatch(/schema:\s*\(\s*\{\s*image\s*\}\s*\)\s*=>/);
  });

  it('CardPhoto で Image コンポーネントをインポートしている', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    expect(src).toContain("import { Image } from 'astro:assets'");
  });

  it('CardPhoto で Image コンポーネントを使用している', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    expect(src).toContain('<Image');
    expect(src).toContain('format="webp"');
  });

  it('CardPhoto のサムネイルにサイズ指定がある', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    expect(src).toMatch(/width=\{?\d+\}?/);
    expect(src).toMatch(/height=\{?\d+\}?/);
  });

  it('詳細ページで Image コンポーネントをインポートしている', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/[type]/[...slug].astro'), 'utf-8');
    expect(src).toContain("import { Image } from 'astro:assets'");
  });

  it('詳細ページの photo 表示で Image コンポーネントを使用している', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/[type]/[...slug].astro'), 'utf-8');
    expect(src).toContain('<Image');
    expect(src).toContain('format="webp"');
  });

  it('photo コンテンツファイルの image パスが相対パスになっている', () => {
    const photoDir = resolve(ROOT, 'content/photo');
    const files = readdirSync(photoDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const raw = readFileSync(resolve(photoDir, file), 'utf-8');
      const { data } = matter(raw);
      // 相対パスで attachments を参照
      expect(data.image).toMatch(/^\.\.\/.*attachments\//);
    }
  });
});

describe('すべての画像に alt 属性が設定されている', () => {
  it('CardPhoto コンポーネントで alt が設定されている', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/CardPhoto.astro'), 'utf-8');
    expect(src).toMatch(/<Image[^>]*alt=/);
  });

  it('詳細ページの Image コンポーネントで alt が設定されている', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/[type]/[...slug].astro'), 'utf-8');
    expect(src).toMatch(/<Image[^>]*alt=/);
  });

  it('photo コンテンツファイルに alt フィールドが定義されている', () => {
    const photoDir = resolve(ROOT, 'content/photo');
    const files = readdirSync(photoDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const raw = readFileSync(resolve(photoDir, file), 'utf-8');
      const { data } = matter(raw);
      expect(data.alt).toBeDefined();
      expect(data.alt.length).toBeGreaterThan(0);
    }
  });
});

describe('ビルド結果の画像最適化検証', () => {
  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });
  });

  it('photo 詳細ページの画像が最適化されている', () => {
    const htmlPath = resolve(ROOT, 'dist/photo/morning-sky/index.html');
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, 'utf-8');
    // Image コンポーネントが img タグを出力
    expect(html).toContain('<img');
    // alt 属性が設定されている
    expect(html).toContain('オレンジとピンクに染まった朝焼けの空');
    // 最適化済み画像パス（_astro ディレクトリ内）
    expect(html).toMatch(/src="[^"]*\/_astro\/[^"]*"/);
  });

  it('トップページのサムネイル画像が最適化されている', () => {
    const html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
    // photo カードに最適化済み画像がある
    expect(html).toContain('card-photo');
    expect(html).toMatch(/src="[^"]*\/_astro\/[^"]*"/);
  });

  it('ビルド出力に最適化済み画像ファイルが存在する', () => {
    const astroDir = resolve(ROOT, 'dist/_astro');
    expect(existsSync(astroDir)).toBe(true);
    const files = readdirSync(astroDir);
    // WebP 形式の画像が生成されている
    const webpFiles = files.filter((f) => f.endsWith('.webp'));
    expect(webpFiles.length).toBeGreaterThan(0);
  });

  it('すべての img タグに alt 属性がある（photo詳細ページ）', () => {
    const htmlPath = resolve(ROOT, 'dist/photo/morning-sky/index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    // img タグを抽出し、alt 属性の有無を確認
    const imgTags = html.match(/<img[^>]*>/g) || [];
    expect(imgTags.length).toBeGreaterThan(0);
    for (const img of imgTags) {
      expect(img).toContain('alt=');
    }
  });

  it('すべての img タグに alt 属性がある（トップページ）', () => {
    const html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
    const imgTags = html.match(/<img[^>]*>/g) || [];
    for (const img of imgTags) {
      expect(img).toContain('alt=');
    }
  });

  it('トップページのサムネイル画像に width/height 属性がある', () => {
    const html = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf-8');
    const imgTags = html.match(/<img[^>]*>/g) || [];
    expect(imgTags.length).toBeGreaterThan(0);
    for (const img of imgTags) {
      expect(img).toContain('width=');
      expect(img).toContain('height=');
    }
  });
});
