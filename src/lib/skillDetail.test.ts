import { describe, expect, it } from 'vitest';
import { installSteps, quoteLang, skillUpdated, toolLabel, updatedLabel, versionDate } from './skillDetail';

// Les noms de tests cités par R1 (plan 17) sont repris MOT POUR MOT.

const ANTI_DRIFT_CMD =
  'claude plugin marketplace add ~/workspace/anti-drift-planning && claude plugin install anti-drift-planning@anti-drift-marketplace';

// z.coerce.date('2026-09-18') → minuit UTC.
const changelog = [
  { version: '6.4.1', date: new Date('2026-09-18'), text: 'a' },
  { version: '6.3.0', date: new Date('2026-08-12'), text: 'b' },
  { version: '6.2.0', date: new Date('2026-07-23'), text: 'c' },
];

describe('skill page data (plan 17)', () => {
  it('splits the install command on && into numbered steps', () => {
    expect(installSteps(ANTI_DRIFT_CMD)).toEqual([
      'claude plugin marketplace add ~/workspace/anti-drift-planning',
      'claude plugin install anti-drift-planning@anti-drift-marketplace',
    ]);
    // Blancs autour de `&&` rognés, parties vides écartées.
    expect(installSteps('  a &&b&&   c  ')).toEqual(['a', 'b', 'c']);
    expect(installSteps('a && && b &&')).toEqual(['a', 'b']);
  });

  it('keeps a one-part command as one step', () => {
    expect(installSteps('/plugin install superpowers@claude-plugins-official')).toEqual([
      '/plugin install superpowers@claude-plugins-official',
    ]);
    // Un seul `&` n'est pas un séparateur.
    expect(installSteps('a & b')).toEqual(['a & b']);
    expect(installSteps('   ')).toEqual([]);
    expect(installSteps(undefined)).toEqual([]);
  });

  it('takes maj. from the changelog row of the declared version and omits it otherwise', () => {
    expect(skillUpdated('6.4.1', changelog)?.toISOString()).toBe('2026-09-18T00:00:00.000Z');
    expect(skillUpdated('6.3.0', changelog)?.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    // Blancs et `v` de tête tolérés des deux côtés.
    expect(skillUpdated(' v6.2.0 ', changelog)?.toISOString()).toBe('2026-07-23T00:00:00.000Z');
    // Version absente du journal, version absente, journal absent ou vide : rien.
    expect(skillUpdated('7.0.0', changelog)).toBeNull();
    expect(skillUpdated(undefined, changelog)).toBeNull();
    expect(skillUpdated('  ', changelog)).toBeNull();
    expect(skillUpdated('6.4.1', undefined)).toBeNull();
    expect(skillUpdated('6.4.1', [])).toBeNull();
    // Le libellé suit : null sans date.
    expect(updatedLabel(skillUpdated('7.0.0', changelog))).toBeNull();
    expect(updatedLabel(undefined)).toBeNull();
  });

  it('labels claude-code as Claude Code and keeps other types as written', () => {
    expect(toolLabel('claude-code')).toBe('Claude Code');
    expect(toolLabel('cursor')).toBe('cursor');
    expect(toolLabel('Claude-Code')).toBe('Claude-Code');
    expect(toolLabel('')).toBe('');
  });

  it('formats version dates as 18 sept. 2026 and maj. as 18 septembre 2026 in UTC', () => {
    expect(versionDate(new Date('2026-09-18'))).toBe('18 sept. 2026');
    expect(updatedLabel(new Date('2026-09-18'))).toBe('18 septembre 2026');
    expect(updatedLabel(new Date('2026-07-31'))).toBe('31 juillet 2026');
    // Un 1er du mois reste dans son mois quel que soit le fuseau du build.
    expect(versionDate(new Date('2026-08-01'))).toBe('1 août 2026');
    expect(updatedLabel(new Date('2026-08-01'))).toBe('1 août 2026');
    expect(versionDate(new Date('2026-07-23T23:30:00-05:00'))).toBe('24 juil. 2026');
  });
});

describe('quoteLang', () => {
  it('marks the quoted French phrases fr and the English ones en', () => {
    // Déclencheurs d'anti-drift-planning : un seul est en français.
    expect(quoteLang('ne rien perdre entre les sessions')).toBe('fr');
    for (const phrase of ['roadmap', 'split into plans', 'multi-phase feature', 'avoid drift', 'session per plan', 'decompose into specs']) {
      expect(quoteLang(phrase)).toBe('en');
    }
    // Points forts : anti-drift cité du corps français, superpowers du README.
    expect(quoteLang('Scope ledger. Un fichier par plan suit chaque exigence')).toBe('fr');
    expect(quoteLang('Invariants mécaniques. Ce qui est comptable est compté par du code')).toBe('fr');
    expect(quoteLang('Anti-arbitrage silencieux. Toute déviation est loggée avant d\'être exécutée')).toBe('fr');
    expect(quoteLang('Test-Driven Development - Write tests first, always')).toBe('en');
    expect(quoteLang('Evidence over claims - Verify before declaring success')).toBe('en');
    expect(quoteLang('brainstorming - Activates before writing code.')).toBe('en');
  });
});
