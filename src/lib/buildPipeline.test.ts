// src/lib/buildPipeline.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('pipeline de build (R8)', () => {
  it('enchaîne pagefind APRÈS astro build', () => {
    const build: string = pkg.scripts.build;
    expect(build).toContain('astro build');
    expect(build).toContain('pagefind');
    // L'ordre est le fond du sujet : Pagefind indexe le HTML produit par
    // astro build (spec P5 §6.1). Inversé, il indexerait le dist précédent.
    expect(build.indexOf('astro build')).toBeLessThan(build.indexOf('pagefind'));
  });

  it('indexe le dossier réellement déployé', () => {
    // withastro/action@v3 publie `out-dir` (défaut `dist`) et lance
    // `npm run build` : indexer un autre dossier livrerait un site sans index.
    expect(pkg.scripts.build).toContain('--site dist');
  });

  it('déclare pagefind en dépendance (sinon la CI ne l’a pas)', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps.pagefind).toBeDefined();
  });
});
