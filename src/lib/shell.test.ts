// src/lib/shell.test.ts
//
// Gardes statiques de la coque (plan 12) — lues dans le source, sans build :
// - R1 : la coque est plafonnée à 1180 px (prototype, inventaire §0). Le token
//   `--container-shell: 1180px` de `@theme` génère l'utilitaire `max-w-shell` ;
//   trois boîtes le portent avec `data-shell` : la rangée d'en-tête
//   (Header.astro), l'enveloppe du contenu (BaseLayout.astro) et le pied de
//   page (Footer.astro). Plus aucun `max-w-5xl` (l'ancien plafond de 1024 px)
//   dans les pages, composants et layouts.
// - R4 : le pied de page ne reprend jamais le texte de démo du prototype.
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

  it("keeps the prototype's demo copy out of the footer", () => {
    const footer = read('components/Footer.astro');
    expect(footer).not.toMatch(/prototype cliquable/i);
    expect(footer).toContain('site perso de Benoît Catillon');
    expect(footer).toContain('Astro · GitHub Pages · Sveltia CMS');
  });
});
