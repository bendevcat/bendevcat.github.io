import { describe, it, expect } from 'vitest';
import { shouldRenderPromptBlock } from './promptView';

describe('shouldRenderPromptBlock', () => {
  it('rend le bloc pour une fiche qui a un prompt', () => {
    expect(shouldRenderPromptBlock('fiche', 'Tu es un assistant.')).toBe(true);
  });

  it('ne rend pas de bloc vide pour une fiche sans prompt', () => {
    expect(shouldRenderPromptBlock('fiche', undefined)).toBe(false);
    expect(shouldRenderPromptBlock('fiche', '   ')).toBe(false);
  });

  it('ne rend pas de bloc pour un guide, même s’il porte un prompt', () => {
    expect(shouldRenderPromptBlock('guide', 'Tu es un assistant.')).toBe(false);
  });
});
