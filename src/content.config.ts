import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const followsField = z.array(z.string()).default([]);
const topicField = z.string().optional();
const stageField = z.string().optional();
const summaryField = z.boolean().default(false);

const photo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/photo' }),
  schema: ({ image }) =>
    z.object({
      type: z.literal('photo'),
      title: z.string().optional(),
      date: z.coerce.date(),
      image: image(),
      alt: z.string(),
      tags: z.array(z.string()).default([]),
      follows: followsField,
      topic: topicField,
      stage: stageField,
      summary: summaryField,
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
    follows: followsField,
    topic: topicField,
    stage: stageField,
    summary: summaryField,
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
    follows: followsField,
    topic: topicField,
    stage: stageField,
    summary: summaryField,
    draft: z.boolean().default(false),
  }),
});

const link = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/link' }),
  schema: z.object({
    type: z.literal('link'),
    title: z.string().optional(),
    date: z.coerce.date(),
    url: z.string().url(),
    quote: z.string().optional(),
    tags: z.array(z.string()).default([]),
    follows: followsField,
    topic: topicField,
    stage: stageField,
    summary: summaryField,
    draft: z.boolean().default(false),
  }),
});

const topic = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/topic' }),
  schema: z.object({
    type: z.literal('topic'),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    stages: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const meta = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/meta' }),
  schema: z.object({
    title: z.string().optional(),
  }),
});

export const collections = { photo, reading, note, link, topic, meta };
