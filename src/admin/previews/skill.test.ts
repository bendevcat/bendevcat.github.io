import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import FileExplorer from '../../components/skill/FileExplorer.astro';
import InstallWindow from '../../components/skill/InstallWindow.astro';
import SkillHighlights from '../../components/skill/SkillHighlights.astro';
import SkillNotes from '../../components/skill/SkillNotes.astro';
import SkillTriggers from '../../components/skill/SkillTriggers.astro';
import { installSteps, toolLabel } from '../../lib/skillDetail';
import { defaultFile, explorerLines, previewRange } from '../../lib/skillExplorer';
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
import { resolveBodyImages } from './images';
import { skillPreview, type SkillPreviewData } from './skill';

/**
 * Aperçu des skills (plan 21, R6) : fenêtre d'installation, « Ce que fait ce
 * skill », déclencheurs, premier fichier de l'explorateur et « En détail »,
 * pour chaque skill présent sur le disque (D131 : aucune valeur figée). Les
 * attentes viennent des fonctions du site (src/lib/) et de ses composants
 * (rendus par le conteneur d'Astro).
 */
const skills = await diskEntries('skills');

interface SkillFile {
  path: string;
  lines: number;
  excerpt: string;
}

interface SiteView {
  installCmd?: string;
  steps: string[];
  tool: string;
  note?: string;
  highlights: string[];
  triggers: string[];
  files: SkillFile[];
  /** Le fichier sur lequel la fiche s'ouvre (defaultFile). */
  file?: SkillFile;
  hasBody: boolean;
}

/** Ce que la fiche calcule, à partir des champs tels que le schéma les donne. */
function siteView(data: Record<string, unknown>): SiteView {
  const fields = data as {
    name?: string;
    type?: string;
    installCmd?: string;
    installNote?: string;
    highlights?: string[];
    triggers?: string[];
    files?: SkillFile[];
    body: string;
  };
  const files = fields.files ?? [];
  const selected = defaultFile(
    files.map((file) => file.path),
    fields.name,
  );
  return {
    installCmd: fields.installCmd,
    steps: installSteps(fields.installCmd),
    tool: toolLabel(fields.type ?? 'claude-code'),
    note: fields.installNote,
    highlights: fields.highlights ?? [],
    triggers: fields.triggers ?? [],
    files,
    file: files.find((file) => file.path === selected),
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
const texts = (nodes: readonly HtmlNode[], hook: string) => findAll(nodes, hasAttr(hook)).map((el) => textContent(el));

/** Les régions de la fiche, dans l'ordre du document. */
const REGIONS = [
  'data-install-window',
  'data-skill-highlights',
  'data-skill-triggers',
  'data-explorer-preview',
  'data-skill-notes',
] as const;

describe('aperçu des skills : la colonne de la fiche', () => {
  it('lit des skills réels sur le disque', () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it('installation, points, déclencheurs, premier fichier et corps', () => {
    let installs = 0;
    let notes = 0;
    let notFirst = 0;
    let bodies = 0;
    for (const { name, data } of skills) {
      const fields = data as typeof data & SkillPreviewData;
      const site = siteView(data);
      const html = renderToHtml(skillPreview(fields, treeH));
      const nodes = parseHtml(html);
      expect(findAll(nodes, hasAttr('data-preview', 'skills')), name).toHaveLength(1);
      // Rien de caché, aucun bouton : la colonne statique de la fiche.
      expect(findAll(nodes, (el) => el.tag === 'button' || Object.hasOwn(el.attrs, 'hidden')), name).toEqual([]);

      // Fenêtre d'installation : `installation · <outil>`, étapes, note.
      const install = findAll(nodes, hasAttr('data-install-window'));
      expect(install.length, name).toBe(site.installCmd && site.steps.length > 0 ? 1 : 0);
      if (install.length) {
        installs += 1;
        expect(regionText(one(install, 'data-install-title', name)), name).toBe(`installation · ${site.tool}`);
        const steps = findAll(install, hasAttr('data-install-step'));
        expect(
          steps.map((step) => regionText(step)),
          name,
        ).toEqual(site.steps.map((step, index) => `${index + 1}. ${step}`));
        expect(texts(install, 'data-install-note'), name).toEqual(site.note ? [site.note] : []);
        if (site.note) notes += 1;
      }

      // « Ce que fait ce skill » + les points.
      const highlights = findAll(nodes, hasAttr('data-skill-highlights'));
      expect(highlights.length, name).toBe(site.highlights.length > 0 ? 1 : 0);
      if (highlights.length) {
        expect(textContent(findAll(highlights, (el) => el.tag === 'h2')[0]), name).toBe('Ce que fait ce skill');
        expect(
          texts(highlights, 'data-highlight').map((text) => text.trim()),
          name,
        ).toEqual(site.highlights);
      }

      // « Quand il se déclenche » + intro + « déclencheur ».
      const triggers = findAll(nodes, hasAttr('data-skill-triggers'));
      expect(triggers.length, name).toBe(site.triggers.length > 0 ? 1 : 0);
      if (triggers.length) {
        expect(
          findAll(triggers, (el) => el.tag === 'p').map((el) => textContent(el)),
          name,
        ).toEqual(['Quand il se déclenche', 'Cité de la documentation du plugin.']);
        expect(texts(triggers, 'data-trigger'), name).toEqual(site.triggers);
        expect(
          findAll(triggers, (el) => el.tag === 'li').map((el) => textContent(el)),
          name,
        ).toEqual(site.triggers.map((trigger) => `« ${trigger} »`));
      }

      // Premier fichier = celui sur lequel la fiche s'ouvre (defaultFile) :
      // chemin, previewRange, extrait exact, tons d'explorerLines.
      const preview = findAll(nodes, hasAttr('data-explorer-preview'));
      expect(preview.length, name).toBe(site.file ? 1 : 0);
      if (site.file) {
        if (site.file.path !== site.files[0].path) notFirst += 1;
        expect(preview[0].attrs['data-explorer-preview'], name).toBe(site.file.path);
        expect(texts(preview, 'data-explorer-path'), name).toEqual([site.file.path]);
        expect(regionText(one(preview, 'data-explorer-range', name)), name).toBe(
          `· ${previewRange(site.file.excerpt, site.file.lines)}`,
        );
        const code = findAll(preview, (el) => el.tag === 'code');
        expect(code, name).toHaveLength(1);
        expect(textContent(code[0]), name).toBe(site.file.excerpt);
        const tones = explorerLines(site.file.excerpt, site.file.path).flatMap((line) =>
          line.segments.filter((segment) => segment.kind !== 'plain').map((segment) => [segment.kind, segment.text]),
        );
        expect(
          findAll(code, hasAttr('data-explorer-tone')).map((el) => [el.attrs['data-explorer-tone'], textContent(el)]),
          name,
        ).toEqual(tones);
      }

      // « En détail » + le corps rendu par le pipeline du site.
      const body = findAll(nodes, hasAttr('data-skill-notes'));
      expect(body.length, name).toBe(site.hasBody ? 1 : 0);
      if (body.length) {
        bodies += 1;
        expect(textContent(findAll(body, (el) => el.tag === 'h2')[0]), name).toBe('En détail');
        expect(html, name).toContain(
          `<div class="prose mt-4 [&amp;&gt;:first-child]:mt-0!">${resolveBodyImages(fields.bodyHtml!, {})}</div>`,
        );
      }

      // Ordre : installation, points, déclencheurs, premier fichier, corps.
      const order = findAll(nodes, (el) => REGIONS.some((hook) => Object.hasOwn(el.attrs, hook))).map((el) =>
        REGIONS.find((hook) => Object.hasOwn(el.attrs, hook)),
      );
      expect(order, name).toEqual(
        REGIONS.filter(
          (hook) =>
            ({
              'data-install-window': install.length > 0,
              'data-skill-highlights': site.highlights.length > 0,
              'data-skill-triggers': site.triggers.length > 0,
              'data-explorer-preview': Boolean(site.file),
              'data-skill-notes': site.hasBody,
            })[hook],
        ),
      );
    }
    // Le contenu réel exerce chaque section, et un premier fichier qui n'est
    // pas `files[0]` (sinon defaultFile ne serait pas prouvé).
    expect(installs).toBeGreaterThan(0);
    expect(notes).toBeGreaterThan(0);
    expect(notFirst).toBeGreaterThan(0);
    expect(bodies).toBeGreaterThan(0);
  });

  it('installation, points, déclencheurs, fichier et corps = composants du site (même texte, mêmes classes)', async () => {
    const container = await AstroContainer.create();
    const render = async (
      component: Parameters<typeof container.renderToString>[0],
      props: Record<string, unknown>,
      slots?: Record<string, string>,
    ) => parseHtml(await container.renderToString(component, { props, slots }));
    const same = (a: HtmlElement, b: HtmlElement, hooks: readonly string[], label: string) => {
      expect(regionText(a), label).toBe(regionText(b));
      // Le bouton (caché sur la page jusqu'au script) n'est pas rendu.
      const notButton = (nodes: readonly HtmlNode[]) => tags(nodes).filter((tag) => !tag.startsWith('button.'));
      expect(notButton([a]), label).toEqual(notButton([b]));
      for (const hook of hooks) {
        expect(
          findAll([a], hasAttr(hook)).map((el) => [classOf(el), el.attrs.lang, regionText(el)]),
          `${label} [${hook}]`,
        ).toEqual(findAll([b], hasAttr(hook)).map((el) => [classOf(el), el.attrs.lang, regionText(el)]));
      }
    };

    for (const { name, data } of skills) {
      const fields = data as typeof data & SkillPreviewData;
      const site = siteView(data);
      const preview = treeNodes(skillPreview(fields, treeH));

      if (site.installCmd && site.steps.length > 0) {
        const page = await render(InstallWindow, {
          installCmd: site.installCmd,
          steps: site.steps,
          tool: site.tool,
          note: site.note,
        });
        const a = one(preview, 'data-install-window', name);
        const b = one(page, 'data-install-window', `${name} (page)`);
        same(a, b, ['data-install-window', 'data-install-title', 'data-install-step', 'data-install-note'], name);
        expect(a.attrs['aria-label'], name).toBe(b.attrs['aria-label']);
      }

      if (site.highlights.length) {
        const page = await render(SkillHighlights, { highlights: site.highlights });
        const a = one(preview, 'data-skill-highlights', name);
        const b = one(page, 'data-skill-highlights', `${name} (page)`);
        same(a, b, ['data-skill-highlights', 'data-highlight'], name);
        expect(a.attrs.style?.replace(/[\s;]/g, ''), name).toBe(b.attrs.style?.replace(/[\s;]/g, ''));
        // Les tracés de l'icône `check` et ses attributs de trait.
        const svgA = findAll([a], (el) => el.tag === 'svg');
        const svgB = findAll([b], (el) => el.tag === 'svg');
        expect(
          svgA.map((el) => [el.attrs.width, el.attrs.viewbox, el.attrs.fill, el.attrs.stroke]),
          name,
        ).toEqual(svgB.map((el) => [el.attrs.width, el.attrs.viewbox, el.attrs.fill, el.attrs.stroke]));
        expect(
          findAll([a], (el) => el.tag === 'path').map((el) => el.attrs.d),
          name,
        ).toEqual(findAll([b], (el) => el.tag === 'path').map((el) => el.attrs.d));
      }

      if (site.triggers.length) {
        const page = await render(SkillTriggers, { triggers: site.triggers });
        const a = one(preview, 'data-skill-triggers', name);
        const b = one(page, 'data-skill-triggers', `${name} (page)`);
        same(a, b, ['data-skill-triggers', 'data-trigger'], name);
        expect(
          findAll([a], (el) => el.tag === 'li').map((el) => textContent(el)),
          name,
        ).toEqual(findAll([b], (el) => el.tag === 'li').map((el) => textContent(el).trim()));
      }

      if (site.file) {
        const page = await render(FileExplorer, {
          files: site.files,
          source: (data as { filesSource?: string }).filesSource,
          name: (data as { name?: string }).name,
        });
        const a = one(preview, 'data-explorer-preview', name);
        const shown = findAll(page, hasAttr('data-explorer-preview')).filter(
          (el) => !Object.hasOwn(el.attrs, 'hidden'),
        );
        expect(shown, `${name} (page)`).toHaveLength(1);
        const b = shown[0];
        expect(a.attrs['data-explorer-preview'], name).toBe(b.attrs['data-explorer-preview']);
        expect(a.attrs.id, name).toBe(b.attrs.id);
        same(a, b, ['data-explorer-path', 'data-explorer-range', 'data-explorer-tone'], name);
        expect(textContent(findAll([a], (el) => el.tag === 'pre')[0]), name).toBe(
          textContent(findAll([b], (el) => el.tag === 'pre')[0]),
        );
        // Le cadre de la fenêtre : celui de l'explorateur, sans sa grille.
        const [frameB] = findAll(page, hasAttr('data-skill-explorer'));
        const frameA = findAll(preview, (el) => el.tag === 'figure' && findAll([el], hasAttr('data-explorer-preview')).length > 0);
        expect(frameA, name).toHaveLength(1);
        for (const cls of classOf(frameA[0]).split(' ')) expect(classOf(frameB).split(' '), `${name} ${cls}`).toContain(cls);
      }

      if (site.hasBody) {
        const page = await render(SkillNotes, {}, { default: resolveBodyImages(fields.bodyHtml, {}) });
        const a = one(preview, 'data-skill-notes', name);
        const b = one(page, 'data-skill-notes', `${name} (page)`);
        same(a, b, ['data-skill-notes'], name);
      }
    }
  });

  it('entrée neuve ou vide : aucune section ; saisie en cours tolérée', () => {
    const empty = treeNodes(skillPreview({}, treeH));
    const [root] = findAll(empty, hasAttr('data-preview', 'skills'));
    expect(root).toBeDefined();
    expect(root.children).toEqual([]);

    // Commande faite de `&&` seuls, listes à trous, fichiers sans chemin ou
    // sans extrait, corps blanc : les sections vides sont omises comme sur la
    // fiche, le reste s'affiche.
    const draft = treeNodes(
      skillPreview(
        {
          installCmd: ' && ',
          highlights: ['un point', null, ''],
          triggers: [null],
          files: [null, { path: null, excerpt: 'x' }, { path: 'notes.md', excerpt: null, lines: null }],
          body: '  \n',
          bodyHtml: '',
        },
        treeH,
      ),
    );
    expect(findAll(draft, hasAttr('data-install-window'))).toHaveLength(0);
    expect(texts(draft, 'data-highlight').map((text) => text.trim())).toEqual(['un point']);
    expect(findAll(draft, hasAttr('data-skill-triggers'))).toHaveLength(0);
    expect(findAll(draft, hasAttr('data-explorer-preview')).map((el) => el.attrs['data-explorer-preview'])).toEqual([
      'notes.md',
    ]);
    expect(regionText(one(draft, 'data-explorer-range', 'brouillon'))).toBe('· 0 l.');
    expect(findAll(draft, hasAttr('data-skill-notes'))).toHaveLength(0);

    // Type libre, note seule : `installation · <type>` et la note.
    const typed = treeNodes(
      skillPreview({ type: 'howto', installCmd: 'a && b', installNote: 'une note' }, treeH),
    );
    expect(regionText(one(typed, 'data-install-title', 'type'))).toBe('installation · howto');
    expect(texts(typed, 'data-install-note')).toEqual(['une note']);
    // Sans type : le défaut du schéma, `claude-code`.
    expect(
      regionText(one(treeNodes(skillPreview({ installCmd: 'a' }, treeH)), 'data-install-title', 'défaut')),
    ).toBe('installation · Claude Code');
  });
});
