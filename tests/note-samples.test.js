import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const noteDir = resolve(ROOT, 'content/note');

function readPost(filename) {
  const raw = readFileSync(resolve(noteDir, filename), 'utf-8');
  return matter(raw);
}

const posts = ['tools-and-thinking.md', 'silence-in-morning.md'];

describe('note sample posts', () => {
  it('content/note/ に2件のサンプル投稿が存在する', () => {
    for (const file of posts) {
      expect(existsSync(resolve(noteDir, file))).toBe(true);
    }
  });

  it.each(posts)('%s の front matter に必須フィールドがある', (file) => {
    const { data } = readPost(file);
    expect(data.type).toBe('note');
    expect(data.date).toBeInstanceOf(Date);
    expect(typeof data.draft).toBe('boolean');
    expect(Array.isArray(data.tags)).toBe(true);
  });

  it.each(posts)('%s の本文が存在する', (file) => {
    const { content } = readPost(file);
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('title がある投稿とない投稿が混在している', () => {
    const allData = posts.map((file) => readPost(file).data);
    const withTitle = allData.filter((d) => d.title !== undefined);
    const withoutTitle = allData.filter((d) => d.title === undefined);
    expect(withTitle.length).toBeGreaterThanOrEqual(1);
    expect(withoutTitle.length).toBeGreaterThanOrEqual(1);
  });

  it('title があるものは string 型である', () => {
    const allData = posts.map((file) => readPost(file).data);
    for (const d of allData) {
      if (d.title !== undefined) {
        expect(typeof d.title).toBe('string');
      }
    }
  });

  it('note タイプに固有フィールド（image, book, author 等）が含まれていない', () => {
    const noteOnlyForbidden = ['image', 'alt', 'book', 'author', 'progress'];
    for (const file of posts) {
      const { data } = readPost(file);
      for (const field of noteOnlyForbidden) {
        expect(data[field]).toBeUndefined();
      }
    }
  });

  it('draft: true の下書きサンプルが1件以上ある', () => {
    const allData = posts.map((file) => readPost(file).data);
    const drafts = allData.filter((d) => d.draft === true);
    expect(drafts.length).toBeGreaterThanOrEqual(1);
  });
});
