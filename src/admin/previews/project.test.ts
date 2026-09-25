import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CodeWindow from '../../components/project/CodeWindow.astro';
import ProjectAside from '../../components/project/ProjectAside.astro';
import ProjectHeader from '../../components/project/ProjectHeader.astro';
import StackTiles from '../../components/project/StackTiles.astro';
import { codeWindowLines, codeWindowText } from '../../lib/codeWindow';
import { projectMetaRows, stackTiles, type StackRole } from '../../lib/projectDetail';
import type { ProjectStatus } from '../../lib/projectStatus';
import { diskEntries } from './diskEntries';
import {
  findAll,
  hasAttr,
  parseHtml,
  regionText,
  textContent,
  treeH,
  treeNodes,
  type HtmlElement,
  type HtmlNode,
} from './html';
import { projectPreview, type ProjectPreviewData } from './project';

/**
 * Aperçu des projets (plan 21, R5) : en-tête, carte méta, prose, fenêtre de
 * code et tuiles de stack de la fiche, pour chaque projet présent sur le
 * disque (D131 : aucune valeur figée). Les attentes viennent des fonctions du
 * site (src/lib/) et de ses composants (rendus par le conteneur d'Astro).
 */
const projects = await diskEntries('projects');

interface SiteView {
  rows: ReturnType<typeof projectMetaRows>;
  tiles: ReturnType<typeof stackTiles>;
  snippet?: string;
  file?: string;
  hasBody: boolean;
}

/** Ce que la fiche calcule, à partir des champs tels que le schéma les donne. */
function siteView(data: Record<string, unknown>): SiteView {
  const fields = data as {
    status?: ProjectStatus;
    startDate?: string;
    license?: string;
    stack?: string[];
    stackRoles?: StackRole[];
    snippet?: string;
    snippetFile?: string;
    body: string;
  };
  return {
    rows: projectMetaRows({
      status: fields.status ?? 'actif',
      startDate: fields.startDate ? new Date(fields.startDate) : undefined,
      license: fields.license,
    }),
    tiles: stackTiles(fields.stack ?? [], fields.stackRoles),
    snippet: fields.snippet?.trim() ? fields.snippet : undefined,
    file: fields.snippetFile,
    hasBody: fields.body.trim() !== '',
  };
}

const one = (nodes: readonly HtmlNode[], name: string, label: string): HtmlElement => {
  const found = findAll(nodes, hasAttr(name));
  expect(found, `${label} : [${name}]`).toHaveLength(1);
  return found[0];
};

const classOf = (el: HtmlElement) => el.attrs.class ?? '';
const tags = (nodes: readonly HtmlNode[]) => findAll(nodes, () => true).map((el) => `${el.tag}.${classOf(el)}`);

describe('aperçu des projets : la carte principale de la fiche', () => {
  it('lit des projets réels sur le disque', () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it('en-tête statut/dates, prose, fenêtre de code numérotée et tuiles de stack', () => {
    let windows = 0;
    let roles = 0;
    let logos = 0;
    let monograms = 0;
    for (const { name, data } of projects) {
      const fields = data as typeof data & ProjectPreviewData;
      const site = siteView(data);
      const nodes = treeNodes(projectPreview(fields, treeH));
      const [root] = findAll(nodes, hasAttr('data-preview', 'projects'));
      expect(root, name).toBeDefined();

      // En-tête : titre et description, sans lien de retour.
      const header = one(nodes, 'data-project-header', name);
      expect(regionText(header), name).toBe(`${fields.title} ${fields.description}`);
      expect(findAll([header], hasAttr('data-project-back')), name).toHaveLength(0);

      // Carte méta : les lignes de projectMetaRows (libellé, valeur, puce).
      const meta = one(nodes, 'data-project-meta', name);
      const dts = findAll([meta], (el) => el.tag === 'dt').map((el) => textContent(el));
      const dds = findAll([meta], (el) => el.tag === 'dd').map((el) => textContent(el));
      expect(dts, name).toEqual(site.rows.map((row) => row.label));
      expect(dds, name).toEqual(site.rows.map((row) => row.value));
      expect(dts, name).toContain('statut');
      if (fields.startDate) expect(dts, name).toContain('depuis');
      const chips = findAll([meta], (el) => classOf(el).split(' ').includes('pill'));
      expect(chips.map(classOf), name).toEqual(
        site.rows
          .filter((row) => row.chipClass)
          .map((row) => `pill inline-block border px-[11px] py-[5px] text-[11px] leading-none ${row.chipClass}`),
      );

      // Prose = le corps rendu par le pipeline du site.
      const prose = findAll(nodes, (el) => classOf(el) === 'prose');
      expect(prose.length, name).toBe(site.hasBody ? 1 : 0);

      // Fenêtre de code : gouttière 1…N, texte codeWindowText, segments colorés.
      const code = findAll(nodes, hasAttr('data-code-window'));
      expect(code.length, name).toBe(site.snippet ? 1 : 0);
      if (site.snippet) {
        windows += 1;
        const lines = codeWindowLines(site.snippet, site.file);
        expect(textContent(one(code, 'data-code-gutter', name)), name).toBe(
          lines.map((_, index) => index + 1).join('\n'),
        );
        const codeEl = findAll(code, (el) => el.tag === 'code');
        expect(codeEl, name).toHaveLength(1);
        expect(textContent(codeEl[0]), name).toBe(codeWindowText(site.snippet));
        for (const kind of ['key', 'value'] as const) {
          const expected = lines.flatMap((line) =>
            line.segments.filter((segment) => segment.kind === kind).map((segment) => segment.text),
          );
          const spans = findAll(code, hasAttr(`data-code-${kind}`)).map((el) => textContent(el));
          expect(spans, `${name} ${kind}`).toEqual(expected);
        }
        const chip = findAll(code, hasAttr('data-code-file')).map((el) => textContent(el));
        expect(chip, name).toEqual(site.file ? [site.file] : []);
      }

      // Tuiles : stackTiles(stack, stackRoles) — nom, rôle, logo ou monogramme.
      const tiles = findAll(nodes, hasAttr('data-stack-tile'));
      expect(tiles.length, name).toBe(site.tiles.length);
      if (site.tiles.length) {
        expect(textContent(one(nodes, 'data-panel-label', name)), name).toBe('// ce qui fait tourner le projet');
        expect(findAll(nodes, hasAttr('aria-label', 'Technologies')), name).toHaveLength(1);
      }
      site.tiles.forEach((tile, index) => {
        const el = tiles[index];
        const label = `${name} ${tile.name}`;
        expect(textContent(one([el], 'data-stack-name', label)), label).toBe(tile.name);
        const role = findAll([el], hasAttr('data-stack-role')).map((r) => textContent(r));
        expect(role, label).toEqual(tile.role ? [tile.role] : []);
        if (tile.role) roles += 1;
        const paths = findAll([el], (p) => p.tag === 'path').map((p) => p.attrs.d);
        const mono = findAll([el], hasAttr('data-monogram')).map((m) => textContent(m));
        if (tile.logo) {
          logos += 1;
          expect(paths, label).toEqual([tile.logo.path]);
          expect(mono, label).toEqual([]);
        } else {
          monograms += 1;
          expect(paths, label).toEqual([]);
          expect(mono, label).toEqual([tile.monogram]);
        }
      });

      // Ordre de la fiche : en-tête, méta, prose, fenêtre, tuiles.
      const order = findAll(
        nodes,
        (el) =>
          Object.hasOwn(el.attrs, 'data-project-header') ||
          Object.hasOwn(el.attrs, 'data-project-meta') ||
          classOf(el) === 'prose' ||
          Object.hasOwn(el.attrs, 'data-code-window') ||
          Object.hasOwn(el.attrs, 'data-panel-label'),
      ).map((el) =>
        classOf(el) === 'prose'
          ? 'prose'
          : ['data-project-header', 'data-project-meta', 'data-code-window', 'data-panel-label'].find((hook) =>
              Object.hasOwn(el.attrs, hook),
            ),
      );
      expect(order, name).toEqual([
        'data-project-header',
        'data-project-meta',
        ...(site.hasBody ? ['prose'] : []),
        ...(site.snippet ? ['data-code-window'] : []),
        ...(site.tiles.length ? ['data-panel-label'] : []),
      ]);
    }
    // Le contenu réel exerce la fenêtre, les rôles, les logos et les monogrammes.
    expect(windows).toBeGreaterThan(0);
    expect(roles).toBeGreaterThan(0);
    expect(logos).toBeGreaterThan(0);
    expect(monograms).toBeGreaterThan(0);
  });

  it('en-tête, méta, fenêtre et tuiles = composants du site (même texte, mêmes classes)', async () => {
    const container = await AstroContainer.create();
    const render = async (component: Parameters<typeof container.renderToString>[0], props: Record<string, unknown>) =>
      parseHtml(await container.renderToString(component, { props }));
    for (const { name, data } of projects) {
      const fields = data as typeof data & ProjectPreviewData;
      const site = siteView(data);
      const preview = treeNodes(projectPreview(fields, treeH));

      // En-tête (moins le lien de retour).
      const pageHeader = await render(ProjectHeader, { title: fields.title, description: fields.description });
      const a = one(preview, 'data-project-header', name);
      const b = one(pageHeader, 'data-project-header', `${name} (page)`);
      b.children = b.children.filter(
        (child) => typeof child === 'string' || !Object.hasOwn(child.attrs, 'data-project-back'),
      );
      expect(regionText(a), name).toBe(regionText(b));
      expect(tags([a]), name).toEqual(tags([b]));

      // Carte méta : son <dl>.
      const pageAside = await render(ProjectAside, { rows: site.rows, posts: [] });
      const metaA = one(preview, 'data-project-meta', name);
      const metaB = one(pageAside, 'data-project-meta', `${name} (page)`);
      expect(classOf(metaA), name).toBe(classOf(metaB));
      expect(metaA.attrs.style?.replace(/\s/g, ''), name).toBe(metaB.attrs.style?.replace(/[\s;]/g, ''));
      const dlA = findAll([metaA], (el) => el.tag === 'dl');
      const dlB = findAll([metaB], (el) => el.tag === 'dl');
      expect(regionText(dlA), name).toBe(regionText(dlB));
      expect(tags(dlA), name).toEqual(tags(dlB));

      // Fenêtre de code (moins le bouton Copier, caché sur la page).
      if (site.snippet) {
        const pageCode = await render(CodeWindow, { snippet: site.snippet, file: site.file });
        const codeA = one(preview, 'data-code-window', name);
        const codeB = one(pageCode, 'data-code-window', `${name} (page)`);
        expect(regionText(codeA), name).toBe(regionText(codeB));
        const notButton = (nodes: readonly HtmlNode[]) => tags(nodes).filter((tag) => !tag.startsWith('button.'));
        expect(notButton([codeA]), name).toEqual(notButton([codeB]));
        // Le crochet racine : sa classe ; son texte est comparé plus haut (R8,
        // bouton caché exclu). Les autres : classe et texte exact.
        expect(classOf(codeA), name).toBe(classOf(codeB));
        for (const hook of [
          'data-code-gutter',
          'data-code-key',
          'data-code-value',
          'data-code-file',
        ]) {
          expect(
            findAll([codeA], hasAttr(hook)).map((el) => [classOf(el), textContent(el)]),
            `${name} [${hook}]`,
          ).toEqual(findAll([codeB], hasAttr(hook)).map((el) => [classOf(el), textContent(el)]));
        }
        expect(codeA.attrs['aria-label'], name).toBe(codeB.attrs['aria-label']);
        expect(codeA.attrs['data-code-lang'], name).toBe(codeB.attrs['data-code-lang']);
        expect(textContent(findAll([codeA], (el) => el.tag === 'pre')[0]), name).toBe(
          textContent(findAll([codeB], (el) => el.tag === 'pre')[0]),
        );
      }

      // Tuiles : le libellé et la liste.
      if (site.tiles.length) {
        const pageTiles = await render(StackTiles, { tiles: site.tiles });
        const label = one(preview, 'data-panel-label', name);
        const labelB = one(pageTiles, 'data-panel-label', `${name} (page)`);
        expect([classOf(label), textContent(label)], name).toEqual([classOf(labelB), textContent(labelB)]);
        const ulA = findAll(preview, hasAttr('aria-label', 'Technologies'));
        const ulB = findAll(pageTiles, hasAttr('aria-label', 'Technologies'));
        expect(regionText(ulA), name).toBe(regionText(ulB));
        expect(tags(ulA), name).toEqual(tags(ulB));
        for (const hook of ['data-stack-tile', 'data-stack-name', 'data-stack-role', 'data-monogram']) {
          expect(
            findAll(ulA, hasAttr(hook)).map((el) => [classOf(el), textContent(el)]),
            `${name} [${hook}]`,
          ).toEqual(findAll(ulB, hasAttr(hook)).map((el) => [classOf(el), textContent(el)]));
        }
      }
    }
  });

  it('entrée neuve ou vide : en-tête et statut actif, sections omises', () => {
    const nodes = treeNodes(projectPreview({}, treeH));
    expect(regionText(one(nodes, 'data-project-header', 'vide'))).toBe('');
    expect(regionText(one(nodes, 'data-project-meta', 'vide'))).toBe('statut actif');
    for (const hook of ['data-code-window', 'data-stack-tile', 'data-panel-label']) {
      expect(findAll(nodes, hasAttr(hook)), hook).toHaveLength(0);
    }
    expect(findAll(nodes, (el) => classOf(el) === 'prose')).toHaveLength(0);

    // Saisie en cours : date invalide omise, stack et rôles incomplets tolérés,
    // extrait blanc omis.
    const draft = treeNodes(
      projectPreview(
        {
          status: 'wip',
          startDate: '2026-0',
          license: ' MIT ',
          stack: ['Astro', null, 'Mon Outil'],
          stackRoles: [null, { name: 'Astro' }, { name: 'Mon Outil', role: 'fait tout' }],
          snippet: '  \n',
        },
        treeH,
      ),
    );
    expect(regionText(one(draft, 'data-project-meta', 'brouillon'))).toBe('statut wip licence MIT');
    expect(findAll(draft, hasAttr('data-stack-name')).map((el) => textContent(el))).toEqual(['Astro', 'Mon Outil']);
    expect(findAll(draft, hasAttr('data-stack-role')).map((el) => textContent(el))).toEqual(['fait tout']);
    expect(findAll(draft, hasAttr('data-monogram')).map((el) => textContent(el))).toEqual(['MO']);
    expect(findAll(draft, hasAttr('data-code-window'))).toHaveLength(0);

    // `depuis` : mois lu en UTC, comme la fiche.
    const dated = treeNodes(projectPreview({ startDate: '2026-07-01' }, treeH));
    expect(regionText(one(dated, 'data-project-meta', 'daté'))).toBe('statut actif depuis juillet 2026');
  });
});
