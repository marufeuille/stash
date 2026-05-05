import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');

describe('ビルド検証と最終調整', () => {
  beforeAll(() => {
    execSync('npx astro build', { cwd: ROOT, stdio: 'pipe' });
  }, 120_000);

  describe('astro build がエラーなく成功する', () => {
    it('dist/ ディレクトリが生成される', () => {
      expect(existsSync(DIST)).toBe(true);
    });

    it('index.html が生成される', () => {
      expect(existsSync(resolve(DIST, 'index.html'))).toBe(true);
    });

    it('公開済み投稿の詳細ページが全て生成される', () => {
      const expectedPages = [
        'photo/morning-sky/index.html',
        'reading/sapiens-1/index.html',
        'reading/sapiens-2/index.html',
        'note/tools-and-thinking/index.html',
      ];
      for (const page of expectedPages) {
        expect(existsSync(resolve(DIST, page))).toBe(true);
      }
    });
  });

  describe('dist/ に draft 投稿のHTMLファイルが存在しない', () => {
    it('draft: true の投稿ディレクトリが存在しない', () => {
      const draftPaths = [
        'note/silence-in-morning',
        'photo/green-park',
        'reading/design-of-everyday-things',
      ];
      for (const p of draftPaths) {
        expect(existsSync(resolve(DIST, p))).toBe(false);
      }
    });

    it('index.html に draft 投稿のリンクが含まれない', () => {
      const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
      expect(html).not.toContain('silence-in-morning');
      expect(html).not.toContain('green-park');
      expect(html).not.toContain('design-of-everyday-things');
    });

    it('draft 投稿のタイトルが index.html に含まれない', () => {
      const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
      // green-park の title は "近所の公園"
      expect(html).not.toContain('近所の公園');
    });
  });

  describe('全ページが正しく表示される', () => {
    it('トップページに html/head/body 構造がある', () => {
      const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="ja"');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('viewport');
    });

    it('各詳細ページに html/head/body 構造がある', () => {
      const pages = [
        'photo/morning-sky/index.html',
        'reading/sapiens-1/index.html',
        'reading/sapiens-2/index.html',
        'note/tools-and-thinking/index.html',
      ];
      for (const page of pages) {
        const html = readFileSync(resolve(DIST, page), 'utf-8');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html lang="ja"');
      }
    });

    it('photo 詳細ページに画像が表示される', () => {
      const html = readFileSync(resolve(DIST, 'photo/morning-sky/index.html'), 'utf-8');
      expect(html).toContain('<img');
      expect(html).toContain('webp');
      expect(html).toContain('朝焼けの空');
      expect(html).toContain('オレンジとピンクに染まった朝焼けの空');
    });

    it('reading 詳細ページにメタ情報が表示される', () => {
      const html = readFileSync(resolve(DIST, 'reading/sapiens-1/index.html'), 'utf-8');
      expect(html).toContain('サピエンス全史');
      expect(html).toContain('ユヴァル・ノア・ハラリ');
      expect(html).toContain('第1章');
      expect(html).toContain('認知革命の衝撃');
    });

    it('note 詳細ページに本文が表示される', () => {
      const html = readFileSync(resolve(DIST, 'note/tools-and-thinking/index.html'), 'utf-8');
      expect(html).toContain('道具と思考の関係');
      expect(html).toContain('道具が変わると思考のかたちも変わる');
    });
  });

  describe('トップページ → 詳細ページの遷移がすべて正常に動作する', () => {
    it('トップページの全リンク先が実在する', () => {
      const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
      const linkMatches = [...html.matchAll(/href="(\/(?:photo|reading|note)\/[^"]*?)"/g)];
      expect(linkMatches.length).toBeGreaterThanOrEqual(4);

      for (const match of linkMatches) {
        const linkPath = match[1]; // e.g. /photo/morning-sky/ or /photo/morning-sky
        const normalized = linkPath.endsWith('/') ? linkPath : linkPath + '/';
        const filePath = resolve(DIST, normalized.slice(1), 'index.html');
        expect(existsSync(filePath), `Missing page for link: ${linkPath}`).toBe(true);
      }
    });

    it('詳細ページからトップページに戻れる', () => {
      const pages = [
        'photo/morning-sky/index.html',
        'reading/sapiens-1/index.html',
        'note/tools-and-thinking/index.html',
      ];
      for (const page of pages) {
        const html = readFileSync(resolve(DIST, page), 'utf-8');
        expect(html).toContain('href="/"');
      }
    });
  });

  describe('壊れたリンクや表示崩れがない', () => {
    it('画像アセットが dist/_astro/ に存在する', () => {
      const astroDir = resolve(DIST, '_astro');
      expect(existsSync(astroDir)).toBe(true);
      const files = readdirSync(astroDir);
      const webpFiles = files.filter((f) => f.endsWith('.webp'));
      expect(webpFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('トップページの画像 src が実在するファイルを指す', () => {
      const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
      const imgMatches = [...html.matchAll(/src="(\/_astro\/[^"]+)"/g)];
      for (const match of imgMatches) {
        const imgPath = resolve(DIST, match[1].slice(1));
        expect(existsSync(imgPath), `Missing image: ${match[1]}`).toBe(true);
      }
    });

    it('詳細ページの画像 src が実在するファイルを指す', () => {
      const html = readFileSync(resolve(DIST, 'photo/morning-sky/index.html'), 'utf-8');
      const imgMatches = [...html.matchAll(/src="(\/_astro\/[^"]+)"/g)];
      expect(imgMatches.length).toBeGreaterThanOrEqual(1);
      for (const match of imgMatches) {
        const imgPath = resolve(DIST, match[1].slice(1));
        expect(existsSync(imgPath), `Missing image: ${match[1]}`).toBe(true);
      }
    });

    it('レスポンシブ用の meta viewport が全ページに存在する', () => {
      const pages = [
        'index.html',
        'photo/morning-sky/index.html',
        'reading/sapiens-1/index.html',
        'note/tools-and-thinking/index.html',
      ];
      for (const page of pages) {
        const html = readFileSync(resolve(DIST, page), 'utf-8');
        expect(html).toContain('width=device-width');
      }
    });
  });
});
