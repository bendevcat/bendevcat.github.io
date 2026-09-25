// Lien ✏️ Éditer des pages de détail (plan 22, T5 ; D150 ;
// src/components/EditLink.astro).
//
// Le serveur rend le lien `hidden` : sans JS, ou dans un navigateur qui n'a
// jamais ouvert /admin/, il reste caché (le `[hidden] { display: none
// !important }` du preflight Tailwind, en `@layer base`, bat tout utilitaire).
// Ce script retire `hidden` seulement si `localStorage['bencat:author']` vaut
// `'1'` — marqueur posé par src/admin/cms.ts à chaque chargement de /admin/.
// Erreur de stockage (navigation privée, stockage bloqué) → lien laissé caché.
// Commodité, jamais un contrôle d'accès : src/lib/editLink.ts.
import { revealEditLinks } from '../lib/editLink';

revealEditLinks(document, () => window.localStorage);
