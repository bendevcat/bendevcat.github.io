# Plan 2 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut._

**Ratification — 2026-07-30 23:45 (utilisateur bendevcat, transcrite depuis ses réponses explicites au gate de décision) :** **D01, D02, D03, D05 → `approved`** (ratification groupée). **D04 → décision : option (a)** — rendre l'onglet média global inoffensif plutôt que de le retirer (retrait impossible) ; voir D06. Trois travaux hors périmètre initial ont également été **commandés explicitement** par l'utilisateur : **D06** (parade média), **D07** (câblage des tests en CI), **D08** (rendu de la couverture sur la page article).

## D09 — Repli média global repointé dans `src/` + `choose_url: false` sur la couverture (parade retenue pour I1)

- **Date:** 2026-07-31 01:50
- **Task affected:** T-D1 (remplace le mécanisme mort de **D06**)
- **Original plan:** plan d'impl, T-A1 Step 5 : `media_folder: public/images/uploads` / `public_folder: /images/uploads`, commentés « repli global non utilisé ». Aucune tâche du plan ne prévoit d'option `choose_url`.
- **Deviation taken:** (1) `media_folder: src/assets/uploads` et `public_folder: /src/assets/uploads` ; (2) `choose_url: false` sur le champ `cover` ; (3) correction du commentaire faux.
- **Reason:** investigation en lecture seule du **bundle épinglé 0.175.1** (pas de la doc), après l'échec de D04 (retrait) et D06 (`../`). Conclusions **établies sur le code**, pas déduites : l'onglet global ne peut **pas** être masqué (`global.enabled = l !== void 0`, et le dossier global a `entryRelative: false` **codé en dur**) ; le `media_folder` au niveau du **champ** ajoute un onglet sans désactiver le global ; `media_libraries: {default: false}` supprime *aussi* l'onglet entry-relative et le bouton Upload. La seule parade structurelle n'est donc pas de fermer le chemin dangereux mais de le rendre **inoffensif** : un chemin absolu **racine-projet** pointant dans `src/` est suivi par la résolution Vite d'Astro. **Vérifié par build réel** : `/src/assets/uploads/probe.png` est importé **et optimisé** (`/_astro/probe.*.webp`), là où le même fichier ailleurs donne `ImageNotFound`. Les trois gestes possibles deviennent alors buildables. Le `choose_url: false` ferme un **trou distinct, jusque-là non identifié** : l'onglet « Entrer une URL » permettait `cover: https://…`, qui casse le build (`MissingImageDimension`). `public/images/uploads/` n'existe nulle part dans le dépôt : le repointer ne coûte rien.
- **Reversibility:** cheap (deux lignes de YAML + une option de champ ; aucun média encore stocké par le CMS).
- **Caught late:** no (loggée avant exécution).
- **Status:** pending-user
- **User decision:** <renseigné après décision explicite de l'utilisateur — l'utilisateur a demandé de « chercher une autre parade », le mécanisme retenu reste à ratifier>
- **Follow-up:** **résiduel assumé et mesuré** : une image de **corps d'article** choisie via l'onglet global sortirait en `<img src="/src/assets/…">` non optimisé → 404 silencieux. Ce n'est pas une régression — aujourd'hui le même geste écrit `/images/uploads/…`, déjà un 404 — mais c'est un changement de **nature** du risque (404 discret au lieu de build rouge). **Réserve d'honnêteté** : le comportement d'Astro est prouvé par build réel ; le comportement runtime du CMS (onglets, valeur écrite) est établi par lecture du bundle, **pas** par une session CMS authentifiée → un smoke test manuel reste requis avant de clore T-D1.

## D08 — Rendu de la couverture ajouté sur la page article (travail hors plan, sur un gabarit du Plan 1)

- **Date:** 2026-07-30 23:45
- **Task affected:** nouvelle tâche **T-D3** (Phase D, hors plan initial)
- **Original plan:** aucune tâche du plan ne touche `src/pages/` ni `src/components/`. Les contraintes globales du plan les listent même comme **interdits de modification**. Le critère R6 exige pourtant « *uploader une cover via le CMS → … **ET** visible sur l'article publié* ».
- **Deviation taken:** ajout du rendu de `cover` en tête de la page `src/pages/blog/[...slug].astro`.
- **Reason:** constat **I3** de la revue finale, re-vérifié par le contrôleur : `cover` n'est rendu que dans `ArticleCard.astro` (vignettes) ; la page d'article ne contient aucun `src=`/`srcset=`. **R6 n'était satisfaisable par aucun code livré.** Les gabarits viennent du Plan 1 et n'ont pas régressé — mais R6 appartient au Plan 2, donc le combler est le seul moyen de le faire passer sans réinterpréter le critère.
- **Reversibility:** cheap (un bloc de gabarit, aucun contenu, aucune donnée).
- **Caught late:** no
- **Status:** approved
- **User decision:** « **Ajouter le rendu sur l'article** » — choix explicite de l'utilisateur le 2026-07-30, contre les deux alternatives proposées (reformuler R6 en « visible sur le site publié », ou reporter R6 au Plan 3). Le rendu doit lui être soumis.
- **Follow-up:** si le rendu ne convient pas visuellement, itérer sur le gabarit ; le critère R6 reste satisfait tant que la couverture s'affiche sur la page article.

## D07 — `vitest` et `astro check` câblés dans la CI (travail hors plan, modifie `deploy.yml`)

- **Date:** 2026-07-30 23:45
- **Task affected:** nouvelle tâche **T-D2** (Phase D, hors plan initial)
- **Original plan:** la spec du Plan 2 ne mentionne aucune CI de test ; les contraintes globales du plan listent `.github/workflows/deploy.yml` comme **interdit de modification**. Le plan n'invoque `npx vitest run` que comme geste manuel pendant l'exécution.
- **Deviation taken:** ajout d'un script `test` à `package.json` et d'une étape CI exécutant `vitest run` + `astro check` avant le déploiement.
- **Reason:** constat **I2** de la revue finale, re-vérifié par le contrôleur (`npm test` → *Missing script*). Le README **promet** que `src/lib/cms-config.test.ts` « échoue si les deux divergent » — or rien ne l'exécute : la garantie annoncée n'est câblée nulle part. C'est la **même famille d'angle mort** que la régression D03, qui a survécu à deux tâches et deux relectures parce qu'aucune étape ne lançait `astro check`. Traiter le symptôme dans les plans suivants ne protège pas le dépôt.
- **Reversibility:** cheap (un script + une étape de workflow).
- **Caught late:** no
- **Status:** approved
- **User decision:** « **Câbler maintenant** » — choix explicite de l'utilisateur le 2026-07-30, contre « script npm seulement » et « reporter au Plan 3 ».
- **Follow-up:** si la CI devient bloquante à tort, isoler l'étape de test du job de déploiement plutôt que de la retirer.

## D06 — Dossier média global redirigé dans l'arbre de contenu (parade au constat I1)

- **Date:** 2026-07-30 23:45
- **Task affected:** nouvelle tâche **T-D1** (Phase D, hors plan initial) — remplace la remédiation impossible de **D04**
- **Original plan:** plan d'impl, T-A1 Step 5 : `media_folder: public/images/uploads` / `public_folder: /images/uploads`, commentés « repli global non utilisé par la collection blog ».
- **Deviation taken:** ~~ces valeurs deviennent `media_folder: src/content/blog/_uploads` et `public_folder: ../_uploads`~~ → **TENTÉE PUIS ANNULÉE. Rien n'a été modifié** : `public/admin/config.yml` est resté à `public/images/uploads` / `/images/uploads` (vérifié, arbre propre, aucun commit).
- **BLOCAGE (2026-07-31 00:40) — l'option (a) est structurellement impossible.** Mesuré en conditions réelles, puis confirmé en lisant le **bundle épinglé lui-même** (`@sveltia/cms@0.175.1`) : le validateur de configuration de Sveltia applique la regex `/^\.{1,2}\//` au `public_folder` **global** et rejette toute valeur commençant par `./` ou `../` — « *The configured public folder is invalid. It must be an absolute path starting with '/'* ». Le CMS refuse alors de rendre l'application (2 erreurs console, écran d'erreur de configuration) → **R1 régresserait**. Cette validation ne s'applique **pas** au niveau collection, ce qui explique que `public_folder: ''` y fonctionne. Conséquence : aucune valeur ne peut à la fois satisfaire le validateur global de Sveltia (chemin absolu) et `image()` d'Astro (chemin relatif). **Le mécanisme choisi ne peut pas exister.**
- **Reason:** voir **D04** pour le risque complet. Le retrait pur étant impossible (Sveltia refuse de démarrer sans dossier média global — mesuré), la parade consiste à faire pointer ce dossier **dans l'arbre de contenu** : une image choisie depuis l'onglet global produit alors `cover: ../_uploads/<fichier>`, chemin **relatif** que `image()` d'Astro résout depuis `src/content/blog/<slug>/index.md`. Le garde-fou redevient structurel au lieu d'être humain : quel que soit l'onglet choisi, le build tient. Le loader glob (`**/index.{md,mdx}`) ignore `_uploads`, donc aucun faux article n'apparaît.
- **Reversibility:** cheap (deux lignes de YAML ; aucun média n'a encore été stocké par le CMS).
- **Caught late:** no
- **Status:** approved (décision utilisateur) — **mais non réalisable ; la décision est rouverte**
- **User decision:** « **(a) Rendre l'onglet inoffensif** » — choix explicite de l'utilisateur le 2026-07-30, contre « garde-fou humain documenté » et « ne rien faire ».
- **Follow-up (obsolète, conservé pour trace) :** ~~à vérifier empiriquement avant de clore~~ : que Sveltia émet bien le préfixe `../_uploads/` et que le build passe avec une couverture placée là. Si Sveltia émet autre chose, ne pas bricoler : rouvrir la décision avec l'option (b).

- **Nouveau follow-up :** l'option (a) étant hors d'atteinte, il reste **(b)** un garde-fou humain documenté au README (ne jamais utiliser l'onglet média global pour la couverture) ou **(c)** accepter le risque en l'état. Dans les deux cas, le commentaire de `config.yml` qui affirme que ce dossier « n'est pas utilisé » doit être corrigé : il est faux. **Décision utilisateur requise.**

## D05 — `integrity` + `crossorigin` (SRI) ajoutés au script CDN, non prévus par le plan

- **Date:** 2026-07-30 23:05
- **Task affected:** T-A1 (correctif issu de la revue finale de branche — constat I4)
- **Original plan:** plan d'impl, T-A1 Step 4, HTML imposé verbatim : `<script src="https://unpkg.com/@sveltia/cms@0.175.1/dist/sveltia-cms.js"></script>` — sans attribut d'intégrité. Spec §6.2 n'exige que l'épinglage de version.
- **Deviation taken:** ajout de `integrity="sha384-…"` et `crossorigin="anonymous"` sur cette balise, plus une assertion correspondante dans `src/lib/cms-config.test.ts`.
- **Reason:** constat **Important** de la revue finale. Ce script s'exécute sur l'origine `bendevcat.github.io`, reçoit un PAT GitHub **Contents: Read and write** sur le dépôt qui publie le site, et le persiste dans le stockage de cette origine (documenté au README). L'épinglage de version protège de la **dérive fonctionnelle amont** ; il ne protège **pas** d'un contenu altéré servi pour cette même version (compromission d'unpkg, empoisonnement de cache, republication du tarball). Scénario concret : un bundle altéré exfiltre le PAT à la prochaine ouverture de `/admin` → écriture sur le dépôt, donc contrôle du contenu publié et point d'appui sur `.github/workflows/`. Le SRI ferme ce vecteur pour le point d'entrée.
- **Reversibility:** cheap (deux attributs HTML + une assertion ; retirables en une minute).
- **Caught late:** no (loggé avant exécution du correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur (bendevcat) le 2026-07-30 — ratification groupée D01/D02/D03/D05 au gate de décision de fin de session (SRI sur le bundle CDN).
- **Follow-up:** si rejeté, retirer les deux attributs et l'assertion. Réserve connue : si le bundle charge des ressources additionnelles à l'exécution, le SRI du point d'entrée ne les couvre pas — à confirmer d'un coup d'œil à l'onglet réseau lors de la vérification R2.

## D04 — Dossier média global retiré de la config CMS (le plan le prescrivait)

- **Date:** 2026-07-30 23:00
- **Task affected:** T-A1 / T-B1 (correctif issu de la revue finale de branche — constat I1)
- **Original plan:** plan d'impl, T-A1 Step 5, YAML imposé verbatim : « *Repli global (non utilisé par la collection blog, qui stocke ses médias à côté de l'article — cf. T-B1).* » suivi de `media_folder: public/images/uploads` / `public_folder: /images/uploads`.
- **Deviation taken:** ~~ces deux clés globales sont **retirées**~~ → **TENTÉE PUIS ANNULÉE. Rien n'a été modifié : `public/admin/config.yml` est inchangé depuis `e84d0dd` (vérifié, `git diff` vide sur ce fichier).**
- **Correction de cette entrée (2026-07-30 23:25) :** le retrait est **impossible**. Mesuré en conditions réelles : sans `media_folder` global, Sveltia refuse de démarrer — écran « *There is an error in the CMS configuration… The media folder is not defined.* », console `[error] The media folder is not defined.` + `[error] Errors found in configuration`. Cela ferait **échouer R1** (0 erreur console). L'état a été remis à l'identique. **Le risque décrit ci-dessous subsiste donc entièrement**, et la décision est rouverte (voir Follow-up).
- **Reason:** le commentaire du plan (« non utilisé ») est **faux**, et la revue finale l'a établi sur le code source de Sveltia : `getAssetLibraryFolderMap()` active l'onglet « global » du sélecteur de média **dès qu'un `media_folder` global existe**, y compris pour un champ dont la collection est entry-relative. Scénario d'échec concret et vérifié par sonde : l'utilisateur bascule sur cet onglet pour choisir sa couverture → Sveltia écrit `cover: /images/uploads/<fichier>` → `astro build` **échoue** (`image-not-found` : `image()` d'Astro ne résout pas un chemin absolu servi depuis `public/`) → le run GitHub Actions est rouge, **le site n'est pas redéployé**, l'article n'apparaît jamais, et rien dans le CMS n'explique pourquoi. Aggravant : `public/images/uploads/` n'existe même pas dans le dépôt — ces clés n'ouvrent qu'un chemin de casse. Retirer la porte est plus sûr que documenter qu'il ne faut pas l'ouvrir.
- **Reversibility:** cheap (deux lignes de YAML ; aucun contenu, aucun média déjà stocké — aucun article n'a encore été créé via le CMS).
- **Caught late:** no (loggé avant exécution du correctif).
- **Status:** rejected
- **User decision:** **Rejetée** le 2026-07-30 — l'utilisateur n'a pas retenu le retrait (de toute façon impossible : Sveltia refuse de démarrer sans dossier média global) mais l'**option (a)**, qui rend l'onglet global inoffensif. **Remédiation : voir D06** (`media_folder: src/content/blog/_uploads` + `public_folder: ../_uploads`). Le raisonnement sur le risque reste valide ; seule la parade change.
- **Follow-up:** le retrait pur étant exclu, **trois options restent, à trancher par l'utilisateur** :
  - **(a) Rendre l'onglet global inoffensif** — pointer le dossier global à l'intérieur de l'arbre de contenu, par ex. `media_folder: src/content/blog/_uploads` + `public_folder: ../_uploads`. Une image choisie depuis l'onglet global produirait alors `cover: ../_uploads/<fichier>`, chemin **relatif** que `image()` d'Astro sait résoudre depuis `src/content/blog/<slug>/index.md`. Le loader glob (`**/index.{md,mdx}`) ignore `_uploads`, donc aucun faux article. **À vérifier empiriquement** : que Sveltia émet bien ce préfixe relatif, et que le build passe.
  - **(b) Garde-fou humain** — garder la config telle quelle et documenter au README qu'il ne faut jamais utiliser l'onglet média global pour « Image de couverture ». Le garde-fou devient humain, pas structurel ; le mode d'échec (run Actions rouge, article jamais publié, aucune explication dans le CMS) reste possible.
  - **(c) Ne rien faire** — accepter le risque en l'état, en connaissance de cause.
  Dans tous les cas, corriger le commentaire « *non utilisé par la collection blog* » de `config.yml`, qui est **factuellement faux** : l'onglet global est toujours activé.

## D03 — `@types/node` ajouté en devDependency (non prévu par le plan) pour rétablir `astro check` à 0 erreur

- **Date:** 2026-07-30 21:55
- **Task affected:** T-A1 (origine du défaut) — correctif appliqué après T-B1
- **Original plan:** plan d'impl, section **File Structure** : « `package.json` | **Modifié** (T-A1) | Ajout de **`yaml`** en `devDependencies` ». C'est la seule dépendance que le plan autorise à ajouter. T-A1 Step 1 ne prévoit que `npm install --save-dev yaml`.
- **Deviation taken:** ajout de `@types/node` en `devDependencies` (et, si nécessaire, `"types": ["node"]` dans `tsconfig.json`).
- **Reason:** le test `src/lib/cms-config.test.ts` — dont le code est **imposé verbatim par le plan** — fait `import { readFileSync } from 'node:fs'`. Sans les types Node, `npx astro check` échoue : `src/lib/cms-config.test.ts:2:30 - error ts(2591): Cannot find name 'node:fs'`. Or le Plan 1 s'est clôturé avec **0 erreur** à `astro check` (ledger Plan 1, Phase Z), et la Phase Z du Plan 2 relancera cette commande : sans correctif, l'audit échouerait sur une régression introduite par ce plan. Ni l'implémenteur ni les relecteurs de T-A1 et T-B1 ne l'ont détecté — aucune étape du plan ne demandait `astro check` (défaut du plan, pas des agents) ; constat du contrôleur en repassant la suite complète. Alternative écartée : remplacer `readFileSync` par un import Vite `?raw`, ce qui éviterait la dépendance mais réécrirait du code que le plan impose verbatim — déviation plus large sur du code testé.
- **Reversibility:** cheap (une devDependency de types, aucun code applicatif, aucun contenu ; désinstallable en une commande).
- **Caught late:** no pour l'ajout (loggé avant exécution) — **oui pour le défaut lui-même** : la régression a été committée en T-A1 (`68ed21a`) et n'a été vue qu'après T-B1. Le ledger de T-A1 doit être lu avec cette réserve : « build OK » y était vrai, « `astro check` 0 erreur » n'y a jamais été affirmé car la commande n'a pas été lancée.
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur (bendevcat) le 2026-07-30 — ratification groupée D01/D02/D03/D05 au gate de décision de fin de session (`@types/node`).
- **Follow-up:** si rejeté, réécrire le test pour lire le YAML sans API Node (import Vite `?raw`) et retirer `@types/node`. Indépendamment de la décision, ajouter `npx astro check` aux étapes de vérification des plans suivants.

## D02 — T-C1 (README) exécutée AVANT T-B2, dont elle devait consommer les constats

- **Date:** 2026-07-30 21:45
- **Task affected:** T-C1 (et par ricochet l'ordre B2 → C1 du plan)
- **Original plan:** plan d'impl, T-C1, bloc **Interfaces** : « *Consumes: les constats de T-B2 (le mode local a réellement fonctionné).* » L'ordre du plan est donc B2 puis C1.
- **Deviation taken:** T-C1 est rédigée et committée **avant** que T-B2 ait été exécutée. Le README documentera donc un workflow dont la validation de bout en bout reste à faire.
- **Reason:** T-B2 exige de cliquer « Work with Local Repository » puis de sélectionner un dossier dans le **sélecteur de fichiers natif** du système. Mesuré côté contrôleur : un navigateur piloté par automatisation échoue avec « *A repository root directory could not be selected. Please try again.* » — la File System Access API n'accorde l'accès disque que sur un geste humain réel. T-B2 n'est donc exécutable **que par l'utilisateur**, ce qui la met sur le chemin critique bloquant. Plutôt que de laisser la session s'arrêter avec R7 non commencé, T-C1 est livrée maintenant : son contenu (URL, prérequis Chromium, absence de proxy, emplacement des fichiers) est connu indépendamment du résultat de T-B2. Ce qui reste suspendu est uniquement la **preuve** que le pas-à-pas fonctionne — c'est précisément ce que T-B2 apportera.
- **Reversibility:** cheap (si T-B2 révèle que le pas-à-pas documenté est faux, corriger le README est un seul fichier, une tâche de rework).
- **Caught late:** no (loggé avant l'exécution de T-C1).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur (bendevcat) le 2026-07-30 — ratification groupée D01/D02/D03/D05 au gate de décision de fin de session (README écrit avant T-B2).
- **Follow-up:** si rejeté, retirer le commit du README et attendre l'exécution de T-B2 par l'utilisateur avant de le réécrire. Dans tous les cas, R7 ne peut passer `Done` qu'après que le pas-à-pas ait été **suivi** réellement (spec §7, phase C : « workflow local suivi depuis le README »).

## D01 — En développement local, l'URL du CMS est `/admin/index.html` et non `/admin/`

- **Date:** 2026-07-30 21:05
- **Task affected:** T-A1 (constat) → impacte T-B2 (Step 1) et T-C1 (bloc README du workflow local)
- **Original plan:** spec §3 R7 « Suivre le README : `astro dev` → `/admin` → "Work with Local Repository" » ; plan d'impl T-B2 Step 1 « Ouvrir `http://localhost:4321/admin/` » ; plan d'impl T-C1, bloc README « Ouvrir <http://localhost:4321/admin/> ».
- **Deviation taken:** la documentation du workflow **local** indiquera `http://localhost:4321/admin/index.html`. L'URL de **production** reste `https://bendevcat.github.io/admin/`, inchangée.
- **Reason:** mesuré côté contrôleur, serveur de dev Astro 7 (`npx astro dev`) : `/admin` → **404**, `/admin/` → **404**, `/admin/index.html` → **200**. Le serveur de dev (middleware statique Vite) ne résout pas l'index de répertoire pour les fichiers de `public/`. En production-like (`astro build` + `astro preview`, même service de fichiers que GitHub Pages) les quatre URL répondent **200** — donc **R1 n'est pas affecté** et le critère « ouvrir `/admin` » reste vrai là où l'utilisateur final l'ouvre. Seul le pas-à-pas local est concerné. Alternatives écartées : (a) ajouter une redirection Astro `/admin` → `/admin/index.html` collisionne avec le fichier statique `dist/admin/index.html` et modifierait `astro.config.mjs` (interdit par les contraintes globales) ; (b) documenter une URL qui renvoie 404 rendrait R7 invérifiable en le suivant.
- **Reversibility:** cheap (une URL dans le README + une étape de T-B2 ; aucun code applicatif, aucun contenu).
- **Caught late:** no (loggé avant l'exécution de T-B2 et T-C1).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur (bendevcat) le 2026-07-30 — ratification groupée D01/D02/D03/D05 au gate de décision de fin de session (URL locale `/admin/index.html`).
- **Follow-up:** si rejeté, il faut choisir explicitement une autre issue : soit documenter `/admin/` en local en acceptant le 404 (R7 devient invérifiable), soit ouvrir `astro.config.mjs` pour tenter une redirection (au risque d'un conflit avec le fichier statique).

<!--
Template for a new deviation:

## D{{NN}} — <short title>

- **Date:** YYYY-MM-DD HH:MM
- **Task affected:** T{{NN}}
- **Original plan:** <quote from spec or plan>
- **Deviation taken:** <what was actually done>
- **Reason:** <why>
- **Reversibility:** cheap (≤ 1 tâche de rework) | expensive (plusieurs tâches / données / déjà publié)
- **Caught late:** no | yes
- **Status:** pending-user
- **User decision:** <renseigné après décision explicite de l'utilisateur>
- **Follow-up:** <si rejeté, la remédiation>
-->
