/**
 * Gabarit d'aperçu des skills (plan 21, T5 ; R0, R2, R6 ; D140).
 *
 * Fonction pure `(data, h) => arbre` : ni `window` ni `document`, `data` n'est
 * jamais modifié. Montre la colonne de la fiche (src/pages/skills/[...slug].astro)
 * avec les mêmes classes et les mêmes crochets `data-*` que ses composants —
 * seules des classes déjà compilées pour le site (le CSS du site ne bouge
 * pas) — dans l'ordre :
 *
 * 1. la fenêtre d'installation (InstallWindow.astro), si `installCmd` donne
 *    au moins une étape : `installation · toolLabel(type)` (défaut du schéma
 *    `claude-code`), étapes `installSteps`, note ; sans bouton `Copier` ;
 * 2. « Ce que fait ce skill » (SkillHighlights.astro), s'il y a des points ;
 * 3. « Quand il se déclenche » (SkillTriggers.astro), s'il y a des
 *    déclencheurs — sur la fiche, le premier panneau de la colonne latérale,
 *    une carte de la variante `track` de DetailTabs ;
 * 4. le premier fichier : l'aperçu du fichier sur lequel la fiche s'ouvre
 *    (`defaultFile`, FileExplorer.astro) — barre chemin · `previewRange`,
 *    extrait coloré par `explorerLines` — dans le cadre sombre de
 *    l'explorateur, sans l'arbre ;
 * 5. « En détail » (SkillNotes.astro) : le corps rendu (`bodyHtml`, pipeline
 *    du site), s'il n'est pas blanc.
 *
 * Omis (hors champ du plan) : en-tête, onglets versions / infos, prompts
 * liés, arbre des fichiers.
 */
import { installSteps, quoteLang, toolLabel } from '../../lib/skillDetail';
import { defaultFile, explorerLines, fileTree, previewRange, type ExplorerTone } from '../../lib/skillExplorer';
import type { H } from './html';
import { resolveBodyImages, type ResolvedImages } from './images';

export interface SkillPreviewData {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  installCmd?: string | null;
  installNote?: string | null;
  highlights?: ReadonlyArray<unknown> | null;
  triggers?: ReadonlyArray<unknown> | null;
  files?: ReadonlyArray<{ path?: unknown; lines?: unknown; excerpt?: unknown } | null> | null;
  body?: string | null;
  /** Corps rendu par `renderBody` (markdown.ts). */
  bodyHtml?: string | null;
  images?: ResolvedImages | null;
}

// Classes recopiées de la fiche skill et de ses composants : toutes déjà compilées.
const LEFT = 'flex min-w-0 flex-col gap-4';
const WINDOW = 'm-0 min-w-0 overflow-hidden rounded-aside border border-windowLine bg-windowBg';
const INSTALL_BAR = 'flex flex-wrap items-center gap-x-3 gap-y-2 bg-windowHead px-3.5 py-2.5';
const CARD = 'card rounded-aside px-7 py-[26px]';
const PANEL = 'card rounded-aside p-5';
const SHADOW = { boxShadow: 'var(--shadow)' };
const H2 = 'font-sans text-[17px] leading-snug font-semibold text-ink';
const FILE_BAR = 'border-b border-windowLine px-4 py-2.5 font-mono text-[11px] [overflow-wrap:anywhere] text-windowInk';
const FILE_PRE =
  'm-0 bg-windowBg p-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap [overflow-wrap:anywhere]';
const TONE_CLASS: Record<ExplorerTone, string | null> = {
  heading: 'font-semibold text-windowKey',
  rule: 'text-windowDim',
  key: 'text-windowKey',
  value: 'text-windowValue',
  plain: null,
};
/** Icon.astro `check` (Lucide, ISC) : trait, 15 px. */
const CHECK_PATH = 'M20 6 9 17l-5-5';
const NBSP = ' ';

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** Chaînes non vides d'une liste en cours de saisie. */
const strings = (list: ReadonlyArray<unknown> | null | undefined): string[] =>
  (list ?? []).filter((item): item is string => typeof item === 'string' && item !== '');

interface SkillFile {
  path: string;
  lines: number;
  excerpt: string;
}

/** Fichiers saisis : sans chemin, ignorés ; extrait absent = vide ; total absent = lignes de l'extrait. */
function filesOf(data: SkillPreviewData): SkillFile[] {
  return (data.files ?? []).flatMap((file) => {
    const path = str(file?.path);
    if (!path) return [];
    const excerpt = str(file?.excerpt) ?? '';
    const lines = file?.lines;
    if (typeof lines === 'number' && Number.isInteger(lines) && lines > 0) return [{ path, lines, excerpt }];
    const text = excerpt.endsWith('\n') ? excerpt.slice(0, -1) : excerpt;
    return [{ path, lines: text === '' ? 0 : text.split('\n').length, excerpt }];
  });
}

function installWindow<N>(steps: string[], tool: string, note: string | undefined, h: H<N>): N {
  return h(
    'figure',
    { className: WINDOW, 'aria-label': 'Installation', 'data-install-window': '', 'data-pagefind-ignore': '' },
    h(
      'div',
      { className: INSTALL_BAR },
      h(
        'p',
        { className: 'min-w-0 font-mono text-[11px] text-windowInk', 'data-install-title': '' },
        'installation',
        h('span', { className: 'text-windowDim' }, ` · ${tool}`),
      ),
    ),
    h(
      'div',
      { className: 'px-5 py-[18px]' },
      h(
        'ol',
        { className: 'm-0 flex list-none flex-col p-0 font-mono text-[13px] leading-[1.9]' },
        steps.map((step, index) =>
          h(
            'li',
            { key: `${index}-${step}`, className: 'flex gap-2.5', 'data-install-step': '' },
            h('span', { className: 'shrink-0 text-windowDim', 'aria-hidden': 'true' }, `${index + 1}.`),
            h('span', { className: 'min-w-0 [overflow-wrap:anywhere] text-windowInk' }, step),
          ),
        ),
      ),
      note
        ? h(
            'p',
            {
              lang: quoteLang(note) === 'en' ? 'en' : undefined,
              className: 'mt-3 font-mono text-[11px] leading-[1.6] text-windowDim',
              'data-install-note': '',
            },
            note,
          )
        : null,
    ),
  );
}

function highlightsCard<N>(highlights: string[], h: H<N>): N {
  return h(
    'section',
    { className: CARD, style: SHADOW, 'aria-labelledby': 'skill-highlights', 'data-skill-highlights': '' },
    h('h2', { id: 'skill-highlights', className: H2 }, 'Ce que fait ce skill'),
    h(
      'ul',
      { className: 'mt-4 flex flex-col gap-2.5' },
      highlights.map((text, index) =>
        h(
          'li',
          { key: `${index}-${text}`, className: 'flex items-start gap-2.5', 'data-highlight': '' },
          h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '15',
              height: '15',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: '1.75',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': 'true',
              focusable: 'false',
              className: 'shrink-0 mt-[3px] text-accent',
            },
            h('path', { d: CHECK_PATH }),
          ),
          h(
            'span',
            {
              lang: quoteLang(text) === 'en' ? 'en' : undefined,
              className: 'min-w-0 font-sans text-[14.5px] leading-[1.55] text-body',
            },
            text,
          ),
        ),
      ),
    ),
  );
}

function triggersPanel<N>(triggers: string[], h: H<N>): N {
  return h(
    'div',
    { className: PANEL, style: SHADOW },
    h(
      'div',
      { 'data-skill-triggers': '' },
      h('p', { className: 'font-sans text-[13px] font-semibold text-ink' }, 'Quand il se déclenche'),
      h('p', { className: 'mt-1 font-sans text-[12.5px] leading-[1.5] text-muted' }, 'Cité de la documentation du plugin.'),
      h(
        'ul',
        { className: 'mt-3 flex flex-col gap-2' },
        triggers.map((trigger, index) =>
          h(
            'li',
            {
              key: `${index}-${trigger}`,
              className:
                'rounded-thumb bg-code px-3 py-2.5 font-mono text-[12px] leading-[1.5] [overflow-wrap:anywhere] text-ink',
            },
            `«${NBSP}`,
            h('span', { lang: quoteLang(trigger), 'data-trigger': '' }, trigger),
            `${NBSP}»`,
          ),
        ),
      ),
    ),
  );
}

function fileWindow<N>(file: SkillFile, id: string, h: H<N>): N {
  const code: unknown[] = [];
  explorerLines(file.excerpt, file.path).forEach((line, index) => {
    if (index > 0) code.push('\n');
    line.segments.forEach(({ kind, text }, at) => {
      const className = TONE_CLASS[kind];
      code.push(className ? h('span', { key: `${index}-${at}`, className, 'data-explorer-tone': kind }, text) : text);
    });
  });
  return h(
    'figure',
    { className: WINDOW, 'aria-label': 'Fichiers du plugin', 'data-pagefind-ignore': '' },
    h(
      'div',
      { id, 'data-explorer-preview': file.path },
      h(
        'p',
        { className: FILE_BAR },
        h('span', { 'data-explorer-path': '' }, file.path),
        h(
          'span',
          { className: 'text-windowDim', 'data-explorer-range': '' },
          ` · ${previewRange(file.excerpt, file.lines)}`,
        ),
      ),
      h('pre', { className: FILE_PRE }, h('code', { className: 'text-windowInk' }, code)),
    ),
  );
}

export function skillPreview<N>(data: SkillPreviewData, h: H<N>): N {
  const installCmd = str(data.installCmd);
  const steps = installSteps(installCmd);
  const tool = toolLabel(str(data.type) || 'claude-code');
  const note = str(data.installNote) || undefined;
  const highlights = strings(data.highlights);
  const triggers = strings(data.triggers);
  const files = filesOf(data);
  const paths = files.map((file) => file.path);
  const selected = defaultFile(paths, str(data.name) || undefined);
  const file = files.find((entry) => entry.path === selected);
  // Même id que l'aperçu de la fiche : `skill-file-<rang dans l'arbre>`.
  const rank = fileTree(paths)
    .filter((row) => row.kind === 'file')
    .findIndex((row) => row.path === selected);
  const hasBody = (data.body ?? '').trim() !== '';

  return h(
    'div',
    { className: LEFT, 'data-preview': 'skills' },
    installCmd && steps.length > 0 ? installWindow(steps, tool, note, h) : null,
    highlights.length > 0 ? highlightsCard(highlights, h) : null,
    triggers.length > 0 ? triggersPanel(triggers, h) : null,
    file ? fileWindow(file, `skill-file-${rank + 1}`, h) : null,
    hasBody
      ? h(
          'section',
          { className: CARD, style: SHADOW, 'aria-labelledby': 'skill-notes', 'data-skill-notes': '' },
          h('h2', { id: 'skill-notes', className: H2 }, 'En détail'),
          h('div', {
            className: 'prose mt-4 [&>:first-child]:mt-0!',
            dangerouslySetInnerHTML: { __html: resolveBodyImages(data.bodyHtml ?? '', data.images ?? {}) },
          }),
        )
      : null,
  );
}
