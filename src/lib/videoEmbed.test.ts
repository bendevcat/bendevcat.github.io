// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  VIDEO_IFRAME_ALLOW,
  VIDEO_IFRAME_SANDBOX,
  activateVideoFacade,
  isPlainActivation,
  videoEmbedUrl,
} from './videoEmbed';

describe('videoEmbedUrl', () => {
  it('youtube-nocookie, autoplay, id validé', () => {
    expect(videoEmbedUrl('youtube', 'aqz-KE-bpKQ')).toBe(
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1',
    );
    // Jamais le domaine à cookies.
    expect(videoEmbedUrl('youtube', 'aqz-KE-bpKQ')).not.toMatch(/\/\/(www\.)?youtube\.com\//);
    for (const bad of ['', 'aqz-KE-bpK', 'aqz-KE-bpKQQ', 'aqz KE-bpKQ', 'aqz/KE?bpKQ', '"><script>x']) {
      expect(() => videoEmbedUrl('youtube', bad), bad).toThrow(/YouTube invalide/);
    }
  });

  it('asciinema /iframe', () => {
    expect(videoEmbedUrl('asciinema', '335480')).toBe('https://asciinema.org/a/335480/iframe?autoplay=1');
    expect(videoEmbedUrl('asciinema', 'AbC123')).toBe('https://asciinema.org/a/AbC123/iframe?autoplay=1');
    for (const bad of ['', '33-5480', '../x', 'a'.repeat(33)]) {
      expect(() => videoEmbedUrl('asciinema', bad), bad).toThrow(/asciinema invalide/);
    }
  });

  it('fournisseur inconnu refusé', () => {
    expect(() => videoEmbedUrl('vimeo' as never, '123')).toThrow(/fournisseur vidéo inconnu/);
  });
});

describe('isPlainActivation', () => {
  const plain = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false };

  it('clic principal sans modificateur (ou Entrée, qui donne button 0) → intercepté', () => {
    expect(isPlainActivation(plain)).toBe(true);
  });

  it('Ctrl/⌘/Maj/Alt, bouton du milieu ou événement déjà traité → laissé au navigateur', () => {
    expect(isPlainActivation({ ...plain, ctrlKey: true })).toBe(false);
    expect(isPlainActivation({ ...plain, metaKey: true })).toBe(false);
    expect(isPlainActivation({ ...plain, shiftKey: true })).toBe(false);
    expect(isPlainActivation({ ...plain, altKey: true })).toBe(false);
    expect(isPlainActivation({ ...plain, button: 1 })).toBe(false);
    expect(isPlainActivation({ ...plain, defaultPrevented: true })).toBe(false);
  });
});

/** Balisage produit par remarkBlocks (videoHast), réduit à ce que lit le script. */
function facade(provider: string, id: string, title: string, href: string): HTMLElement {
  document.body.innerHTML = `<figure data-video data-provider="${provider}" data-video-id="${id}" data-pagefind-ignore>
  <a href="${href}" data-video-link><span aria-hidden="true">▶</span><span data-video-title>${title}</span><span>Lecture au clic</span></a>
</figure>`;
  return document.querySelector<HTMLElement>('[data-video]')!;
}

describe('activateVideoFacade', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('youtube : le lien est remplacé par une iframe nocookie titrée, aux attributs serrés, qui reçoit le focus', () => {
    const figure = facade('youtube', 'aqz-KE-bpKQ', 'Big Buck Bunny', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    const iframe = activateVideoFacade(figure);
    expect(iframe).not.toBeNull();
    expect(figure.querySelector('a')).toBeNull();
    expect(figure.querySelectorAll('iframe')).toHaveLength(1);
    expect(iframe!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1');
    expect(iframe!.getAttribute('title')).toBe('Big Buck Bunny');
    expect(iframe!.getAttribute('allow')).toBe(VIDEO_IFRAME_ALLOW.youtube);
    expect(iframe!.getAttribute('sandbox')).toBe(VIDEO_IFRAME_SANDBOX);
    expect(iframe!.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe!.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(document.activeElement).toBe(iframe);
  });

  it('asciinema : iframe /iframe?autoplay=1, allow réduit à autoplay et plein écran', () => {
    const figure = facade('asciinema', '335480', 'Une session', 'https://asciinema.org/a/335480');
    const iframe = activateVideoFacade(figure);
    expect(iframe!.getAttribute('src')).toBe('https://asciinema.org/a/335480/iframe?autoplay=1');
    expect(iframe!.getAttribute('allow')).toBe('autoplay; fullscreen');
    expect(iframe!.getAttribute('title')).toBe('Une session');
  });

  it('attributs : sandbox sans allow-forms ni allow-top-navigation, allow sans caméra ni micro', () => {
    expect(VIDEO_IFRAME_SANDBOX).not.toMatch(/allow-forms|allow-top-navigation|allow-modals|allow-downloads/);
    for (const allow of Object.values(VIDEO_IFRAME_ALLOW)) {
      expect(allow).not.toMatch(/camera|microphone|geolocation|clipboard/);
    }
  });

  it('id ou fournisseur invalide dans le DOM → rien remplacé, le lien reste', () => {
    for (const [provider, id] of [
      ['youtube', 'bad'],
      ['vimeo', '123'],
      ['asciinema', '../x'],
    ]) {
      const figure = facade(provider, id, 'T', 'https://example.org/');
      expect(activateVideoFacade(figure), `${provider}/${id}`).toBeNull();
      expect(figure.querySelector('a[data-video-link]')).not.toBeNull();
      expect(figure.querySelector('iframe')).toBeNull();
    }
  });

  it('titre absent → titre de repli nommant le fournisseur', () => {
    const figure = facade('youtube', 'aqz-KE-bpKQ', '', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    expect(activateVideoFacade(figure)!.getAttribute('title')).toBe('Vidéo YouTube');
  });
});
