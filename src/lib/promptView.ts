import type { PROMPT_FORMATS } from '../content.config';

export type PromptFormat = (typeof PROMPT_FORMATS)[number];

/**
 * Règle fiche vs guide (spec R4).
 *
 * - `fiche` : le champ `prompt` EST la valeur de la page → bloc copiable, le
 *   corps servant de notes d'usage.
 * - `guide` : le corps EST la valeur → pas de bloc, même si l'entrée porte un
 *   `prompt` (le schéma §3.3 le laisse optionnel sur les deux formats).
 *
 * Une fiche sans `prompt` (ou avec un prompt vide) ne rend PAS un bloc de
 * code vide : le schéma de la spec de design n'impose pas le champ, le rendu
 * doit donc rester correct sans lui.
 */
export function shouldRenderPromptBlock(format: PromptFormat, prompt?: string): boolean {
  return format === 'fiche' && (prompt ?? '').trim().length > 0;
}
