import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import remarkAttachments from '../scripts/remark-attachments.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const ATTACHMENTS = resolve(ROOT, 'content/attachments');
const NOTE_PATH = resolve(ROOT, 'content/note/__remark_fixture__.md');
const FIXTURE = resolve(ATTACHMENTS, '__remark_fixture__.png');

function runOnImage(url, noteFile = NOTE_PATH) {
  const tree = {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'image', url, alt: '' }] }],
  };
  remarkAttachments()(tree, { history: [noteFile], path: noteFile });
  return tree.children[0].children[0].url;
}

describe('remarkAttachments', () => {
  beforeAll(() => {
    mkdirSync(ATTACHMENTS, { recursive: true });
    writeFileSync(FIXTURE, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  afterAll(() => {
    if (existsSync(FIXTURE)) rmSync(FIXTURE);
  });

  it('ベアなファイル名を content/attachments/ 配下への相対パスに書き換える', () => {
    expect(runOnImage('__remark_fixture__.png')).toBe('../attachments/__remark_fixture__.png');
  });

  it('attachments/ プレフィックスが付いている場合も解決する', () => {
    expect(runOnImage('attachments/__remark_fixture__.png')).toBe(
      '../attachments/__remark_fixture__.png',
    );
  });

  it('存在しないファイルは書き換えない', () => {
    expect(runOnImage('does-not-exist.png')).toBe('does-not-exist.png');
  });

  it('外部 URL は書き換えない', () => {
    expect(runOnImage('https://example.com/foo.png')).toBe('https://example.com/foo.png');
  });

  it('./ や ../ で始まる相対パスは書き換えない', () => {
    expect(runOnImage('./local.png')).toBe('./local.png');
    expect(runOnImage('../other/dir.png')).toBe('../other/dir.png');
  });

  it('ルート絶対パスは書き換えない', () => {
    expect(runOnImage('/public/foo.png')).toBe('/public/foo.png');
  });
});
