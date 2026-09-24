/**
 * Les 5 tons de tags du contrat visuel §2.3
 * (docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md) — système
 * distinct des deux accents, chaque ton étant un triplet fond / texte /
 * bordure. Les valeurs vivent dans `src/styles/global.css`
 * (`--color-tag<Ton><Bg|Ink|Line>`, clair dans `@theme static`, sombre sous
 * `:root[data-theme="dark"]`) ; ce module ne porte que les NOMS.
 *
 * Consommé par les puces de tag (ton = `tagTone`, cf. `tags.ts`) et par les
 * niveaux d'usage IA (`aiUsage.ts`, D40).
 *
 * Les classes sont écrites EN TOUTES LETTRES (pas de gabarit
 * `bg-tag${Ton}Bg`) : Tailwind v4 ne génère que les utilitaires qu'il trouve
 * littéralement dans les sources (D41).
 */

/** Ordre du tableau §2.3 — c'est aussi l'ordre d'indexation du hash de `tagTone`. */
export const TONES = ['green', 'blue', 'violet', 'amber', 'rose'] as const;
export type Tone = (typeof TONES)[number];

/** Fond + texte + couleur de bordure d'un ton (la largeur `border` reste au composant). */
export const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-tagGreenBg text-tagGreenInk border-tagGreenLine',
  blue: 'bg-tagBlueBg text-tagBlueInk border-tagBlueLine',
  violet: 'bg-tagVioletBg text-tagVioletInk border-tagVioletLine',
  amber: 'bg-tagAmberBg text-tagAmberInk border-tagAmberLine',
  rose: 'bg-tagRoseBg text-tagRoseInk border-tagRoseLine',
};

/** Nom de token (sans `--color-`) : `toneTokenName('green', 'Bg')` → `tagGreenBg`. */
export function toneTokenName(tone: Tone, part: 'Bg' | 'Ink' | 'Line'): string {
  return `tag${tone[0].toUpperCase()}${tone.slice(1)}${part}`;
}
