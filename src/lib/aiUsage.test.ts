// src/lib/aiUsage.test.ts
import { describe, it, expect } from 'vitest';
import { AI_USAGE_META } from './aiUsage';
import { TONE_CLASSES, TONES } from './tones';

/** Les 22 tokens couleur du contrat visuel §2 (le 23e, `shadow`, n'est pas une couleur). */
const CONTRACT_COLOR_TOKENS = [
  'bg', 'surface', 'card', 'rail', 'line', 'line2', 'ink', 'body', 'muted', 'dim',
  'accent', 'accentInk', 'accentSoft', 'chip', 'panel', 'panelLine', 'badgeBg',
  'badgeInk', 'nav', 'cardHover', 'code', 'hatch',
];
const TONE_TOKEN = /^tag(Green|Blue|Violet|Amber|Rose)(Bg|Ink|Line)$/;

describe('AI_USAGE_META', () => {
  it('keeps the none, partial, full declaration order', () => {
    expect(Object.keys(AI_USAGE_META)).toEqual(['none', 'partial', 'full']);
  });

  it('draws none, partial and full with the green, amber and blue tones', () => {
    expect(AI_USAGE_META.none.tone).toBe('green');
    expect(AI_USAGE_META.partial.tone).toBe('amber');
    expect(AI_USAGE_META.full.tone).toBe('blue');
    for (const meta of Object.values(AI_USAGE_META)) {
      expect(meta.bannerClass).toBe(TONE_CLASSES[meta.tone]);
    }
  });

  it('gives the three levels three different tones', () => {
    const tones = Object.values(AI_USAGE_META).map((m) => m.tone);
    expect(new Set(tones).size).toBe(3);
    for (const tone of tones) expect(TONES).toContain(tone);
  });

  it('uses no colour class outside the contract tokens and tones', () => {
    for (const [level, meta] of Object.entries(AI_USAGE_META)) {
      const utilities = meta.bannerClass
        .split(/\s+/)
        .filter(Boolean)
        .map((cls) => cls.replace(/^([a-z-]+:)+/, '')) // variantes `dark:`, `hover:`…
        .filter((cls) => /^(bg|text|border)-/.test(cls));
      expect(utilities.length, level).toBeGreaterThan(0);
      for (const cls of utilities) {
        const token = cls.replace(/^(bg|text|border)-/, '').replace(/\/\d+$/, '');
        const ok = CONTRACT_COLOR_TOKENS.includes(token) || TONE_TOKEN.test(token);
        expect(ok, `${level}: ${cls}`).toBe(true);
      }
    }
  });
});
