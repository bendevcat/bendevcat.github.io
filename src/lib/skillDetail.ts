/**
 * Données de la fiche skill (plan 17, inventaire §8) : étapes d'installation,
 * outil, date de mise à jour, dates du journal des versions.
 *
 * AUCUN import d'`astro:content` : fonctions pures sur des objets simples
 * (`entry.data`), testables sans Astro — comme listCards.ts. Les composants
 * n'affichent que les chaînes rendues ici ; `null` = emplacement absent.
 */

export interface ChangelogRow {
  version: string;
  /** `z.coerce.date('2026-09-18')` → minuit UTC. */
  date: Date;
  text: string;
}

/**
 * Étapes numérotées de la fenêtre d'installation : `installCmd` coupée sur
 * `&&`, chaque partie rognée, les parties vides écartées. Le bouton Copier
 * copie toujours `installCmd` telle qu'écrite, jamais ces étapes.
 */
export function installSteps(installCmd: string | undefined): string[] {
  return (installCmd ?? '')
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** `claude-code` → `Claude Code` ; tout autre type tel qu'écrit. */
export function toolLabel(type: string): string {
  return type === 'claude-code' ? 'Claude Code' : type;
}

/** Version comparable : rognée, sans `v` de tête. */
function normaliseVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/**
 * `maj.` de la fiche (D117 — pas de champ `updated`) : la date de la ligne du
 * journal dont la version est la version déclarée ; `null` sans version,
 * sans journal ou sans ligne correspondante.
 */
export function skillUpdated(
  version: string | undefined,
  changelog: readonly ChangelogRow[] | undefined,
): Date | null {
  const wanted = normaliseVersion(version ?? '');
  if (wanted === '') return null;
  const row = (changelog ?? []).find((entry) => normaliseVersion(entry.version) === wanted);
  return row ? row.date : null;
}

/** Date d'une ligne de l'onglet versions : `18 sept. 2026` (fr-FR court, UTC). */
export function versionDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Valeur de `maj.` (en-tête et infos) : `18 septembre 2026` (fr-FR long, UTC),
 * `null` sans date. Le libellé `maj.` est posé par le composant.
 */
export function updatedLabel(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Langue d'une phrase citée (déclencheurs, points forts) : le site est en
 * français (`<html lang="fr">`), les citations viennent de la doc des plugins,
 * en anglais ou en français (plan 17 : `lang="en"` sauf citation française,
 * comme `ne rien perdre entre les sessions`). Règle : une lettre accentuée
 * du français ou un mot-outil français → `fr` ; sinon `en`.
 */
const FRENCH_LETTER = /[àâçéèêëîïôûùüÿœæ]/i;
const FRENCH_WORD =
  /(?:^|[^\p{L}])(?:le|la|les|un|une|des|du|de|et|est|ne|pas|rien|entre|chaque|toute|tout|ce|qui|que|par|pour|avec|sans|dans|sur|son|sa|ses)(?=$|[^\p{L}])/iu;

export function quoteLang(text: string): 'fr' | 'en' {
  return FRENCH_LETTER.test(text) || FRENCH_WORD.test(text) ? 'fr' : 'en';
}
