/**
 * Données de la fiche projet (plan 15, inventaire §4) : tuiles de la Stack et
 * lignes de la carte méta de la barre latérale.
 *
 * AUCUN import d'`astro:content` : fonctions pures sur des objets simples
 * (`entry.data`), testables sans Astro — comme listCards.ts. Les composants
 * n'affichent que ce qui est rendu ici ; `null` veut dire « emplacement
 * absent », jamais une chaîne vide à masquer en CSS.
 */
import { PROJECT_STATUS_META, type ProjectStatus } from './projectStatus';
import { stackLogo, type StackLogo } from './stackLogos';

export interface StackRole {
  name: string;
  role: string;
}

export interface StackTile {
  /** Libellé tel que saisi dans `stack`. */
  name: string;
  /** Tracé Simple Icons, ou `null` : la tuile montre alors `monogram`. */
  logo: StackLogo | null;
  /** Monogramme de repli ; `null` quand un logo existe. */
  monogram: string | null;
  /** Rôle sourcé (`stackRoles`, D104), ou `null` : la ligne disparaît. */
  role: string | null;
}

const key = (name: string) => name.trim().toLowerCase();

/** Lettres et chiffres seulement : `Node.js` → `Nodejs`. */
const alnum = (word: string) => word.replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Monogramme d'une techno sans logo : initiales des mots (3 au plus) pour un
 * nom de plusieurs mots — `Sveltia CMS` → `SC` —, sinon les 3 premières
 * lettres — `SVU` → `SVU`. Toujours en capitales.
 */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).map(alnum).filter(Boolean);
  const letters =
    words.length > 1 ? words.slice(0, 3).map((word) => word[0]).join('') : (words[0] ?? '').slice(0, 3);
  return letters.toUpperCase();
}

/**
 * Une tuile par techno de `stack`, dans l'ordre. Un rôle ne s'attache qu'à
 * une techno de la stack (nom comparé sans casse ni blancs de bord) : un rôle
 * orphelin ne crée pas de tuile. Un rôle blanc vaut absence de rôle.
 */
export function stackTiles(
  stack: readonly string[],
  roles: readonly StackRole[] = [],
): StackTile[] {
  return stack.map((name) => {
    const logo = stackLogo(name) ?? null;
    const role = roles.find((entry) => key(entry.name) === key(name))?.role.trim() || null;
    return { name, logo, monogram: logo ? null : monogram(name), role };
  });
}

export interface ProjectMetaInput {
  status: ProjectStatus;
  startDate?: Date;
  license?: string;
}

export interface ProjectMetaRow {
  label: 'statut' | 'depuis' | 'licence';
  value: string;
  /** Classes de puce (PROJECT_STATUS_META) pour `statut` ; `null` sinon. */
  chipClass: string | null;
}

/**
 * Lignes de la carte méta, dans l'ordre statut · depuis · licence ; `depuis`
 * et `licence` disparaissent sans valeur. Mois lu en UTC, comme
 * `featuredSince` : `z.coerce.date('2026-07-01')` vaut minuit UTC.
 */
export function projectMetaRows(input: ProjectMetaInput): ProjectMetaRow[] {
  const status = PROJECT_STATUS_META[input.status];
  const rows: ProjectMetaRow[] = [{ label: 'statut', value: status.label, chipClass: status.chipClass }];
  if (input.startDate) {
    const since = input.startDate.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    rows.push({ label: 'depuis', value: since, chipClass: null });
  }
  const license = input.license?.trim();
  if (license) rows.push({ label: 'licence', value: license, chipClass: null });
  return rows;
}
