import { describe, it, expect } from 'vitest';
import { runInNewContext } from 'node:vm';
import {
  DESCRIPTION_MAX,
  PROMPT_MAX,
  TITLE_MAX,
  adminBase,
  bookmarkletSource,
  bookmarklets,
  ideaBookmarklet,
  promptBookmarklet,
  quickLinks,
} from './bookmarklets';

/**
 * Plan 22, R13. Chaque bookmarklet est EXÉCUTÉ (source tirée de son `href`
 * comme le fait le navigateur) dans `node:vm` avec `getSelection`, `document`,
 * `location` et `open` factices ; l'URL passée à `open` est relue comme
 * Sveltia 0.221 la relit.
 */

const SITE = 'https://bendevcat.github.io';
const ADMIN = adminBase(SITE);

/**
 * Réplique de `parseLocation` (`src/lib/services/app/navigation.js` de
 * Sveltia 0.221, `npm/index.js.map`) suivie du `trim()` de `populateDefaultValue`
 * (`contents/draft/defaults.js`, valeur vide → ignorée) : le hash devient le
 * chemin d'une seconde URL, `URLSearchParams` décode la requête (`+` → espace,
 * puis `%XX`), les clés répétées sont jointes par `,`.
 */
function readAsSveltia(href: string): { path: string; values: Record<string, string> } {
  const { origin, hash } = new URL(href);
  const { pathname, searchParams } = new URL(`${origin}${hash.substring(1)}`);
  const params = Object.fromEntries(
    [...new Set(searchParams.keys())].map((key) => [key, searchParams.getAll(key).join(',')]),
  );
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value.trim()) values[key] = value.trim();
  }
  return { path: decodeURIComponent(pathname.replace(/(?!^)\/+$/, '')), values };
}

interface Page {
  selection?: string | null;
  title?: string;
  href?: string;
}

/** Exécute un bookmarklet sur une page factice ; renvoie les appels à `open`. */
function run(href: string, page: Page = {}): Array<{ url: string; target: string; features: string }> {
  const calls: Array<{ url: string; target: string; features: string }> = [];
  const selection = page.selection;
  const context: Record<string, unknown> = {
    document: { title: page.title ?? '' },
    location: { href: page.href ?? 'https://exemple.fr/page' },
    getSelection: () => (selection === null ? null : { toString: () => selection ?? '' }),
    open: (url: string, target: string, features: string) => {
      calls.push({ url, target, features });
      return null;
    },
  };
  context.window = context;
  const result = runInNewContext(bookmarkletSource(href), context);
  // Un bookmarklet qui renvoie une valeur remplace la page par cette valeur.
  expect(result).toBeUndefined();
  return calls;
}

function openOnce(href: string, page: Page = {}) {
  const calls = run(href, page);
  expect(calls).toHaveLength(1);
  const [call] = calls;
  expect(call.target).toBe('_blank');
  expect(call.features).toBe('noopener,noreferrer');
  expect(call.url.startsWith(`${ADMIN}#/collections/`)).toBe(true);
  return readAsSveltia(call.url);
}

const TRICKY = `Il a dit "oui" & l'a noté : 50 % + 1 # pas un fragment — café ☕ 👩‍💻 a+b=c ?x=1&y=2 %20 %zz`;

describe('bookmarklets (plan 22, R13)', () => {
  it('💡 : sélection sinon titre de page, source dans la description, draft=true', () => {
    const withSelection = openOnce(ideaBookmarklet(ADMIN), {
      selection: '  Kubernetes   sans\n douleur  ',
      title: 'Titre de la page',
      href: 'https://exemple.fr/billet?id=3&x=a+b#section',
    });
    expect(withSelection).toEqual({
      path: '/collections/blog/new',
      values: {
        title: 'Kubernetes sans douleur',
        description: 'Source : https://exemple.fr/billet?id=3&x=a+b#section',
        draft: 'true',
      },
    });

    for (const selection of ['', '   \n\t ', null]) {
      const noSelection = openOnce(ideaBookmarklet(ADMIN), {
        selection,
        title: 'Titre de la page',
        href: 'https://exemple.fr/',
      });
      expect(noSelection.values).toEqual({
        title: 'Titre de la page',
        description: 'Source : https://exemple.fr/',
        draft: 'true',
      });
    }

    // Ni sélection ni titre : pas de paramètre `title` (le champ reste vide).
    const bare = openOnce(ideaBookmarklet(ADMIN), { selection: '', title: '', href: 'https://exemple.fr/' });
    expect(bare.values).toEqual({ description: 'Source : https://exemple.fr/', draft: 'true' });
  });

  it('💬 : sélection multiligne → prompt, draft=true', () => {
    const prompt = 'Tu es un relecteur.\n\n  - garde le ton\r\n  - cite la ligne\n\nRéponds en français.';
    const opened = openOnce(promptBookmarklet(ADMIN), { selection: `\n${prompt}\n  `, title: 'Page' });
    expect(opened).toEqual({
      path: '/collections/prompts/new',
      // CRLF ramené à LF ; indentation et lignes vides internes conservées.
      values: { prompt: prompt.replace(/\r\n/g, '\n'), draft: 'true' },
    });

    // Sans sélection : seul `draft` (le titre de la page n'est PAS un prompt).
    expect(openOnce(promptBookmarklet(ADMIN), { selection: '', title: 'Page' }).values).toEqual({
      draft: 'true',
    });
  });

  it('relu par URLSearchParams comme Sveltia : valeurs exactes (espaces, +, &, #, accents, sauts de ligne)', () => {
    const multiline = `${TRICKY}\nligne 2 : « guillemets » ‘simples’ \`code\`\n\tligne 3 indentée`;
    expect(openOnce(promptBookmarklet(ADMIN), { selection: multiline }).values).toEqual({
      prompt: multiline,
      draft: 'true',
    });

    const idea = openOnce(ideaBookmarklet(ADMIN), {
      selection: TRICKY,
      href: `https://exemple.fr/a b?q=${encodeURIComponent('é&#')}&r=+#frag#2`,
    });
    expect(idea.values.title).toBe(TRICKY);
    expect(idea.values.description).toBe(`Source : https://exemple.fr/a b?q=${encodeURIComponent('é&#')}&r=+#frag#2`);
    expect(idea.values.draft).toBe('true');
    expect(Object.keys(idea.values).sort()).toEqual(['description', 'draft', 'title']);
  });

  it('texte très long : tronqué par point de code, URL bornée, jamais de demi-emoji', () => {
    // Des emojis hors BMP : une coupe par unité UTF-16 laisserait une moitié de
    // paire de substitution, et encodeURIComponent lèverait URIError.
    const long = '😀'.repeat(PROMPT_MAX + 500);
    const prompt = openOnce(promptBookmarklet(ADMIN), { selection: long });
    expect(Array.from(prompt.values.prompt)).toHaveLength(PROMPT_MAX + 1);
    expect(prompt.values.prompt.endsWith('😀…')).toBe(true);

    const idea = openOnce(ideaBookmarklet(ADMIN), {
      selection: 'mot '.repeat(TITLE_MAX),
      href: `https://exemple.fr/?q=${'x'.repeat(DESCRIPTION_MAX * 2)}`,
    });
    expect(Array.from(idea.values.title)).toHaveLength(TITLE_MAX + 1);
    expect(idea.values.title.endsWith('…')).toBe(true);
    expect(Array.from(idea.values.description)).toHaveLength(DESCRIPTION_MAX + 1);

    // Pire cas : chaque champ plein de caractères de 4 octets UTF-8 (12 car. encodés).
    const calls = run(promptBookmarklet(ADMIN), { selection: long });
    expect(calls[0].url.length).toBeLessThan(256 * 1024);

    // Juste à la limite : rien n'est tronqué.
    const exact = 'é'.repeat(PROMPT_MAX);
    expect(openOnce(promptBookmarklet(ADMIN), { selection: exact }).values.prompt).toBe(exact);
  });

  it('href javascript: stable pour le navigateur (URL inchangée à la relecture, sans saut de ligne ni %)', () => {
    for (const { href } of bookmarklets(SITE)) {
      expect(href.startsWith('javascript:')).toBe(true);
      // Le parseur d'URL supprime tabulations et sauts de ligne ; le navigateur
      // décode les %XX avant d'exécuter : tout est donc encodé.
      expect(href).not.toMatch(/[\s#"<>]/);
      expect(new URL(href).href).toBe(href);
      expect(bookmarkletSource(new URL(href).href)).toBe(bookmarkletSource(href));
    }
  });

  it('cibles : /admin/ de l’origine de production, deux bookmarklets nommés', () => {
    expect(ADMIN).toBe('https://bendevcat.github.io/admin/');
    expect(adminBase(new URL('https://bendevcat.github.io/blog/'))).toBe(ADMIN);
    const list = bookmarklets(SITE);
    expect(list.map((b) => [b.id, b.label])).toEqual([
      ['idea', "💡 Idée d'article"],
      ['prompt', '💬 Nouveau prompt'],
    ]);
    expect(list.map((b) => b.href)).toEqual([ideaBookmarklet(ADMIN), promptBookmarklet(ADMIN)]);
  });

  it('liens simples', () => {
    expect(quickLinks().map((l) => l.href)).toEqual([
      '/admin/#/collections/blog/new?draft=true',
      '/admin/#/collections/prompts/new?draft=true',
    ]);
    for (const { href } of quickLinks()) {
      const read = readAsSveltia(new URL(href, SITE).href);
      expect(read.values).toEqual({ draft: 'true' });
      expect(read.path).toMatch(/^\/collections\/(blog|prompts)\/new$/);
    }
  });
});
