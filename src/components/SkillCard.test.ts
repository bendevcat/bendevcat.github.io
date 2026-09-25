// src/components/SkillCard.test.ts
//
// Carte de la grille /skills (plan 18, T2 ; WCAG 3.1.2) : une description
// en anglais porte `lang="en"` (quoteLang) ; une description française n'a
// pas d'attribut `lang` (elle hérite de `<html lang="fr">`), comme SkillHeader.
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SkillCard from './SkillCard.astro';

function skill(description: string) {
  return {
    id: 'demo',
    collection: 'skills',
    data: { title: 'Demo', description, type: 'claude-code', tags: [], draft: false },
  };
}

async function descriptionTag(description: string) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(SkillCard, { props: { skill: skill(description), relatedPrompts: [] } });
  // La balise `<p …>` ouvrante suivie immédiatement du texte de la description.
  const at = html.indexOf(`>${description}</p>`);
  if (at === -1) return '';
  return html.slice(html.lastIndexOf('<p', at), at + 1);
}

describe('SkillCard description lang (plan 18, T2)', () => {
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
