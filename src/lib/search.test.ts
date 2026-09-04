import { describe, it, expect } from 'vitest';
import { COLLECTION_LABELS, collectionFromUrl, groupResultsByCollection } from './search';

describe('collectionFromUrl', () => {
  it('reconnaît les 4 collections sur des URLs de détail', () => {
    expect(collectionFromUrl('/blog/mon-article/')).toBe('blog');
    expect(collectionFromUrl('/projets/gha-svu/')).toBe('projects');
    expect(collectionFromUrl('/prompts/macos-clone/')).toBe('prompts');
    expect(collectionFromUrl('/skills/superpowers/')).toBe('skills');
  });

  it('accepte une URL absolue et une URL sans slash final', () => {
    expect(collectionFromUrl('https://bendevcat.github.io/blog/a/')).toBe('blog');
    expect(collectionFromUrl('/skills/a')).toBe('skills');
  });

  it("rend null hors des 4 collections — jamais un groupe inventé", () => {
    expect(collectionFromUrl('/a-propos/')).toBeNull();
    expect(collectionFromUrl('/')).toBeNull();
    // Piège : le préfixe doit être un SEGMENT entier, pas une sous-chaîne.
    expect(collectionFromUrl('/blogueurs/x/')).toBeNull();
  });
});

describe('groupResultsByCollection', () => {
  it('groupe dans l’ordre blog → projets → prompts → skills et ignore le reste', () => {
    const groups = groupResultsByCollection([
      { url: '/skills/a/', title: 'A', excerpt: '' },
      { url: '/blog/b/', title: 'B', excerpt: '' },
      { url: '/a-propos/', title: 'C', excerpt: '' },
      { url: '/blog/d/', title: 'D', excerpt: '' },
    ]);
    expect(groups.map((g) => g.collection)).toEqual(['blog', 'skills']);
    expect(groups[0].results).toHaveLength(2);
    expect(groups[0].results[0].title).toBe('B'); // ordre d’arrivée préservé
  });

  it('ne crée pas de groupe vide', () => {
    expect(groupResultsByCollection([])).toEqual([]);
  });
});

describe('COLLECTION_LABELS', () => {
  it('a un libellé FR pour chacune des 4 collections', () => {
    expect(Object.keys(COLLECTION_LABELS).sort()).toEqual(
      ['blog', 'projects', 'prompts', 'skills'],
    );
    for (const label of Object.values(COLLECTION_LABELS)) expect(label.length).toBeGreaterThan(0);
  });
});
