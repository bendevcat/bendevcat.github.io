// @ts-check
/**
 * Lecteur disque de l'index des entrées (plan 23, T1 ; décision D152) —
 * NODE UNIQUEMENT (`node:fs`) : fourni par `astro.config.mjs` au rendu du
 * site, par src/admin/previews/diskEntries.ts à scripts/check-previews.mjs, et
 * lu par le module virtuel de l'aperçu au build (T4). Jamais importé par un
 * code qui part dans le navigateur.
 *
 * Chaque `src/content/<collection>/<slug>/index.md` des collections qu'une
 * carte peut viser ; frontmatter lu par `parseFrontmatter` d'Astro (le même
 * découpage que le content-layer). Relu à chaque appel : aucune valeur figée
 * (D131).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { ENTRY_COLLECTIONS } from './syntax.mjs';

const CONTENT_DIR = new URL('../../content/', import.meta.url);

/** @param {unknown} value */
const text = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));

/**
 * @param {URL} [contentDir] dossier `src/content/`
 * @returns {import('./siteEntries.mjs').SiteEntry[]} triées par collection puis id
 */
export function readSiteEntries(contentDir = CONTENT_DIR) {
  /** @type {import('./siteEntries.mjs').SiteEntry[]} */
  const entries = [];
  for (const collection of ENTRY_COLLECTIONS) {
    const dir = new URL(`${collection}/`, contentDir);
    if (!existsSync(dir)) continue;
    const ids = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, dir)))
      .map((d) => d.name)
      .sort();
    for (const id of ids) {
      const { frontmatter } = parseFrontmatter(readFileSync(new URL(`${id}/index.md`, dir), 'utf8'));
      entries.push({
        collection,
        id,
        title: text(frontmatter.title),
        description: text(frontmatter.description),
        draft: frontmatter.draft === true,
      });
    }
  }
  return entries;
}
