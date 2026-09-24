import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = ['Actus', 'DevOps', 'Outils', 'Sécurité', 'Geekerie', 'Tutos', 'IA'] as const;
export const PROJECT_STATUSES = ['actif', 'wip', 'archivé'] as const;
export const PROMPT_FORMATS = ['fiche', 'guide'] as const;

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

// Schémas repris verbatim de la spec de design §3.3 et §3.4. Page bundles comme
// `blog` et `projects` : `src/content/<coll>/<slug>/index.md`. Pas de champ
// `cover` dans ces deux schémas — d'où la forme `schema: z.object(...)` et non
// `schema: ({ image }) => ...` : le helper `image()` n'a rien à optimiser ici.
const prompts = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/prompts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    format: z.enum(PROMPT_FORMATS).default('fiche'),
    prompt: z.string().optional(),
    // Plan 14 (D94) : forme de l'inventaire §11, lue par la carte (`N variables`)
    // et par la fiche prompt (plan 16). Vide tant qu'aucune source n'existe.
    variables: z.array(z.object({
      name: z.string(),
      hint: z.string().optional(),
      default: z.string().optional(),
    })).optional(),
    tool: z.string().default('Claude'),
    model: z.string().optional(),
    // Plan 14 (D94) : pastille `v<version>` de la carte, masquée sans valeur.
    version: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    relatedSkills: z.array(reference('skills')).optional(),
  }),
});

// `type` reste une chaîne libre avec défaut 'claude-code' : la spec de design
// §3.4 le prévoit extensible (competence, howto…), et la spec P4 §5 garde
// l'élargissement hors périmètre du v1 — le champ est prêt, pas la donnée.
const skills = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/skills' }),
  schema: z.object({
    title: z.string(),
    name: z.string().optional(),
    description: z.string(),
    type: z.string().default('claude-code'),
    tags: z.array(z.string()).default([]),
    version: z.string().optional(),
    // Plan 14 (D95) : identifiant de licence tel qu'écrit dans le LICENSE du
    // plugin (ex. `MIT`) — rempli uniquement depuis cette source.
    license: z.string().optional(),
    repoUrl: z.string().url().optional(),
    installCmd: z.string().optional(),
    draft: z.boolean().default(false),
    relatedPrompts: z.array(reference('prompts')).optional(),
  }),
});

export const collections = { blog, projects, prompts, skills };
