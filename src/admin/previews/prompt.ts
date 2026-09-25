/**
 * Gabarit d'aperçu des prompts (plan 21, T3 ; R0, R2, R3 ; D140).
 *
 * Fonction pure `(data, h) => arbre` : ni `window` ni `document`, `data` n'est
 * jamais modifié. Montre la colonne centrale de la fiche
 * (src/pages/prompts/[...slug].astro), avec les mêmes crochets `data-*` et les
 * mêmes classes que ses composants — seules des classes déjà compilées pour
 * le site (le CSS du site ne bouge pas) :
 *
 * 1. la fenêtre (PromptWindow.astro) : toujours sombre ; texte =
 *    `measurePromptText`, segments et titres = `promptWindowLines` (règle du
 *    site : 2 à 6 `#` puis une espace) ; barre `<id>.md · N l. · ~N tk`
 *    (`nouveau.md` pour une entrée sans slug). Ni boutons (cachés sur la page
 *    jusqu'au script), ni saisie de variables ;
 * 2. les variables (PromptVariables.astro), si `promptPageTabs` montre
 *    l'onglet : nom, ligne `défaut :`, indication — sans champ ni bouton ;
 * 3. le décryptage : le corps rendu (`bodyHtml`, pipeline du site) d'une fiche
 *    dont la fenêtre montre le `prompt`, si l'onglet existe. Le corps d'un
 *    guide est dans la fenêtre.
 *
 * Les panneaux 2 et 3 sont des cartes de la variante `track` de DetailTabs.
 */
import { measurePromptText, promptStats } from '../../lib/listCards';
import { promptPageTabs } from '../../lib/detailTabs';
import { promptMetaSlots } from '../../lib/promptDetail';
import { promptWindowLines, promptWindowSource, type PromptVariable } from '../../lib/promptWindow';
import type { PromptFormat } from '../../lib/promptView';
import type { H } from './html';
import { resolveBodyImages, type ResolvedImages } from './images';

export interface PromptPreviewData {
  /** Slug ; absent pour une entrée pas encore enregistrée. */
  id?: string | null;
  format?: PromptFormat | null;
  prompt?: string | null;
  variables?: ReadonlyArray<Partial<Record<keyof PromptVariable, unknown>> | null> | null;
  body?: string | null;
  /** Corps rendu par `renderBody` (markdown.ts). */
  bodyHtml?: string | null;
  images?: ResolvedImages | null;
}

// Classes recopiées des composants du site (PromptWindow, PromptVariables,
// DetailTabs `track`, page prompt) : toutes déjà compilées.
const ROOT = 'flex min-w-0 flex-col gap-[22px]';
const WINDOW = 'm-0 min-w-0 overflow-hidden rounded-aside border border-windowLine bg-windowBg';
const BAR = 'flex flex-wrap items-center gap-x-3 gap-y-2 bg-windowHead px-3.5 py-2.5';
const BAR_TEXT = 'min-w-0 font-mono text-[11px] [overflow-wrap:anywhere] text-windowInk';
const PRE = 'm-0 bg-windowBg p-5 font-mono text-[13px] leading-[1.95] whitespace-pre-wrap [overflow-wrap:anywhere]';
const VAR_CLASS = 'rounded-small bg-windowVarBg px-[3px] text-windowVar';
const HEADING_CLASS = 'font-semibold text-windowKey';
const ASIDE = 'flex min-w-0 flex-col gap-3';
const PANEL = 'card rounded-aside p-5';
const PANEL_STYLE = { boxShadow: 'var(--shadow)' };
const DECRYPTAGE =
  'prose [&_ol]:text-[14px]! [&_p]:text-[14px]! [&_ul]:text-[14px]! [&_h2]:mt-6! [&_h2]:mb-2! [&_h2]:text-base! [&_h2]:font-semibold! [&>:first-child]:mt-0!';

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** Variables telles que saisies dans le CMS (élément en cours de saisie compris). */
function variablesOf(data: PromptPreviewData): PromptVariable[] {
  return (data.variables ?? []).map((variable) => {
    const name = str(variable?.name) ?? '';
    const hint = str(variable?.hint);
    const fallback = str(variable?.default);
    return {
      name,
      ...(hint !== undefined ? { hint } : {}),
      ...(fallback !== undefined ? { default: fallback } : {}),
    };
  });
}

export function promptPreview<N>(data: PromptPreviewData, h: H<N>): N {
  const fields = {
    format: (data.format ?? undefined) as PromptFormat,
    prompt: data.prompt ?? undefined,
    variables: variablesOf(data),
  };
  const body = data.body ?? undefined;
  const source = promptWindowSource(fields, body);
  const text = measurePromptText(fields, body);
  const counts = promptMetaSlots({}, promptStats(text)).windowCounts;
  const file = `${data.id || 'nouveau'}.md`;
  const tabs = new Set(
    promptPageTabs({ variableCount: source.variables.length, windowShowsPrompt: source.showsPrompt, body }).map(
      (tab) => tab.id,
    ),
  );

  // Contenu du `<code>` : les lignes jointes par `\n`, titres et variables en
  // `<span>` — la même suite de segments que PromptWindow.astro.
  const code: unknown[] = [];
  promptWindowLines(source.template, source.variables).forEach((line, index) => {
    if (index > 0) code.push('\n');
    const segments = line.segments.map((segment, at) =>
      segment.var === undefined
        ? segment.text
        : h('span', { key: `v${index}-${at}`, className: VAR_CLASS, 'data-var': segment.var }, segment.text),
    );
    if (line.heading) {
      code.push(h('span', { key: `h${index}`, className: HEADING_CLASS, 'data-prompt-heading': '' }, segments));
    } else {
      code.push(...segments);
    }
  });

  const promptWindow = h(
    'figure',
    { className: WINDOW, 'aria-label': `Prompt : ${file}`, 'data-prompt-window': '', 'data-prompt-file': file },
    h(
      'div',
      { className: BAR, 'data-prompt-bar': '', 'data-pagefind-ignore': '' },
      h(
        'p',
        { className: BAR_TEXT },
        h('span', { 'data-prompt-filename': '' }, file),
        h('span', { className: 'text-windowDim', 'data-prompt-counts': '' }, ` · ${counts}`),
      ),
    ),
    h('pre', { className: PRE }, h('code', { className: 'text-windowInk' }, code)),
  );

  const count = source.variables.length;
  const variables = tabs.has('variables')
    ? h(
        'div',
        { className: PANEL, style: PANEL_STYLE },
        h(
          'div',
          { 'data-prompt-variables': '', 'data-pagefind-ignore': '' },
          h(
            'div',
            { className: 'flex items-baseline justify-between gap-3' },
            h(
              'p',
              { className: 'font-sans text-[13px] font-semibold text-ink' },
              `${count} ${count > 1 ? 'variables' : 'variable'}`,
            ),
          ),
          h(
            'div',
            { className: 'mt-4 flex flex-col gap-4' },
            source.variables.map((variable, index) =>
              h(
                'div',
                { key: `${index}-${variable.name}`, className: 'flex flex-col gap-1.5', 'data-var-field': variable.name },
                h('label', { className: 'font-mono text-[11px] text-accent' }, `{${variable.name}}`),
                variable.default
                  ? h(
                      'p',
                      { 'data-var-static': '', className: 'flex flex-wrap items-baseline gap-x-1.5' },
                      h('span', { className: 'font-mono text-[11px] text-muted' }, 'défaut :'),
                      ' ',
                      h('span', { className: 'font-mono text-[13px] break-all text-ink' }, variable.default),
                    )
                  : null,
                variable.hint
                  ? h('p', { lang: 'en', className: 'text-[11.5px] leading-snug text-muted' }, variable.hint)
                  : null,
              ),
            ),
          ),
        ),
      )
    : null;

  const notes = tabs.has('decryptage')
    ? h(
        'div',
        { className: PANEL, style: PANEL_STYLE },
        h('div', {
          className: DECRYPTAGE,
          'data-prompt-notes': '',
          dangerouslySetInnerHTML: { __html: resolveBodyImages(data.bodyHtml ?? '', data.images ?? {}) },
        }),
      )
    : null;

  return h(
    'div',
    { className: ROOT, 'data-preview': 'prompts' },
    promptWindow,
    variables || notes ? h('div', { className: ASIDE }, variables, notes) : null,
  );
}
