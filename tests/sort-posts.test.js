import { describe, it, expect } from 'vitest';
import { filenameTimeSeconds, sortPostsDesc } from '../src/lib/sortPosts.ts';

describe('filenameTimeSeconds', () => {
  it('YYYY-MM-DD_HH-MM-SS 形式から秒数を抽出する', () => {
    expect(filenameTimeSeconds('2026-04-16_14-32-05')).toBe(14 * 3600 + 32 * 60 + 5);
    expect(filenameTimeSeconds('2026-04-16_00-00-00')).toBe(0);
    expect(filenameTimeSeconds('2026-04-16_23-59-59')).toBe(23 * 3600 + 59 * 60 + 59);
  });

  it('タイムスタンプ接頭辞の後に任意の文字列があっても抽出できる', () => {
    expect(filenameTimeSeconds('2026-04-16_14-32-05_extra')).toBe(14 * 3600 + 32 * 60 + 5);
  });

  it('タイムスタンプ形式でないファイル名は 0 を返す', () => {
    expect(filenameTimeSeconds('sapiens-1')).toBe(0);
    expect(filenameTimeSeconds('morning-sky')).toBe(0);
    expect(filenameTimeSeconds('2026-04-16')).toBe(0); // 時刻部分なし
  });
});

describe('sortPostsDesc', () => {
  const makePost = (id, dateStr) => ({ id, data: { date: new Date(dateStr) } });

  it('日付降順で並べる', () => {
    const input = [
      makePost('a', '2026-01-01'),
      makePost('b', '2026-03-01'),
      makePost('c', '2026-02-01'),
    ];
    const result = sortPostsDesc(input);
    expect(result.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('同日投稿はファイル名の時刻で降順（新しいほど上）', () => {
    const input = [
      makePost('2026-04-16_08-00-00', '2026-04-16'),
      makePost('2026-04-16_14-32-05', '2026-04-16'),
      makePost('2026-04-16_10-15-30', '2026-04-16'),
    ];
    const result = sortPostsDesc(input);
    expect(result.map((p) => p.id)).toEqual([
      '2026-04-16_14-32-05',
      '2026-04-16_10-15-30',
      '2026-04-16_08-00-00',
    ]);
  });

  it('タイムスタンプ命名とスラッグ命名が混在しても日付降順 → タイムスタンプ時刻降順', () => {
    const input = [
      makePost('morning-sky', '2026-04-16'),
      makePost('2026-04-16_14-32-05', '2026-04-16'),
      makePost('2026-04-15_09-00-00', '2026-04-15'),
      makePost('sapiens-1', '2026-04-16'),
    ];
    const result = sortPostsDesc(input);
    // 2026-04-16 の3件（タイムスタンプ付きが最上位、スラッグ2件は互いに stable 順）、続いて 2026-04-15
    expect(result[0].id).toBe('2026-04-16_14-32-05');
    expect(result[3].id).toBe('2026-04-15_09-00-00');
  });

  it('入力配列を変更しない（純粋関数）', () => {
    const input = [
      makePost('a', '2026-01-01'),
      makePost('b', '2026-02-01'),
    ];
    const snapshot = input.map((p) => p.id);
    sortPostsDesc(input);
    expect(input.map((p) => p.id)).toEqual(snapshot);
  });
});
