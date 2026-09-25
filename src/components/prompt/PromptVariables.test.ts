// src/components/prompt/PromptVariables.test.ts
//
// Repli sans JS du panneau variables (plan 18, T3 ; D121). Le champ reste
// rendu `hidden` par le serveur (pas de contrôle inerte sans JS) ; chaque
// variable qui a un défaut montre à la place une ligne `défaut : <valeur>`
// (`data-var-static` : libellé mono 11 `muted`, valeur mono 13 `ink`). Une
// fois le JS lancé (`data-js` sur <html>, posé par le script inline de
// BaseLayout avant le rendu), ces lignes sont masquées par la règle
// `html[data-js] [data-var-static]` de global.css — les champs en tiennent
// lieu.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PromptVariables from './PromptVariables.astro';

async function render(variables: { name: string; hint?: string; default?: string }[]) {
  const container = await AstroContainer.create();
  return container.renderToString(PromptVariables, { props: { variables } });
}

/** Balise ouvrante + contenu de chaque élément `data-var-static`. */
function staticLines(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*\bdata-var-static\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[0]);
}

const text = (fragment: string) => fragment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const classesOf = (tag: string) => (tag.match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);

describe('PromptVariables sans JS (plan 18, T3)', () => {
  it('shows each default as text for the no-JS page', async () => {
    const html = await render([
      { name: 'N', default: '4', hint: 'number of items' },
      { name: 'BASE_REF', default: 'main' },
    ]);
    const lines = staticLines(html);
    expect(lines).toHaveLength(2);
    expect(lines.map(text)).toEqual(['défaut : 4', 'défaut : main']);

    for (const line of lines) {
      // la ligne ne porte ni `hidden` ni utilitaire de display : visible sans JS
      const open = line.slice(0, line.indexOf('>') + 1);
      expect(open).not.toMatch(/\shidden\b/);
      // libellé mono 11 `muted`, valeur mono 13 `ink`
      const spans = [...line.matchAll(/<span\b[^>]*>/g)].map((m) => classesOf(m[0]));
      expect(spans).toHaveLength(2);
      expect(spans[0]).toEqual(expect.arrayContaining(['font-mono', 'text-[11px]', 'text-muted']));
      expect(spans[1]).toEqual(expect.arrayContaining(['font-mono', 'text-[13px]', 'text-ink']));
    }

    // le champ reste rendu `hidden` par le serveur
    const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input).toMatch(/\shidden\b/);
  });

  it('shows no value line for a variable without default', async () => {
    const html = await render([{ name: 'topic', hint: 'subject' }, { name: 'EMPTY', default: '' }]);
    expect(staticLines(html)).toHaveLength(0);
    expect(html).not.toContain('défaut :');
  });

  it('hides the value lines once JavaScript runs', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/global.css'), 'utf8');
    const rule = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) =>
      m[1]
        .split(',')
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .includes('html[data-js] [data-var-static]'),
    );
    expect(rule, 'règle html[data-js] [data-var-static] dans global.css').toBeDefined();
    expect(rule![2]).toMatch(/display:\s*none\s*!important/);
    // BaseLayout pose bien `data-js` avant le rendu
    const layout = readFileSync(resolve(__dirname, '../../layouts/BaseLayout.astro'), 'utf8');
    expect(layout).toMatch(/document\.documentElement\.dataset\.js\s*=/);
  });
});
