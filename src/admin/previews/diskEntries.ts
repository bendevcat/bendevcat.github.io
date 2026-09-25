/**
 * Entrées réelles lues sur le disque, sous la forme que reçoit un gabarit
 * d'aperçu (plan 21, T3) — pour les tests des gabarits et
 * scripts/check-previews.mjs. NODE UNIQUEMENT (`node:fs`) : jamais importé
 * par l'aperçu lui-même.
 *
 * Forme = celle du composant d'aperçu : les champs du frontmatter comme les
 * voit le CMS (paquet `yaml`, YAML 1.2 : une date reste une chaîne), plus
 * `id` (= slug), `body` (le corps tel que le site le découpe, `parseFrontmatter`
 * d'Astro), `bodyHtml` (`renderBody`, le pipeline du site) et `images` (vide :
 * aucune image résolue hors navigateur). Aucune valeur figée (D131) : toute
 * entrée présente — publiée ou brouillon — est lue.
 *
 * Blocs `:::carte` (plan 23, T1) : hors navigateur, l'index d'entrées de
 * l'aperçu est lu sur le disque (`readSiteEntries`) et installé en mode
 * `preview` (ref inconnue → carte d'erreur, comme dans `/admin/`) si aucun
 * fournisseur n'est déjà en place (`astro.config.mjs` installe le sien).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { parse } from 'yaml';
import { renderBody } from './markdown';
import { provideSiteEntries, siteEntriesProvider } from '../../lib/blocks/siteEntries.mjs';
import { readSiteEntries } from '../../lib/blocks/readSiteEntries.mjs';

if (!siteEntriesProvider()) provideSiteEntries({ mode: 'preview', entries: () => readSiteEntries() });

export interface DiskEntry {
  collection: string;
  /** Slug = nom du dossier. */
  id: string;
  /** `<collection>/<id>`, pour les messages. */
  name: string;
  file: URL;
  /** Données passées au gabarit. */
  data: Record<string, unknown> & { id: string; body: string; bodyHtml: string; images: Record<string, string> };
}

const CONTENT_DIR = new URL('../../content/', import.meta.url);

/** Chaque `src/content/<collection>/<slug>/index.md` (toutes collections, ou une seule). */
export async function diskEntries(collection?: string): Promise<DiskEntry[]> {
  const collections = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (collection === undefined || d.name === collection))
    .map((d) => d.name)
    .sort();
  const entries: DiskEntry[] = [];
  for (const name of collections) {
    const dir = new URL(`${name}/`, CONTENT_DIR);
    const slugs = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(new URL(`${d.name}/index.md`, dir)))
      .map((d) => d.name)
      .sort();
    for (const id of slugs) {
      const file = new URL(`${id}/index.md`, dir);
      const { rawFrontmatter, content } = parseFrontmatter(readFileSync(file, 'utf8'));
      const fields = (parse(rawFrontmatter) ?? {}) as Record<string, unknown>;
      entries.push({
        collection: name,
        id,
        name: `${name}/${id}`,
        file,
        data: { ...fields, id, body: content, bodyHtml: await renderBody(content), images: {} },
      });
    }
  }
  return entries;
}
