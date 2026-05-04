import type { CollectionEntry } from 'astro:content';
import { sortPostsDesc } from './sortPosts';

export type TopicEntry = CollectionEntry<'topic'>;

export type AggregablePost =
  | CollectionEntry<'note'>
  | CollectionEntry<'reading'>
  | CollectionEntry<'photo'>
  | CollectionEntry<'link'>;

export type ParsedStage = {
  raw: string;
  parts: string[];
  parent: string | null;
  leaf: string;
  depth: number;
};

export function parseStage(raw: string): ParsedStage {
  const trimmed = raw.trim();
  const parts = trimmed.split('/').map((p) => p.trim()).filter(Boolean);
  const depth = parts.length;
  const leaf = parts[depth - 1] ?? trimmed;
  const parent = depth > 1 ? parts.slice(0, -1).join('/') : null;
  return { raw: trimmed, parts, parent, leaf, depth };
}

/**
 * URL fragment 用の安定 ID。日本語などマルチバイト文字も
 * encodeURIComponent で扱えるが、`/` は `-` に置換しておく
 * （fragment 内では `/` も使えるが、見やすさのため）。
 */
export function slugifyStage(raw: string): string {
  return encodeURIComponent(raw.trim().replace(/\//g, '-'));
}

export type StageGroup = {
  stage: string;
  parsed: ParsedStage;
  entries: AggregablePost[];
};

/**
 * 投稿群をトピック内のステージごとにグルーピングする。
 * `stages` 配列の順を尊重し、未指定の値は維持。
 * 該当しない `stage` を持つ投稿、または `stage` が未指定の投稿は
 * `uncategorized` に集約される。
 */
export function groupByStage(
  posts: AggregablePost[],
  stages: string[],
): { groups: StageGroup[]; uncategorized: AggregablePost[] } {
  const stageSet = new Set(stages);
  const buckets = new Map<string, AggregablePost[]>();
  for (const s of stages) buckets.set(s, []);
  const uncategorized: AggregablePost[] = [];

  for (const post of posts) {
    const s = post.data.stage;
    if (s && stageSet.has(s)) {
      buckets.get(s)!.push(post);
    } else {
      uncategorized.push(post);
    }
  }

  const groups: StageGroup[] = stages.map((stage) => ({
    stage,
    parsed: parseStage(stage),
    entries: sortPostsDesc(buckets.get(stage) ?? []),
  }));

  return { groups, uncategorized: sortPostsDesc(uncategorized) };
}

/**
 * 同一ステージのエントリを「現役の結論 / 過去の結論 / 通常」に3分割する。
 * `summary: true` のうち最新が現役、残りが過去、それ以外が通常。
 */
export function splitSummary(entries: AggregablePost[]): {
  latestSummary: AggregablePost | null;
  pastSummaries: AggregablePost[];
  regular: AggregablePost[];
} {
  const summaries = sortPostsDesc(entries.filter((e) => e.data.summary === true));
  const regular = sortPostsDesc(entries.filter((e) => e.data.summary !== true));
  const [latest, ...rest] = summaries;
  return {
    latestSummary: latest ?? null,
    pastSummaries: rest,
    regular,
  };
}

export type TopicReferenceWarning = {
  postKey: string;
  topic: string;
};

/**
 * 投稿が参照する `topic` slug が実在するか検証する。
 * 未存在のものを警告として返し、副作用としても `console.warn` する。
 * ビルドは止めない（運用 typo で全ビルドが落ちると摩擦が増えるため）。
 */
export function validateTopicReferences(
  posts: AggregablePost[],
  topics: TopicEntry[],
): TopicReferenceWarning[] {
  const known = new Set(topics.map((t) => t.data.slug));
  const warnings: TopicReferenceWarning[] = [];
  for (const p of posts) {
    const t = p.data.topic;
    if (!t) continue;
    if (!known.has(t)) {
      warnings.push({ postKey: `${p.data.type}/${p.id}`, topic: t });
    }
  }
  if (warnings.length > 0) {
    const list = warnings.map((w) => `  - ${w.postKey} → topic="${w.topic}"`).join('\n');
    console.warn(`[topics] ${warnings.length} unresolved topic reference(s):\n${list}`);
  }
  return warnings;
}

/**
 * トピック詳細での「親見出しの差し込み」用ユーティリティ。
 * `stages` を順に走査し、直前と `parent` が変わるタイミングで親キーを返す。
 * 親が同じ間は null。
 */
export function parentBreakpoints(stages: string[]): (string | null)[] {
  let lastParent: string | null = null;
  return stages.map((stage) => {
    const parsed = parseStage(stage);
    const head = parsed.parts[0] ?? null;
    if (parsed.depth >= 2 && head !== lastParent) {
      lastParent = head;
      return head;
    }
    if (parsed.depth < 2) {
      lastParent = null;
    }
    return null;
  });
}
