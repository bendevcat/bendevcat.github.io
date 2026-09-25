// @ts-check
/**
 * Index des entrées du site pour les blocs `:::carte` (plan 23, T1, R3 ;
 * décision D152) : le fournisseur et la politique d'absence.
 *
 * Le rendu markdown est partagé par le site et l'aperçu de `/admin/`
 * (`markdownOptions.mjs`, D138) ; seul le fournisseur change :
 * - `astro.config.mjs` fournit le lecteur disque (`readSiteEntries.mjs`, Node)
 *   en mode `site` : une ref inconnue, ou une cible brouillon citée par une
 *   entrée publiée, LÈVE une erreur nommant le fichier et la ref — le build
 *   échoue ;
 * - l'aperçu fournit un module virtuel construit au build (T4) en mode
 *   `preview` : une ref inconnue devient une carte d'erreur visible
 *   « Entrée introuvable : <ref> », sans exception ; une cible brouillon est
 *   rendue normalement (l'aperçu ne connaît pas le statut de l'entrée éditée).
 * Sans fournisseur, un corps qui porte une carte lève une erreur.
 *
 * L'index n'est lu que pour un corps qui porte au moins une carte, et à
 * chaque rendu (pas de cache ici : le lecteur disque relit les fichiers).
 */
import { ENTRY_BASE_PATHS, ENTRY_KIND_LABELS } from './syntax.mjs';

/**
 * @typedef {object} SiteEntry
 * @property {string} collection `blog` | `projects` | `prompts` | `skills`
 * @property {string} id slug = nom du dossier
 * @property {string} title
 * @property {string} description
 * @property {boolean} draft
 */

/**
 * @typedef {'site' | 'preview'} SiteEntriesMode
 * @typedef {object} SiteEntriesProvider
 * @property {SiteEntriesMode} mode
 * @property {() => SiteEntry[] | Promise<SiteEntry[]>} entries
 */

/**
 * Carte résolue : l'entrée visée, ou le message de la carte d'erreur (aperçu).
 * @typedef {{ ref: string, href: string, kind: string, entry: SiteEntry } | { ref: string, missing: string }} ResolvedCard
 */

/** @type {SiteEntriesProvider | undefined} */
let provider;

/**
 * Installe le fournisseur d'entrées (remplace le précédent).
 * @param {SiteEntriesProvider} next
 */
export function provideSiteEntries(next) {
  if (!next || (next.mode !== 'site' && next.mode !== 'preview') || typeof next.entries !== 'function') {
    throw new Error('provideSiteEntries : { mode: "site" | "preview", entries: () => SiteEntry[] } attendu');
  }
  provider = next;
}

/** Fournisseur installé, ou `undefined`. */
export function siteEntriesProvider() {
  return provider;
}

/** Retire le fournisseur (tests). */
export function resetSiteEntries() {
  provider = undefined;
}

/**
 * `<collection>/<id>` d'une entrée.
 * @param {Pick<SiteEntry, 'collection' | 'id'>} entry
 */
export function entryRef(entry) {
  return `${entry.collection}/${entry.id}`;
}

/**
 * Chemin de la page d'une ref valide : `projects/gha-svu` → `/projets/gha-svu/`.
 * @param {string} ref
 */
export function entryHref(ref) {
  const [collection, id] = ref.split('/');
  const base = ENTRY_BASE_PATHS[/** @type {keyof typeof ENTRY_BASE_PATHS} */ (collection)];
  if (!base || !id) throw new Error(`entryHref : ref invalide « ${ref} »`);
  return `${base}${id}/`;
}

/** Message de la carte d'erreur de l'aperçu. @param {string} ref */
export const missingCardText = (ref) => `Entrée introuvable : ${ref}`;

/**
 * Résout les refs de cartes d'un corps selon la politique du fournisseur.
 * @param {string[]} refs refs VALIDES (motif vérifié par l'appelant)
 * @param {{ file: string, citingDraft: boolean }} context fichier rendu (messages) et
 *   statut brouillon de l'entrée qui cite
 * @returns {Promise<Map<string, ResolvedCard>>}
 */
export async function resolveCards(refs, { file, citingDraft }) {
  const out = new Map();
  if (refs.length === 0) return out;
  if (!provider) {
    throw new Error(
      `Bloc carte dans ${file} : aucun index d'entrées fourni (provideSiteEntries) — impossible de résoudre « ${refs[0]} »`,
    );
  }
  const { mode } = provider;
  const entries = await provider.entries();
  const byRef = new Map(entries.map((entry) => [entryRef(entry), entry]));
  for (const ref of refs) {
    const entry = byRef.get(ref);
    if (!entry) {
      if (mode === 'site') {
        throw new Error(
          `Bloc carte dans ${file} : ref inconnue « ${ref} » (aucune entrée src/content/${ref}/index.md) — corriger la ref ou retirer la carte`,
        );
      }
      out.set(ref, { ref, missing: missingCardText(ref) });
      continue;
    }
    if (entry.draft && !citingDraft && mode === 'site') {
      throw new Error(
        `Bloc carte dans ${file} : « ${ref} » est un brouillon (draft: true) cité par une entrée publiée — publier la cible ou retirer la carte`,
      );
    }
    const kind = ENTRY_KIND_LABELS[/** @type {keyof typeof ENTRY_KIND_LABELS} */ (entry.collection)];
    out.set(ref, { ref, href: entryHref(ref), kind, entry });
  }
  return out;
}
