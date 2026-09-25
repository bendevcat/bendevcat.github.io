/**
 * Enregistrement des gabarits d'aperçu `/admin/` dans Sveltia CMS (plan 21,
 * T6, R1 ; décisions D138–D141).
 *
 * Un composant par collection de `public/admin/config.yml` (`blog`,
 * `projects`, `prompts`, `skills`), enregistré par `cms.ts` avant `init()`
 * via `CMS.registerPreviewTemplate(nom, composant)`. Sveltia 0.221 le rend
 * dans une racine React posée sur le `<body>` de l'iframe d'aperçu, par
 * `createElement(composant, props)` — même type à chaque frappe, donc une mise
 * à jour, pas un remontage (`entry-preview-iframe.svelte`).
 *
 * React : Sveltia n'exporte ni `h` ni hooks ; importer `@sveltia/cms` pose
 * `window.h = window.createElement = React.createElement` et
 * `window.createClass` (create-react-class) — `src/lib/main.js` du paquet npm,
 * lu dans `npm/index.js.map`. Faute de hooks, le composant est une classe
 * `createClass` qui tient l'état asynchrone ; s'ils manquent (Sveltia changé),
 * rien n'est enregistré, `console.error` le dit et Sveltia garde son aperçu
 * par défaut.
 *
 * État tenu par le composant, le gabarit restant une fonction pure
 * `(data, h)` :
 * - `bodyHtml` : `renderBody` est asynchrone, le rendu React non. Chaque
 *   corps demandé reçoit un numéro ; seul le résultat du DERNIER demandé est
 *   posé — un rendu plus ancien qui arrive après (frappe rapide) est ignoré.
 *   En attendant, le HTML précédent reste affiché.
 * - `images` : chemin écrit → URL `blob:` (ou `null`). Chemins = la
 *   couverture (blog) et les images du corps rendu (`bodyImagePaths`). Pour
 *   chacun, `props.getAsset(chemin)` ; tant que son `url` n'est pas `blob:`/
 *   `data:`/`http(s):`, on attend `toBase64()` (qui lit le fichier et crée
 *   l'URL `blob:`) puis on relit `getAsset(chemin).url`. Aucune `src` n'est
 *   posée avant : pas de requête relative vers l'origine (D136, D141).
 *
 * Pas de boucle : `componentDidUpdate` ne resynchronise que si les props ont
 * changé (un `setState` garde les mêmes props), et `sync` ne demande que ce
 * qui manque (corps différent du dernier demandé, image ni résolue ni en
 * cours).
 *
 * Assainissement (F1, D143) : le `h` passé aux gabarits est enveloppé par
 * `sanitizingH` — tout `dangerouslySetInnerHTML` (le corps rendu, images
 * résolues) passe par DOMPurify (`sanitize.ts`) juste avant l'injection dans
 * l'iframe, qui permet scripts et même origine. Sans assainisseur utilisable
 * (pas de DOM), rien n'est enregistré : l'aperçu par défaut de Sveltia, lui
 * assaini, reste.
 *
 * Chargement paresseux : le pipeline Markdown (`markdown.ts` →
 * `@astrojs/markdown-remark`, Shiki, plugins rehype) n'est importé, par
 * `import()`, qu'au premier corps à rendre — pas au chargement de `/admin/`.
 */
import type { H } from './html';
import { displayableSrc, bodyImagePaths, type ResolvedImages } from './images';
import { articlePreview } from './article';
import { projectPreview } from './project';
import { promptPreview } from './prompt';
import { skillPreview } from './skill';
import { createSanitizer, sanitizingH, type Sanitize } from './sanitize';

/** Gabarit pur d'une collection. */
type Template = (data: Record<string, unknown>, h: H) => unknown;

interface CollectionPreview {
  template: Template;
  /** Champ image montré par le gabarit (hors corps), à résoudre par `getAsset`. */
  imageField?: string;
}

/** Gabarit de chaque collection de `config.yml`, par nom de collection. */
export const PREVIEWS: Readonly<Record<string, CollectionPreview>> = {
  blog: { template: articlePreview as Template, imageField: 'cover' },
  projects: { template: projectPreview as Template },
  prompts: { template: promptPreview as Template },
  skills: { template: skillPreview as Template },
};

/** Ce que l'aperçu lit d'une Map Immutable d'entrée (`props.entry`). */
export interface EntryLike {
  get(key: string): unknown;
  getIn(path: readonly string[]): unknown;
}

/** `ApiAsset` de Sveltia : `url` d'abord relative, puis `blob:` une fois lue. */
export interface AssetLike {
  url?: unknown;
  toBase64?: () => Promise<unknown>;
}

export interface PreviewProps {
  entry?: EntryLike | null;
  getAsset?: ((path: string) => AssetLike | null | undefined) | null;
}

interface PreviewState {
  bodyHtml: string;
  images: ResolvedImages;
}

/** Instance vue par les méthodes d'un composant `createClass`. */
interface PreviewInstance {
  props: PreviewProps;
  state: PreviewState;
  setState(update: Partial<PreviewState> | ((state: PreviewState) => Partial<PreviewState>)): void;
  sync(): void;
  resolveImages(paths: readonly string[]): void;
  /** Numéro du dernier corps demandé. */
  bodyTicket: number;
  /** Dernier corps demandé (`undefined` : aucun encore). */
  requestedBody?: string;
  /** Chemins d'image en cours de résolution. */
  pendingImages: Set<string>;
  unmounted: boolean;
}

/** Spécification passée à `createClass` (sous-ensemble de create-react-class). */
export interface ClassSpec {
  displayName: string;
  getInitialState(this: PreviewInstance): PreviewState;
  componentDidMount(this: PreviewInstance): void;
  componentDidUpdate(this: PreviewInstance, prevProps: PreviewProps): void;
  componentWillUnmount(this: PreviewInstance): void;
  sync(this: PreviewInstance): void;
  resolveImages(this: PreviewInstance, paths: readonly string[]): void;
  render(this: PreviewInstance): unknown;
}

export type CreateClass = (spec: ClassSpec) => unknown;
export type RenderBody = (md: string) => Promise<string>;

export interface PreviewRuntime {
  h: H;
  createClass: CreateClass;
  /** Assainit tout HTML injecté (`dangerouslySetInnerHTML`) ; F1. */
  sanitize: Sanitize;
  /** Charge le rendu des corps ; par défaut `import('./markdown')`, au premier besoin. */
  loadRenderBody?: () => Promise<RenderBody>;
}

/** Sous-ensemble de l'API Sveltia utilisé ici (facilite les tests). */
export interface PreviewTemplateApi {
  registerPreviewTemplate(name: string, component: unknown): void;
}

const loadMarkdown: () => Promise<RenderBody> = () => import('./markdown').then((m) => m.renderBody);

/** Données de l'entrée pour le gabarit : champs du CMS + `id` (slug) et `body`. */
export function entryData(entry: EntryLike | null | undefined): Record<string, unknown> {
  const map = entry?.getIn(['data']) as { toJS?: () => unknown } | undefined;
  const fields = map && typeof map.toJS === 'function' ? map.toJS() : undefined;
  const data = fields && typeof fields === 'object' ? { ...(fields as Record<string, unknown>) } : {};
  const slug = entry?.get('slug');
  data.id = typeof slug === 'string' ? slug : '';
  data.body = typeof data.body === 'string' ? data.body : '';
  return data;
}

/**
 * URL affichable de l'image `path` : celle de `getAsset` si elle l'est déjà,
 * sinon celle qu'il donne une fois le fichier lu (`toBase64()`). `null` si
 * l'asset est inconnu, illisible, ou toujours sans URL affichable.
 */
export async function resolveAsset(
  getAsset: PreviewProps['getAsset'],
  path: string,
): Promise<string | null> {
  if (typeof getAsset !== 'function') return null;
  const asset = getAsset(path);
  if (!asset) return null;
  const direct = displayableSrc(typeof asset.url === 'string' ? asset.url : undefined);
  if (direct) return direct;
  if (typeof asset.toBase64 !== 'function') return null;
  try {
    await asset.toBase64();
  } catch {
    return null;
  }
  const after = getAsset(path)?.url;
  return displayableSrc(typeof after === 'string' ? after : undefined) ?? null;
}

/** Composant `createClass` de la collection : état asynchrone + gabarit pur. */
export function previewComponent(name: string, preview: CollectionPreview, runtime: PreviewRuntime): unknown {
  const { createClass } = runtime;
  // Le HTML injecté par un gabarit passe par l'assainisseur, en dernier.
  const h = sanitizingH(runtime.h, runtime.sanitize);
  const loadRenderBody = runtime.loadRenderBody ?? loadMarkdown;
  let renderer: Promise<RenderBody> | undefined;
  const renderBody = async (md: string): Promise<string> => {
    if (!md) return '';
    if (!renderer) {
      const loading = loadRenderBody();
      renderer = loading;
      // Un échec de chargement n'est pas gardé : le corps suivant réessaie.
      loading.catch(() => {
        if (renderer === loading) renderer = undefined;
      });
    }
    return (await renderer)(md);
  };

  return createClass({
    displayName: `Preview(${name})`,

    getInitialState() {
      this.bodyTicket = 0;
      this.requestedBody = undefined;
      this.pendingImages = new Set();
      this.unmounted = false;
      return { bodyHtml: '', images: {} };
    },

    componentDidMount() {
      this.sync();
    },

    componentDidUpdate(prevProps) {
      // Un setState garde les mêmes props : seules de nouvelles props (frappe,
      // nouvel asset) relancent la synchronisation.
      if (prevProps !== this.props) this.sync();
    },

    componentWillUnmount() {
      this.unmounted = true;
    },

    sync() {
      const data = entryData(this.props.entry);
      const body = data.body as string;
      const field = preview.imageField ? data[preview.imageField] : undefined;
      const fieldPaths = typeof field === 'string' && field ? [field] : [];

      if (body !== this.requestedBody) {
        this.requestedBody = body;
        const ticket = ++this.bodyTicket;
        renderBody(body).then(
          (html) => {
            // Dernier corps demandé seulement : un rendu dépassé est ignoré.
            if (this.unmounted || ticket !== this.bodyTicket) return;
            this.setState({ bodyHtml: html });
            this.resolveImages([...fieldPaths, ...bodyImagePaths(html)]);
          },
          (error: unknown) => {
            if (this.unmounted || ticket !== this.bodyTicket) return;
            console.error(`Aperçu ${name} : rendu du corps impossible`, error);
          },
        );
      }
      this.resolveImages([...fieldPaths, ...bodyImagePaths(this.state.bodyHtml)]);
    },

    resolveImages(paths) {
      for (const path of paths) {
        if (this.pendingImages.has(path) || displayableSrc(this.state.images[path])) continue;
        this.pendingImages.add(path);
        resolveAsset(this.props.getAsset, path).then((src) => {
          this.pendingImages.delete(path);
          if (this.unmounted) return;
          // Un chemin non résolu (`null`) sera retenté aux props suivantes.
          if ((this.state.images[path] ?? null) === src) return;
          this.setState((state) => ({ images: { ...state.images, [path]: src } }));
        });
      }
    },

    render() {
      const data = entryData(this.props.entry);
      return preview.template({ ...data, bodyHtml: this.state.bodyHtml, images: this.state.images }, h);
    },
  });
}

type ReactScope = { h?: unknown; createClass?: unknown };

/**
 * Enregistre un gabarit par collection (`PREVIEWS`) avec le React de Sveltia
 * (`scope.h`, `scope.createClass` — `scope` = `window` dans `cms.ts`). À appeler après l'import de
 * `@sveltia/cms` et avant `CMS.init()`. Renvoie `false`, sans rien
 * enregistrer, si ce React est absent ou si DOMPurify ne peut pas travailler
 * sur `scope` (l'aperçu par défaut, assaini, reste).
 */
export function registerPreviews(
  cms: PreviewTemplateApi,
  scope: object = globalThis,
  loadRenderBody?: () => Promise<RenderBody>,
  sanitize: Sanitize | null = createSanitizer(scope),
): boolean {
  const { h, createClass } = scope as ReactScope;
  if (typeof h !== 'function' || typeof createClass !== 'function') {
    console.error(
      'Aperçus /admin/ non enregistrés : window.h ou window.createClass absent — ' +
        '@sveltia/cms ne les expose plus ? Aperçu par défaut de Sveltia conservé.',
    );
    return false;
  }
  if (!sanitize) {
    console.error(
      'Aperçus /admin/ non enregistrés : assainisseur HTML (DOMPurify) indisponible — ' +
        'aperçu par défaut de Sveltia conservé.',
    );
    return false;
  }
  const runtime: PreviewRuntime = {
    h: h as H,
    createClass: createClass as CreateClass,
    sanitize,
    loadRenderBody,
  };
  for (const [name, preview] of Object.entries(PREVIEWS)) {
    cms.registerPreviewTemplate(name, previewComponent(name, preview, runtime));
  }
  return true;
}
