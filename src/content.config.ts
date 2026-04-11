import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const photo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/photo' }),
  schema: z.object({
    type: z.literal('photo'),
    title: z.string().optional(),
    date: z.coerce.date(),
    image: z.string(),
    alt: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const reading = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/reading' }),
  schema: z.object({
    type: z.literal('reading'),
    title: z.string().optional(),
    date: z.coerce.date(),
    book: z.string(),
    author: z.string(),
    progress: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const note = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/note' }),
  schema: z.object({
    type: z.literal('note'),
    title: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { photo, reading, note };
