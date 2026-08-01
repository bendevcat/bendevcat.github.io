import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = ['Actus', 'DevOps', 'Outils', 'Sécurité', 'Geekerie', 'Tutos', 'IA'] as const;
export const PROJECT_STATUSES = ['actif', 'wip', 'archivé'] as const;

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

// Schéma repris verbatim de la spec de design §3.2. Page bundles comme `blog` :
// `src/content/projects/<slug>/index.md` + images co-localisées, pour que
// `image()` optimise les couvertures. Pas de champ `draft` : la spec n'en
// prévoit pas pour les projets.
const projects = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(PROJECT_STATUSES).default('actif'),
    startDate: z.coerce.date().optional(),
    stack: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    repoUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    relatedPosts: z.array(reference('blog')).optional(),
  }),
});

export const collections = { blog, projects };
