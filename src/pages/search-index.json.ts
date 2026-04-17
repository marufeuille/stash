import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/buildSearchIndex';

export const GET: APIRoute = async () => {
  const entries = await buildSearchIndex();
  return new Response(JSON.stringify(entries), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
};
