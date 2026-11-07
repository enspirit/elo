import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // Content Layer glob loader (Astro 5+). The entry id is the filename without
  // extension — e.g. 20241225-building-elo-with-claude — so blog URLs are
  // unchanged from the legacy `type: 'content'` slug.
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string(),
    lead: z.string(),
  }),
});

export const collections = { blog };
