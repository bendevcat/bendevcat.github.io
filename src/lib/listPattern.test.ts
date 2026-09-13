import { describe, expect, it } from 'vitest';
import { ALL } from './facetFilters';
import {
  computeListState,
  isAnyFacetActive,
  pickFeaturedEntry,
  type ListEntry,
  type ListLabels,
} from './listPattern';

const LABELS: ListLabels = {
  singular: 'projet',
  plural: 'projets',
  facets: [
    { key: 'stack', label: 'techno' },
    { key: 'status', label: 'statut' },
  ],
};

const ENTRIES: ListEntry[] = [
  { id: 'a', facets: { stack: ['Astro'], status: ['wip'] }, featured: true, date: 300, minutes: 9 },
  { id: 'b', facets: { stack: ['Bash'], status: ['actif'] }, featured: false, date: 200, minutes: 3 },
  { id: 'c', facets: { stack: ['Astro'], status: ['actif'] }, featured: false, date: 100, minutes: 5 },
];
const NONE = { stack: ALL, status: ALL };

describe('isAnyFacetActive', () => {
  it('est faux quand toutes les facettes sont sur la sentinelle', () => {
    expect(isAnyFacetActive(NONE)).toBe(false);
  });
  it('est vrai dès qu’une seule facette porte une valeur', () => {
    expect(isAnyFacetActive({ stack: 'Astro', status: ALL })).toBe(true);
  });
});

describe('pickFeaturedEntry — la règle de dérivation (spec §6.1)', () => {
  it('préfère une entrée featured où qu’elle soit dans la liste', () => {
    expect(pickFeaturedEntry([{ featured: false }, { featured: true, id: 'x' }])).toEqual({
      featured: true,
      id: 'x',
    });
  });
  it('à défaut, retient la première entrée de l’ordre canonique', () => {
    expect(pickFeaturedEntry([{ id: 'first' }, { id: 'second' }])).toEqual({ id: 'first' });
  });
  it('retourne null sur une collection vide', () => {
    expect(pickFeaturedEntry([])).toBeNull();
  });
});

describe('computeListState — entrée à la une (R5)', () => {
  it('sans filtre, retient l’entrée featured et la sort de la grille', () => {
    const state = computeListState(ENTRIES, NONE, 'none', LABELS);
    expect(state.featuredId).toBe('a');
    expect(state.visibleIds).toEqual(['b', 'c']);
  });

  it('sans featured, retient la PREMIÈRE entrée de l’ordre canonique (spec §6.1)', () => {
    const plain = ENTRIES.map((e) => ({ ...e, featured: false }));
    expect(computeListState(plain, NONE, 'none', LABELS).featuredId).toBe('a');
  });

  it('dès qu’une facette est active, il n’y a plus d’entrée à la une', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS);
    expect(state.featuredId).toBeNull();
  });

  it('l’entrée à la une revient dans la grille dès qu’un filtre la sélectionne (I3)', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS);
    expect(state.visibleIds).toEqual(['a', 'c']);
  });
});

describe('computeListState — compte exact (R4)', () => {
  it('sans filtre, compte l’entrée à la une AVEC la grille', () => {
    const state = computeListState(ENTRIES, NONE, 'none', LABELS);
    expect(state.count).toBe(3);
    expect(state.count).toBe(state.visibleIds.length + 1);
  });

  it('avec une facette, compte les seules entrées correspondantes', () => {
    expect(computeListState(ENTRIES, { stack: 'Astro', status: ALL }, 'none', LABELS).count).toBe(2);
  });

  it('avec deux facettes combinées, applique le ET', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: 'actif' }, 'none', LABELS);
    expect(state.count).toBe(1);
    expect(state.visibleIds).toEqual(['c']);
  });
});

describe('computeListState — ligne de méta (R4)', () => {
  it('accorde le nom au singulier', () => {
    const state = computeListState(ENTRIES, { stack: 'Astro', status: 'actif' }, 'none', LABELS);
    expect(state.meta).toBe('1 projet · techno Astro · statut actif');
  });
  it('accorde au pluriel et n’annonce aucune facette quand aucune n’est active', () => {
    expect(computeListState(ENTRIES, NONE, 'none', LABELS).meta).toBe('3 projets');
  });
});

describe('computeListState — état vide (R6)', () => {
  it('est null tant qu’il reste un résultat', () => {
    expect(computeListState(ENTRIES, NONE, 'none', LABELS).empty).toBeNull();
  });
  it('nomme les facettes actives quand la combinaison ne donne rien', () => {
    const state = computeListState(ENTRIES, { stack: 'Bash', status: 'wip' }, 'none', LABELS);
    expect(state.count).toBe(0);
    expect(state.empty).toBe('Aucun projet pour techno Bash et statut wip.');
    expect(state.featuredId).toBeNull();
  });
});

describe('computeListState — tri (R7)', () => {
  // `visibleIds` attendu = l’ordre trié PRIVÉ de l’entrée à la une, laquelle
  // reste « a » quel que soit le tri : elle se dérive de l’ordre CANONIQUE
  // (spec §6.1), pas de l’ordre courant. C’est ce qui garde le client d’accord
  // avec le slot que le serveur a rendu.
  const ORDERS: Array<[Parameters<typeof computeListState>[2], string[]]> = [
    ['none', ['b', 'c']],
    ['recent', ['b', 'c']],
    ['oldest', ['c', 'b']],
    ['shortest', ['b', 'c']],
    ['longest', ['c', 'b']],
  ];
  for (const [order, expected] of ORDERS) {
    it(`ordonne la grille selon « ${order} » sans déplacer l’entrée à la une`, () => {
      const plain = ENTRIES.map((e) => ({ ...e, featured: false }));
      const state = computeListState(plain, { stack: ALL, status: ALL }, order, LABELS);
      expect(state.featuredId).toBe('a');
      expect(state.visibleIds).toEqual(expected);
      // R4 reste vrai sous tri : rien ne disparaît de la page.
      expect(state.count).toBe(state.visibleIds.length + 1);
      expect(state.count).toBe(plain.length);
    });
  }

  it('ne mute pas le tableau reçu', () => {
    const input = [...ENTRIES];
    computeListState(input, NONE, 'oldest', LABELS);
    expect(input.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});
