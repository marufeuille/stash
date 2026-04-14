#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = resolve('content');
const OUT_PATH = resolve('src/data/recent-summary.json');
const DAYS = 14;
const SUBDIRS = ['note', 'reading', 'photo'];
const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN;

const EMPTY_FALLBACK = 'このところ、なにも考えていないようです。';

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

function collectRecent() {
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const items = [];
  for (const sub of SUBDIRS) {
    for (const f of walkMd(join(CONTENT_DIR, sub))) {
      const raw = readFileSync(f, 'utf8');
      const { data, content } = matter(raw);
      if (data.draft) continue;
      const date = data.date ? new Date(data.date) : null;
      if (!date || isNaN(date.getTime()) || date < cutoff) continue;
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

function buildPrompt(items) {
  const lines = items.map((it, i) => {
    const d = it.date.toISOString().slice(0, 10);
    return `[${i + 1}] (${it.type}, ${d}) ${it.title}\n${it.body}`;
  });
  return lines.join('\n\n---\n\n');
}

async function summarize(items) {
  const userBody = buildPrompt(items);
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
          {
            role: 'system',
            content:
              '与えられた直近のメモ群を元に、「最近このサイトの主はこういうことを考えているようです」という第三者視点の観察を日本語で1〜2文、最大80字で書いてください。断定を避け、「〜のよう」「〜らしい」などの柔らかい語尾を使ってください。箇条書き禁止、前置き禁止、本文のみ。',
          },
          { role: 'user', content: userBody },
        ],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Workers AI error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const text = json?.result?.response;
  if (!text) throw new Error(`unexpected response: ${JSON.stringify(json)}`);
  return text.trim();
}

function writeOut(payload) {
  mkdirSync(resolve('src/data'), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
}

const items = collectRecent();
console.log(`Found ${items.length} recent items (last ${DAYS} days).`);

if (items.length === 0) {
  writeOut({ text: EMPTY_FALLBACK, count: 0, generatedAt: new Date().toISOString() });
  console.log('Wrote fallback summary.');
  process.exit(0);
}

if (!ACCOUNT_ID || !API_TOKEN) {
  console.warn('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_API_TOKEN not set — skipping AI call.');
  writeOut({ text: null, count: items.length, generatedAt: new Date().toISOString() });
  process.exit(0);
}

try {
  const text = await summarize(items);
  writeOut({ text, count: items.length, generatedAt: new Date().toISOString() });
  console.log(`Summary: ${text}`);
} catch (err) {
  console.error('Failed to generate summary:', err);
  writeOut({ text: null, count: items.length, generatedAt: new Date().toISOString(), error: String(err) });
  process.exit(0);
}
