/**
 * Façade vidéo des blocs `:::video` (plan 23, T2 ; décision D153).
 *
 * Le serveur (src/lib/blocks/remarkBlocks.mjs) rend un `<figure data-video>`
 * qui ne contient qu'un lien vers la page du fournisseur : aucune requête
 * tierce avant le clic, et sans JS le lien mène à la vidéo. Ce module, chargé
 * par src/scripts/video-facade.ts sur les seuls articles qui ont une vidéo,
 * remplace ce lien par l'iframe du lecteur au clic (ou à Entrée — un lien
 * activé au clavier reçoit un `click` de bouton 0).
 *
 * - YouTube : `youtube-nocookie.com/embed/<id>?autoplay=1` (le domaine sans
 *   cookie tant que la lecture n'a pas commencé) ; asciinema :
 *   `asciinema.org/a/<id>/iframe?autoplay=1`.
 * - Ids revalidés contre les motifs de src/lib/blocks/syntax.mjs : un DOM
 *   altéré ne fabrique jamais une URL arbitraire (l'iframe n'est pas créée,
 *   le lien reste).
 * - `sandbox` : scripts + même origine (le lecteur en a besoin), fenêtres
 *   surgissantes qui sortent du bac à sable (« Regarder sur YouTube »,
 *   lien asciinema), présentation (Cast) ; ni formulaires, ni navigation de
 *   la page, ni modales, ni téléchargements. `allow` : ce que le lecteur
 *   utilise, rien de plus (asciinema : lecture auto et plein écran).
 * - Clic avec modificateur ou bouton du milieu : le navigateur garde la main
 *   (nouvel onglet vers la page du fournisseur).
 */
import { VIDEO_ID_PATTERNS, VIDEO_PROVIDER_LABELS } from './blocks/syntax.mjs';

export type VideoProvider = 'youtube' | 'asciinema';

const EMBED: Record<VideoProvider, (id: string) => string> = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
  asciinema: (id) => `https://asciinema.org/a/${id}/iframe?autoplay=1`,
};

/** Attribut `allow` de l'iframe, par fournisseur. */
export const VIDEO_IFRAME_ALLOW: Record<VideoProvider, string> = {
  youtube: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
  asciinema: 'autoplay; fullscreen',
};

/** Attribut `sandbox` de l'iframe (les deux fournisseurs). */
export const VIDEO_IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation';

function isProvider(value: unknown): value is VideoProvider {
  return value === 'youtube' || value === 'asciinema';
}

/**
 * URL du lecteur intégré. Lève une erreur sur un fournisseur inconnu ou un id
 * hors motif.
 */
export function videoEmbedUrl(provider: VideoProvider, id: string): string {
  if (!isProvider(provider)) throw new Error(`fournisseur vidéo inconnu « ${String(provider)} »`);
  if (!VIDEO_ID_PATTERNS[provider].test(id)) {
    throw new Error(`id ${VIDEO_PROVIDER_LABELS[provider]} invalide « ${id} »`);
  }
  return EMBED[provider](id);
}

/** Champs d'un `MouseEvent` qui décident si la façade intercepte le clic. */
export interface ActivationLike {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/** Clic principal sans modificateur (Entrée sur le lien compris). */
export function isPlainActivation(event: ActivationLike): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Remplace le lien de la façade par l'iframe du lecteur et lui donne le
 * focus. Renvoie l'iframe, ou `null` (rien touché) si la figure ne porte pas
 * un fournisseur et un id valides ou n'a plus de lien.
 */
export function activateVideoFacade(figure: HTMLElement): HTMLIFrameElement | null {
  const provider = figure.dataset.provider;
  const id = figure.dataset.videoId ?? '';
  const link = figure.querySelector<HTMLAnchorElement>('a[data-video-link]');
  if (!link || !isProvider(provider) || !VIDEO_ID_PATTERNS[provider].test(id)) return null;

  const title =
    figure.querySelector('[data-video-title]')?.textContent?.trim() || `Vidéo ${VIDEO_PROVIDER_LABELS[provider]}`;

  const iframe = figure.ownerDocument.createElement('iframe');
  iframe.title = title;
  iframe.setAttribute('allow', VIDEO_IFRAME_ALLOW[provider]);
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('sandbox', VIDEO_IFRAME_SANDBOX);
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  // Classe déjà émise par le lien de la façade : aucune règle CSS nouvelle
  // (la bordure est remise à 0 par le preflight).
  iframe.className = 'size-full';
  // `src` en dernier : sandbox et allow sont posés avant tout chargement.
  iframe.src = videoEmbedUrl(provider, id);

  link.replaceWith(iframe);
  iframe.focus();
  return iframe;
}
