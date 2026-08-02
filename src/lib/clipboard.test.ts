import { describe, it, expect, vi } from 'vitest';
import { copyText } from './clipboard';

describe('copyText', () => {
  it('utilise l’API moderne quand elle réussit, sans toucher au fallback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('salut');
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it('retombe sur le fallback quand l’API moderne rejette', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(true);
    expect(legacyCopy).toHaveBeenCalledWith('salut');
  });

  it('retombe sur le fallback quand l’API moderne est absente', async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await copyText('salut', { legacyCopy })).toBe(true);
    expect(legacyCopy).toHaveBeenCalledWith('salut');
  });

  it('renvoie false quand les deux chemins échouent', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('nope'));
    const legacyCopy = vi.fn().mockReturnValue(false);
    expect(await copyText('salut', { writeText, legacyCopy })).toBe(false);
  });

  it('renvoie false quand le fallback lève', async () => {
    const legacyCopy = vi.fn().mockImplementation(() => {
      throw new Error('execCommand indisponible');
    });
    expect(await copyText('salut', { legacyCopy })).toBe(false);
  });
});
