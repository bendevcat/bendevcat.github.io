import { describe, expect, it } from 'vitest';
import { ALL } from './facetFilters';
import {
  computeListState,
  domOrder,
  facetCounts,
  facetsFromQuery,
  isAnyFacetActive,
  pickFeaturedEntry,
  resetFocusIndex,
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

// Fix 6 (revue finale) : `a` porte un rang MILIEU sur `date` ET `minutes` —
// pas l'extrême des deux comme avant. Avec l'ancien montage (a: date 300 max,
// minutes 9 max), `a` sortait toujours en tête (none/recent/longest) ou en
// queue (oldest/shortest) du tableau trié, jamais au milieu : retirer `a` par
// id revenait alors à retirer le premier ou le dernier élément, et un bug de
// type « on retire l'extrémité plutôt que l'entrée featured » serait passé
// inaperçu sur 3 des 5 tris. Voir describe('computeListState — tri (R7)')
// pour le recalcul détaillé de chaque ordre.
const ENTRIES: ListEntry[] = [
  { id: 'a', facets: { stack: ['Astro'], status: ['wip'] }, featured: true, date: 200, minutes: 5 },
  { id: 'b', facets: { stack: ['Bash'], status: ['actif'] }, featured: false, date: 300, minutes: 3 },
  { id: 'c', facets: { stack: ['Astro'], status: ['actif'] }, featured: false, date: 100, minutes: 9 },
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
  // Fix 1 (revue finale) : le français accorde le singulier après zéro aussi
  // bien qu'après un — « 0 prompt », jamais « 0 prompts ». `count === 1`
  // laissait passer `count === 0` au pluriel ; c'est la même faute que P-13
  // avait corrigée pour « 1 projet », côté symétrique.
  it('accorde AUSSI le singulier à zéro (Fix 1 — symétrique de P-13)', () => {
    const state = computeListState(ENTRIES, { stack: 'Bash', status: 'wip' }, 'none', LABELS);
    expect(state.count).toBe(0);
    expect(state.meta).toBe('0 projet · techno Bash · statut wip');
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

  // Fix 4 (revue finale) : au-delà de deux facettes, ' et ' partout chaîne
  // « outil Claude et format guide et tag prompt-engineering » — l'énumération
  // correcte réserve « et » au dernier terme et sépare les autres par des
  // virgules. Les tests existants ne dépassaient jamais deux facettes actives.
  it('énumère trois facettes actives avec des virgules et « et » avant la dernière (Fix 4)', () => {
    const labelsTroisFacettes: ListLabels = {
      singular: 'prompt',
      plural: 'prompts',
      facets: [
        { key: 'tool', label: 'outil' },
        { key: 'format', label: 'format' },
        { key: 'tag', label: 'tag' },
      ],
    };
    const state = computeListState(
      [],
      { tool: 'Claude', format: 'guide', tag: 'prompt-engineering' },
      'none',
      labelsTroisFacettes,
    );
    expect(state.count).toBe(0);
    expect(state.empty).toBe(
      'Aucun prompt pour outil Claude, format guide et tag prompt-engineering.',
    );
  });
});

describe('computeListState — tri (R7)', () => {
  // `visibleIds` attendu = l’ordre trié PRIVÉ de l’entrée à la une, laquelle
  // reste « a » quel que soit le tri : elle se dérive de l’ordre CANONIQUE
  // (spec §6.1), pas de l’ordre courant. C’est ce qui garde le client d’accord
  // avec le slot que le serveur a rendu.
  //
  // Fix 6 (revue finale) — recalcul à la main avec la fixture ENTRIES à jour
  // (a: date 200/minutes 5, b: date 300/minutes 3, c: date 100/minutes 9),
  // sur `filtered = [a, b, c]` (ordre canonique, aucune facette active) :
  //   none     → pas de tri            → [a,b,c] → retire a → [b,c]
  //   recent   → date desc (b,a,c)     → [b,a,c] → retire a → [b,c]  (a AU MILIEU)
  //   oldest   → date asc  (c,a,b)     → [c,a,b] → retire a → [c,b]  (a AU MILIEU)
  //   shortest → minutes asc (b,a,c)   → [b,a,c] → retire a → [b,c]  (a AU MILIEU)
  //   longest  → minutes desc (c,a,b)  → [c,a,b] → retire a → [c,b]  (a AU MILIEU)
  // Sous les 4 tris (tous sauf `none`), `a` est désormais retiré du MILIEU du
  // tableau trié plutôt que d'une extrémité — c'est ce qui exerce vraiment la
  // garde (avant Fix 6, seuls 2 des 5 tris y parvenaient, `a` occupant
  // toujours l'extrémité du tableau).
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

// Plan 12, T4 (R9, D75) : /blog n'a plus de bloc « à la une » — la page ne
// rend aucun `[data-list-featured]` et le script passe `{ featured: false }`.
// Les trois autres listes gardent le comportement par défaut ci-dessus.
describe('computeListState — sans bloc à la une (plan 12, R9)', () => {
  it('sans bloc à la une, ne désigne aucune entrée et les garde toutes visibles', () => {
    const state = computeListState(ENTRIES, NONE, 'none', LABELS, { featured: false });
    expect(state.featuredId).toBeNull();
    expect(state.visibleIds).toEqual(['a', 'b', 'c']);
    expect(state.count).toBe(3);
    expect(state.meta).toBe('3 projets');
  });

  it('trie toutes les entrées, y compris celle marquée featured', () => {
    const state = computeListState(ENTRIES, NONE, 'recent', LABELS, { featured: false });
    expect(state.featuredId).toBeNull();
    expect(state.visibleIds).toEqual(['b', 'a', 'c']);
  });

  it('garde le mode à la une par défaut quand l’option est absente ou vraie', () => {
    expect(computeListState(ENTRIES, NONE, 'none', LABELS, { featured: true }).featuredId).toBe('a');
    expect(computeListState(ENTRIES, NONE, 'none', LABELS, {}).featuredId).toBe('a');
  });
});

// Plan 12, T4 (R9, D75) : une facette qui déclare un libellé de repos
// (`data-facet-all-label="Tout"`) s'écrit TOUJOURS `libellé : valeur` dans la
// ligne de méta, même au repos ; les autres facettes gardent `libellé valeur`.
describe('computeListState — facette à libellé de repos (plan 12, R9)', () => {
  const BLOG_LABELS: ListLabels = {
    singular: 'article',
    plural: 'articles',
    facets: [
      { key: 'category', label: 'catégorie', allLabel: 'Tout' },
      { key: 'tag', label: 'tag' },
    ],
  };
  const POSTS: ListEntry[] = [
    { id: 'p1', facets: { category: ['DevOps'], tag: ['k8s'] }, featured: false, date: 3, minutes: 4 },
    { id: 'p2', facets: { category: ['DevOps'], tag: ['bash'] }, featured: false, date: 2, minutes: 6 },
    { id: 'p3', facets: { category: ['Outils'], tag: ['k8s'] }, featured: false, date: 1, minutes: 2 },
  ];

  it('écrit une facette à libellé de repos « catégorie : Tout », puis « catégorie : DevOps »', () => {
    const rest = computeListState(POSTS, { category: ALL, tag: ALL }, 'recent', BLOG_LABELS, { featured: false });
    expect(rest.meta).toBe('3 articles · catégorie : Tout');
    const devops = computeListState(POSTS, { category: 'DevOps', tag: ALL }, 'recent', BLOG_LABELS, {
      featured: false,
    });
    expect(devops.meta).toBe('2 articles · catégorie : DevOps');
    expect(devops.visibleIds).toEqual(['p1', 'p2']);
  });

  it('laisse les autres facettes au format « libellé valeur », après la facette de repos', () => {
    const state = computeListState(POSTS, { category: ALL, tag: 'k8s' }, 'none', BLOG_LABELS, {
      featured: false,
    });
    expect(state.meta).toBe('2 articles · catégorie : Tout · tag k8s');
  });

  it('ne nomme dans l’état vide que les facettes actives, au format « libellé valeur »', () => {
    const state = computeListState(POSTS, { category: 'Outils', tag: 'bash' }, 'none', BLOG_LABELS, {
      featured: false,
    });
    expect(state.meta).toBe('0 article · catégorie : Outils · tag bash');
    expect(state.empty).toBe('Aucun article pour catégorie Outils et tag bash.');
  });
});

describe('domOrder — le tri réordonne le DOM (plan 12, F4)', () => {
  it('place les entrées visibles dans l’ordre du tri, en tête', () => {
    expect(domOrder(['a', 'b', 'c', 'd'], ['d', 'b', 'a', 'c'])).toEqual(['d', 'b', 'a', 'c']);
  });

  it('renvoie les entrées masquées après les visibles, dans l’ordre canonique', () => {
    expect(domOrder(['a', 'b', 'c', 'd', 'e'], ['e', 'c'])).toEqual(['e', 'c', 'a', 'b', 'd']);
  });

  it('garde l’entrée à la une (absente de visibleIds) dans la grille, masquée en queue', () => {
    const state = computeListState(ENTRIES, NONE, 'oldest', LABELS);
    expect(state.visibleIds).toEqual(['c', 'b']);
    expect(domOrder(['a', 'b', 'c'], state.visibleIds)).toEqual(['c', 'b', 'a']);
  });

  it('suit « plus anciens » puis revient à « plus récents » sans perdre d’entrée', () => {
    const canonical = ['b', 'a', 'c'];
    const oldest = computeListState(ENTRIES, NONE, 'oldest', LABELS, { featured: false });
    expect(domOrder(canonical, oldest.visibleIds)).toEqual(['c', 'a', 'b']);
    const recent = computeListState(ENTRIES, NONE, 'recent', LABELS, { featured: false });
    expect(domOrder(canonical, recent.visibleIds)).toEqual(['b', 'a', 'c']);
  });

  it('ignore un id visible inconnu et ne duplique rien', () => {
    expect(domOrder(['a', 'b'], ['b', 'zz', 'b'])).toEqual(['b', 'a']);
  });

  it('ne mute pas les tableaux reçus', () => {
    const ids = ['a', 'b', 'c'];
    const visible = ['c', 'a'];
    domOrder(ids, visible);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(visible).toEqual(['c', 'a']);
  });
});

describe('facetsFromQuery — lien profond de catégorie (plan 13, T1)', () => {
  const KNOWN = { category: [ALL, 'DevOps', 'Outils', 'Sécurité & IA'] };

  it('pre-selects a known category from ?categorie= and ignores an unknown or empty one', () => {
    expect(facetsFromQuery('?categorie=DevOps', KNOWN)).toEqual({ category: 'DevOps' });
    expect(facetsFromQuery('?categorie=S%C3%A9curit%C3%A9%20%26%20IA', KNOWN)).toEqual({
      category: 'Sécurité & IA',
    });
    // Inconnue, vide, casse différente, sentinelle, absente : rien n'est sélectionné.
    expect(facetsFromQuery('?categorie=Inconnu', KNOWN)).toEqual({});
    expect(facetsFromQuery('?categorie=', KNOWN)).toEqual({});
    expect(facetsFromQuery('?categorie=devops', KNOWN)).toEqual({});
    expect(facetsFromQuery(`?categorie=${ALL}`, KNOWN)).toEqual({});
    expect(facetsFromQuery('', KNOWN)).toEqual({});
    // Une page sans facette `category` (/projets…) ignore le paramètre.
    expect(facetsFromQuery('?categorie=DevOps', { stack: [ALL, 'DevOps'] })).toEqual({});
    // Le résultat, appliqué, filtre et réécrit la méta comme un clic sur la ligne.
    const labels: ListLabels = {
      singular: 'article',
      plural: 'articles',
      facets: [{ key: 'category', label: 'catégorie', allLabel: 'Tout' }],
    };
    const entries: ListEntry[] = [
      { id: 'x', facets: { category: ['DevOps'] }, featured: false, date: 2, minutes: 1 },
      { id: 'y', facets: { category: ['Outils'] }, featured: false, date: 1, minutes: 1 },
    ];
    const selected = { category: ALL, ...facetsFromQuery('?categorie=DevOps', KNOWN) };
    const state = computeListState(entries, selected, 'recent', labels, { featured: false });
    expect(state.visibleIds).toEqual(['x']);
    expect(state.meta).toBe('1 article · catégorie : DevOps');
  });
});

// Plan 14, T3 (R1, D93) : les comptes des segments et des options de menu
// sont statiques — chaque valeur déclarée comptée sur TOUTES les entrées
// publiées de la liste, zéro compris (`Archivé 0` est ce qui mène à l'état vide).
describe('facetCounts — comptes statiques des facettes (plan 14, R1)', () => {
  it('compte chaque valeur déclarée sur toutes les entrées, zéro compris', () => {
    const counts = facetCounts(ENTRIES, 'status', [ALL, 'actif', 'wip', 'archivé']);
    expect(counts).toEqual({ [ALL]: 3, actif: 2, wip: 1, archivé: 0 });
    // Ordre des clés = ordre des valeurs déclarées (celui des segments).
    expect(Object.keys(counts)).toEqual([ALL, 'actif', 'wip', 'archivé']);
    // Facette multi-valeur : une entrée compte une fois par valeur qu'elle porte.
    const multi: ListEntry[] = [
      { id: 'x', facets: { stack: ['Astro', 'Go'] }, featured: false, date: 0, minutes: 0 },
      { id: 'y', facets: { stack: ['Go', 'Go'] }, featured: false, date: 0, minutes: 0 },
      { id: 'z', facets: {}, featured: false, date: 0, minutes: 0 },
    ];
    expect(facetCounts(multi, 'stack', [ALL, 'Astro', 'Go', 'Bash'])).toEqual({
      [ALL]: 3,
      Astro: 1,
      Go: 2,
      Bash: 0,
    });
    // Liste vide : tout à zéro ; les entrées reçues ne sont pas mutées.
    expect(facetCounts([], 'stack', [ALL, 'Go'])).toEqual({ [ALL]: 0, Go: 0 });
    expect(ENTRIES.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

// Plan 14, T3 (R2, D93) : une page peut déclarer un gabarit d'état vide
// (`data-list-empty-template`) ; chaque emplacement `{clé}` devient
// `<préfixe><valeur>` quand la facette est active, rien sinon. Préfixe lu sur
// le contrôle (`data-facet-empty-prefix`), une espace par défaut.
describe('computeListState — gabarit d’état vide (plan 14, R2)', () => {
  const PROJECT_LABELS: ListLabels = {
    singular: 'projet',
    plural: 'projets',
    emptyTemplate: "Aucun projet{status}{stack} pour l'instant.",
    facets: [
      { key: 'status', label: 'statut' },
      { key: 'stack', label: 'techno', emptyPrefix: ' en ' },
    ],
  };
  const PROJECTS: ListEntry[] = [
    { id: 'site', facets: { status: ['wip'], stack: ['Astro'] }, featured: true, date: 2, minutes: 0 },
    { id: 'gha', facets: { status: ['actif'], stack: ['Go'] }, featured: false, date: 1, minutes: 0 },
  ];

  it("écrit l'état vide d'un gabarit de page : « Aucun projet wip en Go pour l'instant. »", () => {
    const state = computeListState(PROJECTS, { status: 'wip', stack: 'Go' }, 'none', PROJECT_LABELS);
    expect(state.count).toBe(0);
    expect(state.empty).toBe("Aucun projet wip en Go pour l'instant.");
    // La ligne de méta ne change pas de format.
    expect(state.meta).toBe('0 projet · statut wip · techno Go');
  });

  it('vide les emplacements des facettes inactives', () => {
    const archived = computeListState(PROJECTS, { status: 'archivé', stack: ALL }, 'none', PROJECT_LABELS);
    expect(archived.empty).toBe("Aucun projet archivé pour l'instant.");
    const stackOnly = computeListState(PROJECTS, { status: ALL, stack: 'Bash' }, 'none', PROJECT_LABELS);
    expect(stackOnly.empty).toBe("Aucun projet en Bash pour l'instant.");
    // Liste vide sans facette active : tous les emplacements sont vidés.
    expect(computeListState([], { status: ALL, stack: ALL }, 'none', PROJECT_LABELS).empty).toBe(
      "Aucun projet pour l'instant.",
    );
    // Un gabarit sans emplacement (prompts, skills) est rendu tel quel.
    const prompts: ListLabels = {
      singular: 'prompt',
      plural: 'prompts',
      emptyTemplate: 'Aucun prompt ne correspond à ce filtre.',
      facets: [{ key: 'format', label: 'format' }],
    };
    expect(computeListState([], { format: 'guide' }, 'none', prompts).empty).toBe(
      'Aucun prompt ne correspond à ce filtre.',
    );
    // Tant qu'il reste un résultat, pas d'état vide, gabarit ou non.
    expect(computeListState(PROJECTS, { status: 'wip', stack: ALL }, 'none', PROJECT_LABELS).empty).toBeNull();
  });

  it('garde la phrase historique sans gabarit', () => {
    const { emptyTemplate: _unused, ...plain } = PROJECT_LABELS;
    const state = computeListState(PROJECTS, { status: 'wip', stack: 'Go' }, 'none', plain);
    expect(state.empty).toBe('Aucun projet pour statut wip et techno Go.');
    expect(computeListState([], { status: ALL, stack: ALL }, 'none', plain).empty).toBe(
      'Aucun projet à afficher.',
    );
  });
});

describe('resetFocusIndex — cible du focus après remise à zéro (plan 14, F2)', () => {
  it('vise le segment « Tous » de la première facette, pas le premier bouton', () => {
    // /projets : segments de statut (Tous en tête), puis le menu techno.
    expect(
      resetFocusIndex([
        { kind: 'button', key: 'status', value: ALL },
        { kind: 'button', key: 'status', value: 'actif' },
        { kind: 'button', key: 'status', value: 'wip' },
        { kind: 'dropdown', key: 'stack' },
      ]),
    ).toBe(0);
    // Le « Tous » n'est pas forcément le premier bouton du groupe.
    expect(
      resetFocusIndex([
        { kind: 'button', key: 'format', value: 'fiche' },
        { kind: 'button', key: 'format', value: ALL },
        { kind: 'dropdown', key: 'tool' },
      ]),
    ).toBe(1);
  });

  it('ignore le « Tous » d’une autre facette', () => {
    expect(
      resetFocusIndex([
        { kind: 'button', key: 'status', value: 'actif' },
        { kind: 'button', key: 'stack', value: ALL },
        { kind: 'button', key: 'status', value: ALL },
      ]),
    ).toBe(2);
  });

  it('vise la ligne « Tout » du rail de /blog', () => {
    expect(
      resetFocusIndex([
        { kind: 'button', key: 'category', value: ALL },
        { kind: 'button', key: 'category', value: 'DevOps' },
        { kind: 'button', key: 'category', value: 'IA' },
      ]),
    ).toBe(0);
  });

  it('vise le menu ou le select quand il ouvre le groupe', () => {
    expect(resetFocusIndex([{ kind: 'dropdown', key: 'stack' }, { kind: 'button', key: 'status', value: ALL }])).toBe(0);
    expect(resetFocusIndex([{ kind: 'select', key: 'tag' }])).toBe(0);
  });

  it('se rabat sur le premier bouton sans « Tous », et renvoie null sans contrôle', () => {
    expect(
      resetFocusIndex([
        { kind: 'button', key: 'status', value: 'actif' },
        { kind: 'button', key: 'status', value: 'wip' },
      ]),
    ).toBe(0);
    expect(resetFocusIndex([])).toBeNull();
  });
});
