type PostLike = { id: string; data: { date: Date } };

/**
 * ファイル名の先頭が `YYYY-MM-DD_HH-MM-SS` 形式なら、その時刻を秒に変換して返す。
 * キャプチャバー/compose 経由で作成された投稿はこの形式（src/pages/index.astro, src/pages/compose/[type].astro）。
 * 意味のあるスラッグ命名（例: sapiens-1）は 0 を返す。
 */
export function filenameTimeSeconds(id: string): number {
  const m = id.match(/^\d{4}-\d{2}-\d{2}_(\d{2})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * 投稿を新しい順で並べる。
 * 第1キーは frontmatter の date、同日は第2キーとしてファイル名の時刻で並べる。
 * 第2キーが同値（両方ともタイムスタンプ形式でない）場合は元順序を維持（stable sort）。
 */
export function sortPostsDesc<T extends PostLike>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => {
    const dt = b.data.date.getTime() - a.data.date.getTime();
    if (dt !== 0) return dt;
    return filenameTimeSeconds(b.id) - filenameTimeSeconds(a.id);
  });
}
