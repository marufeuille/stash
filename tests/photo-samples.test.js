import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const photoDir = resolve(ROOT, 'content/photo');

function readPost(filename) {
  const raw = readFileSync(resolve(photoDir, filename), 'utf-8');
  return matter(raw);
}

const posts = ['morning-sky.md', 'green-park.md'];

describe('photo sample posts', () => {
  it('content/photo/ に2件のサンプル投稿が存在する', () => {
    for (const file of posts) {
      expect(existsSync(resolve(photoDir, file))).toBe(true);
    }
  });

  it.each(posts)('%s の front matter に必須フィールドがある', (file) => {
    const { data } = readPost(file);
    expect(data.type).toBe('photo');
    expect(data.date).toBeInstanceOf(Date);
    expect(data.image).toMatch(/^\/attachments\/.+/);
    expect(typeof data.alt).toBe('string');
    expect(typeof data.draft).toBe('boolean');
    expect(Array.isArray(data.tags)).toBe(true);
  });

  it.each(posts)('%s の image が参照する画像ファイルが存在する', (file) => {
    const { data } = readPost(file);
    // image は "/attachments/xxx.png" 形式なので先頭 / を除いてパス解決
    const imagePath = resolve(ROOT, data.image.replace(/^\//, ''));
    expect(existsSync(imagePath)).toBe(true);
  });

  it('少なくとも1件が draft: true である', () => {
    const drafts = posts
      .map((file) => readPost(file).data)
      .filter((d) => d.draft === true);
    expect(drafts.length).toBeGreaterThanOrEqual(1);
  });

  it.each(posts)('%s の本文が存在する', (file) => {
    const { content } = readPost(file);
    expect(content.trim().length).toBeGreaterThan(0);
  });
});

describe('attachments', () => {
  it('サンプル画像が attachments/ に配置されている', () => {
    expect(existsSync(resolve(ROOT, 'attachments/morning-sky.png'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'attachments/green-park.png'))).toBe(true);
  });
});
