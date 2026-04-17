const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

export function tokenize(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  const parts = text.toLowerCase().split(/[\s\p{P}\p{S}]+/u);
  for (const part of parts) {
    if (!part) continue;
    if (!CJK_RE.test(part)) {
      tokens.push(part);
      continue;
    }
    let run = '';
    const flushRun = () => {
      if (run.length <= 1) {
        if (run) tokens.push(run);
      } else {
        for (let i = 0; i < run.length - 1; i++) {
          tokens.push(run.slice(i, i + 2));
        }
      }
      run = '';
    };
    let latin = '';
    const flushLatin = () => {
      if (latin) tokens.push(latin);
      latin = '';
    };
    for (const ch of part) {
      if (CJK_RE.test(ch)) {
        flushLatin();
        run += ch;
      } else {
        flushRun();
        latin += ch;
      }
    }
    flushRun();
    flushLatin();
  }
  return tokens;
}
