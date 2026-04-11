import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');

describe('Content Collections config', () => {
  it('src/content.config.ts が存在する', () => {
    expect(existsSync(resolve(ROOT, 'src/content.config.ts'))).toBe(true);
  });

  it('config に photo / reading / note の3コレクションが定義されている', () => {
    const config = readFileSync(
      resolve(ROOT, 'src/content.config.ts'),
      'utf-8',
    );
    // collections export に3つのコレクション名が含まれる
    expect(config).toMatch(/collections\s*=\s*\{[^}]*photo/);
    expect(config).toMatch(/collections\s*=\s*\{[^}]*reading/);
    expect(config).toMatch(/collections\s*=\s*\{[^}]*note/);
  });

  it('photo スキーマに必須フィールドが定義されている', () => {
    const config = readFileSync(
      resolve(ROOT, 'src/content.config.ts'),
      'utf-8',
    );
    // photo collection の schema 定義に必要なフィールドが含まれる
    expect(config).toContain("literal('photo')");
    expect(config).toMatch(/image.*string/);
    expect(config).toMatch(/alt.*string/);
    expect(config).toMatch(/draft.*boolean/);
  });

  it('reading スキーマに必須フィールドが定義されている', () => {
    const config = readFileSync(
      resolve(ROOT, 'src/content.config.ts'),
      'utf-8',
    );
    expect(config).toContain("literal('reading')");
    expect(config).toMatch(/book.*string/);
    expect(config).toMatch(/author.*string/);
    expect(config).toMatch(/progress.*optional/);
  });

  it('note スキーマに必須フィールドが定義されている', () => {
    const config = readFileSync(
      resolve(ROOT, 'src/content.config.ts'),
      'utf-8',
    );
    expect(config).toContain("literal('note')");
    expect(config).toMatch(/tags.*array/);
    expect(config).toMatch(/draft.*boolean/);
  });
});

describe('サンプル投稿の存在確認', () => {
  const types = ['photo', 'reading', 'note'];

  it.each(types)('%s に最低2件のサンプル投稿がある', (type) => {
    const dir = resolve(ROOT, 'content', type);
    expect(existsSync(dir)).toBe(true);
    const { readdirSync } = require('fs');
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it('draft: true のサンプル投稿が少なくとも1件含まれている', () => {
    let draftCount = 0;
    for (const type of types) {
      const dir = resolve(ROOT, 'content', type);
      const { readdirSync } = require('fs');
      const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
      for (const file of files) {
        const raw = readFileSync(resolve(dir, file), 'utf-8');
        const { data } = matter(raw);
        if (data.draft === true) draftCount++;
      }
    }
    expect(draftCount).toBeGreaterThanOrEqual(1);
  });
});

describe('Astro プロジェクト構成', () => {
  it('astro.config.mjs が存在する', () => {
    expect(existsSync(resolve(ROOT, 'astro.config.mjs'))).toBe(true);
  });

  it('tsconfig.json が存在する', () => {
    expect(existsSync(resolve(ROOT, 'tsconfig.json'))).toBe(true);
  });

  it('package.json に astro が依存に含まれている', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
    );
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('astro');
  });

  it('package.json に build スクリプトがある', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
    );
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.build).toContain('astro');
  });
});
