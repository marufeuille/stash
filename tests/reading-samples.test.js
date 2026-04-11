import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const readingDir = resolve(ROOT, 'content/reading');

function readPost(filename) {
  const raw = readFileSync(resolve(readingDir, filename), 'utf-8');
  return matter(raw);
}

const posts = ['sapiens-1.md', 'sapiens-2.md', 'design-of-everyday-things.md'];

describe('reading sample posts', () => {
  it('content/reading/ に3件のサンプル投稿が存在する', () => {
    for (const file of posts) {
      expect(existsSync(resolve(readingDir, file))).toBe(true);
    }
  });

  it.each(posts)('%s の front matter に必須フィールドがある', (file) => {
    const { data } = readPost(file);
    expect(data.type).toBe('reading');
    expect(data.date).toBeInstanceOf(Date);
    expect(typeof data.book).toBe('string');
    expect(typeof data.author).toBe('string');
    expect(typeof data.draft).toBe('boolean');
    expect(Array.isArray(data.tags)).toBe(true);
  });

  it('2件以上が同じ book と author の値を持つ', () => {
    const allData = posts.map((file) => readPost(file).data);
    const grouped = {};
    for (const d of allData) {
      const key = `${d.book}::${d.author}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(grouped));
    expect(maxCount).toBeGreaterThanOrEqual(2);
  });

  it('progress フィールドがある投稿とない投稿が混在している', () => {
    const allData = posts.map((file) => readPost(file).data);
    const withProgress = allData.filter((d) => d.progress !== undefined);
    const withoutProgress = allData.filter((d) => d.progress === undefined);
    expect(withProgress.length).toBeGreaterThanOrEqual(1);
    expect(withoutProgress.length).toBeGreaterThanOrEqual(1);
  });

  it.each(posts)('%s の本文が存在する', (file) => {
    const { content } = readPost(file);
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('title は任意フィールドである（未設定の投稿があっても可）', () => {
    const allData = posts.map((file) => readPost(file).data);
    // title があるものは string であること
    for (const d of allData) {
      if (d.title !== undefined) {
        expect(typeof d.title).toBe('string');
      }
    }
  });
});
