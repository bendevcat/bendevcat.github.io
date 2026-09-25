/**
 * Point d'entrée de Sveltia CMS pour `/admin/` (src/pages/admin/index.astro).
 *
 * `@sveltia/cms` est épinglé à version exacte dans `package.json` (pas de CDN) :
 * pour monter de version, `npm install --save-exact @sveltia/cms@<version>`.
 * Importé en module, le paquet npm ne s'initialise pas seul (il ne le fait que
 * pour un `<script src=".../sveltia-cms.js">` classique) : on appelle `init()`.
 * La config est lue dans `public/admin/config.yml` (lien `cms-config-url`).
 *
 * Aperçu : le CSS du site (`global.css`, compilé par Tailwind) est importé en
 * chaîne (`?inline` — pas de `<link>` ajouté à la page admin) et enregistré
 * comme feuille brute de l'aperçu, URL de polices rendues absolues
 * (`previewStyle.ts`). Enregistré avant `init()`.
 *
 * Gabarits d'aperçu (plan 21) : un par collection (`previews/register.ts`),
 * la colonne centrale de la page du site rendue par un gabarit pur
 * `(data, h)`. `h` et `createClass` sont le React que pose l'import de
 * `@sveltia/cms` sur `window` (absents : `console.error`, aperçu par défaut
 * gardé). Le pipeline Markdown du site n'est chargé (`import()`) qu'au premier
 * corps à rendre. Enregistrés avant `init()`.
 *
 * Sauvegarde : l'éditeur riche exporte les séparateurs en `***` ; le hook
 * `preSave` les réécrit en `---`, seule forme admise dans le contenu
 * (`hooks.ts`), puis applique les règles de date (plan 22, `dateRules.ts`) :
 * `updatedDate` d'un article publié dont le corps change, `updated` d'un
 * prompt dont la version change. L'état précédent (`previousEntry.ts`) est la
 * mémoire `postSave` de la session, sinon, sur le tableau de test, l'arbre de
 * travail qui l'a amorcé (`readWorkingTreeFile` de `dev/testRepo.ts`, branche
 * dev ci-dessous), sinon l'API contents publique de GitHub sans jeton (le
 * backend réel, en production comme en dev sans `?test-repo`). Un seul
 * `preSave`, un seul `postSave`, enregistrés avant `init()` ; le lecteur est
 * choisi avant `init()`, donc avant toute sauvegarde.
 *
 * Marqueur auteur (plan 22, T5, D150) : chaque chargement de `/admin/` pose
 * `localStorage['bencat:author'] = '1'` (`markAuthor`, erreurs de stockage
 * avalées), avant `init()`. Les pages de détail du site ne montrent leur lien
 * ✏️ Éditer que dans un navigateur qui porte ce marqueur — commodité, jamais
 * un contrôle d'accès (`src/lib/editLink.ts`, copie `?admin` ici, D138).
 *
 * Dépôt de test (dev seulement) : `/admin/?test-repo` sous `astro dev` recopie
 * `src/content/**` dans l'OPFS (`dev/testRepo.ts`) puis passe à `init()` la
 * config de `config.yml` elle-même, backend remplacé par `test-repo` seul et
 * `load_config_file: false` (pas de fusion avec le backend github, donc pas
 * d'avertissement `backend.repo` / `backend.branch` — plan 20, F1) :
 * bouton « Work with Test Repository », tableau réel sans jeton. En production la
 * branche `import.meta.env.DEV` (false) disparaît du build avec son `import()`
 * (contrôle : `scripts/check-admin.mjs`, ligne « dev-only »).
 */
import CMS from '@sveltia/cms';
import siteCss from '../styles/global.css?inline';
import { markAuthor } from '../lib/editLink';
import { createSaveHooks } from './hooks';
import { createPreviousEntries, githubReader, type FileReader } from './previousEntry';
import { registerSiteStyle } from './previewStyle';
import { registerPreviews } from './previews/register';

markAuthor(() => window.localStorage);

registerSiteStyle(CMS, siteCss, location.origin);
registerPreviews(CMS, window);

let readCommitted: FileReader = githubReader();
const saveHooks = createSaveHooks({ previous: createPreviousEntries((path) => readCommitted(path)) });
CMS.registerEventListener({ name: 'preSave', handler: saveHooks.preSave });
CMS.registerEventListener({ name: 'postSave', handler: saveHooks.postSave });

if (import.meta.env.DEV && new URLSearchParams(location.search).has('test-repo')) {
  import('./dev/testRepo')
    .then(async ({ seedTestRepo, loadTestRepoConfig, readWorkingTreeFile }) => {
      readCommitted = readWorkingTreeFile;
      await seedTestRepo().catch((error) => console.error('test-repo : amorçage OPFS impossible', error));
      return loadTestRepoConfig();
    })
    .then((config) => CMS.init({ config }))
    .catch((error) => console.error('test-repo : tableau de test impossible', error));
} else {
  CMS.init();
}
