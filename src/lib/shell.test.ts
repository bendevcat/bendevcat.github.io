// src/lib/shell.test.ts
//
// Gardes statiques de la coque (plan 12) — lues dans le source, sans build :
// - R1 : la coque est plafonnée à 1180 px (prototype, inventaire §0). Le token
//   `--container-shell: 1180px` de `@theme` génère l'utilitaire `max-w-shell` ;
//   trois boîtes le portent avec `data-shell` : la rangée d'en-tête
//   (Header.astro), l'enveloppe du contenu (BaseLayout.astro) et le pied de
//   page (Footer.astro). Plus aucun `max-w-5xl` (l'ancien plafond de 1024 px)
//   dans les pages, composants et layouts. Le plafond porte sur la boîte de
//   CONTENU (`box-content`), comme le `max-width:1180px` du prototype qui
//   s'ajoute à son padding de 24 px : à 1280 px le contenu fait 1180 px en
//   x 50–1230, pas 1132 en x 74–1206 (plan 12, F1).
// - R5 : les trois pilules de l'en-tête partent toutes à 20 px du haut de la
//   page (rangée alignée en haut, pilule de nav de 47 px comme le prototype).
// - R4 : le pied de page ne reprend jamais le texte de démo du prototype.
// - R3 : la nav suit l'ordre du prototype (Blog · Projets · Skills · Prompts ·
//   À propos) et son item actif est `accent` sur `accentSoft`, graisse 600.
// La mesure rendue (largeur 1180, centrage) est celle de la vérification.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');

/** Balises ouvrantes (attributs compris) portant `data-shell="<kind>"`. */
function shellTags(source: string, kind: string): string[] {
  const re = new RegExp(`<[a-zA-Z][\\w-]*\\b[^>]*\\sdata-shell="${kind}"[^>]*>`, 'g');
  return source.match(re) ?? [];
}

/** Classes statiques d'une balise (`class="…"`). */
const classesOf = (tag: string) => (tag.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);

function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...astroFiles(path));
    else if (name.endsWith('.astro')) out.push(path);
  }
  return out;
}

describe('coque du site (plan 12)', () => {
  it('caps the header, the page content and the footer at the 1180 px shell', () => {
    expect(read('styles/global.css')).toMatch(/--container-shell:\s*1180px;/);

    const boxes = [
      ['components/Header.astro', 'header'],
      ['layouts/BaseLayout.astro', 'main'],
      ['components/Footer.astro', 'footer'],
    ] as const;
    for (const [file, kind] of boxes) {
      const tags = shellTags(read(file), kind);
      expect(tags, `${file} : un seul data-shell="${kind}"`).toHaveLength(1);
      expect(classesOf(tags[0]), file).toEqual(expect.arrayContaining(['mx-auto', 'max-w-shell']));
      // F1 : le plafond de 1180 px s'applique au contenu, padding en plus
      expect(classesOf(tags[0]), file).toContain('box-content');
      expect(classesOf(tags[0]), file).not.toContain('box-border');
    }

    // BaseLayout rend le pied de page sur chaque page, après le contenu.
    const layout = read('layouts/BaseLayout.astro');
    expect(layout).toMatch(/import Footer from '\.\.\/components\/Footer\.astro';/);
    const slot = layout.indexOf('<slot />');
    expect(slot).toBeGreaterThan(-1);
    expect(layout.indexOf('<Footer />')).toBeGreaterThan(slot);

    const offenders = ['pages', 'components', 'layouts']
      .flatMap((dir) => astroFiles(resolve(SRC, dir)))
      .filter((file) => readFileSync(file, 'utf8').includes('max-w-5xl'));
    expect(offenders).toEqual([]);
  });

  it('starts the three header pills 20 px from the page top', () => {
    const header = read('components/Header.astro');
    const row = classesOf(shellTags(header, 'header')[0]);
    expect(row).toContain('pt-5'); // padding-top: 20px
    // alignées en haut : une pilule plus courte n'est pas recentrée plus bas
    expect(row).toContain('items-start');
    expect(row).not.toContain('items-center');

    // pilule de nav : 1 + 6 + (8 + 17 + 8) + 6 + 1 = 47 px (prototype), pas 50
    const navItem = header.match(/const NAV_ITEM = `([^`]*)`/)?.[1].split(/\s+/) ?? [];
    expect(navItem).toEqual(expect.arrayContaining(['py-2', 'leading-[17px]']));
    // item en boîte bloc : sa hauteur n'est pas agrandie par la ligne du <li>
    expect(navItem).toContain('flex');
    expect(navItem).not.toContain('inline-flex');
  });

  it("keeps the prototype's demo copy out of the footer", () => {
    const footer = read('components/Footer.astro');
    expect(footer).not.toMatch(/prototype cliquable/i);
    expect(footer).toContain('site perso de Benoît Catillon');
    expect(footer).toContain('Astro · GitHub Pages · Sveltia CMS');
  });

  it('orders the nav Blog, Projets, Skills, Prompts, À propos', () => {
    const header = read('components/Header.astro');
    const block = header.match(/const navLinks: NavLink\[\] = \[([\s\S]*?)\];/)?.[1] ?? '';
    const labels = [...block.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(labels).toEqual(['Blog', 'Projets', 'Skills', 'Prompts', 'À propos']);
  });

  it('draws the active nav item accent on accentSoft at weight 600', () => {
    const header = read('components/Header.astro');
    const constant = (name: string) =>
      (header.match(new RegExp(`const ${name} =\\s*'([^']*)'`))?.[1] ?? '').split(/\s+/).filter(Boolean);

    const active = constant('NAV_ACTIVE');
    expect(active).toEqual(expect.arrayContaining(['text-accent', 'bg-accentSoft', 'font-semibold']));
    // l'ancien actif neutre (plan 6) ne revient pas
    expect(active).not.toEqual(expect.arrayContaining(['bg-nav']));
    expect(active).not.toContain('text-ink');

    const inactive = constant('NAV_INACTIVE');
    expect(inactive).toContain('text-muted');
    expect(inactive).not.toContain('bg-accentSoft');
    expect(inactive).not.toContain('text-accent');

    // l'item actif est celui qui porte aria-current, et lui seul reçoit NAV_ACTIVE
    expect(header).toMatch(/aria-current=\{isActive\(link\.href\) \? 'page' : undefined\}/);
    expect(header).toMatch(/isActive\(link\.href\) \? NAV_ACTIVE : NAV_INACTIVE/);
  });

  it('keeps the theme toggle id, the search trigger and drops the ⌘K hint', () => {
    const header = read('components/Header.astro');
    expect(header).toContain('data-search-open');
    expect(header).not.toMatch(/<kbd\b/);
    expect(header).not.toMatch(/<header[^>]*\bborder-b/);
    expect(read('components/ThemeToggle.astro')).toContain('id="theme-toggle"');
  });
});
