import { defineConfig } from 'astro/config';
import remarkAttachments from './scripts/remark-attachments.mjs';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkAttachments],
  },
});
