import { describe, it, expect } from 'vitest';
import {
  BLOCKS,
  BLOCK_NAMES,
  CALLOUT_KINDS,
  blockErrors,
  refError,
  titleError,
  videoIdError,
  type BlockId,
} from './syntax.mjs';

/**
 * Syntaxe `:::` des blocs de l'éditeur (plan 23, T1, R1 ; décision D152).
 * Un seul module (`syntax.mjs`) : motifs, `fromBlock`, `toBlock`, validateurs,
 * lus par le plugin du site, les composants Sveltia et le garde canonique.
 *
 * Le motif est appliqué comme Sveltia 0.221 le fait
 * (`rich-text/components/transformers.js`) : sur le reste du document à
 * partir d'une ligne, sans drapeau `g`, et la correspondance doit COMMENCER
 * à cette ligne.
 */
function sveltiaMatch(id: BlockId, doc: string): RegExpMatchArray | null {
  const { pattern } = BLOCKS[id];
  const nonGlobal = new RegExp(pattern.source, pattern.flags.replace('g', ''));
  const [matchString] = doc.match(nonGlobal) ?? [];
  if (!matchString || !doc.startsWith(matchString)) return null;
  return matchString.match(nonGlobal);
}

/** Motif multiligne au sens de Sveltia (`isMultiLinePattern`). */
const isMultiLine = ({ multiline, dotAll, source }: RegExp) =>
  multiline || dotAll || source.includes('[\\s\\S]') || source.includes('[\\S\\s]');

const FENCE3 = '```';

describe('syntaxe des blocs', () => {
  it('forme canonique des quatre blocs', () => {
    expect(BLOCK_NAMES).toEqual(['note', 'astuce', 'attention', 'danger', 'terminal', 'carte', 'video']);
    expect(CALLOUT_KINDS).toEqual(['note', 'astuce', 'attention', 'danger']);

    // Encadré : ligne vide après l'ouverture et avant la fermeture.
    expect(BLOCKS.encadre.toBlock({ kind: 'astuce', content: 'Un **conseil**.' })).toBe(
      ':::astuce\n\nUn **conseil**.\n\n:::',
    );
    expect(BLOCKS.encadre.toBlock({ kind: 'note', content: '' })).toBe(':::note\n:::');

    // Terminal : titre, un bloc de code, lignes vides autour du bloc de code.
    expect(BLOCKS.terminal.toBlock({ title: 'deploy.sh', lang: 'bash', code: 'npm ci\nnpm run build' })).toBe(
      `:::terminal[deploy.sh]\n\n${FENCE3}bash\nnpm ci\nnpm run build\n${FENCE3}\n\n:::`,
    );
    expect(BLOCKS.terminal.toBlock({ title: 'vide', lang: '', code: '' })).toBe(
      `:::terminal[vide]\n\n${FENCE3}\n${FENCE3}\n\n:::`,
    );

    // Carte et vidéo : sans contenu, attribut entre guillemets doubles.
    expect(BLOCKS.carte.toBlock({ ref: 'projects/gha-svu' })).toBe(':::carte{ref="projects/gha-svu"}\n:::');
    expect(BLOCKS.video.toBlock({ provider: 'youtube', id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny' })).toBe(
      ':::video[Big Buck Bunny]{youtube="aqz-KE-bpKQ"}\n:::',
    );
    expect(BLOCKS.video.toBlock({ provider: 'asciinema', id: '335480', title: 'Démo' })).toBe(
      ':::video[Démo]{asciinema="335480"}\n:::',
    );
  });

  it('clôture allongée : `:::` dans le contenu, ``` dans le code', () => {
    // Une ligne du contenu qui commence par `:::` fermerait le conteneur :
    // la clôture devient plus longue que la plus longue suite de `:` en tête de ligne.
    expect(BLOCKS.encadre.toBlock({ kind: 'note', content: 'avant\n:::\naprès' })).toBe(
      '::::note\n\navant\n:::\naprès\n\n::::',
    );
    expect(BLOCKS.terminal.toBlock({ title: 't', lang: '', code: '::::: x' })).toBe(
      `::::::terminal[t]\n\n${FENCE3}\n::::: x\n${FENCE3}\n\n::::::`,
    );
    // Clôture de code plus longue que toute suite de backticks du code.
    expect(BLOCKS.terminal.toBlock({ title: 't', lang: 'md', code: `${FENCE3}js\nx\n${FENCE3}` })).toBe(
      `:::terminal[t]\n\n\`\`\`\`md\n${FENCE3}js\nx\n${FENCE3}\n\`\`\`\`\n\n:::`,
    );
    expect(BLOCKS.terminal.toBlock({ title: 't', lang: '', code: 'a `````b' })).toBe(
      `:::terminal[t]\n\n\`\`\`\`\`\`\na \`\`\`\`\`b\n\`\`\`\`\`\`\n\n:::`,
    );
  });

  it('motifs : multilignes pour Sveltia, ancrés en début de ligne', () => {
    for (const id of Object.keys(BLOCKS) as BlockId[]) {
      const { pattern } = BLOCKS[id];
      expect(pattern, id).toBeInstanceOf(RegExp);
      expect(isMultiLine(pattern), id).toBe(true);
      expect(pattern.source.startsWith('^'), id).toBe(true);
      expect(pattern.flags, id).not.toContain('g');
    }
    // Un bloc précédé de texte sur la même ligne n'est pas un bloc.
    expect(sveltiaMatch('encadre', 'x :::note\n\nA\n\n:::')).toBeNull();
    // Un paragraphe suivi d'un bloc : pas de correspondance à la ligne du paragraphe.
    expect(sveltiaMatch('carte', 'texte\n\n:::carte{ref="blog/x"}\n:::')).toBeNull();
  });

  describe('toBlock(fromBlock(m)) = m et fromBlock(toBlock(p)) = p', () => {
    const cases: { id: BlockId; props: Record<string, string> }[] = [
      { id: 'encadre', props: { kind: 'note', content: 'Une ligne.' } },
      {
        id: 'encadre',
        props: {
          kind: 'attention',
          content: 'Premier paragraphe, « guillemets » et "doubles".\n\n- un\n- deux\n\nÉté, à l’été : accents.',
        },
      },
      { id: 'encadre', props: { kind: 'danger', content: 'ligne 1\nligne 2\n:::\n::::fin' } },
      { id: 'encadre', props: { kind: 'astuce', content: '' } },
      { id: 'terminal', props: { title: 'k9s — pods « prod »', lang: 'bash', code: 'kubectl get pods\n\nk9s -n "prod"' } },
      { id: 'terminal', props: { title: 'README.md', lang: '', code: `${FENCE3}yaml\na: 1\n${FENCE3}\n:::note\n::::` } },
      { id: 'terminal', props: { title: 'fin de ligne', lang: 'text', code: 'x\n' } },
      { id: 'terminal', props: { title: 'vide', lang: '', code: '' } },
      { id: 'terminal', props: { title: "l'outil", lang: 'c++', code: '  indenté\n\ttabulé' } },
      { id: 'carte', props: { ref: 'projects/gha-svu' } },
      { id: 'carte', props: { ref: 'blog/inexistant' } },
      { id: 'video', props: { provider: 'youtube', id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny « 4K »' } },
      { id: 'video', props: { provider: 'asciinema', id: '335480', title: "l'install de k9s" } },
    ];

    for (const [index, { id, props }] of cases.entries()) {
      it(`${id} #${index}`, () => {
        const block = BLOCKS[id].toBlock(props);
        const match = sveltiaMatch(id, block);
        expect(match, block).not.toBeNull();
        expect(match![0]).toBe(block);
        expect(BLOCKS[id].fromBlock(match!)).toEqual(props);
        expect(BLOCKS[id].toBlock(BLOCKS[id].fromBlock(match!))).toBe(block);

        // Dans un document : texte avant, bloc, texte après, séparés par une ligne vide.
        const doc = `Avant.\n\n${block}\n\nAprès.\n`;
        const lines = doc.split('\n');
        const start = lines.indexOf(block.split('\n')[0]);
        const rest = lines.slice(start).join('\n');
        const inDoc = sveltiaMatch(id, rest);
        expect(inDoc?.[0]).toBe(block);
        // Deux blocs adjacents : le premier ne déborde pas sur le second.
        const twice = sveltiaMatch(id, `${block}\n\n${block}`);
        expect(twice?.[0]).toBe(block);
      });
    }
  });

  it('forme tolérée à la lecture, réécrite canonique', () => {
    const loose = ':::note\ncontenu serré\n:::';
    const match = sveltiaMatch('encadre', loose);
    expect(BLOCKS.encadre.fromBlock(match!)).toEqual({ kind: 'note', content: 'contenu serré' });
    expect(BLOCKS.encadre.toBlock(BLOCKS.encadre.fromBlock(match!))).toBe(':::note\n\ncontenu serré\n\n:::');
  });

  it('toBlock({}) et fromBlock ne lèvent jamais (Sveltia appelle toBlock({}))', () => {
    for (const id of Object.keys(BLOCKS) as BlockId[]) {
      expect(() => BLOCKS[id].toBlock({}), id).not.toThrow();
    }
  });

  it('ids, titres et ref invalides refusés', () => {
    expect(videoIdError('youtube', 'aqz-KE-bpKQ')).toBeNull();
    expect(videoIdError('youtube', 'aqz-KE-bpK')).not.toBeNull(); // 10 caractères
    expect(videoIdError('youtube', 'aqz-KE-bpKQQ')).not.toBeNull(); // 12
    expect(videoIdError('youtube', 'aqz KE-bpKQ')).not.toBeNull();
    expect(videoIdError('youtube', 'https://youtu.be/aqz-KE-bpKQ')).not.toBeNull();
    expect(videoIdError('asciinema', '335480')).toBeNull();
    expect(videoIdError('asciinema', 'abc_1')).not.toBeNull();
    expect(videoIdError('asciinema', 'a'.repeat(33))).not.toBeNull();
    expect(videoIdError('asciinema', '')).not.toBeNull();
    expect(videoIdError('vimeo', '12345')).not.toBeNull();

    expect(titleError('deploy.sh')).toBeNull();
    expect(titleError('Été « k9s »')).toBeNull();
    expect(titleError('')).not.toBeNull();
    expect(titleError('   ')).not.toBeNull();
    expect(titleError(' espace')).not.toBeNull();
    expect(titleError('a [b]')).not.toBeNull();
    expect(titleError('a]')).not.toBeNull();
    expect(titleError('deux\nlignes')).not.toBeNull();
    expect(titleError('fin\\')).not.toBeNull();
    expect(titleError('x'.repeat(201))).not.toBeNull();

    expect(refError('projects/gha-svu')).toBeNull();
    expect(refError('blog/bienvenue-dans-mon-foutoir')).toBeNull();
    expect(refError('pages/x')).not.toBeNull();
    expect(refError('blog/Majuscule')).not.toBeNull();
    expect(refError('blog/été')).not.toBeNull();
    expect(refError('blog/x"y')).not.toBeNull();
    expect(refError('/blog/x/')).not.toBeNull();
    expect(refError('https://example.com')).not.toBeNull();

    expect(blockErrors('encadre', { kind: 'note', content: 'x' })).toEqual([]);
    expect(blockErrors('encadre', { kind: 'info', content: 'x' })).not.toEqual([]);
    expect(blockErrors('terminal', { title: 't', lang: 'bash', code: 'x' })).toEqual([]);
    expect(blockErrors('terminal', { title: 't', lang: 'ba`sh', code: 'x' })).not.toEqual([]);
    expect(blockErrors('terminal', { title: '', lang: '', code: 'x' })).not.toEqual([]);
    expect(blockErrors('carte', { ref: 'blog/x' })).toEqual([]);
    expect(blockErrors('carte', { ref: '' })).not.toEqual([]);
    expect(blockErrors('video', { provider: 'youtube', id: 'aqz-KE-bpKQ', title: 'T' })).toEqual([]);
    expect(blockErrors('video', { provider: 'youtube', id: '1', title: 'T' })).not.toEqual([]);
  });
});
