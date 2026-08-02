/**
 * Copie presse-papier avec fallback — spec P4 §6.1 (« fallback + feedback
 * visuel »). Le bouton du Plan 1 appelait `navigator.clipboard.writeText`
 * sans garde : en contexte non sécurisé ou permission refusée, la promesse
 * rejetait et le libellé du bouton ne changeait JAMAIS — l'utilisateur ne
 * savait pas que la copie avait échoué.
 *
 * Les dépendances sont injectables pour être testables sans DOM : ce repo
 * n'a pas jsdom et n'a pas le droit d'en ajouter (contrainte globale).
 * `defaultDeps()` lit `navigator`/`document` À L'APPEL, jamais à l'import,
 * pour que le module reste importable en environnement Node.
 */

export interface ClipboardDeps {
  writeText?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
}

/** Fallback historique : `<textarea>` hors écran + `document.execCommand('copy')`. */
function legacyCopyViaTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function defaultDeps(): ClipboardDeps {
  return {
    writeText: navigator?.clipboard?.writeText
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
    legacyCopy: legacyCopyViaTextarea,
  };
}

/**
 * Tente l'API moderne, puis le fallback. Renvoie `true` seulement si le texte
 * est effectivement au presse-papier — l'appelant s'en sert pour choisir le
 * feedback visuel.
 */
export async function copyText(text: string, deps: ClipboardDeps = defaultDeps()): Promise<boolean> {
  if (deps.writeText) {
    try {
      await deps.writeText(text);
      return true;
    } catch {
      // Contexte non sécurisé, permission refusée, document non focalisé…
      // On ne renonce pas : le fallback ci-dessous a de bonnes chances.
    }
  }

  try {
    return deps.legacyCopy?.(text) ?? false;
  } catch {
    return false;
  }
}
