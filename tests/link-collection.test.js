import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

describe('link collection schema', () => {
  let config;

  it('src/content.config.ts が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/content.config.ts'))).toBe(true);
    config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
  });

  it('collections export に link が含まれる', () => {
    config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
    expect(config).toMatch(/collections\s*=\s*\{[^}]*link/);
  });

  it('link スキーマに type / url / quote / 共通フィールドが定義されている', () => {
    config = readFileSync(resolve(ROOT, 'src/content.config.ts'), 'utf-8');
    expect(config).toContain("literal('link')");
    expect(config).toMatch(/url:\s*z\.string\(\)\.url\(\)/);
    expect(config).toMatch(/quote:\s*z\.string\(\)\.optional\(\)/);
    expect(config).toMatch(/title:\s*z\.string\(\)\.optional\(\)/);
    expect(config).toMatch(/date:\s*z\.coerce\.date\(\)/);
    expect(config).toMatch(/tags:\s*z\.array\(z\.string\(\)\)/);
    expect(config).toMatch(/draft:\s*z\.boolean\(\)/);
  });

  it('content/link が sync-content.mjs の SUBDIRS に含まれる', () => {
    const sync = readFileSync(resolve(ROOT, 'scripts/sync-content.mjs'), 'utf-8');
    expect(sync).toMatch(/SUBDIRS\s*=\s*\[[^\]]*['"]link['"]/);
  });
});

describe('link routing & UI', () => {
  it('/link/ 一覧ページが存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/pages/link/index.astro'))).toBe(true);
  });

  it('compose/[type].astro が link を getStaticPaths に含む', () => {
    const src = readFileSync(resolve(ROOT, 'src/pages/compose/[type].astro'), 'utf-8');
    expect(src).toMatch(/type:\s*['"]link['"]/);
    expect(src).toContain('{{url}}');
  });

  it('BaseLayout のナビに link が含まれる', () => {
    const src = readFileSync(resolve(ROOT, 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(src).toMatch(/key:\s*['"]link['"]/);
    expect(src).toContain('--link');
  });

  it('StreamItem が link 用 props (url, quote) を受け取れる', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/StreamItem.astro'), 'utf-8');
    expect(src).toContain("'link'");
    expect(src).toMatch(/url\?:\s*string/);
    expect(src).toMatch(/quote\?:\s*string/);
  });

  it('public に manifest-link.json と icons/link.png が存在する', () => {
    expect(existsSync(resolve(ROOT, 'public/manifest-link.json'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'public/icons/link.png'))).toBe(true);
  });
});
