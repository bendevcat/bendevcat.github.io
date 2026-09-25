import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { parse } from 'yaml';

/**
 * Plan 20 — tableau de bord du CMS (navigation). Ce fichier garde
 * `public/admin/config.yml` contre le schéma JSON LIVRÉ par `@sveltia/cms`
 * (version épinglée dans package.json) : une clé mal orthographiée
 * (`view_filtrs`, `sumary`…) est ignorée en silence ou casse le CMS au
 * chargement, jamais au build — seul ce test la voit avant l'auteur.
 */

/**
 * Config réelle servie à `/admin/`, lue sur disque. Pas d'import de
 * `loadCmsConfig` depuis `cms-config.test.ts` : importer un fichier de test
 * rejouerait toutes ses suites ici.
 */
function loadCmsConfig(): unknown {
  return parse(readFileSync(new URL('../../public/admin/config.yml', import.meta.url), 'utf8'));
}

/**
 * Schéma JSON de la config, lu dans le paquet installé (jamais recopié). Lu
 * par chemin : le champ `exports` du paquet n'expose pas `schema/`.
 */
function loadSveltiaSchema(): object {
  const url = new URL('../../node_modules/@sveltia/cms/schema/sveltia-cms.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

/**
 * Valide une config contre le schéma Sveltia. `strict: false` : le schéma
 * livré porte des mots-clés d'annotation (`markdownDescription`…) inconnus
 * d'ajv ; ils n'ont aucun effet sur la validation.
 */
function validateCmsConfig(config: unknown): { valid: boolean; errors: string[] } {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(loadSveltiaSchema());
  const valid = validate(config) as boolean;
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || '/'} ${e.message}${e.params ? ' ' + JSON.stringify(e.params) : ''}`,
  );
  return { valid, errors };
}

describe('config du CMS — schéma Sveltia (R1)', () => {
  it('valide config.yml contre le schéma JSON livré par @sveltia/cms', () => {
    const { valid, errors } = validateCmsConfig(loadCmsConfig());
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });
});
