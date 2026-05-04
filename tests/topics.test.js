import { describe, it, expect, vi } from 'vitest';
import {
  parseStage,
  slugifyStage,
  groupByStage,
  splitSummary,
  validateTopicReferences,
  parentBreakpoints,
} from '../src/lib/topics.ts';

function makePost({ type = 'note', id, date, title = id, stage, summary = false, topic }) {
  return {
    id,
    body: '',
    collection: type,
    data: {
      type,
      title,
      date: new Date(date),
      tags: [],
      follows: [],
      draft: false,
      topic,
      stage,
      summary,
    },
  };
}

function makeTopic({ slug, title = slug, stages = [] }) {
  return {
    id: slug,
    body: '',
    collection: 'topic',
    data: {
      type: 'topic',
      slug,
      title,
      stages,
      draft: false,
    },
  };
}

describe('parseStage', () => {
  it('単一ステージ', () => {
    expect(parseStage('成魚')).toEqual({
      raw: '成魚',
      parts: ['成魚'],
      parent: null,
      leaf: '成魚',
      depth: 1,
    });
  });

  it('スラッシュ区切り階層', () => {
    expect(parseStage('針子/水')).toEqual({
      raw: '針子/水',
      parts: ['針子', '水'],
      parent: '針子',
      leaf: '水',
      depth: 2,
    });
  });

  it('前後空白と空セグメントを除去', () => {
    expect(parseStage('  針子 / 水  ')).toEqual({
      raw: '針子 / 水',
      parts: ['針子', '水'],
      parent: '針子',
      leaf: '水',
      depth: 2,
    });
  });
});

describe('slugifyStage', () => {
  it('スラッシュをハイフンに変換', () => {
    expect(slugifyStage('針子/水')).toBe(encodeURIComponent('針子-水'));
  });

  it('単一でもエンコードされる', () => {
    expect(slugifyStage('成魚')).toBe(encodeURIComponent('成魚'));
  });
});

describe('groupByStage', () => {
  it('stages 配列の順でグルーピングする', () => {
    const stages = ['卵', '針子/水', '成魚'];
    const posts = [
      makePost({ id: 'a', date: '2026-04-01', stage: '針子/水' }),
      makePost({ id: 'b', date: '2026-04-02', stage: '卵' }),
      makePost({ id: 'c', date: '2026-04-03', stage: '成魚' }),
    ];
    const { groups } = groupByStage(posts, stages);
    expect(groups.map((g) => g.stage)).toEqual(stages);
    expect(groups[0].entries.map((e) => e.id)).toEqual(['b']);
    expect(groups[1].entries.map((e) => e.id)).toEqual(['a']);
    expect(groups[2].entries.map((e) => e.id)).toEqual(['c']);
  });

  it('同ステージ内は新しい順に並ぶ', () => {
    const posts = [
      makePost({ id: 'old', date: '2026-04-01', stage: '針子/水' }),
      makePost({ id: 'new', date: '2026-04-10', stage: '針子/水' }),
    ];
    const { groups } = groupByStage(posts, ['針子/水']);
    expect(groups[0].entries.map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('未指定/未定義ステージは uncategorized へ', () => {
    const posts = [
      makePost({ id: 'a', date: '2026-04-01' }),
      makePost({ id: 'b', date: '2026-04-02', stage: '存在しない' }),
      makePost({ id: 'c', date: '2026-04-03', stage: '卵' }),
    ];
    const { groups, uncategorized } = groupByStage(posts, ['卵']);
    expect(groups[0].entries.map((e) => e.id)).toEqual(['c']);
    expect(uncategorized.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
});

describe('splitSummary', () => {
  it('summary: true の最新が現役、残りが過去', () => {
    const entries = [
      makePost({ id: 'sum-old', date: '2026-04-01', summary: true }),
      makePost({ id: 'reg', date: '2026-04-02' }),
      makePost({ id: 'sum-new', date: '2026-04-10', summary: true }),
      makePost({ id: 'sum-mid', date: '2026-04-05', summary: true }),
    ];
    const { latestSummary, pastSummaries, regular } = splitSummary(entries);
    expect(latestSummary?.id).toBe('sum-new');
    expect(pastSummaries.map((e) => e.id)).toEqual(['sum-mid', 'sum-old']);
    expect(regular.map((e) => e.id)).toEqual(['reg']);
  });

  it('summary が無いと latestSummary は null', () => {
    const entries = [makePost({ id: 'a', date: '2026-04-01' })];
    const { latestSummary, pastSummaries, regular } = splitSummary(entries);
    expect(latestSummary).toBeNull();
    expect(pastSummaries).toEqual([]);
    expect(regular.map((e) => e.id)).toEqual(['a']);
  });
});

describe('validateTopicReferences', () => {
  it('未存在 topic 参照を検出し warn する', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const posts = [
      makePost({ id: 'a', date: '2026-04-01', topic: 'medaka' }),
      makePost({ id: 'b', date: '2026-04-02', topic: 'unknown' }),
      makePost({ id: 'c', date: '2026-04-03' }),
    ];
    const topics = [makeTopic({ slug: 'medaka' })];
    const warnings = validateTopicReferences(posts, topics);
    expect(warnings).toEqual([{ postKey: 'note/b', topic: 'unknown' }]);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('全て解決できれば warn しない', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const posts = [makePost({ id: 'a', date: '2026-04-01', topic: 'medaka' })];
    const topics = [makeTopic({ slug: 'medaka' })];
    const warnings = validateTopicReferences(posts, topics);
    expect(warnings).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('parentBreakpoints', () => {
  it('親が変わるタイミングで親キーを返す', () => {
    const stages = ['卵', '針子/水', '針子/餌', '成魚'];
    expect(parentBreakpoints(stages)).toEqual([null, '針子', null, null]);
  });

  it('全てフラットなら全て null', () => {
    expect(parentBreakpoints(['卵', '針子', '成魚'])).toEqual([null, null, null]);
  });

  it('複数の親グループ', () => {
    const stages = ['針子/水', '針子/餌', '成魚/水', '成魚/餌'];
    expect(parentBreakpoints(stages)).toEqual(['針子', null, '成魚', null]);
  });
});
