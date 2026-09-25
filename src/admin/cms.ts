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
 * Sauvegarde : l'éditeur riche exporte les séparateurs en `***` ; le hook
 * `preSave` les réécrit en `---`, seule forme admise dans le contenu
 * (`hooks.ts`). Enregistré avant `init()`.
 */
import CMS from '@sveltia/cms';
import siteCss from '../styles/global.css?inline';
import { normalizeBodyBeforeSave } from './hooks';
import { registerSiteStyle } from './previewStyle';

registerSiteStyle(CMS, siteCss, location.origin);
CMS.registerEventListener({ name: 'preSave', handler: normalizeBodyBeforeSave });

CMS.init();
