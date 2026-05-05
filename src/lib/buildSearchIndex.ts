import { getCollection } from 'astro:content';
import { excerpt } from './excerpt';
import { stripMarkdown } from './stripMarkdown';
import { sortPostsDesc } from './sortPosts';
import { buildGraph } from './graph';

export type SearchEntry = {
  id: string;
  type: 'note' | 'reading' | 'photo' | 'link' | 'topic';
  href: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  source?: string;
  body: string;
  follows: string[];
  topic?: string;
  stage?: string;
};

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const [photos, readings, notes, links, topics] = await Promise.all([
    getCollection('photo'),
    getCollection('reading'),
    getCollection('note'),
    getCollection('link'),
    getCollection('topic'),
  ]);

  const activePosts = [...notes, ...readings, ...photos, ...links].filter((p) => !p.data.draft);
  const graph = buildGraph(activePosts);
  const allPosts = sortPostsDesc(activePosts);

  const followsOf = (type: string, slug: string): string[] =>
    graph.parents.get(`${type}/${slug}`) ?? [];

  const postEntries = allPosts.map<SearchEntry>((p) => {
    const date = p.data.date.toISOString().slice(0, 10);
    const follows = followsOf(p.data.type, p.id);
    const topic = p.data.topic;
    const stage = p.data.stage;
    if (p.data.type === 'reading') {
      const title = p.data.title ?? p.data.book;
      const source = `${p.data.book} — ${p.data.author}`;
      return {
        id: `reading/${p.id}`,
        type: 'reading',
        href: `/reading/${p.id}/`,
        title,
        date,
        tags: p.data.tags,
        excerpt: excerpt(p.body, 140),
        source,
        body: stripMarkdown(p.body),
        follows,
        topic,
        stage,
      };
    }
    if (p.data.type === 'photo') {
      const title = p.data.title ?? 'Untitled';
      return {
        id: `photo/${p.id}`,
        type: 'photo',
        href: `/photo/${p.id}/`,
        title,
        date,
        tags: p.data.tags,
        excerpt: p.data.alt ?? '',
        body: p.data.alt ?? '',
        follows,
        topic,
        stage,
      };
    }
    if (p.data.type === 'link') {
      let host = '';
      try {
        host = new URL(p.data.url).hostname.replace(/^www\./, '');
      } catch {}
      const title = p.data.title ?? (host || 'Untitled');
      const ex = p.data.quote ?? excerpt(p.body, 140);
      return {
        id: `link/${p.id}`,
        type: 'link',
        href: `/link/${p.id}/`,
        title,
        date,
        tags: p.data.tags,
        excerpt: ex,
        source: host || p.data.url,
        body: [p.data.quote ?? '', stripMarkdown(p.body)].filter(Boolean).join(' '),
        follows,
        topic,
        stage,
      };
    }
    const title = p.data.title ?? 'Untitled';
    return {
      id: `note/${p.id}`,
      type: 'note',
      href: `/note/${p.id}/`,
      title,
      date,
      tags: p.data.tags,
      excerpt: excerpt(p.body, 140),
      body: stripMarkdown(p.body),
      follows,
      topic,
      stage,
    };
  });

  const topicEntries: SearchEntry[] = topics
    .filter((t) => !t.data.draft)
    .map<SearchEntry>((t) => ({
      id: `topic/${t.data.slug}`,
      type: 'topic',
      href: `/topic/${t.data.slug}/`,
      title: t.data.title,
      date: '',
      tags: [],
      excerpt: t.data.description ?? '',
      body: [t.data.description ?? '', t.data.stages.join(' ')].filter(Boolean).join(' '),
      follows: [],
      topic: t.data.slug,
    }));

  return [...topicEntries, ...postEntries];
}
