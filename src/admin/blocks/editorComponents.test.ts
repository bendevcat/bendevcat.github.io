// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { EditorComponentDefinition } from '@sveltia/cms';
import siteEntries from 'virtual:bencat-site-entries';
import { entryRef, resetSiteEntries, siteEntriesProvider } from '../../lib/blocks/siteEntries.mjs';
import {
  BLOCKS,
  CALLOUT_KINDS,
  LANG_PATTERN,
  TITLE_MAX,
  VIDEO_ID_PATTERNS,
  VIDEO_PROVIDERS,
  titleError,
} from '../../lib/blocks/syntax.mjs';
import {
  BLOCK_COMPONENT_IDS,
  CALLOUT_BUTTONS,
  TITLE_FORM_PATTERN,
  VIDEO_ID_FORM_PATTERN,
  blockComponents,
  cardOptions,
  escapeHtml,
  registerBlocks,
  type EditorComponentApi,
} from './editorComponents';

/**
 * Composants Sveltia des quatre blocs (plan 23, T4, R7 ; D152). Le contrat
 * est vérifié contre le VRAI `registerEditorComponent` de @sveltia/cms 0.221
 * (importé sous jsdom : il lève une TypeError sur une définition invalide),
 * plus les règles lues dans ses sources (`npm/index.js.map`) que
 * l'enregistrement ne teste pas encore : motif multiligne
 * (`components/utils.js`), balise de `toPreview({})` (`custom-node.js`),
 * options d'un `select` (`config/parser/fields/select.js`).
 */

type Sveltia = EditorComponentApi & Record<string, unknown>;
let sveltia: Sveltia;

beforeAll(async () => {
  // jsdom n'a pas matchMedia, que Sveltia lit au chargement.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  sveltia = (await import('@sveltia/cms')).default as unknown as Sveltia;
});

afterEach(() => {
  resetSiteEntries();
  vi.restoreAllMocks();
});

/** `isMultiLinePattern` de Sveltia 0.221 (`rich-text/components/utils.js`). */
const isMultiLinePattern = ({ multiline, dotAll, source }: RegExp): boolean =>
  multiline || dotAll || source.includes('[\\s\\S]') || source.includes('[\\S\\s]');

/** `TAG_NAME_REGEX` de `custom-node.js` : un `toPreview({})` qui commence par une balise. */
const TAG_NAME_REGEX = /^<(?<tagName>[a-z]+)/i;

type AnyField = Record<string, unknown> & { name: string; widget?: string };
const fieldsOf = (def: EditorComponentDefinition) => def.fields as unknown as AnyField[];
const byId = (defs: EditorComponentDefinition[], id: string) => {
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`composant ${id} absent`);
  return def;
};

/** Fichier du dépôt (chemin relatif à ce test) ; `URL` est celle de jsdom ici, d'où `href`. */
const readRepoFile = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url).href), 'utf8');

function loadCmsConfig(): { collections: { name: string; fields: AnyField[] }[] } {
  return parse(readRepoFile('../../../public/admin/config.yml'));
}

describe('composants de l’éditeur : contrat Sveltia 0.221', () => {
  it('quatre composants valides pour registerEditorComponent (id, label, icon, fields, pattern multiligne, toBlock, toPreview)', () => {
    // Le validateur réel est bien celui qu'on appelle : sans toPreview, il lève.
    const probe = { id: 'sonde', label: 'Sonde', pattern: /^x$/m, toBlock: () => '', fields: [] };
    expect(() => sveltia.registerEditorComponent(probe as unknown as EditorComponentDefinition)).toThrow(
      /toPreview/,
    );

    const registered: EditorComponentDefinition[] = [];
    const api: EditorComponentApi = {
      registerEditorComponent(definition) {
        sveltia.registerEditorComponent(definition); // lève si invalide
        registered.push(definition);
      },
    };
    expect(registerBlocks(api, siteEntries)).toEqual([...BLOCK_COMPONENT_IDS]);
    expect(registered.map((d) => d.id)).toEqual(['encadre', 'terminal', 'carte', 'video']);
    expect(registered.map((d) => d.label)).toEqual(['Encadré', 'Terminal', 'Carte', 'Vidéo']);
    expect(registered.map((d) => d.icon)).toEqual(['info', 'terminal', 'bookmark', 'smart_display']);

    for (const def of registered) {
      // Menu Insert, formulaire dans le texte.
      expect(def.trigger, def.id).toBe('menuitem');
      expect(def.mode, def.id).toBe('block');
      // Motif = celui du module de syntaxe, multiligne (nœud de bloc) et ancré.
      expect(def.pattern, def.id).toBe(BLOCKS[def.id as keyof typeof BLOCKS].pattern);
      expect(isMultiLinePattern(def.pattern), def.id).toBe(true);
      expect(def.pattern.flags, def.id).not.toMatch(/[gy]/);
      expect(def.pattern.source.startsWith('^'), def.id).toBe(true);
      expect(def.fromBlock, def.id).toBe(BLOCKS[def.id as keyof typeof BLOCKS].fromBlock);
      // Sveltia appelle toBlock({}) et toPreview({}) à la création du nœud :
      // ni exception, ni balise en tête (sinon `importDOM` capture ce nom de
      // balise dans tout HTML collé).
      const block = def.toBlock({});
      const preview = def.toPreview?.({});
      expect(typeof block, def.id).toBe('string');
      expect(typeof preview, def.id).toBe('string');
      expect(block.trim(), def.id).not.toMatch(TAG_NAME_REGEX);
      expect(String(preview).trim(), def.id).not.toMatch(TAG_NAME_REGEX);
      // Champs : noms uniques ; select = options non vides, uniques, défaut parmi elles.
      const names = fieldsOf(def).map((f) => f.name);
      expect(new Set(names).size, def.id).toBe(names.length);
      for (const field of fieldsOf(def).filter((f) => f.widget === 'select')) {
        const values = (field.options as { value: unknown }[]).map((o) => o.value);
        expect(values.length, `${def.id}.${field.name}`).toBeGreaterThan(0);
        expect(new Set(values).size, `${def.id}.${field.name}`).toBe(values.length);
        if (field.default !== undefined) expect(values, `${def.id}.${field.name}`).toContain(field.default);
      }
    }
  });

  it('champs des formulaires : ceux du plan, contraintes = validateurs de syntax.mjs', () => {
    const defs = blockComponents(siteEntries);
    const shape = (id: string) => fieldsOf(byId(defs, id)).map((f) => `${f.name}:${f.widget ?? 'string'}`);
    expect(shape('encadre')).toEqual(['kind:select', 'content:markdown']);
    expect(shape('terminal')).toEqual(['title:string', 'lang:string', 'code:code']);
    expect(shape('carte')).toEqual(['ref:select']);
    expect(shape('video')).toEqual(['provider:select', 'id:string', 'title:string']);

    const [kind, content] = fieldsOf(byId(defs, 'encadre'));
    expect((kind.options as { value: string }[]).map((o) => o.value)).toEqual([...CALLOUT_KINDS]);
    expect((kind.options as { label: string }[]).map((o) => o.label)).toEqual(['Note', 'Astuce', 'Attention', 'Danger']);
    expect(content.editor_components).toEqual([]);
    expect(content.buttons).toEqual([...CALLOUT_BUTTONS]);

    const [, lang, code] = fieldsOf(byId(defs, 'terminal'));
    expect(lang.required).toBe(false);
    expect(code.output_code_only).toBe(true);
    expect(code.allow_language_selection).toBe(false);

    const [provider] = fieldsOf(byId(defs, 'video'));
    expect((provider.options as { value: string }[]).map((o) => o.value)).toEqual([...VIDEO_PROVIDERS]);

    // Le motif du titre (testé par Sveltia sur la valeur élaguée) accepte
    // exactement ce qu'accepte titleError.
    const titles = ['deploy.sh', 'Big Buck Bunny', 'É « guillemets » \'x\' "y"', 'a\\b', 'a', 'x'.repeat(TITLE_MAX),
      '[x]', 'a]', 'b[', 'fin\\', '\\', 'deux\nlignes', ''];
    for (const title of titles) {
      const form = TITLE_FORM_PATTERN.test(title) && title.length <= TITLE_MAX;
      expect(form, JSON.stringify(title)).toBe(titleError(title) === null);
    }
    for (const id of ['aqz-KE-bpKQ', '335480', 'abcDEF123', 'x'.repeat(32), 'x'.repeat(33), 'a b', 'aqz-KE-bpK', '']) {
      const any = VIDEO_PROVIDERS.some((p) => VIDEO_ID_PATTERNS[p].test(id));
      expect(VIDEO_ID_FORM_PATTERN.test(id), id).toBe(any);
    }
    const [title, , ] = fieldsOf(byId(defs, 'terminal'));
    expect((title.pattern as [RegExp, string])[0]).toBe(TITLE_FORM_PATTERN);
    expect(title.maxlength).toBe(TITLE_MAX);
    expect((lang.pattern as [RegExp, string])[0]).toBe(LANG_PATTERN);
  });

  it('toBlock écrit la forme canonique ; titre, id et langage élagués', () => {
    const defs = blockComponents(siteEntries);
    expect(byId(defs, 'terminal').toBlock({ title: '  deploy.sh ', lang: ' bash ', code: 'npm ci' })).toBe(
      ':::terminal[deploy.sh]\n\n```bash\nnpm ci\n```\n\n:::',
    );
    expect(byId(defs, 'video').toBlock({ provider: 'youtube', id: ' aqz-KE-bpKQ ', title: ' Big Buck Bunny ' })).toBe(
      ':::video[Big Buck Bunny]{youtube="aqz-KE-bpKQ"}\n:::',
    );
    expect(byId(defs, 'carte').toBlock({ ref: 'projects/gha-svu' })).toBe(':::carte{ref="projects/gha-svu"}\n:::');
    expect(byId(defs, 'encadre').toBlock({ kind: 'astuce', content: 'Ligne 1\n\n- a\n- b\n' })).toBe(
      ':::astuce\n\nLigne 1\n\n- a\n- b\n\n:::',
    );
    // Aller-retour de chaque bloc par le motif et fromBlock du composant.
    const samples: Record<string, Record<string, string>> = {
      encadre: { kind: 'danger', content: 'Texte **gras**\n\n:::\n\nsuite' },
      terminal: { title: 'run', lang: '', code: '```\n:::\nfin' },
      carte: { ref: 'blog/k9s-kubernetes-terminal-ui' },
      video: { provider: 'asciinema', id: '335480', title: 'Une session' },
    };
    for (const def of defs) {
      const md = def.toBlock(samples[def.id]);
      const match = md.match(new RegExp(def.pattern.source, def.pattern.flags));
      expect(match?.[0], def.id).toBe(md);
      expect(def.fromBlock?.(match as RegExpMatchArray), def.id).toEqual(samples[def.id]);
    }
  });

  it('toPreview : résumé texte court et échappé', () => {
    const defs = blockComponents(siteEntries);
    const preview = (id: string, props: Record<string, unknown>) => String(byId(defs, id).toPreview?.(props));
    expect(preview('encadre', { kind: 'attention', content: '<img src=x onerror=alert(1)> **x**' })).toBe(
      'Encadré · Attention · &lt;img src=x onerror=alert(1)&gt; **x**',
    );
    expect(preview('terminal', { title: 'a"b', lang: 'bash' })).toBe('Terminal · a&quot;b · bash');
    expect(preview('video', { provider: 'youtube', title: 'Démo & test' })).toBe('Vidéo · YouTube · Démo &amp; test');
    const [first] = cardOptions(siteEntries);
    expect(preview('carte', { ref: first.value })).toBe(`Carte · ${escapeHtml(first.label)}`);
    expect(preview('carte', { ref: 'blog/inexistant' })).toBe('Carte · blog/inexistant (introuvable)');
    expect(preview('encadre', { kind: 'note', content: 'x'.repeat(200) }).length).toBeLessThan(90);
  });
});

describe('composants de l’éditeur : bloc Carte', () => {
  it('options de carte = index, aucune saisie d’URL', () => {
    const carte = byId(blockComponents(siteEntries), 'carte');
    const fields = fieldsOf(carte);
    // Un seul champ : le sélecteur ; aucun champ texte, aucune URL.
    expect(fields.map((f) => f.name)).toEqual(['ref']);
    expect(fields[0].widget).toBe('select');
    expect(fields.some((f) => !f.widget || f.widget === 'string' || f.type === 'url')).toBe(false);

    const options = fields[0].options as { label: string; value: string }[];
    expect(options.map((o) => o.value)).toEqual(siteEntries.map(entryRef));
    expect(options).toEqual(cardOptions(siteEntries));
    const kinds: Record<string, string> = { blog: 'Article', projects: 'Projet', prompts: 'Prompt', skills: 'Skill' };
    for (const [i, entry] of siteEntries.entries()) {
      expect(options[i].label, entryRef(entry)).toBe(`${kinds[entry.collection]} · ${entry.title}${entry.draft ? ' 📝' : ''}`);
    }
    expect(options.some((o) => o.label.endsWith(' 📝'))).toBe(true);
  });

  it('index vide : pas de Carte (un select sans option casse la config), avertissement', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ids: string[] = [];
    expect(registerBlocks({ registerEditorComponent: (d) => ids.push(d.id) }, [])).toEqual(['encadre', 'terminal', 'video']);
    expect(ids).toEqual(['encadre', 'terminal', 'video']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('registerBlocks installe l’index comme fournisseur de l’aperçu (mode preview)', async () => {
    registerBlocks({ registerEditorComponent() {} }, siteEntries);
    const provider = siteEntriesProvider();
    expect(provider?.mode).toBe('preview');
    expect(await provider?.entries()).toEqual([...siteEntries]);
  });
});

describe('composants de l’éditeur : branchement', () => {
  it('enregistrés avant init', () => {
    const cms = readRepoFile('../cms.ts');
    expect(cms).toMatch(/^import siteEntries from 'virtual:bencat-site-entries';$/m);
    expect(cms).toMatch(/^import \{ registerBlocks \} from '\.\/blocks\/editorComponents';$/m);
    // Un seul appel, au niveau du module (hors branche dev), avant tout CMS.init().
    const calls = [...cms.matchAll(/^registerBlocks\(CMS, siteEntries\);$/gm)];
    expect(calls).toHaveLength(1);
    const inits = [...cms.matchAll(/CMS\.init\(/g)].map((m) => m.index ?? -1);
    expect(inits.length).toBeGreaterThan(0);
    for (const init of inits) expect(calls[0].index).toBeLessThan(init);
    expect(calls[0].index).toBeLessThan(cms.indexOf('if (import.meta.env.DEV'));
  });

  it('editor_components : blocs sur les articles seulement', () => {
    const config = loadCmsConfig();
    const blockIds = new Set<string>(BLOCK_COMPONENT_IDS);
    const body = (name: string) => {
      const field = config.collections.find((c) => c.name === name)?.fields.find((f) => f.name === 'body');
      if (!field) throw new Error(`${name}.body absent`);
      return field;
    };
    expect(body('blog').widget).toBe('markdown');
    expect(body('blog').editor_components).toEqual(['code-block', 'image', ...BLOCK_COMPONENT_IDS]);
    expect(body('blog').allow_nested_components).toBe(false);
    for (const name of ['projects', 'prompts', 'skills']) {
      expect(body(name).editor_components, name).toEqual(['code-block', 'image']);
    }
    // Aucun autre champ markdown / richtext sans liste explicite (le défaut
    // de Sveltia active TOUT composant enregistré), ni avec un bloc.
    for (const collection of config.collections) {
      const walk = (fields: AnyField[], path: string): void => {
        for (const field of fields) {
          const where = `${path}.${field.name}`;
          if (field.widget === 'markdown' || field.widget === 'richtext') {
            expect(Array.isArray(field.editor_components), where).toBe(true);
            const blocks = (field.editor_components as string[]).filter((id) => blockIds.has(id));
            expect(blocks, where).toEqual(where === 'blog.body' ? [...BLOCK_COMPONENT_IDS] : []);
          }
          if (Array.isArray(field.fields)) walk(field.fields as AnyField[], where);
        }
      };
      walk(collection.fields, collection.name);
    }
  });
});
