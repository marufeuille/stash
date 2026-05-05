#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTENT_DIR = resolve('content');
const LOCAL_VAULT = process.env.STASH_VAULT_PATH;
const REPO = process.env.STASH_VAULT_REPO;
const TOKEN = process.env.STASH_VAULT_TOKEN;
const BRANCH = process.env.STASH_VAULT_BRANCH || 'main';

const SUBDIRS = ['note', 'reading', 'photo', 'link', 'topic', 'attachments'];
const ROOT_FILES = [{ from: 'about.md', to: 'meta/about.md' }];

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function cleanContent() {
  if (existsSync(CONTENT_DIR)) rmSync(CONTENT_DIR, { recursive: true, force: true });
  mkdirSync(CONTENT_DIR, { recursive: true });
}

function syncFrom(src) {
  for (const sub of SUBDIRS) {
    const from = resolve(src, sub);
    if (existsSync(from)) {
      cpSync(from, resolve(CONTENT_DIR, sub), { recursive: true });
    }
  }
  for (const { from, to } of ROOT_FILES) {
    const fromPath = resolve(src, from);
    if (existsSync(fromPath)) {
      const toPath = resolve(CONTENT_DIR, to);
      mkdirSync(resolve(toPath, '..'), { recursive: true });
      cpSync(fromPath, toPath);
    }
  }
}

if (LOCAL_VAULT) {
  const src = resolve(LOCAL_VAULT);
  if (!existsSync(src)) {
    console.error(`STASH_VAULT_PATH not found: ${src}`);
    process.exit(1);
  }
  if (src === CONTENT_DIR) {
    console.error(`STASH_VAULT_PATH must not be the content dir itself: ${src}`);
    process.exit(1);
  }
  console.log(`Syncing content from local vault: ${src}`);
  cleanContent();
  syncFrom(src);
  console.log('Content synced from local vault.');
  process.exit(0);
}

if (!REPO) {
  console.error(
    'Neither STASH_VAULT_PATH nor STASH_VAULT_REPO is set. ' +
      'Set STASH_VAULT_PATH=/path/to/vault for local dev, ' +
      'or STASH_VAULT_REPO=owner/repo (+ STASH_VAULT_TOKEN for private repos) for CI.',
  );
  process.exit(1);
}

const url = TOKEN
  ? `https://${TOKEN}@github.com/${REPO}.git`
  : `https://github.com/${REPO}.git`;

console.log(`Cloning vault repo: ${REPO} (branch: ${BRANCH})`);
const TMP = resolve('.vault-tmp');
if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
run(`git clone --depth=1 --branch=${BRANCH} ${url} ${TMP}`);

cleanContent();
syncFrom(TMP);
rmSync(TMP, { recursive: true, force: true });
console.log('Content synced from vault repo.');
