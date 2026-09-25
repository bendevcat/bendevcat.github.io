import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('config CMS — suppression désactivée (D08)', () => {
  it('interdit la suppression sur blog et projects : le CMS ne nettoie pas les rétro-références', () => {
    const cfg = loadCmsConfig();
    // Défaut Sveltia = true. Sans `delete: false`, supprimer une entrée laisse
    // une référence morte (`relatedPosts`/`relatedProjects`) sur l'autre
    // collection : le commit suivant casse `assertEntriesResolved` et
    // `astro build` ne produit plus aucune page (constat I1, revue T-C1).
    expect(cfg.collections[0].name).toBe('blog');
    expect(cfg.collections[0].delete).toBe(false);
    expect(cfg.collections[1].name).toBe('projects');
    expect(cfg.collections[1].delete).toBe(false);
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
    expect(byName.snippet.widget).toBe('text');
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
  it('pointe le bon dossier, en page bundle, sans suppression', () => {
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'prompts');
    expect(coll.folder).toBe('src/content/prompts');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.extension).toBe('md');
    expect(coll.format).toBe('yaml-frontmatter');
    expect(coll.delete).toBe(false);
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
    expect(byName.prompt.widget).toBe('text');
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
  it('pointe le bon dossier, en page bundle, sans suppression', () => {
    // Complété (I4, D10) : cette assertion omettait `extension`, `format`,
    // `media_folder` et `public_folder`, pourtant vérifiés sur `prompts` —
    // asymétrie du garde-fou entre les deux collections jumelles.
    const cfg = loadCmsConfig();
    const coll = cfg.collections.find((c: any) => c.name === 'skills');
    expect(coll.folder).toBe('src/content/skills');
    expect(coll.path).toBe('{{slug}}/index');
    expect(coll.extension).toBe('md');
    expect(coll.format).toBe('yaml-frontmatter');
    expect(coll.delete).toBe(false);
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
    // Multiligne : l'extrait garde ses sauts de ligne.
    expect(sub.excerpt.widget).toBe('text');
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
