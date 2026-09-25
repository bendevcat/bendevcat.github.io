// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { parse } from 'yaml';
import { diskEntries, type DiskEntry } from './diskEntries';
import { renderToHtml, treeH, type H } from './html';
import { renderBody } from './markdown';
import {
  PREVIEWS,
  previewComponent,
  registerPreviews,
  type ClassSpec,
  type EntryLike,
  type PreviewProps,
  type RenderBody,
} from './register';
import { createSanitizer, sanitizingH, type Sanitize } from './sanitize';

/**
 * Enregistrement des aperçus dans Sveltia (plan 21, R1). Sveltia 0.221 rend
 * `createElement(composant, props)` dans une racine React de l'iframe ; ses
 * `props.entry` est une Map Immutable, `props.getAsset(chemin)` un
 * `AssetProxy` dont l'`url` passe du chemin relatif à `blob:` une fois le
 * fichier lu. Ici, un faux CMS, une fausse Map, et une mini-exécution de
 * classes `createClass` (état, `setState`, cycle de vie) imitent ce contrat,
 * sans React.
 */
/** Assainisseur de l'aperçu (même configuration), sur une fenêtre jsdom locale. */
const sanitize = createSanitizer(new JSDOM('<!DOCTYPE html>').window) as Sanitize;

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const configCollections = (): string[] =>
  (parse(read('../../../public/admin/config.yml')).collections as Array<{ name: string }>).map((c) => c.name);

/** Faux `createClass` : un constructeur dont le prototype porte la spec. */
function fakeCreateClass(spec: ClassSpec): unknown {
  function Component(this: Record<string, unknown>, props: PreviewProps) {
    this.props = props;
  }
  Object.assign(Component.prototype, spec);
  return Component;
}

interface Mounted {
  readonly tree: unknown;
  readonly renders: number;
  update(props: PreviewProps): void;
  unmount(): void;
}

/** Mini-exécution d'un composant `createClass` : montage, props, setState. */
function mount(Component: unknown, props: PreviewProps): Mounted {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = new (Component as new (p: PreviewProps) => unknown)(props);
  let tree: unknown;
  let renders = 0;
  const render = () => {
    renders += 1;
    tree = instance.render();
  };
  instance.setState = (update: unknown) => {
    const prevProps = instance.props;
    const prevState = instance.state;
    const patch = typeof update === 'function' ? update(instance.state, instance.props) : update;
    instance.state = { ...instance.state, ...patch };
    render();
    instance.componentDidUpdate?.(prevProps, prevState);
  };
  instance.state = instance.getInitialState();
  render();
  instance.componentDidMount?.();
  return {
    get tree() {
      return tree;
    },
    get renders() {
      return renders;
    },
    update(next) {
      const prevProps = instance.props;
      instance.props = next;
      render();
      instance.componentDidUpdate?.(prevProps, instance.state);
    },
    unmount() {
      instance.componentWillUnmount?.();
    },
  };
}

/** Fausse Map Immutable d'entrée : `get('slug')`, `getIn(['data']).toJS()`. */
function fakeEntry(fields: Record<string, unknown>, slug: string): EntryLike {
  return {
    get: (key) => (key === 'slug' ? slug : undefined),
    getIn: (path) => (path.length === 1 && path[0] === 'data' ? { toJS: () => structuredClone(fields) } : undefined),
  };
}

/** Champs d'une entrée disque tels que les voit le CMS (sans les ajouts du gabarit). */
function cmsFields(entry: DiskEntry): Record<string, unknown> {
  const { id: _id, bodyHtml: _html, images: _images, ...fields } = entry.data;
  return fields;
}

const flush = async (rounds = 5) => {
  for (let i = 0; i < rounds; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** `renderBody` pilotable : chaque appel attend qu'on le résolve. */
function deferredRenderer() {
  const calls: Array<{ md: string; resolve: (html: string) => void }> = [];
  const render: RenderBody = (md) => new Promise((resolve) => calls.push({ md, resolve }));
  return { calls, render };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aperçus /admin/ : enregistrement dans Sveltia', () => {
  it('enregistre un gabarit d’aperçu pour chaque collection de config.yml, avant init()', () => {
    const registered: Array<[string, unknown]> = [];
    const cms = { registerPreviewTemplate: (name: string, component: unknown) => registered.push([name, component]) };
    const loader = vi.fn(async () => renderBody);

    expect(registerPreviews(cms, { h: treeH, createClass: fakeCreateClass }, loader, sanitize)).toBe(true);

    const names = registered.map(([name]) => name);
    expect([...names].sort()).toEqual([...configCollections()].sort());
    expect(new Set(names).size).toBe(names.length);
    // Sveltia exige une fonction (`typeof component === 'function'`).
    for (const [name, component] of registered) expect(typeof component, name).toBe('function');
    // Enregistrer ne charge pas le pipeline Markdown.
    expect(loader).not.toHaveBeenCalled();

    // cms.ts : enregistrement après le style d'aperçu, avant tout CMS.init().
    const cms_ts = read('../cms.ts');
    expect(cms_ts).toMatch(/^import \{ registerPreviews \} from '\.\/previews\/register';$/m);
    const call = cms_ts.indexOf('registerPreviews(CMS');
    expect(call).toBeGreaterThan(cms_ts.indexOf('registerSiteStyle(CMS'));
    const inits = [...cms_ts.matchAll(/CMS\.init\(/g)].map((m) => m.index ?? -1);
    expect(inits.length).toBeGreaterThan(0);
    for (const index of inits) expect(index).toBeGreaterThan(call);
  });

  it('rend le gabarit de la collection avec les données Immutable de l’entrée et window.h', async () => {
    const entries = await diskEntries();
    for (const [collection, preview] of Object.entries(PREVIEWS)) {
      const entry = entries.find((e) => e.collection === collection && e.data.body.trim() !== '');
      expect(entry, collection).toBeDefined();
      if (!entry) continue;
      const h = vi.fn(treeH) as unknown as H;
      const component = previewComponent(collection, preview, {
        h,
        createClass: fakeCreateClass,
        sanitize,
        loadRenderBody: async () => renderBody,
      });
      // Aucun asset connu : les images restent sans src.
      const view = mount(component, { entry: fakeEntry(cmsFields(entry), entry.id), getAsset: () => undefined });
      await flush(20);

      // Le HTML injecté passe par l'assainisseur (sanitizingH) ; F1.
      const expected = preview.template(
        { ...cmsFields(entry), id: entry.id, bodyHtml: entry.data.bodyHtml, images: {} },
        sanitizingH(treeH, sanitize),
      );
      expect(view.tree, entry.name).toEqual(expected);
      expect(h, entry.name).toHaveBeenCalled();
      expect((view.tree as { props: Record<string, unknown> }).props['data-preview']).toBe(collection);
      view.unmount();
    }
  });

  it('suit les frappes : le dernier corps demandé gagne, un rendu dépassé est ignoré, sans boucle', async () => {
    const { calls, render } = deferredRenderer();
    const component = previewComponent('prompts', PREVIEWS.prompts, {
      h: treeH,
      createClass: fakeCreateClass,
      sanitize,
      loadRenderBody: async () => render,
    });
    const props = (body: string, title = 'T'): PreviewProps => ({
      entry: fakeEntry({ title, format: 'fiche', prompt: 'x', body }, 'essai'),
      getAsset: () => undefined,
    });
    const view = mount(component, props('un'));
    await flush();
    view.update(props('deux'));
    await flush();
    view.update(props('trois'));
    await flush();
    // Un champ autre que le corps ne relance pas de rendu du corps.
    view.update(props('trois', 'Autre titre'));
    await flush();
    expect(calls.map((c) => c.md)).toEqual(['un', 'deux', 'trois']);

    calls[2].resolve('<p>trois</p>');
    await flush();
    calls[0].resolve('<p>un</p>');
    calls[1].resolve('<p>deux</p>');
    await flush();
    const html = renderToHtml(view.tree);
    expect(html).toContain('<p>trois</p>');
    expect(html).not.toContain('<p>un</p>');
    expect(html).not.toContain('<p>deux</p>');
    // Les setState ne relancent pas de rendu du corps.
    expect(calls).toHaveLength(3);
    const renders = view.renders;
    await flush();
    expect(view.renders).toBe(renders);
  });

  it('ne pose une src d’image qu’une fois l’URL blob: obtenue (getAsset puis toBase64)', async () => {
    const read = new Set<string>();
    const release: Array<() => void> = [];
    const getAsset = vi.fn((path: string) => ({
      // Comme AssetProxy : chemin relatif tant que le fichier n'est pas lu.
      url: read.has(path) ? `blob:http://localhost/${encodeURIComponent(path)}` : path,
      toBase64: () =>
        new Promise<string>((resolve) =>
          release.push(() => {
            read.add(path);
            resolve('AAAA');
          }),
        ),
    }));
    const component = previewComponent('blog', PREVIEWS.blog, {
      h: treeH,
      createClass: fakeCreateClass,
      sanitize,
      loadRenderBody: async () => renderBody,
    });
    const body = 'Texte.\n\n![Capture](./screenshot-1.png)\n';
    const view = mount(component, {
      entry: fakeEntry({ title: 'A', description: 'Chapô', cover: './cover.png', coverAlt: 'Couv', body }, 'a'),
      getAsset,
    });
    await flush(20);

    // Avant lecture : les <img> existent, sans src — aucune requête relative.
    let html = renderToHtml(view.tree);
    expect(html.match(/<img\b/g)).toHaveLength(2);
    expect(html).not.toMatch(/\bsrc="(?!blob:)/);
    expect(getAsset.mock.calls.map(([path]) => path).sort()).toEqual(['./cover.png', './screenshot-1.png']);

    for (const done of release.splice(0)) done();
    await flush(20);
    html = renderToHtml(view.tree);
    expect(html).toContain('src="blob:http://localhost/.%2Fcover.png"');
    expect(html).toContain('src="blob:http://localhost/.%2Fscreenshot-1.png"');
    expect(html).not.toMatch(/\bsrc="(?!blob:)/);
    // Résolues une fois : pas de nouvelle lecture ensuite.
    view.update({ entry: fakeEntry({ title: 'B', cover: './cover.png', body }, 'a'), getAsset });
    await flush(20);
    expect(release).toHaveLength(0);
  });

  it('sans window.h ni window.createClass : console.error, rien d’enregistré (aperçu par défaut)', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registered: string[] = [];
    const cms = { registerPreviewTemplate: (name: string) => registered.push(name) };
    expect(registerPreviews(cms, {})).toBe(false);
    expect(registerPreviews(cms, { h: treeH })).toBe(false);
    expect(registerPreviews(cms, { createClass: fakeCreateClass })).toBe(false);
    expect(registered).toEqual([]);
    expect(error).toHaveBeenCalledTimes(3);
  });

  it('sans DOM pour l’assainisseur : console.error, rien d’enregistré (aperçu assaini de Sveltia)', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registered: string[] = [];
    const cms = { registerPreviewTemplate: (name: string) => registered.push(name) };
    // Portée sans `document` : DOMPurify ne peut pas y travailler.
    expect(registerPreviews(cms, { h: treeH, createClass: fakeCreateClass })).toBe(false);
    expect(registered).toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('assainit le corps injecté de chaque collection : <img onerror>, <svg onload>, javascript: inertes', async () => {
    const body = [
      'Texte.',
      '',
      '<img src="https://example.com/x.png" onerror="alert(1)">',
      '',
      '<svg onload="alert(2)"><circle r="1"/></svg>',
      '',
      '<a href="javascript:alert(3)">lien</a> <iframe src="https://evil.example/"></iframe>',
      '',
      '<script>alert(4)</script><style>@import "https://evil.example/x.css";</style>',
      '',
      '<math><mi xlink:href="javascript:alert(5)">x</mi></math>',
      '',
      '<form><button formaction="javascript:alert(6)">ok</button></form>',
      '',
    ].join('\n');
    const fields: Record<string, Record<string, unknown>> = {
      blog: { title: 'A', description: 'Chapô', body },
      projects: { title: 'P', description: 'D', body },
      prompts: { title: 'T', format: 'fiche', prompt: 'x', body },
      skills: { name: 'S', body },
    };
    for (const [collection, preview] of Object.entries(PREVIEWS)) {
      const component = previewComponent(collection, preview, {
        h: treeH,
        createClass: fakeCreateClass,
        sanitize,
        loadRenderBody: async () => renderBody,
      });
      const view = mount(component, { entry: fakeEntry(fields[collection], 'x'), getAsset: () => undefined });
      await flush(20);
      const html = renderToHtml(view.tree);
      // Le corps est bien là…
      expect(html, collection).toContain('Texte.');
      expect(html, collection).toContain('<img src="https://example.com/x.png">');
      // … sans rien d'exécutable.
      expect(html, collection).not.toMatch(/\bon(?:error|load)=|javascript:|<script|<iframe|<style|<form|formaction/i);
      view.unmount();
    }
  });

  it('charge le pipeline Markdown au premier corps à rendre, une fois, par import() dynamique', async () => {
    const loader = vi.fn(async () => renderBody);
    const component = previewComponent('skills', PREVIEWS.skills, {
      h: treeH,
      createClass: fakeCreateClass,
      sanitize,
      loadRenderBody: loader,
    });
    const props = (body: string): PreviewProps => ({ entry: fakeEntry({ name: 'S', body }, 's'), getAsset: () => undefined });
    const view = mount(component, props(''));
    await flush();
    expect(loader).not.toHaveBeenCalled();
    view.update(props('# Un'));
    await flush(20);
    view.update(props('# Deux'));
    await flush(20);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(renderToHtml(view.tree)).toContain('Deux');

    // Le module d'enregistrement n'importe pas markdown.ts statiquement.
    const source = read('./register.ts');
    expect(source).not.toMatch(/^import[^;]*from '\.\/markdown';/m);
    expect(source).toContain("import('./markdown')");
  });
});
