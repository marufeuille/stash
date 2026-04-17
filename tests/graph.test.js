import { describe, it, expect } from 'vitest';
import { buildGraph, layoutGraph, egoNetwork } from '../src/lib/graph.ts';

function makePost({ type, id, date, title, follows = [], draft = false, extras = {} }) {
  return {
    id,
    body: '',
    collection: type,
    data: {
      type,
      title,
      date: new Date(date),
      tags: [],
      follows,
      draft,
      ...extras,
    },
  };
}

describe('buildGraph', () => {
  it('全投稿をノードとして登録する', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B' }),
    ];
    const g = buildGraph(posts);
    expect(g.nodes.map((n) => n.key).sort()).toEqual(['link/a', 'note/b']);
  });

  it('draft: true の投稿を除外する', () => {
    const posts = [
      makePost({ type: 'note', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B', draft: true }),
    ];
    const g = buildGraph(posts);
    expect(g.nodes.map((n) => n.key)).toEqual(['note/a']);
  });

  it('follows: [type/slug] の参照でエッジを作る', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A', extras: { url: 'https://example.com' } }),
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B', follows: ['link/a'] }),
    ];
    const g = buildGraph(posts);
    expect(g.edges).toEqual([{ from: 'link/a', to: 'note/b' }]);
    expect(g.parents.get('note/b')).toEqual(['link/a']);
    expect(g.children.get('link/a')).toEqual(['note/b']);
  });

  it('bare slug 参照も解決できる（同名が複数あれば最初に見つかったもの）', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B', follows: ['a'] }),
    ];
    const g = buildGraph(posts);
    expect(g.edges).toEqual([{ from: 'link/a', to: 'note/b' }]);
  });

  it('存在しない参照は無視する', () => {
    const posts = [
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B', follows: ['missing', 'note/ghost'] }),
    ];
    const g = buildGraph(posts);
    expect(g.edges).toEqual([]);
    expect(g.parents.get('note/b')).toEqual([]);
  });

  it('自分自身への参照は無視する', () => {
    const posts = [
      makePost({ type: 'note', id: 'a', date: '2026-04-02', title: 'A', follows: ['note/a'] }),
    ];
    const g = buildGraph(posts);
    expect(g.edges).toEqual([]);
  });

  it('複数の前のメモを扱える', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'link', id: 'b', date: '2026-04-01', title: 'B' }),
      makePost({ type: 'note', id: 'c', date: '2026-04-02', title: 'C', follows: ['link/a', 'link/b'] }),
    ];
    const g = buildGraph(posts);
    expect(g.parents.get('note/c')).toEqual(['link/a', 'link/b']);
  });
});

describe('egoNetwork', () => {
  it('指定ノードの親と子を返す', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-02', title: 'B', follows: ['link/a'] }),
      makePost({ type: 'note', id: 'c', date: '2026-04-03', title: 'C', follows: ['note/b'] }),
    ];
    const g = buildGraph(posts);
    const ego = egoNetwork(g, 'note/b');
    expect(ego.center?.title).toBe('B');
    expect(ego.parents.map((n) => n.key)).toEqual(['link/a']);
    expect(ego.children.map((n) => n.key)).toEqual(['note/c']);
  });

  it('親や子は日付昇順で並ぶ', () => {
    const posts = [
      makePost({ type: 'note', id: 'p1', date: '2026-04-02', title: 'P1' }),
      makePost({ type: 'note', id: 'p2', date: '2026-04-01', title: 'P2' }),
      makePost({ type: 'note', id: 'c', date: '2026-04-03', title: 'C', follows: ['note/p1', 'note/p2'] }),
    ];
    const g = buildGraph(posts);
    const ego = egoNetwork(g, 'note/c');
    expect(ego.parents.map((n) => n.id)).toEqual(['p2', 'p1']);
  });

  it('存在しないキーなら center は null', () => {
    const g = buildGraph([]);
    expect(egoNetwork(g, 'note/x').center).toBeNull();
  });
});

describe('layoutGraph', () => {
  it('空グラフを安全に扱う', () => {
    const layout = layoutGraph(buildGraph([]));
    expect(layout.nodes).toEqual([]);
    expect(layout.laneCount).toBe(0);
  });

  it('時系列でノードを並べる（新しいほど x 座標が小さい = 左）', () => {
    const posts = [
      makePost({ type: 'note', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-10', title: 'B' }),
      makePost({ type: 'note', id: 'c', date: '2026-04-05', title: 'C' }),
    ];
    const layout = layoutGraph(buildGraph(posts));
    const byKey = Object.fromEntries(layout.nodes.map((n) => [n.key, n]));
    expect(byKey['note/b'].x).toBeLessThan(byKey['note/c'].x);
    expect(byKey['note/c'].x).toBeLessThan(byKey['note/a'].x);
  });

  it('follows で繋がるノードは同じレーンを優先する', () => {
    const posts = [
      makePost({ type: 'link', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-05', title: 'B', follows: ['link/a'] }),
      makePost({ type: 'note', id: 'c', date: '2026-04-10', title: 'C', follows: ['note/b'] }),
    ];
    const layout = layoutGraph(buildGraph(posts));
    const byKey = Object.fromEntries(layout.nodes.map((n) => [n.key, n]));
    expect(byKey['link/a'].lane).toBe(byKey['note/b'].lane);
    expect(byKey['note/b'].lane).toBe(byKey['note/c'].lane);
  });

  it('同じ時刻に密集するノードは別レーンに落とす', () => {
    const posts = [
      makePost({ type: 'note', id: 'a', date: '2026-04-01', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-01', title: 'B' }),
      makePost({ type: 'note', id: 'c', date: '2026-04-01', title: 'C' }),
    ];
    const layout = layoutGraph(buildGraph(posts), { minNodeSpacing: 200, minWidth: 400 });
    const lanes = new Set(layout.nodes.map((n) => n.lane));
    expect(lanes.size).toBeGreaterThanOrEqual(2);
  });

  it('月ごとの date tick を生成する', () => {
    const posts = [
      makePost({ type: 'note', id: 'a', date: '2026-01-15', title: 'A' }),
      makePost({ type: 'note', id: 'b', date: '2026-04-15', title: 'B' }),
    ];
    const layout = layoutGraph(buildGraph(posts));
    expect(layout.dateTicks.length).toBeGreaterThanOrEqual(3);
    expect(layout.dateTicks[0].label).toMatch(/^\d{4}-\d{2}$/);
  });
});
