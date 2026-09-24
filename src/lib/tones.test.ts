// src/lib/tones.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TONES, TONE_CLASSES, toneTokenName } from './tones';

/**
 * Contrat §2.3 (docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md),
 * recopié verbatim : fond / texte / bordure, clair puis sombre.
 */
const CONTRACT_2_3 = {
  green: {
    light: ['#DCEFE6', '#0A5F45', 'rgba(11,107,76,.16)'],
    dark: ['rgba(74,222,128,.13)', '#86EFAC', 'rgba(74,222,128,.22)'],
  },
  blue: {
    light: ['#DCE8F8', '#1B4E8C', 'rgba(27,78,140,.14)'],
    dark: ['rgba(96,165,250,.14)', '#93C5FD', 'rgba(96,165,250,.22)'],
  },
  violet: {
    light: ['#E6E1F7', '#4B3B9C', 'rgba(75,59,156,.14)'],
    dark: ['rgba(167,139,250,.14)', '#C4B5FD', 'rgba(167,139,250,.22)'],
  },
  amber: {
    light: ['#F7E7D6', '#8A4B1E', 'rgba(138,75,30,.14)'],
    dark: ['rgba(251,146,60,.14)', '#FDBA74', 'rgba(251,146,60,.22)'],
  },
  rose: {
    light: ['#F7DEE4', '#93334C', 'rgba(147,51,76,.14)'],
    dark: ['rgba(244,114,182,.14)', '#F9A8D4', 'rgba(244,114,182,.22)'],
  },
} as const;

const PARTS = ['Bg', 'Ink', 'Line'] as const;

const css = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8');

/** Corps du premier bloc `{ … }` ouvert juste après `opener` (sans bloc imbriqué). */
function blockAfter(opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) throw new Error(`bloc introuvable : ${opener}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

/** Valeurs `--name: value;` d'un bloc, espaces retirés de la valeur. */
function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].replace(/\s+/g, ''));
  }
  return out;
}

describe('tones', () => {
  it('lists the five contract tones in §2.3 order', () => {
    expect(TONES).toEqual(['green', 'blue', 'violet', 'amber', 'rose']);
  });

  it('defines the 5 tag tones of contract §2.3 in both themes', () => {
    const light = declarations(blockAfter('@theme static'));
    const dark = declarations(blockAfter(':root[data-theme="dark"]'));
    let checked = 0;
    for (const tone of TONES) {
      PARTS.forEach((part, i) => {
        const name = `--color-${toneTokenName(tone, part)}`;
        expect(light.get(name), `${name} (clair)`).toBe(CONTRACT_2_3[tone].light[i]);
        expect(dark.get(name), `${name} (sombre)`).toBe(CONTRACT_2_3[tone].dark[i]);
        checked += 2;
      });
    }
    expect(checked).toBe(30); // 15 clair + 15 sombre
  });

  it('maps each tone to its bg, ink and border utilities', () => {
    expect(TONE_CLASSES).toEqual({
      green: 'bg-tagGreenBg text-tagGreenInk border-tagGreenLine',
      blue: 'bg-tagBlueBg text-tagBlueInk border-tagBlueLine',
      violet: 'bg-tagVioletBg text-tagVioletInk border-tagVioletLine',
      amber: 'bg-tagAmberBg text-tagAmberInk border-tagAmberLine',
      rose: 'bg-tagRoseBg text-tagRoseInk border-tagRoseLine',
    });
  });
});
