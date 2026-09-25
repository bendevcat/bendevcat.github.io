import { describe, expect, it } from 'vitest';
import { monogram, projectMetaRows, stackTiles } from './projectDetail';
import { STACK_LOGOS } from './stackLogos';

// Les noms de tests cités par R3 et R4 (plan 15) sont repris MOT POUR MOT.
// Des objets simples suffisent : projectDetail.ts n'importe jamais `astro:content`.

describe('stackTiles', () => {
  it('gives a tile the logo of its tech, case-insensitively', () => {
    const [astro, tailwind, go] = stackTiles(['Astro', 'tailwind css', '  GO  ']);
    expect(astro.logo).toBe(STACK_LOGOS['Astro']);
    expect(tailwind.logo).toBe(STACK_LOGOS['Tailwind CSS']);
    expect(go.logo).toBe(STACK_LOGOS['Go']);
    // Le nom affiché reste celui de l'entrée ; pas de monogramme à côté d'un logo.
    expect(tailwind.name).toBe('tailwind css');
    expect([astro, tailwind, go].map((tile) => tile.monogram)).toEqual([null, null, null]);
  });

  it('falls back to a monogram when no logo exists', () => {
    const tiles = stackTiles(['Sveltia CMS', 'GitHub Pages', 'SVU']);
    expect(tiles.map((tile) => [tile.logo, tile.monogram])).toEqual([
      [null, 'SC'],
      [null, 'GP'],
      [null, 'SVU'],
    ]);
    expect(tiles.map((tile) => tile.name)).toEqual(['Sveltia CMS', 'GitHub Pages', 'SVU']);
  });

  it('attaches a role only to a tech of the stack', () => {
    const tiles = stackTiles(
      ['GitHub Actions', 'Bash', 'SVU'],
      [
        { name: 'github actions', role: 'action composite' },
        { name: 'SVU', role: 'prochain numéro de version' },
        { name: 'Docker', role: 'hors stack' },
        { name: 'Bash', role: '   ' },
      ],
    );
    expect(tiles.map((tile) => [tile.name, tile.role])).toEqual([
      ['GitHub Actions', 'action composite'],
      ['Bash', null],
      ['SVU', 'prochain numéro de version'],
    ]);
    // Une tuile par techno de la stack, jamais pour un rôle orphelin.
    expect(tiles).toHaveLength(3);
    expect(stackTiles(['Go']).map((tile) => tile.role)).toEqual([null]);
  });
});

describe('monogram', () => {
  it('takes word initials up to 3, else the first 3 letters, uppercased', () => {
    expect(monogram('Sveltia CMS')).toBe('SC');
    expect(monogram('GitHub Pages')).toBe('GP');
    expect(monogram('Google Cloud Run Jobs')).toBe('GCR');
    expect(monogram('SVU')).toBe('SVU');
    expect(monogram('pagefind')).toBe('PAG');
    expect(monogram('Go')).toBe('GO');
    expect(monogram('  Node.js ')).toBe('NOD');
  });
});

describe('projectMetaRows', () => {
  it('lists statut, depuis and licence in that order', () => {
    const rows = projectMetaRows({
      status: 'actif',
      startDate: new Date('2025-05-05'),
      license: ' MIT ',
    });
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ['statut', 'actif'],
      ['depuis', 'mai 2025'],
      ['licence', 'MIT'],
    ]);
    // La ligne statut porte les classes de puce de PROJECT_STATUS_META.
    expect(rows[0].chipClass).toBe('border-accent/40 bg-accentSoft text-accent');
    expect(rows[1].chipClass).toBeNull();
  });

  it('omits depuis and licence when they are not set', () => {
    expect(projectMetaRows({ status: 'wip' }).map((row) => row.label)).toEqual(['statut']);
    expect(
      projectMetaRows({ status: 'archivé', startDate: undefined, license: '  ' }).map((row) => row.label),
    ).toEqual(['statut']);
    // Lu en UTC : le 1er du mois ne glisse pas dans le mois précédent.
    expect(projectMetaRows({ status: 'wip', startDate: new Date('2026-07-01') })[1].value).toBe(
      'juillet 2026',
    );
    // Instants de bord : sans `timeZone: 'UTC'`, 23:30Z le 31 passe en août
    // dans un fuseau en avance (Paris, Tokyo) et 00:30Z le 1er retombe en
    // juillet dans un fuseau en retard (New York).
    expect(projectMetaRows({ status: 'wip', startDate: new Date('2026-07-31T23:30:00Z') })[1].value).toBe(
      'juillet 2026',
    );
    expect(projectMetaRows({ status: 'wip', startDate: new Date('2026-08-01T00:30:00Z') })[1].value).toBe(
      'août 2026',
    );
  });
});
