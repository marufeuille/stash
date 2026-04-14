#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = resolve('content');
const OUT_PATH = resolve('src/data/recent-summary.json');
const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN;

const SCOPES = [
  {
    key: 'all',
    subdirs: ['note', 'reading', 'photo'],
    mode: 'days',
    value: 14,
    emptyText: 'このところ、なにも考えていないようです。',
    systemPrompt:
      '与えられた直近のメモ群を元に、「最近このサイトの主はこういうことを考えているようです」という第三者視点の観察を日本語で1〜2文、最大80字で書いてください。断定を避け、「〜のよう」「〜らしい」などの柔らかい語尾を使ってください。箇条書き禁止、前置き禁止、本文のみ。',
  },
  {
    key: 'note',
    subdirs: ['note'],
    mode: 'count',
    value: 5,
    emptyText: 'まだ何も書き留めていないようです。',
    systemPrompt:
      '与えられた直近のnote群を元に、「最近このサイトの主がnoteに書き留めているテーマ」を第三者視点で日本語1〜2文、最大80字で書いてください。断定を避け柔らかい語尾。箇条書き禁止、前置き禁止、本文のみ。',
  },
  {
    key: 'reading',
    subdirs: ['reading'],
    mode: 'count',
    value: 5,
    emptyText: 'まだ何も読んでいないようです。',
    systemPrompt:
      '与えられた直近のreading(読書メモ)群を元に、「最近このサイトの主が読んでいるものの傾向」を第三者視点で日本語1〜2文、最大80字で書いてください。断定を避け柔らかい語尾。箇条書き禁止、前置き禁止、本文のみ。',
  },
];

function walkMd(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walkMd(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

function collectAll(subdirs) {
  const items = [];
  for (const sub of subdirs) {
    for (const f of walkMd(join(CONTENT_DIR, sub))) {
      const raw = readFileSync(f, 'utf8');
      const { data, content } = matter(raw);
      if (data.draft) continue;
      const date = data.date ? new Date(data.date) : null;
      if (!date || isNaN(date.getTime())) continue;
      items.push({
        type: sub,
        title: data.title || data.book || '',
        date,
        body: content.trim(),
      });
    }
  }
  items.sort((a, b) => b.date - a.date);
  return items;
}

function selectForScope(scope) {
  const all = collectAll(scope.subdirs);
  if (scope.mode === 'days') {
    const cutoff = new Date(Date.now() - scope.value * 24 * 60 * 60 * 1000);
    return all.filter((it) => it.date >= cutoff);
  }
  return all.slice(0, scope.value);
}

function buildPrompt(items) {
  return items
    .map((it, i) => {
      const d = it.date.toISOString().slice(0, 10);
      return `[${i + 1}] (${it.type}, ${d}) ${it.title}\n${it.body}`;
    })
    .join('\n\n---\n\n');
}

async function summarize(systemPrompt, items) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildPrompt(items) },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`Workers AI error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.result?.response;
  if (!text) throw new Error(`unexpected response: ${JSON.stringify(json)}`);
  return text.trim();
}

async function runScope(scope) {
  const items = selectForScope(scope);
  console.log(`[${scope.key}] ${items.length} items`);
  if (items.length === 0) return { text: scope.emptyText, count: 0 };
  if (!ACCOUNT_ID || !API_TOKEN) return { text: null, count: items.length };
  try {
    const text = await summarize(scope.systemPrompt, items);
    console.log(`[${scope.key}] ${text}`);
    return { text, count: items.length };
  } catch (err) {
    console.error(`[${scope.key}] failed:`, err);
    return { text: null, count: items.length, error: String(err) };
  }
}

const payload = { generatedAt: new Date().toISOString() };
for (const scope of SCOPES) {
  payload[scope.key] = await runScope(scope);
}

mkdirSync(resolve('src/data'), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
console.log('Wrote', OUT_PATH);
