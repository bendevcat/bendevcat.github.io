/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
import { configDefaults } from 'vitest/config';

// Nécessaire pour que les tests unitaires puissent résoudre le module
// virtuel `astro:content` (utilisé par src/lib/posts.ts). Setup documenté :
// https://docs.astro.build/en/guides/testing/#vitest
export default getViteConfig({
  test: {
    // Les worktrees Claude Code vivent sous `.claude/worktrees/` : sans cette
    // exclusion, un `vitest run` lancé depuis la racine principale ramasse
    // aussi leurs copies des tests et gonfle les comptes (756 au lieu de 222).
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
