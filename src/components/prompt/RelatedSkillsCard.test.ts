// src/components/prompt/RelatedSkillsCard.test.ts
//
// Carte Skills liés de la fiche prompt (plan 18, T2 ; WCAG 3.1.2) : une
// description en anglais porte `lang="en"` (quoteLang) ; une description
// française n'a pas d'attribut `lang` (elle hérite de `<html lang="fr">`).
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import RelatedSkillsCard from './RelatedSkillsCard.astro';

async function descriptionTag(description: string) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(RelatedSkillsCard, {
    props: { skills: [{ id: 'demo', title: 'Demo', description }] },
  });
  // La balise `<span …>` ouvrante suivie du texte de la description (blancs
  // de mise en forme tolérés autour).
  const match = new RegExp(`<span[^>]*>\\s*${description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</span>`).exec(html);
  if (!match) return '';
  return match[0].slice(0, match[0].indexOf('>') + 1);
}

describe('RelatedSkillsCard description lang (plan 18, T2)', () => {
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
