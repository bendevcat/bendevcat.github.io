/**
 * Composants de l'éditeur Sveltia pour les quatre blocs `:::` (plan 23, T4,
 * R7 ; décision D152) : Encadré, Terminal, Carte, Vidéo — dans le menu
 * « Insert » de la barre d'outils du corps des articles.
 *
 * Syntaxe : tout vient de `src/lib/blocks/syntax.mjs` (motifs, `fromBlock`,
 * `toBlock`, validateurs), le module que lisent aussi le plugin du site et le
 * garde canonique ; ce fichier n'y ajoute que les formulaires et les résumés.
 *
 * Contrat de `CMS.registerEditorComponent` dans Sveltia 0.221.0 (sources de
 * `npm/index.js.map`) :
 * - `services/api/index.js` lève une `TypeError` sauf si `id` et `label` sont
 *   des chaînes non vides, `pattern` une `RegExp`, `toBlock` ET `toPreview`
 *   des fonctions (les types publics disent `toPreview` facultatif : faux à
 *   l'exécution), `fields` un tableau. Enregistré sous `id` ; l'éditeur le
 *   désigne `x-<id>` (`getComponentDef`, pas de collision avec les nœuds
 *   Lexical internes).
 * - Les champs sont parcourus par l'analyseur de config à `init()`
 *   (`customComponentRegistry.forEach(parseFields)`) : enregistrer AVANT
 *   `init()`. Un `select` sans option y est une erreur de config — la Carte
 *   n'est pas enregistrée si l'index est vide.
 * - `trigger: 'menuitem'` (défaut) = entrée du menu Insert (`button` = bouton
 *   de la barre) ; `mode: 'block'` (défaut) = formulaire dépliable dans le
 *   texte (`dialog` = pastille qui ouvre une boîte de dialogue).
 * - Motif « multiligne » si drapeau `m`/`s` ou `[\s\S]` (`components/utils.js`) :
 *   nœud de bloc, transformateur `multiline-element`. À l'import, à CHAQUE
 *   ligne, le reste du document est confronté au motif non global et la
 *   correspondance n'est retenue que si elle commence à cette ligne (issue
 *   #410) ; props = `fromBlock(match) ?? match.groups`. À l'export,
 *   `toBlock(props)` sans les clés internes `__sc_*`.
 * - À la création de la classe du nœud, Sveltia appelle `toPreview({})` et
 *   `toBlock({})` : si l'un commence par une balise HTML (`<aside…`), tout
 *   élément de ce nom collé dans l'éditeur devient ce composant
 *   (`importDOM`). Nos résumés sont donc du texte brut échappé, jamais une
 *   balise ; `toBlock({})` commence par `:::`.
 * - `toPreview` ne sert qu'à l'aperçu par défaut de Sveltia : nos gabarits
 *   (`previews/register.ts`) le remplacent et rendent le corps par le
 *   pipeline du site (blocs compris).
 * - Valeurs d'un composant ouvert : `normalizeContent(fillDefaults: false)`
 *   — un `select` n'est pas confronté à ses options, une ref absente de
 *   l'index survit donc à une sauvegarde sans modification ; la validation
 *   (`validateFields('extraValues')`) teste le motif d'un champ texte sur la
 *   valeur ÉLAGUÉE : `toBlock` élague donc titre, id et langage avant
 *   d'écrire. Un champ `code` (`output_code_only`) y passe aussi : son
 *   `pattern` est honoré (`fields/code/validate.js` rend la valeur telle
 *   quelle), d'où le refus des suites de ``` du Terminal (D156). La
 *   validation bloque la SAUVEGARDE (`validateEntry` dans `draft/save`) ;
 *   `toBlock` a déjà réécrit le corps à la frappe.
 * - Activation par champ : `editor_components` du champ markdown (défaut :
 *   `code-block`, `image` et TOUS les composants enregistrés) ; un champ
 *   markdown d'un composant hérite `allow_nested_components` du champ parent
 *   (`rich-text-editor.svelte`). D'où `public/admin/config.yml` : les blocs
 *   sur le corps des articles seulement, sans imbrication.
 */
import type { EditorComponentDefinition, Field } from '@sveltia/cms';
import {
  BLOCKS,
  CALLOUT_KINDS,
  CALLOUT_LABELS,
  ENTRY_KIND_LABELS,
  LANG_PATTERN,
  TITLE_MAX,
  VIDEO_ID_PATTERNS,
  VIDEO_PROVIDERS,
  VIDEO_PROVIDER_LABELS,
  type BlockId,
} from '../../lib/blocks/syntax.mjs';
import { entryRef, provideSiteEntries, type SiteEntry } from '../../lib/blocks/siteEntries.mjs';

/** Ids des composants, dans l'ordre du menu (= noms de `editor_components`). */
export const BLOCK_COMPONENT_IDS: readonly BlockId[] = ['encadre', 'terminal', 'carte', 'video'];

/** Boutons de mise en forme du contenu d'un encadré (ni titre, ni citation, ni bloc de code). */
export const CALLOUT_BUTTONS = ['bold', 'italic', 'code', 'link', 'bulleted-list', 'numbered-list'] as const;

/**
 * Titre accepté par le formulaire, sur la valeur élaguée (c'est elle que
 * Sveltia teste et que `toBlock` écrit) : une ligne, sans `[` ni `]`, sans
 * `\` final — les règles de `titleError` hors blancs de bordure.
 */
export const TITLE_FORM_PATTERN = /^[^[\]\r\n]*[^[\]\r\n\\]$/;

/**
 * Id vidéo accepté par le formulaire : YouTube OU asciinema. Un champ ne
 * peut pas dépendre d'un autre dans Sveltia : l'id est confronté au motif de
 * SON fournisseur au rendu (build en échec, aperçu en erreur).
 */
export const VIDEO_ID_FORM_PATTERN = new RegExp(
  `^(?:${VIDEO_PROVIDERS.map((provider) => VIDEO_ID_PATTERNS[provider].source.slice(1, -1)).join('|')})$`,
);

/**
 * Code du Terminal accepté par le formulaire (D156) : aucune suite de trois
 * backticks. L'éditeur de code de Sveltia se ferme dessus : en tête de ligne
 * le reste sort du code ; ailleurs l'export Lexical allonge la clôture, que
 * `parseCodeBlock` ne relit pas, et la valeur ENTIÈRE est vidée à l'ouverture
 * suivante (plan 23, T5). Même règle que `fence-in-code` du garde canonique.
 * Sveltia teste le motif sur la valeur élaguée, ce qui ne crée ni ne retire
 * de suite.
 */
export const CODE_FORM_PATTERN = /^(?![\s\S]*`{3})/;

/** Message du motif, affiché sous le champ quand la sauvegarde est refusée. */
export const CODE_FORM_MESSAGE =
  'Pas de ``` (trois backticks à la suite) : l’éditeur de code s’y arrête et viderait le code à la prochaine ouverture.';

/** Option du sélecteur de Carte. */
export interface CardOption {
  label: string;
  value: string;
}

/**
 * Options du sélecteur de Carte : une par entrée de l'index, dans son ordre
 * (collection puis id) ; libellé `<Article|Projet|Prompt|Skill> · <titre>`,
 * suivi de ` 📝` pour un brouillon.
 */
export function cardOptions(entries: readonly SiteEntry[]): CardOption[] {
  return entries.map((entry) => {
    const kind = ENTRY_KIND_LABELS[entry.collection as keyof typeof ENTRY_KIND_LABELS] ?? entry.collection;
    const title = entry.title.trim() || entry.id;
    return { label: `${kind} · ${title}${entry.draft ? ' 📝' : ''}`, value: entryRef(entry) };
  });
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Texte brut échappé pour HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Chaîne d'une valeur de formulaire (absente → ''). */
const text = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));

/** Extrait sur une ligne, `max` caractères au plus. */
function excerpt(value: unknown, max = 60): string {
  const flat = text(value).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Résumé texte `Libellé · détail · détail` (parties vides omises), échappé. */
const summary = (...parts: string[]): string => escapeHtml(parts.filter(Boolean).join(' · '));

/** Props avec `keys` élagués (chaînes seulement). */
function trimmed(props: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out = { ...props };
  for (const key of keys) if (typeof out[key] === 'string') out[key] = (out[key] as string).trim();
  return out;
}

/** Champs de chaque composant (les options de la Carte dépendent de l'index). */
function blockFields(options: readonly CardOption[]): Record<BlockId, Field[]> {
  return {
    encadre: [
      {
        name: 'kind',
        label: 'Type',
        widget: 'select',
        default: 'note',
        options: CALLOUT_KINDS.map((kind) => ({ label: CALLOUT_LABELS[kind], value: kind })),
      },
      {
        name: 'content',
        label: 'Contenu',
        widget: 'markdown',
        editor_components: [],
        buttons: [...CALLOUT_BUTTONS],
      },
    ],
    terminal: [
      {
        name: 'title',
        label: 'Titre',
        widget: 'string',
        hint: 'Une ligne, par ex. un nom de fichier ou une commande — sans « [ » ni « ] ».',
        maxlength: TITLE_MAX,
        pattern: [TITLE_FORM_PATTERN, 'Une ligne sans « [ » ni « ] », sans « \\ » final.'],
      },
      {
        name: 'lang',
        label: 'Langage',
        widget: 'string',
        required: false,
        hint: 'Facultatif, par ex. bash — le terminal n’est pas coloré.',
        use_emoji_autocomplete: false,
        pattern: [LANG_PATTERN, 'Lettres, chiffres et _ + # . - seulement, sans espace.'],
      },
      {
        name: 'code',
        label: 'Code',
        widget: 'code',
        output_code_only: true,
        allow_language_selection: false,
        pattern: [CODE_FORM_PATTERN, CODE_FORM_MESSAGE],
      },
    ],
    carte: [
      {
        name: 'ref',
        label: 'Entrée',
        widget: 'select',
        hint: 'Article, projet, prompt ou skill du site (liste relue à chaque déploiement). 📝 = brouillon.',
        options: options.map((option) => ({ ...option })),
      },
    ],
    video: [
      {
        name: 'provider',
        label: 'Fournisseur',
        widget: 'select',
        default: 'youtube',
        options: VIDEO_PROVIDERS.map((provider) => ({ label: VIDEO_PROVIDER_LABELS[provider], value: provider })),
      },
      {
        name: 'id',
        label: 'Identifiant',
        widget: 'string',
        use_emoji_autocomplete: false,
        hint: 'YouTube : les 11 caractères après watch?v= ; asciinema : le numéro après /a/.',
        pattern: [VIDEO_ID_FORM_PATTERN, 'YouTube : 11 lettres, chiffres, - ou _ ; asciinema : 1 à 32 lettres ou chiffres.'],
      },
      {
        name: 'title',
        label: 'Titre',
        widget: 'string',
        hint: 'Titre de la vidéo, sur une ligne — sans « [ » ni « ] ».',
        maxlength: TITLE_MAX,
        pattern: [TITLE_FORM_PATTERN, 'Une ligne sans « [ » ni « ] », sans « \\ » final.'],
      },
    ],
  };
}

/**
 * Définitions `registerEditorComponent` des blocs, dans l'ordre du menu. La
 * Carte manque si l'index est vide (un `select` sans option casse la config).
 */
export function blockComponents(entries: readonly SiteEntry[]): EditorComponentDefinition[] {
  const options = cardOptions(entries);
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const fields = blockFields(options);

  const definitions: Record<BlockId, EditorComponentDefinition> = {
    encadre: {
      id: 'encadre',
      label: 'Encadré',
      icon: 'info',
      fields: fields.encadre,
      pattern: BLOCKS.encadre.pattern,
      fromBlock: BLOCKS.encadre.fromBlock,
      toBlock: (props) => BLOCKS.encadre.toBlock(props),
      toPreview: (props) =>
        summary('Encadré', CALLOUT_LABELS[props.kind as keyof typeof CALLOUT_LABELS] ?? '', excerpt(props.content)),
    },
    terminal: {
      id: 'terminal',
      label: 'Terminal',
      icon: 'terminal',
      fields: fields.terminal,
      pattern: BLOCKS.terminal.pattern,
      fromBlock: BLOCKS.terminal.fromBlock,
      toBlock: (props) => BLOCKS.terminal.toBlock(trimmed(props, ['title', 'lang'])),
      toPreview: (props) => summary('Terminal', excerpt(props.title), excerpt(props.lang, 20)),
    },
    carte: {
      id: 'carte',
      label: 'Carte',
      icon: 'bookmark',
      fields: fields.carte,
      pattern: BLOCKS.carte.pattern,
      fromBlock: BLOCKS.carte.fromBlock,
      toBlock: (props) => BLOCKS.carte.toBlock(props),
      toPreview: (props) => {
        const ref = text(props.ref);
        return summary('Carte', labels.get(ref) ?? (ref ? `${ref} (introuvable)` : ''));
      },
    },
    video: {
      id: 'video',
      label: 'Vidéo',
      icon: 'smart_display',
      fields: fields.video,
      pattern: BLOCKS.video.pattern,
      fromBlock: BLOCKS.video.fromBlock,
      toBlock: (props) => BLOCKS.video.toBlock(trimmed(props, ['id', 'title'])),
      toPreview: (props) =>
        summary(
          'Vidéo',
          VIDEO_PROVIDER_LABELS[props.provider as keyof typeof VIDEO_PROVIDER_LABELS] ?? '',
          excerpt(props.title),
        ),
    },
  };

  const common = { trigger: 'menuitem', mode: 'block' } as const;
  return BLOCK_COMPONENT_IDS.filter((id) => id !== 'carte' || options.length > 0).map((id) => ({
    ...common,
    ...definitions[id],
  }));
}

/** Sous-ensemble de l'API Sveltia utilisé ici (facilite les tests). */
export interface EditorComponentApi {
  registerEditorComponent(definition: EditorComponentDefinition): void;
}

/**
 * Installe l'index comme fournisseur d'entrées de l'aperçu (mode `preview` :
 * une ref inconnue devient une carte d'erreur, sans exception).
 */
export function provideAdminEntries(entries: readonly SiteEntry[]): void {
  provideSiteEntries({ mode: 'preview', entries: () => [...entries] });
}

/**
 * Pour `cms.ts`, avant `init()` : fournisseur d'entrées de l'aperçu, puis un
 * composant d'éditeur par bloc. Renvoie les ids enregistrés.
 */
export function registerBlocks(cms: EditorComponentApi, entries: readonly SiteEntry[]): string[] {
  provideAdminEntries(entries);
  const definitions = blockComponents(entries);
  if (!definitions.some(({ id }) => id === 'carte')) {
    console.warn('Bloc Carte non enregistré : index des entrées vide (virtual:bencat-site-entries).');
  }
  for (const definition of definitions) cms.registerEditorComponent(definition);
  return definitions.map(({ id }) => id);
}
