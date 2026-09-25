/**
 * Gabarit d'aperçu des projets (plan 21, T4 ; R0, R2, R5 ; D140).
 *
 * Fonction pure `(data, h) => arbre` : ni `window` ni `document`, `data` n'est
 * jamais modifié. Montre la carte principale de la fiche
 * (src/pages/projets/[...slug].astro) avec les mêmes classes et les mêmes
 * crochets `data-*` que ses composants — seules des classes déjà compilées
 * pour le site (le CSS du site ne bouge pas) — dans l'ordre :
 *
 * 1. l'en-tête (ProjectHeader.astro, sans `← tous les projets`) : titre,
 *    description, puis la carte méta de la barre latérale (ProjectAside.astro,
 *    `[data-project-meta]`) réduite à son `<dl>` : `projectMetaRows` — statut
 *    (défaut `actif`, comme le schéma), `depuis` (mois lu en UTC), licence ;
 * 2. le corps (`bodyHtml`, pipeline du site) en `.prose`, s'il n'est pas blanc ;
 * 3. la fenêtre de code (CodeWindow.astro) de `snippet`, s'il n'est pas blanc :
 *    gouttière `1…N`, texte `codeWindowText`, segments `codeWindowLines`,
 *    puce `snippetFile` ; sans bouton `Copier` ;
 * 4. les tuiles de stack (StackTiles.astro) : `stackTiles(stack, stackRoles)`,
 *    logo ou monogramme, rôle — si la stack n'est pas vide.
 *
 * Omis (hors champ du plan) : bandeau, rangée d'onglets, boutons
 * `code source ↗` / `démo ↗`, articles liés.
 */
import { codeWindowLines, isYamlFile, type CodeSegmentKind } from '../../lib/codeWindow';
import { projectMetaRows, stackTiles, type StackRole } from '../../lib/projectDetail';
import { PROJECT_STATUS_META, type ProjectStatus } from '../../lib/projectStatus';
import type { H } from './html';
import { resolveBodyImages, type ResolvedImages } from './images';

export interface ProjectPreviewData {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  /** `AAAA-MM-JJ` tel que l'écrit le CMS (ou une `Date`). */
  startDate?: string | Date | null;
  license?: string | null;
  stack?: ReadonlyArray<unknown> | null;
  stackRoles?: ReadonlyArray<Partial<Record<keyof StackRole, unknown>> | null> | null;
  snippet?: string | null;
  snippetFile?: string | null;
  body?: string | null;
  /** Corps rendu par `renderBody` (markdown.ts). */
  bodyHtml?: string | null;
  images?: ResolvedImages | null;
}

// Classes recopiées de la fiche projet et de ses composants : toutes déjà compilées.
const MAIN = 'card min-w-0 overflow-hidden';
const HEADER = 'px-5 pt-7 sm:px-8';
const TITLE = 'mt-3 font-sans text-[32px] leading-[1.15] font-bold tracking-[-.03em] text-pretty text-ink';
const DESCRIPTION = 'mt-2.5 max-w-[600px] font-sans text-base leading-[1.6] text-pretty text-muted';
const META = 'card rounded-aside p-5';
const META_STYLE = { boxShadow: 'var(--shadow)' };
const META_ROW =
  'flex items-center justify-between gap-3 border-t border-line2 py-2.5 first:border-t-0 first:pt-0 last:pb-0';
/** Enveloppe des panneaux de la variante `underline` de DetailTabs. */
const PANELS = 'px-5 pt-7 pb-8 sm:px-8';
const CODE_WINDOW = 'mt-6 overflow-hidden rounded-inner border first:mt-0 border-windowLine bg-windowBg';
const CODE_BAR = 'flex h-[38px] items-center gap-3 border-b border-windowLine bg-windowHead px-3.5';
const CODE_FILE = 'min-w-0 truncate rounded-small bg-windowLine px-2 py-0.5 font-mono text-[11px] text-windowDim';
const CODE_PRE = 'grid grid-cols-[46px_1fr] overflow-x-auto bg-windowBg py-4 pr-4 font-mono text-[13px] leading-[1.7]';
const GUTTER = 'select-none pr-3.5 text-right text-windowDim';
const SEGMENT_CLASS: Record<CodeSegmentKind, string | null> = {
  key: 'text-windowKey',
  value: 'text-windowValue',
  plain: null,
};
const TILES = 'mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3';
const TILE = 'card-inner flex min-w-0 flex-col items-center rounded-hero p-4 text-center';

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const isStatus = (value: unknown): value is ProjectStatus =>
  typeof value === 'string' && Object.hasOwn(PROJECT_STATUS_META, value);

/** `startDate` du CMS en `Date` (minuit UTC, comme `z.coerce.date`) ; invalide → absente. */
function dateOf(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

function codeWindow<N>(snippet: string, file: string | undefined, h: H<N>): N {
  const lines = codeWindowLines(snippet, file);
  const code: unknown[] = [];
  lines.forEach((line, index) => {
    if (index > 0) code.push('\n');
    line.segments.forEach(({ kind, text }, at) => {
      const className = SEGMENT_CLASS[kind];
      code.push(className ? h('span', { key: `${index}-${at}`, className, [`data-code-${kind}`]: '' }, text) : text);
    });
  });
  return h(
    'figure',
    {
      className: CODE_WINDOW,
      'aria-label': file ? `Extrait : ${file}` : 'Extrait de code',
      'data-code-window': '',
      'data-code-lang': isYamlFile(file) ? 'yaml' : 'text',
      'data-pagefind-ignore': '',
    },
    h(
      'div',
      { className: CODE_BAR },
      h(
        'span',
        { className: 'flex shrink-0 gap-1.5', 'aria-hidden': 'true' },
        h('span', { className: 'size-2.5 rounded-pill bg-windowDotRed' }),
        h('span', { className: 'size-2.5 rounded-pill bg-windowDotAmber' }),
        h('span', { className: 'size-2.5 rounded-pill bg-windowDotGreen' }),
      ),
      file ? h('span', { className: CODE_FILE, 'data-code-file': '' }, file) : null,
    ),
    h(
      'pre',
      { className: CODE_PRE },
      h(
        'span',
        { 'aria-hidden': 'true', className: GUTTER, 'data-code-gutter': '' },
        lines.map((line) => line.number).join('\n'),
      ),
      h('code', { className: 'text-windowInk' }, code),
    ),
  );
}

export function projectPreview<N>(data: ProjectPreviewData, h: H<N>): N {
  const images = data.images ?? {};
  const rows = projectMetaRows({
    status: isStatus(data.status) ? data.status : 'actif',
    startDate: dateOf(data.startDate),
    license: str(data.license),
  });
  const stack = (data.stack ?? []).filter((name): name is string => typeof name === 'string');
  const roles = (data.stackRoles ?? []).flatMap((entry) =>
    typeof entry?.name === 'string' ? [{ name: entry.name, role: str(entry.role) ?? '' }] : [],
  );
  const tiles = stackTiles(stack, roles);
  const body = data.body ?? '';
  const hasBody = body.trim() !== '';
  const snippet = data.snippet?.trim() ? data.snippet : undefined;
  const file = str(data.snippetFile) || undefined;

  const header = h(
    'div',
    { className: HEADER, 'data-project-header': '' },
    h('h1', { className: TITLE }, data.title ?? ''),
    h('p', { className: DESCRIPTION }, data.description ?? ''),
  );

  // Carte méta hors de `[data-project-header]` : chaque région garde le texte
  // de la sienne sur la page (R8).
  const meta = h(
    'div',
    { className: HEADER },
    h(
      'div',
      { className: META, style: META_STYLE, 'data-project-meta': '' },
      h(
        'dl',
        { className: 'flex flex-col' },
        rows.map((row) =>
          h(
            'div',
            { key: row.label, className: META_ROW },
            h('dt', { className: 'font-mono text-[11px] text-muted' }, row.label),
            h(
              'dd',
              { className: 'text-right' },
              row.chipClass
                ? h(
                    'span',
                    {
                      className: `pill inline-block border px-[11px] py-[5px] text-[11px] leading-none ${row.chipClass}`,
                    },
                    row.value,
                  )
                : h('span', { className: 'font-sans text-sm text-ink' }, row.value),
            ),
          ),
        ),
      ),
    ),
  );

  const stackPanel =
    tiles.length > 0
      ? h(
          'div',
          { className: 'mt-8 first:mt-0' },
          h(
            'p',
            {
              className: 'font-mono text-xs text-muted',
              'data-panel-label': '',
              'data-pagefind-ignore': '',
            },
            '// ce qui fait tourner le projet',
          ),
          h(
            'ul',
            { 'aria-label': 'Technologies', className: TILES },
            tiles.map((tile, index) =>
              h(
                'li',
                {
                  key: `${index}-${tile.name}`,
                  className: TILE,
                  'data-stack-tile': '',
                },
                h(
                  'div',
                  {
                    className: 'flex h-[88px] w-full items-center justify-center text-ink',
                  },
                  tile.logo
                    ? h(
                        'svg',
                        {
                          viewBox: '0 0 24 24',
                          width: '40',
                          height: '40',
                          fill: 'currentColor',
                          'aria-hidden': 'true',
                          focusable: 'false',
                        },
                        h('path', { d: tile.logo.path }),
                      )
                    : h(
                        'span',
                        {
                          className: 'font-mono text-xl font-semibold text-muted',
                          'aria-hidden': 'true',
                          'data-monogram': '',
                        },
                        tile.monogram,
                      ),
                ),
                h(
                  'p',
                  {
                    className: 'mt-2 max-w-full font-sans text-[15px] leading-snug font-semibold break-words text-ink',
                    'data-stack-name': '',
                  },
                  tile.name,
                ),
                tile.role
                  ? h(
                      'p',
                      {
                        className: 'mt-1 max-w-full font-mono text-[10px] leading-snug break-words text-muted',
                        'data-stack-role': '',
                      },
                      tile.role,
                    )
                  : null,
              ),
            ),
          ),
        )
      : null;

  // Toujours rendue, même vide : son padding borde le bas de la carte.
  const panels = h(
    'div',
    { className: PANELS },
    hasBody
      ? h('div', {
          className: 'prose',
          dangerouslySetInnerHTML: {
            __html: resolveBodyImages(data.bodyHtml ?? '', images),
          },
        })
      : null,
    snippet ? codeWindow(snippet, file, h) : null,
    stackPanel,
  );

  return h('div', { className: MAIN, 'data-preview': 'projects' }, header, meta, panels);
}
