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
    // Plan 15 (D104) : rôle d'une techno de `stack`, cité mot pour mot dans le
    // titre, la description ou le corps du projet (src/lib/projectContent.test.ts).
    stackRoles: z.array(z.object({
      name: z.string(),
      role: z.string(),
    })).optional(),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    // Plan 15 (D102) : identifiant de licence tel qu'écrit dans le LICENSE du
    // dépôt du projet — vide tant qu'aucune source n'existe.
    license: z.string().optional(),
    repoUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
    // Plan 15 (D103) : fenêtre de code de l'onglet Aperçu — un fichier réel du
    // dépôt du projet, recopié tel quel ; `snippetFile` = son chemin dans ce dépôt.
    snippetFile: z.string().optional(),
    snippet: z.string().optional(),
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
    // Plan 16 : `{nom}` dans `prompt` est une variable seulement si `nom` est
    // déclaré dans `variables` (src/lib/promptWindow.ts) ; toute autre accolade
    // reste littérale.
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
    // Plan 16 (D111) : date de la version, affichée « v<version> — <date> » sur
    // la fiche prompt ; vide tant qu'aucune source ne la donne.
    updated: z.coerce.date().optional(),
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
    // Plan 17 (D115, D116) : champs de la fiche skill, tous facultatifs et
    // remplis uniquement depuis le plugin réel (contrôle local :
    // scripts/check-skill-sources.mjs ; invariants CI : src/lib/skillContent.test.ts).
    // Comptes lus dans l'arbre du plugin (`skills/*/SKILL.md`, `commands/*.md`).
    skillCount: z.number().int().min(0).optional(),
    commandCount: z.number().int().min(0).optional(),
    // Note sous les étapes de la fenêtre d'installation, citée d'une source.
    installNote: z.string().optional(),
    // `Ce que fait ce skill` : phrases citées de la doc du plugin ou du corps.
    highlights: z.array(z.string()).optional(),
    // Onglet déclencheurs : phrases citées des descriptions SKILL.md / README.
    triggers: z.array(z.string()).optional(),
    // Onglet versions, du plus récent au plus ancien ; `maj.` = date de la
    // ligne de `version` (pas de champ `updated`, D117).
    changelog: z.array(z.object({
      version: z.string(),
      date: z.coerce.date(),
      text: z.string(),
    })).optional(),
    // Explorateur : extrait = premières lignes verbatim (≤ 16, arrêt avant la
    // première ligne portant une adresse e-mail) ; `lines` = total du fichier.
    files: z.array(z.object({
      path: z.string(),
      lines: z.number().int().positive(),
      excerpt: z.string(),
    })).optional(),
    // Révision des fichiers : commit (`3dc3336`) ou version (`6.4.1`).
    filesSource: z.string().optional(),
    draft: z.boolean().default(false),
    relatedPrompts: z.array(reference('prompts')).optional(),
  }),
});

export const collections = { blog, projects, prompts, skills };
