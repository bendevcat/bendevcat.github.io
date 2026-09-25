// src/components/skill/SkillHeader.test.ts
//
// En-tête de la fiche skill (plan 17, F4 ; WCAG 3.1.2) : la description citée
// en anglais porte `lang="en"` (quoteLang) ; une description française n'a pas
// d'attribut `lang` (elle hérite de `<html lang="fr">`).
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SkillHeader from './SkillHeader.astro';

const base = {
  id: 'demo',
  title: 'Demo',
  type: 'claude-code',
  version: null,
  license: null,
  summary: null,
  updated: null,
  updatedLabel: null,
};

async function descriptionTag(description: string) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SkillHeader, { props: { ...base, description } });
  // La balise `<p …>` ouvrante suivie immédiatement du texte de la description.
  const at = html.indexOf(`>${description}</p>`);
  if (at === -1) return '';
  return html.slice(html.lastIndexOf('<p', at), at + 1);
}

describe('SkillHeader description lang (plan 17, F4)', () => {
  it('marks an English description lang="en"', async () => {
    const tag = await descriptionTag('Superpowers is a complete software development methodology for your coding agents.');
    expect(tag).not.toBe('');
    expect(tag).toMatch(/\slang="en"/);
  });

  it('leaves a French description without lang', async () => {
    const tag = await descriptionTag('Méthodologie de planification multi-sessions résistante à la dérive.');
    expect(tag).not.toBe('');
    expect(tag).not.toMatch(/\slang=/);
  });
});
