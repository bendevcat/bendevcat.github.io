import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PromptWindow from '../../components/prompt/PromptWindow.astro';
import PromptVariables from '../../components/prompt/PromptVariables.astro';
import { promptPageTabs } from '../../lib/detailTabs';
import { measurePromptText, promptStats } from '../../lib/listCards';
import { promptMetaSlots } from '../../lib/promptDetail';
import { promptWindowLines, promptWindowSource, type PromptVariable } from '../../lib/promptWindow';
import type { PromptFormat } from '../../lib/promptView';
import { diskEntries } from './diskEntries';
import {
  findAll,
  hasAttr,
  parseHtml,
  regionText,
  renderToHtml,
  textContent,
  treeH,
  treeNodes,
  type HtmlElement,
  type HtmlNode,
} from './html';
import { promptPreview, type PromptPreviewData } from './prompt';

/**
 * Aperçu des prompts (plan 21, R3) : même texte que la fiche, pour chaque
 * prompt présent sur le disque (D131 : aucune valeur figée). Les attentes
 * viennent des fonctions du site (src/lib/) et, pour la règle des titres, de
 * la règle écrite du site (2 à 6 `#` puis une espace), recopiée ici pour
 * qu'un gabarit qui s'en écarte rougisse.
 */
const prompts = await diskEntries('prompts');

interface SiteView {
  source: ReturnType<typeof promptWindowSource>;
  text: string;
  counts: string;
  tabs: Set<string>;
}

function siteView(data: Record<string, unknown>, body: string): SiteView {
  const fields = data as { format: PromptFormat; prompt?: string; variables?: PromptVariable[] };
  const source = promptWindowSource(fields, body);
  const text = measurePromptText(fields, body);
  const counts = promptMetaSlots({}, promptStats(text)).windowCounts;
  const tabs = new Set(
    promptPageTabs({ variableCount: source.variables.length, windowShowsPrompt: source.showsPrompt, body }).map(
      (tab) => tab.id,
    ),
  );
  return { source, text, counts, tabs };
}

const one = (nodes: readonly HtmlNode[], name: string, label: string): HtmlElement => {
  const found = findAll(nodes, hasAttr(name));
  expect(found, `${label} : [${name}]`).toHaveLength(1);
  return found[0];
};

const classOf = (el: HtmlElement) => el.attrs.class ?? '';

describe('aperçu des prompts : le texte de la fiche', () => {
  it('lit des prompts réels sur le disque', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('fenêtre = measurePromptText, barre <id>.md · windowCounts, titres et variables de promptWindowLines', () => {
    let headingCount = 0;
    let varCount = 0;
    for (const { name, id, data } of prompts) {
      const site = siteView(data, data.body);
      const nodes = treeNodes(promptPreview(data as PromptPreviewData, treeH));
      const win = one(nodes, 'data-prompt-window', name);
      expect(win.tag, name).toBe('figure');
      expect(win.attrs['data-prompt-file'], name).toBe(`${id}.md`);

      // Barre : `<id>.md` puis ` · N l. · ~N tk` (comptes de la fiche).
      expect(textContent(one([win], 'data-prompt-filename', name)), name).toBe(`${id}.md`);
      expect(textContent(one([win], 'data-prompt-counts', name)), name).toBe(` · ${site.counts}`);
      const stats = { lines: site.text === '' ? 0 : site.text.split('\n').length, tokens: Math.round(site.text.length / 4) };
      expect(site.counts, name).toBe(`${stats.lines} l. · ~${stats.tokens} tk`);

      // Code : exactement le texte mesuré, sauts de ligne compris.
      const codes = findAll([win], (el) => el.tag === 'code');
      expect(codes, name).toHaveLength(1);
      expect(findAll([win], (el) => el.tag === 'pre'), name).toHaveLength(1);
      expect(textContent(codes[0]), name).toBe(site.text);

      // Titres : les lignes que promptWindowLines marque — et la règle du site.
      const lines = promptWindowLines(site.source.template, site.source.variables);
      const flagged = lines
        .filter((line) => line.heading)
        .map((line) => line.segments.map((segment) => segment.text).join(''));
      const byRule = site.text.split('\n').filter((line) => /^#{2,6} /.test(line));
      expect(flagged, name).toEqual(byRule);
      const headings = findAll([win], hasAttr('data-prompt-heading')).map((el) => textContent(el));
      expect(headings, name).toEqual(byRule);
      headingCount += headings.length;

      // Variables : un `[data-var]` par segment de variable, dans l'ordre.
      const segments = lines.flatMap((line) =>
        line.segments.filter((segment) => segment.var !== undefined).map((segment) => [segment.var, segment.text]),
      );
      const spans = findAll([win], hasAttr('data-var')).map((el) => [el.attrs['data-var'], textContent(el)]);
      expect(spans, name).toEqual(segments);
      varCount += spans.length;
    }
    // Le contenu réel exerce les titres et les variables.
    expect(headingCount).toBeGreaterThan(0);
    expect(varCount).toBeGreaterThan(0);
  });

  it('variables et décryptage comme la fiche (promptPageTabs, PromptVariables)', () => {
    let withVariables = 0;
    let withNotes = 0;
    for (const { name, data } of prompts) {
      const site = siteView(data, data.body);
      const tree = promptPreview(data as PromptPreviewData, treeH);
      const html = renderToHtml(tree);
      const nodes = parseHtml(html);

      const variables = findAll(nodes, hasAttr('data-prompt-variables'));
      expect(variables.length, name).toBe(site.tabs.has('variables') ? 1 : 0);
      if (variables.length) {
        withVariables += 1;
        const count = site.source.variables.length;
        const fields = findAll(variables, hasAttr('data-var-field'));
        expect(fields.map((el) => el.attrs['data-var-field']), name).toEqual(site.source.variables.map((v) => v.name));
        const expected = [
          `${count} ${count > 1 ? 'variables' : 'variable'}`,
          ...site.source.variables.flatMap((v) => [
            `{${v.name}}`,
            ...(v.default ? [`défaut : ${v.default}`] : []),
            ...(v.hint ? [v.hint] : []),
          ]),
        ].join(' ');
        expect(regionText(variables), name).toBe(expected);
        for (const [index, field] of fields.entries()) {
          const variable = site.source.variables[index];
          expect(findAll([field], hasAttr('data-var-static')).length, `${name} ${variable.name}`).toBe(
            variable.default ? 1 : 0,
          );
        }
      }

      const notes = findAll(nodes, hasAttr('data-prompt-notes'));
      expect(notes.length, name).toBe(site.tabs.has('decryptage') ? 1 : 0);
      if (notes.length) {
        withNotes += 1;
        // Prose = le corps rendu par le pipeline du site, recopié tel quel
        // (aucune image dans les corps des prompts : rien à résoudre).
        expect(data.bodyHtml, name).not.toBe('');
        expect(html, name).toContain(`data-prompt-notes="">${data.bodyHtml}</div>`);
        expect(classOf(notes[0]).split(' '), name).toContain('prose');
      } else if (!site.source.showsPrompt) {
        // Un guide : le corps est la fenêtre.
        expect(site.text, name).toBe(data.body.trim());
      }
    }
    expect(withVariables + withNotes).toBeGreaterThan(0);
  });

  it('fenêtre et variables = composants du site (même texte, mêmes classes)', async () => {
    const container = await AstroContainer.create();
    for (const { name, id, data } of prompts) {
      const site = siteView(data, data.body);
      const preview = treeNodes(promptPreview(data as PromptPreviewData, treeH));
      const page = parseHtml(
        await container.renderToString(PromptWindow, {
          props: {
            id,
            template: site.source.template,
            variables: site.source.variables,
            text: site.text,
            counts: site.counts,
          },
        }),
      );
      const pageWindow = one(page, 'data-prompt-window', `${name} (page)`);
      const previewWindow = one(preview, 'data-prompt-window', name);
      expect(regionText(previewWindow), name).toBe(regionText(pageWindow));
      expect(textContent(findAll([previewWindow], (el) => el.tag === 'code')[0]), name).toBe(
        textContent(findAll([pageWindow], (el) => el.tag === 'code')[0]),
      );
      for (const hook of ['data-prompt-window', 'data-prompt-bar', 'data-prompt-counts', 'data-prompt-heading', 'data-var']) {
        const pageClasses = findAll(page, hasAttr(hook)).map(classOf);
        const previewClasses = findAll(preview, hasAttr(hook)).map(classOf);
        expect(previewClasses, `${name} [${hook}]`).toEqual(pageClasses);
      }
      for (const tag of ['pre', 'code']) {
        expect(findAll([previewWindow], (el) => el.tag === tag).map(classOf), `${name} ${tag}`).toEqual(
          findAll([pageWindow], (el) => el.tag === tag).map(classOf),
        );
      }

      if (site.tabs.has('variables')) {
        const pageVariables = parseHtml(
          await container.renderToString(PromptVariables, { props: { variables: site.source.variables } }),
        );
        const a = one(preview, 'data-prompt-variables', name);
        const b = one(pageVariables, 'data-prompt-variables', `${name} (page)`);
        expect(regionText(a), name).toBe(regionText(b));
        for (const hook of ['data-var-field', 'data-var-static']) {
          expect(findAll([a], hasAttr(hook)).map(classOf), `${name} [${hook}]`).toEqual(
            findAll([b], hasAttr(hook)).map(classOf),
          );
        }
      }
    }
  });

  it('entrée neuve ou vide : barre nouveau.md, sections omises', () => {
    const nodes = treeNodes(promptPreview({}, treeH));
    expect(textContent(one(nodes, 'data-prompt-filename', 'vide'))).toBe('nouveau.md');
    expect(textContent(one(nodes, 'data-prompt-counts', 'vide'))).toBe(' · 0 l. · ~0 tk');
    expect(findAll(nodes, hasAttr('data-prompt-variables'))).toHaveLength(0);
    expect(findAll(nodes, hasAttr('data-prompt-notes'))).toHaveLength(0);

    // Fiche en cours de saisie : variable sans nom ni défaut, prompt avec une variable.
    const draft = treeNodes(
      promptPreview(
        {
          format: 'fiche',
          prompt: '## Titre\nBonjour {nom} et {x}',
          variables: [{ name: 'nom' }, null, { name: 'x', default: 'y', hint: 'h' }],
          body: 'Notes',
          bodyHtml: '<p>Notes</p>',
        },
        treeH,
      ),
    );
    expect(textContent(one(draft, 'data-prompt-filename', 'brouillon'))).toBe('nouveau.md');
    expect(findAll(draft, hasAttr('data-prompt-heading')).map((el) => textContent(el))).toEqual(['## Titre']);
    expect(findAll(draft, hasAttr('data-var')).map((el) => textContent(el))).toEqual(['{nom}', 'y']);
    expect(regionText(one(draft, 'data-prompt-variables', 'brouillon'))).toBe('3 variables {nom} {} {x} défaut : y h');
    expect(regionText(one(draft, 'data-prompt-notes', 'brouillon'))).toBe('Notes');
  });

  it('les images du décryptage ne gardent pas de src relative', () => {
    const html = renderToHtml(
      promptPreview(
        {
          format: 'fiche',
          prompt: 'P',
          body: '![a](./x.png)',
          bodyHtml: '<p><img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;./x.png&#x22;,&#x22;alt&#x22;:&#x22;a&#x22;,&#x22;index&#x22;:0}"></p>',
          images: { './x.png': 'blob:https://example.test/1' },
        },
        treeH,
      ),
    );
    const images = findAll(parseHtml(html), (el) => el.tag === 'img');
    expect(images.map((el) => el.attrs)).toEqual([{ src: 'blob:https://example.test/1', alt: 'a' }]);
  });
});
