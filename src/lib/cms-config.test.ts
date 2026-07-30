import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'astro:content';
import { CATEGORIES, PROJECT_STATUSES } from '../content.config';

/**
 * Charge la config réelle du CMS (public/admin/config.yml) telle qu'elle sera
 * servie. Le test lit le fichier sur disque — pas une copie — pour que toute
 * dérive entre le CMS et le schéma Zod casse le build de tests.
 */
export function loadCmsConfig(): any {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

describe('config CMS — backend', () => {
  it('cible le repo GitHub du site, branche main, sans backend serveur', () => {
    const cfg = loadCmsConfig();
    expect(cfg.backend.name).toBe('github');
    expect(cfg.backend.repo).toBe('bendevcat/bendevcat.github.io');
    expect(cfg.backend.branch).toBe('main');
    // Aucun relais OAuth : ces clés doivent rester absentes (spec §5).
    expect(cfg.backend.base_url).toBeUndefined();
    expect(cfg.backend.auth_endpoint).toBeUndefined();
  });

  it('déclare exactement deux collections : blog et projects', () => {
    const cfg = loadCmsConfig();
    expect(cfg.collections).toHaveLength(2);
    expect(cfg.collections.map((c: any) => c.name)).toEqual(['blog', 'projects']);
  });
});

describe('page /admin', () => {
  it('épingle la version du CDN Sveltia et interdit l’indexation', () => {
    const html = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
    expect(html).toContain('https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js');
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);
    // Un tag flottant ferait sauter l’épinglage (spec §6.2).
    expect(html).not.toContain('@sveltia/cms/dist');
    expect(html).not.toContain('@latest');
  });

  it('vérifie l’intégrité du script CDN via SRI (spec I4)', () => {
    const html = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
    expect(html).toMatch(/integrity="sha384-/);
    expect(html).toContain('crossorigin="anonymous"');
  });
});

describe('config CMS — sortie', () => {
  it('omet les champs optionnels vides (le défaut Sveltia est false)', () => {
    expect(loadCmsConfig().output.omit_empty_optional_fields).toBe(true);
  });
});

describe('config CMS — repli média global', () => {
  it('fait pointer le repli média global dans src/, où Astro sait résoudre le chemin', () => {
    const cfg = loadCmsConfig();
    expect(cfg.media_folder).toBe('src/assets/uploads');
    expect(cfg.public_folder).toBe('/src/assets/uploads');
    // Hors de src/, une image choisie depuis l'onglet global casserait le build.
    expect(cfg.public_folder.startsWith('/src/')).toBe(true);
  });

  it('interdit la saisie d’une URL distante pour la couverture', () => {
    const cover = loadCmsConfig().collections[0].fields.find((f: any) => f.name === 'cover');
    expect(cover.choose_url).toBe(false);
  });
});

describe('config CMS — collection blog', () => {
  const blog = () => loadCmsConfig().collections[0];
  const fieldNames = () => blog().fields.map((f: any) => f.name);

  it('écrit des bundles src/content/blog/<slug>/index.md', () => {
    expect(blog().folder).toBe('src/content/blog');
    expect(blog().path).toBe('{{slug}}/index');
    expect(blog().extension).toBe('md');
    expect(blog().format).toBe('yaml-frontmatter');
  });

  it('stocke les médias à côté de l’article (entry-relative)', () => {
    expect(blog().media_folder).toBe('');
    expect(blog().public_folder).toBe('');
  });

  it('mappe tous les champs du schéma Zod', () => {
    expect(fieldNames().sort()).toEqual([
      'aiUsage', 'body', 'category', 'cover', 'coverAlt', 'description',
      'draft', 'featured', 'pubDate', 'relatedProjects', 'tags', 'title', 'updatedDate',
    ]);
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod', () => {
    const required = blog().fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    expect(required).toEqual(['body', 'category', 'description', 'pubDate', 'title']);
  });

  it('propose exactement les 7 catégories du schéma', () => {
    const category = blog().fields.find((f: any) => f.name === 'category');
    expect(category.widget).toBe('select');
    expect(category.options).toEqual([...CATEGORIES]);
  });

  it('propose exactement les 3 niveaux aiUsage du schéma', () => {
    const ai = blog().fields.find((f: any) => f.name === 'aiUsage');
    expect(ai.widget).toBe('select');
    expect(ai.options.map((o: any) => o.value ?? o)).toEqual(['none', 'partial', 'full']);
  });

  it('utilise les widgets attendus pour les champs typés', () => {
    const byName = Object.fromEntries(blog().fields.map((f: any) => [f.name, f]));
    expect(byName.pubDate.widget).toBe('datetime');
    expect(byName.updatedDate.widget).toBe('datetime');
    expect(byName.draft.widget).toBe('boolean');
    expect(byName.featured.widget).toBe('boolean');
    expect(byName.tags.widget).toBe('list');
    expect(byName.cover.widget).toBe('image');
    expect(byName.body.widget).toBe('markdown');
  });
});

describe('config CMS — collection projects', () => {
  const projects = () => loadCmsConfig().collections[1];
  const fieldNames = () => projects().fields.map((f: any) => f.name);

  it('écrit des bundles src/content/projects/<slug>/index.md', () => {
    expect(projects().name).toBe('projects');
    expect(projects().folder).toBe('src/content/projects');
    expect(projects().path).toBe('{{slug}}/index');
    expect(projects().extension).toBe('md');
    expect(projects().format).toBe('yaml-frontmatter');
    expect(projects().create).toBe(true);
  });

  it('stocke les médias à côté de la fiche (entry-relative)', () => {
    expect(projects().media_folder).toBe('');
    expect(projects().public_folder).toBe('');
  });

  it('interdit la saisie d’une URL distante pour la couverture', () => {
    const cover = projects().fields.find((f: any) => f.name === 'cover');
    expect(cover.choose_url).toBe(false);
  });

  it('mappe tous les champs du schéma Zod', () => {
    expect(fieldNames().sort()).toEqual([
      'body', 'coverAlt', 'cover', 'demoUrl', 'description', 'featured',
      'relatedPosts', 'repoUrl', 'stack', 'startDate', 'status', 'tags', 'title',
    ].sort());
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod', () => {
    const required = projects().fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    expect(required).toEqual(['body', 'description', 'status', 'title']);
  });

  it('propose exactement les 3 statuts du schéma', () => {
    const status = projects().fields.find((f: any) => f.name === 'status');
    expect(status.widget).toBe('select');
    expect(status.options).toEqual([...PROJECT_STATUSES]);
    expect(status.default).toBe('actif');
  });

  it('relie les articles par une relation typée vers la collection blog', () => {
    const rel = projects().fields.find((f: any) => f.name === 'relatedPosts');
    expect(rel.widget).toBe('relation');
    expect(rel.collection).toBe('blog');
    expect(rel.multiple).toBe(true);
    // `reference('blog')` d'Astro stocke l'id d'entrée = le nom du dossier.
    expect(rel.value_field).toBe('{{slug}}');
  });

  it('utilise les widgets attendus pour les champs typés', () => {
    const byName = Object.fromEntries(projects().fields.map((f: any) => [f.name, f]));
    expect(byName.startDate.widget).toBe('datetime');
    expect(byName.stack.widget).toBe('list');
    expect(byName.tags.widget).toBe('list');
    expect(byName.cover.widget).toBe('image');
    expect(byName.featured.widget).toBe('boolean');
    expect(byName.body.widget).toBe('markdown');
  });
});

describe('config CMS — motif repoUrl/demoUrl aligné sur z.string().url() (D03)', () => {
  const urlSchema = z.string().url();

  // Table confrontée au VRAI schéma Zod (`z.string().url()`), pas à des exemples
  // choisis à la main — c'est le constat de la revue T-C1 : le validateur de
  // champ `string` de Sveltia 0.175.1 (`_A(n[0]).test(String(i))`) n'est PAS
  // ancré à droite, donc un motif non ancré des deux côtés ne teste qu'un
  // préfixe et laisse passer des valeurs que Zod rejette.
  //
  // `ftp://exemple.fr` est un écart CONNU et ASSUMÉ, pas un oubli : Zod accepte
  // n'importe quel schéma reconnu par l'URL WHATWG (dont `ftp://`), alors que le
  // motif n'accepte que http(s)://, comme l'exige le libellé du champ (« Doit
  // être une URL complète et valide, commençant par http:// ou https:// »).
  // Direction de l'écart : le motif est plus STRICT que Zod — un lien `ftp://`
  // légitime serait refusé par le CMS, ce qui n'est jamais l'incident qu'on
  // cherche à éviter ici (un build cassé après coup par une valeur acceptée à
  // tort). Ne jamais retirer ce cas de la table : il doit rester visible.
  const cases: Array<{ value: string; zodAccepts: boolean }> = [
    { value: 'https://', zodAccepts: false },
    { value: 'http://', zodAccepts: false },
    { value: 'https:///', zodAccepts: false },
    { value: 'http://exa mple.com', zodAccepts: false },
    { value: 'pas-une-url', zodAccepts: false },
    { value: 'ftp://exemple.fr', zodAccepts: true }, // écart connu, voir commentaire ci-dessus
    { value: 'https://github.com/bendevcat/bendevcat.github.io', zodAccepts: true },
    { value: 'https://bendevcat.github.io/', zodAccepts: true },
    { value: 'http://localhost:4321', zodAccepts: true },
    { value: 'https://exemple.fr/chemin?a=1#b', zodAccepts: true },
  ];

  it('la table de cas reflète le verdict réel de z.string().url() (pas une supposition)', () => {
    for (const { value, zodAccepts } of cases) {
      expect(urlSchema.safeParse(value).success).toBe(zodAccepts);
    }
  });

  it.each(['repoUrl', 'demoUrl'] as const)(
    'le motif de %s ne laisse jamais passer une valeur que Zod rejette',
    (fieldName) => {
      const field = loadCmsConfig()
        .collections[1].fields.find((f: any) => f.name === fieldName);
      const pattern = new RegExp(field.pattern[0]);

      for (const { value, zodAccepts } of cases) {
        const patternAccepts = pattern.test(value);
        if (value === 'ftp://exemple.fr') {
          // Écart encodé explicitement (D03) : le motif refuse ce que Zod
          // accepte — direction sûre, jamais l'inverse.
          expect(patternAccepts).toBe(false);
          continue;
        }
        // Sur tous les autres cas, le motif doit rendre exactement le même
        // verdict que Zod : rien que le CMS accepte ne doit faire échouer
        // `astro build` après coup, et rien de valide ne doit être refusé.
        expect(patternAccepts).toBe(zodAccepts);
      }
    },
  );
});
