import { existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';

function isExternal(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('#');
}

function isAnchored(url) {
  return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
}

function toPosix(p) {
  return sep === '/' ? p : p.split(sep).join('/');
}

function walk(node, fn) {
  fn(node);
  if (Array.isArray(node.children)) for (const child of node.children) walk(child, fn);
}

export default function remarkAttachments() {
  const attachmentsDir = resolve(process.cwd(), 'content/attachments');
  return (tree, file) => {
    const filePath = file?.history?.[0] ?? file?.path;
    if (!filePath) return;
    const fileDir = dirname(filePath);
    walk(tree, (node) => {
      if (node.type !== 'image' || typeof node.url !== 'string') return;
      const url = node.url;
      if (!url || isExternal(url) || isAnchored(url)) return;
      const stripped = url.replace(/^attachments\//, '');
      const candidate = resolve(attachmentsDir, stripped);
      if (!existsSync(candidate)) return;
      node.url = toPosix(relative(fileDir, candidate));
    });
  };
}
