/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Nécessaire pour que les tests unitaires puissent résoudre le module
// virtuel `astro:content` (utilisé par src/lib/posts.ts). Setup documenté :
// https://docs.astro.build/en/guides/testing/#vitest
export default getViteConfig({
  test: {},
});
