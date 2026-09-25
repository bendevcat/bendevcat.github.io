// src/components/skill/InstallWindow.test.ts
//
// Fenêtre d'installation (plan 17, F4 ; WCAG 3.1.2) : la note citée en
// anglais porte `lang="en"` (quoteLang) ; une note française n'a pas
// d'attribut `lang`.
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import InstallWindow from './InstallWindow.astro';

async function noteTag(note: string) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(InstallWindow, {
    props: { installCmd: '/plugin install demo', steps: ['/plugin install demo'], tool: 'Claude Code', note },
  });
  return html.match(/<p\b[^>]*\sdata-install-note[^>]*>/)?.[0] ?? '';
}

describe('InstallWindow note lang (plan 17, F4)', () => {
  it('marks an English note lang="en"', async () => {
    const tag = await noteTag("Install the plugin from Anthropic's official marketplace");
    expect(tag).not.toBe('');
    expect(tag).toMatch(/\slang="en"/);
  });

  it('leaves a French note without lang', async () => {
    const tag = await noteTag("La commande d'installation de cette fiche n'est pas exécutable en l'état.");
    expect(tag).not.toBe('');
    expect(tag).not.toMatch(/\slang=/);
  });
});
