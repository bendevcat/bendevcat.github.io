import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { z } from 'astro:content';
import { CATEGORIES, PROJECT_STATUSES, PROMPT_FORMATS, collections } from '../content.config';

/**
 * Charge la config réelle du CMS (public/admin/config.yml) telle qu'elle sera
 * servie. Le test lit le fichier sur disque — pas une copie — pour que toute
 * dérive entre le CMS et le schéma Zod casse le build de tests.
 */
export function loadCmsConfig(): any {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

/**
 * Champs attendus dans le CMS pour une collection, LUS dans le schéma Zod de
 * `src/content.config.ts` (clés de son `z.object`) + `body` — jamais tapés à
 * la main. Constat F1 (plan 14, vérification 1) : avec des listes écrites dans
 * le test, retirer `license` (skills), `version` ou `variables` (prompts) du
 * schéma laissait toute la suite verte, sans que CMS et schéma soient d'accord.
 * `blog` et `projects` déclarent `schema: ({ image }) => z.object(...)` : on
 * appelle la fonction avec un `image()` factice, seules les clés comptent ici.
 */
function schemaFieldNames(name: keyof typeof collections): string[] {
  const raw: any = collections[name].schema;
  const schema = typeof raw === 'function' ? raw({ image: () => z.string() }) : raw;
  return [...Object.keys(schema.shape), 'body'].sort();
}

/** Noms des champs déclarés dans `public/admin/config.yml` pour une collection, triés. */
function cmsFieldNames(name: string): string[] {
  const coll = loadCmsConfig().collections.find((c: any) => c.name === name);
  return coll.fields.map((f: any) => f.name).sort();
}

/**
 * Génère des URLs candidates par produit cartésien de blocs (schéma × hôte ×
 * port × chemin) pour stresser les motifs `repoUrl`/`demoUrl` du CMS contre le
 * VRAI `z.string().url()`, au lieu d'une table choisie à la main.
 *
 * Constat I1 (revue Fix round 1/5, déviation D10) : la table à 10 cas choisis
 * à la main ne contenait ni port invalide ni hôte malformé — exactement les
 * URL que l'ancien motif `^https?://[^\s/]+(/[^\s]*)?$` laissait passer sans
 * que `z.string().url()` les accepte (`https://github.com:bendevcat/x`,
 * `http://exemple.fr:99999`, `https://exemple.fr:abc`, `http://[`). Le verdict
 * `zodAccepts` de chaque cas est CALCULÉ ici en interrogeant le vrai schéma
 * Zod — jamais deviné ni tapé à la main.
 */
function generateUrlProbeCases(): Array<{ value: string; zodAccepts: boolean }> {
  const urlSchema = z.string().url();
  const protocols = ['https://', 'http://', 'ftp://', 'javascript:', ''];
  const hosts = [
    // Hôtes valides, dont un cas de sous-domaine profond et un IDN punycode.
    'exemple.fr', 'github.com', 'bendevcat.github.io', 'localhost',
    'sub.deep.exemple.fr', 'xn--exmple-cva.fr',
    // Hôtes malformés déjà couverts au fix round 1.
    '', 'exa mple.com', '[', ']', '[::1]',
    // Élargi au fix round 2 (constat I1 round 2) : la génération d'origine ne
    // contenait AUCUN hôte avec `@ ? # % | < > ^`, donc ne pouvait pas voir que
    // ces caractères manquaient de la classe d'hôte du motif. Une famille de
    // caractères non listée ici est une famille non testée — d'où la liste
    // volontairement redondante (caractère seul ET au milieu d'un hôte).
    '@', 'user@', 'ex@emple.fr',
    '?', 'ex?emple.fr',
    '#', 'ex#emple.fr',
    '%', 'ex%emple.fr', 'exemple.fr%20',
    '|', 'ex|emple.fr',
    '<', 'ex<emple.fr',
    '>', 'ex>emple.fr',
    '^', 'ex^emple.fr',
    // Élargi au fix round 3 (constat I1 round 3, revue indépendante du
    // contrôleur) : `\s` en regex couvre espace/tab/saut de ligne mais pas les
    // autres caractères de contrôle — aucun hôte des deux générations
    // précédentes n'en contenait, donc un octet NUL (ou tout autre `\x00`–
    // `\x1f`/`\x7f`) dans l'hôte passait le motif sans que rien ne le révèle.
    `ex${String.fromCharCode(0)}emple.fr`, // NUL
    `ex${String.fromCharCode(1)}emple.fr`, // autre caractère de contrôle (SOH)
  ];
  const ports = ['', ':80', ':8080', ':3000', ':443', ':4321', ':0', ':65535', ':65536', ':99999', ':abc', ':bendevcat', ':-1', ':', ':00080'];
  const paths = [
    '', '/', '/a/b', '/a/b?c=d#e', '/a b', '/anti-drift-planning', '///',
    // Élargi au fix round 2 : chemins ne commençant PAS par `/` — c'est ce qui
    // manquait pour générer `http://?`, `https://#a=1`, `https://#frag`
    // (userinfo/query/fragment collés directement à l'hôte, sans `/`).
    '?a=1', '#frag',
  ];

  const values = new Set<string>();
  for (const protocol of protocols) {
    for (const host of hosts) {
      for (const port of ports) {
        for (const path of paths) {
          values.add(`${protocol}${host}${port}${path}`);
        }
      }
    }
  }

  return [...values].map((value) => ({ value, zodAccepts: urlSchema.safeParse(value).success }));
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

  it('déclare exactement quatre collections : blog, projects, prompts, skills', () => {
    const cfg = loadCmsConfig();
    expect(cfg.collections).toHaveLength(4);
    expect(cfg.collections.map((c: any) => c.name)).toEqual(['blog', 'projects', 'prompts', 'skills']);
  });
});

/** Tous les champs `relation` de la config, où qu'ils soient imbriqués. */
function relationFields(cfg: any): Array<{ collection: string; field: any }> {
  const found: Array<{ collection: string; field: any }> = [];
  const walk = (collection: string, fields: any[] = []) => {
    for (const f of fields) {
      if (f.widget === 'relation') found.push({ collection, field: f });
      if (f.fields) walk(collection, f.fields);
      if (f.field) walk(collection, [f.field]);
      if (f.types) for (const t of f.types) walk(collection, t.fields);
    }
  };
  for (const c of cfg.collections) walk(c.name, c.fields);
  return found;
}

describe('config CMS — suppression (R15, D08 levé)', () => {
  it('autorise la suppression sur les quatre collections : Sveltia 0.221 retire les rétro-références', () => {
    // D08 (Plan 3) interdisait la suppression : l'ancien Sveltia laissait une
    // référence morte sur l'entrée liée, et `assertEntriesResolved` cassait le
    // build. Depuis 0.221, `deleteEntries` appelle `planCascadeDelete`, qui
    // retire le slug supprimé de chaque champ relation qui le cite, dans le
    // MÊME commit. On ancre ce constat dans le build npm effectivement
    // embarqué : son garde-fou « bloquer si une relation requise se vide »
    // n'existe que si la cascade existe.
    const cfg = loadCmsConfig();
    expect(cfg.collections.map((c: any) => [c.name, c.delete])).toEqual([
      ['blog', true],
      ['projects', true],
      ['prompts', true],
      ['skills', true],
    ]);
    const sveltia = readFileSync(
      new URL('../../node_modules/@sveltia/cms/npm/index.js', import.meta.url),
      'utf8',
    );
    expect(sveltia).toContain('Cannot delete entries that other entries require');
  });

  it('garde les quatre relations optionnelles (sinon Sveltia bloque la suppression)', () => {
    // `planCascadeDelete` revalide chaque champ qui perd une référence : s'il
    // est `required` et se retrouve vide, ou compte moins de `min` éléments,
    // la suppression est refusée. Toute nouvelle relation doit être examinée
    // ici avant d'entrer dans la config.
    const rels = relationFields(loadCmsConfig());
    expect(rels.map(({ collection, field }) => `${collection}.${field.name}→${field.collection}`)).toEqual([
      'blog.relatedProjects→projects',
      'projects.relatedPosts→blog',
      'prompts.relatedSkills→skills',
      'skills.relatedPrompts→prompts',
    ]);
    for (const { field } of rels) {
      expect(field.required).toBe(false);
      expect(field.multiple).toBe(true);
      expect(field.min).toBeUndefined();
    }
  });
});

describe('page /admin', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

  it('sert /admin depuis une page Astro autonome, noindex, sans BaseLayout', () => {
    const page = read('../pages/admin/index.astro');
    expect(page).toMatch(/<html\s+lang="fr"\s*>/);
    expect(page).toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);
    // Sveltia lit sa config à côté de la page ; le lien la rend explicite.
    expect(page).toMatch(
      /<link\s+rel="cms-config-url"\s+type="application\/yaml"\s+href="\/admin\/config\.yml"\s*\/?>/,
    );
    // Page autonome : ni layout du site (en-tête, CSS global), ni indexation Pagefind.
    expect(page).not.toMatch(/import\s+\w+\s+from\s+['"][^'"]*layouts\//);
    expect(page).not.toMatch(/<[A-Z]\w*Layout\b/);
    expect(page).not.toMatch(/<\w+\b[^>]*\sdata-pagefind-body\b/);
    const scripts = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    expect(scripts[0][1]).toMatch(/import\s+['"]\.\.\/\.\.\/admin\/cms['"]/);
  });

  it('n’a plus de public/admin/index.html ; la config reste un YAML valide dans public/admin/', () => {
    expect(existsSync(new URL('../../public/admin/index.html', import.meta.url))).toBe(false);
    const cfg = loadCmsConfig();
    expect(cfg.backend.name).toBe('github');
    expect(cfg.collections).toHaveLength(4);
  });

  it('épingle @sveltia/cms à 0.221.0 exactement (package.json sans ^ ni ~, lock résolu)', () => {
    const pkg = JSON.parse(read('../../package.json'));
    expect(pkg.dependencies['@sveltia/cms']).toBe('0.221.0');
    const lock = JSON.parse(read('../../package-lock.json'));
    expect(lock.packages[''].dependencies['@sveltia/cms']).toBe('0.221.0');
    expect(lock.packages['node_modules/@sveltia/cms'].version).toBe('0.221.0');
  });

  it('importe @sveltia/cms depuis npm, sans CDN', () => {
    const cms = read('../admin/cms.ts');
    expect(cms).toMatch(/^import\s+CMS\s+from\s+['"]@sveltia\/cms['"];?$/m);
    // Le paquet npm ne s'initialise pas seul quand il est importé en module.
    expect(cms).toMatch(/CMS\.init\(/);
    for (const src of [cms, read('../pages/admin/index.astro')]) {
      expect(src).not.toContain('unpkg');
      expect(src).not.toMatch(/https?:\/\/[^'"\s]*sveltia/);
    }
  });

  it('ne charge le dépôt de test que sous import.meta.env.DEV', () => {
    const cms = read('../admin/cms.ts');
    // Aucun import statique du module de dev : seul un import() dynamique, que
    // le build élimine avec la branche `import.meta.env.DEV` (false en prod).
    expect(cms).not.toMatch(/^import\b[^;]*['"]\.\/dev\//m);
    const refs = [...cms.matchAll(/['"]\.\/dev\/[^'"]*['"]/g)];
    expect(refs).toHaveLength(1);
    const guard = cms.match(
      /if\s*\(\s*import\.meta\.env\.DEV\s*&&\s*new URLSearchParams\(location\.search\)\.has\('test-repo'\)\s*\)\s*\{([\s\S]*?)\n\}\s*else\s*\{([\s\S]*?)\n\}/,
    );
    expect(guard).not.toBeNull();
    const [, devBranch, prodBranch] = guard!;
    expect(devBranch).toMatch(/import\(\s*'\.\/dev\/testRepo'\s*\)/);
    // Plan 20, F1 : la config du tableau de test est config.yml transformé
    // (`testRepoConfig`, backend test-repo seul, load_config_file: false), pas
    // un objet fusionné par Sveltia dans le backend github (repo/branch en trop).
    expect(devBranch).toMatch(/loadTestRepoConfig\(\)/);
    expect(devBranch).toMatch(/CMS\.init\(\s*\{\s*config\s*\}\s*\)/);
    expect(devBranch).not.toMatch(/backend:/);
    expect(prodBranch).toMatch(/CMS\.init\(\)/);
    expect(prodBranch).not.toMatch(/test-repo/);
    // Un seul init() hors de ces deux branches : aucun.
    expect([...cms.matchAll(/CMS\.init\(/g)]).toHaveLength(2);
  });

  it('pré-regroupe @sveltia/cms en dev (cache Vite froid : pas de 504 Outdated Optimize Dep)', async () => {
    // Plan 19, F1 (R7) : sans `optimizeDeps.include`, Vite ne découvre Sveltia
    // qu'à la première visite de /admin/, ré-optimise, recharge, et la barre
    // d'outils Astro répond 504 jusqu'au redémarrage du serveur.
    const { default: config } = await import('../../astro.config.mjs');
    expect(config.vite?.optimizeDeps?.include).toContain('@sveltia/cms');
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
    expect(fieldNames().sort()).toEqual(schemaFieldNames('blog'));
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

  it('relie les projets par une relation typée vers la collection projects', () => {
    const rel = blog().fields.find((f: any) => f.name === 'relatedProjects');
    expect(rel.widget).toBe('relation');
    expect(rel.collection).toBe('projects');
    expect(rel.multiple).toBe(true);
    // `reference('projects')` d'Astro stocke l'id d'entrée = le nom du dossier.
    expect(rel.value_field).toBe('{{slug}}');
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
    expect(fieldNames().sort()).toEqual(schemaFieldNames('projects'));
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
    // Plan 15 (D102–D104) : champs de la fiche projet.
    expect(byName.license.widget).toBe('string');
    expect(byName.snippetFile.widget).toBe('string');
    // Plan 21 (R15) : widget `code`, sortie texte seule — voir « champs de code ».
    expect(byName.snippet.widget).toBe('code');
    expect(byName.stackRoles.widget).toBe('list');
  });

  it('présente les champs dans l’ordre du formulaire', () => {
    // Ordre d'affichage propre au CMS (le jeu de champs, lui, est vérifié
    // contre le schéma ci-dessus).
    expect(fieldNames()).toEqual([
      'title',
      'description',
      'status',
      'startDate',
      'stack',
      'stackRoles',
      'tags',
      'cover',
      'coverAlt',
      'license',
      'repoUrl',
      'demoUrl',
      'snippetFile',
      'snippet',
      'featured',
      'relatedPosts',
      'body',
    ]);
  });

  it('décrit chaque rôle de techno comme `{name, role}`, comme le schéma Zod (plan 15, D104)', () => {
    const f = projects().fields.find((x: any) => x.name === 'stackRoles');
    expect(f.required).toBe(false);
    expect(f.fields.map((x: any) => x.name)).toEqual(['name', 'role']);
    for (const sub of f.fields) {
      expect(sub.widget).toBe('string');
      expect(sub.required).not.toBe(false);
    }
  });
});

describe('config CMS — motif repoUrl/demoUrl aligné sur z.string().url() (D03, D10)', () => {
  // Cas générés par produit cartésien (schéma × hôte × port × chemin),
  // confrontés au vrai `z.string().url()` — remplace la table à 10 cas
  // choisis à la main (constat I1, revue Fix round 1/5) qui ne couvrait ni
  // les ports invalides, ni les hôtes malformés, et affirmait donc à tort que
  // le motif n'était « jamais plus laxiste que Zod ».
  const cases = generateUrlProbeCases();

  it('la génération couvre bien les catégories exigées par I1 (round 1, 2 et 3) : port hors plage, port non numérique, « : » au lieu de « / », hôte malformé (crochet), espace, schéma non-http, userinfo, hôte à caractère spécial seul, chemin sans « / » initial, caractère de contrôle dans l’hôte', () => {
    const values = cases.map((c) => c.value);
    // Round 1.
    expect(values).toContain('http://exemple.fr:99999');
    expect(values).toContain('https://exemple.fr:abc');
    expect(values).toContain('https://github.com:bendevcat/anti-drift-planning');
    expect(values).toContain('http://[');
    expect(values).toContain('http://exa mple.com');
    expect(values).toContain('ftp://exemple.fr');
    // Round 2 (constat I1, revue Fix round 2/5) : la génération d'origine ne
    // contenait aucun hôte avec `@ ? # % | < > ^`, donc ne pouvait pas révéler
    // que ces caractères manquaient de la classe d'hôte du motif.
    expect(values).toContain('https://@');
    expect(values).toContain('https://user@');
    expect(values).toContain('http://?');
    expect(values).toContain('https://#');
    expect(values).toContain('https://?a=1');
    expect(values).toContain('https://#frag');
    expect(values).toContain('https://exemple.fr%20/');
    expect(values).toContain('https://ex|emple.fr');
    expect(values).toContain('https://ex<emple.fr');
    expect(values).toContain('https://ex^emple.fr');
    expect(values).toContain('https://%');
    // Round 3 (constat I1, revue indépendante du contrôleur, Fix round 3/5) :
    // `\s` ne couvre pas les caractères de contrôle hors espace/tab/saut de
    // ligne — aucun hôte des deux générations précédentes n'en contenait.
    const nulHost = `https://ex${String.fromCharCode(0)}emple.fr`;
    const ctrlHost = `https://ex${String.fromCharCode(1)}emple.fr`;
    expect(values).toContain(nulHost);
    expect(values).toContain(ctrlHost);
    // Et Zod les rejette bien réellement (sinon la génération ne testerait rien).
    const adversarials = [
      'http://exemple.fr:99999', 'https://exemple.fr:abc', 'https://github.com:bendevcat/anti-drift-planning', 'http://[',
      'https://@', 'https://user@', 'http://?', 'https://#', 'https://?a=1', 'https://#frag',
      'https://exemple.fr%20/', 'https://ex|emple.fr', 'https://ex<emple.fr', 'https://ex^emple.fr', 'https://%',
      nulHost, ctrlHost,
    ];
    for (const adversarial of adversarials) {
      expect(cases.find((c) => c.value === adversarial)!.zodAccepts, adversarial).toBe(false);
    }
  });

  it.each(['repoUrl', 'demoUrl'] as const)(
    'le motif de %s ne laisse JAMAIS passer une valeur que Zod rejette',
    (fieldName) => {
      const field = loadCmsConfig()
        .collections[1].fields.find((f: any) => f.name === fieldName);
      const pattern = new RegExp(field.pattern[0]);

      for (const { value, zodAccepts } of cases) {
        if (pattern.test(value)) {
          // Le motif n'a le droit d'accepter que ce que Zod accepte aussi :
          // sinon le CMS validerait et commiterait une valeur qui casse
          // `astro build` après coup (le mode de panne récurrent du plan).
          expect(zodAccepts, `${JSON.stringify(value)} passe le motif de ${fieldName} mais pas Zod`).toBe(true);
        }
      }
    },
  );

  it('reste délibérément plus strict que Zod sur les schémas non-http(s) (ftp:// refusé, écart connu et assumé)', () => {
    // Zod accepte n'importe quel schéma reconnu par l'URL WHATWG (dont
    // `ftp://`), alors que le motif n'accepte que http(s)://, comme l'exige
    // le libellé du champ. Direction de l'écart : le motif est plus STRICT
    // que Zod — jamais l'inverse, qui serait l'incident qu'on cherche à
    // éviter. Ne jamais retirer ce cas : il doit rester visible.
    const field = loadCmsConfig().collections[1].fields.find((f: any) => f.name === 'repoUrl');
    const pattern = new RegExp(field.pattern[0]);
    expect(pattern.test('ftp://exemple.fr')).toBe(false);
    expect(z.string().url().safeParse('ftp://exemple.fr').success).toBe(true);
  });

  it('reste délibérément plus strict que Zod sur IPv6, userinfo et les ports vides/à zéros non significatifs (Minor, fix round 2, écarts connus et assumés)', () => {
    // Relevé par la revue (Fix round 2/5) : ces 4 formes sont acceptées par
    // Zod mais refusées par le motif — direction sûre (jamais l'inverse), mais
    // jusqu'ici non testée ni documentée comme intentionnelle. Encodé ici
    // explicitement, sur le même principe que le cas `ftp://` ci-dessus : un
    // écart assumé et prouvé vaut mieux qu'un écart tacite.
    const field = loadCmsConfig().collections[1].fields.find((f: any) => f.name === 'repoUrl');
    const pattern = new RegExp(field.pattern[0]);
    const urlSchema = z.string().url();
    const knownStricterCases = [
      'https://[::1]/', // littéral IPv6 — l'hôte exclut `[` et `]`
      'https://user:pass@host/', // userinfo — l'hôte exclut `@`
      'https://host:/', // port vide après `:` — le groupe port exige des chiffres
      'https://exemple.fr:00080', // port à zéros non significatifs — hors des alternatives numériques couvertes
    ];
    for (const value of knownStricterCases) {
      expect(pattern.test(value), `${value} devrait être refusé par le motif`).toBe(false);
      expect(urlSchema.safeParse(value).success, `${value} devrait être accepté par Zod`).toBe(true);
    }
  });
});

/** Petit helper local : retrouve un champ par son nom dans une collection. */
function field(cfg: any, collection: string, name: string): any {
  const coll = cfg.collections.find((c: any) => c.name === collection);
  return coll.fields.find((f: any) => f.name === name);
}

describe('config CMS — collection prompts', () => {
  it('pointe le bon dossier, en page bundle, suppression permise (R15)', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    expect(coll.folder).toBe('src/content/prompts');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.extension).toBe('md');
    expect(coll.format).toBe('yaml-frontmatter');
    expect(coll.delete).toBe(true);
    expect(coll.media_folder).toBe('');
    expect(coll.public_folder).toBe('');
  });

  it('mappe TOUS les champs du schéma Zod, et rien de plus', () => {
    // Liste attendue lue dans le schéma (F1) : retirer `version` ou
    // `variables` du Zod fait échouer ce test.
    expect(cmsFieldNames('prompts')).toEqual(schemaFieldNames('prompts'));
  });

  it('présente les champs dans l’ordre du formulaire', () => {
    // Ordre d'affichage propre au CMS (le jeu de champs, lui, est vérifié
    // contre le schéma ci-dessus).
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    expect(coll.fields.map((f: any) => f.name)).toEqual([
      'title',
      'description',
      'format',
      'prompt',
      'variables',
      'tool',
      'model',
      'version',
      'updated',
      'tags',
      'draft',
      'relatedSkills',
      'body',
    ]);
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod (I2, D10)', () => {
    // Constat I2 (revue Fix round 1/5) : sans cette assertion, passer
    // `description` en `required: false` laissait les 85 tests précédents
    // verts — le champ aurait été omis à l'enregistrement puis rejeté par
    // Zod (`z.string()` sans `.optional()`) au build.
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    const required = coll.fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    // Plan 16 (D110) : `body` facultatif — une fiche peut n'avoir que son
    // prompt (macos-clone, corps vidé) ; Astro accepte un corps vide.
    expect(required).toEqual(['description', 'format', 'title', 'tool']);
  });

  it('utilise les widgets attendus pour les champs typés (I3, D10)', () => {
    // Constat I3 : sans cette assertion, passer `tags` de `list` à `string`,
    // ou `draft` de `boolean` à `string`, laissait les tests précédents
    // verts — la forme écrite dans le frontmatter (chaîne au lieu de
    // tableau/booléen) aurait fait échouer la validation Zod au build.
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    const byName = Object.fromEntries(coll.fields.map((f: any) => [f.name, f]));
    expect(byName.title.widget).toBe('string');
    expect(byName.description.widget).toBe('text');
    expect(byName.format.widget).toBe('select');
    expect(byName.prompt.widget).toBe('code'); // plan 21 (R15)
    expect(byName.tool.widget).toBe('string');
    expect(byName.model.widget).toBe('string');
    expect(byName.version.widget).toBe('string');
    expect(byName.updated.widget).toBe('datetime');
    expect(byName.variables.widget).toBe('list');
    expect(byName.tags.widget).toBe('list');
    expect(byName.draft.widget).toBe('boolean');
    expect(byName.body.widget).toBe('markdown');
  });

  it('offre exactement les formats de PROMPT_FORMATS, avec le même défaut que Zod', () => {
    const cfg = loadCmsConfig();
    const f = field(cfg, 'prompts', 'format');
    expect(f.options.map((o: any) => o.value)).toEqual([...PROMPT_FORMATS]);
    expect(f.default).toBe('fiche');
  });

  it('décrit chaque variable comme `{name, hint?, default?}`, comme le schéma Zod (plan 14, D94)', () => {
    // Forme de l'inventaire §11, réutilisée par la fiche prompt (plan 16).
    // `name` est le seul sous-champ requis : un sous-champ optionnel laissé
    // vide est omis (`omit_empty_optional_fields`) et Zod l'accepte absent.
    const f = field(loadCmsConfig(), 'prompts', 'variables');
    expect(f.required).toBe(false);
    const sub = Object.fromEntries(f.fields.map((x: any) => [x.name, x]));
    expect(f.fields.map((x: any) => x.name)).toEqual(['name', 'hint', 'default']);
    expect(sub.name.widget).toBe('string');
    expect(sub.name.required).not.toBe(false);
    expect(sub.hint.widget).toBe('string');
    expect(sub.hint.required).toBe(false);
    expect(sub.default.widget).toBe('string');
    expect(sub.default.required).toBe(false);
  });

  it('garde le défaut `Claude` sur `tool`, comme le schéma Zod', () => {
    expect(field(loadCmsConfig(), 'prompts', 'tool').default).toBe('Claude');
  });

  it('lie relatedSkills à la collection skills par slug', () => {
    const f = field(loadCmsConfig(), 'prompts', 'relatedSkills');
    expect(f.widget).toBe('relation');
    expect(f.collection).toBe('skills');
    expect(f.multiple).toBe(true);
    expect(f.value_field).toBe('{{slug}}');
  });
});

describe('config CMS — collection skills', () => {
  it('pointe le bon dossier, en page bundle, suppression permise (R15)', () => {
    // Complété (I4, D10) : cette assertion omettait `extension`, `format`,
    // `media_folder` et `public_folder`, pourtant vérifiés sur `prompts` —
    // asymétrie du garde-fou entre les deux collections jumelles.
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    expect(coll.folder).toBe('src/content/skills');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.extension).toBe('md');
    expect(coll.format).toBe('yaml-frontmatter');
    expect(coll.delete).toBe(true);
    expect(coll.media_folder).toBe('');
    expect(coll.public_folder).toBe('');
  });

  it('mappe TOUS les champs du schéma Zod, et rien de plus', () => {
    // Liste attendue lue dans le schéma (F1) : retirer `license` du Zod fait
    // échouer ce test.
    expect(cmsFieldNames('skills')).toEqual(schemaFieldNames('skills'));
  });

  it('présente les champs dans l’ordre du formulaire', () => {
    // Ordre d'affichage propre au CMS (le jeu de champs, lui, est vérifié
    // contre le schéma ci-dessus).
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    expect(coll.fields.map((f: any) => f.name)).toEqual([
      'title',
      'name',
      'description',
      'type',
      'version',
      'license',
      'repoUrl',
      'installCmd',
      'installNote',
      'skillCount',
      'commandCount',
      'highlights',
      'triggers',
      'changelog',
      'files',
      'filesSource',
      'tags',
      'draft',
      'relatedPrompts',
      'body',
    ]);
  });

  it('rend obligatoires exactement les champs non-optionnels du Zod (I2, D10)', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    const required = coll.fields
      .filter((f: any) => f.required !== false)
      .map((f: any) => f.name)
      .sort();
    // Plan 17 (D115) : `body` facultatif, comme pour `prompts` (D110).
    expect(required).toEqual(['description', 'title', 'type']);
  });

  it('utilise les widgets attendus pour les champs typés (I3, D10)', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    const byName = Object.fromEntries(coll.fields.map((f: any) => [f.name, f]));
    expect(byName.title.widget).toBe('string');
    expect(byName.name.widget).toBe('string');
    expect(byName.description.widget).toBe('text');
    expect(byName.type.widget).toBe('string');
    expect(byName.version.widget).toBe('string');
    expect(byName.license.widget).toBe('string');
    expect(byName.repoUrl.widget).toBe('string');
    expect(byName.installCmd.widget).toBe('string');
    expect(byName.installNote.widget).toBe('string');
    expect(byName.skillCount.widget).toBe('number');
    expect(byName.commandCount.widget).toBe('number');
    expect(byName.highlights.widget).toBe('list');
    expect(byName.triggers.widget).toBe('list');
    expect(byName.changelog.widget).toBe('list');
    expect(byName.files.widget).toBe('list');
    expect(byName.filesSource.widget).toBe('string');
    expect(byName.tags.widget).toBe('list');
    expect(byName.draft.widget).toBe('boolean');
    expect(byName.body.widget).toBe('markdown');
  });

  it('écrit les comptes en entiers ≥ 0, comme `z.number().int().min(0)` (plan 17)', () => {
    // Sans `value_type: int`, le widget number enregistre une chaîne que Zod
    // (`z.number()`) rejette au build.
    for (const name of ['skillCount', 'commandCount']) {
      const f = field(loadCmsConfig(), 'skills', name);
      expect(f.value_type, name).toBe('int');
      expect(f.min, name).toBe(0);
    }
  });

  it('saisit points forts et déclencheurs un par un, en chaînes (plan 17)', () => {
    // Une liste sans `field` est un champ texte coupé aux virgules : une
    // phrase citée contenant une virgule y serait scindée en deux entrées.
    for (const name of ['highlights', 'triggers']) {
      const f = field(loadCmsConfig(), 'skills', name);
      expect(f.required, name).toBe(false);
      expect(f.fields, name).toBeUndefined();
      expect(f.field.widget, name).toBe('string');
    }
  });

  it('décrit chaque ligne de version comme `{version, date, text}`, comme le schéma Zod (plan 17)', () => {
    const f = field(loadCmsConfig(), 'skills', 'changelog');
    expect(f.required).toBe(false);
    expect(f.fields.map((x: any) => x.name)).toEqual(['version', 'date', 'text']);
    const sub = Object.fromEntries(f.fields.map((x: any) => [x.name, x]));
    for (const name of ['version', 'date', 'text']) expect(sub[name].required, name).not.toBe(false);
    expect(sub.version.widget).toBe('string');
    expect(sub.date.widget).toBe('datetime');
    // Date seule, écrite comme dans le contenu (`2026-09-18`, lue par z.coerce.date()).
    expect(sub.date.format).toBe('YYYY-MM-DD');
    expect(sub.date.time_format).toBe(false);
    expect(sub.text.widget).toBe('string');
  });

  it('décrit chaque fichier comme `{path, lines, excerpt}`, comme le schéma Zod (plan 17, D116)', () => {
    const f = field(loadCmsConfig(), 'skills', 'files');
    expect(f.required).toBe(false);
    expect(f.fields.map((x: any) => x.name)).toEqual(['path', 'lines', 'excerpt']);
    const sub = Object.fromEntries(f.fields.map((x: any) => [x.name, x]));
    for (const name of ['path', 'lines', 'excerpt']) expect(sub[name].required, name).not.toBe(false);
    expect(sub.path.widget).toBe('string');
    expect(sub.lines.widget).toBe('number');
    expect(sub.lines.value_type).toBe('int');
    expect(sub.lines.min).toBe(1);
    // Multiligne : l'extrait garde ses sauts de ligne. Plan 21 (R15) : widget
    // `code`, sortie texte seule — voir « champs de code ».
    expect(sub.excerpt.widget).toBe('code');
  });

  it('garde le défaut `claude-code` sur `type`, comme le schéma Zod', () => {
    expect(field(loadCmsConfig(), 'skills', 'type').default).toBe('claude-code');
  });

  it('lie relatedPrompts à la collection prompts par slug', () => {
    const f = field(loadCmsConfig(), 'skills', 'relatedPrompts');
    expect(f.widget).toBe('relation');
    expect(f.collection).toBe('prompts');
    expect(f.multiple).toBe(true);
    expect(f.value_field).toBe('{{slug}}');
  });
});

describe('config CMS — motif repoUrl du skill vs Zod (D03, D10)', () => {
  const pattern = new RegExp(field(loadCmsConfig(), 'skills', 'repoUrl').pattern[0]);

  // Motif lu DEPUIS le YAML et confronté aux mêmes cas générés que
  // `projects.repoUrl`/`demoUrl` (voir generateUrlProbeCases) — les 3 champs
  // partagent littéralement le même motif (I1) ; le remplacement de la table
  // à 10 cas choisis à la main par une génération vaut donc ici aussi.
  const cases = generateUrlProbeCases();

  it('n’est JAMAIS plus laxiste que Zod (une URL acceptée par le CMS ne casse pas le build)', () => {
    for (const { value, zodAccepts } of cases) {
      if (pattern.test(value)) {
        expect(zodAccepts, `${JSON.stringify(value)} passe le CMS mais pas Zod`).toBe(true);
      }
    }
  });

  it('rejette bien les URL adversariales trouvées en revue (I1, round 1, 2 et 3) : port hors plage, port non numérique, « : » au lieu de « / », hôte malformé, userinfo, `?`/`#`/`%`/`|`/`<`/`^` seuls ou en hôte, caractère de contrôle dans l’hôte', () => {
    for (const adversarial of [
      // Round 1.
      'http://exemple.fr:99999',
      'https://exemple.fr:abc',
      'https://github.com:bendevcat/anti-drift-planning',
      'http://[',
      // Round 2.
      'https://@',
      'https://user@',
      'http://?',
      'https://#',
      'https://?a=1',
      'https://#frag',
      'https://exemple.fr%20/',
      'https://ex|emple.fr',
      'https://ex<emple.fr',
      'https://ex^emple.fr',
      'https://%',
      // Round 3.
      `https://ex${String.fromCharCode(0)}emple.fr`,
      `https://ex${String.fromCharCode(1)}emple.fr`,
    ]) {
      expect(pattern.test(adversarial), adversarial).toBe(false);
    }
  });

  it('est délibérément plus strict que Zod sur le schéma d’URL (ftp:// refusé)', () => {
    expect(pattern.test('ftp://exemple.fr')).toBe(false);
    expect(z.string().url().safeParse('ftp://exemple.fr').success).toBe(true);
  });

  it('reste délibérément plus strict que Zod sur IPv6, userinfo et les ports vides/à zéros non significatifs (Minor, fix round 2, écarts connus et assumés)', () => {
    const urlSchema = z.string().url();
    const knownStricterCases = [
      'https://[::1]/',
      'https://user:pass@host/',
      'https://host:/',
      'https://exemple.fr:00080',
    ];
    for (const value of knownStricterCases) {
      expect(pattern.test(value), `${value} devrait être refusé par le motif`).toBe(false);
      expect(urlSchema.safeParse(value).success, `${value} devrait être accepté par Zod`).toBe(true);
    }
  });
});

describe('config CMS — champs de code (plan 21, R15)', () => {
  // Trois champs multilignes recopiés tels quels : édités avec le widget `code`
  // de Sveltia 0.221 (éditeur Lexical monospace, coloré par Shiki).
  // `output_code_only: true` garde la valeur telle quelle — une chaîne, lue et
  // réécrite sans changement (code-editor.svelte : `code = currentValue` /
  // `currentValue = code`) ; à `false` (défaut) le widget enregistre un objet
  // `{code, lang}`, que le schéma Zod refuse (z.string()).
  // `allow_language_selection: false` : pas de sélecteur, la langue est fixée
  // par `default_language`, un identifiant Shiki (`markdown`, `yaml`).
  const expected = [
    {
      collection: 'prompts',
      path: ['prompt'],
      lang: 'markdown',
      required: false,
      hint: 'Le texte copiable en 1 clic. Requis en pratique pour une fiche ; inutile pour un guide. Écrire {nom} là où le lecteur remplit une variable déclarée ci-dessous.',
    },
    {
      collection: 'projects',
      path: ['snippet'],
      lang: 'yaml',
      required: false,
      hint: 'Contenu du fichier, recopié tel quel ; fenêtre masquée si vide',
    },
    // Sous-champ d'une liste : requis (défaut Sveltia), sans aide propre — l'aide
    // « Extrait = premières lignes… » est portée par la liste `files`.
    { collection: 'skills', path: ['files', 'excerpt'], lang: 'markdown', required: undefined, hint: undefined },
  ];

  /** Champ désigné par un chemin `[champ, sous-champ?]` dans une collection. */
  function fieldAt(cfg: any, collection: string, path: string[]): any {
    const [head, ...rest] = path;
    return rest.reduce(
      (f: any, name: string) => f.fields.find((x: any) => x.name === name),
      field(cfg, collection, head),
    );
  }

  it('édite prompt, snippet et excerpt avec le widget code, sortie texte seule', () => {
    const cfg = loadCmsConfig();
    for (const { collection, path, lang, required, hint } of expected) {
      const f = fieldAt(cfg, collection, path);
      const where = `${collection}.${path.join('[].')}`;
      expect(f.widget, where).toBe('code');
      expect(f.output_code_only, where).toBe(true);
      expect(f.allow_language_selection, where).toBe(false);
      expect(f.default_language, where).toBe(lang);
      expect(f.required, where).toBe(required);
      expect(f.hint, where).toBe(hint);
      // Rien d'autre : ni `keys` (sans effet en sortie texte seule) ni `default`.
      expect(Object.keys(f).sort(), where).toEqual(
        ['allow_language_selection', 'default_language', 'hint', 'label', 'name', 'output_code_only', 'required', 'widget']
          .filter((k) => (k === 'hint' ? hint !== undefined : k === 'required' ? required !== undefined : true)),
      );
    }
  });
});

describe('config CMS — création rapide (plan 22, T2)', () => {
  // Bundle npm effectivement embarqué : les constats ci-dessous (Built facts
  // du plan 22) y sont ancrés, pas seulement recopiés.
  const bundle = () => readFileSync(new URL('../../node_modules/@sveltia/cms/npm/index.js', import.meta.url), 'utf8');

  it('pré-remplit pubDate avec {{now}}', () => {
    // `draft/defaults.js` : une valeur `'{{now}}'` d'un champ datetime devient
    // l'heure courante au format du champ, À LA CRÉATION seulement. Une entrée
    // existante sans pubDate recevrait l'heure d'ouverture : la réplique de
    // cmsFrontmatter.ts refuse ce cas (tout article déclare pubDate, requis).
    const pubDate = field(loadCmsConfig(), 'blog', 'pubDate');
    expect(pubDate.widget).toBe('datetime');
    expect(pubDate.default).toBe('{{now}}');
    expect(pubDate.format).toBe('YYYY-MM-DDTHH:mm:ssZ');
    expect(pubDate.required).toBeUndefined();
    expect(bundle()).toContain('===`{{now}}`');
    // Aucune autre date n'est pré-remplie : updatedDate et updated suivent les
    // règles de sauvegarde (T3), startDate et changelog.date restent saisis.
    const cfg = loadCmsConfig();
    const nowDefaults = cfg.collections.flatMap((c: any) =>
      c.fields.filter((f: any) => f.default === '{{now}}').map((f: any) => `${c.name}.${f.name}`),
    );
    expect(nowDefaults).toEqual(['blog.pubDate']);
  });

  it('crée articles, prompts et skills en brouillon (draft default true)', () => {
    // `populateDefaultValue` remplit aussi un champ ABSENT d'une entrée
    // existante : le garde de cmsFrontmatter.test.ts (« chaque article,
    // prompt et skill déclare draft ») empêche qu'un fichier sans `draft`
    // devienne brouillon à sa prochaine sauvegarde.
    const cfg = loadCmsConfig();
    const drafts = cfg.collections.flatMap((c: any) =>
      c.fields.filter((f: any) => f.name === 'draft').map((f: any) => [c.name, f.widget, f.required, f.default]),
    );
    expect(drafts).toEqual([
      ['blog', 'boolean', false, true],
      ['prompts', 'boolean', false, true],
      ['skills', 'boolean', false, true],
    ]);
  });

  it('images : WebP, 1600 px, qualité 80, plafond de taille', () => {
    // `assets/process.js` `processFile` : transformation côté navigateur AVANT
    // tout backend (`media_libraries.default.config`), puis
    // `oversized = fichier transformé > max_file_size` → refusé.
    const cfg = loadCmsConfig();
    expect(cfg.media_libraries).toEqual({
      default: {
        config: {
          max_file_size: 1048576,
          transformations: { raster_image: { format: 'webp', quality: 80, width: 1600 } },
        },
      },
    });
    // L'ancienne clé `media_library` écraserait la lecture (`findLibraryOptions`).
    expect(cfg.media_library).toBeUndefined();
  });

  it('messages de commit content(<collection>): <action> "<slug>"', () => {
    const cfg = loadCmsConfig();
    expect(cfg.backend.commit_messages).toEqual({
      create: 'content({{collection}}): create "{{slug}}"',
      update: 'content({{collection}}): update "{{slug}}"',
      delete: 'content({{collection}}): delete "{{slug}}"',
      uploadMedia: 'content(media): upload "{{path}}"',
      deleteMedia: 'content(media): delete "{{path}}"',
    });

    // Substitution de `git/shared/commits.js` `createCommitMessage` :
    // `{{collection}}` = libellé SINGULIER de la collection (aucun marqueur
    // pour son nom), ` +N` quand N autres fichiers suivent. Ancrée dans le
    // bundle livré.
    const source = bundle();
    expect(source).toContain('{useSingular:!0}');
    expect(source).toContain('.replaceAll(`{{slug}}`,');
    expect(source).toContain('.replaceAll(`{{collection}}`,');
    const render = (
      type: 'create' | 'update' | 'delete' | 'uploadMedia' | 'deleteMedia',
      changes: Array<{ slug?: string; path: string }>,
      collection?: string,
    ) => {
      const coll = cfg.collections.find((c: any) => c.name === collection);
      const label = coll ? coll.label_singular || coll.label || coll.name : '';
      const [firstSlug = ''] = changes.map((c) => c.slug).filter(Boolean);
      const [firstPath, ...rest] = changes.map((c) => c.path);
      let message: string = cfg.backend.commit_messages[type];
      if (['create', 'update', 'delete'].includes(type)) {
        message = message.replaceAll('{{slug}}', firstSlug).replaceAll('{{collection}}', label).replaceAll('{{path}}', firstPath);
      } else {
        message = message.replaceAll('{{path}}', firstPath);
      }
      return rest.length ? `${message} +${rest.length}` : message;
    };
    const k9s = { slug: 'k9s-kubernetes-terminal-ui', path: 'src/content/blog/k9s-kubernetes-terminal-ui/index.md' };
    expect(render('update', [k9s], 'blog')).toBe('content(Article): update "k9s-kubernetes-terminal-ui"');
    expect(render('create', [{ slug: 'essai', path: 'src/content/prompts/essai/index.md' }], 'prompts')).toBe(
      'content(Prompt): create "essai"',
    );
    expect(render('update', [k9s, { path: 'src/content/blog/k9s-kubernetes-terminal-ui/a.webp' }], 'blog')).toBe(
      'content(Article): update "k9s-kubernetes-terminal-ui" +1',
    );
    expect(render('uploadMedia', [{ path: 'src/assets/uploads/a.webp' }])).toBe('content(media): upload "src/assets/uploads/a.webp"');
  });
});

/**
 * `slugify` de Sveltia 0.221 (`services/common/slug/index.js`) et le
 * `@sindresorhus/transliterate` 2.3.1 qu'il embarque, tirés TELS QUELS des
 * `sourcesContent` de `npm/index.js.map` (jamais recopiés à la main), écrits
 * dans un dossier temporaire et importés. Seuls les modules internes dont il
 * dépend sont remplacés : `cmsConfig.current` = `{ slug: <options> }`,
 * `generateUUID` (repli d'un slug vide), `truncate`, `getOrCreate`.
 */
async function sveltiaSlugify(slugOptions: unknown): Promise<(value: string, options?: object) => string> {
  const map = JSON.parse(readFileSync(new URL('../../node_modules/@sveltia/cms/npm/index.js.map', import.meta.url), 'utf8'));
  const source = (suffix: string): string => {
    const matches = map.sources.map((s: string, i: number) => [s, i] as const).filter(([s]: readonly [string, number]) => s.endsWith(suffix));
    if (matches.length !== 1) throw new Error(`${suffix} : ${matches.length} source(s) dans index.js.map`);
    return map.sourcesContent[matches[0][1]];
  };
  const imports: Record<string, string> = {
    '@sindresorhus/transliterate': './transliterate.mjs',
    '@sveltia/utils/crypto': './stubs.mjs',
    '@sveltia/utils/string': './stubs.mjs',
    '$lib/services/common/slug/constants': './constants.mjs',
    '$lib/services/config': './stubs.mjs',
    '$lib/services/utils/cache': './stubs.mjs',
    './replacements.js': './replacements.mjs',
    './locale-replacements.js': './locale-replacements.mjs',
  };
  const rewrite = (code: string) =>
    // Instructions `import … from '…'` en début de ligne seulement (pas les `@import` des JSDoc).
    code.replace(/^(import\s[^;]*?\sfrom\s)'([^']+)'/gm, (_, head: string, spec: string) => {
      if (!(spec in imports)) throw new Error(`import inattendu : ${spec}`);
      return `${head}'${imports[spec]}'`;
    });
  const files: Record<string, string> = {
    'slug.mjs': rewrite(source('src/lib/services/common/slug/index.js')),
    'constants.mjs': rewrite(source('src/lib/services/common/slug/constants.js')),
    'transliterate.mjs': rewrite(source('@sindresorhus/transliterate/index.js')),
    'replacements.mjs': rewrite(source('@sindresorhus/transliterate/replacements.js')),
    'locale-replacements.mjs': rewrite(source('@sindresorhus/transliterate/locale-replacements.js')),
    'stubs.mjs': [
      `export const cmsConfig = { current: ${JSON.stringify({ slug: slugOptions })} };`,
      "export const generateUUID = () => 'repli-uuid';",
      'export const truncate = (value, length) => value.slice(0, length);',
      'export const getOrCreate = (map, key, create) => { if (!map.has(key)) map.set(key, create()); return map.get(key); };',
    ].join('\n'),
  };
  const dir = mkdtempSync(join(tmpdir(), 'sveltia-slugify-'));
  try {
    for (const [name, code] of Object.entries(files)) writeFileSync(join(dir, name), code);
    const module = await import(/* @vite-ignore */ pathToFileURL(join(dir, 'slug.mjs')).href);
    return module.slugify;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('config CMS — slugs ASCII (plan 22, F2)', () => {
  // `{{slug}}` d'une nouvelle entrée = son `identifier_field` (le titre) passé
  // par `slugify` (`common/template/replacers.js`, `{ locale, maxLength:
  // Infinity, fallback: false }`) avec les options GLOBALES `slug` de la
  // config. Sans elles (`encoding: unicode`, `clean_accents: false`), un titre
  // français donne un dossier accentué (`essai-création/`), fréquent avec le
  // bookmarklet 💡 (vérification 1, constat 3 ; D151).
  const title = 'Essai création à la une';

  it('options slug : clean_accents, encoding ascii, lowercase — clés du schéma SlugOptions de Sveltia', () => {
    const cfg = loadCmsConfig();
    expect(cfg.slug).toEqual({ encoding: 'ascii', clean_accents: true, lowercase: true });
    const schema = JSON.parse(readFileSync(new URL('../../node_modules/@sveltia/cms/schema/sveltia-cms.json', import.meta.url), 'utf8'));
    const { properties } = schema.definitions.SlugOptions;
    for (const [key, value] of Object.entries(cfg.slug)) {
      expect(Object.keys(properties), key).toContain(key);
      if (properties[key].enum) expect(properties[key].enum, key).toContain(value);
      else expect(typeof value, key).toBe(properties[key].type);
    }
  });

  it('« Essai création à la une » → essai-creation-a-la-une (slugify de Sveltia 0.221, options de config.yml)', async () => {
    const slugify = await sveltiaSlugify(loadCmsConfig().slug);
    const asTemplate = (value: string) => slugify(value, { maxLength: Infinity, fallback: false });
    expect(asTemplate(title)).toBe('essai-creation-a-la-une');
    // Titres types du bookmarklet 💡 (titre de page, sélection) : dossier ASCII.
    for (const t of [
      'L’été : 10 astuces — Docker & K8s',
      '« Cœur » du système, ça marche ?',
      '💡 Idée : Noël à Zürich',
      'Ça va… très bien !',
    ]) {
      expect(asTemplate(t), t).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    expect(asTemplate('« Cœur » du système, ça marche ?')).toBe('coeur-du-systeme-ca-marche');
  });

  it('sans ces options, Sveltia 0.221 garde les accents (constat 3 reproduit)', async () => {
    const slugify = await sveltiaSlugify(undefined);
    expect(slugify(title, { maxLength: Infinity, fallback: false })).toBe('essai-création-à-la-une');
  });
});
