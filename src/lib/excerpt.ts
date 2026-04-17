import { stripMarkdown } from './stripMarkdown';

export function excerpt(body: string | undefined, maxLen = 90): string {
  const stripped = stripMarkdown(body);
  if (!stripped) return '';
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}
