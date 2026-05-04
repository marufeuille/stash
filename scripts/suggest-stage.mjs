#!/usr/bin/env node
/**
 * 未分類ノート（topic 指定あり / stage 未指定）に対し、
 * `claude` CLI を spawn して stage を提案する手動スクリプト。
 *
 * Usage:
 *   node scripts/suggest-stage.mjs --topic <slug> [--limit 20] [--json]
 *
 * 出力:
 *   各候補ノートに対して YAML パッチ案を標準出力。
 *   書き換えはしない（read-only）。手で frontmatter を更新する運用。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = resolve(import.meta.dirname, '..');
const POST_TYPES = ['note', 'reading', 'photo', 'link'];
const PROMPT_BODY_LIMIT = 800;

function parseArgs(argv) {
  const out = { topic: null, limit: 20, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--topic') out.topic = argv[++i];
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--json') out.json = true;
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/suggest-stage.mjs --topic <slug> [--limit 20] [--json]');
      process.exit(0);
    }
  }
  return out;
}

function stripMarkdown(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadTopic(slug) {
  const path = join(ROOT, 'content', 'topic', `${slug}.md`);
  if (!existsSync(path)) {
    console.error(`Topic not found: ${path}`);
    process.exit(1);
  }
  const raw = readFileSync(path, 'utf-8');
  const { data } = matter(raw);
  if (!Array.isArray(data.stages) || data.stages.length === 0) {
    console.error(`Topic "${slug}" has no stages defined.`);
    process.exit(1);
  }
  return data;
}

function loadCandidates(slug, limit) {
  const out = [];
  for (const type of POST_TYPES) {
    const dir = join(ROOT, 'content', type);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const path = join(dir, file);
      const raw = readFileSync(path, 'utf-8');
      const parsed = matter(raw);
      const d = parsed.data;
      if (d.draft) continue;
      if (d.topic !== slug) continue;
      if (d.stage) continue;
      out.push({
        id: `${type}/${file.replace(/\.md$/, '')}`,
        path,
        type,
        title: d.title ?? '(untitled)',
        date: d.date ?? '',
        body: stripMarkdown(parsed.content).slice(0, PROMPT_BODY_LIMIT),
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function buildPrompt(stages, candidates) {
  const stageList = stages.map((s) => `  - ${s}`).join('\n');
  const noteBlocks = candidates
    .map((c) => `### ${c.id}\nタイトル: ${c.title}\n日付: ${c.date}\n本文:\n${c.body}`)
    .join('\n\n');
  return `あなたはトピック内のステージ分類を支援するアシスタントです。

候補ステージ:
${stageList}

未分類ノートそれぞれに、最も合うステージを上の候補から1つ選んでください。
判断に十分な情報がなければ confidence を下げてください。

返却フォーマットは JSON 配列のみ。前後に文章は不要。
[
  { "id": "note/xxxx", "stage": "針子/水", "confidence": 0.0-1.0, "reason": "短い理由" }
]

未分類ノート:

${noteBlocks}
`;
}

function callClaude(prompt) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn('claude', ['-p', '--output-format=text'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        rejectP(
          new Error(
            "`claude` CLI が見つかりません。Claude Code をインストールするか PATH を確認してください。",
          ),
        );
      } else {
        rejectP(err);
      }
    });
    child.on('close', (code) => {
      if (code !== 0) {
        rejectP(new Error(`claude CLI exited with code ${code}`));
        return;
      }
      resolveP(stdout);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`JSON array not found in claude output:\n${text}`);
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function printPatches(suggestions, candidatesById) {
  for (const s of suggestions) {
    const c = candidatesById.get(s.id);
    if (!c) continue;
    const conf = typeof s.confidence === 'number' ? s.confidence.toFixed(2) : '?';
    console.log(`# ${c.path.replace(ROOT + '/', '')}  (confidence: ${conf})`);
    if (s.reason) console.log(`# 理由: ${s.reason}`);
    console.log(`stage: ${s.stage}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.topic) {
    console.error('Error: --topic <slug> is required.');
    process.exit(1);
  }

  const topic = loadTopic(args.topic);
  const candidates = loadCandidates(args.topic, args.limit);

  if (candidates.length === 0) {
    console.error(`No unstaged notes found for topic "${args.topic}".`);
    process.exit(0);
  }

  const prompt = buildPrompt(topic.stages, candidates);
  const output = await callClaude(prompt);
  const suggestions = extractJson(output);

  const byId = new Map(candidates.map((c) => [c.id, c]));

  if (args.json) {
    console.log(JSON.stringify(suggestions, null, 2));
    return;
  }

  printPatches(suggestions, byId);
  console.error(`\n# ${suggestions.length} suggestion(s) for ${candidates.length} unstaged note(s).`);
  console.error('# (read-only — frontmatter を手動で更新してください)');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
