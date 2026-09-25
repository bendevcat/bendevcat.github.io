import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createMarkdownProcessor, parseFrontmatter, type AstroMarkdownOptions } from '@astrojs/markdown-remark';
import { markdownOptions } from '../markdownOptions.mjs';
import { codeWindowText } from '../codeWindow';
import { INCOMPLETE_CLASS, remarkBlocks } from './remarkBlocks.mjs';
import { provideSiteEntries, resetSiteEntries, type SiteEntry } from './siteEntries.mjs';

/**
 * Rendu des blocs `:::` par le pipeline markdown du site (plan 23, T1, R2–R4 ;
 * décisions D152, D153) : `createMarkdownProcessor` d'Astro avec l'objet
 * `markdownOptions` que lisent `astro.config.mjs` et l'aperçu.
 */

const ENTRIES: SiteEntry[] = [
  { collection: 'projects', id: 'gha-svu', title: 'gha-svu — versionnage', description: 'Une action composite.', draft: false },
  { collection: 'blog', id: 'brouillon', title: 'Un brouillon', description: 'Pas encore publié.', draft: true },
  { collection: 'prompts', id: 'macos-clone', title: 'macOS clone', description: 'Cloner un Mac.', draft: false },
];

const ARTICLE = new URL('file:///repo/src/content/blog/demo-blocs/index.md');

const site = await createMarkdownProcessor(markdownOptions as AstroMarkdownOptions);
const withoutBlocks = await createMarkdownProcessor({
  ...markdownOptions,
  remarkPlugins: (markdownOptions.remarkPlugins ?? []).filter((plugin) => plugin !== remarkBlocks),
} as AstroMarkdownOptions);

async function render(md: string, frontmatter: Record<string, unknown> = { draft: false }, fileURL = ARTICLE) {
  return site.render(md, { fileURL, frontmatter });
}

async function dom(md: string) {
  const { code } = await render(md);
  return { code, doc: new JSDOM(`<body>${code}</body>`).window.document };
}

beforeEach(() => {
  provideSiteEntries({ mode: 'site', entries: () => ENTRIES });
});

describe('blocs : rendu du site', () => {
  it('remarkBlocks fait partie des options markdown partagées', () => {
    expect(markdownOptions.remarkPlugins).toContain(remarkBlocks);
  });

  const TONES = { note: 'Blue', astuce: 'Green', attention: 'Amber', danger: 'Rose' } as const;
  const LABELS = { note: 'Note', astuce: 'Astuce', attention: 'Attention', danger: 'Danger' } as const;

  for (const kind of Object.keys(TONES) as (keyof typeof TONES)[]) {
    it(`encadrés : aside role=note, libellé, markdown rendu, ton (${kind})`, async () => {
      const { doc } = await dom(`Avant.\n\n:::${kind}\n\nUn **gras**, un [lien](/blog/) et \`code\`.\n\n- un\n- deux\n\n:::\n\nAprès.`);
      const asides = doc.querySelectorAll('aside');
      expect(asides).toHaveLength(1);
      const aside = asides[0];
      expect(aside.getAttribute('role')).toBe('note');
      expect(aside.getAttribute('data-callout')).toBe(kind);
      expect(aside.getAttribute('aria-label')).toBe(LABELS[kind]);
      expect(aside.hasAttribute('data-pagefind-ignore')).toBe(false);
      const label = aside.querySelector('[data-callout-label]')!;
      expect(label.textContent).toBe(LABELS[kind]);
      const body = aside.querySelector('[data-callout-body]')!;
      expect(body.querySelector('strong')?.textContent).toBe('gras');
      expect(body.querySelector('a')?.getAttribute('href')).toBe('/blog/');
      expect(body.querySelector('code')?.textContent).toBe('code');
      expect(body.querySelectorAll('li')).toHaveLength(2);
      const tone = TONES[kind];
      expect(aside.className).toContain(`bg-tag${tone}Bg`);
      expect(aside.className).toContain(`border-tag${tone}Line`);
      expect(label.className).toContain(`text-tag${tone}Ink`);
      // Les paragraphes autour restent des paragraphes.
      expect([...doc.querySelectorAll('body > p')].map((p) => p.textContent)).toEqual(['Avant.', 'Après.']);
    });
  }

  it('terminal : balisage CodeWindow, texte du code exact, non colorié par Shiki', async () => {
    const code = 'kubectl get pods -n "prod"\n\n  echo <b>&amp;</b> `x`\n:::note';
    const md = `::::terminal[k9s — « prod »]\n\n\`\`\`bash\n${code}\n\`\`\`\n\n::::`;
    const { doc, code: html } = await dom(md);
    const figure = doc.querySelector('figure')!;
    expect(figure.hasAttribute('data-code-window')).toBe(true);
    expect(figure.hasAttribute('data-terminal')).toBe(true);
    expect(figure.getAttribute('data-code-lang')).toBe('bash');
    expect(figure.getAttribute('aria-label')).toBe('Terminal : k9s — « prod »');
    // Indexé comme le code des articles.
    expect(figure.hasAttribute('data-pagefind-ignore')).toBe(false);
    // Barre : trois pastilles, puce de titre, « Copier » caché.
    expect(figure.querySelectorAll('.bg-windowDotRed, .bg-windowDotAmber, .bg-windowDotGreen')).toHaveLength(3);
    expect(figure.querySelector('[data-code-file]')?.textContent).toBe('k9s — « prod »');
    const copy = figure.querySelector('button[data-code-copy]')!;
    expect(copy.textContent).toBe('Copier');
    expect(copy.hasAttribute('hidden')).toBe(true);
    expect(copy.getAttribute('type')).toBe('button');
    // Corps : gouttière numérotée + code exact.
    const pre = figure.querySelector('pre')!;
    expect(pre.children).toHaveLength(2);
    const gutter = pre.querySelector('[data-code-gutter]')!;
    expect(gutter.getAttribute('aria-hidden')).toBe('true');
    expect(gutter.textContent).toBe('1\n2\n3\n4');
    expect(pre.querySelector('code')!.textContent).toBe(codeWindowText(code));
    // Pas de Shiki : ni classe astro-code, ni style en ligne, ni span coloré.
    expect(html).not.toContain('astro-code');
    expect(pre.hasAttribute('style')).toBe(false);
    expect(pre.querySelectorAll('code span')).toHaveLength(0);
    // Toujours sombre : uniquement des tokens window*.
    expect(figure.className).toContain('bg-windowBg');
  });

  it('terminal : titre YAML → coloration clé/valeur de codeWindowLines', async () => {
    const { doc } = await dom(':::terminal[ci.yml]\n\n```yaml\nname: CI\non: push\n```\n\n:::');
    const keys = [...doc.querySelectorAll('[data-code-key]')].map((el) => el.textContent);
    expect(keys).toEqual(['name:', 'on:']);
    expect(doc.querySelector('pre code')!.textContent).toBe('name: CI\non: push');
  });

  it('carte : lien, titre et description de l’entrée, pagefind-ignore', async () => {
    const { doc } = await dom(':::carte{ref="projects/gha-svu"}\n:::\n\n:::carte{ref="prompts/macos-clone"}\n:::');
    const cards = doc.querySelectorAll('a[data-entry-card]');
    expect(cards).toHaveLength(2);
    const [project, prompt] = cards;
    expect(project.getAttribute('href')).toBe('/projets/gha-svu/');
    expect(project.getAttribute('data-entry-card')).toBe('projects/gha-svu');
    expect(project.hasAttribute('data-pagefind-ignore')).toBe(true);
    expect(project.querySelector('[data-entry-card-kind]')?.textContent).toBe('Projet');
    expect(project.querySelector('[data-entry-card-title]')?.textContent).toBe('gha-svu — versionnage');
    expect(project.querySelector('[data-entry-card-description]')?.textContent).toBe('Une action composite.');
    expect(prompt.getAttribute('href')).toBe('/prompts/macos-clone/');
    expect(prompt.querySelector('[data-entry-card-kind]')?.textContent).toBe('Prompt');
  });

  it('vidéo : un lien vers le fournisseur, 0 iframe, 0 img, pagefind-ignore', async () => {
    const { doc, code: html } = await dom(
      ':::video[Big Buck Bunny]{youtube="aqz-KE-bpKQ"}\n:::\n\n:::video[Installer k9s]{asciinema="335480"}\n:::',
    );
    const figures = doc.querySelectorAll('figure[data-video]');
    expect(figures).toHaveLength(2);
    const [yt, cast] = figures;
    expect(yt.getAttribute('data-provider')).toBe('youtube');
    expect(yt.getAttribute('data-video-id')).toBe('aqz-KE-bpKQ');
    expect(yt.hasAttribute('data-pagefind-ignore')).toBe(true);
    const links = yt.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    expect(links[0].textContent).toContain('Big Buck Bunny');
    expect(links[0].textContent).toContain('Lecture sur YouTube au clic');
    expect(cast.querySelector('a')!.getAttribute('href')).toBe('https://asciinema.org/a/335480');
    expect(cast.textContent).toContain('Lecture sur asciinema au clic');
    expect(doc.querySelectorAll('iframe')).toHaveLength(0);
    expect(doc.querySelectorAll('img')).toHaveLength(0);
    // Aucune URL tierce hors des deux liens.
    const urls = [...html.matchAll(/https?:\/\/[^"'\s<>)]+/g)].map((m) => m[0]);
    expect(urls.sort()).toEqual(['https://asciinema.org/a/335480', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ']);
    // Toujours sombre, 16:9.
    expect(yt.className).toContain('bg-windowBg');
    expect(yt.className).toContain('aspect-video');
  });

  it('drapeau de blocs dans le frontmatter des plugins (scripts conditionnels)', async () => {
    const { metadata } = await render(':::terminal[t]\n\n```\nx\n```\n\n:::\n\n:::video[v]{youtube="aqz-KE-bpKQ"}\n:::');
    expect(metadata.frontmatter.blocks).toEqual({ callout: 0, terminal: 1, carte: 0, video: 1 });
    const plain = await render('Rien.');
    expect(plain.metadata.frontmatter).not.toHaveProperty('blocks');
    // Le frontmatter reçu n'est pas modifié en place.
    const frontmatter = { draft: false };
    await render(':::note\n\nx\n\n:::', frontmatter);
    expect(frontmatter).toEqual({ draft: false });
  });
});

describe('blocs : erreurs de build', () => {
  it('ref inconnue : erreur nommant le fichier et la ref', async () => {
    await expect(render(':::carte{ref="blog/inexistant"}\n:::')).rejects.toThrow(
      /demo-blocs\/index\.md[\s\S]*blog\/inexistant/,
    );
  });

  it('cible brouillon citée par un article publié : erreur', async () => {
    await expect(render(':::carte{ref="blog/brouillon"}\n:::', { draft: false })).rejects.toThrow(/blog\/brouillon/);
    // Citée par un brouillon : permis.
    const { code } = await render(':::carte{ref="blog/brouillon"}\n:::', { draft: true });
    expect(code).toContain('data-entry-card="blog/brouillon"');
  });

  it('id vidéo invalide : erreur', async () => {
    await expect(render(':::video[t]{youtube="trop-court"}\n:::')).rejects.toThrow(/demo-blocs[\s\S]*trop-court/);
    await expect(render(':::video[t]{asciinema="a_b"}\n:::')).rejects.toThrow(/a_b/);
    await expect(render(':::video[t]{vimeo="123"}\n:::')).rejects.toThrow(/vimeo/);
    await expect(render(':::video[t]{youtube="aqz-KE-bpKQ" asciinema="1"}\n:::')).rejects.toThrow();
    await expect(render(':::video{youtube="aqz-KE-bpKQ"}\n:::')).rejects.toThrow(/titre/);
  });

  it('nom de bloc inconnu : erreur', async () => {
    await expect(render(':::info\n\nx\n\n:::')).rejects.toThrow(/« info » dans \S*demo-blocs\/index\.md[\s\S]*nom de bloc inconnu/);
  });

  it('sans index fourni : erreur', async () => {
    resetSiteEntries();
    await expect(render(':::carte{ref="projects/gha-svu"}\n:::')).rejects.toThrow(
      /Bloc carte dans \S*demo-blocs\/index\.md : aucun index d'entrées fourni \(provideSiteEntries\) — impossible de résoudre « projects\/gha-svu »/,
    );
    // Sans fournisseur, un bloc invalide lève comme au build (pas d'espace réservé).
    await expect(render(':::video[]{youtube=""}\n:::')).rejects.toThrow(/« video » dans \S*demo-blocs/);
    // Sans carte, aucun index n'est demandé.
    await expect(render(':::note\n\nx\n\n:::')).resolves.toBeDefined();
  });

  it('formes invalides : titre d’encadré, terminal sans bloc de code, ref mal formée', async () => {
    await expect(render(':::note[Titre]\n\nx\n\n:::')).rejects.toThrow(/note/);
    await expect(render(':::terminal[t]\n\ntexte\n\n:::')).rejects.toThrow(/code/);
    await expect(render(':::terminal[a [b] c]\n\n```\nx\n```\n\n:::')).rejects.toThrow(/titre/);
    await expect(render(':::carte{ref="Blog/X"}\n:::')).rejects.toThrow(/Blog\/X/);
    await expect(render(':::carte\n:::')).rejects.toThrow(/ref/);
  });
});

/** Blocs incomplets (formulaire à peine inséré) ou invalides : message attendu. */
const INCOMPLETE: [string, string, RegExp][] = [
  ['vidéo sans titre ni id', ':::video[]{youtube=""}\n:::', /^Bloc incomplet : Vidéo — titre vide$/],
  ['vidéo sans id', ':::video[Titre]{youtube=""}\n:::', /^Bloc incomplet : Vidéo — .*id/],
  ['terminal sans titre', ':::terminal[]\n\n```bash\n```\n\n:::', /^Bloc incomplet : Terminal — titre vide$/],
  ['terminal sans bloc de code', ':::terminal[t]\n\ntexte\n\n:::', /^Bloc incomplet : Terminal — .*bloc de code/],
  ['carte sans ref', ':::carte{ref=""}\n:::', /^Bloc incomplet : Carte — .*ref/],
  ['encadré titré', ':::note[Titre]\n\nx\n\n:::', /^Bloc incomplet : Encadré — .*titre/],
  ['nom inconnu', ':::info\n\nx\n\n:::', /^Bloc incomplet : « info » — nom de bloc inconnu/],
];

describe('aperçu : bloc incomplet ou invalide (plan 23, F2 ; D158)', () => {
  it('espace réservé neutre « Bloc incomplet : … », sans exception ni console.error', async () => {
    provideSiteEntries({ mode: 'preview', entries: () => ENTRIES });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const [what, md, message] of INCOMPLETE) {
        const { doc, code } = await dom(`Avant.\n\n${md}\n\nAprès.`);
        const holders = doc.querySelectorAll('[data-block-incomplete]');
        expect(holders, what).toHaveLength(1);
        const holder = holders[0];
        expect(holder.tagName, what).toBe('DIV');
        expect(holder.textContent, what).toMatch(message);
        // Le message ne cite ni le fichier fictif ni la ligne (aperçu).
        expect(holder.textContent, what).not.toMatch(/preview|index\.md|ligne/);
        expect(holder.hasAttribute('data-pagefind-ignore'), what).toBe(true);
        // Neutre (pas le rose de la carte d'erreur), tokens seulement.
        expect(holder.className, what).toBe(INCOMPLETE_CLASS);
        expect(code, what).not.toMatch(/<iframe|<img|:::/);
        expect([...doc.querySelectorAll('body > p')].map((p) => p.textContent), what).toEqual(['Avant.', 'Après.']);
      }
      expect(errors).not.toHaveBeenCalled();
      expect(warnings).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
      warnings.mockRestore();
    }
  });

  it('un bloc complet voisin est rendu normalement', async () => {
    provideSiteEntries({ mode: 'preview', entries: () => ENTRIES });
    const { doc } = await dom(':::video[]{youtube=""}\n:::\n\n:::video[V]{youtube="aqz-KE-bpKQ"}\n:::');
    expect(doc.querySelectorAll('[data-block-incomplete]')).toHaveLength(1);
    expect(doc.querySelectorAll('figure[data-video]')).toHaveLength(1);
  });

  it('site : les mêmes blocs lèvent toujours (le build échoue)', async () => {
    for (const [what, md] of INCOMPLETE) {
      await expect(render(md), what).rejects.toThrow(/dans \S*demo-blocs\/index\.md/);
    }
  });
});

describe('aperçu : politique d’absence', () => {
  it('ref inconnue → carte d’erreur visible, pas d’exception', async () => {
    provideSiteEntries({ mode: 'preview', entries: () => ENTRIES });
    const { doc } = await dom(':::carte{ref="blog/inexistant"}\n:::');
    const missing = doc.querySelector('[data-entry-card-missing]')!;
    expect(missing.getAttribute('data-entry-card-missing')).toBe('blog/inexistant');
    expect(missing.textContent).toBe('Entrée introuvable : blog/inexistant');
    expect(doc.querySelectorAll('a')).toHaveLength(0);
  });
});

describe('blocs : le reste de la syntaxe est intact', () => {
  it('`:pods`, `a:b`, `::x`, `:x[y]{z}` rendus comme sans le plugin', async () => {
    const samples = [
      'Tape `:pods` puis :pods et :deploy pour lister.',
      'Un ratio a:b et une heure 12:30, https://example.com:8080.',
      '::x',
      '::x[y]{z}\n\ntexte',
      'Texte :x[y]{z} au milieu.',
      ':x[y]{z}',
      '| a:b | :pods |\n|---|---|\n| ::x | :x[y]{z} |',
      '::: note\n\nun espace après les deux-points\n\n:::',
      '::\n\n:',
      '```\n:::note\n```',
    ];
    for (const md of samples) {
      const expected = (await withoutBlocks.render(md, { fileURL: ARTICLE })).code;
      expect((await render(md)).code, md).toBe(expected);
    }
  });

  it('les corps réels de src/content sont rendus comme sans le plugin', { timeout: 60_000 }, async () => {
    const root = new URL('../../content/', import.meta.url);
    let count = 0;
    for (const collection of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const dir = new URL(`${collection.name}/`, root);
      for (const slug of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
        const file = new URL(`${slug.name}/index.md`, dir);
        if (!existsSync(file)) continue;
        const { frontmatter, content } = parseFrontmatter(readFileSync(file, 'utf8'));
        const expected = await withoutBlocks.render(content, { fileURL: file, frontmatter });
        const actual = await site.render(content, { fileURL: file, frontmatter });
        expect(actual.code, file.pathname).toBe(expected.code);
        expect(actual.metadata.frontmatter, file.pathname).toEqual(expected.metadata.frontmatter);
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});

describe('fixture blocs-demo', () => {
  it('la fixture est une entrée de blog publiée qui porte les quatre blocs', async () => {
    const raw = readFileSync(new URL('./fixtures/blocs-demo.md', import.meta.url), 'utf8');
    const { frontmatter, content } = parseFrontmatter(raw);
    expect(frontmatter.draft).toBe(false);
    provideSiteEntries({
      mode: 'site',
      entries: () => [
        { collection: 'projects', id: 'gha-svu', title: 'gha-svu', description: 'd', draft: false },
      ],
    });
    const { code, metadata } = await site.render(content, { fileURL: ARTICLE, frontmatter });
    const doc = new JSDOM(`<body>${code}</body>`).window.document;
    expect([...doc.querySelectorAll('aside[data-callout]')].map((a) => a.getAttribute('data-callout'))).toEqual([
      'note',
      'astuce',
      'attention',
      'danger',
    ]);
    expect(doc.querySelectorAll('figure[data-terminal]')).toHaveLength(1);
    expect([...doc.querySelectorAll('a[data-entry-card]')].map((a) => a.getAttribute('href'))).toEqual([
      '/projets/gha-svu/',
    ]);
    expect([...doc.querySelectorAll('figure[data-video]')].map((f) => f.getAttribute('data-provider'))).toEqual([
      'youtube',
      'asciinema',
    ]);
    expect(metadata.frontmatter.blocks).toEqual({ callout: 4, terminal: 1, carte: 1, video: 2 });
  });
});
