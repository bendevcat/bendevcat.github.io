// src/lib/pageLayout.test.ts
//
// Gardes statiques de mise en page (plan 18) — lues dans le source, sans build.
// T1, inventaire §10 (petits écarts accueil / à propos) :
// - R1 : l'accueil espace ses rangées et ses colonnes de 16 px (`gap-4`), comme
//   le `gap:16px` du prototype (home 57–161) sur `<main>` et les deux grilles ;
//   chacun des 4 en-têtes (Derniers articles, Projets, Prompts, Skills) aligne
//   son titre à droite, collé au badge (10 px, `gap-2.5`) — rendu du
//   `row-reverse` + `justify-content:flex-start` + `flex:1; text-align:right`
//   du prototype, en gardant l'ordre du DOM titre puis badge.
// - R2 : « Pourquoi ce site » porte une bordure gauche de 3 px `accent` (les
//   autres côtés restent ceux de `.card`) ; les liens d'identité restent
//   github.com/bendevcat et rss.xml, sans mail ni LinkedIn (D42), et la carte
//   « On parle ? » reste absente (D42, D63).
// La mesure rendue (16 ± 1, 10 ± 1, 3 px accent) est celle de la vérification.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');

/** Classes (séparées par des blancs) d'une balise ouvrante. */
function classesOf(tag: string): string[] {
  const match = tag.match(/\sclass="([^"]*)"/);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

// Balisage d'un composant : sans frontmatter ni commentaires JSX (accolade, barre, étoile).
function markupOf(source: string): string {
  return source.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/** Balises ouvrantes `<name …>` du source, dans l'ordre. */
function openTags(source: string, name: string): string[] {
  return source.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) ?? [];
}

/**
 * En-tête d'un panneau d'accueil : la `<div>` ouvrante qui précède
 * immédiatement le `<h2>`, et le texte qui suit jusqu'à sa fermeture.
 */
function homeHeader(source: string) {
  const h2 = source.indexOf('<h2');
  expect(h2, 'pas de <h2> dans le panneau').toBeGreaterThan(-1);
  const divStart = source.lastIndexOf('<div', h2);
  const divTag = source.slice(divStart, source.indexOf('>', divStart) + 1);
  const bodyEnd = source.indexOf('</div>', h2);
  return { divTag, body: source.slice(h2, bodyEnd) };
}

const HOME_PANELS = ['components/home/LatestPosts.astro', 'components/home/SectionPanel.astro'];

describe('home layout (plan 18 T1, inventory §10)', () => {
  it('spaces the home rows and columns 16 px apart', () => {
    const page = markupOf(read('pages/index.astro'));
    const main = openTags(page, 'main');
    expect(main).toHaveLength(1);
    const grids = openTags(page, 'div').filter((tag) => classesOf(tag).includes('grid'));
    expect(grids).toHaveLength(2); // rangée 1 (featured | latest), rangée 2 (3 sections)
    for (const tag of [...main, ...grids]) {
      const classes = classesOf(tag);
      expect(classes, tag).toContain('gap-4');
      expect(classes.filter((c) => /^(?:[a-z]+:)*gap(?:-[xy])?-/.test(c)), tag).toEqual(['gap-4']);
    }
  });

  it('puts each home header title right-aligned beside its badge, 10 px apart', () => {
    for (const file of HOME_PANELS) {
      const source = read(file);
      const { divTag, body } = homeHeader(source);
      const header = classesOf(divTag);
      expect(header, file).toEqual(expect.arrayContaining(['flex', 'items-center', 'justify-end', 'gap-2.5']));
      expect(header, file).not.toContain('justify-between');
      expect(header.filter((c) => /^gap-/.test(c)), file).toEqual(['gap-2.5']);

      // Titre puis badge dans le DOM ; le titre prend la place libre, aligné à droite.
      const h2 = openTags(body, 'h2')[0];
      expect(classesOf(h2), file).toEqual(expect.arrayContaining(['flex-1', 'min-w-0', 'text-right']));
      const badgeAt = body.indexOf('<span');
      expect(badgeAt, file).toBeGreaterThan(body.indexOf('</h2>'));
      const badge = body.slice(badgeAt, body.indexOf('>', badgeAt) + 1);
      expect(badge, file).toContain('aria-hidden="true"');
      expect(classesOf(badge), file).toEqual(expect.arrayContaining(['size-7', 'shrink-0']));
    }
    // Hooks inchangés : le titre de section reste le lien `data-home-title`.
    const panel = homeHeader(read('components/home/SectionPanel.astro')).body;
    expect(panel).toMatch(/<a href=\{`\/\$\{section\}\/`\}[^>]*data-home-title>/);
    expect(read('components/home/LatestPosts.astro')).toContain('id="home-latest-title"');
  });
});

describe('about layout (plan 18 T1, inventory §10)', () => {
  const source = read('pages/a-propos.astro');
  const page = markupOf(source);

  it('draws a 3 px accent left border on Pourquoi ce site only', () => {
    const sections = openTags(page, 'section');
    const why = sections.filter((tag) => tag.includes('aria-labelledby="about-why-title"'));
    expect(why).toHaveLength(1);
    const classes = classesOf(why[0]);
    expect(classes).toEqual(expect.arrayContaining(['card', 'border-l-3', 'border-l-accent']));
    // Seul le côté gauche change : aucune autre largeur ni couleur de bordure.
    expect(classes.filter((c) => /^border/.test(c))).toEqual(['border-l-3', 'border-l-accent']);
    // Aucune autre balise de la page ne porte de bordure gauche.
    const others = page.replace(why[0], '');
    expect(others).not.toMatch(/\bborder-l-/);
  });

  it('keeps the identity links to github and rss only', () => {
    const identity = read('components/about/Identity.astro');
    const hrefs = [...identity.matchAll(/href: '([^']*)'/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['https://github.com/bendevcat', '/rss.xml']);
    const labels = [...identity.matchAll(/label: '([^']*)'/g)].map((m) => m[1]);
    expect(labels).toEqual(['github.com/bendevcat', 'rss.xml']);
    // Aucun lien écrit en dur vers un mail ou LinkedIn (les commentaires
    // peuvent les nommer pour dire qu'ils n'existent pas).
    for (const text of [identity, source]) {
      const literal = [...text.matchAll(/href(?:=|:\s*)["'`]([^"'`]*)["'`]/g)].map((m) => m[1]);
      expect(literal.filter((href) => /mailto:|linkedin/i.test(href))).toEqual([]);
    }
    // « On parle ? » reste absent (D42, D63) du balisage (le commentaire qui
    // explique son absence est retiré) : deux cartes en rangée 2.
    expect(page).not.toContain('On parle');
    const row2 = page.slice(page.indexOf('data-about="row2"'));
    expect(openTags(row2.slice(0, row2.indexOf('<AiPanel')), 'section')).toHaveLength(2);
  });
});

// T5 (R8 ; D121 ; plan 17 v2, constat 1) : à 1024×768 et 1280×800, l'anneau de
// focus du dernier lien de la colonne collante d'une fiche skill (décalage 2 +
// trait 2) dépassait le bas de la zone de défilement de 3,8 px. Un
// `scroll-padding-bottom` d'au moins 6 px (8 : `lg:scroll-pb-2`) à partir de
// 1024 px — là seulement où la colonne défile — fait défiler le focus assez
// loin pour que l'anneau reste dans le scrollport.
/** Largeur en px d'une classe d'espacement Tailwind (`2` → 8, `[6px]` → 6). */
function spacingPx(value: string): number {
  const arbitrary = value.match(/^\[(\d+(?:\.\d+)?)px\]$/);
  if (arbitrary) return Number(arbitrary[1]);
  return /^\d+(?:\.\d+)?$/.test(value) ? Number(value) * 4 : NaN;
}

describe('skill aside (plan 18 T5)', () => {
  it("pads the sticky skill column's scroll by at least 6 px at the bottom", () => {
    const page = markupOf(read('pages/skills/[...slug].astro'));
    const asides = openTags(page, 'aside').filter((tag) => tag.includes('data-skill-aside'));
    expect(asides).toHaveLength(1);
    const classes = classesOf(asides[0]);
    // La colonne défile à partir de 1024 px seulement.
    expect(classes).toEqual(expect.arrayContaining(['lg:sticky', 'lg:max-h-[calc(100vh-40px)]', 'lg:overflow-y-auto']));
    const pads = classes.filter((c) => /^(?:[a-z]+:)*scroll-p[by]?-/.test(c));
    expect(pads, 'une seule marge de défilement basse, à partir de lg').toHaveLength(1);
    const match = pads[0].match(/^lg:scroll-p[by]-(.+)$/);
    expect(match, pads[0]).toBeTruthy();
    expect(spacingPx(match![1])).toBeGreaterThanOrEqual(6);
  });
});
