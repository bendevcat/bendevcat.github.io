import { afterEach, describe, expect, it } from 'vitest';
import { dateRuleMayApply, dateUpdates, formatLocalTimestamp, type PreviousState, type SavingEntry } from './dateRules';

/**
 * Règles de date de la sauvegarde CMS (plan 22, R4 ; D149). Pures : l'entrée
 * neuve, l'état précédent (fichier engagé, lu par `previousEntry.ts`) et
 * l'horodatage déjà formaté.
 */
const NOW = '2026-09-25T14:03:07+02:00';

const BODY = 'Intro.\n\n---\n\nSuite.';

const article = (data: Record<string, unknown>, newRecord = false): SavingEntry => ({
  collection: 'blog',
  newRecord,
  data: { title: 'k9s', draft: false, body: BODY, ...data },
});

const prompt = (data: Record<string, unknown>, newRecord = false): SavingEntry => ({
  collection: 'prompts',
  newRecord,
  data: { title: 'MacOS Clone', draft: false, prompt: 'Crée…', ...data },
});

const found = (data: Record<string, unknown>): PreviousState => ({ kind: 'found', data });

describe('règles de date (preSave)', () => {
  it('article publié, corps changé : updatedDate = maintenant', () => {
    const previous = found({ title: 'k9s', draft: false, body: BODY });
    expect(dateUpdates(article({ body: `${BODY} Un mot.` }), previous, NOW)).toEqual({ updatedDate: NOW });
    // `draft` absent des deux côtés = publié.
    expect(dateUpdates(article({ draft: undefined, body: 'Autre.' }), found({ body: BODY }), NOW)).toEqual({
      updatedDate: NOW,
    });
    // Une date précédente est remplacée, pas conservée.
    expect(
      dateUpdates(article({ body: 'Autre.', updatedDate: '2025-01-01T00:00:00+01:00' }), previous, NOW),
    ).toEqual({ updatedDate: NOW });
  });

  it('titre seul, brouillon, première publication, nouvelle entrée ou état précédent inconnu : rien ne change', () => {
    const published = found({ title: 'k9s', draft: false, body: BODY });
    // Titre, tags, couverture : le corps est identique.
    expect(dateUpdates(article({ title: 'k9s (maj)', tags: ['x'] }), published, NOW)).toEqual({});
    // Brouillon avant et après.
    expect(dateUpdates(article({ draft: true, body: 'Autre.' }), found({ draft: true, body: BODY }), NOW)).toEqual({});
    // Publié → brouillon.
    expect(dateUpdates(article({ draft: true, body: 'Autre.' }), published, NOW)).toEqual({});
    // Première publication (brouillon → publié), corps modifié en même temps.
    expect(dateUpdates(article({ draft: false, body: 'Autre.' }), found({ draft: true, body: BODY }), NOW)).toEqual(
      {},
    );
    // Nouvelle entrée (création ou duplicata), même avec un état précédent.
    expect(dateUpdates(article({ body: 'Autre.' }, true), published, NOW)).toEqual({});
    expect(dateUpdates(prompt({ version: '2.0.0' }, true), found({ version: '1.0.0' }), NOW)).toEqual({});
    // Fichier absent ou état inconnu.
    for (const previous of [{ kind: 'new' }, { kind: 'unknown' }] as PreviousState[]) {
      expect(dateUpdates(article({ body: 'Autre.' }), previous, NOW)).toEqual({});
      expect(dateUpdates(prompt({ version: '2.0.0' }), previous, NOW)).toEqual({});
    }
    // Autres collections : jamais.
    for (const collection of ['projects', 'skills']) {
      const entry = { collection, newRecord: false, data: { body: 'Autre.', version: '2.0.0' } };
      expect(dateRuleMayApply(entry)).toBe(false);
      expect(dateUpdates(entry, found({ body: BODY, version: '1.0.0' }), NOW)).toEqual({});
    }
  });

  it('séparateurs normalisés avant la comparaison', () => {
    const previous = found({ draft: false, body: BODY });
    // L'éditeur riche exporte `***` : c'est le même corps une fois normalisé.
    expect(dateUpdates(article({ body: 'Intro.\n\n***\n\nSuite.' }), previous, NOW)).toEqual({});
    expect(dateUpdates(article({ body: 'Intro.\n***\n\nSuite.' }), previous, NOW)).toEqual({});
  });

  it('prompt : version changée → updated ; inchangée ou vidée → rien', () => {
    const previous = found({ version: '1.0.0', draft: false });
    expect(dateUpdates(prompt({ version: '1.1.0' }), previous, NOW)).toEqual({ updated: NOW });
    // Première version renseignée.
    expect(dateUpdates(prompt({ version: '1.0.0' }), found({ draft: false }), NOW)).toEqual({ updated: NOW });
    // Version lue en nombre dans le YAML précédent : comparée en texte.
    expect(dateUpdates(prompt({ version: '2' }), found({ version: 2 }), NOW)).toEqual({});
    // Inchangée (autre champ modifié), vidée, absente.
    expect(dateUpdates(prompt({ version: '1.0.0', title: 'Autre' }), previous, NOW)).toEqual({});
    expect(dateUpdates(prompt({ version: '' }), previous, NOW)).toEqual({});
    expect(dateUpdates(prompt({}), previous, NOW)).toEqual({});
    expect(dateRuleMayApply(prompt({ version: '' }))).toBe(false);
    // Le brouillon n'entre pas dans la règle des prompts.
    expect(dateUpdates(prompt({ version: '1.1.0', draft: true }), previous, NOW)).toEqual({ updated: NOW });
  });

  describe('horodatage', () => {
    const tz = process.env.TZ;
    afterEach(() => {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    });

    // Secondes toujours `00` (plan 22, F1 ; D151) : l'éditeur datetime de
    // Sveltia 0.221 ne tient que les minutes (`<input type="datetime-local">`,
    // `helpers.js` `getInputValue` → `HH:mm`) ; une valeur à secondes non
    // nulles serait réécrite `…:00` à la sauvegarde suivante, même sans
    // modification (rupture de D148).
    it('format YYYY-MM-DDTHH:mm:ssZ au décalage local', () => {
      const summer = new Date('2026-07-01T10:20:30.999Z');
      const winter = new Date('2026-01-31T23:05:09Z');
      process.env.TZ = 'Europe/Paris';
      expect(formatLocalTimestamp(summer)).toBe('2026-07-01T12:20:00+02:00');
      expect(formatLocalTimestamp(winter)).toBe('2026-02-01T00:05:00+01:00');
      process.env.TZ = 'UTC';
      expect(formatLocalTimestamp(summer)).toBe('2026-07-01T10:20:00+00:00');
      process.env.TZ = 'America/St_Johns';
      expect(formatLocalTimestamp(summer)).toBe('2026-07-01T07:50:00-02:30');
      expect(formatLocalTimestamp(winter)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/);
    });
  });
});
