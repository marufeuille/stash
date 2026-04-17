import type { CollectionEntry } from 'astro:content';
import { filenameTimeSeconds } from './sortPosts';

export type PostType = 'note' | 'reading' | 'photo' | 'link';

export type GraphNode = {
  key: string;
  type: PostType;
  id: string;
  href: string;
  title: string;
  date: Date;
  tags: string[];
  follows: string[];
};

export type GraphEdge = {
  from: string;
  to: string;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byKey: Map<string, GraphNode>;
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
};

type AnyPost =
  | CollectionEntry<'note'>
  | CollectionEntry<'reading'>
  | CollectionEntry<'photo'>
  | CollectionEntry<'link'>;

function titleOf(post: AnyPost): string {
  const t = post.data.title;
  if (t) return t;
  if (post.data.type === 'reading') return post.data.book;
  if (post.data.type === 'link') {
    try {
      return new URL(post.data.url).hostname.replace(/^www\./, '');
    } catch {
      return 'Untitled';
    }
  }
  return 'Untitled';
}

function keyOf(post: AnyPost): string {
  return `${post.data.type}/${post.id}`;
}

export function buildGraph(posts: AnyPost[]): Graph {
  const active = posts.filter((p) => !p.data.draft);
  const nodes: GraphNode[] = active.map((p) => ({
    key: keyOf(p),
    type: p.data.type,
    id: p.id,
    href: `/${p.data.type}/${p.id}/`,
    title: titleOf(p),
    date: p.data.date,
    tags: p.data.tags,
    follows: p.data.follows ?? [],
  }));

  const byKey = new Map<string, GraphNode>();
  for (const n of nodes) byKey.set(n.key, n);

  // Also index by bare slug to allow terse references (first match wins).
  const bareIndex = new Map<string, string>();
  for (const n of nodes) {
    if (!bareIndex.has(n.id)) bareIndex.set(n.id, n.key);
  }

  const edges: GraphEdge[] = [];
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    parents.set(n.key, []);
    children.set(n.key, []);
  }

  for (const n of nodes) {
    for (const rawRef of n.follows) {
      const ref = rawRef.trim();
      if (!ref) continue;
      let parentKey: string | undefined;
      if (byKey.has(ref)) {
        parentKey = ref;
      } else if (bareIndex.has(ref)) {
        parentKey = bareIndex.get(ref);
      }
      if (!parentKey || parentKey === n.key) continue;
      edges.push({ from: parentKey, to: n.key });
      parents.get(n.key)!.push(parentKey);
      children.get(parentKey)!.push(n.key);
    }
  }

  return { nodes, edges, byKey, parents, children };
}

export type LaidOutNode = GraphNode & {
  x: number;
  y: number;
  lane: number;
};

export type Layout = {
  nodes: LaidOutNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  laneCount: number;
  dateTicks: { x: number; label: string }[];
};

export type LayoutOptions = {
  laneHeight?: number;
  minNodeSpacing?: number;
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
};

function timeValue(n: GraphNode): number {
  // Use date + filename seconds for stable ordering of same-day posts.
  return n.date.getTime() + filenameTimeSeconds(n.id) * 1000;
}

/**
 * Lay out the graph as a time-series DAG.
 * X axis is time (left = older). Each node is placed in a lane so that nodes
 * connected via follows tend to share a lane, and edges are drawn as curves.
 */
export function layoutGraph(graph: Graph, opts: LayoutOptions = {}): Layout {
  const laneHeight = opts.laneHeight ?? 34;
  const minNodeSpacing = opts.minNodeSpacing ?? 28;
  const paddingX = opts.paddingX ?? 32;
  const paddingY = opts.paddingY ?? 32;
  const minWidth = opts.minWidth ?? 640;

  const sorted = [...graph.nodes].sort((a, b) => timeValue(a) - timeValue(b));
  if (sorted.length === 0) {
    return {
      nodes: [],
      edges: graph.edges,
      width: minWidth,
      height: paddingY * 2 + laneHeight,
      laneCount: 0,
      dateTicks: [],
    };
  }

  const minT = timeValue(sorted[0]);
  const maxT = timeValue(sorted[sorted.length - 1]);
  const span = Math.max(1, maxT - minT);

  // Compute inner width: scale so the narrowest interval is at least minNodeSpacing.
  const innerWidthBase = Math.max(minWidth - paddingX * 2, 400);
  // We'll place nodes proportional to time within inner width.
  const innerWidth = innerWidthBase;

  const laneLastX: number[] = [];
  const nodeLane = new Map<string, number>();
  const nodeX = new Map<string, number>();

  for (const n of sorted) {
    const t = timeValue(n);
    const x = paddingX + ((t - minT) / span) * innerWidth;
    nodeX.set(n.key, x);

    const parentKeys = graph.parents.get(n.key) ?? [];
    // Prefer the lane of the most recent parent (last in sorted order among parents).
    let preferredLanes: number[] = [];
    for (const pk of parentKeys) {
      const lane = nodeLane.get(pk);
      if (lane !== undefined) preferredLanes.push(lane);
    }
    // Deduplicate while preserving order.
    preferredLanes = [...new Set(preferredLanes)];

    let chosen = -1;
    for (const lane of preferredLanes) {
      if (laneLastX[lane] === undefined || laneLastX[lane] + minNodeSpacing <= x) {
        chosen = lane;
        break;
      }
    }
    if (chosen === -1) {
      for (let i = 0; i < laneLastX.length; i++) {
        if (laneLastX[i] + minNodeSpacing <= x) {
          chosen = i;
          break;
        }
      }
    }
    if (chosen === -1) {
      chosen = laneLastX.length;
      laneLastX.push(x);
    } else {
      laneLastX[chosen] = x;
    }
    nodeLane.set(n.key, chosen);
  }

  const laneCount = laneLastX.length;
  const height = paddingY * 2 + Math.max(1, laneCount) * laneHeight;
  const width = paddingX * 2 + innerWidth;

  const laidOut: LaidOutNode[] = sorted.map((n) => {
    const lane = nodeLane.get(n.key)!;
    return {
      ...n,
      x: nodeX.get(n.key)!,
      y: paddingY + lane * laneHeight + laneHeight / 2,
      lane,
    };
  });

  const dateTicks = buildDateTicks(sorted[0].date, sorted[sorted.length - 1].date, minT, span, paddingX, innerWidth);

  return {
    nodes: laidOut,
    edges: graph.edges,
    width,
    height,
    laneCount,
    dateTicks,
  };
}

function buildDateTicks(
  start: Date,
  end: Date,
  minT: number,
  span: number,
  paddingX: number,
  innerWidth: number,
): { x: number; label: string }[] {
  const ticks: { x: number; label: string }[] = [];
  const startDay = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDay = new Date(end.getFullYear(), end.getMonth() + 1, 1);
  const seen = new Set<string>();
  for (let d = new Date(startDay); d <= endDay; d.setMonth(d.getMonth() + 1)) {
    const t = d.getTime();
    const x = paddingX + ((t - minT) / span) * innerWidth;
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (seen.has(label)) continue;
    seen.add(label);
    ticks.push({ x, label });
  }
  return ticks;
}

/**
 * Extract an ego-network around a given node: direct parents and children.
 * Used to render a small subgraph on detail pages.
 */
export function egoNetwork(graph: Graph, centerKey: string): {
  center: GraphNode | null;
  parents: GraphNode[];
  children: GraphNode[];
} {
  const center = graph.byKey.get(centerKey) ?? null;
  if (!center) return { center: null, parents: [], children: [] };
  const parents = (graph.parents.get(centerKey) ?? [])
    .map((k) => graph.byKey.get(k))
    .filter((n): n is GraphNode => !!n)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const children = (graph.children.get(centerKey) ?? [])
    .map((k) => graph.byKey.get(k))
    .filter((n): n is GraphNode => !!n)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return { center, parents, children };
}
