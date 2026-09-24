// src/lib/projectStatus.test.ts
import { describe, it, expect } from 'vitest';
import { PROJECT_STATUS_META } from './projectStatus';
import { TONE_CLASSES } from './tones';

const classes = (s: string) => s.split(/\s+/).filter(Boolean);

describe('projectStatus', () => {
  it('draws wip with the amber tone', () => {
    // Même ton que le niveau IA `partial` (D40, D53) : un ton de tag du contrat §2.3.
    expect(PROJECT_STATUS_META.wip.chipClass).toBe(TONE_CLASSES.amber);
  });

  it('draws actif with the accent and archivé with neutral tokens', () => {
    expect(classes(PROJECT_STATUS_META.actif.chipClass).sort()).toEqual(
      ['border-accent/40', 'bg-accentSoft', 'text-accent'].sort(),
    );
    expect(classes(PROJECT_STATUS_META['archivé'].chipClass).sort()).toEqual(
      ['border-line', 'bg-chip', 'text-muted'].sort(),
    );
  });

  it('keeps the labels equal to the status values', () => {
    for (const [status, meta] of Object.entries(PROJECT_STATUS_META)) {
      expect(meta.label).toBe(status);
    }
  });
});
