/**
 * Images de l'aperçu `/admin/` (plan 21, T2, R12 ; décisions D136, D138).
 *
 * L'iframe d'aperçu de Sveltia porte `<base href="<origin>">` : une `src`
 * relative (`./screenshot-….png`) s'y résout contre l'origine → 404. Et
 * `getAsset(path).url` vaut d'abord le chemin relatif, puis une URL `blob:`
 * une fois le fichier lu. Règle : une `<img>` n'a de `src` qu'une fois
 * affichable — `blob:`, `data:` ou `http(s):` — sinon pas de `src` du tout.
 *
 * Le corps rendu par `renderBody` (markdown.ts) porte, comme au build du site,
 * des repères `<img __ASTRO_IMAGE_="{…}">` sans `src` pour les images du corps ;
 * `resolveBodyImages` les remplace par de vraies `<img>` avec la `src` résolue
 * (ou sans). Une `<img>` écrite en HTML brut dans le corps suit la même règle.
 *
 * Fonctions pures : la table `images` (chemin écrit → URL résolue ou `null`)
 * est tenue par le composant d'aperçu (`getAsset` puis `toBase64()`).
 */

/** Chemin écrit dans le contenu → URL résolue (ou `null`/absente : pas encore). */
export type ResolvedImages = Readonly<Record<string, string | null | undefined>>;

const DISPLAYABLE = /^(?:blob|data|https?):/i;

/** `src` si elle s'affiche sans dépendre de `<base>` : `blob:`, `data:`, `http(s):`. */
export function displayableSrc(src: string | null | undefined): string | undefined {
  return typeof src === 'string' && DISPLAYABLE.test(src) ? src : undefined;
}

/** `src` d'une image du contenu (couverture, image du corps) : résolue, ou absente. */
export function imageSrc(path: string | null | undefined, images: ResolvedImages): string | undefined {
  if (!path) return undefined;
  const resolved = Object.hasOwn(images, path) ? images[path] : undefined;
  return displayableSrc(resolved) ?? displayableSrc(path);
}

/** Balise `<img>` ; un `>` est permis dans une valeur entre guillemets. */
const IMG = /<img\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
/** Attribut : nom, puis valeur entre `"`, entre `'` ou nue. */
const ATTR = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const PLACEHOLDER = '__ASTRO_IMAGE_';

interface Attr {
  name: string;
  /** Valeur décodée (entités résolues), `''` pour un attribut sans valeur. */
  value: string;
  /** Texte d'origine, recopié tel quel quand l'attribut ne change pas. */
  raw: string;
}

const NAMED: Record<string, string> = { amp: '&', quot: '"', lt: '<', gt: '>', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi, (all, hex, dec, name) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (dec) return String.fromCodePoint(Number.parseInt(dec, 10));
    return NAMED[name.toLowerCase()] ?? all;
  });
}

function escapeAttr(value: string): string {
  return value.replace(/[&"<>]/g, (c) => `&#x${c.charCodeAt(0).toString(16).toUpperCase()};`);
}

function parseAttrs(text: string): Attr[] {
  return [...text.matchAll(ATTR)].map(([raw, name, dq, sq, bare]) => ({
    name,
    value: decodeEntities(dq ?? sq ?? bare ?? ''),
    raw,
  }));
}

interface ImageTag {
  /** Chemin écrit dans le corps (`./x.png`, URL…), s'il y en a un. */
  path?: string;
  /** Attributs conservés, `src` retirée ; `alt`/`title` du repère ajoutés. */
  rest: Array<{ name: string; raw: string } | { name: string; value: string }>;
}

function readTag(attrText: string): ImageTag {
  const tag: ImageTag = { rest: [] };
  for (const attr of parseAttrs(attrText)) {
    const name = attr.name.toLowerCase();
    if (name === 'src') {
      tag.path ??= attr.value;
    } else if (attr.name === PLACEHOLDER) {
      let props: Record<string, unknown> = {};
      try {
        props = JSON.parse(attr.value);
      } catch {
        // Repère illisible : l'image reste sans src.
      }
      if (typeof props.src === 'string') tag.path = props.src;
      for (const key of ['alt', 'title']) {
        if (typeof props[key] === 'string') tag.rest.push({ name: key, value: props[key] as string });
      }
    } else {
      tag.rest.push({ name: attr.name, raw: attr.raw });
    }
  }
  return tag;
}

/** Chemin à résoudre par `getAsset` : ni schéma (`https:`, `blob:`…), ni `//hôte`. */
const hasScheme = (path: string) => /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//');

/**
 * Chemins d'image du corps rendu à résoudre par `getAsset` (relatifs ou
 * racine), dans l'ordre, sans doublon.
 */
export function bodyImagePaths(html: string): string[] {
  const paths = new Set<string>();
  for (const [, attrs] of html.matchAll(IMG)) {
    const { path } = readTag(attrs);
    if (path && !hasScheme(path)) paths.add(path);
  }
  return [...paths];
}

/**
 * HTML du corps où chaque `<img>` (repère du pipeline ou HTML brut) a pour
 * `src` son URL résolue affichable, ou n'a pas de `src`. Le reste du HTML est
 * recopié tel quel.
 */
export function resolveBodyImages(html: string, images: ResolvedImages): string {
  return html.replace(IMG, (_all, attrs: string) => {
    const tag = readTag(attrs);
    const src = imageSrc(tag.path, images);
    const parts: string[] = [];
    let srcPlaced = false;
    const placeSrc = () => {
      if (!srcPlaced && src) parts.push(`src="${escapeAttr(src)}"`);
      srcPlaced = true;
    };
    for (const attr of tag.rest) {
      // `src` avant `alt` : l'ordre des balises du site (`class` du repère d'abord).
      if (attr.name === 'alt' || attr.name === 'title') placeSrc();
      parts.push('raw' in attr ? attr.raw : `${attr.name}="${escapeAttr(attr.value)}"`);
    }
    placeSrc();
    return parts.length ? `<img ${parts.join(' ')}>` : '<img>';
  });
}
