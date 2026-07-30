import { describe, it, expect } from 'vitest';
import { sortAndFilter } from './posts';

describe('sortAndFilter', () => {
  it('exclut les drafts et trie par pubDate desc', () => {
    const input = [
      { data: { draft: false, pubDate: new Date('2024-01-01') } },
      { data: { draft: true,  pubDate: new Date('2025-01-01') } },
      { data: { draft: false, pubDate: new Date('2026-01-01') } },
    ] as any[];
    const out = sortAndFilter(input);
    expect(out).toHaveLength(2);
    expect(out[0].data.pubDate.getFullYear()).toBe(2026);
  });
});
