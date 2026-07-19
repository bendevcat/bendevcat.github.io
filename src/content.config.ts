import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = ['Actus', 'DevOps', 'Outils', 'Sécurité', 'Geekerie', 'Tutos', 'IA'] as const;

const blog = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    aiUsage: z.enum(['none', 'partial', 'full']).optional(),
    featured: z.boolean().default(false),
    relatedProjects: z.array(reference('projects')).optional(), // collection projects arrive au Plan 3
  }),
});

export const collections = { blog };
